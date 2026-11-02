# LEAKSENSE AI – Next.js browser-only integration

## Status and limits

`leaksense_model.onnx` was verified with native Python ONNX Runtime on actual BattLeDIM held-out measurements. **Browser WASM must still be smoke-tested** in the target deployed Next.js version. BattLeDIM's long overlapping leak intervals mean its NORMAL examples are from January 2018 and its LEAK examples cover later dates. This model is **exploratory**, not independently event-validated, and does not establish real-world detection rates or simulation transferability. It outputs `NORMAL` or `LEAK` only.

## Install and files

```bash
npm install onnxruntime-web
mkdir -p public/models public/ort
cp leaksense_model.onnx feature_schema.json class_mapping.json model_metadata.json sample_inference.json public/models/
# Copy all wasm payload files belonging to your installed onnxruntime-web version (rather than mixing versions):
cp node_modules/onnxruntime-web/dist/*.wasm public/ort/
```

Run browser inference in a client component or client-only module (`'use client'`). Bundle JS and WASM files from the SAME `onnxruntime-web` package version. Enable Next.js asset serving for `/models/*` and `/ort/*`. The provided `*.json` files hold input and output names, so do not guess them. Use `{ executionProviders: ['wasm'] }`, because the model can contain `ai.onnx.ml` operators and GPU backends have more limited operator support.

## Sensor contract

`feature_schema.json` declares **exact** raw sensor order: each `pressure__<nodeId>` in `pressure_sensor_ids`, then `flow__<linkId>` in `flow_sensor_ids`, as downloaded from BattLeDIM's official YAML. You need **one reading per channel every five minutes**, for the last **12** consecutive 5-minute slots, ordered oldest→newest. Pressure units: metres of water head. Flow: cubic metres per hour. Convert kPa to m water head ONLY using a documented fluid density/gravity assumption; convert L/s to m³/h using `×3.6`. Never substitute tank levels for pressure or pump speed for flow. Do not use leak-event setup parameters or synthetic ground-truth flags as feature inputs.

Streaming missing-value rule: carry the previous known value forward for up to two 5-minute ticks per channel. If there is a third missing slot, do **not** infer. Do not backfill from future ticks. A new scene/session needs 12 valid/causally-filled readings before calling ONNX. Check all timestamps for an exact five-minute cadence, physical units, and the same local clock convention as BattLeDIM; don't feed simulation time acceleration incorrectly (five minutes of simulation is one input interval, regardless of wall time).

## Exact TypeScript inference helper

```ts
'use client';
import * as ort from 'onnxruntime-web';
import schema from '@/public/models/feature_schema.json';

type Reading = { timestamp: string; values: Record<string, number> };
const W = schema.window_size_samples;
const sensors: string[] = schema.raw_sensor_order;

function featuresForWindow(rows: Reading[]): Float32Array {
  if (rows.length !== W) throw new Error(`Need exactly ${W} observations`);
  const timestamps = rows.map(r => new Date(r.timestamp).getTime());
  // To avoid cross-timezone surprises, use ISO strings with an explicit offset,
  // and ensure this parsed local clock convention matches the training data.
  if (timestamps.some(v => !Number.isFinite(v))) throw new Error('Invalid timestamps');
  for (let i = 1; i < W; i++) {
    if (timestamps[i] - timestamps[i-1] !== 300_000) throw new Error('Not 5-minute cadence');
  }
  const result: number[] = [];
  for (const sensor of sensors) {
    // Stateful forward filling is expected upstream; here all 12 rows must be finite.
    const a = rows.map(row => row.values[sensor]);
    if (a.some(v => typeof v !== 'number' || !Number.isFinite(v))) {
      throw new Error(`Missing or non-finite sensor ${sensor}`);
    }
    const mean = a.reduce((s,v) => s+v,0)/W;
    const min = Math.min(...a), max = Math.max(...a);
    const variance = a.reduce((s,v) => s+(v-mean)*(v-mean),0)/W; // ddof=0
    result.push(a[W-1],mean,min,max,Math.sqrt(variance),
                a[W-1]-a[W-2],(a[W-1]-a[0])/(W-1));
  }
  // source timestamps are local/naive; preserve identical clock convention.
  const lastDate = new Date(rows[W-1].timestamp);
  const minutes = lastDate.getHours()*60+lastDate.getMinutes();
  result.push(Math.sin(2*Math.PI*minutes/1440),Math.cos(2*Math.PI*minutes/1440));
  if (result.length !== schema.feature_count) throw new Error('Feature count mismatch');
  return new Float32Array(result);
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;
function loadModel() {
  if (!sessionPromise) {
    ort.env.wasm.wasmPaths = '/ort/';
    sessionPromise = ort.InferenceSession.create('/models/leaksense_model.onnx',
                                               { executionProviders: ['wasm'] });
  }
  return sessionPromise;
}

export async function predictLeak(rows: Reading[]) {
  const session = await loadModel();
  const data = featuresForWindow(rows);
  const tensor = new ort.Tensor('float32', data, [1, schema.feature_count]);
  const outputs = await session.run({[schema.onnx_input_name]: tensor});
  const probabilityTensor = outputs[schema.onnx_outputs.probabilities];
  const labelTensor = outputs[schema.onnx_outputs.label];
  if (!probabilityTensor || !labelTensor) throw new Error('ONNX outputs missing');
  const p = Array.from(probabilityTensor.data as Float32Array | number[]);
  const cls = Number(labelTensor.data[0]);
  if (p.length !== 2 || ![0,1].includes(cls)) throw new Error('Unexpected output');
  if ((p[1] >= schema.probability_decision_threshold ? 1:0) !== cls)
    throw new Error('Output probabilities and class disagree');
  return {prediction: cls === 1 ? 'LEAK' : 'NORMAL', classId: cls,
          probabilityNormal: p[0], probabilityLeak: p[1]};
}
```

