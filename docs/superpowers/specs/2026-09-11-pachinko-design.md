# Pachinko — Design Spec

Date: 2026-09-11
Status: approved in brainstorming, pending written review

## 1. Goal

A polished browser pachinko game with three themed machines, playable as a
single HTML file and as a route in a Next.js app. Classic mechanics (launch
dial, pin field, catchers) plus the reach/jackpot feature. Local persistence
only. Framework-free core so both delivery targets share one codebase.

## 2. Non-goals (v1)

- Ball-to-ball collisions (physics loop is shaped so it is one added pass).
- Backend, accounts, leaderboards (storage adapter is the seam).
- Sound samples (all audio is synthesized).
- Real-money language of any kind.
- More than three machines (a machine is data; more can follow).

## 3. Architecture

```
pachinko/                      npm workspace root, the game package
  src/core/                    pure TS, no DOM, Node-testable
    rng.ts                     seeded PRNG (mulberry32 or xoshiro128**)
    board.ts                   board geometry types + per-machine layouts
    physics.ts                 fixed-step integrator, pin/wall/segment resolution
    machine.ts                 machine = layout + tuning table + theme id + sound id
    game.ts                    state machine, payouts, reach queue, jackpot
    sim.ts                     headless runner used by tests and the balance tool
  src/render/
    canvas.ts                  draws a state snapshot; theme hooks only
    cel.ts                     loads an SVG cel, rasterizes once per pixel ratio
    effects.ts                 sparks, flashes, floating text, lamp chase
    themes/                    one file per machine: palette, fonts, copy, hooks
  src/panel/                   DOM side panel / bottom bar / top strip
  src/input/dial.ts            pointer, touch, keyboard -> strength 0..1 + held
  src/audio/                   Web Audio synth, one sound set per machine
  src/storage/                 Storage interface + localStorage implementation
  src/app.ts                   wires core, render, panel, input, audio, storage
  assets/cels/                 hana-fan.svg, big-wave.svg, raijin.svg
  standalone/index.html        Vite entry; build inlines everything to one file
  tools/balance.ts             10k-ball soak + return-rate table
  tests/                       vitest (core), playwright (smoke)
apps/web/                      Next.js app, imports the game workspace package
docs/superpowers/specs/        this file
```

**Data flow per frame.** Input writes dial state → `game.tick()` runs the
fixed-step physics accumulator and state machine → renderer draws
`game.snapshot()` with interpolation → panel reads the same snapshot →
storage is written on bank change, debounced 500 ms, and on page hide.

**Determinism.** Physics runs at a fixed 120 Hz. All randomness comes from
the seeded RNG. Same seed plus same input log gives identical state. The
session seed is shown in a debug overlay with a copy link.

**Pause.** Simulation pauses when the document is hidden. The accumulator
is clamped so a long stall never spirals.

## 4. Board and physics

- Logical board 600 × 720 units. Rendered to fit its container, minimum
  320 px wide before letterboxing.
- Elements: launch rail (left, curved to the top), pins (fixed circles),
  windmills (spinners: contact deflects ball tangentially and spins the
  visual), tulips (catchers with animated wings; wings are open or closed
  and change the catch width), start chucker, win pockets, out pockets,
  floor drain, attacker (wide gate, closed unless jackpot).
- Gadget collision is implemented as solid circles (mask, flower) and
  roof-peaked rect outlines (LCD frame, reel bezels).
- Ball: radius 5.5, gravity, restitution 0.55 on pins, 0.35 on walls, mild
  air drag. Launch velocity is a function of strength plus 2 % seeded
  jitter. Max 15 balls in flight; the launcher waits if at cap.
- Physics pass order per step: integrate → resolve pins → resolve
  windmills → resolve walls and segments → check catchers and pockets →
  cull exited balls. (Ball-ball would be inserted after pins.)
- Every ball must exit the board within 30 s of sim time; the soak test
  enforces it.

## 5. Machines

A machine is a layout, a tuning table, a theme, and a sound set. The
engine is shared.

