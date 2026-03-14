import { Command } from "@cliffy/command";
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

const configCommand = new Command()
  .description("Show merged config")
  .option("--edit", "Edit global config")
  .action(async ({ edit }) => {
    if (edit) {
      await editConfig();
    } else {
      await showConfig();
    }
  });

const pullCommand = new Command()
  .description("Pull a wasm package from OCI registry")
  .arguments("<reference:string>")
  .action(async (_options, reference) => {
    await pull(reference);
  });

const runCommand = new Command()
  .description("Run a wasm component with wasmtime")
  .arguments("<name:string> [...args:string]")
  .useRawArgs()
  .action(async (_options, name, ...args) => {
    const config = await loadConfig();
    const { pkg } = resolvePackage(config, name);
    await run(pkg, args);
  });

const serveCommand = new Command()
  .description("Serve a wasm component with wasmtime")
  .arguments("<name:string> [...args:string]")
  .useRawArgs()
  .action(async (_options, name, ...args) => {
    const config = await loadConfig();
    const { pkg } = resolvePackage(config, name);
    await serve(pkg, args);
  });

await new Command()
  .name("wa")
  .version(denoJson.version)
  .description("Wasm package runner")
  .command("pull", pullCommand)
  .command("run", runCommand)
  .command("serve", serveCommand)
  .command("config", configCommand)
  .parse(Deno.args);
