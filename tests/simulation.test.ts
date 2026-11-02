import { describe, it, expect } from "vitest";
import {
  baseline,
  solve,
  initial,
  advance,
  parametersFor,
} from "../src/lib/simulation/engine";
import { useSimulation } from "../src/stores/simulation-store";
describe("hydraulic model", () => {
  it("is deterministic and conserves mass", () => {
    const a = solve(baseline);
    expect(a).toEqual(solve(baseline));
    expect(a.trueFlow).toBeCloseTo(a.delivered + a.leakage, 10);
  });
  it("pump output changes pressure and delivery", () => {
    const low = solve({ ...baseline, pump: 20 }),
      high = solve({ ...baseline, pump: 100 });
    expect(high.truePressure).toBeGreaterThan(low.truePressure);
    expect(high.delivered).toBeGreaterThan(low.delivered);
  });
  it("closed valve stops delivered flow", () => {
    expect(solve({ ...baseline, valve: 0 }).delivered).toBe(0);
    expect(solve({ ...baseline, valve: 20 }).delivered).toBeLessThan(
      solve(baseline).delivered,
    );
  });
  it("severity increases leakage and reduces pressure", () => {
    const a = solve({ ...baseline, leak: true, severity: 20 }),
      b = solve({ ...baseline, leak: true, severity: 90 });
    expect(b.leakage).toBeGreaterThan(a.leakage);
    expect(b.truePressure).toBeLessThan(a.truePressure);
    expect(b.trueFlow).toBeCloseTo(b.delivered + b.leakage, 10);
  });
  it("demand increases delivery and decreases pressure", () => {
    const a = solve(baseline),
      b = solve({ ...baseline, demand: 160 });
    expect(b.delivered).toBeGreaterThan(a.delivered);
    expect(b.truePressure).toBeLessThan(a.truePressure);
  });
  it("sensor fault does not affect hydraulics", () => {
    const a = solve(baseline),
      b = solve({ ...baseline, sensorFault: true });
    expect(b.truePressure).toBe(a.truePressure);
    expect(b.trueFlow).toBe(a.trueFlow);
    expect(b.pressure).toBeCloseTo(a.pressure + 0.8);
    expect(b.flow).toBeCloseTo(a.flow * 0.65);
  });
  it("is finite and nonnegative at boundaries", () => {
    for (const pump of [0, 100])
      for (const valve of [0, 100])
        for (const demand of [0, 180])
          for (const severity of [0, 100]) {
            for (const value of Object.values(
              solve({ ...baseline, pump, valve, demand, severity, leak: true }),
            )) {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(Number.isFinite(value)).toBe(true);
            }
          }
  });
  it("advances fixed time and integrated loss; pauses exactly", () => {
    const p = { ...baseline, leak: true };
    const a = initial(p),
      b = advance(a, p, 0.25, true, 2);
    expect(b.time).toBe(0.5);
    expect(b.loss).toBeCloseTo((b.leakage * 0.5) / 60);
    expect(advance(b, p, 0.25, false)).toBe(b);
  });
  it("reset restores scenario parameters and bounded history", () => {
    const store = useSimulation;
    store.getState().choose("major");
    store.getState().set({ pump: 1 }, "change");
    store.getState().toggle();
    for (let i = 0; i < 300; i++) store.getState().tick();
    expect(store.getState().history).toHaveLength(240);
    store.getState().reset();
    expect(store.getState().parameters).toEqual(parametersFor("major"));
    expect(store.getState().sample.time).toBe(0);
    expect(store.getState().sample.loss).toBe(0);
    expect(store.getState().running).toBe(false);
    expect(store.getState().history).toHaveLength(1);
  });
});
