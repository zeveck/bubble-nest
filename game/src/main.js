// Bubble Nest: boot, loading, modes, transitions, debug hook.
import * as THREE from 'three';
import { NODES, WORLDS, DOCKS } from './data/worlds.js';
import { MAZES } from './data/mazes.js';
import { FISH, FISH_BY_ID } from './data/fish.js';
import { loadBody, Fish, getBody } from './fishmodel.js';
import { loadAll, loadStats } from './assets.js';
import { input, isTouch } from './input.js';
import { audio } from './audio.js';
import { progress, WORLD_BY_ID } from './progress.js';
import { UI } from './ui.js';
import { TankMode } from './modes/tank.js';
import { PipeMode } from './modes/pipe.js';
import { RoomMode } from './modes/room.js';

const Q = new URLSearchParams(location.search);
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!local || Q.has('sw'))) navigator.serviceWorker.register('sw.js');

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const maxDpr = () => Math.min(devicePixelRatio || 1, isTouch() ? 1.5 : 2);

const MUSIC = { cw: 'music-clearwater', cp: 'music-copper', nn: 'music-neon' };
const BOOT = [
  'model:body-male', 'model:body-female', 'model:snail', 'model:shrimp', 'model:prop-anubias', 'model:prop-driftwood', 'model:prop-cave', 'model:prop-castle', 'model:bubble-machine',
  'assets/tex/gravel.jpg', 'assets/bg/pano-clearwater.jpg', 'assets/bg/poster-1.jpg', 'assets/bg/poster-2.jpg', 'assets/bg/poster-3.jpg', 'assets/bg/poster-4.jpg',
];
const LATER = ['model:crayfish', 'model:cat', 'model:armchair', 'assets/bg/pano-copper.jpg', 'assets/bg/pano-neon.jpg', 'assets/tex/room-wall.jpg', 'assets/tex/room-floor.jpg', 'assets/bg/room-window.jpg'];
const SFX = ['nip', 'gulp', 'flare', 'flare-end', 'bonk', 'scatter', 'regrab', 'shoo', 'clear', 'star', 'tube', 'splash', 'feeder', 'pop', 'eggs', 'hatch', 'grown', 'newfish', 'frenzy', 'courtship', 'bloop', 'wipe', 'dock', 'hiss', 'clunk', 'current-loop', 'portal', 'wrap', 'chirp', 'thrum', 'click', 'flick', 'swat', 'deny', 'news', 'travel', 'worldcard', 'ui-click', 'ui-back', 'amb-tank', 'amb-room', 'amb-pipe'];

let mode = null, modeName = 'boot', paused = false, frozen = false, busy = false;
let titleMode = null;
const game = {};

// ---------- portraits (rendered once per fish) ----------
const portraits = {};
let pScene, pCam, pRT;
function portrait(fid, silhouette = false, big = false) {
  const key = fid + (silhouette ? ':s' : '') + (big ? ':b' : '');
  if (portraits[key]) return portraits[key];
  const size = big ? 320 : 160;
  if (!pScene) {
    pScene = new THREE.Scene();
    pScene.add(new THREE.HemisphereLight(0xeaffff, 0x305060, 1.7));
    const d = new THREE.DirectionalLight(0xffffff, 2.2); d.position.set(2, 3, 4); pScene.add(d);
    pCam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  }
  const body = getBody('male'); if (!body) return '';
  const def = FISH_BY_ID[fid];
  const f = new Fish(body, silhouette ? { ...def, bodyA: '#2a4a5a', bodyB: '#2a4a5a', finA: '#2a4a5a', finB: '#2a4a5a', accent: '#2a4a5a', sheen: '#000000', pattern: 0 } : def);
  f.U.uPhase.value = 1.2; f.U.uSwim.value = 0.2;
  f.group.rotation.y = Math.PI / 2 - 0.12;
  pScene.add(f.group);
  pCam.position.set(0, 0.0, 2.55); pCam.lookAt(-0.16, -0.02, 0);
  const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace, samples: 4 });
  const prevTone = renderer.toneMapping;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(pScene, pCam);
  const px = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1); renderer.toneMapping = prevTone;
  pScene.remove(f.group); f.dispose(); rt.dispose();
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  if (silhouette) for (let i = 0; i < img.data.length; i += 4) { if (img.data[i + 3] > 10) { img.data[i] = 40; img.data[i + 1] = 70; img.data[i + 2] = 85; } }
  g.putImageData(img, 0, 0);
  portraits[key] = c.toDataURL();
  return portraits[key];
}

