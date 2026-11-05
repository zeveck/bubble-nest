# Bubble Nest

*Swim the pipes. Munch the bites. Build the nests. Collect all 20 bettas.*

## Pitch

You're a betta in a little tank with a glass tube hanging into it. Swim up the
tube and the world turns into a glowing arcade maze of water pipes:
munch trails of betta bites, flare your gills at snails and shrimp, and follow
branching pipes to other tanks. Claim empty tanks with a bubble nest, court
lady bettas, raise their fry, and become each new fish. Three pipe worlds,
linked by a bubble that floats you across a cozy fish room, and 20
jewel-bright bettas to collect. No dying, no story, just fish, food and fun.

## Settings

- Platform: both (desktop and phone), landscape only.
- Target: web, plain ES modules, no build step; three.js r186 vendored in `game/vendor/`.
- 3D: yes (asked for in so many words).
- Scope: large: 3 worlds, 19 mazes, 28 tanks, a bubble room with the Grand
  Tank, 20 fish; about 60 to 90 minutes to collect everything (economy sim: 47
  maze runs with every nest, 39 if you skip the empty tanks).
- Budget: $50 for generated art, models and audio (estimate ~$29, below).
- Tools: meshgen (Meshy, 2,497 credits), imagegen2, nanogen, audiogen,
  playwright-cli, node, Python + Pillow.
- Credit: Rich Conlan.
- Decisions made on the player's behalf:
  - Name "Bubble Nest".
  - Z (nest cost) is spent from your bites; N (hatch) and M (grow) count bites
    you eat anywhere after the eggs are laid, so fry grow while you explore.
    Re-grabbed scattered bites go back in your wallet but don't count again.
  - Hits knock bites loose along the corridor; about half can be re-grabbed.
  - Claimed tanks (empty or lady) become your homes. A home's feeder fills
    only when you arrive in it from a pipe (never by fast travel, Become or dock).
  - Empty tanks are optional but worth it: a big feeder, +2 on every home's
    feeder, and a new bubble-trail style for your fish.
  - The collection is 20 males: your starting betta plus one grown fry from
    each of the 19 lady bettas. Ladies are characters, not collectibles.
  - Twists: the flare power-up, two stars per maze (clear, clean run), and one
    new pipe mechanic set per world (wraps; currents + valves + crayfish;
    darkness + portals + jellyfish), introduced one per maze before combining.
  - The bubble room is a hobbyist's fish room with three docks and the Grand
    Tank, where every fish you collect appears.
  - Feeding Frenzy: once every **lady** nest in a world is built, bites eaten
    in that world count double toward hatching and growing (kills the endgame
    wait). The Map shows "Lady nests 5/6 - Frenzy at 6".

## The player's fantasy

Being a proud little betta with enormous flowing fins, gobbling food, showing
off, and building a family empire of tanks across a shelf-sized world.

## Core loop

- **10 seconds:** steer through pipes, munch a trail of bites with a
  satisfying rhythm, dodge an enemy at a junction, grab a brine shrimp and
  flare to chase them off.
- **1 minute:** cross or clear a maze, pick an exit (its sign shows what's
  beyond and whether you can afford it), arrive in a tank, eat the feeder
  bites, nest or check on your fry, "Back to the pipes". Toasts tell you when
  fry hatch or grow anywhere.
- **Session:** watch the collection and the Grand Tank fill. Each nest is a
  ticking promise ("hatch in 34 bites"). Pushing deeper finds new ladies, new
  mechanics and named mazes; then a bubble machine opens a new world.

## Controls

Landscape on phones. In portrait a "Turn your phone sideways" overlay shows;
the manifest asks for landscape. `contextmenu` is prevented on the canvas.

### Tank and bubble room (free 3D, camera-relative)

| Action | Desktop | Touch |
|---|---|---|
| Swim | Hold left mouse button: swim toward the pointer (pointer offset from screen centre steers, dead zone 8% of the screen). Release = glide to a stop. Or W / Up | Left stick (zone: bottom-left 160x160 px, stick only): push = swim in that direction relative to the camera (up = away from camera, sideways = turn and swim); speed follows the push. Release = brake (glide 0.4 s) |
| Turn | A / D or Left / Right; or the pointer while left button held | Stick sideways |
| Rise / dive | Space / Shift (or R / F); the fish also pitches toward where the camera looks while swimming | Drag on the right half aims the camera; the fish pitches toward the camera's aim while swimming. Rise / dive buttons (64 px, up/down arrows) above the action button |
| Brake / back off | S / Down | Release the stick |
| Look around | Right-drag or middle-drag orbits; eases back behind the fish after 1.5 s | Drag on the right half (outside buttons) |
| Action (Build nest, Become, Back to the pipes, Dock, Bubble out) | E / Enter, or click the on-screen button | Action button (bottom-right, 88 px), shown only when available |
| Map / Pause / Mute | Tab / Esc or P / M | Buttons top-right (48 px) |

- The pointer never steers unless the left button is held, and never while
  over a HUD element (HUD elements stop pointer events reaching the canvas).
- The fish never leaves the water box and slides along glass. The tube mouth
  pulls you in within 0.8 fish lengths of its centre.
- **Pace:** tank swim 3.5 u/s, ramping to 5 u/s after 1 s of continuous push
  (no extra button); rise/dive 2 u/s; room bubble 0.8 m/s (1.2 after 1 s).

### Pipes (2D on a plane, rendered 3D)

| Action | Desktop | Touch |
|---|---|---|
| Move | Arrows / WASD | Swipe anywhere outside the stick zone and buttons (24 px threshold); or hold the stick (dominant axis) |
| Move (mouse) | Hold left mouse: pointer is raycast onto the maze plane; heading = dominant axis from fish to pointer in grid space, with hysteresis (switch axis only when the other is 25% larger) | n/a |
| Turn buffer | A requested turn is held until taken, replaced by another, or 2 junctions have passed; a small arrow on the fish shows the queued turn | same |
| Stop | None: the fish keeps swimming until it hits a wall | n/a |
| Map / Pause / Mute | Tab / Esc or P / M | Buttons top-right |

On every mode change held inputs and the turn buffer are cleared, and input
is ignored during the 0.5 s bubble wipe.

## Structure and difficulty

The world is a graph with stable string IDs (used by save, Map, tests).
**Mazes** have 2 to 4 numbered exits on their border; each exit leads to a
tank or to an exit of another maze (`cw-m2:1` = exit 1 of cw-m2). **Tanks**
have one tube up into one maze exit. **Bubble machines** (`-bm`) are exits
that put you in a bubble in the room. Each world's home/arrival tank also has
a small "bubble out" machine in a corner (active once the room is found), so
every world, including World 3, has a way back to the room.

Exit signs (floating badge at the pipe mouth, label when near; same icons on
Map nodes and the minimap):

| Icon | Means | Label shows |
|---|---|---|
| heart ("?" until visited) | lady betta | "Nest 35 - you have 42" (heart full colour when affordable, grey when not) |
| open box | empty tank | "Nest 45 - need 13 more" |
| house | your tank | fry status: "Eggs: hatch in 12" / "Fry: grown in 30" / "Ready!"; "Feeder full" if it would fill |
| arrows | another maze | maze name, stars (0-2) |
| bubble | bubble machine | "To the Fish Room" |

### Mechanics introduced one at a time

| Maze | New thing (alone first) |
|---|---|
| cw-m1 | bites, brine shrimp flare, snail |
| cw-m2 | shrimp (darts) |
| cw-m3 | wrap tunnel |
| cw-m4..m6 | combinations, more enemies |
| cp-m1 | currents |
| cp-m2 | steam valves |
| cp-m3 | crayfish |
| cp-m4..m6 | combinations |
| nn-m1 | darkness |
| nn-m2 | portal rings |
| nn-m3 | jellyfish |
| nn-m4..m7 | combinations; currents and valves return in nn-m5 / nn-m6 |

### Maze sizes and capacity

Sizes are character grids including walls (W x H, always odd). Bites are
targets; the generator must land within ±8%. Enemy spawns are ≥ 6 path cells
from every exit. **Capacity** = most corridor cells a W x H grid can hold with
no 2x2 open block = (H-1)/2·(W-2) + (H-3)/2·(W-1)/2. Every bite target is 59-68%
of capacity (`tools/sim2.py` checks; the validator fails outside 55-70%), so
the generator has room for real walls, not a uniform lattice. Bigger mazes
scroll more; the minimap with exit icons (below) keeps exits findable on phones.

Signatures are hand-placed and obey the validator: loops only (no dead ends),
"spirals", "dens" and "chambers" are ring corridors round wall blocks with at
least two gaps, stalls are short loops behind valves at both ends, portals sit
mid-corridor. Walls are mirror-symmetric; a maze may set `symmetric: no` in
its side table with a reason comment (none needs it today).

### World 1: Clearwater (clear glass pipes on a sunny windowsill shelf)

