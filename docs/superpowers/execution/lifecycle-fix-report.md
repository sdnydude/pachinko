# Lifecycle fix report — safe App.stop before start, phone board cap for multi-line status

Branch `feature/pachinko-v1`, base `ab71f46`. Date 2026-09-12.

## What changed

### Finding A — App start/stop lifecycle
- `src/app.ts`
  - Added `private stopped = false;`.
  - `stop()` now sets `this.stopped = true` first and calls `flushSave()` only `if (this.game)` (previously `persistGame()` → `this.game.save()` threw when stop ran before start had resolved). The RAF cancel, `dial?.destroy()`, `boardDial?.destroy()`, `synth.dispose()`, `ro?.disconnect()` and listener removals were already tolerant of never having started and are unchanged.
  - `start()` checks `if (this.stopped) return;` after each `await` (the storage load and the `switchMachine` call), so a stopped App never constructs the panel, dials, ResizeObserver, listeners, or the RAF loop.
- `apps/web/app/play/PachinkoClient.tsx` — reverted to the brief's synchronous cleanup: `void app.start(); return () => app.stop();`. The `started.then(() => app.stop())` deferral and its comment are gone, so the old App's flush runs synchronously in the cleanup, before the new App's `storage.load()`.

### Finding B — phone dial clip with a multi-line status row
- `src/panel/panel.css` (phone `@container (max-width: 767.98px)` block)
  - `.pk-board` max-height changed from `calc(100cqh - 56px - 30px - 38px - 110px)` to `calc(100cqh - 56px - 70px - 38px - 110px)` (status row budget now covers its 4-line maximum).
  - Added the comment: `/* cap mirrors the other rows: strip 56, status max 70 (4 lines), tabs 34+4 pad, dial 96+6+8 margins */`.
  - Removed the inert `justify-self: center` (dead under `width: 100%`).
- `src/core/machine.ts` was temporarily edited (raijin `reachOdds` 16 → 1) for the browser check and reverted; `git diff src/core/machine.ts` is empty.
- `docs/superpowers/screenshots/task13-phone.png` NOT re-captured: at 390×844 in the Ready state the board is width-limited (468 px) under both the old and new cap, so the layout is unchanged (measured, see below).

## Commands and output

- `npx tsc --noEmit` → clean.
- `npx vitest run` → `Test Files 11 passed (11)`, `Tests 79 passed (79)`.
- `npm run e2e` → `10 passed (25.5s)`.
- `npm run build -w web` → green (`○ /`, `○ /_not-found`, `ƒ /play`).

## Browser checks (throwaway Playwright scripts in the session scratchpad, not committed)

### Finding A — Next dev server (`npx next dev -p 3111`, port 3000 is held by Docker), StrictMode on (`reactStrictMode: true` in `apps/web/next.config.ts`)
- `/play`: one `.pk-shell` mounted, machine `raijin`; 1.5 s hold at the canvas centre → bank `0099` (< 0100); zero console errors, zero page errors.
- `page.goto('/play?m=hana-fan')`: machine `hana-fan`, one shell, zero errors.
- Negative check: with the original `stop()` and the same synchronous cleanup, the same script times out waiting for `.pk-canvas` (the StrictMode cleanup throws inside `persistGame`), confirming the script detects the original bug. Restored the fix, reran → PASS.
- Dev server stopped afterwards.

### Finding B — standalone Vite dev server already running on 5173 (cwd = this repo), raijin `reachOdds` temporarily 1, `/?seed=1`, mobile emulation, hold on the board until the status shows the jackpot lines
| viewport | status (lines) | status h | board h | `.pk-dial .arc` bottom | innerHeight | scrollWidth | result |
|---|---|---|---|---|---|---|---|
| 390×664 | `大当り JACKPOT / 15s · 0/15 / REACH ×1 queued` | 54 | 390 | 645 | 664 | 390 | OK |
| 360×640 | `大当り JACKPOT / 15s · 1/15 / REACH ×1 queued` | 54 | 366 | 621 | 640 | 360 | OK |
| 375×667 | `大当り JACKPOT / 15s · 1/15 / REACH ×1 queued` | 54 | 393 | 648 | 667 | 375 | OK |
| 390×844 Ready | `Ready` | 30 | 468 | 825 | 844 | 390 | OK, row gaps strip→board→status→tabs→dial all 0 (no blank band) |

Arithmetic for the old cap at 390×664: board would be capped at 430 (width fit 468), so 56 + 430 + 54 + 38 = 578 leaves 86 px for a 96 px min-height dial → 10 px overflow, i.e. the reported clip. New cap gives 390, leaving 126 px for the dial.

390×844 comparison: injecting the old `max-height` at runtime gives the same 468 px board height as the new cap, so `task13-phone.png` is left as is.

## Concerns
- The jackpot status reached 3 lines (54 px) on raijin (centre attacker, no right-shoot line); the 4-line 70 px worst case is covered by the budget but was not exercised on a right-attacker machine.
- `App.stop()` still leaves the root's innerHTML in place (unchanged behaviour); React unmounts the div anyway.
