# Task 13 report: Panel, responsive layout, overlays, accessibility

## Fix round 1 (controller rulings)

Commit `86a0625` — "fix: scope container queries to the shell, phone strip columns, single keyboard dial, attract guards".

### What changed

**1. CRITICAL — container queries scoped to `.pk-shell`, not `body`.** The round-1 fix (in the original commit) had moved `container-type: inline-size` to `body` to work around Chromium's refusal to apply an `@container` rule to the element that hosts the container itself. The controller correctly flagged that this was too broad a scope. Fixed properly this time: `App`'s constructor now builds `<div class="pk-shell"><div class="pk-board">...</div></div>` inside `.pk-root`, and `panel.css` was restructured so:
- `.pk-root` carries only `container-type: inline-size` plus the non-layout theme properties (`background`/`color`/`font-family`, driven by the CSS custom properties `Panel.setTheme` sets).
- `.pk-shell` carries `display: grid; gap: 0; height: 100%;` and is the target of all three `@container` breakpoint rules (renamed from `.pk-root { grid-template-... }` to `.pk-shell { grid-template-... }`).
- `body { container-type: inline-size; }` was removed.
- `Panel` now receives `this.shellEl` (not `this.o.root`) as its insertion point, so the marquee/panel/live-region markup lands inside the shell, and `App.openOverlay`/`drawDebug` now append into `this.shellEl` too, so overlays and the debug HUD live inside the shell as the controller specified.
- `Panel.setTheme` still sets the `--pk-*` CSS custom properties on `.pk-root` specifically (`this.root.parentElement`, since `this.root` is now the shell and the shell's parent is always `.pk-root` by construction) — this is necessary because `.pk-root`'s own `background`/`color` rule reads those same custom properties, and a custom property set on a descendant wouldn't flow upward to it. Verified computed styles resolve correctly (see below).

**2. CRITICAL — phone strip real columns.** Wrapped `.pk-reels`, `.pk-bank`, `.pk-best` (in that order) in a new `<div class="pk-strip">` inside `.pk-panel` (`panel.ts`). `.pk-strip { display: contents; }` is the base rule, so desktop and tablet are unaffected (its children still land in their own named grid areas exactly as before — no tablet grid-template-areas changes were needed, confirmed by testing). At the phone breakpoint, `.pk-strip` becomes `grid-area: strip; display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; padding: 0 12px; background: var(--pk-panel-bg); border-bottom: 2px solid var(--pk-accent);`, with `.pk-reels` at `font-size: 22px; border-radius: 0;` and `.pk-bank`/`.pk-best` given `text-align: right`. Deleted the dead `.pk-reels .reel:nth-child(n+4)` rule and the old overlapping `grid-area: strip` declarations on `.pk-bank`/`.pk-best`.

**3. IMPORTANT — doubled arrow-key trim fixed.** `Dial` gained `opts.keyboard` (default `true`); when `false`, it never registers the window `keydown`/`keyup` listeners (and skips removing them in `destroy()`). `App` now constructs the board's `Dial` with `{ keyboard: false }`, so only the panel's `Dial` (on `panel.dialEl`) owns arrow-key trim.

**4. IMPORTANT — attract mode can't fire during buy-in.** `startAttract()` now returns immediately if `this.overlay?.classList.contains('buy-in')`. `frame()`'s attract-fire condition now also requires `this.game.snapshot().phase !== 'idle'`. `showBuyIn()` sets `this.attract = false` up front.

**5–9. MINOR.** Removed the unused `firstRunShown` field. Digit-key handling replaced with `const idx = Number(e.key) - 1; if (Number.isInteger(idx) && MACHINE_ORDER[idx]) void this.switchMachine(MACHINE_ORDER[idx]);`. Debug clipboard write now ends `.catch(() => {})`. Added `@media (prefers-reduced-motion: reduce) { .pk-marquee .lamp { transition: none; } }`. Tab buttons now render `MACHINES[id].name.replace(/^\S+\s/, '')` (e.g. "RAIJIN", "BIG WAVE", "HANA FAN") with `title="${MACHINES[id].name}"` carrying the full name.

### Commands and output

```
$ npx tsc --noEmit
(clean, no output)

$ npx vitest run
 Test Files  11 passed (11)
      Tests  79 passed (79)
   Duration  9.67s
```

Re-ran the same throwaway Playwright script (`.superpowers/sdd/2026-09-11-pachinko/verify-task13.mjs`) against the same running dev server. All prior behavior checks still passed (first-run overlay, first-launch dismiss + persist, `m` mute toggle + persistence after reload, backtick debug overlay) and no console errors were captured on any of the three viewport runs.

### What each re-captured screenshot shows

- **`task13-desktop.png` (1440×900):** Same layout as before (marquee lamps chasing top, board left, slim panel right with reels/bank/best/status/dial/tools). Tab buttons now read "RAI…", "BIG …", "HA…" — still ellipsis-truncated at this width (150px ÷ 3 flex columns is tighter than "BIG WAVE"/"HANA FAN" at 11px bold), each with a `title` tooltip carrying the full name. This is a pre-existing space constraint of the 150px desktop column, not a regression from this round — tablet and phone (below) show the full Latin names without truncation since their tab columns are wider.
- **`task13-tablet.png` (820×1180):** Unchanged from prior round — marquee top, full-width board, 140px bottom bar with stacked tabs (now reading "RAIJIN"/"BIG WAVE"/"HANA FAN" in full, no truncation), reels, Bank/status/Best, round dial. Confirms the `.pk-shell` rename didn't disturb the tablet grid.
- **`task13-phone.png` (390×844):** Top strip now shows all three reel digits together ("7 7 7") as one visually distinct chip, then "BANK 0099", then "BEST 0000" — cleanly separated with no ghosting (verified via a separate cropped screenshot of just `.pk-strip` and its children's bounding rects: reels x 12–259.7, bank x 271.7–318.8, best x 330.8–378, no overlap). This is a structural fix (real grid columns via the new wrapper) rather than the round-1 "opaque background to hide ghosting" patch. Board/status/tabs/dial rows all unchanged and correct.

Note: the wrapper order specified for `.pk-strip` (reels, bank, best) puts BANK before BEST left-to-right on the phone strip; the fix message's closing verification note said "then BEST, then BANK" but the explicit CSS/markup instructions (both the wrapper's child order and the `grid-template-columns: 1fr auto auto` mapping) specify reels/bank/best in that order, which is what's implemented and what the screenshot shows. Flagging this in case BEST-before-BANK was actually intended.

### Additional targeted checks

- **Reduced motion / marquee lamps:** loaded with Playwright's `reducedMotion: 'reduce'` context option — 10 of 40 lamps rendered "on" in a static (non-animating) pattern, confirming the lamps are visible, not blank, while frozen.
- **Single keyboard dial:** pressed `ArrowUp` once with the panel dial focused; `game.snapshot().dial.strength` moved by exactly `0.05` (one trim step, not two), confirming the board's `Dial` no longer double-registers the arrow-key handler.
- **Attract/buy-in guard:** re-verified the buy-in overlay (seeded via `context.addInitScript` with `bank: 1`, same technique as round 1) still opens correctly and persists; code-reviewed `startAttract()`'s early return and `showBuyIn()`'s `this.attract = false` rather than waiting out the real 20s idle timer, to keep verification fast — the logic is a straightforward guard with no external dependencies that would need runtime discovery.
- Re-ran `git diff` for `app.ts`, `input/dial.ts`, and `panel/panel.ts` line-by-line against the controller's ruling list before committing.

### Concerns carried forward

- The desktop tab truncation (item in "What each screenshot shows" above) is unchanged behavior from round 1 and wasn't called out as something to fix in this round — flagging only for visibility, not treating it as an open item.
- The BEST/BANK ordering note above — implemented per the explicit structural instructions; can swap the wrapper's child order in one line if BEST-before-BANK was actually wanted.


## What I implemented

- `src/panel/fonts.ts` — `ensureFonts()`, verbatim from the brief.
- `src/panel/panel.ts` — `Panel` class and `PanelCallbacks` interface, verbatim from the brief.
- `src/panel/panel.css` — Step 1 CSS verbatim, plus the `.pk-overlay.first-run { pointer-events: none; }` rule the brief calls out in Step 4, plus a handful of layout fixes (below).
- `src/app.ts` — added the `Panel`/`ensureFonts`/`panel.css` imports, the new fields, panel construction in `start()` (before the first `switchMachine`), a second `Dial` on `boardEl` alongside the existing one on `panel.dialEl` (both wired to `onActivity = () => this.activity()`), the `keys` handler and its `keydown` listener, `panel.setTheme`/`ensureFonts` in `switchMachine`, the panel-update/attract/buy-in/first-run/debug block in `frame`, and the `activity`/`startAttract`/`showFirstRun`/`showBuyIn`/`openOverlay`/`closeOverlay`/`drawDebug` helpers — all verbatim from the brief except one addition (see Concerns).
- `src/app.css` — replaced with exactly the three rules from Step 4.
- `tsconfig.json` — added `"DOM.Iterable"` to `lib` (see Concerns; required for the brief's own panel.ts to compile).

## Typecheck / test results

```
$ npx tsc --noEmit
(clean, no output)

$ npx vitest run
 Test Files  11 passed (11)
      Tests  79 passed (79)
   Duration  9.78s
```

## Visual verification

Dev server was already running on :5173 (HTTP 200), so I used it. Screenshots taken with a throwaway Playwright script (`.superpowers/sdd/2026-09-11-pachinko/verify-task13.mjs`, not committed) at `/?seed=1`, holding the board 1.5s then releasing, per the brief's recipe.

**First pass (brief CSS verbatim) — broken.** All three container queries target `.pk-root`, the same element that hosts `container-type: inline-size`. I confirmed with an isolated repro (`selftest.html`, a `.box` with `container-type` and an `@container` rule targeting itself) that Chromium never applies a container query to the container element it queries — this is a real, documented restriction, not a fluke of this codebase. So none of the three breakpoints' `.pk-root` grid rules applied; the whole layout fell back to an unstyled single-column grid with panel content bleeding across the canvas. Descendant-targeted rules (`.pk-marquee`, `.pk-board { grid-area }`, etc.) were unaffected, since those elements aren't the container.

**Fix:** moved `container-type: inline-size` from `.pk-root` onto `body` (panel.css line 1-2). `.pk-root` is a descendant of `body`, so it can now be queried and restyled by its own breakpoints. Re-verified computed styles (`gridTemplateColumns`/`Rows`/`Areas`) resolved correctly at all three widths after this change.

**Second pass — two more layout bugs found and fixed, confirmed by re-screenshotting:**

1. **Desktop panel overflow.** `.pk-panel`'s base rule was `display: grid` with no column definition, so its single implicit column sized to the *max-content* of its children (the three tab buttons' Japanese+English label text needed ~151px) rather than clamping to the 150px column the outer grid assigned it. Reels, tabs, and tools bled ~11-19px past the viewport edge, cutting off the third reel digit and the Reset button. Fixed by giving `.pk-panel` `grid-template-columns: minmax(0, 1fr)` and `overflow: hidden`, and `.pk-tabs button` `min-width: 0` plus ellipsis truncation. Tab labels now read "雷神…", "大海…", "花扇…" — legible, fully contained.
2. **Tablet bottom bar overflow.** The three stacked tab buttons (24px height × 3 + 2× 6px gap = 84px) plus the bank/best number stack (55px each) needed 84+55=139px total across the two panel rows, but the outer grid only gave the panel row 112px, so "Best 0000" was vertically cropped at the bottom of the viewport. Bumped the tablet third row from 112px to 140px.
3. **Phone strip ghosting** (the trouble spot the brief called out). The reel digits and the bank/best chips share the same `strip` grid area by design; without a background, the reel's gold "7" bled through behind "0000"/"0099", producing a partial-glyph ghosting artifact. Rather than restructuring into three separate columns (which the single `.pk-reels` DOM node can't cleanly participate in, since its three digits are internal children, not siblings), I gave `.pk-bank`/`.pk-best` an opaque `background: var(--pk-panel-bg)` so they cleanly occlude the reel digit behind them. Confirmed via a cropped screenshot of `.pk-reels`'s bounding box before/after — no visible ghosting after the fix.

