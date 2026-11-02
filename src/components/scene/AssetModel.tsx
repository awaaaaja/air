"use client";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Vector3, Mesh, MeshStandardMaterial } from "three";
import { assets, type AssetName } from "@/lib/assets/registry";
export default function AssetModel({
  name,
  size,
  rotation = 0,
}: {
  name: AssetName;
  size: number;
  rotation?: number;
}) {
  const gltf = useGLTF(assets[name]);
  const model = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const dimensions = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    scene.position.set(-center.x, -box.min.y, -center.z);
    const scale = size / Math.max(dimensions.x, dimensions.y, dimensions.z);
    scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        const normalize = (m: MeshStandardMaterial) => {
          const c = m.clone();
          c.metalness = Math.min(c.metalness, 0.45);
          c.roughness = Math.max(c.roughness, 0.45);
          return c;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(normalize)
          : normalize(o.material);
      }
    });
    return { scene, scale };
  }, [gltf, size]);
  return (
    <group rotation={[0, rotation, 0]} scale={model.scale}>
      <primitive object={model.scene} />
    </group>
  );
}
