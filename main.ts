import { Command } from "@cliffy/command";
import { isErr, type Ok, Result } from "@askua/core/result";
import {
  editConfig,
  loadConfig,
  resolvePackage,
  showConfig,
  type WasmPackageName,
} from "./config.ts";
import { pull, type WasmReferenceName } from "./pull.ts";
import { run } from "./run.ts";
import { serve } from "./serve.ts";
import denoJson from "./deno.json" with { type: "json" };

function exitIfErr<T>(
  result: Result<T, Error>,
): asserts result is Ok<T> {
  if (isErr(result)) {
    console.error(result.error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  const configCommand = new Command()
    .description("Show merged config")
    .option("--edit", "Edit global config")
    .action(async ({ edit }) => {
      if (edit) {
        const result = await editConfig();
        exitIfErr(result);
        Deno.exit(result.value);
      } else {
        exitIfErr(await showConfig());
      }
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
      const result = await Result.lazy(loadConfig())
        .and((config) => {
          const { pkg } = resolvePackage(
            config,
            name as WasmReferenceName | WasmPackageName,
          );
          return run(pkg, args);
        })
        .eval();
      exitIfErr(result);
      Deno.exit(result.value);
    });

  const serveCommand = new Command()
    .description("Serve a wasm component with wasmtime")
    .arguments("<name:string> [...args:string]")
    .useRawArgs()
    .action(async (_options, name, ...args) => {
      const result = await Result.lazy(loadConfig())
        .and((config) => {
          const { pkg } = resolvePackage(
            config,
            name as WasmReferenceName | WasmPackageName,
          );
          return serve(pkg, args);
        })
        .eval();
      exitIfErr(result);
      Deno.exit(result.value);
    });

  await new Command()
    .name(denoJson.name)
    .version(denoJson.version)
    .description("Wasm package runner")
    .command("pull", pullCommand)
    .command("run", runCommand)
    .command("serve", serveCommand)
    .command("config", configCommand)
    .parse(Deno.args);
}
