# Task 5 Report: Game — dial, launch, bank, ball stepping

## What I implemented

- `src/core/game.ts`: `Game` class plus supporting constants/types, transcribed exactly from the brief.
  - Constants: `MAX_BALLS=15`, `START_BANK=100`, `RAMP_SECONDS=1.2`, `AUTOFIRE_SECONDS=0.6`, `REACH_QUEUE_MAX=4`, `REEL_STOP=[2.0,2.4,2.8]`, `REEL_TENSION=1.0`, `MISS_HOLD=0.5`, `MAX_FRAME=0.1`, `DT_STEPS(seconds)`.
  - Types: `Phase`, `ReachState`, `JackpotState`, `GameSave`, `Snapshot`, `GameEvent`.
  - `Game`: `setHeld`, `trim`, `buyIn`, `fireAt`, `tick`, `step`, `snapshot`, `save`.
  - `tryCatch` and `stepPhase` are left as no-op stubs per the brief (Task 6 fills them in) — no catcher/reach/jackpot logic implemented here.
- `tests/game-launch.test.ts`: 10 tests transcribed exactly from the brief, covering dial ramp, auto-fire cadence, trim, ball cap, RNG-jittered launch velocity determinism, empty-bank/buy-in flow, tick accumulation/clamping, and ball fall/pin/exit via physics.

Both of the flagged brief details are implemented as specified:
1. `fireAt` pushes the `launch` event into `this.pending`; `step()` starts by draining `this.pending` into the event array it returns, before running dial/ball/phase/bank-empty logic for that step.
2. `stepDial` only advances the ramp while `!this.trimmed`, and only starts accumulating `fireTimer` once `strength >= 1` or `trimmed` is true. `setHeld(true)` pre-loads `fireTimer = AUTOFIRE_SECONDS`, so the first auto-fire after the ramp completes (or immediately after a trim) fires on the very next qualifying step rather than waiting another 0.6s.

## What I tested and results

- `npx vitest run tests/game-launch.test.ts` — 10/10 passed.
- `npx vitest run` (full suite) — 5 test files, 38/38 passed (28 prior + 10 new).
- `npx tsc --noEmit` — clean, no output/errors.

## TDD evidence

RED — before `src/core/game.ts` existed:
```
$ npx vitest run tests/game-launch.test.ts
 FAIL  tests/game-launch.test.ts [ tests/game-launch.test.ts ]
Error: Cannot find module '../src/core/game' imported from '/Users/swebber64/dhg/pachinko/tests/game-launch.test.ts'
...
 Test Files  1 failed (1)
      Tests  no tests
```

GREEN — after implementing `src/core/game.ts`:
```
$ npx vitest run tests/game-launch.test.ts
 ✓ tests/game-launch.test.ts (10 tests) 6ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
```

Full suite after implementation:
```
$ npx vitest run
 ✓ tests/board.test.ts (4 tests) 4ms
 ✓ tests/physics.test.ts (11 tests) 2ms
 ✓ tests/rng.test.ts (4 tests) 25ms
 ✓ tests/game-launch.test.ts (10 tests) 6ms
 ✓ tests/layouts.test.ts (9 tests) 14ms

 Test Files  5 passed (5)
      Tests  38 passed (38)
```

`npx tsc --noEmit` produced no output (clean).

## Files changed

- `/Users/swebber64/dhg/pachinko/src/core/game.ts` (new)
- `/Users/swebber64/dhg/pachinko/tests/game-launch.test.ts` (new)

## Self-review findings

- Diff contains only the two new files (`git diff --cached --stat`: 2 files changed, 255 insertions, 0 deletions) — no unrelated edits.
- All exported names/values (`MAX_BALLS`, `START_BANK`, `RAMP_SECONDS`, `AUTOFIRE_SECONDS`, `REACH_QUEUE_MAX`, `REEL_STOP`, `REEL_TENSION`, `MISS_HOLD`, `Phase`, `ReachState`, `JackpotState`, `GameSave`, `Snapshot`, `GameEvent`, `Game` and its public methods) match the brief's "Produces" interface verbatim.
- `tryCatch` and `stepPhase` remain stubs exactly as instructed (no catcher/reach/jackpot behavior added).
- Both flagged implementation details (pending-drain ordering in `step()`; pre-loaded `fireTimer` for immediate first auto-fire) are present and are what make the ramp/auto-fire tests pass.
- No test was altered from the brief's given code.
- Commit contains only the two new files with the required trailer lines.

## Concerns

None. No defects found in the brief's code or tests; everything transcribed as given passed on first run without modification.