// ---------- context for modes and UI ----------
const ctx = {
  renderer, progress,
  shakeAmt: 0,
  portrait,
  setAction(a) { ui.setAction(a); },
  toast(msg, icon) { ui.toast(msg, icon); },
  biteBump(n = 1) { ui.bump(n); },
  shake(a) { if (!progress.s.settings.reduceMotion) ctx.shakeAmt = Math.max(ctx.shakeAmt, a); },
  statusChanged() { refreshStatus(); },
  tip(key) { showTip(key); },
  currentWorld() { if (modeName === 'room') return progress.s.at && NODES[progress.s.at] ? NODES[progress.s.at].world : 'cw'; return mode?.world || NODES[progress.s.at]?.world || 'cw'; },
  where() { return modeName === 'pipe' ? mode.id : modeName === 'tank' ? mode.id : 'room'; },
  doAction(id) { if (mode?.doAction) mode.doAction(id); refreshStatus(); },
  leaveTank(tankId) { const n = NODES[tankId]; go('pipe', { mazeId: n.maze, exit: n.exit }); },
  leaveMaze(mazeId, n) {
    const tgt = NODES[mazeId].exits[n];
    if (tgt.includes(':')) { const [m, e] = tgt.split(':'); go('pipe', { mazeId: m, exit: +e }); return; }
    const node = NODES[tgt];
    if (node.type === 'machine') { enterRoomFromMachine(node); return; }
    go('tank', { tankId: tgt, from: 'pipe' });
  },
  toRoom(how, tankId) { audio.sfx('bloop'); go('room', { from: 'bubbleout' }); },
  dock(d) {
    setTimeout(() => go('tank', { tankId: d.lands, from: 'dock' }), 600);
  },
  becomeFish(fid, tankId) { doBecome(fid, tankId); },
  becomeFrom(tankId) { // from the Map
    const fid = NODES[tankId].son;
    const goThere = () => { ui.close(); paused = false; go('tank', { tankId, from: 'travel' }, () => doBecome(fid, tankId)); };
    if (modeName === 'pipe') ui.confirm(`Leave ${MAZES[mode.id].name}? Your bites are kept.`, goThere, () => openMap(), 'Leave', 'Stay');
    else goThere();
  },
  fastTravel(tankId) {
    const goThere = () => { ui.close(); paused = false; audio.sfx('travel'); go('tank', { tankId, from: 'travel' }); };
    if (modeName === 'pipe') ui.confirm(`Leave ${MAZES[mode.id].name}? Your bites are kept.`, goThere, () => openMap(), 'Leave', 'Stay');
    else goThere();
  },
  switchFish(fid) {
    const home = progress.s.fishHome[fid] || 'cw-home';
    const goThere = () => { ui.close(); paused = false; progress.become(fid, modeName === 'tank' ? mode.id : null); go('tank', { tankId: home, from: 'travel' }); };
    if (modeName === 'pipe') ui.confirm(`Leave ${MAZES[mode.id].name}? Your bites are kept.`, goThere, () => ui.collection(resumeBack, { inGame: true }), 'Leave', 'Stay');
    else goThere();
  },
  openMap() { openMap(); },
  pause() { pauseGame(); },
  pauseAction(a) { pauseAction(a); },
  titleAction(a) { titleAction(a); },
  applySettings() { applySettings(); },
  resetSave() { progress.resetAll(); progress.save(true); location.reload(); },
};
const ui = new UI(ctx);
ctx.ui = ui;
const modes = { tank: new TankMode(ctx), pipe: new PipeMode(ctx), room: new RoomMode(ctx) };

function applySettings() {
  const st = progress.s.settings;
  audio.musicVol = st.music; audio.sfxVol = st.sfx; audio.setMuted(st.muted); audio.applyVolumes();
  ui.setMode(modeName);
}

