# Warp report — Big Wave electric chucker + drawn solids (2026-09-12)

Base: `94c1ff9` on `feature/pachinko-v1`. Files: `src/core/layouts/big-wave.ts`, `src/render/canvas.ts`, `tests/layouts.test.ts`, `docs/superpowers/screenshots/task14-big-wave.png`, this report. Nothing shared changed (`common.ts`, `board.ts`, `physics.ts` untouched).

## Finding 1 — e-chucker unreachable

### What was tried and why the specified design does not work
The spec (roof split around a ~24 px gap with inward lips, funnel inside, tune the gap to 1–4 %) was built first. Measured with a scratch soak (5000 free balls per strength, `catch` events by catcherId):

| variant | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 |
|---|---|---|---|---|---|
| gap 24 + lips + funnel (spec) | 99 % | 45 % | 26 % | 0 % | 0 % |
| gap 24, no lips | 100 % | 70 % | 63 % | 0 % | 0 % |
| gap 16, no lips | 98 % | 4 % | 28 % | 0 % | 0 % |
| gap 14, 32° rim ramps | 0 % | 100 % | 100 % | 0 % | 0 % |

Root cause: the launch is deterministic to ±2 % jitter, so every ball of a given strength lands on the left roof within ±3 px (0.4 → x≈195, 0.8 → x≈285, impact vy≈−200) and hops right along the roof on the same path. A gap at the ridge is therefore all-or-nothing per strength, and any edge on the far side of the gap (end-point, lip, ramp) turns a low-flying skimmer back into the gap. Width is not a rate knob here. Adding scatter pins above the frame (single rows, staggered double rows, 3-row fields at 40/30 px pitch, board-wide bands, roof-hugging corridor rows, hood/shadow pins over the slot — ~60 variants swept, 2 seeds each) never made all five strengths land in range: a ball that hits no pin or exactly one stays coherent, and a field dense enough to guarantee two hits acts as a wall that reflects the 0.4–0.7 stream down the left side (returns 25–45 %).

Two more defects surfaced along the way and are fixed in the final geometry:
- A ball crossing the catch line at y=372 lands on the frame floor (y=378 → rests at 372.5) in the same step; `resolveSegment` flips vy before `catcherHit` (needs vy>0), so it parks at (325,373) forever. Wave A's rules test only passed because `dropInto` starts 3 px above the line.
- Capsule end-point push-outs are radial, so a 10 px opening between two end-points is not a seal: a ball at mid-height is squeezed sideways through it (parked at (309,373)).

