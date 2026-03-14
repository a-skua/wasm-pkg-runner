import { Command } from "@cliffy/command";
import { isErr, type Result } from "@askua/core/result";
import {
  editConfig,
  loadConfig,
  resolvePackage,
  showConfig,
} from "./config.ts";
import { pull } from "./pull.ts";
import { run } from "./run.ts";
import { serve } from "./serve.ts";
import denoJson from "./deno.json" with { type: "json" };

function exitIfErr<T>(
  result: Result<T, Error>,
): asserts result is Result<T, Error> & { ok: true; value: T } {
  if (isErr(result)) {
    console.error(result.error.message);
    Deno.exit(1);
  }
}

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
    exitIfErr(await pull(reference));
  });

const runCommand = new Command()
  .description("Run a wasm component with wasmtime")
  .arguments("<name:string> [...args:string]")
  .useRawArgs()
  .action(async (_options, name, ...args) => {
    const configResult = await loadConfig();
    exitIfErr(configResult);
    const { pkg } = resolvePackage(configResult.value, name);
    const result = await run(pkg, args);
    exitIfErr(result);
    Deno.exit(result.value);
  });

const serveCommand = new Command()
  .description("Serve a wasm component with wasmtime")
  .arguments("<name:string> [...args:string]")
  .useRawArgs()
  .action(async (_options, name, ...args) => {
    const configResult = await loadConfig();
    exitIfErr(configResult);
    const { pkg } = resolvePackage(configResult.value, name);
    const result = await serve(pkg, args);
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
