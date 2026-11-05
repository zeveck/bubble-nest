// Bubble Nest world graph (design/GAME_DESIGN.md, "Structure and difficulty").
// Stable string IDs are used by save, Map and tests. Maze grids live in mazes.js.
// Exit targets: a node id, or "<maze>:<exit>" for an exit of another maze.

// Rules shared by every world (speeds in "you" units: 1.0 = 4 cells/s).
export const RULES = {
  cellsPerSecond: 4,
  startBites: 8,                       // the start tank opens with 8 bites floating on the surface
  feederPerEmpty: 2,                   // every claimed empty tank (any world) adds 2 to every feeder
  frenzy: { mul: 2, when: 'all lady nests in the world built', counts: 'bites eaten in that world toward hatch/grow' },
  arriveSafety: 1.5, hitDaze: 0.4, hitSafety: 1.5, hitDropFraction: 0.5, hitDropFade: 4,
  flareBumpBonus: 5, frightenedSpeed: 0.6, bumpedHomeSpeed: 1.5, bumpedRest: 5,
  currents: { with: 1.8, against: 0.45, across: 1.0 },
  valves: { open: 3, shut: 3, warn: 0.5 },
  darkness: { lightRadius: 3 },
  portals: { keepHeading: true, enemiesUse: false },
  enemies: {
    snail: { speed: 0.45 },
    shrimp: { speed: 0.85, dartSpeed: 1.1, dartTime: 1.5, sight: 6, tell: 0.3 },
    crayfish: { speed: 0.8, aimAhead: 3, rest: 4, restEvery: 10 },
    jelly: { speed: 0.6, pulseEvery: 2.5, pulseTime: 0.6, stingReach: 1, tell: 0.4 },
  },
  refillDelay: 20,                     // nn-m7: eaten rows refill 20 s later (extra, not needed for star 1)
  room: { foodBubbles: 24, catCost: 5 },
  hit: { pile: 0.05, cap: 1.5, king: 25 }, // a bump costs the world's hitLoss + pile x bites carried, at most cap x hitLoss; King Claw's base is king
  sim: { eatFraction: 0.6, hitRecovered: 0.5, maxRewardGap: 2 },
};

export const WORLDS = [
  {id: "cw", name: "Clearwater", setting: "clear glass pipes on a sunny windowsill shelf", home: "cw-home", hitLoss: 8, flareTime: 6, clearBonus: 10, cleanBonus: 10, feederHome: 8, feederEmpty: 20, feederPerEmpty: 2, frenzyMul: 2, simHitsPerRun: 1, dock: "dock-cw", machine: "cw-bm", mazes: ["cw-m1", "cw-m2", "cw-m3", "cw-m4", "cw-m5", "cw-m6"], tanks: ["cw-home", "cw-lady-1", "cw-empty-1", "cw-lady-2", "cw-lady-3", "cw-lady-4", "cw-empty-2", "cw-lady-5", "cw-lady-6"]},
  {id: "cp", name: "Copperworks", setting: "glass pipes in copper fittings, a warm boiler room", home: "cp-home", hitLoss: 12, flareTime: 5, clearBonus: 20, cleanBonus: 20, feederHome: 12, feederEmpty: 30, feederPerEmpty: 2, frenzyMul: 2, simHitsPerRun: 1.5, dock: "dock-cp", machine: "cp-bm", mazes: ["cp-m1", "cp-m2", "cp-m3", "cp-m4", "cp-m5", "cp-m6"], tanks: ["cp-home", "cp-lady-1", "cp-lady-2", "cp-empty-1", "cp-lady-3", "cp-lady-4", "cp-lady-5", "cp-empty-2", "cp-lady-6"]},
  {id: "nn", name: "Neon Night", setting: "neon-rimmed pipes in a dark aquarium shop after hours", home: "nn-home", hitLoss: 18, flareTime: 4.5, clearBonus: 30, cleanBonus: 30, feederHome: 16, feederEmpty: 40, feederPerEmpty: 2, frenzyMul: 2, simHitsPerRun: 2, dock: "dock-nn", machine: null, mazes: ["nn-m1", "nn-m2", "nn-m3", "nn-m4", "nn-m5", "nn-m6", "nn-m7", "nn-gm"], tanks: ["nn-home", "nn-lady-1", "nn-lady-2", "nn-empty-1", "nn-lady-3", "nn-lady-4", "nn-lady-5", "nn-empty-2", "nn-lady-6", "nn-lady-7"]},
];

