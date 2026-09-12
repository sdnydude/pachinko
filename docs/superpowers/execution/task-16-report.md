# Task 16 Report: Next.js app with /play

Status: DONE
Commit: 0994c88 — feat: next.js app with /play route mounting the game
Branch: feature/pachinko-v1 (parent 77cc614)

## What I implemented

- Root `package.json`: added `exports` for `.` (src/app.ts), `./storage/local`, `./app.css`. Dropped the brief's `./panel.css` export: `src/app.ts` already imports `./panel/panel.css` itself, so the Next client only needs `pachinko/app.css` (the parent explicitly allowed this).
- `src/app.ts`: added `export type { MachineId } from './core/machine';` (placed after the import block).
- `apps/web/`: `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `app/play/page.tsx`, `app/play/PachinkoClient.tsx`, `app/play/PlayClientGate.tsx`, plus a one-line `.gitignore` (`next-env.d.ts`, which Next regenerates on every dev/build).
- Installed next 16.3.5, react 19.3.0, react-dom 19.3.0 via the brief's `^16.0.0` / `^19.0.0` ranges; no resolution errors.

## Deviations from the brief (each forced by observed behavior)

1. **`"pachinko": "*"` resolved to an unrelated registry package.** npm workspaces link *members* (apps/*), not the workspace root, so `npm install` fetched `pachinko` from the npm registry (an index.js/test.js package, not this repo). Changed to `"pachinko": "file:../.."`; `node_modules/pachinko` is now a symlink to the repo root, `npm ls pachinko` shows `web -> ./apps/web -> pachinko@0.1.0 -> ./`, and `npm ci --dry-run` is clean.
2. **`ssr: false` fallback applied.** Next 16.3.5 rejects `dynamic(..., { ssr: false })` in a Server Component (`Error: ssr: false is not allowed with next/dynamic in Server Components`, /play returned 500). Added `PlayClientGate.tsx` (`'use client'`, holds the `dynamic()` call) exactly as the brief's fallback describes; `page.tsx` imports it instead of `next/dynamic`.
3. **StrictMode teardown fix in `PachinkoClient.tsx`.** With the verbatim `return () => app.stop()`, React 19 StrictMode's dev double-invoke calls `stop()` synchronously before `start()` has resolved its first `await storage.load()`. `stop()` -> `flushSave()` -> `persistGame()` -> `this.game.save()` threw `TypeError: Cannot read properties of undefined (reading 'save')` (browser console, surfaced via Next's dev overlay) and the first `App` instance would then finish `start()` on a detached DOM and keep its rAF loop and window listeners alive. Fix is confined to the client component: `const started = app.start(); return () => { void started.then(() => app.stop()); };`. `src/app.ts` was not changed beyond the type export. In production (no double-invoke) the behavior is identical to the verbatim code.
4. **`agentRules: false` in `next.config.ts`.** Next 16 generates `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` on first dev run; a nested CLAUDE.md would alter Claude sessions in this repo, so I disabled it and removed the generated files.
5. **`tsconfig.json` committed as rewritten by Next** (adds allowJs, esModuleInterop, resolveJsonModule, isolatedModules, `jsx: react-jsx`, `.next/types` includes). Next rewrites it on every run, so committing the brief's version would just produce a dirty tree on the next `next dev`.
6. **Port.** `localhost:3000` is held by Docker (`com.docker`, LISTEN on *:3000), so the dev server ran on `-p 3016` and the production check on `-p 3017`. No code depends on the port.

## Visual verification

Throwaway script `.superpowers/sdd/2026-09-11-pachinko/shot16.mjs` (not committed): chromium 1440x900, `GET /play` on the dev server, wait for `.pk-canvas`, hold mouse on board center 1.5 s, click `.pk-tabs button[data-id=big-wave]`, wait 500 ms, screenshot to `docs/superpowers/screenshots/task16-nextjs.png`. Output:

```
buttons: ["RAIJIN","BIG WAVE","HANA FAN","Sound","Reset",""]
data-machine: big-wave
title: DHG Parlor
No console errors.
```

Screenshot (reviewed): pink/teal LED marquee strip across the top; the Big Wave board centered — deep-blue ocean gradient with wave lines, gold "大海 BIG WAVE ∞" header plaque, gold rail on the left, the "SUPER REACH / リーチ!! REACH / 7 7 7 / 確変 KAKUHEN 1/8" gold-framed display, orange fish and cyan pinwheel cels, "5" tulip pockets, "大当り ATTACKER" strip, START / OUT / +5 pockets at the bottom, "DHG AMUSEMENT SMART PACHINKO" footer text; right-hand panel with RAIJIN / BIG WAVE (selected, gold) / HANA FAN tabs, 7 7 7 reels, BANK 0100, BEST 0000, "Ready", the round dial with HOLD TO SHOOT, Sound / Reset. Next's dev indicator badge is bottom-left. Bank reads 0100 because the hold was on Raijin before the tab switch; Big Wave starts fresh.

Production-build routing check (`next start -p 3017`, script `shot16b.mjs`, not committed): `?m=hana-fan -> hana-fan`, `?m=bogus -> raijin`, no param `-> raijin`; home page link text "Play pachinko →"; no console errors. Both servers were stopped afterward (verified via lsof).

## Full verification pass

`npm run typecheck && npm test && npm run build:standalone && npm run e2e && npm run build -w web` — exit 0. Full log: `.superpowers/sdd/2026-09-11-pachinko/task16-verify.log`.

```
> tsc --noEmit                              (no output, exit 0)

