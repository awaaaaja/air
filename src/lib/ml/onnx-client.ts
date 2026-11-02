import { extractFeatures, validateSchema } from "./feature-extractor";
import type {
  FeatureSchema,
  InferenceResult,
  ModelMetadata,
  SensorWindow,
} from "./types";
import type { InferenceSession } from "onnxruntime-web/wasm";
async function getJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`Tidak dapat memuat ${url} (${response.status}).`);
  return response.json();
}
export interface ModelClient {
  schema: FeatureSchema;
  metadata: ModelMetadata;
  infer: (window: SensorWindow) => Promise<InferenceResult>;
  dispose: () => Promise<void>;
}
export async function loadModel(): Promise<ModelClient> {
  const [schema, metadata, mapping] = await Promise.all([
    getJSON<FeatureSchema>("/ml/feature_schema.json"),
    getJSON<ModelMetadata>("/ml/model_metadata.json"),
    getJSON<Record<string, unknown>>("/ml/class_mapping.json"),
  ]);
  validateSchema(schema);
  if (mapping["0"] !== "NORMAL" || mapping["1"] !== "LEAK")
    throw new Error("Pemetaan kelas tidak sesuai.");
  const response = await fetch("/ml/leaksense_model.onnx");
  if (!response.ok) throw new Error("Model tidak tersedia.");
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
  if (
    hash !== metadata.onnx_sha256 ||
    bytes.byteLength !== metadata.onnx_model_size_bytes
  )
    throw new Error("Integritas berkas model tidak sesuai metadata.");
  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.wasmPaths = "/onnx/";
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  let session: InferenceSession;
  try {
    session = await ort.InferenceSession.create(bytes, {
      executionProviders: ["wasm"],
    });
  } catch {
    throw new Error(
      "Runtime ONNX gagal dimuat. Gunakan browser terbaru yang mendukung WebAssembly.",
    );
  }
  if (
    session.inputNames.length !== 1 ||
    !session.inputNames.includes(schema.onnx_input_name) ||
    !session.outputNames.includes(schema.onnx_outputs.label) ||
    !session.outputNames.includes(schema.onnx_outputs.probabilities)
  ) {
    await session.release();
    throw new Error("Nama tensor model tidak sesuai kontrak.");
  }
  return {
    schema,
    metadata,
    dispose: () => session.release(),
    infer: async (window) => {
      const features = extractFeatures(schema, window);
      const start = performance.now();
      const outputs = await session.run({
        [schema.onnx_input_name]: new ort.Tensor("float32", features, [
          1,
          schema.feature_count,
        ]),
      });
      const probability = outputs[schema.onnx_outputs.probabilities],
        label = outputs[schema.onnx_outputs.label];
      if (!probability || !label)
        throw new Error("Output model tidak lengkap.");
      const p = Array.from(probability.data as Float32Array),
        classId = Number(label.data[0]);
      if (
        p.length !== 2 ||
        p.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
        Math.abs(p[0] + p[1] - 1) > 0.001 ||
        ![0, 1].includes(classId) ||
        (p[1] >= schema.probability_decision_threshold ? 1 : 0) !== classId
      )
        throw new Error("Output model tidak valid.");
      return {
        classId,
        label: schema.output_labels[String(classId)],
        probabilityNormal: p[0],
        probabilityLeak: p[1],
        source: "onnx",
        dataTimestamp: window.rows.at(-1)!.timestamp,
        durationMs: performance.now() - start,
      };
    },
  };
}
