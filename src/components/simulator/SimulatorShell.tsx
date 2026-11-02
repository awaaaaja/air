"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Droplets,
  Play,
  Pause,
  RotateCcw,
  Box,
  Focus,
  ChevronRight,
  SlidersHorizontal,
  Radio,
  Thermometer,
  ArrowUpRight,
  Gauge,
  Info,
  X,
  PanelLeft,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useSimulation } from "@/stores/simulation-store";
import {
  scenarios,
  type ComponentId,
  type Scenario,
} from "@/lib/simulation/engine";
import Monitoring from "@/components/monitoring/Monitoring";
import { detectModel } from "@/lib/ml/onnx-client";
const Scene = dynamic(() => import("@/components/scene/WaterNetworkScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Menyiapkan digital twin…</div>,
});
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="scene-loading">
        WebGL tidak tersedia atau aset gagal dimuat. Coba browser dengan
        akselerasi grafis. Kontrol dan simulasi tetap dapat digunakan.
      </div>
    ) : (
      this.props.children
    );
  }
}
const components: ComponentId[] = [
  "TANK-01",
  "PUMP-01",
  "PIPE-01",
  "PIPE-02",
  "PIPE-03",
  "VALVE-01",
  "PRESSURE-01",
  "FLOW-01",
  "NODE-01",
];
const names: Record<ComponentId, string> = {
  "TANK-01": "Reservoir utama",
  "PUMP-01": "Pompa sentrifugal",
  "PIPE-01": "Pipa hulu",
  "PIPE-02": "Pipa pemantauan",
  "PIPE-03": "Pipa hilir",
  "VALVE-01": "Katup kontrol",
  "PRESSURE-01": "Sensor tekanan",
  "FLOW-01": "Sensor debit",
  "NODE-01": "Titik konsumsi",
};
const fmt = (n: number) =>
  n.toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
