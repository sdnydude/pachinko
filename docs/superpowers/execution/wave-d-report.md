# Wave D (core) report — 2026-09-12

Worktree: `/Users/swebber64/dhg/pachinko/.claude/worktrees/agent-a9f3f099cb023957b`
Branch: `worktree-agent-a9f3f099cb023957b` (from a4adf14 on feature/pachinko-v1)
Commit: `2c748fa` — fix(core): snapshot copies, windmill direction, balance margins and low-strength ceiling, big wave tuning
Files touched: src/core/{board,game,physics}.ts, src/core/layouts/{common,raijin,big-wave,hana-fan}.ts, tests/{game-rules,physics,soak}.test.ts, docs/superpowers/specs/2026-09-11-pachinko-design.md (one sentence). Nothing in E's files.
This report lives in the worktree (`.superpowers/` is gitignored; the sandbox refused the main-checkout path).

Measurement harness (session scratchpad, not committed): rebuilds a layout through `buildLayout` with knob overrides, runs the guard soak (2000 free balls per cell) per strength × seed, and prints per-catcher splits. All numbers below are from it or from `npx vitest run` / `npm run balance`.

## Per item

**D1 Snapshot copies.** `Game.snapshot()` now returns `balls: this.balls.map(b => ({ ...b }))`, `tulipOpen: { ...this.tulipOpen }`, `windmillSpin: [...this.windmillSpin]`, `reach` with `digits`/`stopAt`/`stopped` copied, `jackpot` spread. Doc comment updated ("copies, one level deep, arrays included; a held snapshot is unaffected by later steps").
Test (game-rules `snapshot > does not alias live state`): two balls in flight, a reach running and tulip-l open; snapshot, deep-copy it, step 10×, `expect(s).toEqual(copy)`; the live game has moved on (ball y, reach.t); mutating the snapshot's ball/windmillSpin/tulipOpen does not reach the game.
Timing (`runSoak`, 3 machines × 2000 balls @0.6, snapshot taken every step as the soak does):
- before (a4adf14, aliasing): 739 / 765 / 741 ms; after D1+D2: 764 / 811 / 779 ms (≈ +5 %, but D2 also changed ball paths).
- clean measurement on the final code (same layouts/seeds, `snapbench.ts`): copying 777 ms vs copying-called-twice 868–889 ms → per-step copy cost ≈ 91 ms, aliasing baseline ≈ 687 ms, **copy overhead ≈ 13 %**. Under the 25 % threshold, so per-call allocation stays (no double buffer).

