# Review log

## Round 1

Reviewers: Player (P1-P10), Builder (B1-B10), Art and sound director (A1-A9). Findings in `review-round1-findings.md`.

Must-fix: P1 (tank touch stick), B1/A1/A2 (fish fins and recolour), B2 (world graph missing), B3 (maze format), B5/A8 (load size), B6 (testability).

All 29 findings fixed by the refiner. Biggest changes:
1. Fish = 2 Meshy bodies (male, female; fry = scaled male) + code-built fins/gills/beard with imagegen2 fin sheets; one body shader and one fin shader, patterns as uniforms; Rust prototype gate.
2. Full world graph: 19 named mazes with signature features, 28 tanks with depth and Z/N/M, docks, a "bubble out" machine in each home tank, Grand Tank in the Fish Room.
3. Economy sim: 47 maze runs, never more than 2 between rewards; Feeding Frenzy removes the endgame grind.
4. Single-char maze format with validator and stored paths; solve() autopilot over all 85 exit pairs; ?fast=1 end-to-end; step() at 1/60.
5. Camera-relative touch, held turn buffer, hits sting more, toasts, costs on signs; tube draw order and per-world materials; < 20 MB at boot; 12 models, 38 sfx, 120 s music; budget ~$29 of $50.

Not converged (must-fix findings this round) → round 2.

## Round 2

Reviewers: Player (P1-P8, no must-fix), Art (A1-A10; must: fin texture registration, fin stubs), Builder (B1-B10; must: signatures vs validator, bite density). Findings in `review-round2-findings.md`.

All fixed by the refiner: procedural per-style fin outlines in the shader (no fin sheets), finless bodies + code eyes, ≤ 3 draws per fish, mazes reworded and 10 enlarged (bites 59-68% of capacity), feeders fill only on pipe arrival, empty tanks give big feeders + trail styles, Frenzy = lady nests only, Become/fast travel from a maze with a confirm, panoramas round tanks, phone collection strip, lady table, 42 sfx, sweep() testing, room scales. Economy: 47 runs, max gap 2 in every case simulated.

Decision (lead): converged after round 2 (rounds limit 2; remaining items are build-time tuning). Final read against the brief's checklist: every item is present (tank 3D swim + surface bites, tube up, maze pipes, empty/lady tanks, Z/N/M, becoming fry, collection of 20, can't die, bubble machine + room + docks, three worlds).

## Final review (Phase 7)

- Playtester: no must-fix. Fixed: start spawn faces the surface bites and the tube is locked on the first visit until they're eaten; nest leaf lit + sparkles + "Nest spot" label/pip, camera frames the nest while building; clearer status wording; panel Back buttons pinned; edge pips kept out of the HUD; Copperworks bites cream/gold; Neon junction glow reduced; portraits framed wider; plural "bite(s)"; map buttons nowrap; room labels clamped.
- Bug hunter: 1 must-fix (victory skippable via Esc on the last new-fish card; also a busy-wipe race). Fixed: card dismissal always runs its action, startVictory waits for the wipe, victory re-checked on entering a tank. Also fixed: world card closing the pause menu, pause on portrait, GPU disposal of tank/room scenes (geometries steady at ~36 after a full run), type-safe save migration, Enter re-clicking focused HUD buttons, audio suspend when hidden + ducked sfx while paused, music token against double playback, on-screen mute button.

## Polish pass (Phase 8)

12 findings, all fixed or improved: static loading screen with pulsing bar, woff2 subset font (64 KB), fade from loading art to the 3D title; tank z-fighting (poster moved behind glass, floor no longer receives shadows); room label clamped by measured width; map labels shortened, nowrap; one cost wording ("Nest: 25 bites", "Need 5 more bites"); ladies get bigger fins and less-muted colours, leaf-shaped textured nest leaf, amber eggs; pips clear of HUD corners; button text colour inherits; old fish offset after Become; Grand Tank prop moved; title fish kept away from the camera; How to play copy trimmed, 2x2 on narrow screens; pipe backdrop enlarged; opaque framed minimap; copy nits (periods, "Copperworks Home" / "Neon Night Home", "Back" everywhere, balanced confirm text, clearer rotate icon).

## Change 1 review (tank playability, nest celebration, Grand Maze, school)

One combined Player/Builder reviewer, 8 findings (4 must-fix). All applied:
- Touch gestures: tap (< 200 ms, < 12 px) = waypoint, a drag = look, a still press > 200 ms = hold-and-steer; the stick zone shrank to 130 px; the latest input wins.
- Hold-steer spinning: the camera stops turning while you hold or follow a waypoint, and swings back 1.5 s after.
- Keyboard: S backs up without turning; W's pitch is relative to the resting camera pitch, so the default view swims level.
- Tube vs feeder: the feeder moved to the far side of the tank; capture is a 1.0 u cylinder under the mouth; the pull applies only below the mouth when aiming at it, tapping it, or on autopilot; one "Back to the pipes" action plus the tappable "To the pipes" sign and edge arrow; tapping it during the first-visit lock says "Eat the floating bites first!".
- Walls: the camera may look in from just outside the side and front glass (up to 2.2 / 2.5 u), never through the back poster.
- King Claw: after a hit he goes home and rests 3 s; he flees while you flare; one bump per flare; Grand Maze brine shrimp respawn after 20 s; bumps reset when you leave; visual 1.45x, hitbox unchanged; `debug().boss`.
- School: path history records breaks at wraps and portals (followers snap with a ring pop), is prefilled from the entry tube, and is disposed on exit.
