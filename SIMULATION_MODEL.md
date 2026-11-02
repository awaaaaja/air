# Simplified hydraulic model

This is an educational quasi-steady resistance network, not validated hydraulic engineering or an EPANET replacement. No random numbers are used.

Pressure is in bar, flow in L/min, loss in L, simulation time in s. Source head:

`H = 0.55 × tank/100 + 3.2 × (pump/100)² × efficiency`

Efficiency is 1 normally, 0.45 in pump malfunction. A stopped pump still permits gravity flow from the reservoir. There is no check valve or finite tank depletion.

The selected leaking pipe defines a junction. For pipe index i=1..3:

- Upstream quadratic resistance `Ru = 0.000035 × i` bar/(L/min)².
- Downstream resistance `Rd = 0.000035 × (4-i) + 0.000025 × (100/valve)² + 2.4/demand²`.
- Delivered flow `Qd = sqrt(P / Rd)`.
- Leak flow `Ql = C sqrt(P)`, with `C = 0.6 × severity` when leak enabled, otherwise zero.
- Continuity `Qup = Qd + Ql`.
- Energy relation `P + Ru × Qup² = H`.

Solve the monotonic pressure equation by 64 bisection iterations in [0,H]. A closed valve or zero demand imposes a limiting resistance of 1e12 and explicit zero delivery. All leaks are upstream of the terminal control valve; changing the leak location changes upstream resistance. Demand is a reference load at 2.4 bar, not a guaranteed volumetric withdrawal. Increased pump output raises available pressure; higher demand raises delivery and reduces junction pressure; leakage increases total upstream flow and reduces delivery and pressure. At closed valve a leak can still consume flow upstream.

Simulation advances fixed 0.25 s steps, optionally accelerated 2×/4×. Rendering does not advance physics. On throttled browser tabs, simulation time slows rather than inventing catch-up samples. The state is quasi-steady after a control change; there are no transients. Integrated loss: `loss += Ql × dt / 60`. Pausing freezes time, loss, history and visual animation. Editing a paused control recomputes the current steady reading without adding history. Reset restores the active scenario, clears loss/time/history and pauses.

## Scenarios

Baseline: pump 80%, valve 100%, demand 90 L/min reference, tank 75%, no leak, PIPE-02 selected as leak location. Small/major leak enable 25%/85% severity. Demand spike sets demand to 160. Pump malfunction applies 0.45 efficiency. Sensor fault leaves hydraulic state intact and adds +0.8 bar to observed pressure and multiplies observed upstream flow by 0.65. Charts show observations; inspector also shows true pressure and delivered flow. All parameters remain editable.

Only one pressure junction and one upstream flow observation are modeled; choosing another sensor does not create fictitious spatial readings. Reservoir is a static source setting. No elevations, cavitation, pump curve flow dependence, storage transients, water hammer, pipe diameters/material calibration or sensor noise are included. Pipe health indicators represent the known configured leak, never AI diagnosis.
