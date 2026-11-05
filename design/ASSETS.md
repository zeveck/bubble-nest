# Assets

Prices (noted 2026-11-04): imagegen2 (gpt-image-2.5, token-priced; ~1.4k output image tokens for 1536x1024 high) estimated at $0.10 per image incl. reference-image input (rounded up). nanogen: flash 1K $0.034, 2K $0.05; pro $0.134. Meshy: ~$0.02/credit. audiogen: ~$0.30/min music, ~$0.12/sfx.

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| anchor | game/assets/style-anchor.png | imagegen2 sunburst high | Rust halfmoon, side view (take 2, stylized, ref take 1) | 2 | $0.20 |
| concept-body-male | .gamegen/candidates/concept-body-male.png | imagegen2 sunburst high | finless platinum male body, anchor ref | 1 | $0.10 |
| concept-body-female | .gamegen/candidates/concept-body-female.png | imagegen2 sunburst high | finless platinum female body, anchor ref | 1 | $0.10 |

| body-male | game/assets/models/body-male.glb (3.6 MB) | meshgen image | finless male body, 6k tris | 1 | 30 cr = $0.60 |
| body-female | game/assets/models/body-female.glb (3.5 MB) | meshgen image | finless female body, 6k tris | 1 | 30 cr = $0.60 |

| pano-clearwater/copper/neon | game/assets/bg/pano-*.jpg (105-168 KB) | nanogen pro | blurred rooms, 21:9 cut to 4:1, seam-blended | 2 each | $0.80 |
| gravel | game/assets/tex/gravel.jpg (244 KB) | nanogen flash | seamless gravel | 2 | $0.07 |
| poster-1..4 | game/assets/bg/poster-*.jpg (~80 KB) | nanogen flash | blurred underwater posters | 5 | $0.17 |
| room-wall, room-floor, room-window | game/assets/tex, bg (90-142 KB) | nanogen flash | wallpaper, floor, night window | 3 | $0.10 |
| music x9 | game/assets/audio/music/*.mp3 (1.9 MB each; victory 235 KB) | audiogen | 5 themes + victory sting + 3 variations, 120 s | 9 | $4.88 |
| sfx x42 | game/assets/audio/sfx/*.mp3 (9-80 KB) | audiogen | all listed effects incl. 4 ambience loops | 42 | $5.04 |

ElevenLabs plan: paid (default 128 kbps output worked) → no credit line needed.

| concepts x5 | .gamegen/candidates/concepts/*.png | imagegen2 | snail, shrimp, crayfish, bubble machine, cat (anchor ref) | 5 | $0.50 |
| snail, shrimp, crayfish, bubble-machine, cat | game/assets/models/*.glb (0.31-0.43 MB) | meshgen image | from concepts, 512 px textures | 1 each | 150 cr = $3.00 |
| prop-anubias, prop-driftwood, prop-cave | game/assets/models (0.22-0.37 MB) | meshgen text | remade with colours in texture prompt | 2 each | 180 cr = $3.60 |
| prop-castle, armchair | game/assets/models (0.21-0.39 MB) | meshgen text | | 1 each | 60 cr = $1.20 |

Fish bodies re-packed with 768 px textures (tools/shrinkglb.py).

Running total: $20.96 (Meshy credits used: 450)
| app-icon | game/icon-*.png, favicon, apple-touch-icon | imagegen2 sunburst high | Rust in a bubble, engine render ref | 1 | $0.10 |
| title-art | game/assets/bg/title-art.jpg | nanogen pro 2K | 3 bettas + glass pipes (take 2; take 1 copied test renders) | 2 | $0.27 |

Running total: $21.33 (Meshy credits used: 450). Style anchor kept as game/assets/style-anchor.jpg (768 px).

**Final total: about $21.33 of $50** (images ~$1.95, Meshy 450 credits = $9.00, audio ~$9.92, concept/icon images ~$0.46). Meshy credits left: ~2,047.

### Change 2

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| chomp | game/assets/audio/sfx/chomp.mp3 | audiogen sfx | cartoon underwater chomp (eating an enemy) | 1 | $0.12 |
| flinch | game/assets/audio/sfx/flinch.mp3 | audiogen sfx | cartoon boing bounce (flinching off an enemy) | 1 | $0.12 |
| music-party | game/assets/audio/music/music-party.mp3 | audiogen music | 10 s underwater dance-party jingle | 1 | $0.05 |

Change 2 total: about $0.29 (budget $20).

## Change 4

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| music-flare-clearwater | game/assets/audio/music/music-flare-clearwater.mp3 (29.1 s) | audiogen music | sunny brass/steel-drum/marimba gallop, 150 bpm, full energy from beat 1 (take 1 came out at 120 bpm); trailing silence cut | 2 | $0.30 |
| music-flare-copper | game/assets/audio/music/music-flare-copper.mp3 (27.8 s) | audiogen music | hot funk horns, punchy drums, clanky metal percussion, 140 bpm; both takes stopped at ~28 s, take 2 cut at the stop | 2 | $0.30 |
| music-flare-neon | game/assets/audio/music/music-flare-neon.mp3 (30.0 s) | audiogen music | driving synthwave, bright arps, gated drums, 128 bpm, plays to the end | 1 | $0.15 |
| flare-go | game/assets/audio/sfx/flare-go.mp3 (1.0 s) | audiogen sfx | bubbly whoosh rising into a bright power-chord hit; +6.7 dB to match flare.mp3 | 1 | $0.12 |
| found | game/assets/audio/sfx/found.mp3 (1.5 s) | audiogen sfx | glass bubble pop then happy twinkly chime | 1 | $0.12 |
| flare-stored | game/assets/audio/sfx/flare-stored.mp3 (0.8 s) | audiogen sfx | rising charge-up sparkle (free flare saved) | 1 | $0.12 |

All instrumental, 128 kbps, starts trimmed to the first hit (ffmpeg). Takes in .gamegen/candidates/audio4/.

Change 4 total: about $1.11 (budget $20).
