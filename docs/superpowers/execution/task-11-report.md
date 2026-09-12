# Task 11 Report: Dial input, app wiring, first playable page

## What I implemented

Per the brief, verbatim:

- `src/input/dial.ts` — `DialTarget` interface and `Dial` class (pointer hold/drag-trim + spacebar/arrow-key input, `onActivity` hook, `destroy()`).
- `src/app.ts` — `AppOptions` interface and `App` class: loads save data, builds the board DOM, wires `Game` + `Renderer` + `Dial` + `Storage`, runs the rAF loop with a `ResizeObserver`-driven `fit()`, autosaves on catch/launch/attackerCatch/jackpotClose events (debounced 500ms) and on `visibilitychange`/`pagehide`.
- `src/app.css` — board container styling (`.pk-root`, `.pk-board`, `.pk-canvas`).
- `standalone/index.html`, `standalone/main.ts`, `standalone/vite.config.ts` — Vite-served standalone entry reading `?seed=` and `?m=` query params, mounting `App` with `LocalStorage`.
- `package.json` scripts updated: `"dev": "vite --config standalone/vite.config.ts"`, `"build:standalone": "vite build --config standalone/vite.config.ts"` (previously `vite standalone` / `vite build standalone`).

All five new source files diff byte-identical to the code blocks in the brief (confirmed with `diff` against the brief, modulo markdown code fences).

## Typecheck / test results

```
$ npx tsc --noEmit
(no output — clean)

$ npx vitest run
 Test Files  10 passed (10)
      Tests  75 passed (75)
   Duration  9.71s
```

75/75 tests green, including the ~9.4s soak suite. `tsc --noEmit` clean.

## Screenshot verification

Ran `npm run dev` in the background (Vite on :5173), then a throwaway Playwright script (`.superpowers/sdd/2026-09-11-pachinko/shot11.mjs`, not committed — `.superpowers/` is gitignored) that: opened `http://localhost:5173/?seed=1` at 900×1000, waited 800ms, moved the mouse to the `.pk-canvas` center, mouse down, waited 2000ms, mouse up, waited 600ms, and saved a full-page screenshot to `docs/superpowers/screenshots/task11-raijin.png`. Console errors and page errors were captured — **none occurred** ("No console errors." printed).