// ---------- mode switching ----------
function go(name, params, after) {
  if (busy) return;
  busy = true; input.enabled = false; input.clear();
  audio.sfx(name === 'pipe' ? 'tube' : 'wipe', { vol: 0.7 });
  ui.wipe(() => {
    switchMode(name, params);
    after?.();
  }, () => { busy = false; input.enabled = true; input.clear(); });
}
function disposeScene(sc) {
  if (!sc) return;
  sc.traverse(o => {
    if (o.isLight && o.shadow?.map) { o.shadow.map.dispose(); o.shadow.map = null; }
    if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of ms) { if (m.map?.userData?.own) m.map.dispose(); m.dispose(); }
  });
}
function switchMode(name, params) {
  const oldScene = mode?.scene;
  mode?.exit?.();
  disposeScene(oldScene);
  if (titleMode) { const ts = titleMode.scene; titleMode.exit(); disposeScene(ts); titleMode = null; }
  modeName = name; mode = modes[name];
  mode.enter(params);
  mode.resize(innerWidth, innerHeight);
  ui.showHud(true); ui.setMode(name); ui.setAction(null);
  if (name === 'pipe') ui.pipeEnter(mode);
  if (name === 'tank') {
    progress.s.at = params.tankId;
    if (!progress.s.seen.visited.includes(params.tankId)) progress.s.seen.visited.push(params.tankId);
    audio.music('music-tank'); audio.ambience('amb-tank');
    if (params.from === 'pipe') audio.sfx('splash', { vol: 0.6 });
    const w = NODES[params.tankId].world;
    const first = progress.reachWorld(w);
    progress.save(true);
    if (first || (params.from === 'dock' && !progress.s.seen.worlds.includes(w))) { if (!progress.s.seen.worlds.includes(w)) progress.s.seen.worlds.push(w); audio.sfx('worldcard'); setTimeout(() => ui.worldCard(w), 300); }
    if (params.tankId === 'cw-home' && !progress.s.seen.tips.includes('start')) showTip('start');
    if (progress.s.won && !progress.s.seen.victory) setTimeout(() => { if (!ui.isOpen) startVictory(); }, 900);
  } else if (name === 'pipe') {
    if (!progress.s.seen.visited.includes(params.mazeId)) progress.s.seen.visited.push(params.mazeId);
    const w = MAZES[params.mazeId].world;
    const alt = MUSIC[w] + '-2';
    audio.music((params.mazeId.charCodeAt(params.mazeId.length - 1) % 2) ? MUSIC[w] : alt);
    audio.ambience('amb-pipe');
    progress.save(true);
    if (!progress.s.seen.tips.includes('pipe')) showTip('pipe');
  } else if (name === 'room') {
    progress.s.at = 'room'; progress.s.roomFound = true; progress.save(true);
    audio.music('music-room'); audio.ambience('amb-room');
  }
  refreshStatus();
}
function enterRoomFromMachine(node) {
  audio.sfx('bloop');
  progress.s.roomFound = true;
  if (node.unlocks) progress.unlockDock(node.unlocks);
  go('room', { from: 'machine' });
}
function doBecome(fid, tankId) {
  const first = progress.become(fid, tankId);
  if (modeName === 'tank') modes.tank.swapPlayer(FISH_BY_ID[fid]);
  audio.sfx(first ? 'newfish' : 'star');
  ui.refresh();
  if (first) {
    paused = true;
    ui.setAction(null);
    ui.card({ title: `You are ${FISH_BY_ID[fid].name}!`, sub: `${FISH_BY_ID[fid].line} ${progress.s.collected.length} / ${FISH.length} bettas collected.`, fish: fid, onDone: () => { ui.close(); paused = false; if (progress.s.won && !progress.s.seen.victory) startVictory(); } });
  }
  refreshStatus();
}
function startVictory() {
  if (busy) { setTimeout(startVictory, 300); return; }
  progress.s.seen.victory = true; progress.save(true);
  const back = progress.s.at;
  go('room', { victory: true }, () => {
    audio.sting('music-victory');
    setTimeout(() => { paused = false; ui.victory(() => { ui.close(); go('tank', { tankId: NODES[back] ? back : 'cw-home', from: 'travel' }); }); }, 5000);
  });
}

