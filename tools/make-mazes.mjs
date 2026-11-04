#!/usr/bin/env node
// Bubble Nest maze builder: parse tools/mazes/*.txt, enforce every validator rule in
// design/GAME_DESIGN.md ("Maze format"), compute exit-to-exit shortest paths and one
// covering route per maze, and write game/src/data/mazes.js.
// Usage: node tools/make-mazes.mjs [--check] [--show]   (--check: validate only)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAZE_DIR = path.join(HERE, 'mazes');
const OUT = path.join(HERE, '..', 'game', 'src', 'data', 'mazes.js');
const CHECK_ONLY = process.argv.includes('--check');
const SHOW = process.argv.includes('--show');

// ---- design tables (GAME_DESIGN.md, "Structure and difficulty") -------------------
// enemies: multiset; need/forbid: mechanics that must / must not appear (introduced
// one at a time); flares: brine shrimp count range.
const T = (id, name, w, h, bites, enemies, exits, need = [], forbid = [], flares = [2, 4]) =>
  ({ id, name, w, h, bites, enemies, exits, need, forbid, flares });
const DESIGN = [
  T('cw-m1', 'Ripple Run', 15, 9, 50, 'snail', 'cw-home cw-lady-1 cw-m2:1', [], ['wrap', 'currents', 'valves', 'portals', 'jelly']),
  T('cw-m2', 'Twin Loops', 15, 11, 62, 'snail shrimp', 'cw-m1:3 cw-empty-1 cw-lady-2 cw-m3:1', [], ['wrap', 'currents', 'valves', 'portals', 'jelly']),
  T('cw-m3', 'Wraparound', 17, 11, 70, 'snail shrimp', 'cw-m2:4 cw-lady-3 cw-m4:1', ['wrap'], ['currents', 'valves', 'portals', 'jelly']),
  T('cw-m4', 'Lily Pads', 19, 11, 76, 'shrimp shrimp', 'cw-m3:3 cw-lady-4 cw-empty-2 cw-m5:1', ['wrap'], ['currents', 'valves', 'portals', 'jelly']),
  T('cw-m5', 'Sun Spiral', 21, 11, 84, 'snail shrimp shrimp', 'cw-m4:4 cw-lady-5 cw-m6:1', ['wrap'], ['currents', 'valves', 'portals', 'jelly']),
  T('cw-m6', 'Windowsill Wide', 19, 13, 92, 'snail shrimp shrimp', 'cw-m5:3 cw-lady-6 cw-bm', ['wrap'], ['currents', 'valves', 'portals', 'jelly']),
  T('cp-m1', 'Downstream', 21, 13, 96, 'snail snail shrimp', 'cp-home cp-lady-1 cp-m2:1 cp-m4:4', ['currents'], ['valves', 'portals', 'jelly']),
  T('cp-m2', 'Steam Gates', 21, 13, 104, 'snail shrimp shrimp', 'cp-m1:3 cp-lady-2 cp-empty-1 cp-m3:1', ['valves'], ['currents', 'portals', 'jelly']),
  T('cp-m3', 'Crayfish Corner', 23, 13, 110, 'crayfish shrimp shrimp', 'cp-m2:4 cp-lady-3 cp-m4:1', [], ['currents', 'valves', 'portals', 'jelly'], [4, 4]),
  T('cp-m4', 'Pressure Loop', 23, 13, 116, 'crayfish snail shrimp shrimp', 'cp-m3:3 cp-lady-4 cp-m5:1 cp-m1:4', ['currents', 'valves'], ['portals', 'jelly']),
  T('cp-m5', 'Boiler Maze', 25, 13, 122, 'crayfish snail shrimp shrimp', 'cp-m4:3 cp-lady-5 cp-empty-2 cp-m6:1', ['currents', 'valves'], ['portals', 'jelly']),
  T('cp-m6', 'Copper Crown', 25, 13, 128, 'crayfish crayfish shrimp shrimp', 'cp-m5:4 cp-lady-6 cp-bm', ['valves'], ['portals', 'jelly']),
  T('nn-m1', 'Lights Out', 23, 15, 130, 'snail snail shrimp shrimp', 'nn-home nn-lady-1 nn-m2:1 nn-m6:4', [], ['currents', 'valves', 'portals', 'jelly']),
  T('nn-m2', 'Ring Road', 23, 15, 138, 'snail shrimp shrimp crayfish', 'nn-m1:3 nn-lady-2 nn-empty-1 nn-m3:1', ['portals'], ['currents', 'valves', 'jelly']),
  T('nn-m3', 'Jelly Lanes', 25, 15, 144, 'jelly shrimp shrimp crayfish', 'nn-m2:4 nn-lady-3 nn-m4:1', ['jelly'], ['currents', 'valves', 'portals']),
  T('nn-m4', 'Mirror Hall', 25, 15, 150, 'jelly crayfish shrimp shrimp snail', 'nn-m3:3 nn-lady-4 nn-m5:1', ['portals', 'jelly'], ['currents', 'valves']),
  T('nn-m5', 'Glow Garden', 27, 15, 156, 'jelly crayfish shrimp shrimp snail', 'nn-m4:3 nn-lady-5 nn-empty-2 nn-m6:1', ['currents', 'jelly'], ['valves']),
  T('nn-m6', 'Night Market', 27, 15, 162, 'jelly jelly crayfish shrimp shrimp', 'nn-m5:4 nn-lady-6 nn-m7:1 nn-m1:4', ['valves', 'jelly'], []),
  T('nn-m7', 'Midnight Snack', 27, 15, 168, 'jelly jelly crayfish shrimp shrimp', 'nn-m6:3 nn-lady-7', ['jelly'], [], [6, 6]),
];
const WORLD_OF = { cw: 'cw', cp: 'cp', nn: 'nn' };
const SPEED = 4;            // cells per second at 1.0x (design: you = 1.0 = 4 cells/s)
const WITH = 1 / 1.8, AGAINST = 1 / 0.45, ACROSS = 1;
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
const CUR = { '>': 'R', '<': 'L', '^': 'U', 'v': 'D' };
const PORTAL_PAIR = { a: 'b', b: 'a', c: 'd', d: 'c' };
const KNOWN = new Set('#._o1234Wabcd><^vGS?'.split(''));

