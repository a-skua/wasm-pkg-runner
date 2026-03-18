import { assertEquals, assertThrows } from "@std/assert";
import { globalConfigPath } from "./config.ts";
import { none, some } from "@askua/core/option";
import { ok } from "@askua/core/result";
import type { Env } from "./env.ts";
import type { Path } from "./types.ts";

Deno.test("globalConfigPath: WASM_PKG_RUNNER_CONFIG が設定されている場合、そのパスを返す", () => {
  const result = globalConfigPath({
    home: none(),
    configPath: some(
      "/custom/config.toml" as Env<
        "WASM_PKG_RUNNER_CONFIG",
        Path<"globalConfig">
      >,
    ),
  });
  assertEquals(result, ok("/custom/config.toml" as Path<"globalConfig">));
});

Deno.test("globalConfigPath: HOME からデフォルトパスを解決する", () => {
  const result = globalConfigPath({
    home: some("/home/user" as Env<"HOME", Path<"home">>),
    configPath: none(),
  });
  assertEquals(
    result,
    ok(
      "/home/user/.config/wasm-pkg-runner/config.toml" as Path<"globalConfig">,
    ),
  );
});

Deno.test("globalConfigPath: WASM_PKG_RUNNER_CONFIG が HOME より優先される", () => {
  const result = globalConfigPath({
    home: some("/home/user" as Env<"HOME", Path<"home">>),
    configPath: some(
      "/override/path.toml" as Env<
        "WASM_PKG_RUNNER_CONFIG",
        Path<"globalConfig">
      >,
    ),
  });
  assertEquals(result, ok("/override/path.toml" as Path<"globalConfig">));
});

Deno.test("globalConfigPath: どちらも未設定の場合エラーを返す", () => {
  const result = globalConfigPath({
    home: none(),
    configPath: none(),
  });
  assertThrows(() => result.unwrap());
});
