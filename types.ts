import type { Brand } from "@askua/core/brand";

export type Command = Brand<string, "Command">;

export type Path<Name extends string> = Brand<string, "Path" | Name>;

/** Process exit code. 0 indicates success, non-zero indicates failure. */
export type ExitCode = Brand<number, "ExitCode">;
