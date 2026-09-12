# Task 4: Machine layouts and tuning — Report

## What I implemented

- `src/core/layouts/common.ts` — `GRID` spec, `bottomRow(startPayout)`, `tulip(id, kind, x, y, payout)`, `attacker(x, payout)`, and `buildLayout(opts)` that assembles pin grid + tulip wing pins into a `Layout`, skipping pins inside gadget rects, near windmills (26), near tulips (30), near the attacker (90), or below y=600 (open bottom funnel).
- `src/core/layouts/raijin.ts` — RAIJIN_LAYOUT: kabuki-mask/reel skip rect, 4 windmills, 2 win tulips, bottom row (startPayout 3), attacker at x=320 payout 15, reel rect 240,372,160x44.
- `src/core/layouts/big-wave.ts` — BIG_WAVE_LAYOUT: gold-frame/LCD skip rect, 4 windmills, an electric start tulip (kind 'start') plus 2 win tulips, bottom row (startPayout 3), attacker at x=500 (right side) payout 15, reel rect 220,200,200x90.
- `src/core/layouts/hana-fan.ts` — HANA_FAN_LAYOUT: spinning-flower/reel skip rect, 3 windmills, 4 win tulips, bottom row (startPayout 3), attacker at x=320 payout 13, reel rect 250,340,140x40.
- `src/core/machine.ts` — `MachineId`, `Tuning`, `Machine` types, `MACHINES` record (raijin/big-wave/hana-fan) with the exact tuning values from the spec table, and `MACHINE_ORDER`.
- `tests/layouts.test.ts` — exactly as specified in the brief.

All five source files and the test file were transcribed verbatim from the task brief (Steps 3–5), with no deviations.

## What I tested and results

Pin counts (well above the ≥80 requirement, no adjustment needed):
- raijin: 114 pins
- big-wave: 105 pins
- hana-fan: 124 pins

`npx vitest run tests/layouts.test.ts` — 9/9 passed on the first attempt (no skipRects tuning required).
`npx vitest run` (full suite) — 4 files, 28/28 passed (board 4, physics 11, rng 4, layouts 9).
`npx tsc --noEmit` — clean, no output/errors.

## TDD evidence

**RED** — `npx vitest run tests/layouts.test.ts` (before creating src files):
```
FAIL  tests/layouts.test.ts [ tests/layouts.test.ts ]
Error: Cannot find module '../src/core/machine' imported from '/Users/swebber64/dhg/pachinko/tests/layouts.test.ts'
...
Test Files  1 failed (1)
     Tests  no tests
```

**GREEN** — `npx vitest run tests/layouts.test.ts` (after creating common.ts, the three layout files, and machine.ts):
```
 ✓ tests/layouts.test.ts (9 tests) 14ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

**Full suite GREEN** — `npx vitest run`:
```
 ✓ tests/board.test.ts (4 tests) 2ms
 ✓ tests/physics.test.ts (11 tests) 2ms
 ✓ tests/rng.test.ts (4 tests) 23ms
 ✓ tests/layouts.test.ts (9 tests) 13ms

 Test Files  4 passed (4)
      Tests  28 passed (28)
```

## Files changed

- Created: `src/core/layouts/common.ts`
- Created: `src/core/layouts/raijin.ts`
- Created: `src/core/layouts/big-wave.ts`
- Created: `src/core/layouts/hana-fan.ts`
- Created: `src/core/machine.ts`
- Created: `tests/layouts.test.ts`

Commit: `13a8ccd` — "feat: three machine layouts and tuning tables" (6 files changed, 124 insertions, 0 deletions).

## Layout adjustments

None. All skipRects and windmill/tulip placements from the brief passed the ≥80-pins, clear-of-reel-rect, and clear-of-windmill (22 units) assertions on the first run — no changes were needed.

## Self-review findings

- Diff contains only the 6 expected new files (`git status --porcelain` showed no other changes); nothing extra was touched.
- Source files match the brief's code blocks verbatim — types, field names, and numeric values (payouts, coordinates, tuning table) all match exactly.
- `MACHINE_ORDER` is `['raijin', 'big-wave', 'hana-fan']` as specified.
- Tuning values double-checked against the spec table in the task instructions: hana-fan reachOdds 12 / 8s / 8 balls / attacker 13 / start 3; big-wave 8 / 10s / 10 / 15 / 3; raijin 16 / 15s / 15 / 15 / 3 — all match `MACHINES` in `machine.ts` and the test's `toEqual` assertions.
- `npx tsc --noEmit` clean; `npx vitest run` output is pristine (no warnings, no skipped tests).
- Commit message carries the two required trailer lines exactly as specified.

## Concerns

None.
