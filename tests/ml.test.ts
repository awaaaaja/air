import { describe, it, expect } from "vitest";
import schemaJSON from "../public/ml/feature_schema.json";
import samplesJSON from "../public/ml/sample_inference.json";
import {
  extractFeatures,
  sampleWindow,
  datasetTime,
  validateSchema,
} from "../src/lib/ml/feature-extractor";
import type { FeatureSchema, SampleInference } from "../src/lib/ml/types";
const schema = schemaJSON as unknown as FeatureSchema;
const samples = samplesJSON as SampleInference[];
describe("BattLeDIM model contract", () => {
  it("accepts the actual exported contract", () =>
    expect(() => validateSchema(schema)).not.toThrow());
  for (const sample of samples)
    it(`reproduces all 254 float32 features: ${sample.timestamp}`, () => {
      const features = extractFeatures(schema, sampleWindow(sample));
      expect(features).toHaveLength(254);
      const differences = features.map((v, i) =>
        Math.abs(v - sample.input_features_float32[i]),
      );
      expect(Math.max(...differences)).toBeLessThanOrEqual(0.0002);
    });
  it("preserves dataset wall time regardless of local browser timezone", () => {
    expect(new Date(datasetTime("2018-01-07 02:15:00")).toISOString()).toBe(
      "2018-01-07T02:15:00.000Z",
    );
    expect(() => datasetTime("2018-01-07T02:15:00Z")).toThrow();
    expect(() => datasetTime("2018-02-31 02:15:00")).toThrow();
  });
  it("rejects wrong units, incomplete windows and irregular cadence", () => {
    const window = sampleWindow(samples[0]);
    expect(() =>
      extractFeatures(schema, { ...window, pressureUnit: "bar" } as never),
    ).toThrow("Satuan");
    expect(() =>
      extractFeatures(schema, { ...window, rows: window.rows.slice(1) }),
    ).toThrow("12");
    window.rows[1].timestamp = window.rows[0].timestamp;
    expect(() => extractFeatures(schema, window)).toThrow("interval");
  });
  it("causally fills at most two missing observations without future data", () => {
    const window = sampleWindow(samples[0]);
    const key = schema.raw_sensor_order[0];
    window.rows[1].values[key] = null;
    window.rows[2].values[key] = null;
    expect(() => extractFeatures(schema, window)).not.toThrow();
    window.rows[3].values[key] = null;
    expect(() => extractFeatures(schema, window)).toThrow("Maksimum");
    window.rows[0].values[key] = null;
    expect(() => extractFeatures(schema, window)).toThrow();
  });
  it("rejects mismatched feature ordering and nonfinite readings", () => {
    expect(() =>
      extractFeatures(
        { ...schema, feature_order: [...schema.feature_order].reverse() },
        sampleWindow(samples[0]),
      ),
    ).toThrow("Kontrak");
    const window = sampleWindow(samples[0]);
    window.rows[0].values[schema.raw_sensor_order[0]] = Infinity;
    expect(() => extractFeatures(schema, window)).toThrow("valid");
  });
});
