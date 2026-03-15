# wasm-pkg-runner

A CLI tool to pull and run WebAssembly components from OCI registries.

Wraps [wkg](https://github.com/bytecodealliance/wasm-pkg-tools) and
[wasmtime](https://wasmtime.dev/) to simplify pulling, running, and serving Wasm
components with preconfigured WASI options.

## Requirements

- [Deno](https://deno.com/)
- [wkg](https://github.com/bytecodealliance/wasm-pkg-tools)
- [wasmtime](https://wasmtime.dev/)

## Install

From [JSR](https://jsr.io/@askua/wasm-pkg-runner):

```bash
deno install -g -A -n wa jsr:@askua/wasm-pkg-runner
```

From local source:

```bash
git clone https://github.com/a-skua/wasm-pkg-runner.git
cd wasm-pkg-runner
deno install -g -A -n wa --config deno.json main.ts
```

## Usage

### Pull a package

```bash
wa pull ghcr.io/a-skua/example-cli:2026.3.14
```

Downloads the Wasm component to `/home/<username>/.cache/wasm-pkg-runner/`.

### Run a package

```bash
wa run example:2026.3.14
```

### Serve a package

```bash
wa serve example:0.2.0
```

If the package is not found locally, it will be pulled automatically.

Without a config file, packages can still be run using their full reference:

```bash
wa run ghcr.io/a-skua/example-cli:2026.3.14
```

### Show config

```bash
wa config
```

Shows the merged configuration from all config files.

### Edit global config

```bash
wa config --edit
```

Opens `/home/<username>/.config/wasm-pkg-runner/config.toml` in `$EDITOR`.

## Configuration

`wa` loads and merges config files in the following order (later files override
earlier ones):

1. `/home/<username>/.config/wasm-pkg-runner/config.toml` (global)
2. `<git root>/wasm-pkg-runner.toml` (repository)
3. `./wasm-pkg-runner.toml` (current directory)

If no config file is found, `wa` runs without WASI options.

### Example (`wasm-pkg-runner.toml`)

```toml
# OCI registry reference
[packages.example]
reference = "ghcr.io/a-skua/example-cli:2026.3.14"

[packages.example.run]
wasi = ["http", "inherit-env"]
dirs = ["/home/<username>/.config/gcloud"]
env = ["GOOGLE_APPLICATION_CREDENTIALS"]

[packages.example.serve]
wasi = ["cli", "inherit-network"]

# Local wasm file path
[packages.my-app]
path = "/home/<username>/projects/my-app/target/wasm32-wasip2/release/my_app.wasm"

[packages.my-app.run]
wasi = ["http"]
env = ["API_KEY"]
```

With this config, `wa run example` executes:

```bash
wasmtime run -S http -S inherit-env --dir /home/<username>/.config/gcloud --env GOOGLE_APPLICATION_CREDENTIALS /home/<username>/.cache/wasm-pkg-runner/ghcr.io/a-skua/example-cli/2026.3.14.wasm
```

### Config fields

| Field                     | Description                                                  |
| ------------------------- | ------------------------------------------------------------ |
| `reference`               | OCI registry reference (e.g. `ghcr.io/a-skua/example:0.1.0`) |
| `path`                    | Local wasm file path (alternative to `reference`)            |
| `run.wasi` / `serve.wasi` | WASI options passed to `-S`                                  |
| `run.dirs` / `serve.dirs` | Directories passed to `--dir`                                |
| `run.env` / `serve.env`   | Environment variable keys passed to `--env`                  |

## License

MIT