> vitest run
 Test Files  11 passed (11)
      Tests  79 passed (79)

> vite build --config standalone/vite.config.ts
../dist/index.html  68.61 kB │ gzip: 19.39 kB
✓ built in 109ms
> mv dist/index.html dist/pachinko.html

> playwright test
Running 10 tests using 1 worker
  ✓ 1–9 {raijin,big-wave,hana-fan} at {phone,tablet,desktop} loads, shoots, no console errors
  ✓ 10 mute persists across reload (933ms)
  10 passed (25.5s)

> next build
▲ Next.js 16.3.5 (Turbopack)
✓ Compiled successfully
  Finished TypeScript in 610ms ...
✓ Generating static pages using 5 workers (4/4)
Route (app)
┌ ○ /
├ ○ /_not-found
└ ƒ /play
```

The pre-existing 5173 dev server was left running; Playwright used its own 5199 server.

Manual checklist from spec §11 (standalone file-URL play, three-viewport screenshots, reduced-motion, mute persistence) was not re-run in this task beyond the e2e coverage above and the Task 15 file-URL check; nothing in this task touches those code paths.

## Files changed (commit 0994c88)

- `apps/web/.gitignore`, `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`
- `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- `apps/web/app/play/page.tsx`, `apps/web/app/play/PlayClientGate.tsx`, `apps/web/app/play/PachinkoClient.tsx`
- `docs/superpowers/screenshots/task16-nextjs.png`
- `package.json` (exports), `package-lock.json` (+1084/-77, next/react tree + workspace link)
- `src/app.ts` (+2: MachineId re-export)

Not committed: `.next/`, `node_modules/`, `dist/`, `apps/web/next-env.d.ts`, throwaway scripts and logs under `.superpowers/`. `.claude/` (other agents' worktrees) was untracked before I started and left alone. `src/panel/panel.css` and cel assets untouched.

## Self-review

Read the full diff. Every changed line traces to the brief or to one of the six deviations above. The `started.then(() => app.stop())` form means that if `start()` ever rejected, `stop()` would not run — `LocalStorage.load()` swallows its own errors, so the only rejection path is a renderer failure, in which case there is nothing running to stop. `.then` without a rejection handler leaves such a rejection unhandled, same as the verbatim `void app.start()` would.

## Concerns

- `reactStrictMode: true` plus the async `start()`/sync `stop()` shape in `App` is inherently fragile; a follow-up making `App.stop()` safe to call before `start()` resolves (guard `persistGame` on `this.game`) would let the client component go back to the plain `return () => app.stop()`. Out of scope here since `src/app.ts` edits were limited to the type export.
- `npm install` reports 2 moderate audit vulnerabilities in the new dependency tree (not investigated; pre-existing count was not recorded).
- Docker holds port 3000; `npm run dev -w web` will auto-fall-back or need `-p` on this machine.
