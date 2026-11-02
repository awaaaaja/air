import { describe, it, expect } from "vitest";
import { extractFeatures } from "../src/lib/ml/feature-extractor";
import { baseline, initial } from "../src/lib/simulation/engine";
import type { FeatureSchema } from "../src/lib/ml/types";
const schema: FeatureSchema = {
  version: 1,
  inputName: "x",
  outputName: "y",
  windowSize: 2,
  outputKind: "probabilities",
  classIds: ["0"],
  features: [
    { name: "flow", mean: 10, scale: 2 },
    { name: "pressure", mean: 0, scale: 1 },
  ],
};
describe("ML preprocessing contract", () => {
  it("preserves schema order, chronological windows and normalization", () => {
    const a = { ...initial(), flow: 20, pressure: 2 },
      b = { ...a, flow: 30, pressure: 3 };
    expect([...extractFeatures(schema, [a, b], baseline)]).toEqual([
      5, 2, 10, 3,
    ]);
  });
  it("rejects insufficient history", () =>
    expect(() => extractFeatures(schema, [initial()], baseline)).toThrow(
      "Riwayat",
    ));
  it("rejects invalid normalization scales", () =>
    expect(() =>
      extractFeatures(
        { ...schema, features: [{ name: "flow", mean: 0, scale: 0 }] },
        [initial(), initial()],
        baseline,
      ),
    ).toThrow("Fitur"));
});
