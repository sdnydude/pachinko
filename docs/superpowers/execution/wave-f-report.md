# Wave F report — sound-cap priority lane, tulip coverage guard, test hygiene, hana fan tulip-1

Branch `feature/pachinko-v1`, from `40b8da8`. Files touched: `src/audio/synth.ts`, `src/core/sim.ts`, `src/core/layouts/hana-fan.ts`, `tests/effects.test.ts`, `tests/soak.test.ts`.

## F1 — Audio priority lane

`Synth.allow(priority = false)`: the sliding window is unchanged (stamps < 1000 ms old); a non-priority request is refused when the window already holds `MAX_PER_SECOND` (12) stamps, a priority request is always admitted and still stamped. Priority callers: jackpot loop ticks, tension ticks (`startTicks`), reel-stop tick, and the arps for `reachStart`, `jackpotOpen`, `attackerCatch`, `jackpotClose` (`arp()` gained a `priority` parameter). Non-priority: pin, windmill, tulip clack, plain `catch` chime. Denied clicks are not stamped, so the click cap is exactly 12 admitted per rolling second regardless of the flood; the total exceeds 12 only when musical events alone do.

Loop-tick survival, 30 s at 60 fps with the app's event order (scratch `starve.ts` → `starve2.ts`, same window model as `Synth.allow`):

| machine @ strength | loop cadence | ticks played before | after | click requests / admitted (after) |
|---|---|---|---|---|
| raijin @0.5 / 0.8 | 500 ms | 60/60 (100 %) | 60/60 | 1240 / 290, 1221 / 289 |
| big-wave @0.5 / 0.8 | 429 ms | 25/70 (36 %), 20/70 (29 %) | 70/70, 70/70 | 983 / 267, 939 / 276 |
| hana-fan @0.5 / 0.8 | 375 ms | 22/80 (28 %) both | 80/80, 80/80 | 1270 / 273, 1239 / 273 |

Tests (`tests/effects.test.ts` › Synth cap, 5 tests):
- `schedules at most 12 beeps per second across 50 catch chimes` — kept (catch chime is non-priority): 12 oscillators.
- `50 pin clicks in one second play exactly 12` — (a).
- `jackpot loop plays every tick for 2 s while clicks keep the window full` — (b): 50 catches drain the window, `jackpotOpen` plays its 4-note arp + the t=0 tick (12 → 17), then 10 pin requests every 250 ms for 2 s; oscillators created inside each timer advance are the loop's: 5 for ticks at 0/500/1000/1500/2000 ms, `loop.i` = 5, and the 80 click requests admit ≤ 24 (12/s).
- `a 4-note arp plays all four notes against a full window` — (c): raijin `close` (4 notes) after 50 catches: 12 → 16; a following pin is still refused.
- `disconnects oscillator and gain when a note ends` — unchanged.

The old E2 test `jackpot loop keeps its beat while the cap denies ticks` is replaced by (b); the denied-tick branch it exercised no longer exists (ticks are priority; `allow` refuses them only when muted / no context — `loop.i` still advances unconditionally).

## F2 — Big Wave right-tulip regression guard

`runSoak` (`src/core/sim.ts`) now returns `catches: Record<string, number>` (count of `catch` events per catcher id; attacker catches excluded). New `describe('coverage')` in `tests/soak.test.ts`: big-wave @0.9, seeds 5 and 2026, 2000 balls each; mean share of fired balls for `tulip-l` and `tulip-r` must each be ≥ 0.4 %. Measured: tulip-l 4.20 %, tulip-r 0.83 % (seed 5: 86/14, seed 2026: 82/19). Adds one test (~1.1 s). `tests/soak.test.ts` alone: 19 tests, **32.6 s** (baseline 18 tests, 31.7 s).

## F3 — Test hygiene

`Synth cap` has `afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); })`; the inline cleanup calls are gone from every test body (`synth.dispose()` stays inline — it only matters when the test reached it). `afterEach` imported from vitest.

## F4 — Hana Fan tulip-1 width (shipped)

tulip-1 open 6 → **8**; compensated with tulip-3 open 10 → 8 and win halfWidth 9 → 8 (both at their floors). Sweep, mean of seeds 5/2026, 2000 balls per cell (scratch `hana2.ts` on `harness2.ts`):

| variant | best (0.4–0.8) | ceiling | guard |
|---|---|---|---|
| shipped before (6/10/10/12, win 9) | 90.6 @0.5 | 90.6 | PASS (4.1 / 2.9) |
| t1=8 | 93.5 @0.4 | 93.5 | PASS, 0.0 margin |
| t1=10 | 95.0 @0.4 | 95.0 | FAIL |
| t1=8 t2=8 | 93.5 @0.4 | 93.5 | PASS, 0.0 margin |
| t1=8 t4=10 | 93.5 @0.4 | 93.5 | PASS, 0.0 margin |
| t1=8 t3=8 | 93.4 @0.4 | 93.4 | PASS, 0.1 margin |
| t1=8 win 8 | 91.3 @0.4 (95.0/87.6) | 91.3 | PASS (2.2 / 4.8) |
| t1=8 win 8 t4=10 | 91.3 @0.4 | 91.3 | PASS (2.2 / 4.8) |
| t1=8 t3=8 t4=10, win 9 | 93.4 @0.4 | 93.4 | PASS, 0.1 margin |
| t1=8 splitter (150,95) | 93.5 @0.4 | 134.9 | FAIL (ceiling) |
| t1=8 splitter (160,95) | 93.5 @0.4 | 93.5 | PASS, 0.0 margin |
| **t1=8 t3=8 win 8 (shipped)** | **90.5 @0.4** (93.3/87.8) | 90.5 | **PASS (3.0 / 4.0)** |

Why the 0.4 cell moves: the 0.4 stream lands in tulip-1 (9.4 % of balls at 0.4, vs 3.0 % at 0.5), so tulip-1's open width is nearly a direct dial on that cell; the win pockets and tulip-3 take the compensation.

New guard row (mean, seed 5 / seed 2026): 0.2=76.8 (79.3/74.3) 0.3=65.9 (65.0/66.8) **0.4=90.5** (93.3/87.8) 0.5=89.3 (89.3/89.5) 0.6=84.2 (85.6/82.8) 0.7=86.1 (86.7/85.6) 0.8=81.1 (77.0/85.2) 0.9=88.6 (88.9/88.3) 1.0=80.8 (75.3/86.3). Every strength ≤ 100 %.

Third-seed check (seed 9, not in the guard): 0.4 = 100.2 (was 98.9 at base — wave D already flagged hana-fan 0.4 on seed 9 as over the band), 0.5 = 89.5 (was 94.0). ~10 min spent.

## Verify

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 13 files, **123 passed** (baseline 120; +2 synth, +1 coverage). Duration 33.3 s. `tests/soak.test.ts` alone: 19 passed, 32.6 s.
- `npm run e2e` — **12 passed** (28.5 s).

## Concerns

1. hana-fan 0.4 on seed 9 is 100.2 % (base 98.9 %) — the seed-9 over-band at 0.4 predates F4 and is not guarded; F4 nudges it by 1.3 points. If a third seed is ever added to the guard, hana-fan's 0.4 cell is the one to retune (tulip-1 open width is the direct dial).
2. Priority arps still stamp every note, so a jackpot (opening arp + loop at 160 bpm on hana-fan ≈ 2.7 stamps/s) leaves ~9 click slots per second during the loop; with several attacker catches per second the clicks can go near-silent under a jackpot. That is the intended direction (music over clicks) but is a change in feel from before.
