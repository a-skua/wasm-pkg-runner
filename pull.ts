const WASM_PKG_DIR = `${Deno.env.get("HOME")}/.cache/wasm-pkg-runner`;

export function wasmPath(reference: string): string {
  // ghcr.io/a-skua/gcloud/auth:0.2.0 → ~/.cache/wasm-pkg-runner/ghcr.io/a-skua/gcloud/auth/0.2.0.wasm
  const path = reference.replace(":", "/");
  return `${WASM_PKG_DIR}/${path}.wasm`;
}

export async function pull(reference: string): Promise<string> {
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
    console.error(`Failed to pull ${reference}`);
    Deno.exit(1);
  }

  console.log(`Pulled ${reference} → ${output}`);
  return output;
}
