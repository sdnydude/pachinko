# Task 12 Report: Effects and synthesized audio

## What I implemented

- `src/render/effects.ts` — `Effects` class (particle sparks, pin flashes, floating catch/attacker-catch text, board dim during reach tension, jackpot slam-in copy, jackpot total display, white flash / reduced-motion outline flash), `MAX_PARTICLES = 200`. Code taken verbatim from the brief's Step 3.
- `src/audio/sets.ts` — `SoundSet` interface and `SOUND_SETS` (per-machine oscillator tunings for raijin / big-wave / hana-fan). Verbatim from Step 4.
- `src/audio/synth.ts` — `Synth` class: WebAudio beep/arp/loop primitives, per-second rate limiting (`MAX_PER_SECOND = 12`), `resume()` for the audio-context unlock, `setMuted`/`setSet`, `onEvents` mapping game events to sounds. Verbatim from Step 4.
- `tests/effects.test.ts` — the three tests from the brief's Step 1, unmodified.
- `src/app.ts` — wired per Step 5: imports for `Effects`/`Synth`/`SOUND_SETS`; `effects!: Effects` and `synth: Synth` fields; `Synth` constructed in the `App` constructor; `Effects` (re)constructed in `switchMachine` (with `prefers-reduced-motion` check) and `synth.setSet(...)` called there too; `dial.onActivity = () => this.synth.resume()` and `synth.setMuted(this.save.mute)` added in `start()`; `frame()` now runs `effects.onEvents/update` and `synth.onEvents` before `renderer.draw(this.game.snapshot(), this.effects)`.
- `src/render/canvas.ts` — no changes needed. It already had the `EffectsLike` interface and `effects?.draw(ctx, s.time)` call from a prior task, so the "pass effects" modification the brief calls for was already in place.

## TDD evidence

RED:
```
npx vitest run tests/effects.test.ts
```
```
FAIL  tests/effects.test.ts [ tests/effects.test.ts ]
Error: Cannot find module '../src/render/effects' imported from '/Users/swebber64/dhg/pachinko/tests/effects.test.ts'
...
Test Files  1 failed (1)
     Tests  no tests
```

GREEN (after implementing effects.ts/sets.ts/synth.ts):
```
npx vitest run tests/effects.test.ts
```
```
✓ tests/effects.test.ts (3 tests) 2ms
Test Files  1 passed (1)
     Tests  3 passed (3)
```

Full suite after wiring app.ts:
```
npx vitest run
```
```
Test Files  11 passed (11)
     Tests  78 passed (78)
Duration  9.42s
```

`npx tsc --noEmit` — no output, exit clean.

## Visual verification

Dev server was already running on :5173 (curl returned 200), reused it.

