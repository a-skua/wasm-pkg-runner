import { type PackageConfig } from "./config.ts";
import { exec } from "./wasmtime.ts";

export async function serve(
  reference: string,
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<void> {
  await exec("serve", reference, pkg.serve, extraArgs);
}
