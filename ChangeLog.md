# ChangeLog

## 2026-10-18 — Vertical 2: Coastal Sprint time trial

- Added a 4 km time trial with ready screen, three-second countdown, five ordered gates, timer, medals, results and instant retry; retained full exploration mode.
- Added limited boost with recharge/release behavior, +2s impact penalties and +5s recovery penalties. Recovery returns behind a missed gate.
- Added local personal bests with blocked/corrupt-storage fallback. Trials lock swell to the standard setting for comparable times.
- Added tests for countdown, gate ordering/misses, penalties, boost and persistent bests. Medal thresholds are provisional pending player testing.

## 2026-10-18 — Vertical 1: handling and recovery

- Spawn heading follows the river, braking stops without unintended reverse thrust, and low-speed/air steering remains responsive.
- Added H/button recovery to a clear part of the current channel and smoothed camera aim.
- Added opt-in synthesized engine sound, impact/splash audio and impact feedback; no external sound assets.
- Added regression coverage for braking and safe recovery across every sector.
- Player enjoyment remains an external playtest gate; technical checks do not establish that gate.

## 2026-10-18 — 2.0 foundation

- Expanded the procedural river to 18.78 km with approximately 100× the supplied prototype's corridor area.
- Added streamed coastlines, islands, rocks, sandbanks, navigation scanner and two camera modes.
- Moved analytical wave displacement to the GPU using shared CPU/GPU coefficients; added tessellation controls.
- Tuned hull buoyancy, planing, steering, jumps and landings; added touch controls and pause handling.
- Validation: five simulation tests pass; production build passes. Browser checks cover throttle, cameras, pause and high-detail water without reported shader errors.
- Known limits: finite world, approximate colliders and hydrodynamics, no external player testing yet; production bundle exceeds Vite's 500 kB advisory threshold.
