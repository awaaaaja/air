import { create } from "zustand";
import {
  advance,
  initial,
  parametersFor,
  solve,
  scenarios,
  type Parameters,
  type ComponentId,
  type Scenario,
  type Sample,
} from "@/lib/simulation/engine";
interface Event {
  id: number;
  time: number;
  text: string;
}
interface State {
  parameters: Parameters;
  sample: Sample;
  history: Sample[];
  events: Event[];
  running: boolean;
  speed: number;
  scenario: Scenario;
  selected: ComponentId;
  camera: number;
  focus: number;
  set: (p: Partial<Parameters>, label: string) => void;
  select: (id: ComponentId) => void;
  toggle: () => void;
  tick: () => void;
  reset: () => void;
  choose: (s: Scenario) => void;
  setSpeed: (n: number) => void;
  resetCamera: () => void;
  focusCamera: () => void;
}
export const useSimulation = create<State>((set, get) => ({
  parameters: parametersFor("normal"),
  sample: initial(),
  history: [initial()],
  events: [{ id: 0, time: 0, text: "Jaringan siap · operasi normal" }],
  running: false,
  speed: 1,
  scenario: "normal",
  selected: "PIPE-02",
  camera: 0,
  focus: 0,
  set: (patch, label) =>
    set((s) => {
      const parameters = { ...s.parameters, ...patch };
      return {
        parameters,
        sample: { ...s.sample, ...solve(parameters) },
        events: [
          ...s.events,
          { id: Date.now(), time: s.sample.time, text: label },
        ].slice(-60),
      };
    }),
  select: (selected) => set({ selected }),
  toggle: () =>
    set((s) => ({
      running: !s.running,
      events: [
        ...s.events,
        {
          id: Date.now(),
          time: s.sample.time,
          text: s.running ? "Simulasi dijeda" : "Simulasi dimulai",
        },
      ].slice(-60),
    })),
  tick: () => {
    const s = get();
    if (!s.running) return;
    const sample = advance(s.sample, s.parameters, 0.25, true, s.speed);
    set({ sample, history: [...s.history, sample].slice(-240) });
  },
  reset: () => {
    const parameters = parametersFor(get().scenario);
    const sample = initial(parameters);
    set({
      parameters,
      sample,
      history: [sample],
      running: false,
      events: [{ id: Date.now(), time: 0, text: "Skenario direset" }],
    });
  },
  choose: (scenario) => {
    const parameters = parametersFor(scenario);
    const sample = initial(parameters);
    set({
      scenario,
      parameters,
      sample,
      history: [sample],
      events: [
        {
          id: Date.now(),
          time: 0,
          text: `Skenario: ${scenarios[scenario].label}`,
        },
      ],
    });
  },
  setSpeed: (speed) => set({ speed }),
  resetCamera: () => set((s) => ({ camera: s.camera + 1 })),
  focusCamera: () => set((s) => ({ focus: s.focus + 1 })),
}));
