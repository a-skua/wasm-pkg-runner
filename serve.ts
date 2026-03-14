import { type PackageConfig } from "./config.ts";
import { type Result } from "@askua/core/result";
import { exec } from "./wasmtime.ts";

export async function serve(
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<Result<number, Error>> {
  return await exec("serve", pkg, pkg.serve, extraArgs);
}
