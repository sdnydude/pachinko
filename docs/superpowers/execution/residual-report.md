# Residual report — re-review fixes R1–R6 (2026-09-12)

Base: `d0c6d5d` on `feature/pachinko-v1`. Baseline before this work: tsc clean, vitest 97/97, e2e 11/11, web build green.

## R1 — same-machine switch guard
`src/app.ts` `requestSwitch`: returns early when `id === this.machineId` (in addition to the jackpot lock). Reset still calls `switchMachine(this.machineId, { reset: true })` directly and re-creates the game. Doc comment updated.

Test: `e2e/smoke.spec.ts` — "re-selecting the current tab (click, then Space on it) does not re-create the game". Toggles the debug overlay (backtick), fires one ball (bank 0099, `balls 1`), clicks the already-selected tab, presses Space with focus still on it, and asserts `balls 1` is still in flight, bank still 0099 (Space on the focused button did not reach the dial) and `data-machine` unchanged. Verified it fails on the un-guarded code (`balls 0` after the click re-created the Game) and passes with the guard.

## R2 — silent free-ball catches
`src/core/game.ts`: `catch` and `attackerCatch` events carry `free: boolean` (from `b.free`); `payout` stays nominal (the soak sums it). `src/render/effects.ts`: the `+N` float is skipped when `e.free`, the spark is kept; new `floatCount` getter. `src/audio/synth.ts`: catch and attackerCatch chimes skipped when `e.free`.

Test: `tests/effects.test.ts` — "a free-ball catch sparks but adds no payout float": free catch + free attackerCatch → `floatCount` 0, `particleCount` 20 (8 + 12 sparks); a paid catch → `floatCount` 1.

## R3 — Next.js screenshot re-captured
`npm run dev -w web` in the background; Next reported "Port 3000 is in use … using available port 3002". `.superpowers/sdd/2026-09-11-pachinko/shot-residual.mjs` (throwaway, must live inside the repo so `@playwright/test` resolves): 1440×900, `/play?m=big-wave`, mouse held on the board 1.5 s, released, 300 ms, screenshot → `docs/superpowers/screenshots/task16-nextjs.png`. Output: `machine: big-wave bank: 0099`, no console errors. Server stopped afterwards (`pkill -f "next dev"`).

Screenshot: Big Wave board centred with striped parlor-wall gutters on both sides; right panel shows the three machine tabs each with a cabinet silhouette (BIG WAVE highlighted), the 7 7 7 reels, BANK 0099 / BEST 0000 / Ready, the dial with its HOLD TO SHOOT caption sitting clear above the Sound / Reset buttons. One ball in flight top-right of the gold frame (a 1.5 s hold auto-fires once at strength 1.0, which lands right of the ridge). The frame outline shows the single left chimney tick at the ridge (R6).

## R4 — lean server import
`package.json` exports gains `"./core": "./src/core/machine.ts"`; `apps/web/app/play/page.tsx` imports `MACHINE_ORDER` / `MachineId` from `'pachinko/core'`. `npm run build -w web` green (`/play` dynamic, `/` and `/_not-found` static); no server chunk under `.next/server` contains the DOM app (`pk-shell`).

## R5 — README
Keyboard table: Up / Down "Trim strength (any time; the value resets at the next hold)". Next.js section: one sentence that a custom `storage` adapter passed to `PachinkoClient` from a client component should be memoized, since a new instance per render re-creates the `App`.

## R6 — Big Wave right-side traffic (succeeded, ~20 min)
Harness: scratch script rebuilding the big-wave layout with modified chimney walls / pins / windmills (no source edits per variant), 2000 free balls per strength on seed 2026 for the per-catcher split, plus the guard cell (seed 5, 2000 balls, max return over 0.4–0.8). The base variant reproduced the warp-report numbers exactly.

Lever: the 14 px chimney wall on both sides of the ridge slot turned every roof skimmer below 1.0 back to the left. Variants swept (lw = left wall px, rw = right wall px):