| | Hana Fan | Big Wave | Raijin |
|---|---|---|---|
| Era / style | 1976 Showa parlor | Modern Smart parlor | Bold kabuki |
| Reach odds | 1 in 12 | 1 in 8 | 1 in 16 |
| Jackpot window | 8 s or 8 balls | 10 s or 10 balls | 15 s or 15 balls |
| Attacker payout per ball | 13 | 15 | 15 |
| Win pocket payout | 5 (four tulips) | 5 (two tulips) | 5 (two tulips) |
| Start chucker payout | 3 | 3 | 3 |
| Attacker position | Center | Right (right-shoot) | Center |
| Center gadget | Spinning flower, reels below | LCD with reels | Kabuki mask, reels below |
| Fonts | Serif reels | Impact-style reels | Impact-style reels |
| Sound set | Wood and bell | Soft synth and bubbles | Taiko and thunder |

**Right-shoot (Big Wave only).** During jackpot the attacker is on the right
of the board, so balls reach it only at high strength. The panel shows a
右打ち → prompt while the jackpot is open.

## 6. Game rules

**Bank.** Starts at 100. Each shot costs 1. At 0 with no balls in flight,
the buy-in screen appears: a fictional 100-ball refill and a session counter.
No currency, no real-money wording anywhere.

**Launch.** Hold the dial: strength ramps 0 → 1 over 1.2 s. Release fires.
Holding past the ramp auto-fires every 600 ms at the held strength.
Drag up/down (or arrow keys) trims strength while held. Trimming adjusts
strength without cancelling the ramp; auto-fire begins once the hold reaches
1.2 s.

**Reach.** Start chucker hit → +3 balls, one reach is queued (max 4). If
idle, it starts: outcome decided now by RNG at the machine's odds; three
reels spin 2 s and stop left to right 400 ms apart, animated to land on the
decided outcome. If the first two match, the third slows for 1 s extra.
Miss → return to playing in 0.5 s. Match → jackpot.

**Jackpot.** Attacker opens for the machine's window (time or ball count,
whichever first). Each caught ball pays the machine's attacker payout.
Then the attacker closes and any queued reaches resume.

**Score.** Per machine, persisted: best session total won, biggest single
jackpot, and the bank. "Best" in the panel is the best session total.

**Attract mode.** After 20 s idle with no input, balls fire at random
strength, bank is not charged, and the first-run overlay is shown. Any
input ends it. Attract balls neither charge nor pay the bank.

