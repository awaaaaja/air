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
                  ? "Tekanan sensor"
                  : tab === "flow"
                    ? "Debit sensor"
                    : "Akumulasi kehilangan"}{" "}
                <b>({unit})</b>
              </span>
              <span>240 pembacaan / waktu (s)</span>
            </div>
            <ResponsiveContainer width="100%" height={125}>
              <AreaChart
                data={history}
                margin={{ top: 10, right: 12, bottom: 0, left: -25 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#44453f"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", (d) => Math.max(10, d)]}
                  tick={{ fill: "#8e9087", fontSize: 10 }}
                  tickFormatter={(v) => Number(v).toFixed(0)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8e9087", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#343530",
                    border: "1px solid #53554b",
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
                  stroke="#d5a66d"
                  strokeWidth={2}
                  fill="#d5a66d"
                  fillOpacity={0.06}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
    </section>
  );
}
