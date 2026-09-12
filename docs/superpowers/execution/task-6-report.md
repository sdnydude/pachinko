# Task 6 Report — Game: catchers, tulips, reach, jackpot, score

## What I implemented

Replaced the two Task 5 stubs in `src/core/game.ts` (`tryCatch`, `stepPhase`) with the brief's exact code, and added the four helper methods directly below them, in this order: `award`, `queueReach`, `startReach`, `stepPhase`, `openJackpot` (interleaved exactly as the brief specifies — `award`/`queueReach`/`startReach` between `tryCatch` and `stepPhase`, `openJackpot` after `stepPhase`).

- `tryCatch`: checks the attacker pocket first (only during `jackpot` phase), then the regular catchers (win/out/start/tulip), awarding payouts and toggling tulip state.
- `award`: adds to bank/sessionWon, tracks bestSession high-water mark.
- `queueReach`: starts a reach immediately if idle in `playing`, otherwise queues up to `REACH_QUEUE_MAX` (4).
- `startReach`: rolls win (1/reachOdds), then tension, then digits, in that exact rng-call order; builds the `ReachState` with `stopAt` derived from `REEL_STOP` plus `REEL_TENSION` on a match.
- `stepPhase`: advances `reach.t`/`jackpot.t` by DT, emits `reelStop` events as each reel crosses its stop time, resolves win → `openJackpot` or miss → `reachMiss` after `MISS_HOLD`, drains the reach queue when returning to `playing`, and closes the jackpot at the ball or time cap.
- `openJackpot`: opens the jackpot state and phase.

No other part of `game.ts` was touched — same public API, same `snapshot()` semantics (still returns live references).

Created `tests/game-rules.test.ts` verbatim from the brief (13 tests covering catchers/payouts, tulip toggling, reach start/reel-stop timing, tension miss, win → jackpot open, reach queueing to the cap, jackpot attacker payout + ball cap, jackpot time cap, attacker inert while closed, right-shoot flag on big-wave, big-wave start-chucker tulip, and save round-trip).

## What I tested and results

Ran the full suite and the type checker once before committing:

- `npx vitest run` → 6 test files, 51 tests, all passed (38 pre-existing + 13 new).
- `npx tsc --noEmit` → no output, clean.

## TDD evidence

**RED** — `npx vitest run tests/game-rules.test.ts` (before implementing, stubs still in place):
```
Tests  10 failed | 3 passed (13)
```
(The 3 passes were incidental — cases where the phase/queue state doesn't change under the stub, e.g. bank-emptying is unaffected — everything requiring catch/reach/jackpot behavior failed, e.g.:
`AssertionError: expected 'playing' to be 'jackpot'`, `expected [] to include 'reachStart'`.)

**GREEN** — `npx vitest run` (after implementing):
```
 ✓ tests/board.test.ts (4 tests)
 ✓ tests/physics.test.ts (11 tests)
 ✓ tests/rng.test.ts (4 tests)
 ✓ tests/game-launch.test.ts (10 tests)
 ✓ tests/game-rules.test.ts (13 tests)
 ✓ tests/layouts.test.ts (9 tests)

 Test Files  6 passed (6)
      Tests  51 passed (51)
```
`npx tsc --noEmit` → clean, no errors.

## Files changed

- `/Users/swebber64/dhg/pachinko/src/core/game.ts` (modified: `tryCatch`, `stepPhase` implemented; `award`, `queueReach`, `startReach`, `openJackpot` added)
- `/Users/swebber64/dhg/pachinko/tests/game-rules.test.ts` (created, verbatim from brief)

## Self-review findings

- Diff against the brief's Step 3 code block is a byte-for-byte match (checked via `git diff src/core/game.ts`); nothing extra added, nothing else in the file restructured.
- Test file matches the brief's Step 1 code block verbatim.
- No leftover stub comments or dead code from Task 5's placeholder.
- `snapshot()` untouched, still returns live references as instructed.
- Commit contains only the two intended files.

## Concerns

None. All tests pass on the first implementation attempt; no brief/test defects encountered.

## Commit

`54e8ce6` — "feat: catchers, tulips, reach queue, jackpot and score"
