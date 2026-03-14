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

const VERSION = denoJson.version;

const USAGE = `Usage: wa <command> [options]

Commands:
  pull <reference>          Pull a wasm package from OCI registry
  run <name> [args...]      Run a wasm component with wasmtime
  serve <name> [args...]    Serve a wasm component with wasmtime
  config                    Show merged config
  config --edit             Edit global config
  help                      Show this help message

Options:
  --version                 Show version
`;

const [command, ...args] = Deno.args;

switch (command) {
  case "pull": {
    const ref = args[0];
    if (!ref) {
      console.error("Usage: wa pull <reference>");
      Deno.exit(1);
    }
    await pull(ref);
    break;
  }

  case "run": {
    const name = args[0];
    if (!name) {
      console.error("Usage: wa run <name> [args...]");
      Deno.exit(1);
    }
    const config = await loadConfig();
    const { pkg } = resolvePackage(config, name);
    await run(pkg, args.slice(1));
    break;
  }

  case "serve": {
    const name = args[0];
    if (!name) {
      console.error("Usage: wa serve <name> [args...]");
      Deno.exit(1);
    }
    const config = await loadConfig();
    const { pkg } = resolvePackage(config, name);
    await serve(pkg, args.slice(1));
    break;
  }

  case "config": {
    if (args.includes("--edit")) {
      await editConfig();
    } else {
      await showConfig();
    }
    break;
  }

  case "--version":
    console.log(`${denoJson.name} ${VERSION}`);
    break;

  case "help":
  case undefined:
    console.log(USAGE);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    console.log(USAGE);
    Deno.exit(1);
}
