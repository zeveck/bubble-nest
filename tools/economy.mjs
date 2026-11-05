#!/usr/bin/env node
// Bubble Nest economy check: same model as tools/sim.py, but reads the real data
// (game/src/data/worlds.js for Z/N/M/feeders/hits, game/src/data/mazes.js for bite counts).
// Income per maze run = frac*bites - hits*loss/2 (half of each hit re-grabbed).
// Feeders: only the tank you ARRIVE IN from a pipe refills; home = base[world] + 2 per
// claimed empty (all worlds); a claimed empty's own feeder = big[world] + 2 per claimed empty.
// A run that doesn't end at a nest target ends in the best home off this maze or the previous one.
// Frenzy: once every LADY nest in a world is built, bites eaten in that world count x2.
// Usage: node tools/economy.mjs            -> default + sensitivity sweep, asserts gap <= 2
//        node tools/economy.mjs --one [--skip-empties] [--hits=2] [--frac=0.5] [--verbose]
import { WORLDS, NODES, RULES } from '../game/src/data/worlds.js';
import { MAZES } from '../game/src/data/mazes.js';

// ---- graph consistency (cheap, catches data typos before the sim runs) --------------
function checkGraph() {
  const errs = [];
  for (const n of Object.values(NODES)) {
    if (n.type === 'maze') {
      const m = MAZES[n.id];
      if (!m) { errs.push(`no maze data for ${n.id}`); continue; }
      for (const [k, to] of Object.entries(n.exits)) {
        if (!m.exits[k]) errs.push(`${n.id} exit ${k} missing in mazes.js`);
        else if (m.exits[k].to !== to) errs.push(`${n.id} exit ${k}: worlds.js ${to} vs mazes.js ${m.exits[k].to}`);
        const [tm, te] = to.split(':');
        if (te) { if (NODES[tm]?.exits?.[te] !== `${n.id}:${k}`) errs.push(`${n.id}:${k} -> ${to} not reciprocal`); }
        else if (!NODES[to]) errs.push(`${n.id}:${k} -> unknown node ${to}`);
        else if (NODES[to].maze !== n.id || String(NODES[to].exit) !== k) errs.push(`${to} does not point back to ${n.id}:${k}`);
      }
      if (Object.keys(n.exits).length !== Object.keys(m.exits).length) errs.push(`${n.id} exit count differs`);
    }
  }
  return errs;
}

const OPTIONAL = new Set(['nn-gm']);

