import fs from "node:fs";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Box3, Vector3 } from "three";
// Node has no browser ImageBitmap; substitute material loading only for bounds inspection.
for (const name of ["pipes", "pump", "tank"]) {
  const buffer = fs.readFileSync(`public/models/${name}.glb`);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: "audit-materials",
    loadMaterial: () => Promise.resolve(new Material()),
  }));

  const data = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  const gltf = await loader.parseAsync(data, "");
  gltf.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(gltf.scene);
  console.log(
    JSON.stringify({
      name,
      bytes: buffer.length,
      meshes: json.meshes.map((m) => ({
        name: m.name,
        primitives: m.primitives.length,
      })),
      nodes: json.nodes.map((n) => n.name),
      min: box.min.toArray(),
      max: box.max.toArray(),
      dimensions: box.getSize(new Vector3()).toArray(),
      materials: json.materials.map((m) => m.name),
      embeddedImages: json.images?.length ?? 0,
      animations: json.animations?.length ?? 0,
    }),
  );
}
import { MeshStandardMaterial as Material } from "three";
