import type { PackageConfig } from "./config.ts";
import type { Result } from "@askua/core/result";
import { exec, type ExitCode } from "./wasmtime.ts";

export async function run(
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<Result<ExitCode, Error>> {
  return await exec("run", pkg, pkg.run, extraArgs);
}
