"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useSimulation } from "@/stores/simulation-store";
import { Activity, Clock3, ChevronDown, ChevronUp } from "lucide-react";
export default function Monitoring() {
  const history = useSimulation((s) => s.history),
    events = useSimulation((s) => s.events);
  const [tab, setTab] = useState<"pressure" | "flow" | "loss" | "events">(
      "pressure",
    ),
    [open, setOpen] = useState(true);
  const options = [
    ["pressure", "Tekanan"],
    ["flow", "Debit"],
    ["loss", "Kehilangan air"],
    ["events", "Riwayat Kejadian"],
  ] as const;
  const unit = tab === "pressure" ? "bar" : tab === "flow" ? "L/min" : "L";
  return (
    <section className="monitoring">
      <div className="monitoring-tabs">
        <Activity size={14} />
        {options.map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => {
              setTab(key);
              setOpen(true);
            }}
          >
            {label}
          </button>
        ))}
        <button
          className="collapse"
          aria-label={open ? "Tutup monitoring" : "Buka monitoring"}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>
      {open &&
        (tab === "events" ? (
          <div className="events" aria-live="polite">
            {[...events].reverse().map((e, i) => (
              <div key={`${e.id}-${i}`}>
                <Clock3 size={12} />
                <time>{e.time.toFixed(1)}s</time>
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="chart">
            <div className="chart-caption">
              <span>
                {tab === "pressure"
                  ? "Tekanan observasi"
                  : tab === "flow"
                    ? "Debit observasi"
                    : "Akumulasi kehilangan"}{" "}
                <b>({unit})</b>
              </span>
              <span>Jendela 240 sampel · waktu simulasi (s)</span>
            </div>
            <ResponsiveContainer width="100%" height={125}>
              <AreaChart
                data={history}
                margin={{ top: 10, right: 12, bottom: 0, left: -25 }}
              >
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#233749"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", (d) => Math.max(10, d)]}
                  tick={{ fill: "#6d8597", fontSize: 10 }}
                  tickFormatter={(v) => Number(v).toFixed(0)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6d8597", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#112338",
                    border: "1px solid #233a50",
                    fontSize: 11,
                  }}
                  labelFormatter={(v) => `${Number(v).toFixed(1)} s`}
                  formatter={(v) => [
                    `${Number(v).toFixed(2)} ${unit}`,
                    "Pembacaan",
                  ]}
                />
                <Area
                  isAnimationActive={false}
                  dataKey={tab}
                  type="monotone"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
    </section>
  );
}
