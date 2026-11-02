export interface Feature {
  name: "pressure" | "flow" | "delivered" | "pump" | "valve" | "demand";
  mean: number;
  scale: number;
}
export interface FeatureSchema {
  version: 1;
  inputName: string;
  outputName: string;
  windowSize: number;
  features: Feature[];
  outputKind: "probabilities";
  classIds: string[];
}
export interface InferenceResult {
  classes: { label: string; probability: number }[];
  source: "onnx";
  timestamp: number;
}