function Slider({
  label,
  value,
  onChange,
  unit = "%",
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  max?: number;
}) {
  return (
    <label className="slider-label">
      <span>
        {label}
        <strong>
          {value} <small>{unit}</small>
        </strong>
      </span>
      <input
        aria-label={label}
        type="range"
        min="0"
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="range-ends">
        <small>0 {unit}</small>
        <small>
          {max} {unit}
        </small>
      </span>
    </label>
  );
}
export default function SimulatorShell() {
  const s = useSimulation();
  const [tools, setTools] = useState(false),
    [hint, setHint] = useState(true),
    [model, setModel] = useState("Model ML belum tersedia");
  useEffect(() => {
    const id = setInterval(() => useSimulation.getState().tick(), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    let active = true;
    detectModel().then((status) => {
      if (active) setModel(status.message);
    });
    return () => {
      active = false;
    };
  }, []);
  const pipe = s.selected.startsWith("PIPE");
  const leakHere =
    pipe && s.parameters.leak && s.parameters.pipe === s.selected;
  const seconds = Math.floor(s.sample.time);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="LEAKSENSE AI">
          <span className="brand-icon">
            <Droplets size={23} />
          </span>
          <span>
            LEAKSENSE <b>AI</b>
            <small>WATER NETWORK DIGITAL TWIN</small>
          </span>
        </Link>
        <div className="project-name">
          <span className="divider" />
          <span>
            Jaringan Demonstrasi <small>Lingkungan simulasi / 01</small>
          </span>
        </div>
        <div className="header-end">
          <span className={`status ${s.running ? "active" : ""}`}>
            <i />
            {s.running ? "Simulasi berjalan" : "Simulasi dijeda"}
          </span>
          <span className="clock">
            {clock}
            <small> WAKTU SIMULASI</small>
          </span>
          <button
            className="icon-button"
            title="Reset Simulasi"
            aria-label="Reset Simulasi"
            onClick={s.reset}
          >
            <RotateCcw size={17} />
          </button>
          <button
            className="icon-button mobile-menu"
            aria-label="Buka kontrol"
            onClick={() => setTools(!tools)}
          >
            <PanelLeft size={18} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <aside className={`sidebar ${tools ? "is-open" : ""}`}>
          <div className="sidebar-title">
            <SlidersHorizontal size={15} /> KONTROL SIMULASI
            <button
              className="icon-button mobile-menu"
              onClick={() => setTools(false)}
              aria-label="Tutup kontrol"
            >
              <X size={16} />
            </button>
          </div>
          <section>
            <label className="eyebrow" htmlFor="scenario">
              SKENARIO AKTIF
            </label>
            <select
              id="scenario"
              value={s.scenario}
              onChange={(e) => s.choose(e.target.value as Scenario)}
            >
              {Object.entries(scenarios).map(([key, v]) => (
                <option key={key} value={key}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="muted small">{scenarios[s.scenario].description}</p>
            <div className="truth-label">
              <ShieldCheck size={12} /> Skenario simulasi · ground truth
            </div>
          </section>
          <section>
            <div className="section-heading">
              Parameter jaringan <span>LIVE</span>
            </div>
            <Slider
              label="Atur Pompa"
              value={s.parameters.pump}
              onChange={(pump) => s.set({ pump }, `Pompa diatur ke ${pump}%`)}
            />
            <Slider
              label="Bukaan Katup"
              value={s.parameters.valve}
              onChange={(valve) =>
                s.set({ valve }, `Katup diatur ke ${valve}%`)
              }
            />
            <Slider
              label="Beban Konsumsi"
              value={s.parameters.demand}
              max={180}
              unit="L/min"
              onChange={(demand) =>
                s.set({ demand }, `Konsumsi diatur ke ${demand} L/min`)
              }
            />
          </section>
          <section className="network-list">
            <div className="section-heading">
              Struktur jaringan <small>09</small>
            </div>
            {components.map((id) => (
              <button
                key={id}
                className={`component-item ${s.selected === id ? "chosen" : ""}`}
                onClick={() => {
                  s.select(id);
                  setTools(false);
                }}
              >
                <Box size={14} />
                <span>
                  {id}
                  <small>{names[id]}</small>
                </span>
                <i
                  className={
                    s.parameters.leak && s.parameters.pipe === id
                      ? "warning"
                      : ""
                  }
                />
                {s.selected === id && <ChevronRight size={13} />}
              </button>
            ))}
          </section>
          <div className="sidebar-footer">
            <Radio size={13} />
            <span>
              Mesin hidraulika lokal<small>Tanpa koneksi perangkat fisik</small>
            </span>
          </div>
        </aside>
        <div className="central">
          <div className="scene-toolbar">
            <div>
              <span className="eyebrow">RUANG KERJA / DIGITAL TWIN</span>
              <h1>
                Jaringan distribusi air <span>01</span>
              </h1>
            </div>
            <span className="environment-badge">
              <i /> SIMULASI LOKAL
            </span>
          </div>
          <div className="metrics">
            <Metric
              label="TEKANAN SENSOR"
              value={fmt(s.sample.pressure)}
              unit="bar"
              icon={<Gauge size={17} />}
              note={
                s.parameters.sensorFault
                  ? "Observasi sensor terganggu"
                  : "PRESSURE-01"
              }
            />
            <Metric
              label="DEBIT SENSOR"
              value={fmt(s.sample.flow)}
              unit="L/min"
              icon={<Activity size={17} />}
              note="FLOW-01 · aliran masuk"
            />
            <Metric
              label="KEHILANGAN AIR"
              value={fmt(s.sample.loss)}
              unit="L"
              icon={<Droplets size={17} />}
              note={`${fmt(s.sample.leakage)} L/min · kebocoran`}
              alert={s.parameters.leak}
            />
          </div>
          <div className="scene-wrap" data-testid="scene">
            <SceneBoundary>
              <Scene />
            </SceneBoundary>
            <div className="view-badge">
              <Box size={13} /> PERSPEKTIF 3D <span>•</span> JARINGAN
              DEMONSTRASI
            </div>
            <div className="camera-tools">
              <button
                aria-label="Reset kamera"
                title="Reset kamera"
                onClick={s.resetCamera}
              >
                <RotateCcw size={17} />
              </button>
              <button
                aria-label="Fokus komponen"
                title="Fokus komponen terpilih"
                onClick={s.focusCamera}
              >
                <Focus size={19} />
              </button>
            </div>
            {hint && (
              <div className="hint">
                <Info size={15} />
                <span>
                  Klik pipa → aktifkan kebocoran → amati perubahan debit.
                </span>
                <button
                  aria-label="Tutup petunjuk"
                  onClick={() => setHint(false)}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="scene-legend">
              <span>
                <i className="cyan" /> Aliran air
              </span>
              <span>
                <i className="green" /> Normal
              </span>
              <span>
                <i className="orange" /> Kebocoran
              </span>
            </div>
            <div className="orbit-hint">
              Geser untuk orbit <span>·</span> Scroll untuk zoom
            </div>
          </div>
          <div className="playback">
            <button className="primary-button" onClick={s.toggle}>
              {s.running ? <Pause size={15} /> : <Play size={15} />}{" "}
              {s.running ? "Jeda" : "Jalankan Simulasi"}
            </button>
            <div className="playback-speed">
              <label htmlFor="speed">Kecepatan</label>
              <select
                id="speed"
                value={s.speed}
                onChange={(e) => s.setSpeed(Number(e.target.value))}
              >
                <option value={1}>1×</option>
                <option value={2}>2×</option>
                <option value={4}>4×</option>
              </select>
            </div>
            <span className="playback-note">
              <i /> Deterministik · Δt 0,25 s
            </span>
          </div>
          <Monitoring />
        </div>
        <aside className="inspector">
          <div className="sidebar-title">
            <ScanLine size={15} /> INSPEKTOR KOMPONEN
          </div>
          <motion.div
            key={s.selected}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="inspector-heading">
              <div className="equipment-icon">
                <Box size={28} />
              </div>
              <span className={`pill ${leakHere ? "warn" : ""}`}>
                {leakHere ? "KEBOCORAN" : "TERPILIH"}
              </span>
              <h2>{s.selected}</h2>
              <p>{names[s.selected]}</p>
            </div>
            <div className="inspector-body">
              <div className="section-heading">Informasi komponen</div>
              <dl>
                <div>
                  <dt>Kondisi</dt>
                  <dd className={leakHere ? "orange-text" : "green-text"}>
                    {leakHere
                      ? "Bocor"
                      : s.selected === "PUMP-01" && s.parameters.pumpFault
                        ? "Terganggu"
                        : "Normal"}
                  </dd>
                </div>
                <div>
                  <dt>Jaringan</dt>
                  <dd>Distribusi utama</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>Simulasi lokal</dd>
                </div>
              </dl>
              {pipe ? (
                <>
                  <div className="section-heading separated">
                    Simulasi kebocoran
                  </div>
                  <div className="switch-row">
                    <span>Aktifkan Kebocoran</span>
                    <button
                      className={`switch ${leakHere ? "on" : ""}`}
                      role="switch"
                      aria-label="Aktifkan Kebocoran"
                      aria-checked={leakHere}
                      onClick={() =>
                        s.set(
                          { leak: !leakHere, pipe: s.selected as "PIPE-01" },
                          `${!leakHere ? "Kebocoran diaktifkan" : "Kebocoran dinonaktifkan"} pada ${s.selected}`,
                        )
                      }
                    >
                      <span />
                    </button>
                  </div>
                  <Slider
                    label="Tingkat Kebocoran"
                    value={s.parameters.severity}
                    onChange={(severity) =>
                      s.set(
                        { severity, pipe: s.selected as "PIPE-01" },
                        `Tingkat kebocoran ${s.selected}: ${severity}%`,
                      )
                    }
                  />
                  <div className="inspector-callout">
                    <Info size={15} />
                    <span>
                      Ubah kondisi pipa dan amati respons tekanan serta debit
                      jaringan.
                    </span>
                  </div>
                </>
              ) : s.selected === "PUMP-01" ? (
                <Slider
                  label="Daya Pompa"
                  value={s.parameters.pump}
                  onChange={(pump) => s.set({ pump }, `Daya pompa ${pump}%`)}
                />
              ) : s.selected === "VALVE-01" ? (
                <Slider
                  label="Posisi Katup"
                  value={s.parameters.valve}
                  onChange={(valve) =>
                    s.set({ valve }, `Posisi katup ${valve}%`)
                  }
                />
              ) : s.selected === "TANK-01" ? (
                <Slider
                  label="Level Reservoir"
                  value={s.parameters.tank}
                  onChange={(tank) =>
                    s.set({ tank }, `Level reservoir ${tank}%`)
                  }
                />
              ) : (
                <p className="muted small">
                  {s.selected === "NODE-01"
                    ? `Debit tersalurkan: ${fmt(s.sample.delivered)} L/min`
                    : `Observasi ${s.parameters.sensorFault ? "terganggu oleh bias sensor" : "mengikuti keadaan hidraulika jaringan"}.`}
                </p>
              )}
              <div className="section-heading separated">
                Pembacaan jaringan <Activity size={13} />
              </div>
              <div className="sensor-reading">
                <span>
                  <Thermometer size={14} /> Tekanan sebenarnya
                </span>
                <strong>
                  {fmt(s.sample.truePressure)} <small>bar</small>
                </strong>
              </div>
              <div className="sensor-reading">
                <span>
                  <Activity size={14} /> Debit tersalurkan
                </span>
                <strong>
                  {fmt(s.sample.delivered)} <small>L/min</small>
                </strong>
              </div>
              <button className="outline-button" onClick={s.focusCamera}>
                <Focus size={15} /> Fokus pada komponen{" "}
                <ArrowUpRight size={13} />
              </button>
            </div>
          </motion.div>
          <div className="ml-panel">
            <div className="ml-title">
              <span className="ml-icon">AI</span>
              <span>DIAGNOSIS MACHINE LEARNING</span>
            </div>
            <h3>{model}</h3>
            <p>
              Simulasi berjalan menggunakan model hidraulika sederhana. Prediksi
              Machine Learning akan tersedia setelah model ONNX diintegrasikan.
            </p>
            <span className="model-status">
              <i /> MENUNGGU MODEL ONNX
            </span>
          </div>
        </aside>
      </div>
      <footer className="app-footer">
        <span>
          <i /> LEAKSENSE ENGINE v0.1
        </span>
        <span>
          Model hidraulika sederhana · bukan analisis rekayasa tervalidasi
        </span>
        <span>SELURUH DATA DIPROSES DI BROWSER</span>
      </footer>
    </main>
  );
}
function Metric({
  label,
  value,
  unit,
  icon,
  note,
  alert = false,
}: {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  note: string;
  alert?: boolean;
}) {
  return (
    <div className={`metric ${alert ? "alert" : ""}`}>
      <div className="metric-label">
        {label}
        {icon}
      </div>
      <div className="metric-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="metric-note">
        <i />
        {note}
      </div>
    </div>
  );
}