**D2 Windmill direction.** `Windmill.dir: 1 | -1` (board.ts; 1 = clockwise on screen — a ball landing on top is kicked to +x, matching the renderer's `ctx.rotate(+angle)`). physics.ts: kick is `w.dir * tangent * WINDMILL_KICK`, no longer the ball's side. game.ts: `windmillSpin[i] = 12 * dir`. Layouts: left windmills `1`, right `-1` (hana-fan's centre one `1`). Physics test rewritten: for `dir` in {1, −1} a ball falling onto the top of the windmill gets `Math.sign(vx) === dir`. Balance re-checked after (all D6 tables are post-D2).

**D3 Hana Fan widths.** win 11 → 9, all four tulips closed 3 → 4 (one step off the 8/3 floors). With only that, the guard was 95.3 @0.4 and 0.3 = 107 %. Retuned: tulip-1 (10,4) → (6,4), tulip-2 (14,4) → (10,4), tulip-3 (12,4) → (10,4), tulip-4 (14,4) → (12,4); splitter pin (155,95) for the 0.3 stream; right windmill (520,240) → (495,245) (it now sits in the 0.9 stream's descent — the 0.9 cell was 100–103 % otherwise). Final best 0.5 = **90.6 %** (92.9/88.3), 0.4 = 87.7, 0.9 = 89.7; ceiling 90.6 → inside 88–92 with 2.9 points to the 93.5 edge.

**D4 Big Wave e-chucker.** Side openings narrowed 20 → 16 px (y 268–284, was 264–284) and a 4 px chimney wall added on the right of the ridge slot (left stays 8 px). Doc comment in `warpFrame()` updated. e-chucker catch rate, mean of seeds 5/2026 (2000 balls; 10k in brackets):

| s | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 |
|---|---|---|---|---|---|---|---|---|---|
| before (a4adf14 + D2) | 0.0 | 2.8 | 1.3 | 2.5 | 1.9 | 2.2 | 1.7 | **5.1** | **6.3** |
| after | 0.0 | 2.4 | 0.55 [0.65] | 2.3 [1.9] | 1.75 [1.75] | 1.7 [1.4] | 1.15 [1.25] | 2.4 [2.85] | 3.8 [3.7] |

≤ 4 % everywhere, ≥ 1 % at 0.5–0.8. Reachability test (`big-wave: a ball dropped straight into the top warp…`) still green. The guard cell 0.4 became very stable (88.8/88.0; was 93.6/85.1).

**D5 Big Wave halves.** With the D4 geometry, at **0.9** tulip-l = 4.3/4.1 % and tulip-r = 0.7/0.9 % (seed 5/2026) — both ≥ 0.5 % on both seeds, so the item is met, marginally on tulip-r. ~25 min spent trying to widen that with symmetric splitter pins under/over the ridge and a symmetric chimney; every variant that mixed the halves better also fed the chucker past 4 %:

| variant (on top of D4) | best mixed strength: tulip-l / tulip-r | e-chucker max | guard |
|---|---|---|---|
| none (shipped) | 0.9: 4.3 / 0.8 | 3.8 (1.0) | 88.4 PASS |
| pin (320,96) over the slot | 0.9: 4.2 / 0.6 | 15.1 (1.0) | 88.4, ceil 95.2 |
| pins (300,96),(340,96) | 0.8: 2.7 / 2.6 | 6.4 (0.8) | 88.4 |
| pins (280,98),(360,98) | 0.9: 2.5 / 3.4 | 7.4 (1.0) | 88.4 |
| pins (280,98),(360,98) + slot 6 | 0.8: 1.9 / 2.7, 0.9: 2.5 / 3.0 | 4.8 (0.9) | 87.7 |
| pins (300,96),(340,96) + chimney 12/8 | 1.0: 2.1 / 4.9 | 7.5 (0.9) | 88.4 |
| symmetric chimney 8/8 | 0.9: 4.0 / 0.8 | 37.2 (1.0) | ceil 156 FAIL |
| pins (290,96),(350,96) | 0.9: 2.7 / 2.2 | 30.0 (0.8) | ceil 138 FAIL |

Best-mixing candidate that nearly kept D4 was `pins (280,98),(360,98) + slot 6` (e-chucker 4.8 @0.9). Not shipped; the D4 geometry alone is what's committed.

**D6 Guard.** `tests/soak.test.ts` balance: strengths 0.2–1.0, seeds 5 and 2026, 2000 balls per cell, mean per strength; best of 0.4–0.8 must be within **86.5–93.5 %**; every strength (0.2–1.0, not just 0.2/0.3) must be ≤ 100 %; the per-seed table is printed. Retune: raijin tulips (9,4)/(9,4) → (7,4)/(7,4), win 10 → 9, splitter pin (150,92) (the 0.3 stream's first contact is pin (160,110); the 0.5 stream passes 30 px above the splitter — without it 0.3 and 0.5 shared one path and 0.3 was 105 %); `buildLayout` gained `extraPins`. Big-wave and hana-fan as in D4/D3. Soak + balance file: 30.9 s (whole suite 31.2 s).

Final guard table (mean, then seed 5 / seed 2026), 2000 balls per cell:

| machine | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 | best (0.4–0.8) | margin |
|---|---|---|---|---|---|---|---|---|---|---|---|
| raijin | 57.5 (55.4/59.6) | 69.4 (69.7/69.1) | 73.0 (71.5/74.4) | **90.5** (88.6/92.3) | 58.4 (61.2/55.5) | 46.5 (44.5/48.4) | 77.4 (78.8/76.0) | 68.5 (71.3/65.6) | 71.9 (74.7/69.2) | 90.5 @0.5 | 4.0 / 3.0 |
| big-wave | 87.3 (88.3/86.4) | 73.7 (73.8/73.6) | **88.4** (88.8/88.0) | 61.6 (61.7/61.5) | 74.6 (71.8/77.4) | 67.6 (69.7/65.6) | 76.1 (79.6/72.6) | 83.7 (81.2/86.3) | 77.5 (75.5/79.5) | 88.4 @0.4 | 1.9 / 5.1 |
| hana-fan | 80.2 (84.7/75.7) | 68.0 (64.1/71.8) | 87.7 (89.0/86.4) | **90.6** (92.9/88.3) | 81.9 (82.2/81.6) | 87.5 (86.3/88.8) | 80.7 (77.3/84.2) | 89.7 (89.1/90.2) | 81.0 (76.3/85.7) | 90.6 @0.5 | 4.1 / 2.9 |

Third-seed check (seed 9, not in the guard): raijin 0.5 = 91.3; big-wave 0.4 = 93.0; hana-fan 0.4 = 98.9, 0.5 = 94.0, 0.9 = 95.0 (see concerns).

**D7 Low strengths.** Before (a4adf14 + D2, mean of two seeds): raijin 0.3 = **104.8**, hana-fan 0.3 = **102.4**, big-wave 0.2 = 87.2, others ≤ 81. After: raijin 0.3 = 69.4, hana-fan 0.3 = 68.0, big-wave 0.2 = 87.3 — all < 98. 0.2 and 0.3 (and 0.9, 1.0) are in the guard with the ≤ 100 % ceiling.

## Balance (npm run balance: seed 2026, 10k balls per cell, outside jackpot)

| machine | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 |
|---|---|---|---|---|---|---|---|---|---|
| raijin (a4adf14) | 63 | 103 | 77 | 97 | 63 | 53 | 73 | 71 | 68 |
| raijin (now) | 63 | 70 | 75 | **92** | 58 | 51 | 72 | 68 | 70 |
| big-wave (a4adf14) | 87 | 69 | 86 | 61 | 76 | 69 | 81 | 89 | 70 |
| big-wave (now) | 86 | 69 | **88** | 60 | 75 | 68 | 79 | 84 | 81 |
| hana-fan (a4adf14) | 81 | 99 | 85 | 88 | 86 | 89 | 82 | 96 | 79 |
| hana-fan (now) | 78 | 67 | 85 | 89 | 86 | **90** | 84 | 87 | 84 |

## Layout data changed

| machine | before | after |
|---|---|---|
| raijin | tulips (9,4)/(9,4); win 10 | tulips (7,4)/(7,4); win 9; extra pin (150,92); windmill dirs 1/−1/1/−1 |
| big-wave | side opening y 264–284; chimney 8 px left only | side opening y 268–284; chimney 8 px left + 4 px right; windmill dirs 1/−1/1/−1 |
| hana-fan | tulips (10,3)/(14,3)/(12,3)/(14,3); win 11; windmill (520,240) | tulips (6,4)/(10,4)/(10,4)/(12,4); win 9; windmill (495,245); extra pin (155,95); dirs 1/−1/1 |

## Commands / output

- `npm ci` — ok.
- `npx tsc --noEmit` — clean.
- `npx vitest run` — 11 files, **99 passed** (98 + 1 snapshot test; windmill physics test rewritten; balance guard rewritten). Duration 31.2 s.
- `npm run balance` — table above.
- Scratch: `split.ts` (per-catcher table), `harness.ts` + `raijin.ts`/`hana.ts`/`bigwave.ts` (variant sweeps), `trace.ts` (first-contact histograms), `snapbench.ts` (D1 timing) in the session scratchpad.

## Concerns

1. **Hana-fan is seed-sensitive at 0.4 and 0.9.** Guard seeds give 89.0/86.4 and 89.1/90.2, but seed 9 gives 0.4 = 98.9 (tulip-1 cascades) and 0.9 = 95.0. Deterministic under the guard, but a physics change could push one of those cells past the ceiling; the fix would be another splitter for the 0.4 stream (it lands on tulip-1 at 8–9 %).
2. **Hana-fan tulip-1 is (6,4)** — open is only 2 px wider than closed, so the open/closed feel is weak on that one. The alternative is a pin in the 0.4 stream; not explored within this wave.
3. **Big-wave guard margin on the low side is 1.9** (88.4 vs 86.5). The 0.4 cell is stable across three seeds (88.8/88.0/93.0), so it should hold, but no knob lifts 0.4 without also lifting 0.2 (tulip-l at 10 % there, 87 % return).
4. D5 is satisfied only at 0.9 and only by tulip-r ≈ 0.8 %; per-strength traffic is still coherent (launch jitter ±2 %), as the warp report explained.
5. The guard now covers 0.9/1.0 with the 100 % ceiling too (cheap: +12 soaks); the item only asked for 0.2/0.3.
6. Spec sentence added to §12 Balance describing the guard.