// ---------- status / tips ----------
function refreshStatus() {
  ui.refresh();
  if (modeName === 'tank') { const s = mode.status(); ui.setStatus(s.name, s.line); }
}
const TIPS = {
  start: () => isTouch() ? 'Push the stick to swim' : 'Hold the mouse button to swim (or use WASD)',
  rise: () => isTouch() ? 'Tap the up arrow to rise - eat the bites on top!' : 'Space to rise - eat the bites on top!',
  tube: () => 'Swim up into the tube',
  pipe: () => isTouch() ? 'Swipe to turn' : 'Arrow keys or WASD to turn',
  flare: () => 'You flared! Chase them off for bonus bites',
};
function showTip(key) {
  if (progress.s.seen.tips.includes(key)) return;
  progress.s.seen.tips.push(key); progress.save();
  ui.tip(TIPS[key]());
}

// ---------- menus ----------
function toggleMute() { progress.s.settings.muted = !progress.s.settings.muted; applySettings(); progress.save(true); ui.toast(progress.s.settings.muted ? 'Sound off' : 'Sound on', progress.s.settings.muted ? 'mute' : 'sound'); }
ctx.toggleMute = toggleMute;
function resumeBack() { ui.close(); paused = false; audio.duck(false); }
function pauseGame() { if (paused || modeName === 'boot' || modeName === 'title') return; paused = true; input.clear(); audio.duck(true); ui.pause(); }
function openMap() { paused = true; input.clear(); audio.duck(true); ui.map(resumeBack); }
function pauseAction(a) {
  if (a === 'resume') return resumeBack();
  if (a === 'map') return ui.map(() => ui.pause());
  if (a === 'collection') return ui.collection(() => ui.pause(), { inGame: true });
  if (a === 'help') return ui.help(() => ui.pause());
  if (a === 'settings') return ui.settings(() => ui.pause());
  if (a === 'title') { progress.save(true); location.href = location.pathname + location.search; }
}
function titleAction(a) {
  const back = () => showTitle();
  if (a === 'continue') return startGame(false);
  if (a === 'new') {
    if (progress.hasSave() && progress.s.collected.length + progress.s.eaten > 1) return ui.confirm('Start a new game? Your saved progress will be erased.', () => startGame(true), back, 'Start over', 'Keep it');
    return startGame(true);
  }
  if (a === 'collection') return ui.collection(back, { inGame: false });
  if (a === 'settings') return ui.settings(back);
  if (a === 'credits') return ui.credits(back);
}
function showTitle() {
  ui.title({ hasSave: progress.hasSave() && (progress.s.eaten > 0 || progress.s.collected.length > 1) });
}
function startGame(fresh) {
  audio.unlock();
  if (fresh) progress.newGame();
  ui.close();
  const at = progress.s.at;
  if (at === 'room') go('room', { from: 'machine' });
  else go('tank', { tankId: NODES[at] ? at : 'cw-home', from: fresh ? 'start' : 'travel' });
}

// ---------- loop ----------
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function update(dt) {
  if (titleMode) { titleMode.update(dt); return; }
  if (!mode || paused) return;
  mode.update(dt);
  ctx.shakeAmt = Math.max(0, ctx.shakeAmt - dt * 1.2);
  progress.s.playTime += dt;
  input.clearPressed();
  // keyboard shortcuts
}
function render() {
  if (titleMode) titleMode.render(renderer);
  else if (mode) mode.render(renderer);
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (!frozen) { acc += dt; let n = 0; while (acc >= STEP && n < 6) { update(STEP); acc -= STEP; n++; } if (n >= 6) acc = 0; }
  render();
}