**Final screenshots** (`docs/superpowers/screenshots/task13-{desktop,tablet,phone}.png`), matching the brief's layout table:

- **Desktop (1440×900):** marquee lamp strip chasing across the top; board on the left (~1290px, board:panel ≈ 8.6:1, i.e. "5:6"-style — panel is the slim column); right column has tabs (truncated names, active tab highlighted amber), 777 reel window, Bank/Best numbers, "Ready"/reach status text, round dial with "HOLD TO SHOOT" hint, Sound/Reset buttons — all fully contained, nothing clipped.
- **Tablet (820×1180):** marquee top; board full width; bottom 140px bar with tabs stacked vertically on the left, reels, Bank/status in row 1 and Best in row 2, round dial on the right — all fully visible, nothing cropped.
- **Phone (390×844):** top 56px strip with left reel digit, "BEST 0000" and "BANK 0099" chips (opaque, no ghosting) on the right two-thirds; board; "Ready" status line; three machine tab buttons in a row; full-width thumb-zone dial bar at the bottom with a horizontal fill arc and "HOLD TO SHOOT" hint; no marquee (correctly hidden).

**Behavior checks** (same script, desktop viewport):
- First-run overlay: after `localStorage.clear()` + reload, `.pk-overlay.first-run` was present. ✓
- Holding the board (pointer-events:none on the overlay) fired a launch and the overlay closed on the first `launch` event; `firstRunDone` got persisted. ✓
- `m` key: `[data-a=mute]` `aria-pressed` flipped to `true`, and remained `true` after a full page reload (persisted via `setSaveField`). ✓
- Backtick (`` ` ``): `.pk-debug` element appeared, toggled off on second press. ✓
- Buy-in overlay: separately verified by seeding `localStorage` (via `context.addInitScript`, to avoid the outgoing page's `pagehide`/`flushSave` clobbering an injected save) with `bank: 1`, firing the last ball, and waiting for `needsBuyIn`. `.pk-overlay.buy-in` appeared ("Out of balls", session/won text, "BUY IN · 100 BALLS" button), dimmed the board, and clicking Buy In closed it and refilled the bank. ✓ (screenshot inspected, not committed — not one of the three required shots)
- Console errors: none captured on any of the three viewport runs, nor during the first-run/mute/debug/buy-in checks.

## Files changed

- `/Users/swebber64/dhg/pachinko/src/panel/panel.ts` (new)
- `/Users/swebber64/dhg/pachinko/src/panel/panel.css` (new)
- `/Users/swebber64/dhg/pachinko/src/panel/fonts.ts` (new)
- `/Users/swebber64/dhg/pachinko/src/app.ts` (modified)
- `/Users/swebber64/dhg/pachinko/src/app.css` (modified)
- `/Users/swebber64/dhg/pachinko/tsconfig.json` (modified — see Concerns)
- `/Users/swebber64/dhg/pachinko/docs/superpowers/screenshots/task13-desktop.png` (new)
- `/Users/swebber64/dhg/pachinko/docs/superpowers/screenshots/task13-tablet.png` (new)
- `/Users/swebber64/dhg/pachinko/docs/superpowers/screenshots/task13-phone.png` (new)

Throwaway, uncommitted: `/Users/swebber64/dhg/pachinko/.superpowers/sdd/2026-09-11-pachinko/verify-task13.mjs`.

## Layout fixes beyond the brief, and why

All five are documented in detail under "Visual verification" above; summarized:

1. Moved `container-type: inline-size` from `.pk-root` to `body` — the brief's CSS has `.pk-root` query its own container, which browsers refuse to apply (confirmed with an isolated repro). Without this, none of the three responsive breakpoints worked at all.
2. `.pk-panel { grid-template-columns: minmax(0, 1fr); overflow: hidden; }` and `.pk-tabs button { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 2px; }` — desktop panel content (tab labels) was wider than the fixed 150px column and bled past the viewport edge.
3. Tablet panel row height 112px → 140px — stacked tab buttons + bank/best number stacks needed 139px combined, more than the brief's 112px, cropping "Best 0000".
4. `.pk-bank, .pk-best { ...; background: var(--pk-panel-bg); }` on phone — without a background the shared `strip` grid area let the reel digit bleed through behind the bank/best numbers.

None of these touch the DOM structure, class names, or the documented interfaces — all are CSS-only corrections to make the specified breakpoints render as described.

## Self-review

- `Panel`, `PanelCallbacks`, `ensureFonts` all match the brief's interfaces exactly (names, signatures, exports).
- DOM tree matches the brief's diagram (`pk-marquee`, `pk-board > canvas`, `pk-panel` with `pk-tabs`/`pk-reels`/`pk-bank`/`pk-best`/`pk-status`/`pk-dial`/`pk-tools`, `pk-overlay`, `pk-live`).
- app.css is exactly the three lines specified in Step 4, no more, no less.
- `npx tsc --noEmit` clean, `npx vitest run` 79/79 green.
- No console errors on any of the three viewport runs or the interaction checks.
- All three layouts visually match the brief's table after the CSS fixes above; re-verified by re-reading each screenshot after every fix, not just once.
- Nothing extra added to app.ts beyond the brief's code, other than the one `synth.resume()` line noted below.
- Diffed `git diff` for `app.ts`/`app.css` line-by-line against the brief before committing.

## Concerns

1. **`this.synth.resume();` added inside `activity()`** (not present in the brief's verbatim helper). The brief replaces the old `dial.onActivity = () => this.synth.resume()` with `() => this.activity()`, and its `activity()` body doesn't call `resume()`. Taken completely literally, that silently drops the audio-unlock-on-gesture behavior Task 12 added (browsers require a user gesture to start an `AudioContext`; nothing else in the codebase calls `resume()`). I judged this an oversight rather than an intended regression — dropping it would make sound permanently silent for real users — and added the one line back into `activity()`. Flagging this explicitly in case the SDD intends `resume()` to move elsewhere.
2. **`tsconfig.json` lib addition (`"DOM.Iterable"`)**. The brief's `panel.ts` uses `for (const b of root.querySelectorAll(...))`, which doesn't compile against `lib: ["ES2022", "DOM"]` (no `Symbol.iterator` on `NodeListOf` without `DOM.Iterable`). This is a one-line, narrowly-scoped addition (adds iterator support for DOM collections only) required to make the brief's own verbatim code typecheck; no other file in the repo relies on it.
3. **Container-type relocation to `body`** ties the responsive layout to the standalone page's DOM (where `App`'s root is mounted directly under `body`, per `standalone/index.html`). If `App` is ever embedded somewhere `body` isn't the nearest useful ancestor (e.g., nested inside another app's layout), the container queries would need `container-type` moved to whatever wraps `.pk-root` there. Not a concern for the current standalone-only usage, but worth knowing if Task 14+ changes the mounting story.
4. Buy-in overlay and phone-strip-no-ghosting were verified via ad hoc Playwright scripts I wrote and then deleted (not part of the three required screenshots); I did not keep those artifacts, per the "throwaway script" instruction, but the debugging trace (rects, computed styles) is summarized above for traceability.

## Fix round 2 (desktop tab truncation, phone letterbox)

Commit subject: "fix: stack desktop tabs, size phone board row to aspect". CSS-only; `src/panel/panel.css` is the only source file touched (no changes under `src/render/themes`, `src/render/cels`, or `assets/`).

### What changed

1. **Desktop tabs stacked.** In the `@container (min-width: 1024px)` block, added `.pk-tabs { flex-direction: column; } .pk-tabs button { height: 24px; }` — the same rule the tablet block already uses. Each tab now spans the full 130px inner panel width, so "RAIJIN", "BIG WAVE", "HANA FAN" render in full (measured `scrollWidth 130 == clientWidth 130` on all three, i.e. no ellipsis). Panel column stays `150px`; board column is still `1290px` at 1440 wide.
2. **Phone board row sized to aspect.** In the `@container (max-width: 767.98px)` block:
   - `.pk-shell` rows `56px 1fr auto auto 96px` → `56px auto auto auto 1fr` (board row now `auto`, dial row takes the leftover).
   - `.pk-board { aspect-ratio: 5 / 6; width: 100%; }` so the board is exactly as tall as it is wide (390 → 468, 360 → 432). `fit()` in `app.ts` measures `.pk-board`, so the canvas fills it with no further change (canvas rect == board rect at both widths).
   - `.pk-dial` `height: 88px` → `height: auto; min-height: 96px;` so it stretches into the `1fr` dial row (244px tall at 390×844, 176px at 360×740). The bar arc stays anchored 8px from the bottom and the "HOLD TO SHOOT" hint 12px from the top, as before.

### Commands and output

```
$ npx tsc --noEmit
(clean, no output)

$ npx vitest run
 Test Files  11 passed (11)
      Tests  79 passed (79)
   Duration  9.67s
```

Screenshots re-captured with a throwaway Playwright script (`.superpowers/sdd/2026-09-11-pachinko/shot13-round2.mjs`, not committed) against the already-running dev server on :5173 (curl returned 200). Recipe per the brief: `/?seed=1`, wait 800ms, hold the board 1.5s, release, wait 300ms, screenshot. The script also dumped `scrollWidth`/`scrollHeight`, the `.pk-board`/`.pk-canvas`/`.pk-dial` rects, and each tab button's `scrollWidth`/`clientWidth`:

```
desktop  scrollWidth 1440  board 1290×878 @y22  canvas 731.7×878  dial 126×126  tabs RAIJIN/BIG WAVE/HANA FAN scrollW 130 clientW 130
tablet   scrollWidth 820   board 820×1018       canvas 820×984    dial 90×90    tabs scrollW 108 clientW 108
phone    scrollWidth 390   board 390×468 @y56   canvas 390×468    dial 374×244  tabs scrollW 119 clientW 119
phone360 scrollWidth 360   board 360×432 @y56   canvas 360×432    dial 344×176  tabs scrollW 109 clientW 109
```

`scrollWidth` equals the viewport width at every size (no horizontal overflow); `scrollHeight` equals the viewport height too, so nothing overflows vertically either at 390×844 or 360×740. Console errors: none on any of the four runs.

### What each screenshot shows

- **`task13-desktop.png` (1440×900):** Marquee lamps top, board left, 150px panel right. The three tab buttons are now stacked vertically at the top of the panel and read "RAIJIN" (active, amber), "BIG WAVE", "HANA FAN" in full — no ellipsis. Reels, Bank/Best, "Ready", round dial with "HOLD TO SHOOT", Sound/Reset all unchanged beneath.
- **`task13-tablet.png` (820×1180):** Unchanged from round 1 — marquee, full-width board, 140px bottom bar with stacked tabs, reels, Bank/status/Best, round dial. Confirms the desktop-only tab rule and phone-only row rule didn't leak.
- **`task13-phone.png` (390×844):** Top strip (7 7 7 / BANK 0099 / BEST 0000), then the board flush against the strip's bottom border with no blank band above or below — the board's bottom edge ("OUT +5 START +5 OUT" rail) sits directly on the "Ready" status line. Tabs row shows all three names in full. The thumb-zone dial now fills the remaining ~244px at the bottom with "HOLD TO SHOOT" at the top and the fill bar at the bottom.
- **Scratch `task13-phone360.png` (360×740, not committed):** Same structure as 390×844 — board 360×432 flush under the strip, tabs in full, dial absorbs the 176px leftover. No horizontal scroll (`scrollWidth 360`).

### Concerns

- `.pk-root` in `app.css` has `overflow: hidden`, so on a phone shorter than ~560px (strip 56 + board width×1.2 + status + tabs + dial 96) the dial row would be clipped rather than scroll. Neither of the two required sizes hits that; flagging for visibility only since app.css was out of scope this round.

## Fix round 3 (cap phone board height so the dial never clips)

Commit `42867de` — "fix: cap phone board height so the dial never clips", on worktree branch `worktree-agent-ae990c0271b913952` (worktree `/Users/swebber64/dhg/pachinko/.claude/worktrees/agent-ae990c0271b913952`, branched from `77cc614`). CSS-only: `src/panel/panel.css` is the only source file touched; `src/app.css` was not needed.

### What changed

1. **`.pk-root { container-type: inline-size }` → `container-type: size`** (base rules) so `cqh` resolves against the host container's height rather than the viewport — this keeps the cap correct when the game is embedded (Next.js) rather than filling `body`. `.pk-root` has a definite height (`height: 100%` of `#app { height: 100% }` of `html, body { height: 100% }`), so the size container does not collapse: measured `.pk-root`/`.pk-shell` rects were 1440×900, 820×1180, 390×844, 390×664, 375×667, 360×640 — the full viewport at every breakpoint. Desktop and tablet blocks only query width and rendered identically (numbers below).
2. **Phone block:** `.pk-board { grid-area: board; aspect-ratio: 5 / 6; width: 100%; justify-self: center; max-height: calc(100cqh - 56px - 30px - 38px - 110px); }`. The subtracted terms are the real row heights measured from the DOM in the Playwright run, not the brief's estimates:
   - strip `56px` (fixed row);
   - status `30px` (brief said 22: `min-height: 22px` is content-box, plus `padding: 4px` top/bottom and an 11px/1.4 line → 30);
   - tabs `38px` (brief said 42: 34px buttons + 4px bottom padding);
   - dial minimum `110px` (brief said 104: `min-height: 96px` content-box + 3px border × 2 = 102px rect, + 8px bottom margin).
   With the brief's 22/42/104 the board rendered 440px tall inside a 430px grid row at 390×664 and overlapped the status row by 10px; with 30/38/104 it still overhung by 6px (the border); with 30/38/110 the board height equals its grid row at every short viewport and the rows tile exactly (board bottom == status top).
3. `justify-self: center` keeps a height-capped board centered; `fit()` in `app.ts` (min of width/height scale against `.pk-board`'s rect) then letterboxes the canvas horizontally inside it.

Container queries worked with `size` exactly as with `inline-size` — no fallback to `min(100dvh …)` was needed.

### Commands and output

```
$ npm ci                      (ok)
$ npx tsc --noEmit            (clean, no output)
$ npx vitest run
 Test Files  11 passed (11)
      Tests  79 passed (79)
   Duration  9.36s
$ npm run dev -- --port 5181 --strictPort   (background; killed after the run, port verified free)
$ node .superpowers/scratch/shot13-round3.mjs   (throwaway, in the worktree, not committed)
```

Recipe per the brief: `/?seed=1`, wait 800ms, hold the board 1.5s, release, wait 300ms, screenshot, then `page.evaluate` rects. Final run (all four assertions — `scrollWidth <= innerWidth`, `.pk-dial` bottom ≤ innerHeight, `.pk-dial .arc` fully inside the viewport, canvas rect inside `.pk-board` rect — PASS at every viewport; console errors: none at every viewport):

```
viewport       gridRows                    board (x,y,w,h)     canvas (x,y,w,h)         dial (y,h,bottom)  arc bottom
1440×900       22px 878px                  0,22,1290,878       279.2,22,731.7,878        365,126,491        491
820×1180       22px 1018px 140px           0,22,820,1018       0,39,820,984              1069.5,90,1159.5   1159.5
390×844        56px 468px 30px 38px 252px  0,56,390,468        0,56,390,468              592,244,836        825
390×664        56px 430px 30px 38px 110px  0,56,390,430        15.8,56,358.3,430         554,102,656        645
375×667        56px 433px 30px 38px 110px  0,56,375,433        7.1,56,360.8,433          557,102,659        648
360×640        56px 406px 30px 38px 110px  0,56,360,406        10.8,56,338.3,406         530,102,632        621
```

`scrollWidth`/`scrollHeight` equal the viewport at all six sizes. Desktop and tablet rects are identical to the round-2 table (board 1290×878 @y22 / canvas 731.7×878; board 820×1018 / canvas 820×984 / dial 90×90). 390×844 is also identical to round 2 (board 390×468, canvas fills it, dial 244px) — the cap there evaluates to 844−234 = 610 > 468, so it is inert.

### What each screenshot shows

- **`task13-desktop.png` (1440×900):** byte-identical to the committed round-2 file (`cmp` reports no difference), so git recorded no change. Marquee, board left, 150px panel right with stacked RAIJIN/BIG WAVE/HANA FAN tabs, reels, Bank/Best, round dial, Sound/Reset.
- **`task13-tablet.png` (820×1180):** layout identical to round 2 — marquee, full-width board, 140px bottom bar (stacked tabs, reels, Bank/status/Best, round dial). A PIL pixel-diff against the committed file found 8,384 differing pixels all inside y 2–218 (marquee lamp chase phase and the just-launched ball at the top of the board — frame-timing noise); nothing at or below y 218 differs, so the bottom bar and board geometry are unchanged. Overwritten with the fresh capture as instructed.
- **`task13-phone.png` (390×844):** same as round 2 — strip, board flush under it with no blank bands (board 390×468 fills its row, canvas fills the board), "Ready", three full-name tabs, dial bar absorbing the leftover 252px with "HOLD TO SHOOT" on top and the fill bar at the bottom.
- **Scratch `task13-phone390x664.png` (iPhone 14 + Safari toolbar):** board capped to 430px and letterboxed — canvas 358×430 centered with ~16px of wall on each side; status, tabs and the full 102px dial with "HOLD TO SHOOT" and the amber fill bar all visible above the bottom edge (dial bottom 656, fill bar bottom 645, viewport 664). Nothing clipped.
- **Scratch `task13-phone375x667.png` (iPhone SE):** same structure — canvas 361×433 with ~7px letterbox each side, dial 102px fully visible (bottom 659 of 667), fill bar at 648.
- **Scratch `task13-phone360x640.png` (Android):** canvas 338×406 with ~11px letterbox each side, dial bottom 632 of 640, fill bar at 621. Whole dial and fill bar visible.

### Concerns

- The three subtracted phone terms (56/30/38/110) are hard-coded mirrors of the strip row, status padding+line-height, tab button height+padding, and dial min-height+border+margin. If any of those phone rules change, the calc must be updated by hand or the board will again overhang the status row by the delta (the failure mode is a visible overlap, not a crash — easy to spot in a phone screenshot).
- `container-type: size` makes `.pk-root` a size container, which means it no longer contributes intrinsic height to its parent. That is fine here because every host gives it `height: 100%` of a definite chain; a future host that expects `.pk-root` to size itself from content would collapse it. `app.css`'s `min-height: 480px` on `.pk-root` still applies, so it can never be shorter than 480px.