**First run.** Three-line overlay ("Hold to shoot. Drag to aim. Land the
center pocket."), dismissed on the first shot. Never shown again after that
unless attract mode triggers.

## 7. Visual design

**Cels.** Each machine's backdrop is an SVG in `assets/cels/`, rasterized
once per pixel ratio to an offscreen canvas. Content per the approved
mockups: marquee with the model name, painted art, copy next to catchers,
maker badge. Pins are drawn by the renderer over the cel, with jeweled heads
on every Nth pin in the theme accent.

**Layout (hybrid of A and B).** Board plus a side panel, with the panel,
gutters, and a marquee lamp strip skinned by the active machine's theme.
The machine tabs are three tiny cabinet silhouettes.

| Breakpoint (container width) | Layout |
|---|---|
| < 768 px | Board full width. Top strip: reels, bank, best. Status line under board. Tab row with swipe. Full-width thumb-zone dial with a strength arc. |
| 768–1023 px portrait | Board full width. Bottom bar with tabs, reels, bank/best, status, round dial on the right. |
| ≥ 1024 px, and tablet landscape | Board at 5:6 on the left (≈80 % of width). Slim vertical panel on the right. Marquee lamp strip above the board. Gutters show a dim parlor-wall texture from the theme. |

Breakpoints are container queries, not viewport queries.

**Panel** is DOM (crisp text, accessible). Board is one canvas.

**Fonts.** Per machine display face for reels and copy, via Google Fonts
with system fallback; Noto Sans JP for Japanese copy; tabular numerals for
bank and best.

**Effects.**
- Pin hit: 80 ms jewel flash, 3-particle spark in accent color.
- Windmill: spins on contact, coasts down over 1 s.
- Tulip: wings animate over 150 ms. Win pocket flashes with floating "+5".
- Reach: chime, lamps switch from slow to fast chase; two matching reels dim
  the board 30 %, third reel ticks, panel reels enlarge.
- Jackpot: 400 ms white flash, theme jackpot copy slams in at center then
  shrinks to the attacker, attacker glows, full-speed rainbow lamp chase,
  jackpot loop; "+15" bursts per ball; close with a chord and a 2 s total.
- Particles capped at 200. Sounds capped at 12 per second.
- `prefers-reduced-motion`: no lamp chase, flashes become a border
  highlight, no particles.

**Accessibility.** Keyboard play (space holds the dial, arrows trim, 1/2/3
switch machines, M mutes). ARIA live region announces bank changes, reach
start, jackpot open and close. Theme copy passes contrast on its background.

## 8. Audio

Web Audio, fully synthesized. Per machine: pin click (pitched by speed),
windmill whir, tulip clack, pocket chime, reach chime, reel tick, jackpot
loop, jackpot close chord. Mute toggle in the panel, persisted.

## 9. Storage

```ts
interface Storage {
  load(): Promise<SaveData | null>;
  save(data: SaveData): Promise<void>;
}
// SaveData: { version, mute, perMachine: { [id]: { bank, bestSession, biggestJackpot } }, firstRunDone }
```

`localStorage` implementation in v1. Next.js mount takes the adapter as a
prop so an API-backed one can be swapped in later.

## 10. Delivery

- **Standalone:** `npm run build:standalone` → `dist/pachinko.html`, everything
  inlined, opens from a file URL.
- **Next.js:** `apps/web` route `/play` renders the game via dynamic import
  with server rendering disabled; passes the storage adapter.
- **Debug overlay:** toggled with backtick; shows fps, balls in flight,
  state, seed with copy link.

## 11. Quality bar

Stack: TypeScript, Vite, Vitest, Playwright, npm workspaces (pnpm is not installed on the Mac).

Tests that gate "done":
- Core units: physics resolution vs pins/walls/segments, windmill
  deflection, tulip open/closed catch width, pocket detection, state
  machine transitions incl. reach queue and right-shoot prompt, payout
  math per machine table, storage round trip.
- Determinism: same seed + same input log → identical state after
  10,000 steps.
- Soak: 10,000 balls per machine at strengths 0.2..1.0. Every ball exits
  within 30 s sim time; no NaN; no ball out of bounds; balls in flight
  never exceed 15.
- Balance: from the soak, return rate per machine per strength printed as
  a table; outside jackpot must land in 85–95 %. The guard takes the mean of
  two seeds per strength, requires the best of 0.4–0.8 to sit at least 1.5
  points inside the band, and caps every strength 0.2–1.0 at 100 %.
- Playwright smoke: each machine at phone/tablet/desktop, one screenshot
  each, no console errors.

Performance: 60 fps on a mid-range phone with 15 balls in flight.

Verification checklist before "finished": all tests green in one command;
standalone build plays from a file URL; Next.js route plays; screenshots at
three viewports reviewed and attached to the report; reduced-motion checked;
mute persists across reload.

## 12. Build order

Each step is its own commit and is playable at the end.

1. Core with tests: rng, board, physics, game, sim, storage. Balance tool.
2. Renderer + one machine (Raijin, the default) + dial + debug overlay.
3. Panel, responsive layout, audio, effects, first run, attract, buy-in.
4. Hana Fan and Big Wave (cels, themes, tuning, right-shoot).
5. Standalone build. Playwright smoke.
6. Next.js app and `/play` route.

## 13. Open decisions deliberately closed

- Physics: hand-rolled, not Matter.js (determinism, zero deps).
- Ball-ball contact: deferred; a nudge-apart pass may be added if the
  attacker mouth piles up.
- TypeScript over plain JS: core benefits from types and tests; the
  single file is a build output.
- Reach outcome decided at trigger time; reel animation is cosmetic.
