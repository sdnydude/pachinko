# Wave A (core) report — 2026-09-12

Worktree: `/Users/swebber64/dhg/pachinko/.claude/worktrees/agent-a86fe3088a776f9be`
Branch: `worktree-agent-a86fe3088a776f9be` (from 441db39 on feature/pachinko-v1)
Commit: `fdb22e4` — fix(core): free balls pay nothing, ramp-safe trim, cap wait, gadget solids, balance retune
Files touched: src/core/{board,game,physics,sim}.ts, src/core/layouts/{common,raijin,big-wave,hana-fan}.ts, tests/{game-launch,game-rules,layouts,physics,storage}.test.ts. Nothing outside src/core, tests.

## Per item

**A1 Free balls pay nothing** — `Ball.free?: true` (physics.ts); `Game.fireAt(strength, true)` sets it via conditional spread. `tryCatch`: for a free ball the attacker branch skips `jackpot.caught++/total+=/award()`, the catcher branch skips `award()`; events (`catch`/`attackerCatch`/`tulip`), tulip toggles and `queueReach` are unchanged; `e.payout` stays nominal so `runSoak` return rates are unaffected.
Tests (game-rules): `free balls > trigger catch, tulip, reach and attacker events but never pay or count toward the jackpot` (20 free balls: 7 win, 3 tulip, 5 start, 5 attacker → bank/sessionWon/bestSession/biggestJackpot = 100/0/0/0, jackpot {caught 0, total 0}, 15 catch + 3 tulip + 5 attackerCatch events, reach queued to max); `free balls > fireAt(strength, true) marks the ball free`.

**A2 Trim does not cancel the ramp** — `trimmed` flag removed; `holdTime` added. `stepDial`: while held, ramp `strength += DT/RAMP_SECONDS` (clamped 1) while `holdTime ≤ RAMP_SECONDS`; auto-fire only once `holdTime ≥ RAMP_SECONDS` (fireTimer primed so the first shot is immediate, then every AUTOFIRE_SECONDS). `trim(delta)` just clamps `strength + delta` to 0.05..1. Bug caught by the new test and fixed: ramping before the gate check, otherwise strength stalled at 143/144.
Tests (game-launch): `trim adds to the ramping strength; auto-fire still waits for the ramp time` (hold+trim 0.3 → 0.8 at 0.6 s, no launch through 1.19 s, launch at 1.21 s with strength 1); `trim after the ramp sets the strength and it stays; auto-fire uses it` (trim −0.5 at 1.5 s → 0.5, stays, next launch strength 0.5). Old `trim fixes strength and starts auto-fire` replaced.

**A3 Launcher waits at cap** — `pendingShot: number | null`. `setHeld(false)` with no auto-fire during the hold: if `balls.length ≥ MAX_BALLS` store `pendingShot = strength`, else `fireAt`. `stepDial` (runs whether or not held) fires the pending shot once a slot is free, charging the bank.
Test (game-launch): `release at the ball cap waits and fires exactly once when a slot frees` (15 free balls in flight, hold+release → 0 launches, bank 100; step until a ball exits → exactly 1 launch, bank 99; 2 more seconds → 0 further launches).

**A4 Gadget solids** — board.ts: `Segment`, `Solids`, `Layout.solids`, `roofRect(rect, peak)` (closed outline, top edge peaked at the centre). physics.ts: `resolveSegment(b, seg, rest)` capsule test — closest point on the segment; interior contacts push out toward the side `(px,py)` was on (no tunnelling through thin walls); end-point contacts reuse the `resolveCircle` dead-centre nudge (`±0.01` by ball id parity) so a roof peak never balances a ball; reflects with `rest`; returns impact speed. `stepBall` pass: pins → windmills → solid circles (`resolveCircle`, REST_WALL) → segments (`resolveSegment`, REST_WALL) → walls; both emit `wall` contacts. `buildLayout` takes optional `solids` (default empty).
Per machine (from the cel SVGs): raijin circle (320,260,r100) + `roofRect(232,364,176,60, 12)`; big-wave `roofRect(178,128,284,250, 14)`; hana-fan circle (320,240,r84) + `roofRect(244,334,152,52, 12)`.
Soak `maxAge ≤ 30` initially failed on big-wave (a ball aged 499 s; up to 15 balls parked at (247,116)/(289,112)/(351,112)/(393,116)): the top pin row (y=110) sat 4–8 px from the frame roof (peak y=114) and wedged balls. Fixed in layout data: big-wave skip rect raised from y=120 to y=100 so no pin sits on the roof. After that, all 15 machine×strength soaks pass; mean ball lifetime 2.0–3.75 s (max is big-wave @0.4, balls rolling along the roof).
Tests (physics): `resolveSegment > pushes the ball out of a horizontal segment and reflects the normal velocity with restitution`, `> pushes toward the side the ball came from, so it cannot tunnel through`, `> reflects off a slanted segment along its normal` (45° wall, exact push-out and (75,25) reflection), `> no contact when far, beyond the end points, or already separating`; `stepBall solids > bounces off a solid circle and emits a wall contact`, `> a ball landing dead-center on a roof peak is nudged sideways instead of resting`. Tests (layouts): `<machine>: solids exclude every pin` ×3 (no pin centre inside a solid circle; none within PIN_R of a segment; ≥5 segments).

