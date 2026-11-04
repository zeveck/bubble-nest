# Round 2 findings (summaries)

## Player (no must-fix)
P1 should: Empty tanks are a bad deal (Z equal to nearby ladies, only +4 feeder) yet Frenzy requires every nest incl. empties. Give empties a wanted reward; show Frenzy condition on the Map ("Nests 5/8 - Frenzy at 8").
P2 should: Finding exits in big mazes on phones; minimap lacks exit icons and is on the cut list. Exit icons on minimap; edge pip for a chosen/nearest affordable target; take minimap off cut list.
P3 should: "Become him from the Map" toast fires mid-maze but Map fast travel only works from tanks. Define it: allow from a maze with confirm ("Leave Twin Loops? bites kept"), or say "visit any home".
P4 should: Tank pace undefined: no swim speed, tube exit position, distances. Tank speed 3-4 u/s with boost; leaf, feeder within ~3 u of the tube; action within 1.5 u; after an action, "Back to the pipes" auto-swims into the tube.
P5 should: Collection 5x4 with text unreadable at 844x390. On phones a portrait grid; tap → large detail card.
P6 nice: Personality lines promise stats ("double speed"). Rewrite.
P7 nice: Phone players not taught to rise; start tank with ~8 surface bites; first tips per platform.
P8 nice: "Feeding Frenzy" is both a maze name and the mechanic. Rename one.

## Art and sound director
A1 must: No spec for how a generated fin piece lines up with its code fin mesh (alpha islands give no identity/base edge/ray direction; per-style outlines unspecified). Either a fixed code-drawn template passed to imagegen2 as edit, or fallback: per-style outline as an alpha function in the fin shader + imagegen2 membrane/ray detail texture. Settle in Rust gate.
A2 must: Meshy "short fin stubs" will show through translucent fins in body colour. Ask for a finless body ("fins removed, short rounded tail stub"); body shader fades near base lines to fin colour (aFinRoot); add "no stub visible" to gate.
A3 should: Eye detection by luminance < 0.18 catches baked creases. Eyes by position (sphere per body in bodies.js) or code glossy eye spheres; luminance detail clamped.
A4 should: ~11 draw calls per fish → Grand Tank >150. Merge all fins + gills + beard into one geometry with per-vertex fin id (2 draws per fish); instance where possible.
A5 should: Free look in tanks shows nothing outside 3 glass walls. Per-world surroundings: nanogen 2:1 equirect blurred panoramas (windowsill, boiler room, shop) or wrap bg on a cylinder. Add as must.
A6 should: Sleeping-cat paw swat can't come from one mesh. Ears rotate in code about pivots; paw = code capsule+pad swinging, or a second model pose.
A7 should: Fish ~30 px long in pipes on phone. Gate pipe check at 844x390; in pipes fins 1.2x and more saturated; bolder patterns at distance; tighten phone camera to ~11x6 if needed.
A8 should: Title art and app icon from the concept, not the in-engine fish. Make them after the gate, with engine renders as reference.
A9 should: 19 ladies have no colour/pattern table. Add one, themed on her son, muted.
A10 nice: Missing sfx: feeder plop, wipe bloop, flare-ending tick, frenzy fanfare; say what's reused for room food and enemy going home.

## Builder
B1 must: Signature features break validator (spiral centres are dead ends; chambers/dens = 2x2 open; stalls = dead ends; portals "at the ends of a loop"). Spirals → spiral-looking loops with a way out; dens → ring corridor round a wall block; stalls → short loops behind valves on both ends; portals mid-corridor. Or explicit exceptions (`symmetric: no` per maze).
B2 must: Bite targets in W2/W3 are 79-86% of lattice capacity (max corridor cells with no 2x2 blocks = (H-1)/2·(W-2) + (H-3)/2·(W-1)/2), forcing near-uniform lattices. Hold bites to ~55-70% of capacity: enlarge or lower targets; rerun economy; add capacity check.
B3 should: Feeders + free fast travel = farm 250-300 bites per trip. One rule: only the tank you arrive in from a pipe refills (fast travel doesn't count); encode in economy.mjs.
B4 should: Format gaps: valves "open 3/shut 3" vs `period 3`; jelly loops not expressible (add `jelly@S3 loop=RRRRDDLLLLUU phase=`); portal exit direction and bite; currents perpendicular = 1.0x and never move a stopped fish.
B5 should: Autopilot only follows shortest paths; can't test stars or 60% economy; slow headless. Generator writes a covering route per maze; `__game.sweep(maze, exit, fraction)`; solve/sweep drive step() internally, render every N updates, return {bitesEaten, hits, time, reached}.
B6 should: Draw calls in Grand Tank (same as A4). Merge fins into one geometry with aFin id; gills+beard merged; ≤3 draws per fish.
B7 should: Code fins will detach from the bending body. One shared GLSL wave function in both shaders; fin vertices carry their base point's aAlong and get the body wave + flutter; gill/beard pivots in bodies.js; body customDepthMaterial with the same wave.
B8 should: Room scale vs fish scale unspecified (1 m fish in 0.35 m bubble). Fish in bubble ~0.5 m? (bubble radius 0.35 m), Grand Tank fish ~0.25 m; give dock ring radius and cat-swat distance in metres.
B9 should: Fish home rules incomplete. "On any switch, the old fish's home = the tank you're in if it's yours, else its previous home." Many fish per tank allowed. Cross-world switching only to worlds already reached.
B10 nice: Boot < 20 MB tight; bodies at --max-texture 512 or 768 (shader only uses luminance); props to stage 2; record sizes.
Minor: star 1 in the refilling-rows maze needs defining.
