"use client";
import { useEffect, useRef, useState } from "react";
import { X, ArrowUpRight, Upload, Loader2, Check } from "lucide-react";
import { loadModel, type ModelClient } from "@/lib/ml/onnx-client";
import { extractFeatures, sampleWindow } from "@/lib/ml/feature-extractor";
import type {
  SampleInference,
  InferenceResult,
  SensorWindow,
} from "@/lib/ml/types";
interface CheckResult {
  timestamp: string;
  passed: boolean;
  difference: number;
}
export default function MLWorkbench() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ml-panel">
        <div className="section-heading">
          Model kebocoran <span className="model-tag">ONNX</span>
        </div>
        <h3>BattLeDIM / L-Town</h3>
        <p>Model tersedia. Uji sampel atau unggah data 36 kanal sensor.</p>
        <button className="outline-button" onClick={() => setOpen(true)}>
          Buka pengujian model <ArrowUpRight size={15} />
        </button>
      </div>
      {open && <Workbench onClose={() => setOpen(false)} />}
    </>
  );
}
function Workbench({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    client = useRef<ModelClient | null>(null),
    fileInput = useRef<HTMLInputElement>(null);
  const [samples, setSamples] = useState<SampleInference[]>([]),
    [index, setIndex] = useState(0),
    [imported, setImported] = useState<SensorWindow | null>(null),
    [fileName, setFileName] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Memuat model"),
    [error, setError] = useState(""),
    [result, setResult] = useState<InferenceResult | null>(null),
    [checks, setChecks] = useState<CheckResult[] | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    let loaded: ModelClient | null = null;
    let failed = false;
    Promise.all([
      loadModel().then((model) => {
        loaded = model;
        if (!active || failed) {
          void model.dispose();
          loaded = null;
        }
        return model;
      }),
      fetch("/ml/sample_inference.json").then((r) => {
        if (!r.ok) throw new Error("Sampel tidak tersedia.");
        return r.json() as Promise<SampleInference[]>;
      }),
    ])
      .then(([model, data]) => {
        if (!active || failed) return;
        client.current = model;
        setSamples(data);
        setStatus("Siap");
      })
      .catch((e) => {
        failed = true;
        if (loaded) {
          void loaded.dispose();
          loaded = null;
        }
        if (active) {
          setStatus("Gagal dimuat");
          setError(String(e.message || e));
        }
      });
    return () => {
      active = false;
      client.current = null;
      if (loaded) void loaded.dispose();
    };
  }, []);
  const run = async () => {
    if (!client.current) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await client.current.infer(imported || sampleWindow(samples[index])),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Inferensi gagal.");
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    const model = client.current;
    if (!model) return;
    setBusy(true);
    setChecks(null);
    setError("");
    try {
      const results: CheckResult[] = [];
      for (const sample of samples) {
        const window = sampleWindow(sample);
        const features = extractFeatures(model.schema, window);
        const featureError = Math.max(
          ...features.map((v, i) =>
            Math.abs(v - sample.input_features_float32[i]),
          ),
        );
        const output = await model.infer(window);
        const difference = Math.max(
          Math.abs(
            output.probabilityNormal - sample.expected_ml_probabilities.NORMAL,
          ),
          Math.abs(
            output.probabilityLeak - sample.expected_ml_probabilities.LEAK,
          ),
        );
        results.push({
          timestamp: sample.timestamp,
          passed:
            featureError <= 0.0002 &&
            difference <= 0.001 &&
            output.classId === sample.expected_ml_predicted_class,
          difference,
        });
      }
      setChecks(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pemeriksaan gagal.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      className="ml-dialog"
      aria-labelledby="ml-dialog-title"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <header className="ml-dialog-header">
        <div>
          <span className="eyebrow">Pengujian model</span>
          <h2 id="ml-dialog-title">Deteksi kebocoran</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Tutup pengujian model"
          disabled={busy}
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>
      <div className="ml-dialog-body">
        <div className="model-summary">
          <span>
            <i className={status === "Siap" ? "ready-dot" : ""} />
            {status}
          </span>
          <span>Logistic regression</span>
          <span>ONNX / WASM</span>
        </div>
        <p className="ml-explanation">
          Model ini membaca 33 sensor tekanan dan 3 sensor debit. Jaringan 3D
          saat ini belum menyediakan seluruh kanal tersebut. Pengujian di sini
          memakai data BattLeDIM atau data yang Anda unggah, terpisah dari
          simulasi.
        </p>
        <div className="ml-input-heading">
          <h3>Data masukan</h3>
          <span>12 pembacaan / 5 menit</span>
        </div>
        <label className="ml-select-label" htmlFor="ml-sample">
          Sampel BattLeDIM
        </label>
        <select
          id="ml-sample"
          value={imported ? "import" : index}
          onChange={(e) => {
            setIndex(Number(e.target.value));
            setImported(null);
            setResult(null);
            setError("");
          }}
          disabled={busy || !samples.length}
        >
          {imported && <option value="import">{fileName}</option>}
          {samples.map((sample, i) => (
            <option key={sample.timestamp} value={i}>
              {sample.timestamp.replace(" ", " / ")}
            </option>
          ))}
        </select>
        <div className="ml-input-meta">
          <span>Tekanan: m water head</span>
          <span>Debit: m³/jam</span>
          <span>Waktu lokal dataset</span>
        </div>
        <div className="ml-actions">
          <button
            className="primary-button"
            disabled={busy || status !== "Siap"}
            onClick={run}
          >
            {busy ? (
              <Loader2 size={15} className="spinning" />
            ) : (
              <ArrowUpRight size={15} />
            )}
            Jalankan inferensi
          </button>
          <button
            className="outline-button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={14} />
            Unggah JSON
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Unggah data sensor JSON"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setResult(null);
            setError("");
            try {
              if (file.size > 2_000_000)
                throw new Error("Berkas maksimum 2 MB.");
              const window = JSON.parse(await file.text()) as SensorWindow;
              if (!client.current) throw new Error("Model belum siap.");
              extractFeatures(client.current.schema, window);
              setImported(window);
              setFileName(file.name);
            } catch (err) {
              setImported(null);
              setError(
                err instanceof Error ? err.message : "Berkas tidak valid.",
              );
            }
            e.target.value = "";
          }}
        />
        {error && (
          <p className="ml-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <section
            className="inference-result"
            aria-label="Hasil inferensi"
            aria-live="polite"
          >
            <div className="result-title">
              <span>Hasil model</span>
              <strong>
                {result.classId === 1 ? "Kebocoran terdeteksi" : "Normal"}
              </strong>
            </div>
            <dl>
              <div>
                <dt>Probabilitas kebocoran</dt>
                <dd data-testid="probability-leak">
                  {(result.probabilityLeak * 100).toFixed(3)}%
                </dd>
              </div>
              <div>
                <dt>Probabilitas normal</dt>
                <dd>{(result.probabilityNormal * 100).toFixed(3)}%</dd>
              </div>
              <div>
                <dt>Sumber data</dt>
                <dd>{imported ? fileName : "Sampel BattLeDIM"}</dd>
              </div>
              <div>
                <dt>Waktu pembacaan</dt>
                <dd>{result.dataTimestamp}</dd>
              </div>
              <div>
                <dt>Waktu inferensi</dt>
                <dd>{result.durationMs.toFixed(1)} ms</dd>
              </div>
            </dl>
            <p>Hasil ini bukan pembacaan jaringan 3D.</p>
          </section>
        )}
        <section className="ml-validation">
          <div>
            <h3>Periksa hasil ekspor</h3>
            <p>Bandingkan enam sampel dengan hasil Python.</p>
          </div>
          <button
            className="outline-button"
            disabled={busy || status !== "Siap"}
            onClick={verify}
          >
            Uji 6 sampel
          </button>
        </section>
        {checks && (
          <div className="parity-results" data-testid="parity-results">
            <strong>
              {checks.filter((c) => c.passed).length} dari {checks.length}{" "}
              sampel sesuai
            </strong>
            {checks.map((c) => (
              <div key={c.timestamp}>
                <span>{c.timestamp}</span>
                <span>
                  {c.passed ? (
                    <>
                      <Check size={12} />
                      Sesuai
                    </>
                  ) : (
                    "Tidak sesuai"
                  )}
                </span>
                <small>Δ {c.difference.toExponential(2)}</small>
              </div>
            ))}
          </div>
        )}
        <details className="ml-contract">
          <summary>Format data dan batas model</summary>
          <p>
            JSON berisi pressureUnit: &quot;m water head&quot;, flowUnit:
            &quot;m3/h&quot;, dan rows: 12 objek timestamp serta values. Nama 36
            kanal mengikuti feature_schema.json. Tidak ada pembacaan simulasi
            yang digandakan untuk mengisi kanal kosong.
          </p>
          <a href="/ml/feature_schema.json" download>
            Unduh skema sensor
          </a>
          {" / "}
          <a href="/ml/example_sensor_window.json" download>
            Unduh contoh JSON
          </a>
          <p>
            Kelas model: NORMAL dan LEAK. Gangguan sensor, konsumsi, dan pompa
            tidak termasuk kelas model. Evaluasi masih eksploratif; performanya
            belum membuktikan akurasi pada jaringan lain.
          </p>
        </details>
      </div>
    </dialog>
  );
}