function sim({ skipEmpties = false, hitMul = 1, frac = RULES.sim.eatFraction, verbose = false } = {}) {
  const W = {};
  for (const w of WORLDS) {
    const tanksOf = (mid) => Object.values(NODES)
      .filter(n => n.type === 'tank' && n.maze === mid && n.kind !== 'home')
      .sort((a, b) => a.depth - b.depth);
    W[w.id] = {
      hit: w.simHitsPerRun, loss: w.hitLoss, base: w.feederHome, big: w.feederEmpty,
      // nn-gm (The Grand Maze) is optional (locked behind 15 bettas, no nests): not in the sim.
      mazes: w.mazes.filter(mid => !OPTIONAL.has(mid)).map(mid => ({ id: mid, bites: MAZES[mid].bites, tanks: tanksOf(mid) })),
    };
  }
  let wallet = 0, t = 0, empties = 0, feederBites = 0;
  const events = [], pending = [], homes = {}, built = new Set();
  const feeder = (wk, mi) => {
    const w = W[wk]; let best = 0;
    for (const [hm, kind] of homes[wk] || []) if (hm === mi || hm === mi - 1)
      best = Math.max(best, (kind === 'empty' ? w.big : w.base) + RULES.feederPerEmpty * empties);
    return best;
  };
  const run = (wk, mi, endsHome = true, tag = '') => {
    const w = W[wk]; const b = w.mazes[mi].bites;
    const perHit = Math.min(Math.round(w.loss * RULES.hit.cap), w.loss + Math.round(Math.max(0, wallet) * RULES.hit.pile));
    let inc = frac * b - hitMul * w.hit * perHit * RULES.sim.hitRecovered;
    const f = endsHome ? feeder(wk, mi) : 0;
    feederBites += f; inc += f; wallet += inc; t += 1;
    if (tag) events.push([t, tag]);
    const ladies = w.mazes.flatMap(m => m.tanks.filter(x => x.kind === 'lady').map(x => x.id));
    for (const p of pending) {
      if (p.stage === 'done') continue;
      const frenzy = p.world === wk && ladies.every(id => built.has(id));
      p.prog += inc * (frenzy ? RULES.frenzy.mul : 1);
      if (p.stage === 'eggs' && p.prog >= p.N) { p.stage = 'fry'; p.prog -= p.N; events.push([t, 'hatch ' + p.id]); }
      if (p.stage === 'fry' && p.prog >= p.M) { p.stage = 'done'; events.push([t, 'GROWN ' + p.id]); }
    }
  };
  for (const [wk, w] of Object.entries(W)) {
    homes[wk] = [[0, 'home']];
    wallet += w.base;                                       // arrival home feeder
    w.mazes.forEach((m, mi) => {
      run(wk, mi, false, `enter ${m.id}`);                  // first crossing
      for (const tk of m.tanks) {
        if (skipEmpties && tk.kind === 'empty') continue;
        while (wallet < tk.Z) run(wk, mi, true, `  farm ${m.id}`);
        wallet -= tk.Z; built.add(tk.id);
        events.push([t, `NEST ${tk.id} Z=${tk.Z} wallet=${wallet.toFixed(0)}`]);
        if (tk.kind === 'lady') { pending.push({ id: tk.id, world: wk, N: tk.N, M: tk.M, stage: 'eggs', prog: 0 }); homes[wk].push([mi, 'lady']); }
        else { empties++; homes[wk].push([mi, 'empty']); }
        run(wk, mi, false);                                 // back out through the maze
      }
    });
    if (wk === 'nn') while (pending.some(p => p.stage !== 'done')) run(wk, 5, true, '  grind');
  }
  let last = 0, mg = 0, where = '', farms = 0;
  for (const [tt, e] of events) {
    if (e.includes('farm') || e.includes('grind')) farms++;
    if (/^(NEST|hatch|GROWN|enter)/.test(e)) { if (tt - last > mg) { mg = tt - last; where = e; } last = tt; }
    if (verbose) console.log(tt, e);
  }
  return { runs: t, maxGap: mg, where, farms, feederBites: Math.round(feederBites), wallet: Math.round(wallet) };
}

const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(s => s.startsWith(`--${k}=`)); return a ? +a.split('=')[1] : d; };
const gerrs = checkGraph();
if (gerrs.length) { console.log('GRAPH ERRORS'); for (const e of gerrs) console.log(' - ' + e); process.exit(1); }
const fmt = (r) => `runs ${r.runs}  max reward gap ${r.maxGap} (at ${r.where})  farm/grind runs ${r.farms}  feeder bites ${r.feederBites}  final wallet ${r.wallet}`;
let ok = true;
if (args.includes('--one')) {
  const r = sim({ skipEmpties: args.includes('--skip-empties'), hitMul: arg('hits', 1), frac: arg('frac', RULES.sim.eatFraction), verbose: args.includes('--verbose') });
  console.log(fmt(r)); ok = r.maxGap <= RULES.sim.maxRewardGap;
} else {
  const cases = [
    ['default (all nests)', {}], ['skip all empty tanks', { skipEmpties: true }], ['2x hits', { hitMul: 2 }],
    ['eat 50% per run', { frac: 0.5 }], ['50% and 2x hits', { frac: 0.5, hitMul: 2 }],
  ];
  for (const [name, o] of cases) {
    const r = sim({ ...o, verbose: args.includes('--verbose') && name.startsWith('default') });
    const pass = r.maxGap <= RULES.sim.maxRewardGap; ok &&= pass;
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${name.padEnd(22)} ${fmt(r)}`);
  }
}
if (!ok) { console.log('economy check FAILED: reward gap > 2 runs'); process.exit(1); }
console.log('economy check passed (graph consistent, max reward gap <= 2 runs)');
