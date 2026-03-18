import { err, ok, type ResultInstance } from "@askua/core/result";
import type { Brand } from "@askua/core/brand";
import type { Arg } from "./wasmtime.ts";
import { cacheDir, home } from "./env.ts";

export type WasmFilePathName = Brand<Arg, "WasmFilePathName">;
export type WasmReferenceName = Brand<string, "WasmReferenceName">;

export function wasmPath(reference: WasmReferenceName): WasmFilePathName {
  // ghcr.io/a-skua/gcloud/auth:0.2.0 → ~/.cache/wasm-pkg-runner/ghcr.io/a-skua/gcloud/auth-0.2.0.wasm
  const path = reference.replace(":", "-");
  return cacheDir()
    .map((dir) => `${dir}/${path}.wasm` as WasmFilePathName)
    .or(() =>
      home().map((dir) =>
        `${dir}/.cache/wasm-pkg-runner/${path}.wasm` as WasmFilePathName
      )
    ).unwrap(() => {
      throw new Error("Could not determine cache directory");
    });
}

export function pull(
  reference: WasmReferenceName,
): Promise<ResultInstance<WasmFilePathName, Error>> {
  return ok(wasmPath(reference)).lazy()
    .tee(async (path) => {
      const dir = path.substring(0, path.lastIndexOf("/"));
      await Deno.mkdir(dir, { recursive: true });
    })
    .and(async (output) => {
      const cmd = new Deno.Command("wkg", {
        args: ["oci", "pull", reference, "-o", output],
        stdout: "inherit",
        stderr: "inherit",
      });

      const { success } = await cmd.output();
      if (!success) {
        return err(new Error(`Failed to pull ${reference}`));
      }

      console.log(`Pulled ${reference} → ${output}`);
      return ok(output);
    }).eval();
}
