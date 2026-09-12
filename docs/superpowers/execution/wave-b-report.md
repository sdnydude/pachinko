# Wave B (UI) report — 2026-09-12

Worktree: `/Users/swebber64/dhg/pachinko/.claude/worktrees/agent-a0283f38d0effa754`
Branch: `worktree-agent-a0283f38d0effa754` (from `441db39` on `feature/pachinko-v1`)
Commit: `3755a85` — `fix(ui): reset, key modifiers, jackpot switch guard, reel/tulip/tick/swipe/silhouette/texture visuals, live reduced motion`
Files (16): src/app.ts, src/audio/synth.ts, src/input/dial.ts, src/panel/panel.ts, src/panel/panel.css, src/render/canvas.ts, src/render/effects.ts, src/render/theme.ts, src/render/themes/{raijin,big-wave,hana-fan}.ts, tests/effects.test.ts, e2e/smoke.spec.ts, docs/superpowers/screenshots/task13-{desktop,tablet,phone}.png. `src/core/machine.ts` is NOT in the commit (temporary reachOdds tweak reverted with `git checkout --` after each capture; `git status` clean).

## Per item

- **B1 Reset no-op** — `switchMachine(id, opts?: { reset?: boolean })` skips `persistGame()` when `reset` is set; `onReset` clears `save.perMachine[id]`, calls `switchMachine(id, { reset: true })`, then `scheduleSave()` so the reset bank persists. New e2e test `reset restores the bank to 100`: tap-shoot (bank `0099`), click `[data-a=reset]`, expect `0100`.
- **B2 Dial caption overlap** — `.pk-dial { margin-bottom: 24px }` in the ≥1024 container block. Measured in the desktop capture: hint bottom 532.0 px, tools top 547.0 px, 15 px clear gap.
- **B3 Key modifiers / Space** — new exported `ignoreKey(e)` in `src/input/dial.ts` (true for meta/ctrl/alt, or when `e.target` is BUTTON/INPUT/TEXTAREA/SELECT); `App.keys` and `Dial.key` return early on it. A focused Sound/Reset button now takes Space itself.
- **B4 Jackpot switch guard** — all switching (tabs, number keys, swipe) goes through `App.requestSwitch(id)`, which returns if `phase === 'jackpot'`. `Panel.update` sets `aria-disabled` on the three tabs during jackpot (styled at .45 opacity); tab `onclick` also skips when disabled. Reset is deliberately not guarded (it is not a switch).
- **B5 Panel** — tabs use `aria-selected` (CSS updated); mute button cached in `this.el.mute`; tab buttons cached in `this.tabs`; `App.frame` takes one `snapshot()` and passes it to effects, renderer, panel, attract/buy-in checks and `drawDebug`; `Theme.shortName` added ("RAIJIN", "BIG WAVE", "HANA FAN") and the regex removed. `showBuyIn` now takes `(buyIns, sessionWon)` from the frame snapshot.
- **B6 Reduced motion live** — `Effects.reduced` is public; `App` keeps `reducedMq = matchMedia(...)`, adds a `change` listener in `start()` that sets `effects.reduced`, removes it in `stop()`. `switchMachine` seeds a new Effects from `reducedMq.matches`.
- **B7 Dead branch** — `reachMiss` now sets `lampSpeed = 'slow'` unconditionally.
- **B8 Unused surface** — removed `App.listeners`, `App.frameHooks`, `Renderer.toBoard` (and the now-unused `GameEvent` import in app.ts). Grep across the repo (src, e2e, apps/web, standalone, tools) found no callers; only the plan doc mentions them.
- **B9 Spec §7 visuals**
  - Tulip wings: renderer keeps `tulipAnim[id]` (0..1) and eases toward the snapshot's open state at `dt*1000/150` per frame; `drawCatcher` takes the interpolated spread and lerps closed→open half-width. First frame snaps to the target so a reload does not replay the open.
  - Panel reels enlarge: `.pk-reels` font-size now via `--reel-size` (34/28/22 px per breakpoint); `.pk-reels.reach` = `calc(var(--reel-size) * 1.3)` with a 150 ms transition (none under reduced motion). Class toggled from `s.phase === 'reach'`. Measured 44.2 px during reach on desktop.
  - Third-reel ticks: `Synth.startTicks()` runs a `setInterval` every 100 ms for 1.0 s (10 soft ticks at gain 0.03 using the set's `tick`, still subject to the 12/s cap) on `reelStop` reel 1 with `tension`; cleared on `reelStop` reel 2, `jackpotOpen`, `dispose`, `setSet`.
  - Swipe: `Panel.swipe(zone)` on `.pk-tabs` and `.pk-strip`; horizontal pointer drag ≥ 40 px fires `onSwipe(±1)` and captures the pointer so the tab under the drag does not also click. App maps to previous/next in `MACHINE_ORDER` with wrap-around (a dead-end swipe on a 3-tab row felt broken — say the word if you want clamping). Rows have `touch-action: pan-y`. Skipped while tabs are `aria-disabled` (jackpot). Verified on phone: drag right from RAIJIN → hana-fan (no stray tab click), drag left → raijin.
  - Cabinet silhouettes: each tab is an 18×24 inline SVG (rounded cabinet filled with the machine's `wall`, stroked with `panelAccent`; lighter board rect and a tray in `panelAccent`) followed by `shortName`. Tablet shrinks it to 15×20 to fit the 24 px rows; desktop rows grew 24→28 px.
  - Wall texture: `.pk-board` background = `repeating-linear-gradient(45deg, color-mix(in srgb, var(--pk-accent) 6%, transparent) 0 3px, transparent 3px 14px)` over `--pk-wall`.
- **B10 Dial dead-zone** — `TRIM_DEAD_ZONE = 8` px (was 3).

## Commands / output

- `npx tsc --noEmit` — clean (exit 0).
- `npx vitest run` — 11 files, 80 tests passed (was 79; added `reduced can be toggled live`).
- `npm run e2e` — 11 passed (9 machine×viewport smoke + reset + mute), 26.7 s, no console errors.
- Throwaway scripts (scratchpad only, not committed): `shots.mjs` (screenshots, swipe, reduced motion), `click3.mjs` (jackpot guard), `trace.mjs` (reach frame with reachOdds=1).

## Screenshots (1440×900 / 820×1180 / 390×844, `/?seed=1`, hold 1.5 s, release, +300 ms)

- `task13-desktop.png` — marquee lamp strip, three cabinet-silhouette tabs (RAIJIN selected in gold), reels 7 7 7, bank 0099, dial with "HOLD TO SHOOT" caption sitting clearly above Sound/Reset (15 px gap), gutters show a faint 45° stripe over the wall color, dim enough that the board still dominates.
- `task13-tablet.png` — board on top, bottom bar with stacked silhouette tabs, reels, bank/best, Ready status, round dial on the right; Sound/Reset under the tabs.
- `task13-phone.png` — top strip (reels, bank, best), board, "Ready" status, tab row with silhouettes, full-width thumb-zone dial with strength arc. Row layout intact.
- Scratch `reach-desktop.png` — panel reels box visibly taller with 44 px digits (9 2 5, spinning digits dimmed), status "激アツ REACH !!", fast lamp chase.
- Scratch `jackpot-desktop.png` — tabs dimmed (aria-disabled), rainbow chase, "大当り JACKPOT 11s · 0/15".

## §11 reduced-motion check

Context with `reducedMotion: 'reduce'`, raijin seed 1, one 1.5 s shot plus four free balls over 2 s, sampled every 100 ms: `effects.reduced` true at load, **max `effects.particleCount` = 0**, **lamp `.on` classes identical across all 20 samples** (no chase). Live toggle: `effects.reduced` false → true → false as `emulateMedia` flipped reduce/no-preference. No console errors.

## Jackpot guard verification (and a false alarm worth knowing)

With the jackpot open: `keyboard.press('2')` ignored (machine stays raijin, `aria-disabled=true` on all tabs); manual `mouse.move/down/up` on the BIG WAVE tab ignored, jackpot continues. `locator.click()` on a tab *appears* to switch — but Playwright treats `aria-disabled="true"` as "element is not enabled" and waits, retrying until the 15 s jackpot expires, then clicks a legitimately enabled tab (confirmed with a 4 s timeout: "element is not enabled" in the call log). Do not write an e2e that clicks a tab during jackpot with `locator.click()` unless it passes `force: true`.

## Concerns

- Vite's file watcher on this Mac delivers change events late (5–10 s); toggling `machine.ts` mid-run caused stray full-reloads in the throwaway captures. No impact on the commit, but keep in mind for any script that edits source while the dev server is running.
- `color-mix()` for the wall texture needs Chromium 111+/Safari 16.2+; older browsers drop the gradient layer and show the plain wall color.
- Swipe wraps around at the ends of `MACHINE_ORDER`; trivial to clamp if preferred.
- The tension ticks share the 12-sounds/s cap with pin clicks; during a busy tension second some ticks or clicks may be dropped. Spec-compliant, just noting the interaction.
- `jackpot-desktop.png` scratch frame shows the first-run card because the jackpot was forced via `openJackpot()` in a fresh context without a launch; cosmetic, scratch only.
- This report lives in the worktree (sandbox refused writes to the main checkout); copy to `/Users/swebber64/dhg/pachinko/.superpowers/sdd/2026-09-11-pachinko/wave-b-report.md` on merge.