| Maze | Name | Size | Bites | Enemies | Signature (hand-placed) | Exits |
|---|---|---|---|---|---|---|
| cw-m1 | Ripple Run | 15x9 | 50 | snail | ring corridor round a central wall block, bites curling in to the first brine shrimp, two gaps out | 1 cw-home, 2 cw-lady-1, 3 cw-m2:1 |
| cw-m2 | Twin Loops | 15x11 | 62 | snail, shrimp | two figure-eight loops (rings sharing a cross junction), a shrimp in each | 1 cw-m1:3, 2 cw-empty-1, 3 cw-lady-2, 4 cw-m3:1 |
| cw-m3 | Wraparound | 17x11 | 70 | snail, shrimp | long middle-row wrap highway lined with bites | 1 cw-m2:4, 2 cw-lady-3, 3 cw-m4:1 |
| cw-m4 | Lily Pads | 19x11 | 76 | 2 shrimp | four square "pad" rings round 3x1 wall blocks, two wrap rows | 1 cw-m3:3, 2 cw-lady-4, 3 cw-empty-2, 4 cw-m5:1 |
| cw-m5 | Sun Spiral | 21x11 | 84 | snail, 2 shrimp | two coiled loops: each coils inward round a wall block and leaves by a second gap; a brine shrimp at each inner turn | 1 cw-m4:4, 2 cw-lady-5, 3 cw-m6:1 |
| cw-m6 | Windowsill Wide | 19x13 | 92 | snail, 2 shrimp | "the Grid" of short corridors; golden bite trail to the machine | 1 cw-m5:3, 2 cw-lady-6, 3 cw-bm |

### World 2: Copperworks (glass pipes in copper fittings, a warm boiler room)

Currents: with the flow 1.8x, against 0.45x, across 1.0x; a current never
moves a stopped fish or enemy. Valves: open 3 s / shut 3 s by default, hiss +
red lamp 0.5 s before shutting. Crayfish: aims 3 cells ahead.

| Maze | Name | Size | Bites | Enemies | Signature | Exits |
|---|---|---|---|---|---|---|
| cp-m1 | Downstream | 21x13 | 96 | 2 snails, shrimp | "lazy river": a current ring round a long wall block you can ride around | 1 cp-home, 2 cp-lady-1, 3 cp-m2:1, 4 cp-m4:4 |
| cp-m2 | Steam Gates | 21x13 | 104 | snail, 2 shrimp | row of 4 valves opening as a wave (phases 0 / 0.75 / 1.5 / 2.25 s) | 1 cp-m1:3, 2 cp-lady-2, 3 cp-empty-1, 4 cp-m3:1 |
| cp-m3 | Crayfish Corner | 23x13 | 110 | crayfish, 2 shrimp | the den: a ring corridor round a 3x1 wall block in the middle, crayfish spawns on it; brine shrimp in all 4 corners | 1 cp-m2:4, 2 cp-lady-3, 3 cp-m4:1 |
| cp-m4 | Pressure Loop | 23x13 | 116 | crayfish, snail, 2 shrimp | current loop gated by a valve | 1 cp-m3:3, 2 cp-lady-4, 3 cp-m5:1, 4 cp-m1:4 (loop home) |
| cp-m5 | Boiler Maze | 25x13 | 122 | crayfish, snail, 2 shrimp | "the boiler": a current ring round a central wall block, in and out through two valve gaps | 1 cp-m4:3, 2 cp-lady-5, 3 cp-empty-2, 4 cp-m6:1 |
| cp-m6 | Copper Crown | 25x13 | 128 | 2 crayfish, 2 shrimp | crown-shaped top corridor of valves | 1 cp-m5:4, 2 cp-lady-6, 3 cp-bm |

### World 3: Neon Night (neon-rimmed pipes in a dark aquarium shop after hours)

Darkness: pipe interiors dim outside a light pool (radius 3 cells) around you;
neon rims, bites (faint glow) and enemy eyes/rims always visible. Portals:
paired rings mid-corridor; you come out moving the same way you went in (if
that's a wall, you stop); no bite on a portal cell; enemies don't use them.
Jellyfish: fixed loop, pulses every 2.5 s, 0.6 s pulse stings 1 cell away.

| Maze | Name | Size | Bites | Enemies | Signature | Exits |
|---|---|---|---|---|---|---|
| nn-m1 | Lights Out | 23x15 | 130 | 2 snails, 2 shrimp | bite trails glow like runway lights | 1 nn-home, 2 nn-lady-1, 3 nn-m2:1, 4 nn-m6:4 |
| nn-m2 | Ring Road | 23x15 | 138 | snail, 2 shrimp, crayfish | one long ring road; a portal pair halfway along its top and bottom corridors makes a shortcut across | 1 nn-m1:3, 2 nn-lady-2, 3 nn-empty-1, 4 nn-m3:1 |
| nn-m3 | Jelly Lanes | 25x15 | 144 | jelly, 2 shrimp, crayfish | two parallel jelly lanes with timed crossing gaps | 1 nn-m2:4, 2 nn-lady-3, 3 nn-m4:1 |
| nn-m4 | Mirror Hall | 25x15 | 150 | jelly, crayfish, 2 shrimp, snail | two portal pairs (a/b, c/d) mid-corridor in mirrored halls | 1 nn-m3:3, 2 nn-lady-4, 3 nn-m5:1 |
| nn-m5 | Glow Garden | 27x15 | 156 | jelly, crayfish, 2 shrimp, snail | currents carry you round neon "flowerbed" rings | 1 nn-m4:3, 2 nn-lady-5, 3 nn-empty-2, 4 nn-m6:1 |
| nn-m6 | Night Market | 27x15 | 162 | 2 jelly, crayfish, 2 shrimp | bite "stalls": short loops behind a valve at each end | 1 nn-m5:4, 2 nn-lady-6, 3 nn-m7:1, 4 nn-m1:4 (loop home) |
| nn-m7 | Midnight Snack | 27x15 | 168 | 2 jelly, crayfish, 2 shrimp | 6 brine shrimp; eaten rows refill 20 s later | 1 nn-m6:3, 2 nn-lady-7 |

### Tanks, Z / N / M and depth

Depth index = order of discovery within the world (0 = shallowest).
Z = nest cost (spent). N = bites eaten to hatch. M = more bites to grow.
Empty tanks cost a little less than the lady next to them.

| World | Tank (depth) | Off maze | Z | N | M | Lady / fish |
|---|---|---|---|---|---|---|
| Clearwater | cw-home | cw-m1 | - | - | - | yours at start (Rust) |
| | cw-lady-1 (0) | cw-m1 | 20 | 20 | 30 | Pearl -> Sky |
| | cw-empty-1 (1) | cw-m2 | 25 | - | - | trail: hearts |
| | cw-lady-2 (2) | cw-m2 | 35 | 25 | 35 | Clover -> Mango |
| | cw-lady-3 (3) | cw-m3 | 50 | 30 | 40 | Daisy -> Domino |
| | cw-lady-4 (4) | cw-m4 | 55 | 35 | 45 | Honey -> Kiwi |
| | cw-empty-2 (5) | cw-m4 | 45 | - | - | trail: stars |
| | cw-lady-5 (6) | cw-m5 | 70 | 40 | 50 | Willow -> Marble |
| | cw-lady-6 (7) | cw-m6 | 75 | 45 | 55 | Sunny -> Cobalt |
| Copperworks | cp-home | cp-m1 | - | - | - | yours on arrival |
| | cp-lady-1 (0) | cp-m1 | 85 | 50 | 60 | Penny -> Copper |
| | cp-lady-2 (1) | cp-m2 | 95 | 55 | 65 | Ginger -> Ember |
| | cp-empty-1 (2) | cp-m2 | 80 | - | - | trail: rings |
| | cp-lady-3 (3) | cp-m3 | 110 | 60 | 70 | Amber -> Koi |
| | cp-lady-4 (4) | cp-m4 | 120 | 65 | 75 | Maple -> Bronze |
| | cp-lady-5 (5) | cp-m5 | 130 | 70 | 80 | Hazel -> Rosette |
| | cp-empty-2 (6) | cp-m5 | 110 | - | - | trail: sparkles |
| | cp-lady-6 (7) | cp-m6 | 145 | 75 | 85 | Cinnamon -> Mustard |
| Neon Night | nn-home | nn-m1 | - | - | - | yours on arrival |
| | nn-lady-1 (0) | nn-m1 | 150 | 80 | 90 | Luna -> Galaxy |
| | nn-lady-2 (1) | nn-m2 | 160 | 85 | 95 | Nova -> Neon |
| | nn-empty-1 (2) | nn-m2 | 140 | - | - | trail: glow bubbles |
| | nn-lady-3 (3) | nn-m3 | 180 | 90 | 100 | Stella -> Violet |
| | nn-lady-4 (4) | nn-m4 | 190 | 95 | 105 | Iris -> Avatar |
| | nn-lady-5 (5) | nn-m5 | 200 | 100 | 110 | Zinnia -> Candy |
| | nn-empty-2 (6) | nn-m5 | 170 | - | - | trail: rainbow |
| | nn-lady-6 (7) | nn-m6 | 220 | 105 | 115 | Aurora -> Black Orchid |
| | nn-lady-7 (8) | nn-m7 | 230 | 110 | 120 | Vega -> Opal |

### Feeders

| Tank | Feeder (bites, on the surface) |
|---|---|
| home tank (cw/cp/nn-home), lady tank you've nested | 8 / 12 / 16 (World 1 / 2 / 3) + 2 per claimed empty tank (any world) |
| claimed empty tank | 20 / 30 / 40 + 2 per claimed empty tank |

A home's feeder fills only when you arrive in it **from a pipe**. Fast travel,
Become, docks and bubbling out never fill it. Unclaimed tanks have no feeder.
The start tank opens with 8 bites floating on the surface.

**Economy check** (`tools/economy.mjs`, reads `data/worlds.js`, mirrors
`tools/sim.py`; must pass after every tuning change). Model: a maze run eats
60% of its bites, 1 / 1.5 / 2 hits per run, half of each hit recovered; a run
that isn't heading to a nest ends in the best home off this maze or the
previous one and takes its feeder; Frenzy x2 once the world's lady nests are
built. Results (`python3 tools/sim2.py`):

| Case | Runs | Max gap between rewards | Farm / grind runs |
|---|---|---|---|
| default (all 25 nests) | 47 | 2 | 3 |
| skip all empty tanks | 39 | 2 | 1 |
| 2x hits | 49 | 2 | 5 |
| eat 50% per run | 52 | 2 | 8 |
| 50% and 2x hits | 55 | 2 | 11 |

Rewards = nest, hatch, grown, new maze. Stars (+10/20/30) are not in the
model (extra slack). Bites never run out: a maze's bites refill each time you
enter it. `?fast=1` sets every Z, N, M to 1 (testing only).

### Enemies

| Enemy | World | Speed (you = 1.0 = 4 cells/s) | Behaviour | Tell |
|---|---|---|---|---|
| Snail | 1+ | 0.45 | Wanders; seeded random turn at junctions | shell bob |
| Shrimp | 1+ | 0.85 | Wanders; if you're in its row/column within 6 cells with clear sight (stops at walls and closed valves, not through wraps/portals), darts at 1.1 for 1.5 s | 0.3 s crouch + "!" flash + chirp before darting |
| Crayfish | 2+ | 0.8 | Shortest path to the cell 3 ahead of you; closed valves are walls; 4 s rest every 10 s | claws click |
| Jellyfish | 3 | 0.6 | Fixed loop from its side table; pulses every 2.5 s; sting reaches 1 cell during the 0.6 s pulse | glow swells 0.4 s before pulse, thrum |

### Movement rules (pipes)

- Position is cell + fraction along direction; speeds in cells/s; fixed 1/60 s update.
- Pre-turn cornering within 0.3 cell of a centre; the held turn buffer makes
  this reliable at 1.8x in currents.
- Currents change speed of fish and enemies alike (with 1.8, against 0.45,
  across 1.0); they never move a stopped fish. Enemies use wraps and
  currents, never portals.
- A valve blocks *entering* only; anything already in the valve cell carries on.
- Arriving in a maze: 1.5 s safety (blinking, enemies pass through).
- Hit = enemy centre within 0.5 cell of yours (jelly: within 1 cell while pulsing).
- Frightened enemies move at 0.6x and pick the junction direction that takes
  them furthest from you; a bumped enemy swims home at 1.5x (grey tint), rests 5 s.

### Hits, flare and stars

- **Hit:** lose 8 / 12 / 18 bites (World 1 / 2 / 3), plus 5% of the bites you're carrying, at most 1.5x that base (12 / 18 / 27); King Claw 25 (up to 38). Never below 0. (Raised in Change 3; was 3 / 5 / 8.) 0.4 s daze
  (fish stops, spins once), then 1.5 s blinking safety. Half the lost bites
  (rounded up) drop 2-3 cells ahead and behind you along the corridor and
  fade after 4 s; the rest are gone. Bonk, small shake.
- **Flare (brine shrimp):** 2-4 per maze (6 in nn-m7). Fins spread, gill
  covers and beard swing out, warm glow for 6 / 5 / 4.5 s; a tick sounds for
  the last 1 s. Enemies turn pale and flee; bump one for +5 bites.
- **Stars:** star 1 = eat every bite cell at least once in one visit (+10 /
  20 / 30); in nn-m7 refilled bites are extra and don't need eating. Star 2 =
  star 1 without being hit (+10 / 20 / 30 more). Shown on signs and the Map;
  the pipe HUD shows "Bites left 23".

### Tanks

- **Layout (every tank):** interior 14 x 8 x 7; the tube hangs from the lid at
  x = +4, its mouth 1 u below the surface; you arrive just under it. The leaf
  (nest spot) floats 2.5 u from the tube, the feeder 2 u from it on the other
  side, the lady near the leaf. Actions are offered within 1.5 u.
- **Back to the pipes:** after any action (nest, Become) or once the feeder
  bites are eaten, the action button reads "Back to the pipes": the fish
  auto-swims into the tube (≤ 1.5 s, any input cancels).
- **Home tanks** (cw-home, cp-home, nn-home, every claimed tank): feeder as above.
- **Empty tank:** a floating leaf glows as the nest spot. With Z bites: "Build
  bubble nest (Z)". It becomes a home (ribbon in your fish's colour on the
  lid) with the big feeder, raises every feeder by 2, and unlocks its bubble
  trail style (card: "New bubble trail: Hearts!"; choose it per fish in the
  Collection).
