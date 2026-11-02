import { mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
const target = "public/onnx";
mkdirSync(target, { recursive: true });
const required = new Set([
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
]);
for (const file of readdirSync("node_modules/onnxruntime-web/dist")) {
  if (required.has(file))
    copyFileSync(
      `node_modules/onnxruntime-web/dist/${file}`,
      `${target}/${file}`,
    );
  else if (file.endsWith(".wasm") || file.endsWith(".mjs"))
    rmSync(`${target}/${file}`, { force: true });
}