| variant | tulip-r % at 0.5 / 0.6 / 0.7 / 0.8 / 0.9 / 1.0 | e-chucker range | guard |
|---|---|---|---|
| base (14/14) | 0 / 0 / 0 / 0 / 0 / 1.0 | 1.1–4.7 % | 90.75 PASS |
| 10/0 | 0 / 0 / 9.0 / 8.0 / 0 / 4.0 | 1.1–5.9 % | 90.75 PASS |
| 12/0 | 0 / 0 / 8.3 / 0.9 / 0 / 3.1 | 1.1–14.1 % | 100.3 FAIL |
| 10/6 | 0 / 0 / 9.0 / 7.4 / 0 / 7.0 | 1.1–6.2 % | 90.75 PASS |
| 10/0 + 2 deflector pins (345,100) (365,92) | 0 / 0 / 5.6 / 7.0 / 0 / 5.1 | up to 28.6 % | 127.6 FAIL |
| 9/0 | 0 / 0 / 9.3 / 10.7 / 0 / 4.5 | 1.1–5.3 % | 90.75 PASS |
| 6/0 | 0 / 4.6 / 8.3 / 13.5 / 4.3 / 7.0 | 1.1–9.5 % | 94.2 PASS (too close to the 95 ceiling given ±5 pt sensitivity) |
| **8/0 (chosen)** | 0 / 0 / 8.3 / 10.0 / 1.1 / 6.6 | 1.6–6.0 % | 90.75 PASS |
| 8/4 | 0 / 0 / 8.3 / 10.0 / 0.8 / 8.3 | 1.7–5.2 % | 90.75 PASS (no gain over 8/0) |

Chosen: `warpFrame()` keeps an 8 px chimney wall on the left of the slot only; the right wall is removed. Strengths 0.2–0.6 are unchanged (their skimmers still turn back); 0.7–0.8 hop the wall and the slot and run down the right roof; 0.9 is a mix (12 % right); 1.0 is mostly right. Right windmills and the side openings were not touched.

Per-catcher split after (3000 free balls, seed 2026; guard column = seed 5):

| s | e-chucker | tulip-l | tulip-r | out-l | win-l | start | win-r | out-r | return (seed 5) |
|---|---|---|---|---|---|---|---|---|---|
| 0.5 | 2.43 | 3.70 | 0.00 | 47.7 | 2.00 | 7.50 | 0.27 | 0.33 | 60.0 |
| 0.6 | 1.87 | 4.17 | 0.00 | 41.5 | 5.00 | 7.27 | 0.30 | 0.40 | 76.3 |
| 0.7 | 1.87 | 0.00 | **9.07** | 0.1 | 0.10 | 3.83 | 1.07 | 7.73 | 67.1 |
| 0.8 | 1.87 | 0.00 | **10.10** | 0.1 | 0.07 | 4.70 | 1.40 | 7.10 | 77.7 |
| 0.9 | 5.40 | 4.53 | **0.87** | 30.6 | 4.13 | 8.20 | 0.93 | 1.00 | 86.4 |
| 1.0 | 5.93 | 0.07 | 6.23 | 1.3 | 0.30 | 4.27 | 0.97 | 7.50 | 74.1 |

Before: tulip-r 0.00 % at every strength 0.2–0.9, 0.97 % at 1.0. Guard cell unchanged at 90.75 % (0.4 still sets the max; 0.6 moved 58.3 → 76.3, 0.7 74.8 → 67.1, 0.8 82.5 → 77.7). maxAge ≤ 7.7 s.

`npm run balance` (seed 2026, 10k): big-wave 87 / 69 / 86 / 61 / 76 / 69 / 81 / 89 / 70 % at 0.2…1.0 (was 87 / 69 / 86 / 61 / 66 / 73 / 86 / 87 / 58). raijin and hana-fan unchanged.

Trade-off to note: per-strength traffic is still coherent (launch jitter ±2 %), so at 0.7–0.8 the left half is now the quiet side (tulip-l 0 %). Across the strength range both halves now get play; a mixed population at a single strength would need scatter geometry the warp report already ruled out. e-chucker at 0.9–1.0 rose to 5.4–5.9 %.

## Commands / output
- `npx tsc --noEmit` — clean.
- `npx vitest run` — 11 files, **98 passed** (97 + 1 new effects test).
- `npm run e2e` — **12 passed** (11 + 1 new same-machine test); the new test fails without the R1 guard.
- `npm run build -w web` — green.
- `npm run build:standalone` — `dist/pachinko.html` 73.8 kB.
- `npm run balance` — table above.
