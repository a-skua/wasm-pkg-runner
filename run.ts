import { type PackageConfig } from "./config.ts";
import { exec } from "./wasmtime.ts";

export async function run(
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<void> {
  await exec("run", pkg, pkg.run, extraArgs);
}
