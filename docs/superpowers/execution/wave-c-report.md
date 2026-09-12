# Wave C report — Next.js app, package surface, docs

Worktree: `/Users/swebber64/dhg/pachinko/.claude/worktrees/agent-a2b76f02e5de946e4`
Branch: `worktree-agent-a2b76f02e5de946e4` (from 441db39 on feature/pachinko-v1)
Commit: `695f9e8` — fix(app): storage prop on /play, package index, README, spec amendments

## Per item

**C1 — storage adapter as a prop.** New `src/index.ts` re-exports `App`, `AppOptions`, `MachineId`, `MACHINE_ORDER`, `MACHINES`, `Storage`, `SaveData`, `EMPTY_SAVE`, `LocalStorage`, `MemoryStorage`. Root `package.json` `exports["."]` now points at `./src/index.ts`; `./app.css` and `./storage/local` kept. `apps/web/app/play/PachinkoClient.tsx` takes `{ machine?, seed?, storage? }`, defaults to `new LocalStorage()`, imports everything from `'pachinko'`. `PlayClientGate.tsx` forwards `machine` and `seed` (a class instance can't cross the server→client boundary, so the storage default lives in the client component; a caller composing `PachinkoClient` directly can pass its own adapter). `src/app.ts` untouched.

**C2 — page.tsx collapsed.** Single `export default async function PlayPage({ searchParams })`; machine validated with `MACHINE_ORDER.includes(m as MachineId)`; `?seed=` parsed with `Number`, passed only when finite (`>>> 0` to match standalone/main.ts).

**C3 — standalone/main.ts.** `m in MACHINES` → `Object.hasOwn(MACHINES, m)`.

**C4 — README.md.** 83 lines: what it is, quick start, delivery targets, URL params, keyboard map, scripts (with the `npm run cels` re-run note and gen_cels.py provenance), layout tree, `postbuild:standalone` uses `mv` note. Two lines were corrected against the code after a first draft: e2e runs against the Vite dev server on :5199 (playwright.config.ts), and `balance` prints a return-rate table.

**C5 — spec/plan amendments.** Spec §4: new bullet on gadget collision (solid circles for mask/flower, roof-peaked rect outlines for LCD frame/reel bezels). §6 Launch: "Trimming adjusts strength without cancelling the ramp; auto-fire begins once the hold reaches 1.2 s." §6 Attract: "Attract balls neither charge nor pay the bank." Plan: "Amendments" section appended listing the three rulings dated 2026-09-12.

**C6 — screenshot re-captured.** `docs/superpowers/screenshots/task16-nextjs.png` (1440×900) from `/play?m=big-wave` on the Next dev server (port 3002; 3000 held by Docker). Throwaway Playwright script: goto, wait for canvas, mouse down at canvas centre, hold 1.5 s, release, wait 300 ms, screenshot. Console errors captured: `[]`. Dev server stopped afterwards.

## Commands and output

- `npm ci` — ok (allow-scripts warnings only).
- `npx tsc --noEmit` — exit 0.
- `npx vitest run` — 11 files, 79 tests passed (9.4 s).
- `npm run build -w web` — compiled; routes `/`, `/_not-found` static, `/play` dynamic; exit 0.
- `npm run build:standalone` — `dist/pachinko.html` 68.55 kB (gzip 19.40 kB); exit 0.
- e2e not run (agent B owns it).

## Screenshot

Big Wave cel at 1440×900: gold marquee "大海 BIG WAVE ∞", SUPER REACH LCD showing 7 7 7 with the KAKUHEN strip, start tulip under the LCD tagged only with a small "S", the "DHG AMUSEMENT · SMART PACHINKO" footer sits above the OUT / +5 / START / +5 / OUT pocket row, ATTACKER bar at lower right, one ball in flight, bank 0099 (the hold/release fired), panel on the right with the three machine buttons, reels, BANK/BEST, dial and Sound/Reset. No stray START label under the tulip. No console errors.

## Concerns

- The §4 gadget-collision sentence describes agent A's implementation; I recorded the ruling as given and did not verify it against `src/core` (today's layouts only carry `skipRects`).
- `PlayClientGate` cannot accept a `Storage` instance from the server page (non-serialisable across the RSC boundary). The prop exists on `PachinkoClient`; a future API-backed adapter would be constructed in a client component that renders `PachinkoClient`.
- The worktree isolation guard refused a write to the main-checkout `.superpowers/` path, so this report lives at the same relative path inside the worktree (gitignored). Copy it across if the main-checkout location is required.
- The Playwright capture script imports playwright by absolute path from the worktree's `node_modules`; throwaway, not committed.
