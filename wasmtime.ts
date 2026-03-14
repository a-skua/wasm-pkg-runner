import { type PackageConfig, type WasiConfig } from "./config.ts";
import { pull, wasmPath } from "./pull.ts";

async function resolveWasmPath(pkg: PackageConfig): Promise<string> {
  if (pkg.path) {
    const expanded = pkg.path.replace(/^~/, Deno.env.get("HOME") ?? "~");
    return expanded;
  }

  if (!pkg.reference) {
    console.error("Package must have either 'reference' or 'path'");
    Deno.exit(1);
  }

  const path = wasmPath(pkg.reference);
  try {
    await Deno.stat(path);
    return path;
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
): Promise<never> {
  const wasmFile = await resolveWasmPath(pkg);
  const args = buildArgs(subcommand, wasmFile, config, extraArgs);

  const cmd = new Deno.Command("wasmtime", {
    args,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await cmd.output();
  Deno.exit(code);
}
