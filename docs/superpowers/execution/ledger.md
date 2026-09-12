# SDD ledger — plan: docs/superpowers/plans/2026-09-11-pachinko.md
Spec: docs/superpowers/specs/2026-09-11-pachinko-design.md (read; binding authority)
Branch: feature/pachinko-v1 (in-place branch, no worktree)
Ruling: implement on an in-place feature branch instead of a separate worktree — repo is brand new, only spec/plan committed, user's cwd is the project dir and a worktree would move the game files elsewhere — cost if wrong: none beyond a `git worktree add` later.

## Pre-flight scan
| Pair / task | Produces vs consumes | Finding |
|---|---|---|
| T2 board ↔ T3 physics | Layout/Pin/Catcher/Ball fields; catcherHit(b,c,hw) | consistent |
| T2 tulipPins ↔ T6 tests | wing pins at x±18,y-14; T6 drops balls at mouth±12 — clear of wings (checked distances) | consistent after plan fix |
| T3 physics ↔ T5 game | stepBall(b,layout,dt,out), ContactEvent union, exited | consistent |
| T4 layouts ↔ T6 tests | ids tulip-l/tulip-r/start/e-chucker, attacker y=610 hw 70, start x=320 | consistent |
| T4 tuning ↔ spec §5 | 12/8/16, 8s8/10s10/15s15, 13/15/15 | matches spec |
| T5 ↔ T6 game.ts | stubs tryCatch/stepPhase replaced; names used by tests exist (REEL_STOP, REEL_TENSION, MISS_HOLD, REACH_QUEUE_MAX, DT_STEPS) | consistent |
| T5 ↔ T7 sim | stateHash reads snapshot; runSoak uses fireAt(free) + default bank | consistent |
| T8 storage ↔ T11 app | SaveData/EMPTY_SAVE/Storage; App.setSaveField | consistent |
| T9 themes ↔ T10/T12/T13 | Theme.palette keys used by renderer/effects/panel all exist (accent, accent2, jewel, lamps, panelBg/Fg/Accent, wall...) | consistent |
| T9 cels ↔ T14 | embedded cel modules via tools/embed-cels.mjs; svgDataUrl | consistent |
| T10 renderer ↔ T12 effects | EffectsLike.draw(ctx,t) | consistent |
| T11 app ↔ T13 panel | Panel created before switchMachine; Dial on panel.dialEl and boardEl; app.css replaced | consistent after plan fix |
| T13 ↔ T15 e2e | selectors .pk-canvas, [data-f=bank], [data-a=mute] aria-pressed | consistent |
| T16 next ↔ root exports | "." → src/app.ts exports App + type MachineId; css subpaths | consistent |
| Global: no money words | copy checked in theme test (coin/credit/cash/$) | ok |
| Rubric check | no assert-nothing tests; no verbatim duplicated logic blocks mandated | ok |
Scan clean; no rulings needed beyond the branch ruling above.

