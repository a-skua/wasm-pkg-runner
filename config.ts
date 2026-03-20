import * as TOML from "@std/toml";
import type { Brand } from "@askua/core/brand";
import { stringify } from "@std/toml";
import type { WasmFilePathName, WasmReferenceName } from "./pull.ts";
import { none, Option, type OptionInstance, some } from "@askua/core/option";
import { err, ok, type Result, type ResultInstance } from "@askua/core/result";
import type { Arg } from "./wasmtime.ts";
import type { Command, ExitCode, Path } from "./types.ts";
import type { Env } from "./env.ts";

const CONFIG_TEMPLATE = `# wasm-pkg-runner configuration
# See: https://github.com/a-skua/wasm-pkg-runner

# OCI registry reference
# [packages.<name>]
# reference = "ghcr.io/example/package:0.1.0"
#
# Local wasm file path
# [packages.<name>]
# path = "/home/<username>/path/to/component.wasm"
#
# [packages.<name>.run]
# wasi = ["http"]
# dirs = ["/home/<username>/.config/gcloud"]
# env = ["GOOGLE_APPLICATION_CREDENTIALS"]
#
# [packages.<name>.serve]
# wasi = ["cli"]
`;

type WasmConfigWasi = Brand<Arg, "WasmConfig.wasi">;
type WasmConfigDir = Brand<Arg, "WasmConfig.dir">;
type WasmConfigEnv = Brand<Arg, "WasmConfig.env">;

export interface WasiConfig {
  wasi?: WasmConfigWasi[];
  dirs?: WasmConfigDir[];
  env?: WasmConfigEnv[];
  args?: Arg[];
}

export interface PackageConfig {
  reference?: WasmReferenceName;
  path?: WasmFilePathName;
  run?: WasiConfig;
  serve?: WasiConfig;
}

type ConfigPackageName = Brand<string, "Config.package">;

export interface Config {
  packages: Record<ConfigPackageName, PackageConfig>;
}

const CONFIG_FILE_NAME = "wasm-pkg-runner.toml";

/**
 * Resolve the global config file path.
 *
 * Priority:
 * 1. `WASM_PKG_RUNNER_CONFIG` env — use as-is if set
 * 2. `HOME` env — `$HOME/.config/wasm-pkg-runner/config.toml`
 * 3. Error if neither is available
 */
export function globalConfigPath(env: {
  home: Option<Env<"HOME", Path<"home">>>;
  configPath: Option<Env<"WASM_PKG_RUNNER_CONFIG", Path<"globalConfig">>>;
}): ResultInstance<Path<"globalConfig">, Error> {
  if (env.configPath.some) {
    const path: Path<"globalConfig"> = env.configPath.value;
    return ok(path);
  }

  if (!env.home.some) {
    return err(new Error("HOME environment variable not set"));
  }

  const home: Path<"home"> = env.home.value;
  return ok(
    `${home}/.config/wasm-pkg-runner/config.toml` as Path<"globalConfig">,
  );
}

async function configCandidates(
  globalPath: string,
): Promise<string[]> {
  const candidates: string[] = [];

  // 3. $HOME/.config/wasm-pkg-runner/config.toml (lowest priority, loaded first)
  candidates.push(globalPath);

  // 2. git repository root
  try {
    const cmd = new Deno.Command("git", {
      args: ["rev-parse", "--show-toplevel"],
      stdout: "piped",
      stderr: "null",
    });
    const { success, stdout } = await cmd.output();
    if (success) {
      const gitRoot = new TextDecoder().decode(stdout).trim();
      const gitPath = `${gitRoot}/${CONFIG_FILE_NAME}`;
      if (!candidates.includes(gitPath)) {
        candidates.push(gitPath);
      }
    }
  } catch {
    // git not available
  }

  // 1. current directory (highest priority, loaded last)
  const cwdPath = `${Deno.cwd()}/${CONFIG_FILE_NAME}`;
  if (!candidates.includes(cwdPath)) {
    candidates.push(cwdPath);
  }

  return candidates;
}