### Timezone precaution

The original dataset timestamps are timezone-naive. In your browser, use the same intended local clock as your simulator. `new Date(...).getHours()` uses browser-local time; a user abroad can obtain different time features. For production, use an explicit **simulation clock** with a specified zone and derive minutes-of-day from that zone (not user device local time). Verify the chosen convention against the JSON examples. A UTC ISO timestamp with `Z` can change the hour versus the dataset's naive local hour; do not append `Z` to source timestamps without deciding the zone.

### Correctness smoke test (required before release)

`sample_inference.json` contains true 12×sensor windows, precomputed float32 features, ground-truth labels, and expected scikit-learn probabilities. For every example:

1. Restore `raw_sensor_order` and `raw_window_rows`, preserving each timestamp's dataset-local hour.
2. Compare your TypeScript-extracted `Float32Array` to `input_features_float32` (absolute tolerance 2e-4).
3. Execute `predictLeak` with ORT Web's **WASM** execution provider.
4. Match `expected_ml_predicted_class`; compare both probabilities within `1e-3` absolute (native Python verification tolerance).
5. Test both classes, consecutive time intervals, WASM asset paths, unsupported browser errors, and slow devices.

Do **not** claim browser compatibility validated until this passes in the actual deployed browser. The Python ONNX test does not substitute for this.

## 3D simulator adapter

For each simulated step, read pressure at **all named BattLeDIM pressure sensor nodes** and flow at **all named BattLeDIM flow meter links**. If your React Three Fiber world has only one tank, one pump, or a few animated pipes, it does NOT currently satisfy this 36-channel input contract. Either (A) implement a calibrated hydraulic solver/sensor mapping that reproduces these measurements at the 5-minute cadence, or (B) collect representative simulator sensor data (normal/leak labeled by scenario, with disjoint scenario holdouts) and retrain. Do not set missing pressure channels to 0, duplicate one reading across nodes, or feed pump speeds as flows.

Display separate UI fields:

- `training_source`: BattLeDIM simulated SCADA series.
- `simulation_measurements`: pressure/flow generated by your 3D scenario/hydraulic model.
- `scenario_ground_truth`: scenario controller's actual leak condition (**never a model feature**).
- `ml_prediction`: ONNX output probabilities/class, an estimate, not scenario ground truth.

Do not interpret an animated leak visual or known scenario event as evidence the ML model predicted it. Distribution shift between BattLeDIM and the web simulation requires a separate validation study. No Python API, FastAPI, VPS or paid inference host is required: static assets + on-device WASM suffice.

## Output and model size

See `model_metadata.json` for the specific selected model, ONNX SHA256/byte length, validation protocol and `onnx_web_wasm_smoke_test: NOT RUN`. The ZIP is a set of research/demo deployment artifacts, not a safety system warranty.
