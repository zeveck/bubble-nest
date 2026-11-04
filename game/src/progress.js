// Game progress: wallet, nests, fry, collection, save/load.
import { NODES, WORLDS, DOCKS } from './data/worlds.js';
import { FISH, FISH_BY_ID } from './data/fish.js';

const KEY = 'bubblenest-save';
const VERSION = 1;
const FAST = new URLSearchParams(location.search).has('fast');

export const WORLD_BY_ID = Object.fromEntries(WORLDS.map(w => [w.id, w]));
export const TRAILS = ['default', 'hearts', 'stars', 'rings', 'sparkles', 'glow', 'rainbow'];
const TRAIL_BY_TANK = { 'cw-empty-1': 'hearts', 'cw-empty-2': 'stars', 'cp-empty-1': 'rings', 'cp-empty-2': 'sparkles', 'nn-empty-1': 'glow', 'nn-empty-2': 'rainbow' };
export const TRAIL_NAMES = { default: 'Bubbles', hearts: 'Hearts', stars: 'Stars', rings: 'Rings', sparkles: 'Sparkles', glow: 'Glow bubbles', rainbow: 'Rainbow', crown: 'Crown' };

export const Z = (t) => FAST ? 1 : (t.Z ?? 0);
export const N = (t) => FAST ? 1 : (t.N ?? 0);
export const M = (t) => FAST ? 1 : (t.M ?? 0);