- **Lady tank:** she swims shyly. Build the nest; she swims up, a short
  courtship circle (shimmer sound), eggs appear. Card: "Eggs: hatch in 34
  bites". Hatch = a cloud of fry; "Fry: grown in 80 bites". Grown = one young
  adult in its own colours: "Become Kiwi".
- **After becoming:** the tank stays a home. The lady, the fish living there
  and 6 juveniles (instanced) live there. It can't be nested again.
- **Becoming / switching fish** (in the tank, or from Map / Collection, which
  moves you to that fish's tank first): you're that fish everywhere;
  collection card + fanfare the first time; the fish appears in the Grand Tank.
  - Allowed from a tank any time, from the room, and from a maze with a
    confirm: "Leave Twin Loops? Your bites are kept."
  - Within the current world any time; to another world only once you've
    reached it.
  - **Home rule:** on any switch, the old fish's home = the tank you're in if
    it's yours, else its previous home. Rust starts at cw-home. Any number of
    fish can share a tank.

### The bubble room ("The Fish Room") and the Grand Tank

- A cozy hobbyist's room at night: shelves of tanks, a window with the moon, a
  lamp, an armchair, a sleeping cat, and in the middle, on a table, the
  **Grand Tank** holding every fish you've collected.
- **Scales (1 unit = 1 m):** room 6 x 3 x 5; your bubble radius 0.35 with the
  fish inside at 0.5 long; Grand Tank 2 x 1 x 0.8 with fish 0.25 long; dock
  ring radius 0.5 (auto-dock when the bubble centre stays within 0.4 of it
  for 0.5 s); food bubbles r 0.06. Camera 1.6 behind the bubble.
- Same controls as the tank, floatier. 24 food bubbles (+1 each; refill per visit).
- Docks (bubble machines on shelves, world-coloured ring, name plate):

| Dock | Lands you in | Unlocked by |
|---|---|---|
| dock-cw | cw-home | always |
| dock-cp | cp-home | reaching the room through cw-bm |
| dock-nn | nn-home | reaching the room through cp-bm |

- Into the room: cw-bm, cp-bm, or any home tank's "bubble out" machine (cw-home,
  cp-home, nn-home) once the room has been found. Float into a dock's ring
  (auto-dock, or press Action). Locked docks: dim, padlock, "Reach the bubble
  machine in Copperworks".
- The cat (on the armchair, 1.5 m from the nearest dock path): bubble within
  1.2 m of its head: an ear flicks (0.6 s tell), then the paw swats out to
  1.0 m; a touch bounces you 1.5 m away and costs 5 bites (half float back as
  food bubbles). 4 s rest between swats.

## Win, lose and progress

- **Win:** become your 20th betta (Opal). Cut to the room: the Grand Tank
  lights up, all 20 swim a loop, bubbles rise, "Full Collection!" card,
  credits. Then "Keep swimming" returns you where you were.
- **Lose:** you can't. Enemies cost bites only.
- **Saved** (localStorage `bubblenest-save`), written on stable events (enter
  tank, enter maze, nest, hatch, grow, become, dock, settings) plus a 5 s
  debounce for bite counts; never mid-wipe:

```js
{ v: 1, bites, eaten, fish: 'rust', at: 'cw-home',          // last tank or room
  tanks: { 'cw-lady-1': { claimed: true, stage: 'eggs'|'fry'|'grown'|'done',
           laidAt, hatchedAt, grownAt, becameFish } },
  fishHome: { rust: 'cw-lady-1' }, collected: ['rust','sky'],
  trails: ['hearts'], fishTrail: { rust: 'hearts' }, worlds: ['cw','cp'],
  docks: ['dock-cw'], roomFound: true, stars: { 'cw-m1': 2 },
  feederFull: { 'cw-home': true }, seen: { tips: [] }, settings: {} }
```

  Migrations keyed by `v`. Continue puts you in `at` (a maze quit = its last
  tank). Unknown IDs are dropped on load.

## Screens

