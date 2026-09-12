# Task 10 Report: Canvas Renderer

## What I implemented

Created `src/render/canvas.ts` exactly per the brief (verbatim code block from the brief), containing:

- `EffectsLike` interface — `draw(ctx, t)` hook for Task 12's effects layer.
- `Renderer` class:
  - `constructor(canvas, machine, theme)` — grabs 2D context, kicks off `loadCel` for the theme's cel image, exposes `ready: Promise<void>`.
  - `resize(cssW, cssH)` — sets backing-store size at devicePixelRatio, CSS size, and computes `scale`/`ox`/`oy` to letterbox the fixed 600x720 board into the given CSS box.
  - `toBoard(clientX, clientY)` — inverts the resize transform for input hit-testing.
  - `draw(s, effects?)` — clears to wall color, applies the board transform, clips to the board rect, draws the cel (or a `#222` fallback while loading), then pins, windmills (rotating via a per-index accumulated angle driven by `Snapshot.windmillSpin`), catchers (via `drawCatcher`), the attacker gate, the 3-digit reel, interpolated balls with a radial-gradient highlight and shadow, then calls `effects?.draw(ctx, s.time)`.
  - `drawCatcher(c, open)` — private helper drawing tulip catchers (body + two curved wings using `openHalfWidth`/`closedHalfWidth` from `c.tulip`) or plain rectangular pockets (win/start/out) using `c.halfWidth` from the layout. No hard-coded widths anywhere — everything reads from the per-machine `Catcher` passed in.

Every field consumed (`Snapshot.balls/tulipOpen/windmillSpin/reelDigits/reelSpinning/attackerOpen/time`, `Layout.pins/windmills/catchers/attacker/reelRect`, `Catcher.id/kind/x/y/halfWidth/payout/tulip`, `Theme.palette/fonts/copy/jewelEvery`, `BOARD_W/BOARD_H/BALL_R`, `loadCel`) matches the actual exported shapes in `src/core/game.ts`, `src/core/board.ts`, `src/core/machine.ts`, and `src/render/theme.ts`/`cel.ts` — verified by reading those files before writing.

## Typecheck and test results

```
$ npx tsc --noEmit
(no output — clean)
```

```
$ npx vitest run
 Test Files  10 passed (10)
      Tests  75 passed (75)
   Duration  9.45s
```

All 10 existing test files pass (board, physics, storage, rng, theme, game-rules, game-launch, layouts, determinism, soak — soak took ~9.2s as expected). No new tests were added, per the brief ("no unit test (canvas)").

## Files changed

- Created: `/Users/swebber64/dhg/pachinko/src/render/canvas.ts` (102 lines)

## Self-review findings

- Diffed the committed file against the brief's code block: identical, verbatim.
- Public surface matches the brief's `Produces` interface exactly: `EffectsLike`, `Renderer` with `constructor`, `ready`, `resize`, `draw`, `toBoard` — no extra public members added.
- Catchers/tulips draw at their actual per-layout `halfWidth`/`openHalfWidth`/`closedHalfWidth` (Task 7 requirement) — no hard-coded pocket widths.
- Imports resolve correctly against current exports: `BALL_R, BOARD_H, BOARD_W, Catcher` from `../core/board`; `Machine` from `../core/machine`; `Snapshot` from `../core/game`; `Theme` from `./theme`; `loadCel` from `./cel`.
- Nothing extra was added beyond the brief's code.

## Concerns

None. This task has no runtime/visual verification path until Task 11; typecheck and the existing suite are the full gate as specified, and both are clean.

## Fix round 1

Reviewer found two defects in the brief's prescribed code; controller ruling: fix both in `src/render/canvas.ts`.

1. **Windmill rotation assumed 60fps.** `spin / 60` integrated per call to `draw`, not per elapsed time, so rotation speed was tied to render rate rather than simulation time. Fixed by tracking `lastTime` and integrating by actual elapsed `Snapshot.time`:
   - Added `private lastTime = -1;` field.
   - At the top of `draw(s, effects)`: `const dt = this.lastTime < 0 ? 0 : Math.max(0, s.time - this.lastTime); this.lastTime = s.time;`
   - Windmill loop now uses `this.windmillAngle[i] = (this.windmillAngle[i] ?? 0) + spin * dt;` with the comment updated to "rad/s from the game; integrated by elapsed sim time".

2. **Jewel selector never fired for `jewelEvery <= 2`.** `i % T.jewelEvery === 2` requires a remainder of 2, which is impossible when the modulus is 1 or 2. Changed to `i % T.jewelEvery === 0`.

### Commands and output

```
$ npx tsc --noEmit
(no output — clean)
```

```
$ npx vitest run
 Test Files  10 passed (10)
      Tests  75 passed (75)
   Duration  9.39s
```

All 75 tests still pass; no test changes required (no unit test covers canvas rendering).

### Commit

`504e15b` — fix: time-based windmill spin and phase-safe jewel pins

Diff (verified before commit):
```
+  private lastTime = -1;
...
+    const dt = this.lastTime < 0 ? 0 : Math.max(0, s.time - this.lastTime); this.lastTime = s.time;
...
-      ctx.fillStyle = i % T.jewelEvery === 2 ? P.jewel : P.pin; ctx.fill();
+      ctx.fillStyle = i % T.jewelEvery === 0 ? P.jewel : P.pin; ctx.fill();
...
-      const spin = s.windmillSpin[i] ?? 0;                      // rad/s from the game; 1/60 ≈ one frame
-      this.windmillAngle[i] = (this.windmillAngle[i] ?? 0) + spin / 60;
+      const spin = s.windmillSpin[i] ?? 0;                      // rad/s from the game; integrated by elapsed sim time
+      this.windmillAngle[i] = (this.windmillAngle[i] ?? 0) + spin * dt;
```

No further concerns.
