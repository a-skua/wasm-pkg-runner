import { type PackageConfig } from "./config.ts";
import { type Result } from "@askua/core/result";
import { exec } from "./wasmtime.ts";

export async function run(
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<Result<number, Error>> {
  return await exec("run", pkg, pkg.run, extraArgs);
}
