# ONNX integration contract

No trained or validated model was supplied. The UI explicitly displays **Model ML belum tersedia** and no confidence or predictions. Hydraulic scenario ground truth is separate from inference. Artifact detection never establishes inference readiness.

`src/lib/ml/onnx-client.ts` implements availability detection, contract validation, lazy ONNX Runtime Web loading, WASM session creation, named input/output checking, inference validation and disposal. `feature-extractor.ts` constructs the ordered normalized feature tensor. WASM files matching the locked runtime version are copied locally by postinstall; no external inference service is used.

Future artifacts belong in `public/ml/`:

- leaksense_model.onnx
- feature_schema.json
- class_mapping.json
- model_metadata.json
- sample_inference.json
- evaluation_metrics.json

Supported version-1 schema (explicit application adapter contract, not an assumption about an unknown model):

```json
{
  "version": 1,
  "inputName": "sensors",
  "outputName": "probabilities",
  "windowSize": 20,
  "features": [
    { "name": "pressure", "mean": 2.0, "scale": 1.0 },
    { "name": "flow", "mean": 90, "scale": 30 }
  ],
  "outputKind": "probabilities",
  "classIds": ["0", "1"]
}
```

The example values and class IDs are illustrative and must be replaced by the training export. Input float32 shape is `[1, windowSize, featureCount]`, oldest to newest. Feature order is schema order; preprocessing is `(value-mean)/scale`. Allowed feature names: pressure/flow (observed), delivered (simulated), pump/valve/demand (controls). A real deployment should use only available, training-compatible sensor features. A model with another tensor shape, feature vocabulary, normalization, output logits or class contract needs an explicit adapter change and validation, not guessed reshaping.

`class_mapping.json` is a map of exported class IDs to labels. Output must contain one finite probability per class in [0,1] with sum near 1. No hardcoded probabilities exist. Metadata must document sampling cadence, units, missing-value policy, BattLeDIM training provenance, supported classes and evaluation. `sample_inference.json` should supply expected vectors/output and tolerance. Validate export parity before adding an enabled inference action and result UI. The present UI does not automatically run a detected model: the contract, training distribution, and sample parity still require validation. The loader integration layer is prepared; end-to-end inference is untested without artifacts. Do not claim sensor-fault/demand classification unless the trained model supports it.
