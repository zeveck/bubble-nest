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

## Change 2 review (solid enemies, flare on demand, tank life, prompts)

One combined Player/Builder reviewer, 8 findings (3 must-fix). Applied:
- Flinch separation: you're pushed away from the enemy (forward if it hit you from behind), it backs off the other way for 1 s; dropped bites land only on your side; jellies stay on their loops.
- After a flinch you stop and wait for input (no drifting out an exit or portal); the bounce eases visually instead of snapping.
- Prompt placement: beside the fish (not on it), smoothed, hidden during the party and close-up cameras or when the fish is off screen; "Back to the pipes" is no longer a floating prompt (the sign, tube tap and E do it), which also lets "Tank Party!" show.
- Flare farming: +5 for the first time you eat each enemy per visit, +1 after.
- Solid states written down: grey (home/rest), eaten and respawning enemies are harmless; respawn waits until you're 2+ cells away.
- Crowding: only you and the female cast shadows; party particles capped by the shared pool.
- The friendly females are companions (not breeding); called out in the report in case breeding everywhere was meant.

## Change 4 review (one round: player, builder, art and sound)

Player: wasted flares from mashing or a carried-over key (must; fixed: ignored while flared, only fresh presses); 30 s track vs 6 s flare and double stinger (fixed: one stinger, no-intro tracks trimmed); stored flares always full (fixed: cap 2, overflow = a flare's bites); flare teaching (fixed: tips + pulse); Coral prompt in the first minute (fixed: hidden until affordable or after the first tube trip); lost betta next to spawns, dark worlds (fixed: ≥3 from spawns and shrimp, always lit); phone strip of 47 (fixed: world tabs); long zoom hides the corridor (fixed: punch). Grand Maze at 35 reached soon in Neon Night: accepted.
Art/sound: gold flare invisible in Copperworks (must; fixed: contrast change, darker scene, white-gold rims, sweep); intro in the flare tracks (must; fixed); Clearwater flare instruments (fixed in the prompt: no brass); world/flare buses (fixed); 27 fish too close to existing ones (must; fixed: adopted the palette spread); missing sounds (fixed: flare-stored, found replaces jingle, ticks at 1.5 s, chomp cap, shimmer near a lost betta); scale stacking through the tube (fixed: aura instead); lost betta visibility (fixed: iridescent + gold glint).
Builder: friend nests impossible for old saves (must; fixed: stage-based canNest); migration drops fields and blocks the second victory (must; fixed); Grand Maze relocking old saves (must; fixed: grandOpen flag); music ducking with one slot (must; fixed: two buses); flare not cleaned up on exit (must; fixed: endFlare); phone audio load/memory (fixed: preload current world only, unlock on Flare tap); 47th fish mid-pipe (fixed); collection portrait stall (fixed: idle prerender); hard-coded numbers (fixed: derived); debug hooks (added).
