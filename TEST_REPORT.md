# Verification report

Executed in the cloud environment using Node.js 24.19.0, Next.js 15.5.28 and system Chromium. No ONNX model was supplied.

## Passed

- `npm run typecheck`: TypeScript strict check.
- `npm run lint`: no errors or warnings in application/configuration sources. Generated vendor ONNX runtime files are excluded.
- `npm test`: 12 tests in two suites. Nine verify deterministic hydraulics, continuity, pump influence, valve closure, leak severity, demand response, sensor fault separation, finite/nonnegative edge values, fixed time/loss integration and pause, reset and bounded history. Three verify ML feature ordering/normalization, insufficient history and invalid scale rejection.
- `npm run build`: optimized static Next.js production page generated successfully. First-load page JavaScript reported by Next: 264 kB (the WebGL scene is dynamically loaded).
- `npm run test:e2e`: 3 browser tests passed against the production build, including desktop core workflow, mobile controls/overflow, all six scenario presets and GLB route checks. Final production rerun after the WASM-only packaging refinement: all 3 passed in 12.6 seconds.
- `npm run audit:assets`: all three GLBs parse and yield finite world bounds. Combined original model payload is 4,205,652 bytes. Repeated supplied uploads have identical SHA-256 hashes.
- Desktop, active-leak and 390px mobile full-page screenshots captured and visually inspected. Imported tank/pump/pipe assemblies are visible; connected layout, illuminated pump textures, selected component, leak stream, control panels and narrow viewport were reviewed.

Browser workflow exercises orbit/zoom gestures and focus/reset actions, synchronized PIPE-02 selection, start, leak enable and severity, accumulated loss, chart path, real event entries, zero delivered flow at closed valve, pump control, pause/time freeze, reset, truthful unavailable ML message and mobile sidebar/inspector controls. Mobile inspector is stacked below the canvas rather than a modal bottom sheet.

## Issues found and resolved

- Initial dependency installation and listening sockets required approved commands outside the restrictive command sandbox.
- Playwright's browser download was denied by destination policy; used existing system Chromium without bypassing the proxy.
- Replaced a timing-sensitive canvas hover test with pointer gestures at canvas coordinates.
- Removed Drei Html from the Suspense loading fallback after a browser run caught a DOM cleanup exception; external loading overlay resolves the error. The final desktop workflow asserts no page errors.
- Reduced mobile label clutter and widened its camera to fit the network.
- Excluded generated vendor runtime files from source linting; copied only WASM execution-provider assets for future inference.

## Not verified / limitations

- No actual ONNX inference, export parity, model accuracy, BattLeDIM class support or ML confidence is claimed. The feature adapter and loader exist; connecting a validated model to enabled result UI is future work.
- No measured FPS, frame-time profile, memory soak test or hardware mobile-device benchmark. Software-rendered headless Chromium does not establish ordinary-laptop rendering performance.
- No Vercel deployment, external publication, GitHub push or new-task environment snapshot restoration was performed.
- The pump asset's source/redistribution license and exact Quaternius pack licenses remain unresolved; see ASSET_LICENSES.md.
- Hydraulic formulation is deliberately simplified and uncalibrated; see SIMULATION_MODEL.md.
- Small/major leaks are parameter intensities of one active leak, not simultaneous failures. Source settings are static; no tank depletion or transient hydraulic physics.

Screenshots are local, ignored test artifacts in `test-results/desktop.png`, `test-results/leak.png`, and `test-results/mobile.png`. Rerunning Playwright replaces this directory.

## Reusable environment configuration

Saved `install_script` (npm ci, strict type check, unit tests) and `start_skill` (checkout reuse, server startup, asset/HTTP checks and validation commands) to the environment draft. Saving does not publish or test restoration. Review and save these settings and publish the environment through the product when desired.
