import { Option, type OptionInstance } from "@askua/core/option";
import type { Path } from "./types.ts";
import type { Brand } from "@askua/core/brand";
import type { Editor } from "./config.ts";

export type Env<Key extends string, Value extends string = string> = Brand<
  Value,
  "ENV" | Key
>;

export function home(): OptionInstance<Env<"HOME", Path<"home">>> {
  return Option.fromNullable(Deno.env.get("HOME") as Env<"HOME", Path<"home">>);
}

export function configPath(): OptionInstance<
  Env<"WASM_PKG_RUNNER_CONFIG", Path<"globalConfig">>
> {
  return Option.fromNullable(
    Deno.env.get("WASM_PKG_RUNNER_CONFIG") as Env<
      "WASM_PKG_RUNNER_CONFIG",
      Path<"globalConfig">
    >,
  );
}

export function editor(): OptionInstance<Env<"EDITOR", Editor>> {
  return Option.fromNullable(Deno.env.get("EDITOR") as Env<"EDITOR", Editor>);
}

export function cacheDir(): OptionInstance<
  Env<"WASM_PKG_RUNNER_CACHE_DIR", Path<"cacheDir">>
> {
  return Option.fromNullable(
    Deno.env.get("WASM_PKG_RUNNER_CACHE_DIR") as Env<
      "WASM_PKG_RUNNER_CACHE_DIR",
      Path<"cacheDir">
    >,
  );
}