function fresh() {
  return {
    v: VERSION, bites: 0, eaten: 0, fish: 'rust', at: 'cw-home',
    tanks: { 'cw-home': { claimed: true }, },
    fishHome: { rust: 'cw-home' }, collected: ['rust'],
    trails: ['default'], fishTrail: {}, worlds: ['cw'],
    docks: ['dock-cw'], roomFound: false, stars: {},
    feederFull: {}, startBites: true, seen: { tips: [], worlds: ['cw'], visited: [] },
    settings: { music: 0.6, sfx: 0.8, muted: false, sens: 1, invert: false, reduceMotion: false, minimap: true, school: true },
    won: false, hits: 0, playTime: 0,
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : d;
function migrate(s) {
  if (!isObj(s)) return fresh();
  const f = fresh();
  const out = f;
  out.bites = Math.floor(num(s.bites, 0)); out.eaten = Math.floor(num(s.eaten, 0)); out.hits = num(s.hits, 0); out.playTime = num(s.playTime, 0);
  if (typeof s.fish === 'string') out.fish = s.fish;
  if (typeof s.at === 'string') out.at = s.at;
  for (const k of ['tanks', 'fishHome', 'stars', 'feederFull', 'fishTrail']) if (isObj(s[k])) out[k] = s[k];
  for (const k of ['collected', 'trails', 'worlds', 'docks']) if (Array.isArray(s[k])) out[k] = s[k].filter(x => typeof x === 'string');
  for (const k of ['roomFound', 'won', 'startBites', 'grandWon']) if (typeof s[k] === 'boolean') out[k] = s[k];
  for (const [id, t] of Object.entries(out.tanks)) if (!isObj(t)) delete out.tanks[id]; else if (t.progress != null) t.progress = num(t.progress, 0);
  for (const [k, v] of Object.entries(out.stars)) if (typeof v !== 'number') delete out.stars[k];
  if (!out.trails.includes('default')) out.trails.unshift('default');
  if (!out.docks.includes('dock-cw')) out.docks.unshift('dock-cw');
  if (!out.worlds.includes('cw')) out.worlds.unshift('cw');
  if (isObj(out.tanks['cw-home']) === false) out.tanks['cw-home'] = { claimed: true };
  out.settings = Object.assign(fresh().settings, isObj(s.settings) ? s.settings : {});
  const seen = isObj(s.seen) ? s.seen : {};
  out.seen = fresh().seen;
  for (const k of ['tips', 'worlds', 'visited']) if (Array.isArray(seen[k])) out.seen[k] = seen[k];
  if (seen.victory) out.seen.victory = true;
  // drop unknown ids
  for (const id of Object.keys(out.tanks)) if (!NODES[id]) delete out.tanks[id];
  out.collected = out.collected.filter(id => FISH_BY_ID[id]);
  if (!out.collected.includes('rust')) out.collected.unshift('rust');
  if (!FISH_BY_ID[out.fish]) out.fish = 'rust';
  if (!NODES[out.at] && out.at !== 'room') out.at = 'cw-home';
  for (const k of Object.keys(out.fishHome)) if (!NODES[out.fishHome[k]]) out.fishHome[k] = 'cw-home';
  out.v = VERSION;
  return out;
}

const listeners = [];
export const progress = {
  s: fresh(),
  on(fn) { listeners.push(fn); },
  emit(type, data = {}) { for (const fn of listeners) fn(type, data); },

  hasSave() { try { return !!localStorage.getItem(KEY); } catch { return false; } },
  load() {
    try { const raw = localStorage.getItem(KEY); this.s = raw ? migrate(JSON.parse(raw)) : fresh(); }
    catch { this.s = fresh(); }
    return this.s;
  },
  newGame() { const keep = this.s.settings; this.s = fresh(); this.s.settings = keep; this.save(true); },
  _t: null,
  save(now = false) {
    clearTimeout(this._t);
    const write = () => { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { } };
    if (now) write(); else this._t = setTimeout(write, 5000);
  },
  resetAll() { try { localStorage.removeItem(KEY); } catch { } this.s = fresh(); },

  tank(id) { return (this.s.tanks[id] ||= {}); },
  isHome(id) { const n = NODES[id]; if (!n || n.type !== 'tank') return false; return n.kind === 'home' || !!this.s.tanks[id]?.claimed; },
  emptiesClaimed() { return Object.keys(TRAIL_BY_TANK).filter(id => this.s.tanks[id]?.claimed).length; },
  feederSize(id) {
    const n = NODES[id]; const w = WORLD_BY_ID[n.world]; const wi = WORLDS.indexOf(w);
    const base = n.kind === 'empty' ? [20, 30, 40][wi] : [8, 12, 16][wi];
    return base + 2 * this.emptiesClaimed();
  },
  ladyNests(world) {
    const ladies = Object.values(NODES).filter(n => n.type === 'tank' && n.kind === 'lady' && n.world === world);
    return { done: ladies.filter(n => this.s.tanks[n.id]?.claimed).length, total: ladies.length };
  },
  frenzy(world) { const l = this.ladyNests(world); return l.total > 0 && l.done >= l.total; },

  // bites eaten (counts toward fry); world = where they were eaten
  eat(n, world, { counts = true } = {}) {
    this.s.bites += n;
    if (!counts) { this.save(); return; }
    this.s.eaten += n;
    for (const [id, t] of Object.entries(this.s.tanks)) {
      if (t.stage !== 'eggs' && t.stage !== 'fry') continue;
      const node = NODES[id];
      const mult = (this.frenzy(node.world) && node.world === world) ? 2 : 1;
      t.progress = (t.progress || 0) + n * mult;
      if (t.stage === 'eggs' && t.progress >= N(node)) {
        t.stage = 'fry'; t.hatchedAt = this.s.eaten;
        this.emit('hatch', { id, node }); this.save(true);
      }
      if (t.stage === 'fry' && t.progress >= N(node) + M(node)) {
        t.stage = 'grown'; t.grownAt = this.s.eaten;
        this.emit('grown', { id, node, fish: node.son }); this.save(true);
      }
    }
    this.save();
  },
  lose(n) { const l = Math.min(this.s.bites, n); this.s.bites -= l; this.save(); return l; },
  fryStatus(id) {
    const t = this.s.tanks[id], node = NODES[id];
    if (!t?.stage) return null;
    if (t.stage === 'eggs') return { stage: 'eggs', left: Math.max(0, N(node) - (t.progress || 0)) };
    if (t.stage === 'fry') return { stage: 'fry', left: Math.max(0, N(node) + M(node) - (t.progress || 0)) };
    return { stage: t.stage, left: 0 };
  },
  canNest(id) {
    const n = NODES[id]; if (!n || n.type !== 'tank' || n.kind === 'home') return false;
    return !this.s.tanks[id]?.claimed;
  },
  nest(id) {
    const n = NODES[id];
    if (!this.canNest(id) || this.s.bites < Z(n)) return false;
    this.s.bites -= Z(n);
    const t = this.tank(id);
    t.claimed = true;
    if (n.kind === 'lady') { t.stage = 'eggs'; t.progress = 0; t.laidAt = this.s.eaten; }
    else {
      const trail = TRAIL_BY_TANK[id];
      if (trail && !this.s.trails.includes(trail)) { this.s.trails.push(trail); this.emit('trail', { trail }); }
    }
    const wasFrenzy = n.kind === 'lady' && this.frenzy(n.world);
    if (wasFrenzy) this.emit('frenzy', { world: n.world });
    this.save(true);
    return true;
  },
  // become a fish (a grown fry, or switch to a collected one)
  become(fishId, whereTank) {
    const s = this.s;
    const old = s.fish;
    if (old !== fishId) {
      if (whereTank && this.isHome(whereTank)) s.fishHome[old] = whereTank;
      s.fish = fishId;
    }
    let first = false;
    if (!s.collected.includes(fishId)) { s.collected.push(fishId); first = true; }
    // mark lady tank done
    for (const [id, t] of Object.entries(s.tanks)) {
      if (NODES[id]?.son === fishId && t.stage === 'grown') { t.stage = 'done'; t.becameFish = fishId; s.fishHome[fishId] = id; }
    }
    if (!s.fishHome[fishId]) s.fishHome[fishId] = whereTank || 'cw-home';
    if (first) this.emit('newfish', { fish: fishId });
    if (first && s.collected.length === 15) this.emit('grandopen', {});
    if (first && s.collected.length >= FISH.length && !s.won) { s.won = true; this.emit('victory', {}); }
    this.save(true);
    return first;
  },
  readyFry() { return Object.entries(this.s.tanks).filter(([, t]) => t.stage === 'grown').map(([id]) => ({ id, node: NODES[id], fish: NODES[id].son })); },
  reachWorld(w) { if (!this.s.worlds.includes(w)) { this.s.worlds.push(w); this.save(true); return true; } return false; },
  unlockDock(id) { if (!this.s.docks.includes(id)) { this.s.docks.push(id); this.emit('dock', { id }); this.save(true); } },
  star(mazeId, n) {
    const cur = this.s.stars[mazeId] || 0;
    if (n > cur) { this.s.stars[mazeId] = n; this.save(true); return true; }
    return false;
  },
  get FAST() { return FAST; },
};