// ---- parsing ------------------------------------------------------------------------
function parse(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r/g, '');
  const lines = text.split('\n');
  const sep = lines.findIndex(l => l.trim() === '---');
  if (sep < 0) throw new Error('no --- separator');
  const head = {}; const valveOv = {};
  for (const raw of lines.slice(0, sep)) {
    const l = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '').trim();
    if (!l) continue;
    let m = l.match(/^valve\s+G(\d+)\s*:\s*(.*)$/);
    if (m) { valveOv[+m[1]] = kv(m[2]); continue; }
    m = l.match(/^([a-z]+)\s*:\s*(.*)$/);
    if (!m) throw new Error('bad header line: ' + raw);
    head[m[1]] = m[2].trim();
  }
  const symLine = lines.slice(0, sep).find(l => /^symmetric\s*:/.test(l)) || '';
  const grid = lines.slice(sep + 1).filter(l => l.length > 0);
  return { head, valveOv, grid, symComment: /#\s*\S/.test(symLine) };
}
function kv(s) { // "open 2 shut 4 phase 1.5"
  const t = s.trim().split(/\s+/); const o = {};
  for (let i = 0; i + 1 < t.length; i += 2) o[t[i]] = +t[i + 1];
  return o;
}

// ---- build one maze -----------------------------------------------------------------
function build(file) {
  const errs = [];
  const E = (m) => errs.push(m);
  const { head, valveOv, grid, symComment } = parse(file);
  const id = head.id;
  const D = DESIGN.find(d => d.id === id);
  if (!D) throw new Error(`${file}: unknown maze id ${id}`);
  const h = grid.length, w = grid[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? '#' : grid[y][x];
  const open = (x, y) => at(x, y) !== '#';
  const isExit = (c) => c >= '1' && c <= '4';

  // size / chars
  if (grid.some(r => r.length !== w)) E('rows differ in length');
  if (w % 2 === 0 || h % 2 === 0) E(`size ${w}x${h} not odd`);
  if (w !== D.w || h !== D.h) E(`size ${w}x${h}, design says ${D.w}x${D.h}`);
  if (head.name !== D.name) E(`name "${head.name}" != design "${D.name}"`);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y);
    if (!KNOWN.has(c)) E(`unknown char '${c}' at ${x},${y}`);
    if (c === '?') E(`unfilled '?' at ${x},${y}`);
  }

  // exits, wraps, border
  const exits = {}; const wraps = []; const wrapRows = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y); const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
    const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
    if (isExit(c)) {
      if (!border || corner) E(`exit ${c} at ${x},${y} not on a border side`);
      if (exits[c]) E(`exit ${c} twice`);
      const dir = y === 0 ? 'U' : y === h - 1 ? 'D' : x === 0 ? 'L' : 'R';
      exits[c] = { x, y, dir };
    } else if (c === 'W') {
      if (!(x === 0 || x === w - 1) || y === 0 || y === h - 1) E(`wrap mouth at ${x},${y} not on left/right border`);
      if (x === 0) {
        if (at(w - 1, y) !== 'W') E(`wrap at row ${y} has no right mouth`);
        wraps.push({ y, xl: 0, xr: w - 1 }); wrapRows.add(y);
      } else if (at(0, y) !== 'W') E(`wrap at row ${y} has no left mouth`);
    } else if (border && c !== '#') E(`border cell ${x},${y} is '${c}' (must be wall, exit or wrap)`);
  }
  const exitIds = Object.keys(exits).map(Number).sort();
  const designExits = D.exits.split(' ');
  if (exitIds.length !== designExits.length || exitIds.some((n, i) => n !== i + 1))
    E(`exits ${exitIds.join(',')} but design has ${designExits.length}`);
  for (const [k, e] of Object.entries(exits)) if (wrapRows.has(e.y) && (e.dir === 'L' || e.dir === 'R')) E(`exit ${k} on wrap row ${e.y}`);
  const headExits = Object.fromEntries((head.exits || '').split(/\s+/).filter(Boolean).map(t => t.split('=')));
  designExits.forEach((to, i) => { if (headExits[i + 1] !== to) E(`exit ${i + 1} -> ${headExits[i + 1]}, design says ${to}`); });

  // symmetry (exits carved afterwards = treated as wall)
  const sym = (head.symmetric || 'yes').toLowerCase();
  if (sym === 'no' && !symComment) E('symmetric: no needs a reason comment');
  if (sym !== 'no') {
    const wl = (x, y) => at(x, y) === '#' || isExit(at(x, y));
    for (let y = 0; y < h; y++) for (let x = 0; x < w / 2; x++)
      if (wl(x, y) !== wl(w - 1 - x, y)) E(`walls not mirror-symmetric at ${x},${y} / ${w - 1 - x},${y}`);
  }

  // neighbours (grid + wraps). Portals are handled in the player graph only.
  const nbrs = (x, y) => {
    const out = [];
    for (const [d, [dx, dy]] of Object.entries(DIRS)) {
      let nx = x + dx, ny = y + dy;
      if (at(x, y) === 'W' && (nx < 0 || nx >= w)) nx = nx < 0 ? w - 1 : 0;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (open(nx, ny)) out.push([nx, ny, d]);
    }
    return out;
  };

  // 2x2, dead ends
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++)
    if (open(x, y) && open(x + 1, y) && open(x, y + 1) && open(x + 1, y + 1)) E(`2x2 open block at ${x},${y}`);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!open(x, y)) continue;
    const n = nbrs(x, y).length;
    if (isExit(at(x, y))) { if (n !== 1) E(`exit mouth ${at(x, y)} has ${n} neighbours`); }
    else if (n < 2) E(`dead end at ${x},${y}`);
  }

  // bites / capacity
  let bites = 0; let flares = 0;
  for (const r of grid) for (const c of r) { if (c === '.' || CUR[c]) bites++; if (c === 'o') flares++; }
  const capacity = (h - 1) / 2 * (w - 2) + (h - 3) / 2 * (w - 1) / 2;
  const tr = D.bites / capacity, ar = bites / capacity;
  if (tr < 0.55 || tr > 0.70) E(`target ${D.bites} is ${(tr * 100).toFixed(0)}% of capacity`);
  if (ar < 0.55 || ar > 0.70) E(`bites ${bites} is ${(ar * 100).toFixed(0)}% of capacity ${capacity}`);
  if (Math.abs(bites - D.bites) > 0.08 * D.bites) E(`bites ${bites} not within 8% of ${D.bites}`);
  if (flares < D.flares[0] || flares > D.flares[1]) E(`${flares} brine shrimp, want ${D.flares.join('-')}`);

  // portals
  const portalAt = {}; const portals = [];
  for (const p of ['a', 'c']) {
    const A = [], B = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (at(x, y) === p) A.push({ x, y });
      if (at(x, y) === PORTAL_PAIR[p]) B.push({ x, y });
    }
    if (!A.length && !B.length) continue;
    if (A.length !== 1 || B.length !== 1) { E(`portal ${p}/${PORTAL_PAIR[p]} must be exactly one pair`); continue; }
    portals.push({ a: A[0], b: B[0] });
    portalAt[A[0].x + ',' + A[0].y] = B[0]; portalAt[B[0].x + ',' + B[0].y] = A[0];
    for (const q of [A[0], B[0]]) { // mid-corridor: straight, two neighbours
      const ns = nbrs(q.x, q.y).map(n => n[2]).sort().join('');
      if (ns !== 'LR' && ns !== 'DU') E(`portal at ${q.x},${q.y} is not mid-corridor (${ns})`);
    }
  }

  // currents, valves
  const currents = []; const valves = [];
  const vdef = kv((head.valves || 'open 3 shut 3'));
  let vi = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y);
    if (CUR[c]) {
      currents.push({ x, y, dir: CUR[c] });
      const [dx, dy] = DIRS[CUR[c]];
      if (!open(x + dx, y + dy)) E(`current at ${x},${y} flows into a wall`);
    }
    if (c === 'G') {
      vi++;
      const o = { open: 3, shut: 3, phase: 0, ...vdef, ...(valveOv[vi] || {}) };
      valves.push({ x, y, open: o.open, shut: o.shut, phase: o.phase || 0 });
    }
  }
  const valveAt = Object.fromEntries(valves.map(v => [v.x + ',' + v.y, v]));

  // player graph: directed weighted edges (currents), valve wait cost, portal hops.
  const flow = (x, y, d) => { const c = CUR[at(x, y)]; return !c ? ACROSS : c === d ? WITH : c === OPP[d] ? AGAINST : ACROSS; };
  const key = (x, y) => y * w + x;
  const edges = (x, y) => {
    const out = [];
    for (const [nx, ny, d] of nbrs(x, y)) {
      let cost = 0.5 * flow(x, y, d) + 0.5 * flow(nx, ny, d);
      const v = valveAt[nx + ',' + ny];
      if (v) cost += SPEED * (v.shut * v.shut) / (2 * (v.open + v.shut)); // expected wait
      const p = portalAt[nx + ',' + ny];
      if (p) out.push({ x: p.x, y: p.y, cost, mv: d + 'P' });
      else out.push({ x: nx, y: ny, cost, mv: d });
    }
    return out;
  };
  const dijkstra = (sx, sy) => {
    const dist = new Map([[key(sx, sy), 0]]); const prev = new Map(); const done = new Set();
    const pq = [[0, sx, sy]];
    while (pq.length) {
      let bi = 0; for (let i = 1; i < pq.length; i++) if (pq[i][0] < pq[bi][0]) bi = i;
      const [dc, x, y] = pq.splice(bi, 1)[0];
      const k = key(x, y); if (done.has(k)) continue; done.add(k);
      if (isExit(at(x, y)) && !(x === sx && y === sy)) continue; // exits are terminal
      for (const e of edges(x, y)) {
        const nk = key(e.x, e.y), nd = dc + e.cost;
        if (nd < (dist.get(nk) ?? Infinity) - 1e-9) { dist.set(nk, nd); prev.set(nk, [k, e.mv]); pq.push([nd, e.x, e.y]); }
      }
    }
    const route = (tx, ty) => {
      let k = key(tx, ty); if (!dist.has(k)) return null;
      const mv = []; const cells = [];
      while (k !== key(sx, sy)) { const [pk, m] = prev.get(k); mv.push(m); cells.push(k); k = pk; }
      return { moves: mv.reverse().join(''), cells: cells.reverse() };
    };
    return { dist, route };
  };

  // exit connectivity + paths
  const paths = {};
  for (const a of exitIds) {
    const dj = dijkstra(exits[a].x, exits[a].y);
    for (const b of exitIds) {
      if (a === b) continue;
      const r = dj.route(exits[b].x, exits[b].y);
      if (!r) { E(`exit ${a} cannot reach exit ${b}`); continue; }
      paths[`${a}>${b}`] = r.moves;
    }
  }
  // every portal reachable on both sides (a neighbour of each portal cell reachable)
  if (exitIds.length) {
    const dj = dijkstra(exits[exitIds[0]].x, exits[exitIds[0]].y);
    for (const p of portals) for (const q of [p.a, p.b])
      for (const [nx, ny] of nbrs(q.x, q.y)) if (!dj.dist.has(key(nx, ny))) E(`portal ${q.x},${q.y} side ${nx},${ny} unreachable`);
    // every open cell reachable (no orphan corridors)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (open(x, y) && !portalAt[x + ',' + y] && !dj.dist.has(key(x, y)) && !isExit(at(x, y))) E(`cell ${x},${y} unreachable from exit 1`);
  }

  // spawns & enemies
  const spawns = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y) === 'S') spawns.push({ x, y });
  const bfs = (sx, sy) => { // plain path cells (wraps, no portals)
    const d = new Map([[key(sx, sy), 0]]); const q = [[sx, sy]];
    while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of nbrs(x, y)) if (!d.has(key(nx, ny))) { d.set(key(nx, ny), d.get(key(x, y)) + 1); q.push([nx, ny]); } }
    return d;
  };
  for (const [k, e] of Object.entries(exits)) {
    const d = bfs(e.x, e.y);
    spawns.forEach((s, i) => { const v = d.get(key(s.x, s.y)); if (v === undefined || v < 6) E(`spawn S${i + 1} only ${v} cells from exit ${k}`); });
  }
  const enemies = []; const toks = (head.enemies || '').split(/\s+/).filter(Boolean);
  for (const t of toks) {
    const m = t.match(/^(snail|shrimp|crayfish|jelly)@S(\d+)$/);
    if (m) { enemies.push({ type: m[1], spawn: +m[2] - 1 }); continue; }
    const k2 = t.match(/^(loop|phase)=(.+)$/);
    if (k2 && enemies.length) { enemies[enemies.length - 1][k2[1]] = k2[1] === 'phase' ? +k2[2] : k2[2]; continue; }
    E(`bad enemy token ${t}`);
  }
  if (enemies.map(e => e.type).sort().join(' ') !== D.enemies.split(' ').sort().join(' ')) E(`enemies ${enemies.map(e => e.type).join(' ')} != design ${D.enemies}`);
  if (spawns.length !== enemies.length) E(`${spawns.length} spawns for ${enemies.length} enemies`);
  const used = new Set();
  for (const en of enemies) {
    if (!spawns[en.spawn]) E(`enemy ${en.type} uses missing spawn S${en.spawn + 1}`);
    if (used.has(en.spawn)) E(`spawn S${en.spawn + 1} used twice`); used.add(en.spawn);
    if (en.type === 'jelly') {
      if (!en.loop) { E('jelly without loop'); continue; }
      if (en.phase === undefined) en.phase = 0;
      let { x, y } = spawns[en.spawn] || { x: -1, y: -1 }; const seen = new Set();
      for (const c of en.loop) {
        const dd = DIRS[c]; if (!dd) { E(`jelly loop bad move ${c}`); break; }
        x += dd[0]; y += dd[1];
        const ch = at(x, y);
        if (ch === '#' || isExit(ch) || ch === 'W' || ch === 'G' || portalAt[x + ',' + y]) { E(`jelly loop leaves corridor at ${x},${y} ('${ch}')`); break; }
        seen.add(key(x, y));
      }
      const s = spawns[en.spawn];
      if (s && (x !== s.x || y !== s.y)) E(`jelly loop from S${en.spawn + 1} does not return to its spawn`);
      if (seen.size !== en.loop.length) E(`jelly loop from S${en.spawn + 1} revisits cells (not a simple loop)`);
    } else if (en.loop) E(`${en.type} has a loop`);
  }

  // mechanics present
  const mech = [];
  if (wraps.length) mech.push('wrap');
  if (currents.length) mech.push('currents');
  if (valves.length) mech.push('valves');
  if (portals.length) mech.push('portals');
  if (enemies.some(e => e.type === 'jelly')) mech.push('jelly');
  for (const m of D.need) if (!mech.includes(m)) E(`design needs ${m}`);
  for (const m of D.forbid) if (mech.includes(m)) E(`${m} not introduced yet / must not appear here`);
  const dark = id.startsWith('nn-');
  const mechanics = [...mech]; if (dark) mechanics.unshift('dark');

  // covering route: greedy chain of shortest paths from exit 1 to the nearest uneaten
  // bite cell, then to the nearest exit.
  let cover = null;
  if (!errs.length) {
    const biteCells = new Set();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y) === '.' || CUR[at(x, y)]) biteCells.add(key(x, y));
    let cx = exits[1].x, cy = exits[1].y; let moves = '';
    while (biteCells.size) {
      const dj = dijkstra(cx, cy); let best = null, bd = Infinity;
      for (const k of biteCells) { const d = dj.dist.get(k); if (d !== undefined && d < bd) { bd = d; best = k; } }
      if (best === null) { E('cover: unreachable bites'); break; }
      const r = dj.route(best % w, Math.floor(best / w));
      moves += r.moves; for (const k of r.cells) biteCells.delete(k);
      cx = best % w; cy = Math.floor(best / w);
    }
    const dj = dijkstra(cx, cy); let to = null, bd = Infinity;
    for (const n of exitIds) { const d = dj.dist.get(key(exits[n].x, exits[n].y)); if (d !== undefined && d < bd) { bd = d; to = n; } }
    moves += dj.route(exits[to].x, exits[to].y).moves;
    cover = { from: 1, to, moves };
    // replay check: moves are legal and eat every bite
    const eaten = replay(moves, exits[1], exits[to]);
    if (eaten !== bites) E(`cover replay ate ${eaten}/${bites}`);
    for (const [k, mv] of Object.entries(paths)) {
      const [a, b] = k.split('>');
      if (replay(mv, exits[a], exits[b]) < 0) E(`path ${k} replay failed`);
    }
  }
  function replay(moves, from, to) {
    let x = from.x, y = from.y; const eaten = new Set();
    for (let i = 0; i < moves.length; i++) {
      const c = moves[i]; if (c === 'P') return -1;
      const n = nbrs(x, y).find(q => q[2] === c); if (!n) return -1;
      [x, y] = n;
      if (moves[i + 1] === 'P') { const p = portalAt[x + ',' + y]; if (!p) return -1; x = p.x; y = p.y; i++; }
      if (at(x, y) === '.' || CUR[at(x, y)]) eaten.add(key(x, y));
      if (isExit(at(x, y)) && i !== moves.length - 1) return -1;
    }
    return (x === to.x && y === to.y) ? eaten.size : -1;
  }

  const exitsOut = {};
  for (const n of exitIds) exitsOut[n] = { ...exits[n], to: designExits[n - 1] };
  const out = {
    id, name: head.name, world: WORLD_OF[id.slice(0, 2)], w, h, grid,
    exits: exitsOut, wraps, portals, currents, valves, spawns, enemies,
    bites, capacity, target: D.bites, flares,
    paths, cover,
    signature: head.signature || '', mechanics, dark,
  };
  if (head.refill) out.refill = +head.refill;
  if (head.golden) { // golden bite trail along a stored path, e.g. "1>3"
    const mv = paths[head.golden]; const [a] = head.golden.split('>');
    if (!mv) E(`golden trail path ${head.golden} missing`);
    else {
      let x = exits[a].x, y = exits[a].y; const cells = [];
      for (let i = 0; i < mv.length; i++) { const n = nbrs(x, y).find(q => q[2] === mv[i]); [x, y] = n; if (at(x, y) === '.') cells.push({ x, y }); }
      out.golden = cells;
    }
  }
  return { out, errs, D };
}