1. First pass (`shot12.mjs`, seed=1, 6s hold): no console errors, but the single end-of-hold screenshot only showed the static background art plus balls in flight — no clearly readable dynamic float text, though tiny spark-colored specks were present near a few pins/windmills.
2. Took periodic screenshots every 500ms over an 8s hold (`shot12b.mjs`) to sample more frames: several frames (e.g. one around t≈3.5s and t≈5s) showed small yellow/orange square particle clusters near pins/windmills distinct from the static pin grid — confirms `spark()` particles render. No catch/start-pocket hit landed in that run, so no floating +N text yet.
3. Per the brief, temporarily set `raijin.tuning.reachOdds` from 16 to 1 in `src/core/machine.ts`, then ran a longer capture (`shot12d.mjs`, seed=1, 21s hold, screenshot every 750ms). This produced, in order: a `reachStart` (reels spinning, dark digits), a forced-win reach (`444` reels, since reachOdds=1 makes `startReach`'s `win` branch always true), the `jackpotOpen` slam-in ("JACKPOT" bold stroked text sliding toward the attacker), the attacker gate opening (red fill with gold accent stroke, matching `s.attackerOpen`), and an `attackerCatch` — a bright yellow "+15" floating text rising from the open attacker gate with an accompanying spark burst.
4. Selected the frame at t≈11.25s (`h15.png`) as the best single frame: it shows the `444` gold win reels, the open attacker gate, a crisp yellow "+15" float text with fresh spark particles around it, plus a few more sparks near the left windmill. Read the PNG to confirm this content before committing it as `docs/superpowers/screenshots/task12-effects.png`.
5. Reverted `src/core/machine.ts` with `git checkout -- src/core/machine.ts`; confirmed `git diff src/core/machine.ts` is empty.
6. Re-ran `npx tsc --noEmit` (clean) and `npx vitest run` (78/78 passing) after the revert, to make sure nothing depended on the temporary tuning change.

No console errors or page errors were captured in any of the four Playwright runs (`shot12.mjs`, `shot12b.mjs`, `shot12c.mjs`, `shot12d.mjs`) — each printed "No console errors."

Throwaway scripts (`shot12.mjs`, `shot12b.mjs`, `shot12c.mjs`, `shot12d.mjs`) live under `.superpowers/sdd/2026-09-11-pachinko/`, which is gitignored — nothing to clean up from git's perspective; intermediate frame directories were deleted after picking the final screenshot.

## Files changed

- `src/render/effects.ts` (new)
- `src/audio/sets.ts` (new)
- `src/audio/synth.ts` (new)
- `tests/effects.test.ts` (new)
- `src/app.ts` (modified — imports, fields, constructor, `start`, `switchMachine`, `frame`)
- `docs/superpowers/screenshots/task12-effects.png` (new)
- `src/render/canvas.ts` — no diff; already supported `effects?: EffectsLike` from a prior task.

Commit: `bfccd3f feat: particle effects, jackpot presentation, synthesized audio`

## Self-review findings

- Names match the brief's interface section exactly: `Effects`, `MAX_PARTICLES`, `SoundSet`, `SOUND_SETS`, `Synth`, method/field names (`onEvents`, `update`, `draw`, `lampPhase`, `lampSpeed`, `particleCount`, `resume`, `setMuted`, `setSet`, `muted`).
- `Effects.onEvents` uses `P.accent` (not `accentOpenSafe`) for the attacker float text, per the brief's correction note — verified in the code as written.
- Event ordering in `frame()` matches spec: `onEvents` → `update(dt)` → `synth.onEvents` → `renderer.draw(snapshot, effects)`.
- `synth.resume()` is only ever called from `dial.onActivity`, itself only invoked from pointer-down/keydown handlers inside `Dial` — never on load or in `start()`/`switchMachine()`.
- `app.ts` diff is minimal and surgical: 3 new imports, 2 new fields, 1 constructor line, 2 lines in `start()`, 3 lines in `switchMachine()`, 1 changed + 1 new line in `frame()`. Nothing unrelated touched.
- `src/render/canvas.ts` required no edit — confirmed the `EffectsLike` interface and `effects?.draw(...)` call already existed before this task, so I did not touch it (would have been a no-op diff).
- `src/core/machine.ts` is unchanged in the final commit (`git diff` empty after revert, and the commit does not include this file).
- No test was left failing at any point before commit; `npx tsc --noEmit` was clean at commit time.
- No extra files, no stray console.log/debug code left in shipped sources.

## Concerns

- None. The one soft judgment call: the brief's top-of-file "Interfaces" section shows `SoundSet` with tuple types (`[freq, type, ms]`) while the Step 4 code block (marked as the actual implementation to use) defines it with object shapes (`{freq, type, ms}`). I followed Step 4's code verbatim, since the task brief explicitly frames Step 4 as the code to implement and the interfaces section as a summary; tsc is clean and all tests pass with this shape.

## Fix round 1 (controller review)

Three fixes applied, one parked item left untouched, one new test added.

### Fixes

1. `src/render/effects.ts` — reduced motion now also suppresses the pin jewel flash. In `onEvents`, the `'pin'` case only pushes to `this.flashes` when `!this.reduced` (the `spark()` call is unchanged — it already no-ops internally under reduced motion):
   ```ts
   case 'pin': if (!this.reduced) this.flashes.push({ index: e.index, life: 0.08 }); this.spark(e.x, e.y, 3, P.accent, Math.min(1, e.speed / 400)); break;
   ```
2. `src/render/effects.ts` — reduced motion now stops the lamp chase. In `update()`, `lampPhase` only advances when `!this.reduced`:
   ```ts
   if (!this.reduced) this.lampPhase = (this.lampPhase + dt * speed) % 1000;
   ```
   Added a `flashCount` getter (mirroring `particleCount`) so this is testable without reaching into private state.
3. `src/audio/synth.ts` — added `dispose()`:
   ```ts
   dispose(): void { this.stopLoop(); if (this.ctx) { void this.ctx.close(); this.ctx = null; } }
   ```
   `src/app.ts` — `App.stop()` now calls `this.synth.dispose()` right after `this.dial?.destroy()`.

### Parked (left unchanged, per ruling)

The "12 sounds/sec cap bypass" via jackpot-loop ticks and multi-note arps was explicitly ruled out of scope — the cap counts triggered sound *events* (one arp = one event; the jackpot loop is one continuous sound), not individual oscillator voices. `src/audio/synth.ts`'s `allow()`/`arp()`/`startLoop()` are unchanged.

### New test

Added to `tests/effects.test.ts`:
```ts
it('reduced motion suppresses pin flash and lamp chase', () => {
  const fx = new Effects(THEMES.raijin, MACHINES.raijin.layout, { reducedMotion: true });
  const g = new Game(MACHINES.raijin, 1); const s = g.snapshot();
  fx.onEvents([{ type: 'pin', index: 0, x: 1, y: 1, speed: 100 }], s);
  fx.update(0.5);
  expect(fx.lampPhase).toBe(0);
  expect(fx.flashCount).toBe(0);
});
```

### Verification

```
npx tsc --noEmit
```
No output — clean.

```
npx vitest run
```
```
✓ tests/effects.test.ts (4 tests) 2ms
...
Test Files  11 passed (11)
     Tests  79 passed (79)
Duration  9.66s
```

### Files changed (fix round 1)

- `src/render/effects.ts` (flash gating, lamp-phase gating, `flashCount` getter)
- `src/audio/synth.ts` (`dispose()`)
- `src/app.ts` (`stop()` calls `synth.dispose()`)
- `tests/effects.test.ts` (new reduced-motion test)

Commit: `c2e0033 fix: reduced-motion flash and lamp gating, synth dispose on stop`

### Self-review

- Diff is minimal — each fix is a single added condition or single added method/call, nothing else touched.
- `git diff src/core/machine.ts` still empty (not touched this round).
- No console errors expected — no browser-facing behavior changed beyond gating/cleanup; did not re-run the Playwright visual check since the controller's fix list was code/logic-only and covered by the new unit test plus the full suite.
- Parked item confirmed untouched by diff inspection above (no changes to `allow`, `arp`, or `startLoop` in `synth.ts`).
