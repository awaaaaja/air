import type { FeatureSchema, InferenceResult } from "./types";
export async function detectModel() {
  try {
    const r = await fetch("/ml/feature_schema.json", { cache: "no-store" });
    if (!r.ok) return { available: false, message: "Model ML belum tersedia" };
    return {
      available: true,
      message: "Artefak terdeteksi · validasi kontrak diperlukan",
    };
  } catch {
    return { available: false, message: "Model ML belum tersedia" };
  }
}
export async function loadModel() {
  const [schemaResponse, mappingResponse] = await Promise.all([
    fetch("/ml/feature_schema.json"),
    fetch("/ml/class_mapping.json"),
  ]);
  if (!schemaResponse.ok || !mappingResponse.ok)
    throw new Error("Kontrak model tidak tersedia");
  const schema: FeatureSchema = await schemaResponse.json();
  const mapping: Record<string, string> = await mappingResponse.json();
  const validNames = [
    "pressure",
    "flow",
    "delivered",
    "pump",
    "valve",
    "demand",
  ];
  if (
    schema.version !== 1 ||
    schema.outputKind !== "probabilities" ||
    !Number.isInteger(schema.windowSize) ||
    schema.windowSize < 1 ||
    !schema.inputName ||
    !schema.outputName ||
    !schema.features?.length ||
    !schema.classIds?.length ||
    schema.features.some(
      (f) =>
        !validNames.includes(f.name) ||
        !Number.isFinite(f.mean) ||
        !Number.isFinite(f.scale) ||
        f.scale <= 0,
    ) ||
    schema.classIds.some((id) => !mapping[id])
  )
    throw new Error("Kontrak model tidak didukung");
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.wasmPaths = "/onnx/";
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(
    "/ml/leaksense_model.onnx",
    { executionProviders: ["wasm"] },
  );
  if (
    !session.inputNames.includes(schema.inputName) ||
    !session.outputNames.includes(schema.outputName)
  ) {
    await session.release();
    throw new Error("Nama tensor tidak sesuai kontrak");
  }
  return {
    schema,
    dispose: () => session.release(),
    infer: async (features: Float32Array): Promise<InferenceResult> => {
      if (features.length !== schema.windowSize * schema.features.length)
        throw new Error("Ukuran input salah");
      const output = await session.run({
        [schema.inputName]: new ort.Tensor("float32", features, [
          1,
          schema.windowSize,
          schema.features.length,
        ]),
      });
      const values = Array.from(output[schema.outputName].data as Float32Array);
      if (
        values.length !== schema.classIds.length ||
        values.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
        Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 0.02
      )
        throw new Error("Output bukan probabilitas valid");
      return {
        classes: values.map((probability, i) => ({
          label: mapping[schema.classIds[i]],
          probability,
        })),
        source: "onnx",
        timestamp: Date.now(),
      };
    },
  };
}