async function parseConfigFile(path: string): Promise<OptionInstance<Config>> {
  try {
    const text = await Deno.readTextFile(path);
    const raw = TOML.parse(text);
    return Option.fromNullable(raw.packages).map((packages) =>
      ({
        packages,
      }) as Config
    );
  } catch (e) {
    console.warn(`Failed to load config from ${path}: ${e}`);
    return none();
  }
}

function mergeConfigs(base: Config, override: Config): Config {
  const packages = { ...base.packages } as Record<string, PackageConfig>;
  for (const [name, pkg] of Object.entries(override.packages)) {
    if (packages[name]) {
      // Merge: override's fields take precedence
      packages[name] = {
        ...packages[name],
        ...pkg,
        run: pkg.run ?? packages[name].run,
        serve: pkg.serve ?? packages[name].serve,
      };
    } else {
      packages[name] = pkg;
    }
  }
  return { packages };
}

export async function loadConfig(
  globalPath: Path<"globalConfig">,
): Promise<ResultInstance<Config, Error>> {
  const candidates = await configCandidates(globalPath);
  let config: Config = { packages: {} };

  for (const path of candidates) {
    const parsed = await parseConfigFile(path);
    if (parsed.some) {
      config = mergeConfigs(config, parsed.value);
    }
  }

  return ok(config);
}

export async function showConfig(
  globalPath: Path<"globalConfig">,
): Promise<Result<ExitCode, Error>> {
  const candidates = await configCandidates(globalPath);
  const loadedFiles: string[] = [];

  let config: Config = { packages: {} };
  for (const path of candidates) {
    const parsed = await parseConfigFile(path);
    if (parsed.some) {
      config = mergeConfigs(config, parsed.value);
      loadedFiles.push(path);
    }
  }

  if (loadedFiles.length === 0) {
    console.log("No config files found.");
    console.log(`\nConfig search paths:`);
    for (const path of candidates) {
      console.log(`  - ${path}`);
    }
    return ok(0 as ExitCode);
  }

  console.log("Loaded config files (in priority order):");
  for (const file of loadedFiles) {
    console.log(`  - ${file}`);
  }
  console.log();
  console.log(
    stringify(config as unknown as Record<string, unknown>).trim(),
  );
  return ok(0 as ExitCode);
}

export type Editor = Brand<Command, "Editor">;

export async function editConfig(
  editor: Editor,
  path: Path<"globalConfig">,
): Promise<Result<ExitCode, Error>> {
  const dir = path.substring(0, path.lastIndexOf("/"));
  await Deno.mkdir(dir, { recursive: true });

  // Create file if it doesn't exist
  try {
    await Deno.stat(path);
  } catch {
    await Deno.writeTextFile(path, CONFIG_TEMPLATE);
  }

  const cmd = new Deno.Command(editor, {
    args: [path],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await cmd.output();
  return ok(code as ExitCode);
}

export async function initConfig(): Promise<Result<ExitCode, Error>> {
  const path = `${Deno.cwd()}/${CONFIG_FILE_NAME}`;
  try {
    await Deno.stat(path);
    return err(new Error(`${path} already exists`));
  } catch {
    // File does not exist, create it
  }
  await Deno.writeTextFile(path, CONFIG_TEMPLATE);
  console.log(`Created ${path}`);
  return ok(0 as ExitCode);
}

export type WasmPackageName = Brand<string, "WasmPackageName">;

export function resolvePackage(
  config: Config,
  name: WasmPackageName | WasmReferenceName | WasmFilePathName,
): PackageConfig {
  // name can be "auth:0.2.0" or full "ghcr.io/a-skua/gcloud/auth:0.2.0"
  return Option.fromNullable(
    config.packages[name as string as ConfigPackageName],
  )
    .or(() =>
      Option.fromNullable(
        config.packages[name.split(":")[0] as ConfigPackageName],
      )
    )
    .or(() => {
      // Try matching by full reference
      for (const [, p] of Object.entries(config.packages)) {
        if (p.reference === name) {
          return some(p);
        }
      }
      return none();
    }).or(() => {
      // Try matching by path
      for (const [, p] of Object.entries(config.packages)) {
        if (p.path === name) {
          return some(p);
        }
      }
      return none();
    }).unwrap(() => ({}));
}
