import type { FeatureSchema } from "./types";
import type { Parameters, Sample } from "../simulation/engine";
export function extractFeatures(
  schema: FeatureSchema,
  history: Sample[],
  p: Parameters,
): Float32Array {
  if (history.length < schema.windowSize)
    throw new Error("Riwayat sensor belum cukup");
  return new Float32Array(
    history.slice(-schema.windowSize).flatMap((sample) =>
      schema.features.map((f) => {
        const v =
          f.name in sample
            ? sample[f.name as keyof Sample]
            : p[f.name as keyof Parameters];
        if (
          typeof v !== "number" ||
          !Number.isFinite(v) ||
          !Number.isFinite(f.scale) ||
          f.scale <= 0
        )
          throw new Error("Fitur tidak valid");
        return (v - f.mean) / f.scale;
      }),
    ),
  );
}
