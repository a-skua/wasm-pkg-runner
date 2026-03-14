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

From JSR:

```bash
deno install -g -A -n wa jsr:@a-skua/wasm-pkg-runner
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

Downloads the Wasm component to `~/.cache/wasm-pkg-runner/`.

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

Opens `~/.config/wasm-pkg-runner/config.toml` in `$EDITOR`.

## Configuration

`wa` loads and merges config files in the following order (later files override
earlier ones):

1. `~/.config/wasm-pkg-runner/config.toml` (global)
2. `<git root>/wasm-pkg-runner.toml` (repository)
3. `./wasm-pkg-runner.toml` (current directory)

If no config file is found, `wa` runs without WASI options.

### Example (`wasm-pkg-runner.toml`)

```toml
[packages.example]
reference = "ghcr.io/a-skua/example-cli:2026.3.14"

[packages.example.run]
wasi = ["http", "inherit-env"]
dirs = ["~/.config/gcloud"]

[packages.example.serve]
wasi = ["cli", "inherit-network"]
```

With this config, `wa run example` executes:

```bash
wasmtime run -S http -S inherit-env --dir ~/.config/gcloud ~/.cache/wasm-pkg-runner/ghcr.io/a-skua/example-cli/2026.3.14.wasm
```

## License

MIT
