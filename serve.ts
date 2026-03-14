import { type PackageConfig } from "./config.ts";
import { exec } from "./wasmtime.ts";

export async function serve(
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<void> {
  await exec("serve", pkg, pkg.serve, extraArgs);
}
