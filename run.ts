import { type PackageConfig } from "./config.ts";
import { exec } from "./wasmtime.ts";

export async function run(
  reference: string,
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<void> {
  await exec("run", reference, pkg.run, extraArgs);
}
