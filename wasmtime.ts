import { type WasiConfig } from "./config.ts";
import { pull, wasmPath } from "./pull.ts";

async function ensureWasm(reference: string): Promise<string> {
  const path = wasmPath(reference);
  try {
    await Deno.stat(path);
    return path;
  } catch {
    console.error(`${path} not found, pulling ${reference}...`);
    return await pull(reference);
  }
}

export function buildArgs(
  subcommand: string,
  reference: string,
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
      const expanded = d.replace(/^~/, Deno.env.get("HOME") ?? "~");
      args.push("--dir", expanded);
    }
  }

  args.push(wasmPath(reference));

  if (extraArgs.length > 0) {
    args.push(...extraArgs);
  }

  return args;
}

export async function exec(
  subcommand: string,
  reference: string,
  config: WasiConfig | undefined,
  extraArgs: string[],
): Promise<never> {
  await ensureWasm(reference);
  const args = buildArgs(subcommand, reference, config, extraArgs);

  const cmd = new Deno.Command("wasmtime", {
    args,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const { code } = await cmd.output();
  Deno.exit(code);
}