Read the resulting PNG. It shows:
- The Raijin cel: dark red/black board, radial light-ray background, a gold-framed circular kabuki mask (Raijin's face — red eyebrows, black slanted eyes, red smiling mouth) in the center, with the 雷神 RAIJIN marquee and "THUNDER GOD · MAX TYPE · 1/16" subtitle at top, two gold lightning-bolt rails down each side, "激アツ REACH" and "大当り JACKPOT" text banners, and a scalloped red catcher-net pattern along the bottom.
- Gold pins (small yellow-gold dots) and red jewel pins interspersed among them, scattered across the field in a diagonal-row grid — none of them fall inside the mask circle itself (confirmed no pins overlap the kabuki face).
- Two white balls in flight (one upper-left near the launch rail, one mid-right past the mask) — this is the deterministic result of holding for exactly 2s: `AUTOFIRE_SECONDS=0.6` + `RAMP_SECONDS=1.2` means the first shot fires at t≈1.2s and the second at t≈1.8s, both still airborne when the screenshot is taken at t≈2.6s. This is correct game behavior for the fixed hold duration specified in Step 5, not a bug — "balls arcing" is visibly true even though only two are in flight at this instant.
- The reel window shows a static "7 7 7" (the game's default `lastDigits` before any reach has resolved).
- Catchers along the bottom are labeled: "OUT", "+5" (tulip), "START" (center, red), "+5" (tulip), "OUT" — matching the Raijin layout.

Nothing visibly wrong; no fixes were needed to the app/dial/render code.

## Files changed

- `/Users/swebber64/dhg/pachinko/src/input/dial.ts` (new)
- `/Users/swebber64/dhg/pachinko/src/app.ts` (new)
- `/Users/swebber64/dhg/pachinko/src/app.css` (new)
- `/Users/swebber64/dhg/pachinko/standalone/index.html` (new)
- `/Users/swebber64/dhg/pachinko/standalone/main.ts` (new)
- `/Users/swebber64/dhg/pachinko/standalone/vite.config.ts` (new)
- `/Users/swebber64/dhg/pachinko/package.json` (scripts updated; `@types/node` and `@playwright/test` devDependencies added)
- `/Users/swebber64/dhg/pachinko/package-lock.json` (regenerated for the above)
- `/Users/swebber64/dhg/pachinko/docs/superpowers/screenshots/task11-raijin.png` (new)
- Not committed (gitignored, throwaway): `/Users/swebber64/dhg/pachinko/.superpowers/sdd/2026-09-11-pachinko/shot11.mjs`

Commit: `c1a235d` — "feat: dial input, app loop, first playable standalone page"

## Fixes beyond the brief, and why

1. **Added `@types/node` as a devDependency.** `standalone/vite.config.ts` (brief's exact code) uses `node:path` and `__dirname`. The repo's `tsconfig.json` already `include`s `standalone`, and no `@types/node` was previously installed anywhere in the repo (checked `node_modules/@types` and `tools/*.ts`, which don't use Node built-ins). Without it, `tsc --noEmit` failed with `TS2307`/`TS2304`. This is a minimal, necessary addition for the brief's own code to typecheck cleanly — no code in the brief changed.
2. **Installed `@playwright/test` + Chromium browser**, exactly as instructed in the outer task context (also needed by Task 15's e2e suite, and `package.json` already had a stub `"e2e": "playwright test"` script with no corresponding devDependency).

No other deviations. `package.json`'s `dev`/`build:standalone` scripts were the only lines changed there besides the new devDependencies.

## Self-review findings

- All five new files diff byte-identical (module code) against the brief's code blocks.
- Interfaces match the brief's "Produces" section exactly: `DialTarget`, `Dial`, `AppOptions`, `App` (constructor, `start()`, `stop()`, `switchMachine()`, `readonly game`).
- `npx tsc --noEmit` clean; `npx vitest run` 75/75 green.
- No console errors or page errors during the screenshot run.
- `git status` clean after commit; only the intended 9 files changed (no stray files, no `node_modules` leakage, no `dist/` artifacts).
- Confirmed `.superpowers/` is gitignored, so the throwaway `shot11.mjs` script was never at risk of being committed.
- Dev server was started in the background and confirmed killed (`pkill` + `ps aux` check came back empty) before finishing.

## Concerns

None. The one thing worth flagging (not a defect): only 2 balls are visibly airborne in the screenshot rather than "several" in the loosest sense, which is simply the deterministic consequence of the game's fixed ramp/autofire timing constants combined with the exact 2-second hold duration specified for the verification script — both of which are fixed by other tasks' code and by the outer task's own instructions, not something Task 11 controls.

## Fix round 1 (post-review)

The reviewer found two defects in the brief's prescribed code; controller ruling was to fix both plus a tiny related guard.

**Defect 1 — `src/app.ts`: `ResizeObserver` never disconnected.** The brief's `start()` created the observer as an anonymous expression (`new ResizeObserver(() => this.fit()).observe(this.boardEl)`) with no reference kept, so `stop()` could never disconnect it — every `switchMachine`/remount would leak an observer still firing `fit()` against a live (or stale) `boardEl`.

Fix: added `private ro: ResizeObserver | null = null;`, changed `start()` to `this.ro = new ResizeObserver(() => this.fit()); this.ro.observe(this.boardEl); this.fit();`, and added `this.ro?.disconnect(); this.ro = null;` at the top of `stop()`.

**Defect 2 — `standalone/main.ts`: unvalidated URL params.** The brief's code did `Number(q.get('seed'))` and cast `?m=` straight to `MachineId` with no validation — a non-numeric `?seed=` (e.g. `?seed=abc` → `NaN`) or an unknown `?m=` (e.g. `?m=bogus`) would pass straight into `App`, and `MACHINES[id]` in `switchMachine` would then be `undefined`, crashing the app.

Fix (exact code supplied by the controller):
```ts
import { MACHINES, type MachineId } from '../src/core/machine';
...
const rawSeed = Number(q.get('seed'));
const seed = q.get('seed') !== null && Number.isFinite(rawSeed) ? rawSeed >>> 0 : undefined;
const m = q.get('m');
const machine = m !== null && m in MACHINES ? (m as MachineId) : undefined;
```
An unknown `?m=` now falls back to the default machine (`raijin`, via `App`'s own `o.machine ?? 'raijin'`), and a non-numeric `?seed=` now falls back to a random session seed (`Date.now() >>> 0`), matching `AppOptions`'s optional-field contract.

### Verification

```
$ npx tsc --noEmit
(no output — clean)

$ npx vitest run
 Test Files  10 passed (10)
      Tests  75 passed (75)
   Duration  9.85s
```

75/75 tests green, `tsc --noEmit` clean. Reviewed `git diff src/app.ts standalone/main.ts` before committing — it matched the controller's prescribed patch exactly, nothing extra touched.

Commit: `7fcbe6e` — "fix: disconnect ResizeObserver on stop, validate standalone URL params"
