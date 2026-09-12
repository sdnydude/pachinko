28:Task 1: minor (deferred): rng "differs across seeds" test samples one value (theoretical flake; plan-mandated)
33:Task 3: minor (deferred): vy precision-3 assertion uses ~83% of tolerance budget; consider asserting analytic value with nudge folded in
34:Task 3: minor (deferred): windmill kick always adds downward component (plan-mandated); no spin-direction field on Windmill
37:Task 4: minor (deferred): buildLayout does not skip on reelRect explicitly; relies on skipRects containing it (tests backstop)
40:Task 5: minor (deferred): release-fire at ball cap drops the shot instead of waiting (ambiguous spec wording)
42:Task 6: minor (deferred): queueReach queues during idle (unreachable today)
47:Task 7: minor (deferred): hana-fan win halfWidth 8 and tulip closed 3 sit exactly at the visual floors
50:Task 8: minor (deferred): no tests for deep-clone isolation, null perMachine coercion, or save() error swallowing
52:Task 9: minor (deferred): embed-cels whitespace collapse is not xml:space aware (safe for current cels); loadCel caches rejected promises; "BUY IN" copy is money-adjacent (spec-approved wording)
56:Task 10: minor (deferred): tulip pedestal 16x14 and pocket heights hard-coded (decorative)
59:Task 11: controller verified in real Chrome (renders, cel + pins + catchers OK). minor (deferred): marquee kanji 雷神 renders dark (gradient fill on CJK glyphs in raijin.svg); bottom catcher row overlaps the maker badge text at y=716 in all three cels
61:Task 11: minor (deferred): App.game mutable vs readonly in interface; Dial does not revert touchAction on destroy; workspaces array reformatted by npm
63:Task 11: minor (deferred): `m in MACHINES` accepts prototype keys like "constructor"; prefer Object.hasOwn
65:Task 12: Ruling: reduced-motion gaps (pin flash still animates; lampPhase still advances) are real, fix both. Synth has no teardown from App.stop() — real, fix (dispose: stopLoop + close context). Sound cap "bypass" by jackpot loop ticks and multi-note arps — parked: the 12/s cap counts triggered sound events, a multi-note arp is one sound and the jackpot loop is one continuous sound by design — cost if wrong: dense audio during jackpot, cosmetic.
66:Task 12: minor (deferred): beep() nodes not disconnected; per-frame filter allocations; dead reachMiss branch; reduced-motion sampled only on switchMachine
68:Task 12: complete (commits 7fcbe6e..c2e0033, review clean, 1 parked)
69:DIRECTIVE (user, 02:52): "no deferrals at completion" — every deferred minor and parked finding in this ledger must be fixed in the final fix wave, not triaged away.
70:Task 13: Ruling: container-type on body violates spec (container queries must scope to the component) — fix with an inner .pk-shell wrapper; phone strip must lay out reels/bank/best in three columns; keyboard handling belongs to ONE Dial (board dial gets keyboard:false) to stop doubled arrow trim; attract must not fire while the buy-in overlay is open or phase is idle. Per user directive, this round also fixes the review minors (dead CSS/field, digit-key NaN guard, clipboard rejection, marquee reduced-motion, tab label truncation) — cost if wrong: none.
72:Task 13: must-fix (final wave or round 2): phone board row letterboxes with ~80px dark bands above/below — size the board row to the canvas aspect (5:6) and give leftover height to the dial/status; desktop tabs still truncate at 150px panel width
75:Task 14: implemented in worktree, merged --no-ff (58fe761); must-fix: raijin.svg 雷神 stroke bug (same fix as hana-fan); back-port hana-fan stroke removal to docs/superpowers/specs/cels; footer text behind pocket row on all cels
79:Task 15: minor: dial caption overlaps Sound/Reset at 1440x900 (routed to final wave); complete (commits d4c87af..77cc614, review approved)
84:Cel polish: complete (commit de31a57 merged ab71f46, review approved). minor: footer rationale comment only in hana_fan()
85:Task 16: review approved with 1 Important — fix App.stop()/start() lifecycle (stopped flag, bail after awaits, flush only if game) and revert PachinkoClient to synchronous stop; also §11 manual checklist (reduced motion) still owed
86:Task 16: minors: PlayPage/PlayInner split, next-env ignore location, lockfile resolved:"" for file: link (confirm npm ci once)
