"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useState, useId, type ReactNode } from "react";
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
} from "lucide-react";
import { motion } from "motion/react";
import { componentInfo } from "@/lib/ui/components";
import { useSimulation } from "@/stores/simulation-store";
import {
  scenarios,
  type ComponentId,
  type Scenario,
} from "@/lib/simulation/engine";
import Monitoring from "@/components/monitoring/Monitoring";
import MLWorkbench from "@/components/ml/MLWorkbench";
const Scene = dynamic(() => import("@/components/scene/WaterNetworkScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Menyiapkan jaringan air…</div>,
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
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  max?: number;
  help?: string;
}) {
  const helpId = useId();
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
        aria-describedby={help ? helpId : undefined}
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
      {help && (
        <span className="slider-help" id={helpId}>
          {help}
        </span>
      )}
    </label>
  );
}
export default function SimulatorShell() {
  const s = useSimulation();
  const [tools, setTools] = useState(false),
    [hint, setHint] = useState(true);
  useEffect(() => {
    const id = setInterval(() => useSimulation.getState().tick(), 250);
    return () => clearInterval(id);
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
            <small>Simulasi jaringan air</small>
          </span>
        </Link>
        <div className="project-name">
          <span className="divider" />
          <span>
            Simulasi air <small>Jaringan distribusi</small>
          </span>
        </div>
        <div className="header-end">
          <span className={`status ${s.running ? "active" : ""}`}>
            <i />
            {s.running ? "Simulasi berjalan" : "Simulasi dijeda"}
          </span>
          <span className="clock">
            {clock}
            <small> waktu simulasi</small>
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
            <SlidersHorizontal size={15} /> Pengaturan
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
              Skenario
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
              Kondisi yang diterapkan pada jaringan
            </div>
          </section>
          <section>
            <div className="section-heading">Operasi jaringan</div>
            <Slider
              label="Atur Pompa"
              help="Mengatur kuatnya dorongan air."
              value={s.parameters.pump}
              onChange={(pump) => s.set({ pump }, `Pompa diatur ke ${pump}%`)}
            />
            <Slider
              label="Bukaan Katup"
              help="0% tertutup, 100% terbuka."
              value={s.parameters.valve}
              onChange={(valve) =>
                s.set({ valve }, `Katup diatur ke ${valve}%`)
              }
            />
            <Slider
              label="Beban Konsumsi"
              help="Kebutuhan air konsumen, dalam liter per menit."
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
              Komponen <small>9</small>
            </div>
            {components.map((id) => (
              <button
                key={id}
                data-component-id={id}
                className={`component-item ${s.selected === id ? "chosen" : ""}`}
                onClick={() => {
                  s.select(id);
                  setTools(false);
                }}
              >
                <Box size={14} />
                <span>
                  {componentInfo[id].name}
                  <small>{componentInfo[id].description}</small>
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
              Perhitungan di browser
              <small>Tidak terhubung ke sensor fisik</small>
            </span>
          </div>
        </aside>
        <div className="central">
          <div className="scene-toolbar">
            <div>
              <span className="eyebrow">Simulasi interaktif</span>
              <h1>Jaringan distribusi air</h1>
            </div>
            <span className="environment-badge">
              <i /> Model 3D
            </span>
          </div>
          <div className="scene-wrap" data-testid="scene">
            <SceneBoundary>
              <Scene />
            </SceneBoundary>
            <div className="view-badge">
              <Box size={13} /> Tampilan 3D
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
                <span>Pilih pipa untuk mengatur kebocoran.</span>
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
              Geser untuk memutar. Gulir untuk zoom.
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
              <i /> Perhitungan diperbarui otomatis
            </span>
          </div>
          <Monitoring />
        </div>
        <aside className="inspector">
          <div className="sidebar-title">
            <ScanLine size={15} /> Detail komponen
          </div>
          <div className="metrics">
            <Metric
              label="Tekanan"
              gauge={s.sample.pressure}
              value={fmt(s.sample.pressure)}
              unit="bar"
              icon={<Gauge size={17} />}
              note={
                s.parameters.sensorFault
                  ? "Sensor terganggu"
                  : "Tekanan air di jaringan"
              }
            />
            <Metric
              label="Debit masuk"
              value={fmt(s.sample.flow)}
              unit="L/min"
              icon={<Activity size={17} />}
              note="Air yang masuk ke jaringan"
            />
            <Metric
              label="Air terbuang"
              value={fmt(s.sample.loss)}
              unit="L"
              icon={<Droplets size={17} />}
              note={`${fmt(s.sample.leakage)} L/min bocor`}
              alert={s.parameters.leak}
            />
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
                {leakHere ? "Bocor" : "Dipilih"}
              </span>
              <h2>{componentInfo[s.selected].name}</h2>
              <p>{componentInfo[s.selected].description}</p>
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
              <details className="technical-details">
                <summary>Informasi teknis</summary>
                <dl>
                  <div>
                    <dt>Kode komponen</dt>
                    <dd>
                      <code>{s.selected}</code>
                    </dd>
                  </div>
                </dl>
              </details>
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
                          `${!leakHere ? "Kebocoran diaktifkan" : "Kebocoran dinonaktifkan"} pada ${componentInfo[s.selected].name.toLowerCase()}`,
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
                        `Tingkat kebocoran ${componentInfo[s.selected].name.toLowerCase()}: ${severity}%`,
                      )
                    }
                  />
                  <div className="inspector-callout">
                    <Info size={15} />
                    <span>
                      Kebocoran mengurangi tekanan dan debit yang sampai ke
                      konsumen.
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
                  label="Isi tangki"
                  value={s.parameters.tank}
                  onChange={(tank) => s.set({ tank }, `Isi tangki ${tank}%`)}
                />
              ) : (
                <p className="muted small">
                  {s.selected === "NODE-01"
                    ? `Debit tersalurkan: ${fmt(s.sample.delivered)} L/min`
                    : `Pembacaan sensor ${s.parameters.sensorFault ? "menyimpang dari kondisi sebenarnya" : "menunjukkan kondisi jaringan air"}.`}
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
          <MLWorkbench />
        </aside>
      </div>
      <footer className="app-footer">
        <span>
          <i /> Leaksense / 0.2
        </span>
        <span>Simulasi aliran dan tekanan air</span>
        <span>Data tidak dikirim ke server</span>
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
  gauge,
}: {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  note: string;
  alert?: boolean;
  gauge?: number;
}) {
  return (
    <div
      className={`metric ${alert ? "alert" : ""} ${gauge !== undefined ? "pressure-metric" : ""}`}
    >
      <div className="metric-label">
        {label}
        {icon}
      </div>
      {gauge !== undefined && (
        <svg
          className="metric-gauge"
          viewBox="0 0 120 90"
          role="img"
          aria-label="Skala tekanan 0 sampai 4 bar"
        >
          <path
            d="M18 76 A49 49 0 1 1 102 76"
            pathLength="100"
            fill="none"
            stroke="#4c4c47"
            strokeWidth="5"
          />
          <path
            d="M18 76 A49 49 0 1 1 102 76"
            pathLength="100"
            fill="none"
            stroke="#e7a05b"
            strokeWidth="5"
            strokeDasharray={`${Math.max(0, Math.min(100, (gauge / 4) * 100))} 100`}
            strokeLinecap="round"
          />
        </svg>
      )}
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
