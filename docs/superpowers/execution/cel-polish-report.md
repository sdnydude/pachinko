# Cel polish report: titles, footer, label collisions

Status: DONE (one fix beyond the brief, called out below)

Worktree: `/Users/swebber64/dhg/pachinko/.claude/worktrees/agent-ae40906d2946aa6bf`
Branch: `worktree-agent-ae40906d2946aa6bf` (started at 77cc614, one commit past d4c87af)
Commit: `de31a57 fix: cel titles without stroke, footer above pockets, label collisions`

All changes are in `docs/superpowers/specs/cels/gen_cels.py`; the spec SVGs, `assets/cels/*.svg` and `src/render/cels/*.ts` are regenerated from it. No layout or renderer files were touched (`src/core/layouts/big-wave.ts` unchanged).

## Method

Before editing I measured every `<text>` element's `getBBox()` in headless Chromium (throwaway `<worktree>/.superpowers/measure.mjs`, gitignored) so the new positions are based on rendered extents, not guesses. Relevant geometry: rail band is the 22-px stroke along `y=60` for `x<=200`, so it covers y 49..71; the renderer's pocket row is drawn at `CATCH_ROW_Y-2 .. +14` = y 698..714; the attacker bar is y 606..614 (620 when open).

Before (spec at HEAD):

```
raijin   THUNDER GOD • MAX TYPE • 1/16   x 136..504  y 59..73   <- inside the rail band
raijin   DHG LABS • 遊技機 • TYPE R       x 203..437  y 705..718 <- behind pockets
big-wave START                           x 295..345  y 356..371 <- under the e-chucker tulip (352..386)
big-wave DHG AMUSEMENT • SMART PACHINKO  x 143..497  y 704..719 <- behind pockets
hana-fan DELUXE • 13 BALLS PER WIN • 1976 x 131..509 y 54..69   <- inside the rail band
hana-fan DHG 遊技機 • NAGOYA              x 230..410  y 706..718 <- behind pockets
```

After:

```
raijin   subtitle  y 73..87    footer y 673..686
big-wave (no START label)      footer y 672..687
hana-fan subtitle  y 72..87    footer y 674..686
```

## What changed, per item

### 1. CJK title stroke

Removed `stroke="#fff3c4" stroke-width="1.5"` from the Hana Fan title and `stroke="#2a0404" stroke-width="1.5"` from the Raijin title. Big Wave's title already had none. The generator's Hana Fan output now equals the hand-edited asset that Task 14 committed (`diff` between spec and asset is empty for all three cels).

Raijin keeps `fill="url(#gold)"`. In the screenshot 雷神 renders in the same gold gradient as RAIJIN, so the flat `#d4a017` fallback was not needed.

### 2. Footer behind the pocket row

Moved the maker line on all three cels from `y=716` to `y=684`. Why 684 rather than the suggested 672: Big Wave's lowest wave line sits at y 657..670 and 672 would have run the text straight through it; 684 clears that line by 2 px and the pocket row by 11 px (glyph box 672..687, pockets start at 698). Raijin's seigaiha arcs (y 600..706) and Hana Fan's scalloped arcs (y 650..690) span the whole gap, so the text overlays them wherever it sits; both are low-opacity (0.4 / 0.3) patterns and the footer reads cleanly over them in the screenshots. The other option (y=711, font 9, renderer no longer covering it) would need a change to `src/render/canvas.ts`, which is outside the allowed file set, and would leave the footer jammed against the pocket labels.

### 3. Big Wave START label

Removed the label. The electric tulip at (320,372) is drawn by the renderer over the cel and carries its own "S" tag; neither Raijin nor Hana Fan has a printed START label near their gadgets, so removing it also makes the three cels consistent. Moving it to y~400 would have put a `#5a4310` (dark brown) label on the dark-blue background below the gold frame (frame bottom is y=378), which would have needed a colour change as well, for a label the tulip already provides.

### 4. Hana Fan subtitle vs rail

