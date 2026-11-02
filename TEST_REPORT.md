# Verification report

Current application: Industrial IoT visual redesign and the supplied BattLeDIM ONNX model. Environment: Node.js 24.19.0, Next.js 15.5.28, ONNX Runtime Web 1.31.1 and system Chromium with WASM execution provider.

## Checks executed

- `npm run typecheck`: passed strict TypeScript validation.
- `npm run lint`: passed with no errors or warnings. Generated vendor runtime files are excluded.
- `npm test`: 20 tests passed in two suites. All nine hydraulic tests remain intact. Eleven ML tests validate the real export schema, all six 254-feature reference vectors, wall-clock timestamp handling, units, cadence, feature order, nonfinite inputs and bounded causal forward-fill.
- `npm run build`: production build passed. Next reports the page as statically prerendered with 268 kB first-load JavaScript; the WebGL scene and ONNX execution runtime load separately.
- `npm run test:e2e`: six production-browser tests cover the simulator workflow, mobile interaction, all six scenarios/assets, real ONNX inference and missing-model recovery. The model test runs all six reference samples in actual browser WASM, compares classes and probabilities against exported Python results, tests a valid sensor-window upload and rejects invalid units.
- `git diff --check`: passed.
- Model SHA-256 matches the supplied metadata: `916c441f9cb5651e6693039ad2657ccf17e9b0f8da168f133d7003c3538f76d9`.

## ONNX parity

Feature tolerance: maximum absolute difference 2e-4. Probability tolerance: maximum absolute difference 1e-3. All six supplied samples pass, including three NORMAL and three LEAK outputs. No expected output is used to create a prediction: expected values are used only by the validation check after real `InferenceSession.run`.

The uploaded model contains ai.onnx.ml Imputer, Scaler and LinearClassifier operators. These run successfully with this installed WASM runtime. The input is `[1,254]`, not the old placeholder temporal tensor. Feature preprocessing follows the actual schema; the saved scaler is not applied twice.

The model requires 33 pressure and three flow channels. No readings from the small 3D network are duplicated or silently mapped into these channels. Model results explicitly identify their source as a supplied BattLeDIM sample or uploaded window. Model output is separate from known simulator leak state. Missing/corrupt model files and invalid data report errors without disabling the hydraulic controls.

## Visual review

The exact user reference was supplied as a screenshot after its Dribbble URL was denied by the environment proxy. The screenshot was inspected directly. The implemented design follows its charcoal surfaces, restrained orange accents, dominant industrial model and right-side pressure gauge. See DESIGN_NOTES.md.

Desktop, active-leak, mobile and model-result screenshots were captured and inspected. Tank, pump and pipe GLBs remain visible; controls, camera selection, pressure gauge and model results are functional. Labels were reduced to avoid obscuring the equipment. Screenshots are generated in ignored `test-results/desktop.png`, `leak.png`, `mobile.png`, and `ml-results.png`.

## Regression protection

The hydraulic solver, fixed time step, parameter effects, six scenarios, pause/reset semantics and bounded history are unchanged. The two engine/store diffs only simplify text. Browser checks still exercise pump adjustment, valve closure to zero delivered flow, PIPE-02 leakage/severity, accumulated loss, real events, chart rendering, camera controls, pause/time freeze and reset. Mobile verifies selection/control access without horizontal overflow.

A first error-handling browser test used an unscoped alert locator that also matched Next's route announcer. The test was corrected to scope the alert to the model dialog; no application error was suppressed. An earlier loading cleanup issue from the original implementation remains fixed; the desktop and ML workflows assert no page errors.

## Limits

- Model evaluation is exploratory and not independently event-validated. No field performance or simulator-to-BattLeDIM transfer accuracy is claimed. The only model classes are NORMAL and LEAK.
- No connection from current simulated sensors to the 36-channel model input is claimed. That requires a calibrated mapping or retraining.
- No hardware mobile benchmark, measured FPS or long-running memory profile was performed. Headless software rendering is functional validation, not a performance guarantee.
- Mobile inspector is stacked below the viewport rather than a modal bottom sheet.
- Original asset license verification remains unresolved as described in ASSET_LICENSES.md.
- No Vercel deployment or newly published environment snapshot was tested.

## Reusable environment

The saved startup instructions now describe the installed ONNX model and its input requirements. Temporary Dribbble domain additions were removed from the draft after the user supplied the screenshot; the original package-manager network preset remains. No broader access is required for normal app use or local inference. Draft saving does not publish an environment snapshot.

## Typography and terminology update

Geist Sans 1.9.0 is served locally through Next.js. Control labels, explanatory text and values have larger, consistent type sizes. The visible component names are Tangki utama, Pompa air, Pipa masuk, Pipa utama, Pipa keluaran, Katup pengatur, Sensor tekanan, Sensor debit and Konsumen. Internal IDs remain unchanged and are shown only under the optional Informasi teknis details. Event descriptions, scenario descriptions and scene labels use these same friendly names. ML actions now say Analisis data and Uji deteksi kebocoran.

Verification rerun: 20 unit tests passed; six Chromium tests passed in 19.3 seconds; strict type checking, lint and the production build passed. The added browser check verifies Geist is the computed body font, friendly names appear in the scene/sidebar/inspector, internal codes are hidden initially, and technical details can be opened. No hydraulic equations or ONNX feature mathematics were changed. Screenshot documentation is captured from the local production build, not the externally supplied Vercel URL.

A separate documentation capture ran the production app through 16 usage steps after the typography update: network overview, selection/focus, normal operation, small/major leaks, flow chart, closed valve, pump adjustment, sensor fault, event log/pause, reset, normal/leak model samples, six-sample parity, JSON upload and mobile controls. The capture reported zero browser page errors. A 17-page PDF (cover plus 16 steps) and the original PNG files were generated as delivery artifacts outside the repository.
