import type { FeatureSchema, SensorWindow, SampleInference } from "./types";
// Dataset-local timestamps are parsed as wall-clock fields, never browser timezone.
export function datasetTime(timestamp: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(
    timestamp,
  );
  if (!match)
    throw new Error(
      "Gunakan waktu lokal dataset: YYYY-MM-DD HH:mm:ss, tanpa zona waktu.",
    );
  const [, y, m, d, h, min, sec] = match.map(Number);
  const value = Date.UTC(y, m - 1, d, h, min, sec);
  const date = new Date(value);
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d ||
    h > 23 ||
    min > 59 ||
    sec !== 0 ||
    min % 5 !== 0
  )
    throw new Error("Waktu harus valid dan tepat pada interval lima menit.");
  return value;
}
export function validateSchema(s: FeatureSchema): void {
  if (
    s.version !== "1.0" ||
    s.onnx_input_dtype !== "float32" ||
    s.window_size_samples !== 12 ||
    s.sampling_interval_minutes !== 5 ||
    s.window_order !== "oldest_to_newest" ||
    s.raw_sensor_order?.length !== 36 ||
    new Set(s.raw_sensor_order).size !== 36 ||
    s.feature_count !== 254 ||
    s.features?.length !== s.feature_count ||
    s.feature_order?.length !== s.feature_count ||
    s.onnx_input_shape?.[1] !== s.feature_count ||
    s.features.some((f, i) => f.name !== s.feature_order[i]) ||
    !s.onnx_input_name ||
    !s.onnx_outputs?.label ||
    !s.onnx_outputs?.probabilities ||
    s.probability_column_order?.join(",") !== "0,1" ||
    s.probability_decision_threshold !== 0.5
  )
    throw new Error("Kontrak model tidak didukung.");
}
export function sampleWindow(sample: SampleInference): SensorWindow {
  return {
    pressureUnit: "m water head",
    flowUnit: "m3/h",
    rows: sample.raw_window_rows.map((row, i) => ({
      timestamp: sample.raw_window_timestamps[i],
      values: Object.fromEntries(
        sample.raw_sensor_order.map((name, j) => [name, row[j]]),
      ),
    })),
  };
}
export function extractFeatures(
  schema: FeatureSchema,
  window: SensorWindow,
): Float32Array {
  validateSchema(schema);
  if (window.pressureUnit !== "m water head" || window.flowUnit !== "m3/h")
    throw new Error("Satuan input harus m water head dan m3/h.");
  if (
    !Array.isArray(window.rows) ||
    window.rows.length !== schema.window_size_samples
  )
    throw new Error("Dibutuhkan tepat 12 pembacaan untuk semua 36 kanal.");
  const times = window.rows.map((r) => datasetTime(r.timestamp));
  for (let i = 1; i < times.length; i++)
    if (times[i] - times[i - 1] !== 300000)
      throw new Error("Pembacaan harus berurutan dengan interval lima menit.");
  const statistics = new Map<string, Record<string, number>>();
  for (const sensor of schema.raw_sensor_order) {
    let missing = 0;
    let previous: number | undefined;
    const values = window.rows.map((row) => {
      const value = row.values?.[sensor];
      if (value == null) {
        missing++;
        if (missing > 2 || previous === undefined)
          throw new Error(
            `Data ${sensor} tidak cukup. Maksimum dua pembacaan kosong berturut-turut.`,
          );
        return previous;
      }
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new Error(`Nilai ${sensor} tidak valid.`);
      missing = 0;
      previous = value;
      return value;
    });
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const last = values.at(-1)!;
    statistics.set(sensor, {
      current: last,
      mean,
      min: Math.min(...values),
      max: Math.max(...values),
      std_pop: Math.sqrt(
        values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
      ),
      delta_5min: last - values.at(-2)!,
      trend_55min: (last - values[0]) / (values.length - 1),
    });
  }
  const end = new Date(times.at(-1)!);
  const phase =
    (2 * Math.PI * (end.getUTCHours() * 60 + end.getUTCMinutes())) / 1440;
  return new Float32Array(
    schema.features.map((f) => {
      if (f.name === "time_sin") return Math.sin(phase);
      if (f.name === "time_cos") return Math.cos(phase);
      const value = statistics.get(`${f.source_type}__${f.source_sensor_id}`)?.[
        f.operation
      ];
      if (value === undefined || !Number.isFinite(value))
        throw new Error(`Fitur ${f.name} tidak didukung.`);
      return value;
    }),
  );
}