Moved the subtitle from `y=66` to `y=84`, below the rail band. Neither suggested option worked cleanly once measured: the text is 378 px wide (x 131..509) and the rail covers x<=200, so shifting it right enough to clear (centre ~395) leaves it visibly off-centre under a centred title, and shortening it enough (to <=230 px, roughly "13 BALLS • 1976") loses most of the copy. At y=84 the full text stays centred under the title; its glyph box (72..87) starts 1 px below the rail band and 23 px above the first pin row (y=110).

**Beyond the brief:** Raijin's subtitle "THUNDER GOD • MAX TYPE • 1/16" (x 136..504, y 59..73) crossed the same rail band in the same way (visible in the old task11 screenshot: "THU" over the gold rail). Same one-attribute fix, `y=70` to `y=84`. Flagging it because it is not one of the four listed items; revert that one line if you want it left for a separate pass.

## Commands and output

```
npm ci                                             -> ok
python3 docs/superpowers/specs/cels/gen_cels.py    -> wrote hana-fan.svg, big-wave.svg, raijin.svg
cp docs/superpowers/specs/cels/*.svg assets/cels/
npm run cels                                       -> embedded big-wave.svg, hana-fan.svg, raijin.svg
git status --short                                 -> exactly the 10 generated/spec files (+3 screenshots after the capture)
npx tsc --noEmit                                   -> clean
npx vitest run                                     -> Test Files 11 passed (11), Tests 79 passed (79), 9.55 s
npm run dev -- --port 5182 --strictPort            -> served; killed afterwards, `lsof -ti tcp:5182` empty
node .superpowers/shot-polish.mjs                  -> raijin / big-wave / hana-fan: console errors: [] (also no pageerror)
```

Screenshot script (`<worktree>/.superpowers/shot-polish.mjs`, gitignored): fresh context at 1440x900 per machine, `?m=<id>&seed=1`, wait 800 ms, mouse down on `.pk-board` centre for 1.5 s, up, wait 300 ms, full-page screenshot.

## What each screenshot shows

`docs/superpowers/screenshots/task11-raijin.png`: 雷神 RAIJIN entirely in the gold gradient (the kanji are no longer dark), "THUNDER GOD • MAX TYPE • 1/16" on its own line below the rail's horizontal segment, kabuki mask, 7 7 7, 激アツ REACH, 大当り JACKPOT with the attacker bar, and "DHG LABS • 遊技機 • TYPE R" in gold fully legible over the red seigaiha arcs with the OUT / +5 / START / +5 / OUT pocket row clear beneath it. One ball in flight near the top. Panel: RAIJIN tab active, gold 7 7 7 readout. (Note this replaces a board-only crop with a full 1440x900 capture, matching the two Task 14 shots.)

`docs/superpowers/screenshots/task14-big-wave.png`: 大海 BIG WAVE ∞ in gold inside the navy capsule, SUPER REACH frame and LCD with pink 7 7 7, 確変 line, and the cyan electric tulip with its "S" tag directly under the LCD with no printed START label beneath it. "大当り ATTACKER" and bar on the right. "DHG AMUSEMENT • SMART PACHINKO" in gold between the lowest wave line and the pocket row, fully legible. Ball on the rail near the marquee.

`docs/superpowers/screenshots/task14-hana-fan.png`: 花扇 HANA FAN in red, "DELUXE • 13 BALLS PER WIN • 1976" one line lower, starting to the right of and below the silver rail's end (the launched ball happens to be passing over the "1" of 1976 in this frame; that is the ball, not the cel). Flower gadget, red 7 7 7, リーチ • REACH, 大当り FEVER, and "DHG 遊技機 • NAGOYA" legible over the blue scallops above the pocket row.

## Concerns / not touched

- Big Wave: the rail's horizontal segment (x<=200, y 49..71) runs under the left end of the marquee capsule (x 140..500, y 14..56); the capsule is drawn after the rail so it sits on top, and it reads as intentional, but it is the same rail-vs-header geometry as item 4. Left alone.
- The footer on all three cels still sits in the open bottom funnel, so falling balls pass over it. That was also true at y=716.
- `raijin.svg` in `assets/` and the embed now differ from what Task 11 shipped (title stroke, subtitle, footer); nothing else consumes the cel text positions.
