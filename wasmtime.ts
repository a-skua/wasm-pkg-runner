import type { PackageConfig, WasiConfig } from "./config.ts";
import type { Brand } from "@askua/core/brand";
import { err, ok, Result } from "@askua/core/result";
import { pull, wasmPath, type WasmPathName } from "./pull.ts";

async function resolveWasmPath(
  pkg: PackageConfig,
): Promise<Result<WasmPathName, Error>> {
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

function buildArgs(
  subcommand: string,
  wasmFile: string,
  config: WasiConfig | undefined,
  extraArgs: string[],
): string[] {
  const args: string[] = [subcommand];

  if (config?.wasi) {
    for (const w of config.wasi) {
      args.push("-S", w);
    }
  }

  if (config?.dirs) {
    for (const d of config.dirs) {
      args.push("--dir", d);
    }
  }

  if (config?.env) {
    for (const key of config.env) {
      args.push("--env", key);
    }
  }

  args.push(wasmFile);

  if (extraArgs.length > 0) {
    args.push(...extraArgs);
  }

  return args;
}

export type ExitCode = Brand<number, "ExitCode">;

export function exec(
  subcommand: string,
  pkg: PackageConfig,
  config: WasiConfig | undefined,
  extraArgs: string[],
): Promise<Result<ExitCode, Error>> {
  return Result.lazy(resolveWasmPath(pkg))
    .map((wasmFile) => buildArgs(subcommand, wasmFile, config, extraArgs))
    .and(async (args) => {
      const cmd = new Deno.Command("wasmtime", {
        args,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      });

      const { code } = await cmd.output();
      return ok(code as ExitCode);
    })
    .eval();
}
