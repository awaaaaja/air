export interface Feature {
  name: string;
  dtype: string;
  source_sensor_id?: string;
  source_type?: "pressure" | "flow";
  operation: string;
}
export interface FeatureSchema {
  version: string;
  dataset: string;
  onnx_input_name: string;
  onnx_input_dtype: string;
  onnx_input_shape: [string, number];
  feature_count: number;
  feature_order: string[];
  features: Feature[];
  raw_sensor_order: string[];
  pressure_sensor_ids: string[];
  flow_sensor_ids: string[];
  window_size_samples: number;
  sampling_interval_minutes: number;
  window_order: string;
  raw_units: { pressure: string; flow: string };
  onnx_outputs: { label: string; probabilities: string };
  probability_decision_threshold: number;
  output_labels: Record<string, string>;
  probability_column_order: number[];
}
export interface SensorRow {
  timestamp: string;
  values: Record<string, number | null>;
}
export interface SensorWindow {
  pressureUnit: "m water head";
  flowUnit: "m3/h";
  rows: SensorRow[];
}
export interface SampleInference {
  timestamp: string;
  ground_truth_class: number;
  ground_truth_name: string;
  raw_window_timestamps: string[];
  raw_sensor_order: string[];
  raw_window_rows: number[][];
  input_features_float32: number[];
  expected_ml_predicted_class: number;
  expected_ml_probabilities: Record<string, number>;
}
export interface InferenceResult {
  classId: number;
  label: string;
  probabilityNormal: number;
  probabilityLeak: number;
  source: "onnx";
  dataTimestamp: string;
  durationMs: number;
}
export interface ModelMetadata {
  model: string;
  onnx_sha256: string;
  onnx_model_size_bytes: number;
  limitation_status: string;
}
