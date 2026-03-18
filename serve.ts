import type { PackageConfig } from "./config.ts";
import type { ResultInstance } from "@askua/core/result";
import { Option } from "@askua/core/option";
import { type Arg, exec } from "./wasmtime.ts";
import type { ExitCode } from "./types.ts";

export async function serve(
  pkg: PackageConfig,
  extraArgs: Arg[],
): Promise<ResultInstance<ExitCode, Error>> {
  return await exec("serve", pkg, Option.fromNullable(pkg.serve), extraArgs);
}