- **Loading:** title backdrop, logo, bubble progress bar. Boot loads only
  World 1 + home tank + fish + UI (target < 20 MB); the room, World 2 / 3 and
  their music stream in the background, and the world card waits for them
  if needed.
- **Title:** 3D tank with your current betta; Continue / New Game (confirm if a
  save exists), Collection, Settings, Credits. First tap or key enables audio.
- **How to play:** one-at-a-time contextual tips, worded per platform
  (coarse pointer = touch):

| Moment | Desktop | Touch |
|---|---|---|
| start | "Hold the mouse button to swim" | "Push the stick to swim" |
| first 3 s near the surface bites | "Space to rise - eat the bites on top!" | "Tap the up arrow to rise - eat the bites on top!" |
| bites eaten | "Swim up into the tube" | same |
| first pipe | "Arrow keys or WASD to turn" | "Swipe to turn" |
| first brine shrimp | "Grab the shrimp to flare" | same |

  Plus a How to Play page in Pause (Tanks, Pipes, Nests & fry, Frenzy).
- **Tank HUD:** bites (top-left), fish chip, tank name + status card (top-centre),
  Map (with badge) and Pause (top-right), action button when available.
- **Pipe HUD:** bites, maze name, stars and "Bites left", flare ring around the
  fish chip, exit labels near exits, edge pips (small arrows on the screen
  edge) for enemies off-screen within 6 cells, one gold edge pip toward the
  nearest exit with something ready (affordable nest or "Ready!" fry),
  minimap (top-right under buttons, 120 px wide on phones: walls, you, exit
  icons coloured like the signs; no enemies).
- **Bubble HUD:** bites, dock labels near docks, Grand Tank count "12 / 20".
- **Toasts** (top-centre, 3 s, chime, queue): "Pearl's eggs hatched!",
  "Sky is grown! Become him from the Map", "Copperworks dock unlocked",
  "Feeding Frenzy in Clearwater! Fry here grow twice as fast". The Map
  button gets a dot badge until you open the Map.
- **Map:** current world as a node graph (mazes rounded squares with stars;
  tanks circles with icon, cost and affordability, fry status), world tabs
  (reached worlds only), "you are here", "Lady nests 5/6 - Frenzy at 6",
  "Go" buttons on homes in this world and "Become" on ready fry (from a maze:
  confirm first).
