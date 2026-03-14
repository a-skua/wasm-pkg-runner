import { type PackageConfig, type WasiConfig } from "./config.ts";
import { err, ok, type Result } from "@askua/core/result";
import { pull, wasmPath } from "./pull.ts";

async function resolveWasmPath(
  pkg: PackageConfig,
): Promise<Result<string, Error>> {
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

export async function exec(
  subcommand: string,
  pkg: PackageConfig,
  config: WasiConfig | undefined,
  extraArgs: string[],
): Promise<Result<number, Error>> {
  const wasmFileResult = await resolveWasmPath(pkg);
  if (!wasmFileResult.ok) {
    return wasmFileResult;
  }

  const args = buildArgs(subcommand, wasmFileResult.value, config, extraArgs);

  const cmd = new Deno.Command("wasmtime", {
    args,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await cmd.output();
  return ok(code);
}