**A5 Balance retune** — layout data only (see tables). `runSoak` guard changed from `balls×0.15 s + 200 s` to `balls×2 s + 60 s`: with the 15-ball cap and 3.75 s mean lifetime, big-wave @0.4 could no longer fire 2000 balls inside the old fixed buffer (soak reported 1956 fired); 2 s/ball is the bound implied by the 30 s exit invariant. Loop still breaks as soon as the board is empty.
The `tulip mechanics` test hard-coded raijin's old 6/14 widths; it now reads the layout's own `closedHalfWidth`/`openHalfWidth`.

**A6** — (a) `buildLayout` skip adds `inRect(x, y, o.reelRect)`. (b) storage tests: `MemoryStorage > load returns an isolated clone`, `LocalStorage > stored perMachine: null loads as {}`, `LocalStorage > save resolves when the backend throws`. (c) `Snapshot` doc comment: same-frame read view, live references, do not retain/mutate.

**A7** — not touched.

## Commands / output

- `npm ci` — ok.
- `npx tsc --noEmit` — clean.
- `npx vitest run` — 11 files, **95 passed** (79 baseline + 16 new; one baseline test rewritten for A2, one made width-agnostic).
- `npm run balance` — tables below.

## Balance (npm run balance: seed 2026, 10k balls per cell, outside jackpot)

Before (441db39):

| machine | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 |
|---|---|---|---|---|---|---|---|---|---|
| raijin | 101% | 85% | 69% | **90%** | 72% | 64% | 72% | 49% | 72% |
| big-wave | 75% | 79% | **99%** | 89% | 51% | 54% | 66% | 21% | 70% |
| hana-fan | 72% | 81% | 68% | **96%** | 74% | 39% | 65% | 70% | 73% |

After solids, before retune: raijin 0.5 = 119%, big-wave max(0.4–0.8) = 68% (e-chucker sealed, see concerns), hana-fan max = 84%.

After (fdb22e4):

| machine | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0 |
|---|---|---|---|---|---|---|---|---|---|
| raijin | 63% | 103% | 77% | **97%** | 63% | 53% | 73% | 71% | 68% |
| big-wave | 101% | 76% | 63% | **87%** | 39% | 76% | 82% | 72% | 80% |
| hana-fan | 81% | 99% | 85% | 88% | 86% | **89%** | 82% | 96% | 79% |

Guard as tested (seed 5, 2000 balls, max over 0.4–0.8): raijin **90%**, big-wave **88%**, hana-fan **94%** — all pass. 3-seed (5/2026/9) means at the best guarded strength: raijin 0.5 = 93%, big-wave 0.5 = 89%, hana-fan 0.5 = 93%.

Layout data changed:

| machine | before | after |
|---|---|---|
| raijin | tulips (14,6)/(14,6); win 14 | tulips (9,4)/(9,4); win 10 |
| big-wave | tulip-l (14,6), tulip-r (14,6); win 9; skip y=120 | tulip-l (8,3), tulip-r (24,10); win 12; skip y=100 |
| hana-fan | tulips (11.5,3)×4; win 8 | tulip-1 (10,3), tulip-2 (14,3), tulip-3 (12,3), tulip-4 (14,3); win 11 |

## Concerns

1. **big-wave e-chucker is sealed.** The cel's gold frame really is (178,128,284,250) and the electric start tulip (320,372) sits inside its lower band (LCD ends at y=330). With the closed outline A4 mandates, it gets 0 catches in every soak (pre-solids it was hit by balls flying through the frame area). It still works when hit (rules test uses `dropInto`). Moving a catcher is outside the retune knobs I was given, so I left it; the big-wave return now rides on tulip-r/out-r/win-r. Decision needed: open the frame's lower band (segments stop at y≈330 + a funnel), or move the e-chucker below the frame with a pin funnel.
2. **Unguarded strengths near/above 100%:** raijin 0.3 = 103%, big-wave 0.2 = 101%, hana-fan 0.3 = 99% and 0.9 = 96% (10k table). Baseline had the same class of issue (raijin 0.2 = 101%). big-wave 0.2 was 162% mid-retune (tulip-l) and is now at the minimum tulip widths; raijin's 0.3 and 0.5 arcs hit the same catchers, so 0.3 can't be lowered without pushing 0.5 below the floor. If the guard should cover 0.2–1.0, the fix is structural (windmill/pin funnel work), not widths.
3. **hana-fan guard margin** is thin on the ceiling side (94% vs 95%); deterministic under seed 5, but any later physics change will move it.
4. **Roof peaks are invisible** — balls bounce 12–14 px above the drawn bezel top. B may want to draw the roof (or the cel could get a ridge). The mask/flower circles match the cel radii.
5. **big-wave left half is dead at strength ≥ 0.3** (out-l 0.2%, tulip-l 0%): balls launched over the frame all come down its right side. Consistent with the cel, but the left tulip only matters at 0.2.
6. `pendingShot` is kept across a new hold (fires when a slot frees even if the player is holding again). Simple and arguably what the player wanted; flagging in case B expects release-at-cap to be dropped.
7. Balance cell `big-wave 0.6` is 39% — a wide dead zone between 0.5 and 0.7; feel issue for the launcher, not a guard issue.