- **Collection:** desktop: 20 cards (5x4): portrait (rendered once in code),
  name, variety, one-line personality; locked = silhouette + hint ("Nova's
  fry, Neon Night"). Phone (short side < 500 px): a 2-row horizontally
  scrolling strip of 72 px portraits only; tap one for a large detail card.
  Detail card: big portrait, name, variety, line, trail picker, "Swim as this fish".
- **Pause:** Resume, Map, Collection, How to play, Settings, Title.
- **Settings:** music / sound volume, sensitivity, invert rise/dive, reduce
  motion, minimap on/off, reset save (confirm).
- **New fish card**, **New trail card**, **World cards** ("Copperworks", first
  arrival), **Victory**, **Credits** (idea by Rich Conlan; made with gamegen;
  tools; Fredoka OFL; music and sound created with ElevenLabs).

## Juice

Must-haves:

- Munch: particle puff, "nip" pitched up through a streak (resets after 0.6 s),
  pitched by the fish's own munch pitch; counter bumps.
- Fish swim wave (shared GLSL wave in body and fin shaders), fins flutter;
  banks into turns; in pipes turns 90° in 0.12 s; a bubble trail in the
  fish's colour (style from unlocked trails).
- Flare: fins spread 1.25x, gill covers + beard swing out 35°, warm glow, bright music filter.
- Hit: daze spin, bites pop out along the corridor, blink, small shake.
- Bubble wipe on every mode change (0.5 s, bloop).
- Nest: foam bubbles pop up one by one; eggs sparkle; hatch burst of fry.
- New fish fanfare card with confetti bubbles; fish pops into the Grand Tank next room visit.
- Water: caustics on tank floor, moving surface, filter bubble stream.

Nice-to-haves: maze-clear light wave; enemies wobble when fleeing; bites bob;
bubble wobbles; cat breathes.

## Art direction

- **Style line (every image prompt):** "glossy stylized 3D toy aquarium look,
  jewel-toned betta fish with flowing translucent fins, soft studio lighting,
  clean simple shapes, saturated but gentle colours, no text, no logos".
- **Style anchor:** the "Rust" concept picture (deep red halfmoon, darker
  red-violet fins, iridescent blue sheen), pure side view, fins clearly spread
  and separated, plain white. Every other concept picture uses it as reference.
- **Palette:** water teal #2bb3c0, glass mint #bff3ea, bite brown #a0622d,
  nest foam #f6fbff, Clearwater sky #9ad7f5 and leaf #5fb85a, Copperworks
  copper #c8743a and steam cream #f2e2c4, Neon magenta #ff4fd8, cyan #3cf0ff,
  navy #10142e. UI: cream panels #fff7ea, teal edges, text #1d3340.
- **Camera:** tank: behind and above the fish, orbit on drag, clamped inside
  the water box, drops below the fish near the surface. Pipes: perspective,
  front and slightly above (12°), dead-zone follow, shows ~15x9 cells (desktop)
  / ~12x7 (coarse pointer; ~11x6 if the gate shows the fish under 40 px),
  clamped to the maze + 1 cell. Room: behind the bubble.
- **Scale:** betta 1.0 unit nose to tail (0.85 in pipes). Tank interior 14 x 8
  x 7. Pipe cell 1.6, tube radius 0.55; flare spread is capped to stay inside
  the tube. Room: 1 unit = 1 m (scales above).
- **Tank surroundings:** each world's tanks sit inside a world panorama
  (blurred windowsill shelf / boiler room / aquarium shop) on a cylinder r 30
  around the tank, so free look always shows the world; the same panorama is
  the pipe backdrop.

### Fish (two finless Meshy bodies + code fins and eyes)

- **Bodies:** Meshy makes `body-male` and `body-female` only, from concepts
  of a platinum / near-white body with **fins removed, a short rounded tail
  stub**, no eyes painted (smooth head), pure side view. Fry = `body-male`
  at 0.12 scale, no fins, instanced. `--max-texture 512` (the shader only
  uses the texture's luminance).
- **Bake at load:** normalise to 1.0 long, nose +X; per-vertex `aAlong`
  (0 head to 1 tail), `aHeight` (-1 belly to 1 back) and `aFinRoot`
  (distance to the nearest fin base line in `data/bodies.js`) in model space.
- **Body shader** (one program for all fish; MeshStandardMaterial +
  onBeforeCompile, constant cache key): colour = gradient(bodyA, bodyB, aAlong)
  x (0.55 + 0.6 x clamp(texture luminance, 0.35, 1)) + pattern + fresnel
  sheen; within 0.04 of a fin base (`aFinRoot`) it fades to finA so roots
  blend. Pattern is a uniform: solid, marble, butterfly, koi, dragon, rim; all
  in model space (no UV seams); `uPatternScale` 1.0 (1.5 in pipes, bolder at distance).
- **Eyes:** code glossy spheres (black, roughness 0.05, white highlight from
  the environment), position and radius per body in `data/bodies.js`; all
  fish's eyes are one InstancedMesh.
- **Fins, gills, beard: one merged geometry per fin style**, double-sided,
  each part a full-rectangle grid in fin-local coordinates (u 0..1 along the
  base line, v 0..1 away from it; 12x10 verts for dorsal/caudal/anal, 6x4 for
  small fins). Per-vertex `aPart` (dorsal, caudal, anal, ventral L/R,
  pectoral L/R, gill L/R, beard), `aUV`, and `aBaseAlong` (the base point's
  aAlong). Base lines, spread vectors and gill/beard pivots come from
  `data/bodies.js` (set once with the `?fins=1` tuning page).
- **Fin shader (one program):** the fin **outline is a procedural alpha
  function** of (u, v) per style and part, smoothstepped for a soft edge:

| Style | Caudal / dorsal / anal outline |
|---|---|
| halfmoon | caudal fanned 180° (D shape), edge v < 1 with a gentle scallop; tall dorsal and long anal |
| crowntail | webbing to v < 0.6 dipping between rays; rays (12-16 thin lines along v) run on to v = 1 with a taper |
| plakat | short rounded: v < 0.5 + 0.1·cos rounded ends; fan 100° |
| doubletail | caudal split: a notch through u = 0.5 down to v = 0.3 (two lobes); wide dorsal |
| veiltail | caudal hangs down and tapers to a point (outline long at the bottom, short at the top) |
| female | short and rounded, v < 0.4; small dorsal |
| small fins (all) | ventral = long thin streamer; pectoral = small round clear fan (opacity 0.4) |

  Detail: two greyscale tileable textures (`fintex-fine` for all styles,
  `fintex-heavy` for crowntail rays), sampled with (u x repeat, v), give
  luminance streaks and ray lines; no alpha cutting from images. Colour =
  gradient(finA, finB, v) + pattern; opacity 0.8 x outline alpha (gills and
  beard 1.0). Rendered after bodies, depthWrite off.
- **Motion (B7):** one shared GLSL `fishWave(along, t)` chunk in the body
  shader, the fin shader and the body `customDepthMaterial`; fin vertices get
  the body wave at `aBaseAlong` plus flutter = sine along v; flare = uniform
  spreading fans 1.25x and swinging gill/beard parts 35° about their pivots.
- **Draws per fish:** body 1 + fins/gills/beard 1 (+ the shared eye instance
  mesh) = ≤ 3; Grand Tank with 20 fish ≈ 41 draws.
- **Pipe view:** left/right = yaw only (never roll, never belly-up); up/down
  pitch ~70° with the back toward camera-up. Fins 1.2x and saturation +15%
  in pipes.
- **Prototype gate:** build Rust first (body + halfmoon outline + fintex-fine),
  screenshot side, three-quarter and pipe view at 1280x720 **and** 844x390,
  swimming and flared. Pass = fins stay attached while bending, no stub or
  body colour visible through fins, eyes read, fish ≥ 40 px long in the
  phone pipe view. Then the other outlines (shown side by side on `?fins=1`)
  and fintex-heavy; title art and icon come after the gate.

### The 20 fish (`data/fish.js`)

All fish play the same; lines are flavour only.

| # | Name | Fins | Body / fins | Pattern | Personality | Munch pitch / trail |
|---|---|---|---|---|---|---|
| 1 | Rust | halfmoon | deep red / red-violet, blue sheen | solid | "Proud and peckish." | 0 / red |
| 2 | Sky | veiltail | pale blue / cobalt | solid | "Daydreams mid-bite." | +2 / sky |
| 3 | Mango | plakat | orange / yellow | solid | "Loud and always hungry." | +4 / orange |
| 4 | Domino | halfmoon | black / white bands | butterfly | "Very fancy, very sure." | -2 / white |
| 5 | Kiwi | crowntail | lime / yellow tips | rim | "Spiky and cheerful." | +5 / lime |
| 6 | Marble | plakat | white / blue-red blotches | marble | "Never the same twice." | +1 / lilac |
| 7 | Cobalt | crowntail | royal blue | dragon | "Shiny armour, soft heart." | -3 / blue |
| 8 | Copper | halfmoon | copper / bronze | dragon | "Warm as a radiator." | -1 / copper |
| 9 | Ember | doubletail | red / orange bands | butterfly | "Two tails, twice the swagger." | +3 / ember |
| 10 | Koi | plakat | white / orange-black patches | koi | "Patchy and proud." | +2 / orange |
| 11 | Bronze | veiltail | gold-bronze | solid | "Moves like royalty." | -4 / gold |
| 12 | Rosette | halfmoon | pink / white edge | rim | "Twirls when happy." | +6 / pink |
| 13 | Mustard | doubletail | blue / mustard fins | rim | "Mixes colours boldly." | 0 / mustard |
| 14 | Galaxy | plakat | navy / white specks | marble | "Full of stars." | -2 / white |
| 15 | Neon | crowntail | cyan / magenta edge | rim | "Glows at parties." | +7 / cyan |
| 16 | Violet | veiltail | purple | solid | "Quietly dramatic." | -5 / violet |
| 17 | Avatar | halfmoon | steel blue | dragon | "Metal-scaled legend." | -1 / steel |
| 18 | Candy | doubletail | pink / teal patches | koi | "Sweet tooth, sweeter fins." | +5 / pink |
| 19 | Black Orchid | crowntail | black / violet edge | rim | "Mysterious nibbler." | -6 / violet |
| 20 | Opal | halfmoon | platinum / opal sheen | solid | "Shimmers like a pearl." | +8 / rainbow |

### The 19 ladies (`data/fish.js`, `body-female` + female outline)

Each echoes her son, muted (lower saturation, lighter).

| Lady | Son | Body / fins | Pattern |
|---|---|---|---|
| Pearl | Sky | pale grey-blue / soft blue | solid |
| Clover | Mango | peach / soft yellow | solid |
| Daisy | Domino | cream / grey bands | butterfly |
| Honey | Kiwi | honey / pale lime tips | rim |
| Willow | Marble | off-white / dusty lilac blotches | marble |
| Sunny | Cobalt | pale blue-grey / slate blue | dragon |
| Penny | Copper | tan / light copper | solid |
| Ginger | Ember | rust / peach bands | butterfly |
| Amber | Koi | cream / soft orange patches | koi |
| Maple | Bronze | muted gold / tan | solid |
| Hazel | Rosette | dusty pink / cream edge | rim |
| Cinnamon | Mustard | grey-blue / dull mustard | rim |
| Luna | Galaxy | slate navy / pale specks | marble |
| Nova | Neon | teal-grey / soft magenta edge | rim |
| Stella | Violet | lavender / dusty purple | solid |
| Iris | Avatar | steel grey / pale blue | dragon |
| Zinnia | Candy | soft pink / pale teal patches | koi |
| Aurora | Black Orchid | charcoal / plum edge | rim |
| Vega | Opal | pearl white / faint opal | solid |

### Enemies, props and models

Concept pictures (imagegen2, anchor as reference) for everything whose look
matters: snail, shrimp, crayfish, cat, bubble machine. Text prompts only for
small tank props, with `--texture-prompt "glossy stylized toy, soft saturated
colours"`. Every model gets `--height`, `--polycount` and `--max-texture 512`.
Enemies get an emissive rim/eye mask in code so they read in the dark.
Frightened / hit / returning use one shared tint uniform.

The cat is one sleeping pose from Meshy. Its ears turn in its vertex shader
about pivots stored in `data/props.js` (vertices within a radius of each ear
pivot); the swatting paw is code (ginger capsule + pale pad sphere) hidden
under the chest, swinging out on a hinge.

### Code-built objects

| Object | Shape | Colour / material | Motion |
|---|---|---|---|
| Bite | squashed icosphere r 0.09, instanced | #a0622d standard, rough 0.6; emissive 0.35 in W3 | bob 0.03, scale-to-0 when eaten |
| Brine shrimp | 5-segment curved capsule + halo sprite | #ff8a5c, emissive 0.4 | wiggle, halo pulse |
| Nest foam | instanced spheres r 0.04-0.09 | #f6fbff, rough 0.1, opacity 0.85 | pop-in one by one |
| Eggs | instanced spheres r 0.02 | #fff2cc, slight emissive | sparkle on lay |
| Fry | body-male x0.12, instanced (cloud of 30, 6 after becoming) | fish colours, muted | boids-lite school |
| Fish eyes | sphere, one InstancedMesh for all fish | black, rough 0.05 | follow head |
| Nest leaf | bent ellipse plane 0.8 | #8a5a2b, glow rim #ffe9a8 when it's a nest spot | bob |
| Feeder | floating ring + hopper | white plastic | bites drop out onto the surface |
| Filter + bubbles | box at back corner; bubble sprites | #dfe7ea | bubbles rise |
| Tank glass / lid | box panes (fresnel, BackSide), lid slab | mint rim, lid #33424a | none |
| Ribbon | small bow on lid | owner fish colour | flutter |
| Hanging tube | glass tube from lid, glowing mouth ring | tube material of the world | ring pulse |
| Valve gate | copper disc sliding across tube; red lamp | #c8743a metal 0.8 | slide 0.2 s, lamp blink, steam puff |
| Current stripes | chevron canvas texture on the back-wall strip | #f2e2c4 at 50% | scroll at current speed |
| Portal rings | torus r 0.5 | pair a/b magenta, c/d cyan, emissive | spin, pulse |
| Wrap mouths | tube end fading into a soft disc + arrows | world rim colour | arrows slide |
| Exit badge | round canvas sprite on a small post | icon + cost text | gentle bob |
| Player bubble | sphere r 0.35, thin-film fresnel shader | iridescent | vertex wobble |
| Bubble trails | sprite particles: default, hearts, stars, rings, sparkles, glow bubbles, rainbow | fish trail colour | rise, fade |
| Jellyfish | half-sphere dome + 4 ribbon tentacles | #e8e6ff translucent, emissive rim | pulse, tentacle wave |
| Cat paw | capsule + pad sphere | ginger / pale pink | hinge swing |
| Room | shelves (boxes), small tanks on shelves, lamp (cylinder + cone + warm point light), window plane, padlock (torus + box, gold) | wood texture, wallpaper | none |
| Grand Tank | 2 x 1 x 0.8 glass box on a table, gravel, plants | glass mint | collected fish swim inside |

### Tubes and the three world materials

Draw order (renderOrder): 0 backdrop (panorama on a far cylinder section,
slow parallax, 1.4x view) -> 1 back-wall strip (opaque, darker, one merged
mesh per maze) -> 2 opaque things (fish bodies, eyes, bites, enemies,
collars) -> 3 fins -> 4 tube shells (one merged geometry per maze, fresnel
rim, additive, depthWrite off) -> 5 particles.

| World | Back wall | Tube shell | Extra |
|---|---|---|---|
| Clearwater | pale teal, caustic scroll | mint #bff3ea fresnel rim | sunlight shafts on backdrop |
| Copperworks | warm brown | warm glass rim | opaque copper collars at every joint (instanced) |
| Neon Night | navy #10142e, dimmed outside the light pool | emissive magenta / cyan rim lines, always full brightness | bites and enemy eyes glow |

## Audio direction

- Music (instrumental, 120 s with a resolving ending, 1.5 s crossfade at the loop):
  - Tanks and title: gentle marimba, kalimba, soft pads, bubbly and warm.
  - Clearwater pipes: bouncy, sunny, plucky bass, light percussion, 120 bpm.
  - Copperworks pipes: warm brassy funk, clanky percussion, 110 bpm.
  - Neon Night pipes: dreamy synthwave, glowing arps, 100 bpm.
  - Bubble room: soft lo-fi jazz, piano and brushes.
  - Victory: short triumphant sting (15 s).
  - Nice: a second variation per pipe world (alternates each maze).
- Sound effects (42): bite nip, brine shrimp gulp, flare whoosh, flare-ending
  tick, hit bonk, bites scatter, re-grab sparkle, shoo bump, maze clear
  chime, star ding, enter tube whoosh, splash into tank, feeder plop, nest
  bubble pop, egg sparkle, hatch twinkle, grow-up fanfare, new fish jingle,
  frenzy fanfare, courtship shimmer, bubble machine bloop, wipe bloop, dock
  clunk, valve hiss, valve clunk, current rush (loop), portal shimmer, wrap
  swoosh, shrimp dart chirp, jelly pulse thrum, crayfish click, cat ear
  flick, cat swat, deny boop (can't afford), fry-news chime, fast travel
  whoosh, world card sting, UI click, UI back, tank ambience (loop), room
  ambience (loop), pipe ambience (loop, soft water hum).
- Reused: room food bubbles = bite nip pitched down 3 semitones + nest
  bubble pop; enemy swimming home = wrap swoosh at 40% volume; new trail
  card = star ding; "Back to the pipes" = enter tube whoosh.

## Asset list

| ID | What it is | Tool | Size and format | Transparent | Animation | Priority |
|---|---|---|---|---|---|---|
| anchor | Rust concept, side view, fins spread | imagegen2 | 1536x1024 PNG | no (white) | none | must |
| concept-body-male | platinum male body, fins removed, short rounded tail stub, smooth head, pure side | imagegen2 (anchor ref) | 1536x1024 PNG | no | none | must |
| concept-body-female | platinum female body, same rules | imagegen2 (anchor ref) | 1536x1024 PNG | no | none | must |
| body-male | model from concept | meshgen `--height 0.3 --polycount 6000 --max-texture 512` | GLB | n/a | code wave | must |
| body-female | model from concept | meshgen `--height 0.25 --polycount 6000 --max-texture 512` | GLB | n/a | code wave | must |
| fintex-fine | fine fin rays + membrane streaks, rays vertical, seamless left-right | imagegen2 -> `tools/tex.py` greyscale + seam blend | 1024 PNG -> 512 greyscale WebP | no (greyscale) | shader | must |
| fintex-heavy | heavy crowntail rays, same rules | imagegen2 -> `tools/tex.py` | same | no | shader | must |
| concept-snail / shrimp / crayfish / cat / bubble-machine | concept pictures | imagegen2 (anchor ref) | 1024 PNG | no | none | must (cat: should) |
| snail | mystery snail, golden shell | meshgen image `--height 0.3 --polycount 4000 --max-texture 512` | GLB | n/a | code | must |
| shrimp | cherry shrimp | meshgen image `--height 0.2 --polycount 4000 --max-texture 512` | GLB | n/a | code | must |
| crayfish | small blue crayfish | meshgen image `--height 0.25 --polycount 4000 --max-texture 512` | GLB | n/a | code | must |
| bubble-machine | toy bubble machine with ring nozzle | meshgen image `--height 0.4 --polycount 4000 --max-texture 512` | GLB | n/a | code spin | must |
| cat | sleeping ginger cat (ears turn in code; paw is code) | meshgen image `--height 0.3 --polycount 5000 --max-texture 512` | GLB | n/a | code | should |
| prop-anubias | anubias on a rock | meshgen text `--height 0.3 --polycount 4000 --max-texture 512` | GLB | n/a | code sway | should |
| prop-driftwood | driftwood branch | meshgen text `--height 0.25 --polycount 3000 --max-texture 512` | GLB | n/a | none | should |
| prop-cave | ceramic betta log | meshgen text `--height 0.15 --polycount 3000 --max-texture 512` | GLB | n/a | none | should |
| prop-castle | tiny aquarium castle | meshgen text `--height 0.3 --polycount 4000 --max-texture 512` | GLB | n/a | none | nice |
| armchair | cozy armchair | meshgen text `--height 1.0 --polycount 3000 --max-texture 512` | GLB | n/a | none | nice |
| jellyfish, fins, eyes, gills, cat paw, all of "Code-built objects" | | code | | | code | must |
| pano-clearwater | blurred sunny windowsill shelf all round, no fish tanks in focus | nanogen pro -> `tools/tex.py` seam blend | 4:1 2K JPG | no | tank cylinder + pipe backdrop | must |
| pano-copper | blurred warm boiler room all round | nanogen pro | 4:1 2K JPG | no | same | must |
| pano-neon | blurred dark aquarium shop, neon bokeh all round | nanogen pro | 4:1 2K JPG | no | same | must |
| tank-posters x4 | back-glass posters (plants, rocks, river, reef-like) | nanogen | 1536x768 JPG | no | none | should |
| tex-gravel | seamless gravel | nanogen | 1024 JPG | no | none | must |
| room-wall, room-floor | wallpaper, wood floor, seamless | nanogen | 1024 JPG | no | none | should |
| room-window | night window view | nanogen | 1024 JPG | no | none | nice |
| title-art | bettas and glowing pipes, after the gate, engine renders as reference | nanogen pro | 16:9 2K JPG | no | none | must |
| app-icon | betta face in a bubble, after the gate, engine render of Rust as reference | imagegen2 | 1024 PNG | no | none | must |
| icons-ui | heart, box, house, arrows, bubble, star, map, pause, padlock, arrow pips, rise/dive | code (SVG) | | yes | | must |
| font | Fredoka (OFL), already in `game/fonts/` | bundled | ttf | | | must |
| music x5 + sting | see audio direction | audiogen music | mp3 120 s (sting 15 s) | | loop + crossfade | must (sting: should) |
| music variations x3 | second pipe track per world | audiogen music | mp3 120 s | | loop | nice |
| sfx x42 | see audio direction | audiogen sfx | mp3 0.3-2 s (loops 5 s) | | | must/should |
| social-card | from game art | code + playwright | 1200x630 JPG | | | must |

Record every file's size in `design/ASSETS.md` (GLBs, textures, audio).

## Tech plan

```
game/
  index.html          canvas + HTML HUD/menus, import map for three
  vendor/             three r186 (module, core, addons), LICENSE
  src/
    main.js           boot, staged loading, mode switching, fixed-step loop, debug hook
    input.js          keyboard/mouse/touch -> actions; zones; turn buffer; clear on mode change
    audio.js          Web Audio: buffers, music loop crossfade, sfx, mute
    save.js           versioned save, migrations, debounce
    data/fish.js      20 fish + 19 ladies (fins, colours, pattern, name, line, pitch, trail)
    data/bodies.js    per body: fin base lines + spread vectors, eye spheres, gill/beard pivots
    data/props.js     cat ear pivots + radius, paw hinge
    data/worlds.js    nodes, edges, Z/N/M, feeders, maze side tables
    data/mazes.js     generated: grids, exit-to-exit shortest paths, covering routes
    fishmodel.js      bake (aAlong, aHeight, aFinRoot), merged fin geometry per style,
                      shared fishWave chunk, body + fin shaders, eyes, portraits
    modes/tank.js  modes/pipe.js  modes/room.js
    enemies.js        AI per type
    ui.js             HUD, toasts, map, collection, signs, minimap
  assets/ models/ pano/ tex/ fins/ audio/ fonts/
tools/
  mazes/*.txt         hand-authored mazes
  make-mazes.mjs      validate + fill + write data/mazes.js
  economy.mjs         economy sim, same rules as sim.py (asserts max reward gap <= 2 runs)
  sim.py, sim2.py     design-time economy model, sensitivity sweep, capacity check
  tex.py              Pillow: greyscale + seamless fin textures, panorama seam blend, WebP
```

### Maze format

One file per maze: a side table, `---`, then the grid (one char per cell).

```
id: nn-m3
name: Jelly Lanes
exits: 1=nn-m2:4 2=nn-lady-3 3=nn-m4:1
enemies: shrimp@S1 shrimp@S2 crayfish@S3 jelly@S4 loop=RRRRDDLLLLUU phase=0.5
valves: open 3 shut 3               # default for all G
valve G2: open 2 shut 4 phase 1.5   # optional per-valve override (reading order)
symmetric: yes                      # "no" only with a reason comment
---
#######2#######...
```

| Char | Meaning |
|---|---|
| `#` | wall (nothing drawn) |
| `.` | corridor with a bite |
| `_` | corridor, no bite |
| `o` | brine shrimp |
| `1`-`4` | exit mouth (on the border) |
| `W` | wrap mouth (left and right border, same row) |
| `a` `b` / `c` `d` | portal pairs (no bite; exit keeps your heading) |
| `>` `<` `^` `v` | current (with a bite) |
| `G` | valve (no bite) |
| `S` | enemy spawn (no bite; numbered by reading order) |
| `?` | let the generator fill this region |

Validator rules (make-mazes.mjs fails the build otherwise):

- Odd W x H; the border is wall except exits and wraps; exits never on a wrap row.
- Walls are mirror-symmetric left-right unless `symmetric: no`; exits are carved afterwards (exempt).
- No 2x2 open block; no dead ends except exit mouths.
- Bite target 55-70% of capacity; bite count within ±8% of target.
- Every portal is reachable on both sides; every exit reaches every other.
- Jelly loops start at their spawn, stay in corridors and return to it.
- BFS graph: currents are directed weighted edges (with 1/1.8, against
  1/0.45, across 1); valves passable with a wait cost of up to one cycle.
- Spawns ≥ 6 path cells from every exit.
- Writes each exit-to-exit shortest path and, per maze, a **covering route**
  (greedy chain of shortest paths visiting every bite cell, from each exit,
  ending at the nearest exit) as direction strings into `data/mazes.js`.

### Runtime

- **Loop:** requestAnimationFrame, fixed 1/60 s `update()` with an
  accumulator, gaps clamped. `__game.step(s)` freezes real time and runs
  `update(1/60)` round(s x 60) times (same step as play, unlike 3d.md's 1/30
  example), then renders.
- **Pipes:** cell + fraction movement (rules above), seeded randomness per maze.
  Bites: one InstancedMesh per maze, eaten = scale 0.
- **Rendering:** draw order above; MeshStandardMaterial elsewhere; one 1024
  shadow map in tanks only; pixel ratio max 2 (1.5 on coarse pointers);
  ≤ 3 draws per fish; draw calls < 150 per mode, Grand Tank with 20 fish
  included (check `renderer.info.render.calls`).
- **Mode switches:** `renderer.compileAsync(scene, camera)` for each mode's
  scene during loading (no first-use hitches); one body and one fin program
  for all fish; maze groups disposed (geometry, materials) on exit; clear
  input; save only once the new mode is stable.
- **Loading:** stage 1 (boot, < 20 MB): three, fonts, UI, body-male,
  body-female, fintex-fine/heavy, snail, shrimp, gravel, pano-clearwater,
  title music, sfx. Stage 2 (background after title): World 1 pipe music,
  tank props, room, cat, bubble machine, room music. Stage 3: World 2, World 3 assets.
- **Scaling:** full-window canvas; HUD in CSS with safe-area insets.
- **Audio, saving, install, offline:** as web-target.md (manifest landscape,
  sw.js, `?sw=1` locally).
- **URL flags:** `?fast=1` (Z/N/M = 1), `?seed=n`, `?fins=1` (fin tuning page, all styles side by side).
- **Debug hook** `window.__game`:

| Hook | Does |
|---|---|
| `state()` | mode, world, node, grid pos + dir, bites, eaten, tank states, collection, enemies, screen, queued turn |
| `step(s)` / `resume()` | fixed 1/60 updates; resume real time |
| `solve(from, to)` | autopilot along the stored shortest path through the real input layer until reaching exit `to` (waits for valves) |
| `sweep(maze, from, fraction)` | follows the covering route through the real input layer until `fraction` of the bites are eaten (1 = star 1), then the shortest path to the nearest exit |
| (both) | drive `step()` internally, render every 30 updates, return `{bitesEaten, hits, time, reached}` |
| `graph()` | all nodes, edges, exits, Z/N/M, feeders |
| `teleport(nodeId, exit?)` | go to a tank, maze exit, room or dock |
| `setTank(id, stage)` / `unlockDock(id)` | set progress for tests |
| `give(n)` / `eat(n)` | add to wallet / to wallet and eaten count |
| `levels()` | maze IDs |
| `perf()` | draw calls, triangles, textures, loaded bytes |
| `audioState()` | playing music, last sfx, muted |

## Cut list (in order)

1. Armchair, castle prop, room window picture.
2. Music variations (one track per world).
3. Bubble-trail styles beyond 2 (the rest reuse those with new colours; empties keep the big feeder).
4. Doubletail and veiltail outlines (those 6 fish use halfmoon / plakat outlines with their colours).
5. The cat (room keeps food bubbles; hazard becomes a slowly swinging lamp cord).
6. Portal rings (nn-m2 signature becomes a plain long ring road; nn-m4 uses jellies).
7. Tank posters (gradient + code plants).
8. Room music (reuse the tank theme).

Never cut: tanks, pipes, nests, fry, the collection of 20, three worlds, the
bubble room and Grand Tank, code fins and flare, world panoramas, the minimap
with exit icons, the economy check.

## Budget estimate

| Kind | Count | Est. |
|---|---|---|
| Meshy models | 12 (2 bodies, 5 from concepts, 5 props) x 30 + 4 retries + 2 remesh | ~490 credits, ~$9.80 |
| imagegen2 | anchor, 2 body concepts, 5 concepts, 2 fin textures, icon = 11 + ~8 retries | ~$4 (check price at start) |
| nanogen | 3 panoramas + title (pro), 4 posters, 4 textures = 12 + ~6 retries | ~$2 |
| Music | 5 x 120 s + 15 s sting + 3 variations (nice) + retries | ~$6.50 |
| Sound effects | 42 + ~10 retries at ~$0.12 | ~$6.25 |
| **Total** | | **~$29 of $50** (~$21 headroom) |

## Definition of done

- [ ] Starts with no errors at desktop (1280x720) and phone landscape (844x390).
- [ ] Boot download < 20 MB before the title (`perf()`); draw calls < 150 in every mode, including the Grand Tank with 20 fish; ≤ 3 draws per fish.
- [ ] `make-mazes.mjs` passes for all 19 mazes (incl. capacity 55-70%); `economy.mjs` passes (max gap ≤ 2 runs).
- [ ] `solve()` crosses every exit pair of every maze in both directions (85
  pairs, 170 runs) through the real input layer, no stuck states.
- [ ] `sweep(maze, 1, 1)` earns star 1 in every maze; `sweep(maze, 1, 0.6)` eats ≥ 60% in every maze.
- [ ] End-to-end run on `?fast=1` with real input: all 28 tanks, 25 nests (19 ladies + 6 empty),
  20 fish, 6 trails, all docks, victory plays.
- [ ] One run through World 1 with real numbers: every nest affordable within 2 maze runs.
- [ ] Feeders fill only on arrival from a pipe (fast travel, Become, dock don't); Frenzy starts when a world's lady nests are all built.
- [ ] Become / fast travel from a maze asks to confirm; the old fish's home follows the home rule; other worlds only once reached.
- [ ] Hits cost bites; the daze, scatter and safety work; nothing gets stuck in walls, valves, wipes or menus.
- [ ] Every control works with mouse, keyboard and touch (stick, swipes, rise/dive buttons, right-half look); first tips match the platform.
- [ ] Rust prototype passes the gate (side, three-quarter, pipe view at both sizes; swimming and flared; fins attached, no stub showing, fish ≥ 40 px on phone) before other outlines, fintex-heavy, title art and icon.
- [ ] Every screen looks finished at both sizes from the first load (Collection strip on phones); free look in tanks shows the world panorama; W3 enemies visible in the dark.
- [ ] Toasts fire for hatch / grow / dock unlock / Frenzy while away; signs, minimap and Map show costs and exits.
- [ ] Music loops without an audible seam; sound plays after first input; mute works.
- [ ] Save restores mid-world after reload; old/unknown fields migrate or drop safely.
- [ ] Installs as an app and works offline (`?sw=1`).

## Change 1: tank playability, nest celebration, Grand Maze, school

Request (exactly as typed): "Do each of the three Ideas for next you proposed and update the README to include the proposal and running of them, with this and them quoted as part of the making of. I like the tank, but I can't control the betta enough to feel like I'm swimming around, and can't easily get into the tube. We def need to improve the playability of this part as it should be key and its how you start."

### Tank controls (rework)

Problem: steering by pointer offset while holding the button felt indirect; the fish turned slowly; the camera hugged walls; the tube mouth was small and up behind the camera.

- **Point and swim (mouse and touch):** press on the tank and the fish swims toward the 3D spot under the pointer, for as long as you hold, following the pointer as it moves. A quick tap/click sets a waypoint (a ring ripple marks it) and the fish swims there and stops. Spots are found by raycasting against bites, the tube mouth, the nest leaf, fish, props and the tank walls/floor/surface (inside the water box). Tapping the tube mouth or its glow swims you up into it.
- **Keyboard, camera-relative:** W/Up swims away from the camera, S/Down toward it, A/D (Left/Right) turn left/right (the camera follows), Space rises, Shift dives. Holding W also pitches toward where the camera looks.
- **Look around:** right-drag (desktop) or a one-finger drag that starts on empty space and moves more than 12 px (touch). The camera eases back behind the fish 1.5 s after you let go.
- **Touch stick** stays (bottom-left), camera-relative, plus rise/dive buttons.
- **Snappier fish:** turn rate up to 4.5 rad/s, acceleration time ~0.2 s, cruise 4 u/s, 5.5 u/s after 1 s.
- **Camera:** 3.4 u behind and 1.2 u above the direction of travel, looking slightly ahead, kept inside the water and pulled toward the tank centre near walls (never a wall-filling view).
- **Tube:** capture radius 1.3 u around the mouth from below, plus a gentle pull when within 2.2 u and moving upward; the mouth ring glows brighter and a "To the pipes" label (or an edge arrow when off screen) always shows where it is. A "Back to the pipes" button is always available in a tank once the start-tank bites are eaten (autopilot, any input cancels).
- **First visit:** the fish starts facing the floating bites with the tube in view; the tip sequence is "Click (tap) where you want to swim" → "Eat the bites on top" → "Tap the tube, or swim up into it".

### Nest framing and celebration (idea 1)

- While building and courting, the camera moves to a framed view under the leaf at a 3/4 angle (leaf, foam, lady and fish all in shot) and eases back after.
- When the nest finishes: the foam flashes and settles, a ring of sparkles and confetti bubbles bursts from it, a celebration jingle (reuse `grown`) plays, the fish does a happy loop, and a card-free toast says "Bubble nest built!" (lady tanks: "Eggs laid! They hatch in N bites."). Reduce motion skips the camera move.

### The Grand Maze (idea 2)

- **Where:** a new exit (3) on nn-m7's top border leads to `nn-gm`, "The Grand Maze". Its sign shows a lock and "Grand Maze: 15 bettas (you have N)" until you've collected 15; the exit mouth is sealed (a glowing gate) until then. A toast fires when you reach 15: "The Grand Maze in Neon Night is open!".
- **The maze:** 31x17, dark, everything at once: a current loop, two valves, a portal pair, a wrap row, 2 jellies, 2 shrimp, 1 crayfish, 6 brine shrimp, ~200 bites. One exit (back to nn-m7).
- **The boss, King Claw:** a big glowing crayfish (1.8x size). It always chases you by the shortest path at 0.75 speed and costs 10 bites per hit. It can't be hurt normally; while you're flaring, bumping it stuns it (it flashes and swims home for 3 s). Three bumps and it gives up: it shrinks and scuttles off, 60 bites burst out, toast "You beat King Claw!", a gold star on the Map, and the "Crown" bubble trail (gold stars) unlocks. Flare lasts 6 s in the Grand Maze. Beating it is optional (not needed for the 20 fish).
- Saved: `grandWon`. Map shows the Grand Maze node (locked/unlocked/beaten).

### Your school (idea 3)

- In the pipes, up to 4 of your collected fish (most recent first, not the one you are) follow you in a line, each 0.9 cells behind the last along the exact path you swam, at 0.75 scale, wiggling and turning as you did. They are cosmetic: enemies ignore them. They vanish into the exit with you and pop out after you on arrival.
- Settings: "Your school follows you" on/off (default on). Draw calls: +3 per fish (≤ 12).

### Definition of done (change)

- [ ] A new player can, with the mouse alone and with touch alone, swim to every bite in the start tank and into the tube within 30 s (scripted with real input).
- [ ] Keyboard: W/A/S/D/Space/Shift steer camera-relatively; the tube is reachable.
- [ ] Nest celebration plays (empty and lady tanks), camera frames it, returns.
- [ ] nn-m7 exit 3 is sealed below 15 bettas and open at 15; the Grand Maze passes make-mazes; King Claw can be beaten; reward saved; solve() crosses nn-m7's new exit pairs.
- [ ] School follows in every world with no errors; off in Settings works.
- [ ] All 170+ exit pairs and the fast e2e run still pass.

## Change 2: solid enemies, flare on demand, tank life, prompts near the fish

Request (exactly as typed): "The enemies aren't threatening enough. They should block your passage and cause you to flinch back, so you can't just pass through them. They knock down your food amount. You can spend food to temporarily "flare" and when flared you can eat all enemies. Your line of fish should all fan out in any tank. All tanks should have a female betta. There should be a Tank Party button once you have five or more bettas that has all the bettas in the tank have a brief party. The button in the lower right is sometimes hard notice -- such commands should probably appear nearer the fish? It's too easy after entering a tank to accidentally go right back up the pipe. It's sometimes hard to get to the leaf, not sure if better controls or a bigger region or what."

### Solid enemies (pipes)

- Enemies are solid. Touching one (centres within 0.6 cell) while not flared: you **flinch back**: you reverse, are pushed back to the centre of the cell behind you, and are dazed for 0.35 s. You lose 3 / 5 / 8 bites (World 1 / 2 / 3; King Claw 10) unless you're in the 1.2 s safety after a hit. The enemy reverses too, so you separate. There is no passing through, even during safety: a flinch always happens.
- Half of the lost bites drop behind you along the corridor (as before) and can be re-grabbed for 4 s.
- Arriving in a maze: 1.5 s safety (no bite loss); enemies spawn ≥ 6 cells from exits.

### Flare on demand

- **Space or F** (desktop) or the **Flare** button (touch, bottom-right, 80 px, shows the cost) spends bites to flare: 6 / 10 / 15 bites (World 1 / 2 / 3, Grand Maze 15). Can't flare with too few bites (the button greys out and shows how many more you need; a "deny" sound).
- Brine shrimp still give a free flare.
- While flared (6 / 5 / 4.5 s; 6 s in the Grand Maze) enemies turn pale and flee, and touching one **eats** it: a chomp, a burst, +5 bites, and it reappears at its spawn 8 s later (faded in, harmless for 1 s). King Claw: eating him counts as a bump (three to beat him; one per flare).
- Desktop HUD: "Space: flare (6)" hint next to the bites counter in pipes.

### Tanks: your school, a female in every tank, Tank Party

- **Your school fans out:** in any tank, up to 4 of your collected bettas (the same ones that follow you in the pipes, minus any that already live in this tank) come out of the tube after you and spread out to swim around the tank.
- **A female betta in every tank:** lady tanks keep their lady. Home tanks and empty tanks get a friendly female who lives there (she doesn't lay eggs): Coral (Home Tank), Fern (Mossy Tank), Poppy (Pebble Tank), Saffron (Copperworks Home), Juniper (Kettle Tank), Marina (Hearth Tank), Tansy (Neon Night Home), Wren (Moonbeam Tank), Nell (Lantern Tank). Colours are muted like the other ladies.
- **Tank Party:** once you've collected 5 bettas, any tank offers "Tank Party!" (prompt near the fish when nothing else is offered, and a party button in the tank HUD). For 7 s every fish in the tank (you, your school, the female, residents, the young fish) swims a ring dance round the middle, the lights cycle colours, confetti bubbles and hearts burst, and a party jingle plays; the camera pulls back to show everyone. Then everyone goes back to swimming. Repeatable (8 s cooldown). Reduce motion keeps the camera still.

### Prompts near the fish

- In tanks and the room, the action ("Build bubble nest: 25 bites", "Become Sky", "Tank Party!", "Back to the pipes", "Dock") appears as a floating button just above your fish on screen (clamped inside the screen, clear of the top HUD), with the key shown on desktop ("E"). It's tappable and clickable. The bottom-right action button is gone in tanks and the room.

### Tube and leaf

- **No accidental re-entry:** arriving from a pipe, the fish pops out of the mouth heading down and away and drifts to 2.5 u below and beside it. The tube won't take you back until you've been more than 2.2 u from the mouth, and then only by swimming up into it, tapping it, or the "To the pipes" sign.
- **Easier leaf:** the nest action is offered anywhere within 3 u (horizontally) of the leaf in the upper half of the tank, and tapping the leaf or the "Nest spot" sign swims you right under it.

### Testing

- `__game.peaceful(true)` turns enemy collisions off for the exit-pair autopilot (it tests the maze graph, not dodging); separate scripted checks cover: a collision flinches and costs bites, safety stops repeat losses, spending bites flares, flared eats an enemy (+5) and it respawns, King Claw by eating.
- Tank checks: school count in tank, a female present in every tank type, Tank Party plays and ends, prompt is near the fish, arriving and swimming freely for 5 s never re-enters the tube, the nest action appears within 3 u of the leaf.
- All exit pairs and the fast e2e run pass.

## Change 3: bumps hurt more

Request (exactly as typed): "running into enemies should cause you to lose more food than it does, so it feels like more of s setback. not ridiculous, but i still don't care if i run into enemies."

- A bump (outside the 1.2 s safety) costs the world's base, 8 / 12 / 18 bites (was 3 / 5 / 8), plus 5% of the bites you're carrying, capped at 1.5x the base (12 / 18 / 27). King Claw: base 25 (was 10), cap 38. The numbers live in `RULES.hit` and `hitLoss` in worlds.js.
- Half the lost bites still drop behind you for 4 s, so a quick grab gets some back. Net loss per bump is about 4-6 / 6-9 / 9-14 bites: roughly a fifth of a typical maze, and more than a flare costs, so flaring when you're cornered is the smart move.
- A red "-N bites" pops up over your fish, so you feel the loss (a fade only, with Reduce motion).
- The bite pool has room for 128 dropped bites (was 64), because drops are bigger now.
- tools/economy.mjs models the new formula; every case passes (max reward gap 2 runs).