addEventListener('keydown', (e) => {
  if (modeName === 'boot' || modeName === 'title') return;
  const okBtn = ui.isOpen && ui.screen.querySelector('.celebrate [data-a=ok]');
  if (okBtn && ['Escape', 'KeyP', 'Tab', 'Enter', 'Space'].includes(e.code)) { e.preventDefault(); okBtn.click(); return; }
  if (ui.isOpen && ui.screen.querySelector('.worldcard') && ['Escape', 'KeyP', 'Tab'].includes(e.code)) return;
  if (e.code === 'Enter' && document.activeElement && document.activeElement.tagName === 'BUTTON' && !ui.isOpen) { e.preventDefault(); document.activeElement.blur(); }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (ui.isOpen && paused) resumeBack(); else pauseGame(); }
  if (e.code === 'Tab') { if (ui.isOpen && paused) resumeBack(); else openMap(); }
  if (e.code === 'KeyM') toggleMute();
  if ((e.code === 'KeyE' || e.code === 'Enter') && !paused && ui.action && !ui.action.disabled) { ctx.doAction(ui.action.id); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseGame(); progress.save(true); audio.suspend(true); } else audio.suspend(false); });
const portraitQ = matchMedia('(orientation: portrait) and (pointer: coarse)');
const checkPortrait = () => { if (portraitQ.matches) pauseGame(); };
portraitQ.addEventListener?.('change', checkPortrait);
addEventListener('blur', () => { if (modeName !== 'title' && modeName !== 'boot') pauseGame(); });

function resize() {
  checkPortrait?.();
  renderer.setPixelRatio(maxDpr());
  renderer.setSize(innerWidth, innerHeight, false);
  canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  mode?.resize(innerWidth, innerHeight); titleMode?.resize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));

// progress events -> toasts
progress.on((type, d) => {
  if (type === 'hatch') { audio.sfx('news'); ui.toast(`${d.node.name.replace("'s Tank", '')}'s eggs hatched!`, 'egg'); ui.mapBadge = true; ui.refresh(); }
  if (type === 'grown') { audio.sfx('grown'); ui.toast(`${FISH_BY_ID[d.fish].name} is grown! Become him from the Map.`, 'fish'); ui.mapBadge = true; ui.refresh(); if (modeName === 'tank' && mode.id === d.id) mode.refreshFry(); }
  if (type === 'dock') { ui.toast(`${WORLD_BY_ID[DOCKS.find(k => k.id === d.id).world].name} dock unlocked`, 'bubble'); }
  if (type === 'frenzy') { audio.sfx('frenzy'); ui.toast(`Feeding Frenzy in ${WORLD_BY_ID[d.world].name}! Fry here grow twice as fast`, 'star'); }
  if (type === 'trail') { audio.sfx('star'); ui.toast(`New bubble trail: ${d.trail[0].toUpperCase() + d.trail.slice(1)}! Pick it in the Collection`, 'bubble'); }
  if (type === 'hatch' && modeName === 'tank' && mode.id === d.id) mode.refreshFry();
  refreshStatus();
});

