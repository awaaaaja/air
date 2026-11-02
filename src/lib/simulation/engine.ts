export type PipeId = "PIPE-01" | "PIPE-02" | "PIPE-03";
export type ComponentId =
  | PipeId
  | "TANK-01"
  | "PUMP-01"
  | "VALVE-01"
  | "PRESSURE-01"
  | "FLOW-01"
  | "NODE-01";
export type Scenario =
  "normal" | "small" | "major" | "demand" | "pump" | "sensor";
export interface Parameters {
  pump: number;
  valve: number;
  demand: number;
  tank: number;
  leak: boolean;
  severity: number;
  pipe: PipeId;
  sensorFault: boolean;
  pumpFault: boolean;
}
export interface Reading {
  pressure: number;
  flow: number;
  delivered: number;
  leakage: number;
  head: number;
  truePressure: number;
  trueFlow: number;
}
export interface Sample extends Reading {
  time: number;
  loss: number;
}
export const baseline: Parameters = {
  pump: 80,
  valve: 100,
  demand: 90,
  tank: 75,
  leak: false,
  severity: 25,
  pipe: "PIPE-02",
  sensorFault: false,
  pumpFault: false,
};
export const scenarios: Record<
  Scenario,
  { label: string; description: string; parameters: Partial<Parameters> }
> = {
  normal: {
    label: "Operasi Normal",
    description: "Distribusi stabil tanpa kebocoran",
    parameters: {},
  },
  small: {
    label: "Kebocoran Kecil",
    description: "Kebocoran 25% pada pipa utama",
    parameters: { leak: true, severity: 25 },
  },
  major: {
    label: "Kebocoran Besar",
    description: "Kebocoran 85% pada pipa utama",
    parameters: { leak: true, severity: 85 },
  },
  demand: {
    label: "Lonjakan Konsumsi",
    description: "Beban konsumsi meningkat menjadi 160 L/min",
    parameters: { demand: 160 },
  },
  pump: {
    label: "Gangguan Pompa",
    description: "Dorongan pompa berkurang menjadi 45% dari kondisi normal",
    parameters: { pumpFault: true },
  },
  sensor: {
    label: "Gangguan Sensor",
    description:
      "Sensor membaca tekanan 0,8 bar lebih tinggi dan debit 35% lebih rendah",
    parameters: { sensorFault: true },
  },
};
export function parametersFor(s: Scenario): Parameters {
  return { ...baseline, ...scenarios[s].parameters };
}
export function solve(p: Parameters): Reading {
  const head =
    (p.tank / 100) * 0.55 +
    3.2 * (p.pump / 100) ** 2 * (p.pumpFault ? 0.45 : 1);
  const index = Number(p.pipe.slice(-1));
  const upstream = 0.000035 * index;
  const downstream =
    0.000035 * (4 - index) +
    (p.valve === 0 ? 1e12 : 0.000025 * (100 / Math.max(1, p.valve)) ** 2) +
    (p.demand === 0 ? 1e12 : 2.4 / p.demand ** 2);
  const c = p.leak ? p.severity * 0.6 : 0;
  let lo = 0,
    hi = head;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    const q = Math.sqrt(mid / downstream) + c * Math.sqrt(mid);
    if (mid + upstream * q * q > head) hi = mid;
    else lo = mid;
  }
  const pressure = (lo + hi) / 2;
  const delivered =
    p.valve === 0 || p.demand === 0 ? 0 : Math.sqrt(pressure / downstream);
  const leakage = c * Math.sqrt(pressure);
  const flow = delivered + leakage;
  return {
    pressure: pressure + (p.sensorFault ? 0.8 : 0),
    flow: flow * (p.sensorFault ? 0.65 : 1),
    delivered,
    leakage,
    head,
    truePressure: pressure,
    trueFlow: flow,
  };
}
export function advance(
  previous: Sample,
  p: Parameters,
  dt: number,
  running: boolean,
  speed = 1,
): Sample {
  if (!running) return previous;
  const reading = solve(p);
  const seconds = dt * speed;
  return {
    ...reading,
    time: previous.time + seconds,
    loss: previous.loss + (reading.leakage * seconds) / 60,
  };
}
export function initial(p: Parameters = baseline): Sample {
  return { ...solve(p), time: 0, loss: 0 };
}
