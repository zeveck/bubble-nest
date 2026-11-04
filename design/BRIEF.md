# Brief: Bubble Nest

**In one sentence:** You're a betta fish who swims up out of a little tank into a
glowing network of water tubes, munching trails of betta bites, finding new
tanks, building bubble nests, raising fry and becoming them, until you've
collected all 20 bettas.

**The feeling:** cozy, bright, a bit greedy, gently collect-'em-all. No death, no
stress, no story to read. Just "ooh, what's down that pipe?" and "one more fry".

## What they asked for

- [ ] 3D game, you play as a betta fish. It's all bettas (all fish characters are bettas).
- [ ] Arcade simple, with some twists.
- [ ] Start in your small tank: 3D navigation with mouse or touch, looking around.
- [ ] Nibble betta bites floating on the tank's surface.
- [ ] A water-filled tube comes down from the top of the tank; swim up into it.
- [ ] Inside the tubes: still rendered in 3D, but mechanically 2D, "almost like Pac-Man", swimming.
- [ ] Core mechanic: eating betta bites.
- [ ] Tubes are mazes, "similar to Pac Man difficulty": munch bites, avoid enemies; they branch like pipes.
- [ ] The tubes lead to other tanks: some empty, some with a female betta.
- [ ] Empty tank + Z bites: claim it by making a bubble nest.
- [ ] Female tank: make a bubble nest, she lays fry, they hatch after you gain N more bites, they grow up after M more bites, and you can switch to being the grown fry.
- [ ] Each new fish you become adds to your betta collection.
- [ ] Large pipe network; it gets harder further in: Z, N, M grow, mazes get longer, more enemies.
- [ ] Enemies make you lose bites "somehow"; you can't die.
- [ ] Little to no story: "a pipework of fish, food, and fun".
- [ ] Collect all 20 fish "or something" (loose: 20 is the target, we keep 20).
- [ ] "After a while": a pipe with a bubble machine; swim in and the betta is put in a 3D bubble, floats around a simple room (3D controls), and docks at other bubble machines to enter other pipe networks.
- [ ] Three pipe worlds with different styles "and the like" (loose: style plus a mechanical twist each).
- [ ] 3D in the tanks and the bubble; simple 2D in the pipes, which is most of the game.
- [ ] Placeholder numbers Z, N, M: we choose real ones per world.

## Who, where, how long

- Anyone, kids to adults; casual players who like classic arcade mazes and collecting.
- Desktop (mouse + keyboard) and phones (touch), landscape.
- Sessions of 5 to 20 minutes; the full collection takes about an hour or more.
  Progress saves automatically.

## Style references

None given. Our own direction: bright, glossy, toy-like 3D. Jewel-toned bettas with
flowing, translucent fins; clean aquarium glass and greenery. Each world has its
own pipe material and backdrop: clear glass, warm copper, glowing neon.
Borrow the feel of classic arcade mazes: grid mazes with looping corridors, trails of food, a
power-up that turns the tables, enemies with simple distinct chase personalities, wrap-around
tunnels. Copy no existing game's look, characters, names, sounds or maze layouts.

## Settings and decisions made on their behalf

- 3D web game (three.js, vendored), desktop and phone, landscape, budget $50, large scope.
- Name: "Bubble Nest" (the game's signature act).
- Losing bites: a hit knocks a few bites out of you; they scatter and can be
  re-grabbed for a moment (so a hit stings but rarely ruins anything).
- The bite counters for hatching (N) and growing (M) count every bite you eat
  anywhere, so fry grow while you explore.
- The power pellet twist: a "brine shrimp" treat makes your betta flare its gills,
  and enemies flee and can be bumped for bonus bites.
- Credit: Rich Conlan.
