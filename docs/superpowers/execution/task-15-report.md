# Task 15 Report: Single-file build and Playwright smoke

Status: DONE
Commit: 77cc614 — feat: single-file build and playwright smoke across machines and viewports
Branch: feature/pachinko-v1 (parent d4c87af)

## What I implemented

- Installed `vite-plugin-singlefile@^2.3.3` (devDependency). `@playwright/test` and chromium were already present from Task 11, so that part of the brief's install command was skipped.
- `standalone/vite.config.ts`: added `viteSingleFile()` plugin, `assetsInlineLimit: 100_000_000`, `cssCodeSplit: false` — verbatim from the brief.
- `package.json`: added `"postbuild:standalone": "mv dist/index.html dist/pachinko.html"` directly after `build:standalone`. npm runs it automatically as a lifecycle hook.
- `playwright.config.ts` and `e2e/smoke.spec.ts`: verbatim from the brief. `e2e` was already in tsconfig `include`, so the spec is covered by `tsc --noEmit`.

## Build output

```
../dist/index.html  68.61 kB │ gzip: 19.39 kB
> postbuild:standalone
> mv dist/index.html dist/pachinko.html
```

- `dist/` contains only `pachinko.html` (68,613 bytes — well under 1 MB); `dist/index.html` is gone.
- `grep -c '<script src=' dist/pachinko.html` → `0`.
- No `<link href=...>` externals and no non-`data:` `src=` attributes in the file.

## File-URL play check

Throwaway script (scratchpad, not committed) launched chromium headless on `file:///Users/swebber64/dhg/pachinko/dist/pachinko.html?m=raijin&seed=7` at 1440x900, waited for `.pk-canvas`, held the mouse at board center for 1.5 s.

Result: `{"before":"0100","after":"0099","errors":[]}` — bank dropped below 0100, zero console errors / page errors. Screenshot shows the Raijin desktop layout with a ball in flight and bank 0099.

## E2E output

```
Running 10 tests using 1 worker
  ✓  1 raijin at phone loads, shoots, no console errors (2.9s)
  ✓  2 raijin at tablet ... (2.6s)
  ✓  3 raijin at desktop ... (2.6s)
  ✓  4 big-wave at phone ... (2.6s)
  ✓  5 big-wave at tablet ... (2.6s)
  ✓  6 big-wave at desktop ... (2.6s)
  ✓  7 hana-fan at phone ... (2.7s)
  ✓  8 hana-fan at tablet ... (2.6s)
  ✓  9 hana-fan at desktop ... (2.6s)
  ✓ 10 mute persists across reload (935ms)
  10 passed (25.6s)
```

Playwright started its own dev server on 5199 and shut it down afterward; the pre-existing server on 5173 was left running and untouched.

## Screenshots reviewed (test-results/)

- `raijin-desktop.png` (1440x900): LED marquee strip across the top, board on the left, slim panel on the right with machine selector (RAIJIN / BIG WAVE / HANA FAN), 7 7 7 reel readout, BANK 0099, BEST 0000, "Ready" status, round dial with "HOLD TO SHOOT", Sound / Reset buttons. Matches desktop = marquee + board left + slim panel.
- `big-wave-tablet.png` (820x1180): marquee strip, full-width board, and a bottom bar with machine tabs + Sound/Reset on the left, reels, BANK 0099 / BEST 0000, "Ready", and the dial on the right. Matches tablet = board + bottom bar.
- `hana-fan-phone.png` (390x844): top strip (reels + BANK 0099 / BEST 0000), board, "Ready" status line, three machine tabs, then a large thumb dial area labeled "HOLD TO SHOOT" with a position bar. Matches phone = strip + board + status + tabs + thumb dial.

All three show bank at 0099 after the hold, consistent with the assertion.

## Other verification

- `npx tsc --noEmit` → exit 0, no output.
- `npx vitest run` → 11 files, 79/79 passed.

## Files changed

- `standalone/vite.config.ts` (modified, +3/-1)
- `package.json` (modified, +2)
- `package-lock.json` (modified, +99: vite-plugin-singlefile plus micromatch/braces/fill-range/is-number/to-regex-range/picomatch)
- `playwright.config.ts` (new, 7 lines)
- `e2e/smoke.spec.ts` (new, 32 lines)

Not committed: `dist/`, `test-results/` (both git-ignored), scratchpad file-URL script.

## Self-review

Read the full diff before committing. Every changed line traces to the brief: the two config files and the spec are character-for-character the brief's code; package.json gains exactly the postbuild script and the one devDependency. No src/panel, src/app.ts, or theme files were touched. Commit message trailers are the two required lines.

## Concerns

- None blocking. One observation: a 1.5 s hold launches only one ball at every machine/viewport (bank 0100 → 0099 in all runs, both dev server and file URL). The assertion `< 100` still passes, but it has no margin — if launch cadence or an initial charge delay ever grows slightly, this test would flake. Not changing it; the brief specifies the assertion as written.
- `npm i` printed `allow-scripts` warnings for esbuild/fsevents postinstall scripts (pre-existing npm policy on this machine, unrelated to this task; the build works regardless).
