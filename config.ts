import { parse } from "@std/toml";
import { stringify } from "@std/toml";
import { isSome, none, type Option, some } from "@askua/core/option";
import { err, ok, type Result } from "@askua/core/result";

export interface WasiConfig {
  wasi?: string[];
  dirs?: string[];
  env?: string[];
  args?: string[];
}

export interface PackageConfig {
  reference?: string;
  path?: string;
  run?: WasiConfig;
  serve?: WasiConfig;
}

export interface Config {
  packages: Record<string, PackageConfig>;
}

const CONFIG_FILE_NAME = "wasm-pkg-runner.toml";

export function globalConfigPath(): Result<string, Error> {
  const home = Deno.env.get("HOME");
  if (!home) {
    return err(new Error("HOME environment variable not set"));
  }
  return ok(`${home}/.config/wasm-pkg-runner/config.toml`);
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

async function parseConfigFile(path: string): Promise<Option<Config>> {
  try {
    const text = await Deno.readTextFile(path);
    const raw = parse(text) as unknown as Config;
    return some({ packages: raw.packages ?? {} });
  } catch {
    return none();
  }
}

function mergeConfigs(base: Config, override: Config): Config {
  const packages = { ...base.packages };
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

export async function loadConfig(): Promise<Result<Config, Error>> {
  const pathResult = globalConfigPath();
  if (!pathResult.ok) {
    return pathResult;
  }

  const candidates = await configCandidates(pathResult.value);
  let config: Config = { packages: {} };

  for (const path of candidates) {
    const parsed = await parseConfigFile(path);
    if (isSome(parsed)) {
      config = mergeConfigs(config, parsed.value);
    }
  }

  return ok(config);
}

export async function showConfig(): Promise<Result<void, Error>> {
  const pathResult = globalConfigPath();
  if (!pathResult.ok) {
    return pathResult;
  }

  const candidates = await configCandidates(pathResult.value);
  const loadedFiles: string[] = [];

  let config: Config = { packages: {} };
  for (const path of candidates) {
    const parsed = await parseConfigFile(path);
    if (isSome(parsed)) {
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
    return ok(undefined);
  }

  console.log("Loaded config files (in priority order):");
  for (const file of loadedFiles) {
    console.log(`  - ${file}`);
  }
  console.log();
  console.log(stringify(config as unknown as Record<string, unknown>).trim());
  return ok(undefined);
}

export async function editConfig(): Promise<Result<number, Error>> {
  const pathResult = globalConfigPath();
  if (!pathResult.ok) {
    return pathResult;
  }

  const path = pathResult.value;
  const dir = path.substring(0, path.lastIndexOf("/"));

  await Deno.mkdir(dir, { recursive: true });

  // Create file if it doesn't exist
  try {
    await Deno.stat(path);
  } catch {
    const template = `# wasm-pkg-runner configuration
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
# wasi = ["http", "inherit-env"]
# dirs = ["/home/<username>/.config/gcloud"]
# env = ["GOOGLE_APPLICATION_CREDENTIALS"]
#
# [packages.<name>.serve]
# wasi = ["cli", "inherit-network"]
`;
    await Deno.writeTextFile(path, template);
  }

  const editor = Deno.env.get("EDITOR") ?? "vi";
  const cmd = new Deno.Command(editor, {
    args: [path],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await cmd.output();
  return ok(code);
}

export function resolvePackage(
  config: Config,
  name: string,
): { pkg: PackageConfig } {
  // name can be "auth:0.2.0" or full "ghcr.io/a-skua/gcloud/auth:0.2.0"
  const pkg = config.packages[name] ?? config.packages[name.split(":")[0]];
  if (pkg) {
    return { pkg };
  }

  // Try matching by full reference
  for (const [, p] of Object.entries(config.packages)) {
    if (p.reference === name) {
      return { pkg: p };
    }
  }

  // Not in config — treat name as a full reference
  return {
    pkg: { reference: name },
  };
}
