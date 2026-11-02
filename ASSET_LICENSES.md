# Asset provenance and inspection

All three files were supplied by the user. Original bytes are retained in `public/models` under short registry names. No author, download URL, or license evidence was embedded in the supplied request. No license has been invented.

| File used   | Supplied filename / attribution                 | License status                                                                                                                         |
| ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `tank.glb`  | Water Tank Floor by Quaternius - xgsh3kWbAM.glb | User identifies Quaternius. Quaternius commonly distributes CC0 packs, but the exact pack and license for this copy remain unverified. |
| `pipes.glb` | Pipes by Quaternius - GB6AFkoiZb.glb            | Same verification limitation; retain Quaternius attribution.                                                                           |
| `pump.glb`  | centrifugal_water_pump.glb                      | Sketchfab-style hierarchy; original author, source URL, and redistribution terms unknown. Verify before public redistribution.         |

## Measured audit

`npm run audit:assets` parses the glTF with Three.js GLTFLoader, preserves node transforms and computes world bounding boxes (replacing textured materials only in the audit process to avoid requiring a browser image decoder).

| Model |     Bytes | World dimensions x/y/z   | Structure                                                                                                                                                                             |
| ----- | --------: | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipes |    20,844 | 1.002 / 0.956 / 4.266    | RootNode → Pipes; one mesh, two material primitives (Grey/Grey2). Not independently named modular pieces.                                                                             |
| Tank  |    25,696 | 1.760 / 1.909 / 4.569    | RootNode → WaterTank_Floor; one mesh, three material primitives (Grey/Grey2/White).                                                                                                   |
| Pump  | 4,159,112 | 0.0471 / 0.0760 / 0.0471 | Sketchfab_model → Pump.fbx → RootNode → pump_low → a_low through h_low; eight meshes, one blinn4 material. Three embedded PNG textures: base color, metallic/roughness/AO and normal. |

Combined essential model payload: 4,205,652 bytes (about 4.01 MiB). No external texture references and no embedded animations. Source world transforms include Quaternius scale 88.0093 and a quarter-turn; pump includes nested transforms. Runtime centers each model and anchors its minimum Y at local ground, then scales by longest dimension. Tank/pipe assemblies rotate about Y to align along the network. Procedural connector pipes, valve, sensors, supports, particles and engineering floor supplement the imported models. Pump/tank port locations are approximate display connections, not manufacturer CAD interfaces. No asset optimization or geometry extraction was necessary for this payload.

## Interface font

Geist Sans 1.9.0 is supplied by the `geist` npm package, maintained by Vercel. It is self-hosted through Next.js local-font handling; the browser makes no Google Fonts or other external font requests. License: SIL Open Font License 1.1. The full supplied license is retained at `public/licenses/Geist-OFL.txt`.
