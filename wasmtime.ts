import type { PackageConfig, WasiConfig } from "./config.ts";
import type { Brand } from "@askua/core/brand";
import { Option } from "@askua/core/option";
import { err, ok, Result, type ResultInstance } from "@askua/core/result";
import { pull, type WasmFilePathName, wasmPath } from "./pull.ts";
import type { ExitCode } from "./types.ts";

async function resolveWasmPath(
  pkg: PackageConfig,
): Promise<ResultInstance<WasmFilePathName, Error>> {
  if (pkg.path) {
    return ok(pkg.path);
  }

  if (!pkg.reference) {
    return err(new Error("Package must have either 'reference' or 'path'"));
  }

  const path = wasmPath(pkg.reference);
  try {
    await Deno.stat(path);
    return ok(path);
  } catch {
    console.error(`${path} not found, pulling ${pkg.reference}...`);
    return await pull(pkg.reference);
  }
}

type Subcommand = "run" | "serve";

export type Arg = Brand<string, "Wasmtime::Arg">;

function buildArgs(
  subcommand: Subcommand,
  wasmFile: WasmFilePathName,
  config: Option<WasiConfig>,
  extraArgs: Arg[],
): Arg[] {
  const args: Arg[] = [subcommand as Arg];

  Option(config).tee((config) => {
    if (config.wasi) {
      for (const w of config.wasi) {
        args.push("-S" as Arg, w);
      }
    }

    if (config.dirs) {
      for (const d of config.dirs) {
        args.push("--dir" as Arg, d);
      }
    }

    if (config.env) {
      for (const key of config.env) {
        args.push("--env" as Arg, key);
      }
    }
  });

  args.push(wasmFile);

  if (extraArgs.length > 0) {
    args.push(...extraArgs);
  }

  return args;
}

export function exec(
  subcommand: Subcommand,
  pkg: PackageConfig,
  config: Option<WasiConfig>,
  extraArgs: Arg[],
): Promise<ResultInstance<ExitCode, Error>> {
  return Result.lazy(resolveWasmPath(pkg))
    .map((wasmFile) => buildArgs(subcommand, wasmFile, config, extraArgs))
    .and(async (args) => {
      const cmd = new Deno.Command("wasmtime", {
        args,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      });

      const child = cmd.spawn();
      const sigHandler = () => {
        child.kill("SIGTERM");
      };
      Deno.addSignalListener("SIGINT", sigHandler);

      try {
        const { code } = await child.output();
        return ok(code as ExitCode);
      } finally {
        Deno.removeSignalListener("SIGINT", sigHandler);
      }
    })
    .eval();
}