## Task log
Task 1: minor (deferred): rng "differs across seeds" test samples one value (theoretical flake; plan-mandated)
Task 1: complete (commits 7f6e54b..61a168e, review clean; trailers verified by controller)
Task 2: complete (commits 61a168e..ef43ce4, review clean)
Task 3: Ruling: resolveCircle test asserted a perfectly vertical contact to 5 decimals, but the plan-mandated 0.01 nudge tilts the normal — loosen the two toBeCloseTo precisions to 3 (test defect, physics correct) — cost if wrong: a 1e-3 tolerance could hide a real integration error, unlikely at this scale.
Task 3: fix round 1/5 (1 addressed, 0 open — failing resolveCircle precision; commits 971a7fc..6e694ea)
Task 3: minor (deferred): vy precision-3 assertion uses ~83% of tolerance budget; consider asserting analytic value with nudge folded in
Task 3: minor (deferred): windmill kick always adds downward component (plan-mandated); no spin-direction field on Windmill
Task 3: note: implementer applied drag before gravity (differs from brief sample order) — required by the brief's own gravity test; accepted
Task 3: complete (commits ef43ce4..6e694ea, review clean)
Task 4: minor (deferred): buildLayout does not skip on reelRect explicitly; relies on skipRects containing it (tests backstop)
Task 4: complete (commits 6e694ea..13a8ccd, review clean)
Task 5: Ruling: snapshot() aliases live arrays/objects (reviewer Important, plan-mandated) — keep as a same-frame read view; no planned consumer holds a snapshot across steps and per-frame copies buy nothing — cost if wrong: a future replay/memoization consumer sees mutation; fix is shallow copies in snapshot(). Deferred to final review.
Task 5: minor (deferred): release-fire at ball cap drops the shot instead of waiting (ambiguous spec wording)
Task 5: complete (commits 13a8ccd..e7e1e45, review clean with 1 ruled finding)
Task 6: minor (deferred): queueReach queues during idle (unreachable today)
Task 6: complete (commits e7e1e45..54e8ce6, review clean)
Task 7: Ruling: plan restricted balance tuning to three GLOBAL knobs; implementer proved no global combination balances all three machines (hana-fan 4 tulips vs raijin 2). Per spec §5 "a machine is a layout + tuning table", win-pocket halfWidth and tulip mouth widths become per-machine layout parameters (bottomRow/tulip helpers take optional widths), with visual floors win halfWidth >= 8, tulip open >= 8, closed >= 3; if still short, per-machine extra pin rows in the bottom funnel are allowed. Spec-fixed counts/payouts/attacker positions unchanged. — cost if wrong: machines feel different in catcher size (intended) and the renderer draws narrower pockets on some machines.
Task 7: accepted: tulip skip radius 30->36 (four wedge gaps < ball diameter) and soak guard buffer +60->+200 s (15-ball cap throttles high-strength firing).
Task 7: fix round 1/5 (BLOCKED -> unblocked by ruling; 1 addressed, 0 open; commit f2f7462)
Task 7: minor (deferred): hana-fan win halfWidth 8 and tulip closed 3 sit exactly at the visual floors
Task 7: complete (commits 54e8ce6..f2f7462, review clean)
Task 8: Ruling: reviewer Important "default globalThis.localStorage fails in Node" — not a defect: both load() and save() wrap backend calls in try/catch, so an undefined backend degrades to null/no-op, the intended behavior; no fix — cost if wrong: none observable (Node callers always inject).
Task 8: minor (deferred): no tests for deep-clone isolation, null perMachine coercion, or save() error swallowing
Task 8: complete (commits f2f7462..ebd462e, review clean with 1 ruled finding)
Task 9: minor (deferred): embed-cels whitespace collapse is not xml:space aware (safe for current cels); loadCel caches rejected promises; "BUY IN" copy is money-adjacent (spec-approved wording)
Task 9: note: controller amended the commit trailer model name only (no content change)
Task 9: complete (commits ebd462e..3568bde, review clean)
Task 10: Ruling: two plan-mandated Important findings accepted as real — (1) windmill angle accumulates per frame (assumes 60 fps): fix by integrating spin against snapshot.time delta; (2) jewel selector `i % jewelEvery === 2` renders zero jewels for jewelEvery <= 2: fix to `=== 0` — cost if wrong: none; both are strictly more correct.
Task 10: minor (deferred): tulip pedestal 16x14 and pocket heights hard-coded (decorative)
Task 10: fix round 1/5 (2 addressed, 0 open — windmill dt, jewel phase; commits c2aba7c..504e15b)
Task 10: complete (commits 3568bde..504e15b, review clean)
Task 11: controller verified in real Chrome (renders, cel + pins + catchers OK). minor (deferred): marquee kanji 雷神 renders dark (gradient fill on CJK glyphs in raijin.svg); bottom catcher row overlaps the maker badge text at y=716 in all three cels
Task 11: Ruling: plan-mandated Important findings accepted — store and disconnect the ResizeObserver in stop(); validate ?m= against MACHINES and ?seed= against NaN in standalone/main.ts — cost if wrong: none.
Task 11: minor (deferred): App.game mutable vs readonly in interface; Dial does not revert touchAction on destroy; workspaces array reformatted by npm
Task 11: fix round 1/5 (2 addressed, 0 open — ResizeObserver, URL params; commits c1a235d..7fcbe6e)
Task 11: minor (deferred): `m in MACHINES` accepts prototype keys like "constructor"; prefer Object.hasOwn
Task 11: complete (commits 504e15b..7fcbe6e, review clean)
Task 12: Ruling: reduced-motion gaps (pin flash still animates; lampPhase still advances) are real, fix both. Synth has no teardown from App.stop() — real, fix (dispose: stopLoop + close context). Sound cap "bypass" by jackpot loop ticks and multi-note arps — parked: the 12/s cap counts triggered sound events, a multi-note arp is one sound and the jackpot loop is one continuous sound by design — cost if wrong: dense audio during jackpot, cosmetic.
Task 12: minor (deferred): beep() nodes not disconnected; per-frame filter allocations; dead reachMiss branch; reduced-motion sampled only on switchMachine
Task 12: fix round 1/5 (3 addressed, 0 open — reduced-motion flash, lamp gating, synth dispose; commits bfccd3f..c2e0033)
Task 12: complete (commits 7fcbe6e..c2e0033, review clean, 1 parked)
DIRECTIVE (user, 02:52): "no deferrals at completion" — every deferred minor and parked finding in this ledger must be fixed in the final fix wave, not triaged away.
Task 13: Ruling: container-type on body violates spec (container queries must scope to the component) — fix with an inner .pk-shell wrapper; phone strip must lay out reels/bank/best in three columns; keyboard handling belongs to ONE Dial (board dial gets keyboard:false) to stop doubled arrow trim; attract must not fire while the buy-in overlay is open or phase is idle. Per user directive, this round also fixes the review minors (dead CSS/field, digit-key NaN guard, clipboard rejection, marquee reduced-motion, tab label truncation) — cost if wrong: none.
DIRECTIVE (user, 03:04): dispatch all subagents on fable unless sonnet/haiku is better; in-flight Task 13 fix round (sonnet) allowed to finish.
Task 13: must-fix (final wave or round 2): phone board row letterboxes with ~80px dark bands above/below — size the board row to the canvas aspect (5:6) and give leftover height to the dial/status; desktop tabs still truncate at 150px panel width
Task 13: fix round 1/5 (8 addressed, 1 open — desktop tab truncation; commits 6076258..86a0625)
Task 13: fix round 2/5 (commit 4112857; awaiting re-review)
Task 14: implemented in worktree, merged --no-ff (58fe761); must-fix: raijin.svg 雷神 stroke bug (same fix as hana-fan); back-port hana-fan stroke removal to docs/superpowers/specs/cels; footer text behind pocket row on all cels
Task 13: fix round 2/5 (2 addressed, 1 new Important — aspect-locked board clips the phone dial below ~700px viewport height; commits 86a0625..4112857)
Task 13: Ruling: phone clipping is real (iPhone Safari with toolbar is the common case) — round 3 caps the board height so fit() letterboxes instead of overflowing.
Task 14: complete (commits 86a0625..58fe761 merged d4c87af, review approved; follow-ups → cel-polish fix: raijin 雷神 stroke, back-port hana-fan stroke removal to spec cels + gen_cels.py, Big Wave START label under e-chucker, footer text behind pocket row on all cels, Hana Fan rail over subtitle)
Task 15: minor: dial caption overlaps Sound/Reset at 1440x900 (routed to final wave); complete (commits d4c87af..77cc614, review approved)
Task 13: fix round 3/5 (commit 42867de in worktree, merged; awaiting re-review)
Cel polish: commit de31a57 merged; awaiting review
Task 16: commit 0994c88; awaiting review. Implementer notes: pachinko dep changed to file:../.., PlayClientGate fallback used, StrictMode stop-before-start guarded in component (App.stop() guard is a follow-up), agentRules:false
Task 13: fix round 3/5 (1 addressed; residual: status row of 3+ lines re-clips the dial on short phones — subtract 70px not 30px)
Cel polish: complete (commit de31a57 merged ab71f46, review approved). minor: footer rationale comment only in hana_fan()
Task 16: review approved with 1 Important — fix App.stop()/start() lifecycle (stopped flag, bail after awaits, flush only if game) and revert PachinkoClient to synchronous stop; also §11 manual checklist (reduced motion) still owed
Task 16: minors: PlayPage/PlayInner split, next-env ignore location, lockfile resolved:"" for file: link (confirm npm ci once)
Task 13: fix round 4/5 + Task 16 fix round 1 (commit 441db39; awaiting scoped re-review)
Task 13/16: fix round (441db39) re-review clean. All 16 tasks complete.
FINAL REVIEW (7f6e54b..441db39): not ready — C1 Reset no-op, C2 attract mints bank, I1 touch-jitter trim kills ramp, I2 Next mount hardcodes storage, I3 no README, I4 dial caption overlap, I5 stale task16 screenshot, I6 key handlers ignore modifiers/hijack Space; M1–M12; spec gaps: segment collision dropped by plan, trim/ramp ambiguity, attract payouts unspecified; M11 spec visuals not implemented (tulip wing anim, reel enlarge, tension ticks, swipe tabs, silhouette tabs, wall texture).
Ruling: attract balls neither charge nor pay the bank (spec §6 amended) — cost if wrong: attract looks less rewarding; correct per intent.
Ruling: trim never cancels the ramp; auto-fire begins only after RAMP_SECONDS; pointer dead-zone 8px (spec §6 clarified) — cost if wrong: trimmed holds fire ~1s later than before.
Ruling: implement spec §4 segment/solid collision for gadgets (solid circles for mask/flower, roof-peaked rect outlines for LCD frame and reel bezels), then re-tune per-machine balance within the Task 7 floors — cost if wrong: balance shifts; gated by the 85–95% test.
Ruling: per user directive, implement all M11 spec visuals rather than rule them out; ignore machine switch during jackpot (M8).
Deferred-items triage: FIX items 4,5,8,13,15(dead branch, reduced-motion listener),21,23(manual reduced-motion check),24(M2); all CLOSE verdicts accepted with the reviewer's reasons.
Final fix wave: three parallel worktree agents (A core, B UI, C Next/docs), then merge, then one scoped re-review.
Fix wave merged: A fdb22e4 (core: free balls no payout, ramp-safe trim, cap wait, gadget solids, retune; 95 tests), B 3755a85 (UI: reset, key modifiers, jackpot switch guard, M11 visuals, live reduced motion; e2e 11), C 695f9e8 (storage prop, package index, README, spec amendments). Merged 1f956ea/633f5cd/94c1ff9. Open: A concern — big-wave e-chucker sits inside the closed gold-frame solid and is unreachable (0 soak catches); roof peaks invisible (draw solids); hana-fan guard at 94% thin.
Warp follow-up: d0c6d5d — e-chucker reachable (1-2.4%), solids drawn, 97 tests, e2e 11. Concern: chimney sends mid-strength roof traffic left so Big Wave right half is quiet at 0.4-0.9 (attacker at 1.0 still works).
Fix wave re-review (441db39..d0c6d5d): all C/I/M and triage FIX items addressed except I5 (task16 screenshot predates wave B) and one new Important (requestSwitch lacks a same-machine guard; Space on a focused tab re-creates the game). Minors: Big Wave right half quiet at 0.2-0.9 (tulip-r ~0%), free-ball catches still show +N floats/chimes, page.tsx imports the whole package for MACHINE_ORDER, README arrow wording.
Ruling: one residual fix dispatch for all of the above (user: no deferrals). Big Wave right-side traffic: bounded attempt; if the balance guard cannot be kept, record the numbers as a ruled limitation.
Residual fix a4adf14: same-machine guard (+e2e), silent free-ball catches, pachinko/core export, task16 screenshot from head, README, Big Wave right side (tulip-r 9-10% at 0.7-0.8). Controller verified: tsc, vitest 98/98, e2e 12/12, standalone 73.8 kB. Final review + one fix wave + residuals complete. DONE.
DIRECTIVE (user, 12:05): "do all" — every closed-by-argument item, numeric weakness, and unverified check from the honest list gets a real fix or a measured result. Two parallel worktree agents (D core, E UI/audio/tests), then controller runs clean-clone npm ci, reduced-motion, and Chrome checks, then scoped re-review.
Controller checks (12:1x): clean clone npm ci OK (root link, tsc, 98 tests, both builds); reduced motion emulated: effects.reduced=true, 0 particles over 2 s, lamps static; live jackpot on big-wave: status shows FEVER/timer/right-shoot/queued (4 lines), tabs aria-disabled, phone 390x664 arc bottom 645 <= 664, no console errors.
Waves D (2c748fa) and E (2dc306e) merged: dcec85b, 40b8da8. After npm ci: tsc clean, vitest 120/120, e2e 12/12, standalone 74.9 kB, web build green. Note: first post-merge vitest run silently lacked jsdom (13th file errored) — caught and fixed by npm ci.
D+E re-review: all 20 items addressed; one new Important — per-note cap starves the jackpot loop on big-wave/hana-fan (25-36% of ticks play). Ruling: priority lane — musical sounds (loop ticks, arps, reel ticks) are always admitted and stamped; pin/windmill/tulip clicks are dropped when the window is full. Also: tulip-r regression guard at 0.9, effects test afterEach cleanup, hana-fan tulip-1 open width >= 8 (bounded).
Wave F c4d7c85: priority lane (loop ticks 100%), tulip coverage guard, afterEach hygiene, hana-fan tulip-1 open 8; 123 tests, e2e 12. Controller 8-seed measurement (2000 balls each): best-strength MEAN return hana-fan 0.4 = 92.2 (max seed 100.2), raijin 0.5 = 90.9 (max 101.6), big-wave 0.4 = 84.8 (max 93.0); single-seed >100 readings are sampling variance, seeds are not player-selectable — measured result, not an argument.