// ---------- debug hook (play-testing) ----------
window.__game = {
  state: () => ({
    screen: ui.isOpen ? (ui.screen.querySelector('h2')?.textContent || ui.screen.className) : modeName, mode: modeName, paused, busy,
    bites: progress.s.bites, eaten: progress.s.eaten, fish: progress.s.fish, at: progress.s.at, collected: progress.s.collected.length,
    won: progress.s.won, docks: progress.s.docks, worlds: progress.s.worlds, tanks: progress.s.tanks,
    action: ui.action?.id || null, detail: mode?.debug?.() || null,
  }),
  step(s) { frozen = true; const n = Math.round(s * 60); for (let i = 0; i < n; i++) update(STEP); render(); return this.state(); },
  resume() { frozen = false; },
  levels: () => Object.keys(MAZES),
  graph: () => NODES,
  teleport(nodeId, exit = 1) {
    ui.close(); paused = false; busy = false;
    if (nodeId === 'room') { switchMode('room', { from: 'machine' }); return this.state(); }
    const n = NODES[nodeId];
    if (n.type === 'maze') switchMode('pipe', { mazeId: nodeId, exit });
    else switchMode('tank', { tankId: nodeId, from: 'travel' });
    input.enabled = true; return this.state();
  },
  goToLevel(id, exit = 1) { return this.teleport(id, exit); },
  give(n) { progress.s.bites += n; ui.refresh(); return progress.s.bites; },
  eat(n, world = 'cw') { progress.eat(n, world); ui.refresh(); return progress.s.eaten; },
  setTank(id, stage) { const t = progress.tank(id); t.claimed = true; if (stage) { t.stage = stage; t.progress = 0; } progress.save(true); return t; },
  unlockDock(id) { progress.unlockDock(id); return progress.s.docks; },
  tankPos(v, yaw) { if (modeName === 'tank' || modeName === 'room') mode.teleportTo(v, yaw); return mode.debug(); },
  perf: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries, loaded: loadStats }),
  audioState: () => audio.state(),
  // autopilot: follow the stored path from one exit to another through the real input layer
  solve(from, to, maxSeconds = 120) {
    if (modeName !== 'pipe') return { error: 'not in a pipe' };
    const m = MAZES[mode.id]; const path = m.paths[`${from}>${to}`];
    if (!path) return { error: 'no path' };
    return this._drive(path, to, maxSeconds);
  },
  sweep(fraction = 1, maxSeconds = 400) {
    if (modeName !== 'pipe') return { error: 'not in a pipe' };
    const m = MAZES[mode.id]; const mv = m.cover.moves;
    const n = Math.max(1, Math.round(mv.length * fraction));
    return this._drive(fraction >= 1 ? mv : mv.slice(0, n), fraction >= 1 ? m.cover.to : null, maxSeconds);
  },
  _drive(moves, toExit, maxSeconds) {
    frozen = true;
    const pipe = mode; const startHits = pipe.hits; const startEaten = progress.s.eaten;
    const seq = moves.replace(/P/g, '');
    let i = 0, t = 0, lastKey = '';
    const key = (P) => P.x + ',' + P.y;
    let reached = false;
    while (t < maxSeconds) {
      if (modeName !== 'pipe' || mode !== pipe || pipe.leaving) { reached = true; break; }
      const P = pipe.P;
      const k = key(P);
      if (P.f === 0 || k !== lastKey) {
        // which move index matches our position? advance index when we have arrived at the next path cell
        lastKey = k;
      }
      if (i < seq.length) { input.dirQueue = seq[i]; }
      const before = key(P);
      update(STEP); t += STEP;
      if (key(pipe.P) !== before) {
        // moved one cell: if it was the queued direction's cell, advance
        i++;
        while (i < seq.length && (seq[i] === undefined)) i++;
      }
      if (i >= seq.length && toExit == null && pipe.P.f === 0) break;
    }
    render(); frozen = false;
    return { reached: reached || (toExit == null), time: +t.toFixed(1), bitesEaten: progress.s.eaten - startEaten, hits: (pipe.hits - startHits), mode: modeName, at: this.state().detail };
  },
};

// ---------- boot ----------
async function boot() {
  input.init(canvas);
  input.onFirstInput = () => audio.unlock();
  progress.load();
  applySettings();
  resize();
  ui.loading(0);
  await document.fonts.load('600 32px Fredoka').catch(() => { });
  ui.fontsReady = true;
  const loadP = loadAll(BOOT);
  const bodyP = Promise.all([loadBody('male', 'assets/models/body-male.glb'), loadBody('female', 'assets/models/body-female.glb')]);
  const tick = setInterval(() => ui.setLoading(loadStats.total ? loadStats.done / Math.max(loadStats.total, BOOT.length + 2) : 0), 100);
  await Promise.all([loadP, bodyP]);
  clearInterval(tick); ui.setLoading(1);
  audio.preload(SFX, 'sfx');
  // compile the main programs once (no first-use hitches)
  titleMode = new TankMode(ctx);
  titleMode.enter({ tankId: NODES[progress.s.at] && NODES[progress.s.at].type === 'tank' ? progress.s.at : 'cw-home', demo: true, from: 'title' });
  titleMode.resize(innerWidth, innerHeight);
  try { await renderer.compileAsync(titleMode.scene, titleMode.camera); } catch { }
  modeName = 'title';
  for (const f of FISH.slice(0, 3)) portrait(f.id);
  ui.showHud(false);
  const ld = document.querySelector('#screen'); const ghost = ld.cloneNode(true); ghost.id = ''; document.body.appendChild(ghost);
  showTitle();
  requestAnimationFrame(() => { ghost.classList.add('fadeout'); setTimeout(() => ghost.remove(), 600); });
  audio.music('music-tank');
  loadAll(LATER);
  requestAnimationFrame(frame);
}
boot();
