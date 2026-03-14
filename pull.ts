import { err, ok, type Result } from "@askua/core/result";

const WASM_PKG_DIR = `${Deno.env.get("HOME")}/.cache/wasm-pkg-runner`;

export function wasmPath(reference: string): string {
  // ghcr.io/a-skua/gcloud/auth:0.2.0 → ~/.cache/wasm-pkg-runner/ghcr.io/a-skua/gcloud/auth/0.2.0.wasm
  const path = reference.replace(":", "/");
  return `${WASM_PKG_DIR}/${path}.wasm`;
}

export async function pull(reference: string): Promise<Result<string, Error>> {
  const output = wasmPath(reference);
  const dir = output.substring(0, output.lastIndexOf("/"));

  await Deno.mkdir(dir, { recursive: true });

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
}
