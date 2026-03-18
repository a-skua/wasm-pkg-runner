/**
 * A CLI tool to pull and run WebAssembly components from OCI registries.
 *
 * Wraps {@link https://github.com/bytecodealliance/wasm-pkg-tools | wkg} and
 * {@link https://wasmtime.dev/ | wasmtime} to simplify pulling, running, and
 * serving Wasm components with preconfigured WASI options.
 *
 * ## Requirements
 *
 * - {@link https://deno.com/ | Deno}
 * - {@link https://github.com/bytecodealliance/wasm-pkg-tools | wkg}
 * - {@link https://wasmtime.dev/ | wasmtime}
 *
 * ## Install
 *
 * ```sh
 * deno install -g -A -n wa jsr:@askua/wasm-pkg-runner
 * ```
 *
 * ## Usage
 *
 * @example Pull a wasm package
 * ```sh
 * wa pull ghcr.io/a-skua/example-cli:2026.3.14
 * ```
 *
 * @example Run a wasm component
 * ```sh
 * wa run example:2026.3.14
 * ```
 *
 * @example Serve a wasm component
 * ```sh
 * wa serve example:0.2.0
 * ```
 *
 * @example Run without config using full reference
 * ```sh
 * wa run ghcr.io/a-skua/example-cli:2026.3.14
 * ```
 *
 * @example Show merged config
 * ```sh
 * wa config
 * ```
 *
 * @example Edit global config
 * ```sh
 * wa config --edit
 * ```
 *
 * ## Configuration
 *
 * Config files are loaded and merged in the following order
 * (later files override earlier ones):
 *
 * 1. `~/.config/wasm-pkg-runner/config.toml` (global)
 * 2. `<git root>/wasm-pkg-runner.toml` (repository)
 * 3. `./wasm-pkg-runner.toml` (current directory)
 *
 * @example Example `wasm-pkg-runner.toml`
 * ```toml
 * [packages.example]
 * reference = "ghcr.io/a-skua/example-cli:2026.3.14"
 *
 * [packages.example.run]
 * wasi = ["http", "inherit-env"]
 * dirs = ["/home/<username>/.config/gcloud"]
 * env = ["GOOGLE_APPLICATION_CREDENTIALS"]
 *
 * [packages.example.serve]
 * wasi = ["cli", "inherit-network"]
 *
 * # Local wasm file path
 * [packages.my-app]
 * path = "/home/<username>/projects/my-app/target/wasm32-wasip2/release/my_app.wasm"
 *
 * [packages.my-app.run]
 * wasi = ["http"]
 * env = ["API_KEY"]
 * ```
 *
 * @module
 */

import { Command } from "@cliffy/command";
import type { Ok, Result } from "@askua/core/result";
import {
  editConfig,
  type Editor,
  globalConfigPath,
  loadConfig,
  resolvePackage,
  showConfig,
} from "./config.ts";
import { pull, type WasmReferenceName } from "./pull.ts";
import { run } from "./run.ts";
import { serve } from "./serve.ts";
import denoJson from "./deno.json" with { type: "json" };
import type { ExitCode } from "./types.ts";
import * as env from "./env.ts";

function exitIfErr<T>(
  result: Result<T, Error>,
): asserts result is Ok<T> {
  if (!result.ok) {
    console.error(result.error.message);
    Deno.exit(1);
  }
}

function exit(r: Result<ExitCode, Error>): r is never {
  exitIfErr(r);
  Deno.exit(r.value);
}

if (import.meta.main) {
  const configCommand = new Command()
    .description("Show merged config")
    .option("--edit", "Edit global config (use $EDITOR, default: vi)")
    .action(async ({ edit }) => {
      const e = { home: env.home(), configPath: env.configPath() };
      const result = await globalConfigPath(e).lazy()
        .and((path) =>
          edit
            ? editConfig(
              env.editor().unwrap(() => "vi" as const) as Editor,
              path,
            )
            : showConfig(path)
        ).eval();
      exit(result);
    });

  const pullCommand = new Command()
    .description("Pull a wasm package from OCI registry")
    .arguments("<reference:string>")
    .action(async (_options, reference) => {
      exitIfErr(await pull(reference as WasmReferenceName));
    });

  const runCommand = new Command()
    .description("Run a wasm component with wasmtime")
    .arguments("<name:string> [...args:string]")
    .useRawArgs()
    .action(async (_options, name, ...args) => {
      const e = { home: env.home(), configPath: env.configPath() };
      const result = await globalConfigPath(e).lazy()
        .and((path) => loadConfig(path))
        .map((cfg) => resolvePackage(cfg, name as never))
        .and((pkg) => run(pkg, args as never)).eval();
      exit(result);
    });

  const serveCommand = new Command()
    .description("Serve a wasm component with wasmtime")
    .arguments("<name:string> [...args:string]")
    .useRawArgs()
    .action(async (_options, name, ...args) => {
      const e = { home: env.home(), configPath: env.configPath() };
      const result = await globalConfigPath(e).lazy()
        .and((path) => loadConfig(path))
        .map((cfg) => resolvePackage(cfg, name as never))
        .and((pkg) => serve(pkg, args as never)).eval();
      exit(result);
    });

  const main = new Command()
    .name(denoJson.name)
    .version(denoJson.version)
    .description("Wasm package runner")
    .env(
      "WASM_PKG_RUNNER_CONFIG=<path:string>",
      "Override global config file path",
    )
    .env("EDITOR=<command:string>", "Editor for config --edit (default: vi)")
    .env("HOME=<path:string>", "Home directory for default config path")
    .action(function () {
      this.showHelp();
    })
    .command("pull", pullCommand)
    .command("run", runCommand)
    .command("serve", serveCommand)
    .command("config", configCommand);

  await main.parse(Deno.args);
}