// ---- main ---------------------------------------------------------------------------
const files = fs.readdirSync(MAZE_DIR).filter(f => f.endsWith('.txt')).sort();
const MAZES = {}; let failed = 0;
for (const f of files) {
  let r;
  try { r = build(path.join(MAZE_DIR, f)); }
  catch (e) { console.log(`FAIL ${f}: ${e.message}`); failed++; continue; }
  const { out, errs, D } = r;
  const pct = (out.bites / out.capacity * 100).toFixed(0);
  if (errs.length) { failed++; console.log(`FAIL ${out.id} (${out.w}x${out.h}, bites ${out.bites}/${D.bites}, ${pct}%)`); for (const e of errs.slice(0, 25)) console.log('   - ' + e); }
  else console.log(`ok   ${out.id.padEnd(6)} ${out.name.padEnd(16)} ${out.w}x${out.h} bites ${out.bites} (target ${D.bites}) cap ${out.capacity} ${pct}%  exits ${Object.keys(out.exits).length}  cover ${out.cover.moves.length} moves -> ${out.cover.to}`);
  if (SHOW) console.log(out.grid.join('\n'));
  MAZES[out.id] = out;
}
for (const d of DESIGN) if (!MAZES[d.id]) { console.log(`MISSING ${d.id}`); failed++; }
if (failed) { console.log(`\n${failed} maze(s) failed`); process.exit(1); }
if (!CHECK_ONLY) {
  const order = DESIGN.map(d => d.id);
  let js = '// GENERATED by tools/make-mazes.mjs from tools/mazes/*.txt. Do not edit by hand.\n' +
    '// Coordinates: x = column from left, y = row from top. Moves: U D L R, P = portal hop.\n' +
    'export const MAZES = {\n';
  for (const id of order) {
    const m = MAZES[id];
    const lines = Object.entries(m).map(([k, v]) => {
      if (k === 'grid') return `    grid: [\n${v.map(r => '      ' + JSON.stringify(r)).join(',\n')},\n    ]`;
      if (k === 'paths') return `    paths: {\n${Object.entries(v).map(([a, b]) => `      '${a}': ${JSON.stringify(b)}`).join(',\n')},\n    }`;
      return `    ${k}: ${JSON.stringify(v)}`;
    });
    js += `  '${id}': {\n${lines.join(',\n')},\n  },\n`;
  }
  js += '};\n\nexport const MAZE_IDS = ' + JSON.stringify(order) + ';\n';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, js);
  console.log(`\nall ${order.length} mazes pass; wrote ${path.relative(process.cwd(), OUT)}`);
}