### Final geometry (`warpFrame()` in big-wave.ts, 8 segments mirrored about x=320)
- Roof (178,128)→(313,114) and a 14 px chimney wall (313,114)→(313,100) on each side of a 14 px slot at the ridge. The near wall turns roof skimmers back instead of scooping them; the slot only takes near-vertical arrivals (0–3 %). Shorter walls (10–12 px) let 0.7–1.0 clear the near wall and get scooped by the far one (20–33 %).
- Side warps: the frame wall is open at y 264–284 on both sides (segments (178,128)→(178,264) and (178,284)→(178,378)). They are fed by balls that have come down four pin rows beside the frame — a mixed population — which is what gives a smooth rate across strengths; the top slot alone was 0 % at 0.4–0.7.
- Funnel: shoulder (178,286)→(276,300) (8°), steep piece (276,300)→(312,368) (62°, so the chucker's guard pins at (302,358)/(338,358) stay on its underside by 4.2 px; at ≤55° they poke through and park balls at (296,352)), channel wall (312,368)→(312,378). Mouth window is ±2.5 px so the closed chucker (half-width 6) takes every warp ball.
- Floor (178,378)→(312,378): open under the channel (see the floor defect above). The channel walls seal the dead area under the funnel with real segments, not end-point gaps.
- Widths: win 12 → 8 (floor). tulip-l (8,3) and tulip-r (24,10) unchanged (tulip-r no longer matters, see concerns). e-chucker (14,6) unchanged.

Soak: `maxAge` 6.1–6.9 s at 0.4–0.8 (limit 30), 5000 balls each; no ball ever rests in the frame (the interior has no flat or concave-up surface).

### e-chucker catch rate (5000 free balls, seed 2026)

| strength | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 |
|---|---|---|---|---|---|
| before (94c1ff9) | 0 | 0 | 0 | 0 | 0 |
| after | 1.14 % | 2.44 % | 1.52 % | 2.36 % | 1.86 % |

Second seed (5, 2000 balls): 0.3 2.3 %, 0.4 1.1 %, 0.5 2.8 %, 0.6 1.5 %, 0.7 2.3 %, 0.8 2.2 %, 0.9 4.7 %.

### Test
`tests/layouts.test.ts` — `big-wave: a ball dropped straight into the top warp is caught by the electric chucker`: a `Ball` at (320,100), vx=vy=0, pushed into `Game.balls` (as `dropInto` does), stepped ≤5 s; asserts a `catch` event with `catcherId === 'e-chucker'`. Fails on 94c1ff9 (closed frame), passes now (caught in ~0.6 s).

## Finding 2 — solids drawn
`src/render/canvas.ts`, after the cel and before pins: every solid segment as a 2 px `panelAccent` line at 55 % alpha over a 1 px black line at 45 % offset (+1,+1); solid circles as a 1.5 px `panelAccent` ring at 35 %. Round caps. That covers the Big Wave warp (chimney walls, wall openings, funnel, channel, floor) with no special casing; raijin/hana-fan get their bezel outline and mask/flower ring.

## Balance

`npm run balance` (seed 2026, 10k balls per cell, outside jackpot):

| machine | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 |
|---|---|---|---|---|---|---|---|---|---|
| raijin (unchanged) | 63% | 103% | 77% | **97%** | 63% | 53% | 73% | 71% | 68% |
| big-wave before | 101% | 76% | 63% | **87%** | 39% | 76% | 82% | 72% | 80% |
| big-wave after | 87% | 69% | **86%** | 61% | 66% | 73% | 86% | 87% | 58% |
| hana-fan (unchanged) | 81% | 99% | 85% | 88% | 86% | **89%** | 82% | 96% | 79% |

Guard (seed 5, 2000 balls, max over 0.4–0.8): raijin 0.5 = **90.45 %**, big-wave 0.4 = **90.75 %** (cells 90.8 / 60.0 / 58.3 / 74.8 / 82.5), hana-fan 0.5 = **94.15 %** — all pass. The big-wave guard cell moves by several points with any geometry perturbation (segment order alone moved it 90.2 → 96.5 during tuning); the chosen opening (264–284) was picked from a 24-point sweep for margin, not by accident.

## Commands / output
- `npx tsc --noEmit` — clean.
- `npx vitest run` — 11 files, **97 passed** (96 + 1 new).
- `npm run balance` — table above.
- `npm run e2e` — **11 passed** (27 s).
- Screenshot: throwaway Playwright script, `/?m=big-wave&seed=7` at 1440×900 against the running dev server (5173), mouse held on the board 4 s → `docs/superpowers/screenshots/task14-big-wave.png`. Console errors: none.

## Screenshot
Board at 1440×900 mid-hold (bank 0095, five balls in flight). The gold frame outline is visible but faint over the cel: peaked roof 14 px above the bezel with two short chimney ticks at the ridge, wall lines broken at the side openings just below the LCD, the V funnel and the short channel meeting above the S tulip, floor line under it. No ball inside the frame; balls sit on the pin field left of the frame and near the left tulip, which is where the 0.4–0.8 flow now goes.

## Concerns
1. **Right half of Big Wave is dead at 0.4–0.9.** The 14 px chimney wall turns every roof skimmer back left, so tulip-r/win-r/out-r get ~1 % of balls at those strengths (tulip-r's width has no measurable effect anywhere in 0.2–1.0). 1.0 still lands right of the ridge (58 %) and the right-shoot attacker is hit during jackpots (68 catches over 26 jackpots in a 4000-ball soak at 1.0; 27 over 22 at 0.9). Wave A's concern 5 (left half dead) has flipped sides. Fixing it means a different top design (e.g. no ridge slot at all, side warps only) — the slot is what the reachability test exercises.
2. **Balance shape:** big-wave's guard strength moved from 0.5 (87 %) to 0.4 (91 %), with 0.5–0.6 at ~60 %. The 0.4 cell is dominated by the left channel dumping onto win-l/start; win-l is at the floor (8) and start's width is not a retune knob, so 0.4 could not be pulled lower than ~90 % without geometry changes.
3. **Guard sensitivity:** as noted, ±5 points from segment-order-level perturbations. Any physics change will need a re-sweep of the opening position (`real.ts` approach: vary the wall/shoulder y on the real layout object).
4. e-chucker at 0.8 is 0.7–2.2 % depending on seed — the low end of the target band.
5. Zero-payout free balls still open/close the e-chucker tulip and queue reaches (unchanged behaviour from wave A); at ~2 % that is ~1 reach per 50 attract-mode balls.
