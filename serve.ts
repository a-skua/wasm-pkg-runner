import type { PackageConfig } from "./config.ts";
import type { Result } from "@askua/core/result";
import { exec, type ExitCode } from "./wasmtime.ts";

export async function serve(
  pkg: PackageConfig,
  extraArgs: string[],
): Promise<Result<ExitCode, Error>> {
  return await exec("serve", pkg, pkg.serve, extraArgs);
}
