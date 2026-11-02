"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  Grid,
  Line,
  useProgress,
} from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { Vector3, InstancedMesh, Object3D, Group } from "three";
import type { OrbitControls as Controls } from "three-stdlib";
import { useSimulation } from "@/stores/simulation-store";
import type { ComponentId } from "@/lib/simulation/engine";
import AssetModel from "./AssetModel";
export const positions: Record<ComponentId, [number, number, number]> = {
  "TANK-01": [-5, 0, -1.5],
  "PUMP-01": [-2.5, 0, 0],
  "PIPE-01": [-0.5, 0.65, 0],
  "PIPE-02": [2.3, 0.65, 0],
  "PIPE-03": [5.1, 0.65, 0],
  "VALVE-01": [6.5, 0.65, 0],
  "PRESSURE-01": [1.2, 0.65, 0],
  "FLOW-01": [5.9, 0.65, 0],
  "NODE-01": [7.4, 0.65, 0],
};
function Equipment({
  id,
  children,
  labelOffset = 1.3,
}: {
  id: ComponentId;
  children: React.ReactNode;
  labelOffset?: number;
}) {
  const selected = useSimulation((s) => s.selected === id);
  const select = useSimulation((s) => s.select);
  const [hover, setHover] = useState(false);
  return (
    <group
      position={positions[id]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        select(id);
      }}
    >
      {children}
      {(selected || hover) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.015 - positions[id][1], 0]}
        >
          <ringGeometry args={[0.65, 0.7, 48]} />
          <meshBasicMaterial
            color={selected ? "#3f8185" : "#737a6d"}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
      {(selected ||
        hover ||
        ["TANK-01", "PUMP-01", "NODE-01"].includes(id)) && (
        <Html
          position={[0, labelOffset, 0]}
          center
          distanceFactor={10}
          zIndexRange={[10, 0]}
        >
          <button
            className={`scene-label ${selected ? "selected" : ""}`}
            onClick={() => select(id)}
          >
            {id}
            <span>
              {id.startsWith("PIPE")
                ? "Distribusi"
                : id === "TANK-01"
                  ? "Reservoir"
                  : id === "PUMP-01"
                    ? "Pompa sentrifugal"
                    : id === "VALVE-01"
                      ? "Katup kontrol"
                      : "Titik jaringan"}
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}
function Tube({
  from,
  to,
  color = "#777e75",
  radius = 0.13,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  radius?: number;
}) {
  const a = new Vector3(...from),
    b = new Vector3(...to),
    mid = a.clone().add(b).multiplyScalar(0.5);
  const g = useRef<Group>(null);
  useEffect(() => {
    g.current?.quaternion.setFromUnitVectors(
      new Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
  });
  return (
    <group ref={g} position={mid}>
      <mesh>
        <cylinderGeometry args={[radius, radius, a.distanceTo(b), 16]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.4} />
      </mesh>
    </group>
  );
}
function Effects() {
  const flow = useRef<InstancedMesh>(null),
    leak = useRef<InstancedMesh>(null);
  const phase = useRef(0);
  const obj = new Object3D();
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  useFrame((_, dt) => {
    const { running, sample, parameters: p, speed } = useSimulation.getState();
    if (running && !reduced.current) phase.current += Math.min(dt, 0.1) * speed;
    for (let i = 0; i < 32; i++) {
      const x =
        -3.6 + ((i / 32 + (phase.current * sample.trueFlow) / 2000) % 1) * 10.6;
      const downstream = x > positions[p.pipe][0];
      const active = (downstream ? sample.delivered : sample.trueFlow) > 0.1;
      obj.position.set(x, 0.85, 0);
      obj.scale.setScalar(active ? 0.045 : 0);
      obj.updateMatrix();
      flow.current?.setMatrixAt(i, obj.matrix);
    }
    if (flow.current) flow.current.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 32; i++) {
      const t = (i / 32 + phase.current * 0.7) % 1;
      const pos = positions[p.pipe];
      obj.position.set(
        pos[0],
        pos[1] + Math.sin(t * Math.PI) * (0.5 + p.severity / 80),
        pos[2] + t * (0.4 + p.severity / 60),
      );
      obj.scale.setScalar(
        p.leak && sample.leakage > 0 ? 0.018 + p.severity / 2200 : 0,
      );
      obj.updateMatrix();
      leak.current?.setMatrixAt(i, obj.matrix);
    }
    if (leak.current) leak.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh
        ref={flow}
        args={[undefined, undefined, 32]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#95bec2" />
      </instancedMesh>
      <instancedMesh
        ref={leak}
        args={[undefined, undefined, 32]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#95bec2" />
      </instancedMesh>
    </>
  );
}
function Camera() {
  const controls = useRef<Controls>(null);
  const reset = useSimulation((s) => s.camera),
    focus = useSimulation((s) => s.focus);
  const { camera, size } = useThree();
  const transitioning = useRef(true);
  const goal = useRef(new Vector3(1, 0, 0)),
    view = useRef(new Vector3(12, 11, 15));
  useEffect(() => {
    transitioning.current = true;
    goal.current.set(1, 0, 0);
    view.current.set(
      ...((size.width < 600 ? [17, 16, 24] : [11, 9, 14]) as [
        number,
        number,
        number,
      ]),
    );
  }, [reset, size.width]);
  useEffect(() => {
    if (focus) {
      transitioning.current = true;
      const p = positions[useSimulation.getState().selected];
      goal.current.set(...p);
      view.current.set(p[0] + 5, p[1] + 5, p[2] + 7);
    }
  }, [focus]);
  useFrame((_, dt) => {
    if (
      transitioning.current &&
      view.current.distanceTo(camera.position) > 0.05
    ) {
      camera.position.lerp(view.current, 1 - Math.exp(-dt * 5));
      controls.current?.target.lerp(goal.current, 1 - Math.exp(-dt * 5));
      controls.current?.update();
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[1, 0, 0]}
      minDistance={5}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.15}
      onStart={() => {
        transitioning.current = false;
      }}
      enableDamping
    />
  );
}
function Network() {
  const p = useSimulation((s) => s.parameters);
  const reading = useSimulation((s) => s.sample);
  return (
    <>
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#ffffff", "#939788", 1.4]} />
      <directionalLight position={[3, 10, 4]} intensity={2} />
      <directionalLight position={[-4, 5, -5]} color="#fff4df" intensity={2} />
      <mesh position={[0.6, -0.17, 0]}>
        <boxGeometry args={[16, 0.3, 7]} />
        <meshStandardMaterial color="#41423d" roughness={0.8} />
      </mesh>
      <Grid
        position={[0.6, -0.008, 0]}
        args={[16, 7]}
        cellSize={0.5}
        sectionSize={2}
        cellColor="#494b43"
        sectionColor="#56584e"
        fadeDistance={35}
        infiniteGrid={false}
      />
      <Equipment id="TANK-01" labelOffset={3.3}>
        <AssetModel name="tank" size={3.8} rotation={Math.PI / 2} />
      </Equipment>
      <Tube from={[-5, 0.65, 0]} to={[-2.5, 0.65, 0]} />
      <Tube from={[-5, 0.65, -1.5]} to={[-5, 0.65, 0]} />
      <Equipment id="PUMP-01" labelOffset={1.9}>
        <AssetModel name="pump" size={1.8} rotation={Math.PI / 2} />
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1.4, 0.2, 1.5]} />
          <meshStandardMaterial color="#92978b" />
        </mesh>
        <mesh position={[0, 1.1, 0]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshBasicMaterial
            color={
              p.pumpFault
                ? "#f59e0b"
                : reading.trueFlow > 0
                  ? "#22c55e"
                  : "#64748b"
            }
          />
        </mesh>
      </Equipment>
      <Tube from={[-2.5, 0.65, 0]} to={[7.4, 0.65, 0]} />
      {(["PIPE-01", "PIPE-02", "PIPE-03"] as const).map((id) => (
        <Equipment key={id} id={id} labelOffset={id === "PIPE-02" ? 1.7 : 1.25}>
          <group position={[0, -0.48, 0]}>
            <AssetModel name="pipes" size={2.65} rotation={Math.PI / 2} />
          </group>
          {p.leak && p.pipe === id && (
            <mesh position={[0, 0.3, 0]}>
              <octahedronGeometry args={[0.14]} />
              <meshBasicMaterial
                color={p.severity > 50 ? "#ef4444" : "#f59e0b"}
              />
            </mesh>
          )}
          <mesh position={[0, -0.4, 0]}>
            <boxGeometry args={[0.28, 0.5, 0.55]} />
            <meshStandardMaterial color="#989c91" />
          </mesh>
        </Equipment>
      ))}
      <Equipment id="VALVE-01" labelOffset={2}>
        <mesh>
          <sphereGeometry args={[0.24, 16, 16]} />
          <meshStandardMaterial color="#77929e" />
        </mesh>
        <Tube from={[0, 0, 0]} to={[0, 0.6, 0]} radius={0.055} />
        <mesh
          position={[0, 0.6, 0]}
          rotation={[Math.PI / 2, 0, ((p.valve / 100) * Math.PI) / 2]}
        >
          <torusGeometry args={[0.29, 0.045, 8, 24]} />
          <meshStandardMaterial color={p.valve === 0 ? "#ef4444" : "#e5a548"} />
        </mesh>
        <Line
          points={[
            [-0.28, 0.6, 0],
            [0.28, 0.6, 0],
          ]}
          color="#e5a548"
          lineWidth={3}
        />
      </Equipment>
      {(["PRESSURE-01", "FLOW-01"] as const).map((id) => (
        <Equipment
          key={id}
          id={id}
          labelOffset={id === "FLOW-01" ? -0.9 : -0.85}
        >
          <mesh position={[0, 0.28, 0]}>
            <boxGeometry args={[0.35, 0.42, 0.25]} />
            <meshStandardMaterial color="#137f9b" />
          </mesh>
          <mesh position={[0, 0.3, 0.14]}>
            <planeGeometry args={[0.25, 0.17]} />
            <meshBasicMaterial color="#8ce8ee" />
          </mesh>
        </Equipment>
      ))}
      <Equipment id="NODE-01">
        <mesh>
          <cylinderGeometry args={[0.27, 0.27, 1.1, 16]} />
          <meshStandardMaterial color="#949e90" />
        </mesh>
      </Equipment>
      {p.leak && reading.leakage > 0 && (
        <group position={positions[p.pipe]}>
          <Line
            points={[
              [0, 0.1, 0],
              [0, 0.6 + p.severity / 150, 0.4],
              [0, 0.4, 1],
              [0, -0.6, 1.5],
            ]}
            color="#8cb2b8"
            lineWidth={p.severity > 50 ? 3 : 1}
            transparent
            opacity={0.7}
          />
          <mesh position={[0, -0.63, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.28 + p.severity / 300, 32]} />
            <meshBasicMaterial color="#3f8185" transparent opacity={0.45} />
          </mesh>
          <Html
            position={[0, -0.1, 2]}
            center
            distanceFactor={15}
            zIndexRange={[9, 0]}
          >
            <span className="leak-label">Bocor {p.severity}%</span>
          </Html>
        </group>
      )}
      <Effects />
      <Camera />
    </>
  );
}
export default function WaterNetworkScene() {
  const { active } = useProgress();
  return (
    <>
      <Canvas
        camera={{ position: [11, 9, 14], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.setAttribute(
            "aria-label",
            "Jaringan distribusi air interaktif",
          );
          gl.domElement.dataset.ready = "true";
        }}
      >
        <color attach="background" args={["#292a28"]} />
        <fog attach="fog" args={["#292a28", 25, 65]} />
        <Suspense fallback={null}>
          <Network />
        </Suspense>
      </Canvas>
      {active && <div className="asset-loading">Memuat aset jaringan…</div>}
    </>
  );
}