export const NODES = {
  'cw-m1': {id: "cw-m1", type: "maze", world: "cw", name: "Ripple Run", exits: {"1":"cw-home", "2":"cw-lady-1", "3":"cw-m2:1"}},
  'cw-m2': {id: "cw-m2", type: "maze", world: "cw", name: "Twin Loops", exits: {"1":"cw-m1:3", "2":"cw-empty-1", "3":"cw-lady-2", "4":"cw-m3:1"}},
  'cw-m3': {id: "cw-m3", type: "maze", world: "cw", name: "Wraparound", exits: {"1":"cw-m2:4", "2":"cw-lady-3", "3":"cw-m4:1"}},
  'cw-m4': {id: "cw-m4", type: "maze", world: "cw", name: "Lily Pads", exits: {"1":"cw-m3:3", "2":"cw-lady-4", "3":"cw-empty-2", "4":"cw-m5:1"}},
  'cw-m5': {id: "cw-m5", type: "maze", world: "cw", name: "Sun Spiral", exits: {"1":"cw-m4:4", "2":"cw-lady-5", "3":"cw-m6:1"}},
  'cw-m6': {id: "cw-m6", type: "maze", world: "cw", name: "Windowsill Wide", exits: {"1":"cw-m5:3", "2":"cw-lady-6", "3":"cw-bm"}},
  'cw-home': {id: "cw-home", type: "tank", world: "cw", kind: "home", name: "Home Tank", depth: -1, maze: "cw-m1", exit: 1, feeder: 8, bubbleOut: true, start: true, startFish: "rust"},
  'cw-lady-1': {id: "cw-lady-1", type: "tank", world: "cw", kind: "lady", name: "Pearl's Tank", depth: 0, maze: "cw-m1", exit: 2, Z: 20, N: 20, M: 30, lady: "pearl", son: "sky", feeder: 8},
  'cw-empty-1': {id: "cw-empty-1", type: "tank", world: "cw", kind: "empty", name: "Mossy Tank", depth: 1, maze: "cw-m2", exit: 2, Z: 25, feeder: 20, trail: "hearts"},
  'cw-lady-2': {id: "cw-lady-2", type: "tank", world: "cw", kind: "lady", name: "Clover's Tank", depth: 2, maze: "cw-m2", exit: 3, Z: 35, N: 25, M: 35, lady: "clover", son: "mango", feeder: 8},
  'cw-lady-3': {id: "cw-lady-3", type: "tank", world: "cw", kind: "lady", name: "Daisy's Tank", depth: 3, maze: "cw-m3", exit: 2, Z: 50, N: 30, M: 40, lady: "daisy", son: "domino", feeder: 8},
  'cw-lady-4': {id: "cw-lady-4", type: "tank", world: "cw", kind: "lady", name: "Honey's Tank", depth: 4, maze: "cw-m4", exit: 2, Z: 55, N: 35, M: 45, lady: "honey", son: "kiwi", feeder: 8},
  'cw-empty-2': {id: "cw-empty-2", type: "tank", world: "cw", kind: "empty", name: "Pebble Tank", depth: 5, maze: "cw-m4", exit: 3, Z: 45, feeder: 20, trail: "stars"},
  'cw-lady-5': {id: "cw-lady-5", type: "tank", world: "cw", kind: "lady", name: "Willow's Tank", depth: 6, maze: "cw-m5", exit: 2, Z: 70, N: 40, M: 50, lady: "willow", son: "marble", feeder: 8},
  'cw-lady-6': {id: "cw-lady-6", type: "tank", world: "cw", kind: "lady", name: "Sunny's Tank", depth: 7, maze: "cw-m6", exit: 2, Z: 75, N: 45, M: 55, lady: "sunny", son: "cobalt", feeder: 8},
  'cw-bm': {id: "cw-bm", type: "machine", world: "cw", name: "Bubble Machine", maze: "cw-m6", exit: 3, unlocks: "dock-cp"},
  'cp-m1': {id: "cp-m1", type: "maze", world: "cp", name: "Downstream", exits: {"1":"cp-home", "2":"cp-lady-1", "3":"cp-m2:1", "4":"cp-m4:4"}},
  'cp-m2': {id: "cp-m2", type: "maze", world: "cp", name: "Steam Gates", exits: {"1":"cp-m1:3", "2":"cp-lady-2", "3":"cp-empty-1", "4":"cp-m3:1"}},
  'cp-m3': {id: "cp-m3", type: "maze", world: "cp", name: "Crayfish Corner", exits: {"1":"cp-m2:4", "2":"cp-lady-3", "3":"cp-m4:1"}},
  'cp-m4': {id: "cp-m4", type: "maze", world: "cp", name: "Pressure Loop", exits: {"1":"cp-m3:3", "2":"cp-lady-4", "3":"cp-m5:1", "4":"cp-m1:4"}},
  'cp-m5': {id: "cp-m5", type: "maze", world: "cp", name: "Boiler Maze", exits: {"1":"cp-m4:3", "2":"cp-lady-5", "3":"cp-empty-2", "4":"cp-m6:1"}},
  'cp-m6': {id: "cp-m6", type: "maze", world: "cp", name: "Copper Crown", exits: {"1":"cp-m5:4", "2":"cp-lady-6", "3":"cp-bm"}},
  'cp-home': {id: "cp-home", type: "tank", world: "cp", kind: "home", name: "Copperworks Home", depth: -1, maze: "cp-m1", exit: 1, feeder: 12, bubbleOut: true},
  'cp-lady-1': {id: "cp-lady-1", type: "tank", world: "cp", kind: "lady", name: "Penny's Tank", depth: 0, maze: "cp-m1", exit: 2, Z: 85, N: 50, M: 60, lady: "penny", son: "copper", feeder: 12},
  'cp-lady-2': {id: "cp-lady-2", type: "tank", world: "cp", kind: "lady", name: "Ginger's Tank", depth: 1, maze: "cp-m2", exit: 2, Z: 95, N: 55, M: 65, lady: "ginger", son: "ember", feeder: 12},
  'cp-empty-1': {id: "cp-empty-1", type: "tank", world: "cp", kind: "empty", name: "Kettle Tank", depth: 2, maze: "cp-m2", exit: 3, Z: 80, feeder: 30, trail: "rings"},
  'cp-lady-3': {id: "cp-lady-3", type: "tank", world: "cp", kind: "lady", name: "Amber's Tank", depth: 3, maze: "cp-m3", exit: 2, Z: 110, N: 60, M: 70, lady: "amber", son: "koi", feeder: 12},
  'cp-lady-4': {id: "cp-lady-4", type: "tank", world: "cp", kind: "lady", name: "Maple's Tank", depth: 4, maze: "cp-m4", exit: 2, Z: 120, N: 65, M: 75, lady: "maple", son: "bronze", feeder: 12},
  'cp-lady-5': {id: "cp-lady-5", type: "tank", world: "cp", kind: "lady", name: "Hazel's Tank", depth: 5, maze: "cp-m5", exit: 2, Z: 130, N: 70, M: 80, lady: "hazel", son: "rosette", feeder: 12},
  'cp-empty-2': {id: "cp-empty-2", type: "tank", world: "cp", kind: "empty", name: "Hearth Tank", depth: 6, maze: "cp-m5", exit: 3, Z: 110, feeder: 30, trail: "sparkles"},
  'cp-lady-6': {id: "cp-lady-6", type: "tank", world: "cp", kind: "lady", name: "Cinnamon's Tank", depth: 7, maze: "cp-m6", exit: 2, Z: 145, N: 75, M: 85, lady: "cinnamon", son: "mustard", feeder: 12},
  'cp-bm': {id: "cp-bm", type: "machine", world: "cp", name: "Bubble Machine", maze: "cp-m6", exit: 3, unlocks: "dock-nn"},
  'nn-m1': {id: "nn-m1", type: "maze", world: "nn", name: "Lights Out", exits: {"1":"nn-home", "2":"nn-lady-1", "3":"nn-m2:1", "4":"nn-m6:4"}},
  'nn-m2': {id: "nn-m2", type: "maze", world: "nn", name: "Ring Road", exits: {"1":"nn-m1:3", "2":"nn-lady-2", "3":"nn-empty-1", "4":"nn-m3:1"}},
  'nn-m3': {id: "nn-m3", type: "maze", world: "nn", name: "Jelly Lanes", exits: {"1":"nn-m2:4", "2":"nn-lady-3", "3":"nn-m4:1"}},
  'nn-m4': {id: "nn-m4", type: "maze", world: "nn", name: "Mirror Hall", exits: {"1":"nn-m3:3", "2":"nn-lady-4", "3":"nn-m5:1"}},
  'nn-m5': {id: "nn-m5", type: "maze", world: "nn", name: "Glow Garden", exits: {"1":"nn-m4:3", "2":"nn-lady-5", "3":"nn-empty-2", "4":"nn-m6:1"}},
  'nn-m6': {id: "nn-m6", type: "maze", world: "nn", name: "Night Market", exits: {"1":"nn-m5:4", "2":"nn-lady-6", "3":"nn-m7:1", "4":"nn-m1:4"}},
  'nn-m7': {id: "nn-m7", type: "maze", world: "nn", name: "Midnight Snack", exits: {"1":"nn-m6:3", "2":"nn-lady-7", "3":"nn-gm:1"}},
  'nn-gm': {id: "nn-gm", type: "maze", world: "nn", name: "The Grand Maze", exits: {"1":"nn-m7:3"}, locked: {bettas: 15}, boss: "king"},
  'nn-home': {id: "nn-home", type: "tank", world: "nn", kind: "home", name: "Neon Night Home", depth: -1, maze: "nn-m1", exit: 1, feeder: 16, bubbleOut: true},
  'nn-lady-1': {id: "nn-lady-1", type: "tank", world: "nn", kind: "lady", name: "Luna's Tank", depth: 0, maze: "nn-m1", exit: 2, Z: 150, N: 80, M: 90, lady: "luna", son: "galaxy", feeder: 16},
  'nn-lady-2': {id: "nn-lady-2", type: "tank", world: "nn", kind: "lady", name: "Nova's Tank", depth: 1, maze: "nn-m2", exit: 2, Z: 160, N: 85, M: 95, lady: "nova", son: "neon", feeder: 16},
  'nn-empty-1': {id: "nn-empty-1", type: "tank", world: "nn", kind: "empty", name: "Moonbeam Tank", depth: 2, maze: "nn-m2", exit: 3, Z: 140, feeder: 40, trail: "glow-bubbles"},
  'nn-lady-3': {id: "nn-lady-3", type: "tank", world: "nn", kind: "lady", name: "Stella's Tank", depth: 3, maze: "nn-m3", exit: 2, Z: 180, N: 90, M: 100, lady: "stella", son: "violet", feeder: 16},
  'nn-lady-4': {id: "nn-lady-4", type: "tank", world: "nn", kind: "lady", name: "Iris's Tank", depth: 4, maze: "nn-m4", exit: 2, Z: 190, N: 95, M: 105, lady: "iris", son: "avatar", feeder: 16},
  'nn-lady-5': {id: "nn-lady-5", type: "tank", world: "nn", kind: "lady", name: "Zinnia's Tank", depth: 5, maze: "nn-m5", exit: 2, Z: 200, N: 100, M: 110, lady: "zinnia", son: "candy", feeder: 16},
  'nn-empty-2': {id: "nn-empty-2", type: "tank", world: "nn", kind: "empty", name: "Lantern Tank", depth: 6, maze: "nn-m5", exit: 3, Z: 170, feeder: 40, trail: "rainbow"},
  'nn-lady-6': {id: "nn-lady-6", type: "tank", world: "nn", kind: "lady", name: "Aurora's Tank", depth: 7, maze: "nn-m6", exit: 2, Z: 220, N: 105, M: 115, lady: "aurora", son: "orchid", feeder: 16},
  'nn-lady-7': {id: "nn-lady-7", type: "tank", world: "nn", kind: "lady", name: "Vega's Tank", depth: 8, maze: "nn-m7", exit: 2, Z: 230, N: 110, M: 120, lady: "vega", son: "opal", feeder: 16},
};

export const DOCKS = [
  { id: 'dock-cw', world: 'cw', lands: 'cw-home', unlockedBy: null },
  { id: 'dock-cp', world: 'cp', lands: 'cp-home', unlockedBy: 'cw-bm' },
  { id: 'dock-nn', world: 'nn', lands: 'nn-home', unlockedBy: 'cp-bm' },
];

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map(w => [w.id, w]));
