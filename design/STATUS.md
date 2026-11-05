# Bubble Nest

## Requests

1. `--budget 50 We want a 3d game in which you play as a betta fish. The gameplay is arcade simple with some twists. You start able to 3d navigate with mouse or touch around your small tank looking around and nibbling some betta bites floating on the surface. But there's a water filled tube coming down from the top of your tank, and you can swim up into it. When you enter it, you're still 3d but it's basically mechanically be 2d, almost like Pac-Man, except you're swimming. A core mechanic is eating betta bites. The tubes are just a bunch of mazes, again similar to Pac Man difficulty, in which you can munch betta bites and avoid enemies and they branch like pipes or whatever, but they lead to other tanks. Some are empty, some include female bettas. If empty, and you have Z bites, you can claim it by making a bubble nest. If a female betta, you may also make a bubble nest, and then she'll lay a fry and they'll hatch after you gain N bites, and the fry grow up after you eat M more bites, and you can switch to being the fry if you want. Each time you be a new fish, it adds to your betta collection. There's a large network of pipes and passage gets harder and you need more more for the placeholder numbers I gave and they get longer and there are more enemies, but enemies mostly just cause you to lose bites somehow and you can't die. There little to know story, just a pipework of fish, food, and fun, swimming through tubes and getting new tanks and meeting lady fish and getting fry trying to collect all 20 fish or something. It's all bettas. After a while there'll be a pipe with a bubble machine, and if you swim in the betta is put in a 3d bubble they can "float" around a simple room, and it can "dock" at other bubble machines to enter other networks of pipes. There should be three "pipe worlds" with different styles and the like. So it's kinda 3d when you're in a tank, and when you're in the bubble, with 3d controls. But it's kinda simple 2d for the pipes, which is most of the game. Good luck!`

2. `--publish` → "I added it to DNS. Go ahead."
3. `Do each of the three Ideas for next you proposed and update the README to include the proposal and running of them, with this and them quoted as part of the making of. I like the tank, but I can't control the betta enough to feel like I'm swimming around, and can't easily get into the tube. We def need to improve the playability of this part as it should be key and its how you start.`
   The three ideas proposed in the first report:
   - `/gamegen --change make the tank camera frame the fish and the nest leaf better, and add a little celebration when the bubble nest finishes`
   - `/gamegen --change add a boss-style "Grand Maze" in Neon Night that opens once you have 15 bettas`
   - `/gamegen --change let collected fish follow you as a little school through the pipes`
   Notes sent while this change was being made:
   - `The social card / docs shouldn't mention Pac-Man at all. It's just pipes.`
   - `(other than where quoting my prompt)`
   - `don't mention the bubble floating fish room`
   - `the bubble that floats in 3d around the room to change worlds is a surprise :)`
   - `It says Pac-Man on https://synapticnoise.com/ right now for it`
   - `The README can mention it if it outlines game features, but shouldn't spoil it up front`

4. `--publish` → "We do want to keep the title links, but yes, we want all your updates."
5. `Let's remove "While it was being built, a few more notes came in: …" these bits` (README notes block removed)
6. `--change The enemies aren't threatening enough. They should block your passage and cause you to flinch back, so you can't just pass through them. They knock down your food amount. You can spend food to temporarily "flare" and when flared you can eat all enemies. Your line of fish should all fan out in any tank. All tanks should have a female betta. There should be a Tank Party button once you have five or more bettas that has all the bettas in the tank have a brief party. The button in the lower right is sometimes hard notice -- such commands should probably appear nearer the fish? It's too easy after entering a tank to accidentally go right back up the pipe. It's sometimes hard to get to the leaf, not sure if better controls or a bigger region or what.`

## Settings

- 3D: yes (asked for in so many words)
- Platform: both (desktop + phone), landscape
- Target: web (three.js, vendored from meshgen)
- Scope: large (three worlds, ~20 fish, a network of tanks and mazes)
- Budget: $50
- Rounds: 2
- Folder: the project folder (was empty)
- Credit: Rich Conlan (from GitHub)
- Available: imagegen2, nanogen, audiogen (paid plan: 128 kbps worked; no credit line), meshgen (2,497 credits), playwright-cli, Pillow (installed this run)

## Published

- Requests: `--publish` (DNS added by the person: "I added it to DNS. Go ahead.")
- Live at https://bubblenest.synapticnoise.com (HTTPS on), repo zeveck/bubble-nest, listed first on synapticnoise.com. Credit confirmed: Rich Conlan.

- Update published (Change 1 + the title-screen corner links): "We do want to keep the title links, but yes, we want all your updates."

## Phases

- [x] 1 Brief: written (BRIEF.md)
- [x] 2 Design: Bubble Nest, large, 3 worlds, 20 fish
- [x] 3 Design review: 2 rounds, 57 findings fixed; converged
- [x] 4 Assets: anchor, 2 fish bodies, 10 models, 3 panoramas + textures + posters, title art, icon, 9 music, 42 sfx. ~$21.33 of $50
- [x] 5 Build: done. Written: fishmodel, input, audio, progress, assets, fx, world3d, tank, pipe, room, ui, main, style, manifest, sw. Mazes/worlds data in (tools/make-mazes.mjs, economy.mjs pass). Playable core + content + screens done: solve() crosses all 170 exit pairs; ?fast=1 e2e reaches victory (20 fish, all docks). Next: visual polish, phone, tips.
- [x] 6 Play-test: solve() 170/170 exit pairs; fast e2e to victory; World 1 sweeps at 60% (~1 nest per maze); first-load filmstrip fixed (static loading screen)
- [x] 7 Final review: playtester (10 should/nice, no must) + bug hunter (1 must: victory skippable; 8 others) — all fixed; re-verifying with e2e
- [x] 8 Polish pass: 12 findings fixed (see REVIEW_LOG)
- [x] 9 Wrap up: social card, README + screenshots, Pages workflow, served on http://localhost:8000

## Notes

- Phase 4 started early on the fish (anchor, 2 bodies done). Fish prototype (code fins, recolour) works in game/fishlab.html; procedural fin rays look good, so the two fintex images are skipped unless polish shows a need.

## Change 1 (tested: mouse-only, touch-only and keyboard tank runs; Grand Maze lock + King Claw win; school in all worlds)

- [x] Tank controls + tube access
- [x] Tank camera framing + nest celebration
- [x] Grand Maze (Neon Night, 15 bettas, boss)
- [x] School follows you in pipes
- [x] README making-of + screenshots
- [x] Play-test, regression (174 pairs, fast e2e to victory, live check)

## Change 2 (in progress)

- [x] Design + one review round
- [x] Solid enemies: block, flinch back, knock bites
- [x] Flare on demand (spend bites); flared = eat enemies
- [x] School fans out in tanks; a female betta in every tank
- [x] Tank Party (5+ bettas)
- [x] Prompts near the fish
- [x] No accidental tube re-entry; easier leaf
- [ ] Sounds (chomp, party), README, regression, local serve
