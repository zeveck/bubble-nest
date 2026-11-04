// HTML interface over the canvas: HUD, menus, map, collection, toasts, labels.
import { ICON, KIND_ICON } from './icons.js';
import { NODES, WORLDS, DOCKS } from './data/worlds.js';
import { MAZES } from './data/mazes.js';
import { FISH, FISH_BY_ID, LADIES } from './data/fish.js';
import { progress, Z, TRAIL_NAMES, WORLD_BY_ID } from './progress.js';
import { audio } from './audio.js';
import { input, isTouch } from './input.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WORLD_NAME = { cw: 'Clearwater', cp: 'Copperworks', nn: 'Neon Night' };

export class UI {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = $('#ui');
    this.root.innerHTML = `
      <div class="hud" id="hud" hidden>
        <div class="hud-tl"><div class="chip fishchip" id="fishchip"><span class="portrait" id="chipPortrait"></span><span class="flare-ring" id="flareRing"></span></div><div class="chip bites" id="bites"><span class="ic">${ICON.bite}</span><b id="biteN">0</b></div></div>
        <div class="hud-tc" id="status"></div>
        <div class="hud-tr"><button class="round" id="btnMap" aria-label="Map">${ICON.map}<span class="badge" id="mapBadge" hidden></span></button><button class="round" id="btnMute" aria-label="Sound on or off">${ICON.sound}</button><button class="round" id="btnPause" aria-label="Pause">${ICON.pause}</button></div>
        <canvas id="minimap" class="minimap" hidden></canvas>
        <div id="labels" class="labels"></div>
        <div id="pips" class="labels"></div>
        <button class="action" id="action" hidden></button>
        <div class="risedive" id="risedive" hidden><button class="round big" id="btnRise" aria-label="Rise">${ICON.up}</button><button class="round big" id="btnDive" aria-label="Dive">${ICON.down}</button></div>
        <div class="tip" id="tip" hidden></div>
      </div>
      <div class="toasts" id="toasts"></div>
      <div class="screen" id="screen" hidden></div>
      <div class="wipe" id="wipe"></div>`;
    this.hud = $('#hud'); this.screen = $('#screen');
    $('#btnMap').onclick = () => { audio.sfx('ui-click'); this.ctx.openMap(); };
    $('#btnPause').onclick = () => { audio.sfx('ui-click'); this.ctx.pause(); };
    $('#btnMute').onclick = () => { this.ctx.toggleMute(); };
    this.root.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTimeout(() => b.blur(), 0); });
    const act = $('#action');
    act.onclick = () => { if (this.action && !this.action.disabled) { audio.sfx('ui-click'); this.ctx.doAction(this.action.id); } else if (this.action?.disabled) audio.sfx('deny'); };
    const hold = (el, key) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); input[key] = true; el.setPointerCapture?.(e.pointerId); });
      const up = () => { input[key] = false; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    };
    hold($('#btnRise'), 'rise'); hold($('#btnDive'), 'dive');
    this.toastQ = []; this.toastBusy = false;
    this.labels = $('#labels'); this.pips = $('#pips');
    this.labelEls = {};
  }

  showHud(on) { this.hud.hidden = !on; }
  setMode(mode) {
    this.mode = mode;
    this.hud.dataset.mode = mode;
    $('#risedive').hidden = !(isTouch() && (mode === 'tank' || mode === 'room'));
    $('#minimap').hidden = !(mode === 'pipe' && progress.s.settings.minimap);
    this.labels.innerHTML = ''; this.pips.innerHTML = ''; this.labelEls = {};
    this.refresh();
  }
  refresh() {
    $('#biteN').textContent = progress.s.bites;
    const def = FISH_BY_ID[progress.s.fish];
    const pr = $('#chipPortrait');
    if (pr.dataset.fish !== def.id) { const u = this.ctx.portrait(def.id); if (u) { pr.dataset.fish = def.id; pr.style.backgroundImage = `url(${u})`; } }
    $('#fishchip').title = def.name;
    $('#mapBadge').hidden = !this.mapBadge;
    const mb = $('#btnMute'); const m = progress.s.settings.muted; if (mb.dataset.m !== String(m)) { mb.dataset.m = String(m); mb.innerHTML = m ? ICON.mute : ICON.sound; }
  }
  bump(n) {
    const b = $('#bites'); b.classList.remove('bump', 'loss'); void b.offsetWidth; b.classList.add(n < 0 ? 'loss' : 'bump');
    $('#biteN').textContent = progress.s.bites;
  }
  setStatus(title, line, extra = '') {
    $('#status').innerHTML = `<div class="st-title">${esc(title)}${extra}</div>${line ? `<div class="st-line">${esc(line)}</div>` : ''}`;
  }
  setAction(a) {
    const el = $('#action');
    const key = a ? a.id + '|' + a.label + '|' + !!a.disabled : '';
    if (key === this.actionKey) return;
    this.actionKey = key; this.action = a;
    if (!a) { el.hidden = true; return; }
    el.hidden = false; el.textContent = a.label; el.classList.toggle('disabled', !!a.disabled);
    el.dataset.id = a.id;
  }
  flare(frac) { const r = $('#flareRing'); r.style.opacity = frac > 0 ? 1 : 0; r.style.setProperty('--f', frac); }

  // ---------- tips ----------
  tip(text) {
    const el = $('#tip'); el.textContent = text; el.hidden = false;
    clearTimeout(this.tipT); this.tipT = setTimeout(() => { el.hidden = true; }, 5000);
  }
  hideTip() { $('#tip').hidden = true; }

  // ---------- toasts ----------
  toast(msg, icon = 'star') {
    this.toastQ.push({ msg, icon });
    if (!this.toastBusy) this.nextToast();
  }
  nextToast() {
    const t = this.toastQ.shift(); if (!t) { this.toastBusy = false; return; }
    this.toastBusy = true;
    const el = h('div', 'toast', `<span class="ic">${ICON[t.icon] || ICON.star}</span><span>${esc(t.msg)}</span>`);
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2800);
    setTimeout(() => { el.remove(); this.nextToast(); }, 3200);
  }

  // ---------- wipe ----------
  wipe(mid, done) {
    const w = $('#wipe');
    w.innerHTML = '';
    for (let i = 0; i < 26; i++) { const b = h('i'); const s = 8 + Math.random() * 22; b.style.cssText = `left:${Math.random() * 100}%;width:${s}vmin;height:${s}vmin;animation-delay:${Math.random() * 0.15}s`; w.appendChild(b); }
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
    setTimeout(() => { mid?.(); }, 260);
    setTimeout(() => { w.classList.remove('go'); done?.(); }, 620);
  }

  // ---------- pipe HUD ----------
  pipeEnter(pipe) {
    this.labels.innerHTML = ''; this.labelEls = {};
    for (const [n] of Object.entries(pipe.maze.exits)) {
      const el = h('div', 'exitlabel'); this.labels.appendChild(el); this.labelEls[n] = el;
    }
    this.pipeInfo(pipe, true);
    this.drawMinimapBase(pipe);
  }
  pipeExit() { this.labels.innerHTML = ''; this.pips.innerHTML = ''; this.labelEls = {}; }
  exitInfo(target) {
    if (!target) return { icon: 'arrows', text: '' };
    if (target.includes(':')) {
      const mz = target.split(':')[0]; const m = MAZES[mz]; const st = progress.s.stars[mz] || 0; const nd = NODES[mz];
      if (nd?.locked?.bettas && progress.s.collected.length < nd.locked.bettas) return { icon: 'lock', text: `${m.name}: ${nd.locked.bettas} bettas (you have ${progress.s.collected.length})`, kind: 'maze', afford: false };
      if (nd?.boss) return { icon: 'star', text: progress.s.grandWon ? `${m.name}: King Claw beaten!` : `${m.name}: beat King Claw!`, stars: st, kind: 'maze' };
      return { icon: 'arrows', text: m.name, stars: st, kind: 'maze' };
    }
    const n = NODES[target];
    if (!n) return { icon: 'arrows', text: '' };
    if (n.type === 'machine') return { icon: 'bubble', text: progress.s.roomFound ? 'To the Fish Room' : 'A bubble machine?', kind: 'machine' };
    const t = progress.s.tanks[target];
    if (progress.isHome(target)) {
      const fs = progress.fryStatus(target);
      let text = n.name;
      if (fs?.stage === 'eggs') text = `Hatch: ${fs.left} ${(fs.left) === 1 ? 'bite' : 'bites'}`;
      else if (fs?.stage === 'fry') text = `Grown: ${fs.left} ${(fs.left) === 1 ? 'bite' : 'bites'}`;
      else if (fs?.stage === 'grown') text = 'Ready!';
      return { icon: 'house', text, kind: 'home', ready: fs?.stage === 'grown', sub: 'Feeder full' };
    }
    const z = Z(n), have = progress.s.bites, afford = have >= z;
    const visited = progress.s.seen.visited.includes(target);
    const t2 = afford ? `Nest: ${z} ${(z) === 1 ? 'bite' : 'bites'} (you have ${have})` : `Nest: ${z} ${(z) === 1 ? 'bite' : 'bites'} (need ${z - have} more)`;
    if (n.kind === 'lady') return { icon: visited ? 'heart' : 'heartq', text: t2, kind: 'lady', afford };
    return { icon: 'box', text: t2, kind: 'empty', afford };
  }
  pipeInfo(pipe, force) {
    const left = pipe.bitesTotal - pipe.bitesEatenUnique;
    const st = progress.s.stars[pipe.id] || 0;
    const key = pipe.id + left + st;
    if (!force && key === this.pipeKey) return;
    this.pipeKey = key;
    const stars = `<span class="stars">${[1, 2].map(i => `<span class="${i <= st ? 'on' : ''}">${i <= st ? ICON.star : ICON.starO}</span>`).join('')}</span>`;
    this.setStatus(pipe.maze.name, left > 0 ? `Bites left ${left}` : 'All bites eaten!', stars);
  }
  pipeUpdate(pipe) {
    this.pipeInfo(pipe);
    this.flare(pipe.flareT > 0 ? pipe.flareT / (pipe.wcfg.flareTime || 6) : 0);
    const node = NODES[pipe.id];
    const scr = pipe.exitScreen();
    const W = innerWidth, H = innerHeight;
    let gold = null, goldD = 1e9;
    const me = pipe.fishPos();
    for (const s of scr) {
      const el = this.labelEls[s.n]; if (!el) continue;
      const target = node.exits[s.n];
      const info = this.exitInfo(target);
      const html = `<span class="ic k-${info.kind || 'maze'} ${info.afford === false ? 'grey' : ''}">${ICON[info.icon]}</span><span class="tx">${esc(info.text)}</span>${info.stars != null ? `<span class="stars sm">${[1, 2].map(i => `<span class="${i <= info.stars ? 'on' : ''}">${i <= info.stars ? ICON.star : ICON.starO}</span>`).join('')}</span>` : ''}`;
      if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
      el.hidden = !s.on;
      const side = s.dir === 'L' || s.dir === 'R';
      const x = Math.max(80, Math.min(W - 80, s.x + (s.dir === 'L' ? 40 : s.dir === 'R' ? -40 : 0))), y = Math.max(70, Math.min(H - 40, s.y + (s.dir === 'U' ? 40 : s.dir === 'D' ? -40 : -42)));
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      if ((info.afford && (info.kind === 'lady' || info.kind === 'empty')) || info.ready) {
        const ex = pipe.exitObjs.find(e => e.n === s.n); const d = ex.pos.distanceTo(me);
        if (d < goldD) { goldD = d; gold = s; }
      }
    }
    // edge pips: enemies off screen within 6 cells, and one gold pip toward a ready exit
    const pips = [];
    for (const e of pipe.enemyScreen()) {
      if (e.d > 6 || e.state === 'rest' || e.state === 'home') continue;
      if (Math.abs(e.x) < 0.95 && Math.abs(e.y) < 0.92) continue;
      pips.push({ x: e.x, y: e.y, cls: 'pip' });
    }
    if (gold && !gold.on) pips.push({ x: (gold.x / W) * 2 - 1, y: 1 - (gold.y / H) * 2, cls: 'pip gold' });
    while (this.pips.children.length < pips.length) this.pips.appendChild(h('div', 'pip', ICON.up));
    [...this.pips.children].forEach((el, i) => {
      const p = pips[i]; if (!p) { el.hidden = true; return; }
      el.hidden = false; el.className = p.cls;
      const ang = Math.atan2(-p.y, p.x);
      const top = H < 500 ? 76 : 92;
      let cx = W / 2 + Math.max(-1, Math.min(1, p.x)) * (W / 2 - 26), cy = Math.max(top, Math.min(H - 26, H / 2 - Math.max(-1, Math.min(1, p.y)) * (H / 2 - 26)));
      if (cy < top + 40) cx = Math.max(200, Math.min(W - 200, cx));
      el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%) rotate(${ang + Math.PI / 2}rad)`;
    });
    this.drawMinimap(pipe);
  }
  drawMinimapBase(pipe) {
    const c = $('#minimap'); if (c.hidden) return;
    this.mmFor = pipe.id;
    const m = pipe.maze; const s = isTouch() ? Math.floor(120 / m.w) : Math.floor(170 / m.w);
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = m.w * s * dpr; c.height = m.h * s * dpr; c.style.width = m.w * s + 'px'; c.style.height = m.h * s + 'px';
    this.mmS = s * dpr;
    const base = document.createElement('canvas'); base.width = c.width; base.height = c.height;
    const g = base.getContext('2d');
    g.fillStyle = 'rgba(16,30,40,0.55)'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(191,243,234,0.85)';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.grid[y][x] !== '#') g.fillRect(x * this.mmS + this.mmS * 0.15, y * this.mmS + this.mmS * 0.15, this.mmS * 0.7 + (m.grid[y][x + 1] && m.grid[y][x + 1] !== '#' ? this.mmS * 0.3 : 0), this.mmS * 0.7 + (m.grid[y + 1] && m.grid[y + 1][x] !== '#' ? this.mmS * 0.3 : 0));
    this.mmBase = base;
  }
  drawMinimap(pipe) {
    const c = $('#minimap'); if (c.hidden) return;
    if (!this.mmBase || this.mmFor !== pipe.id) { this.drawMinimapBase(pipe); this.mmFor = pipe.id; if (!this.mmBase) return; }
    const g = c.getContext('2d'), s = this.mmS;
    g.clearRect(0, 0, c.width, c.height); g.drawImage(this.mmBase, 0, 0);
    const col = { lady: '#ff6fa8', empty: '#f2c14a', home: '#7ee08a', maze: '#ffffff', machine: '#7ad8ff' };
    for (const [n, e] of Object.entries(pipe.maze.exits)) {
      const info = this.exitInfo(NODES[pipe.id].exits[n]);
      g.fillStyle = col[info.kind || 'maze']; g.beginPath(); g.arc((e.x + 0.5) * s, (e.y + 0.5) * s, s * 0.75, 0, 7); g.fill();
    }
    const p = pipe.fishPos(); const m = pipe.maze;
    const fx = p.x / 1.6 + m.w / 2, fy = m.h / 2 - p.y / 1.6;
    g.fillStyle = '#ff4a4a'; g.strokeStyle = '#fff'; g.lineWidth = s * 0.25; g.beginPath(); g.arc(fx * s, fy * s, s * 0.6, 0, 7); g.fill(); g.stroke();
  }

  tankUpdate(tank) {
    const W = innerWidth, H = innerHeight;
    const marks = [
      { id: 'leaf', s: tank.leafScreen(), html: `<span class="ic k-lady">${ICON.bubble}</span><span class="tx">Nest spot</span>`, cls: 'gold' },
      { id: 'tube', s: tank.tubeScreen(), html: `<span class="ic k-maze">${ICON.up}</span><span class="tx">To the pipes</span>`, cls: 'tube', tap: () => tank.goTube() },
    ];
    for (const m of marks) {
      let el = this.labelEls[m.id], pip = this.labelEls[m.id + 'Pip'];
      if (!el) {
        el = h('div', 'exitlabel ' + (m.tap ? 'tappable' : '')); el.innerHTML = m.html; this.labels.appendChild(el); this.labelEls[m.id] = el;
        pip = h('div', 'pip ' + m.cls + (m.tap ? ' tappable' : ''), ICON.up); this.pips.appendChild(pip); this.labelEls[m.id + 'Pip'] = pip;
        if (m.tap) for (const e of [el, pip]) e.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); m.tap(); });
      }
      const l = m.s;
      el.hidden = !l || !l.on; pip.hidden = !l || l.on;
      if (l && l.on) el.style.transform = `translate(${Math.max(80, Math.min(W - 80, l.x))}px, ${Math.max(90, Math.min(H - 60, l.y - 30))}px) translate(-50%, -50%)`;
      if (l && !l.on) {
        let nx = l.nx, ny = l.ny; if (l.behind) { nx = -nx; ny = -ny; }
        const k = 1 / Math.max(Math.abs(nx), Math.abs(ny), 0.001); nx *= k; ny *= k;
        const cx = W / 2 + nx * (W / 2 - 40), cy = H / 2 - ny * (H / 2 - 90);
        pip.style.transform = `translate(${cx}px, ${Math.max(90, Math.min(H - 40, cy))}px) translate(-50%,-50%) rotate(${Math.atan2(-ny, nx) + Math.PI / 2}rad)`;
      }
    }
  }
  roomUpdate(room) {
    const scr = room.dockScreen();
    for (const d of scr) {
      let el = this.labelEls[d.id];
      if (!el) { el = h('div', 'exitlabel dock'); this.labels.appendChild(el); this.labelEls[d.id] = el; }
      const hint = d.world === 'cp' ? 'Find the bubble machine in Clearwater' : 'Find the bubble machine in Copperworks';
      const html = d.unlocked ? `<span class="ic k-machine">${ICON.bubble}</span><span class="tx">${WORLD_NAME[d.world]}</span>` : `<span class="ic grey">${ICON.lock}</span><span class="tx">${hint}</span>`;
      if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
      el.hidden = !d.on || d.dist > 3.5;
      const hw = (el.offsetWidth || 200) / 2 + 8; el.style.transform = `translate(${Math.max(hw, Math.min(innerWidth - hw, d.x))}px, ${Math.max(80, d.y)}px) translate(-50%, -50%)`;
    }
    const k = 'room' + progress.s.collected.length;
    if (this.roomKey !== k) { this.roomKey = k; this.setStatus('The Fish Room', `Grand Tank ${progress.s.collected.length} / ${FISH.length}`); }
  }

  // ---------- screens ----------
  open(html, cls = '') {
    this.screen.className = 'screen ' + cls; this.screen.innerHTML = html; this.screen.hidden = false;
    this.screen.scrollTop = 0;
    return this.screen;
  }
  close() { this.screen.hidden = true; this.screen.innerHTML = ''; }
  get isOpen() { return !this.screen.hidden; }

  loading(frac) {
    document.getElementById('boot')?.remove();
    const s = this.open(`<div class="loading"><div class="logo">Bubble Nest</div><div class="bar"><i style="width:${Math.round(frac * 100)}%"></i></div><p>Filling the tanks…</p></div>`, 'title-bg');
    return s;
  }
  setLoading(frac) { const i = $('.loading .bar i'); if (i) i.style.width = Math.round(frac * 100) + '%'; }

  title({ hasSave }) {
    const s = this.open(`
      <div class="title">
        <div class="logo">Bubble Nest</div>
        <p class="tag">Swim the pipes. Munch the bites. Collect all 20 bettas.</p>
        <div class="menu">
          ${hasSave ? '<button class="btn primary" data-a="continue">Continue</button>' : ''}
          <button class="btn ${hasSave ? '' : 'primary'}" data-a="new">${hasSave ? 'New game' : 'Play'}</button>
          <button class="btn" data-a="collection">Collection</button>
          <button class="btn" data-a="settings">Settings</button>
          <button class="btn" data-a="credits">Credits</button>
        </div>
      </div>
      <a class="corner-link left" href="https://synapticnoise.com/">synapticnoise.com</a>
      <a class="corner-link right" href="https://github.com/zeveck/bubble-nest" target="_blank" rel="noopener" title="Bubble Nest on GitHub: how it was made" aria-label="Bubble Nest on GitHub: how it was made">GitHub</a>`, 'clear');
    s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { audio.unlock(); audio.sfx('ui-click'); this.ctx.titleAction(b.dataset.a); });
    // the corner links open their page only; keep their taps away from the game
    s.querySelectorAll('.corner-link').forEach(a => ['pointerdown', 'click', 'touchstart'].forEach(t => a.addEventListener(t, e => e.stopPropagation())));
  }

  confirm(text, yes, no, yesLabel = 'Yes', noLabel = 'Cancel') {
    const prev = this.screen.hidden ? null : { cls: this.screen.className, html: this.screen.innerHTML };
    const s = this.open(`<div class="panel small"><p class="q">${esc(text)}</p><div class="row"><button class="btn" data-a="no">${esc(noLabel)}</button><button class="btn primary" data-a="yes">${esc(yesLabel)}</button></div></div>`);
    s.querySelector('[data-a=yes]').onclick = () => { audio.sfx('ui-click'); yes(); };
    s.querySelector('[data-a=no]').onclick = () => { audio.sfx('ui-back'); no(); };
  }

  pause() {
    const s = this.open(`<div class="panel"><h2>Paused</h2><div class="menu">
      <button class="btn primary" data-a="resume">Resume</button>
      <button class="btn" data-a="map">Map</button>
      <button class="btn" data-a="collection">Collection</button>
      <button class="btn" data-a="help">How to play</button>
      <button class="btn" data-a="settings">Settings</button>
      <button class="btn" data-a="title">Title screen</button></div></div>`);
    s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { audio.sfx(b.dataset.a === 'resume' ? 'ui-back' : 'ui-click'); this.ctx.pauseAction(b.dataset.a); });
  }

  help(back) {
    const t = isTouch();
    const s = this.open(`<div class="panel wide"><h2>How to play</h2>
      <div class="cols">
        <section><h3>${ICON.fish} Tanks</h3><p>${t ? 'Push the stick to swim. Drag on the right to look around. Use the arrow buttons to rise and dive.' : 'Hold the left mouse button to swim toward the pointer, or use WASD. Space rises, Shift dives. Right-drag to look around.'}</p><p>Eat the bites on top, then swim up into the tube.</p></section>
        <section><h3>${ICON.arrows} Pipes</h3><p>${t ? 'Swipe to turn.' : 'Arrow keys or WASD to turn.'} Munch every bite for a star, without a bump for two. Enemies knock bites loose; grab a brine shrimp to flare and chase them off!</p></section>
        <section><h3>${ICON.heart} Nests and fry</h3><p>Swim to the floating leaf to build a bubble nest. Ladies lay eggs, which hatch and grow as you eat bites anywhere. Become each grown fry to collect all 20.</p></section>
        <section><h3>${ICON.star} Frenzy and worlds</h3><p>Nest with every lady in a world and fry there grow twice as fast. Find the bubble machine at the end of a world to reach the next one.</p></section>
      </div><div class="row"><button class="btn primary" data-a="back">Back</button></div></div>`);
    s.querySelector('[data-a=back]').onclick = () => { audio.sfx('ui-back'); back(); };
  }

  settings(back) {
    const st = progress.s.settings;
    const s = this.open(`<div class="panel"><h2>Settings</h2>
      <label class="set"><span>Music</span><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-k="music"></label>
      <label class="set"><span>Sound</span><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-k="sfx"></label>
      <label class="set"><span>Sensitivity</span><input type="range" min="0.4" max="2" step="0.1" value="${st.sens}" data-k="sens"></label>
      <label class="set chk"><span>Mute all</span><input type="checkbox" ${st.muted ? 'checked' : ''} data-k="muted"></label>
      <label class="set chk"><span>Invert rise and dive</span><input type="checkbox" ${st.invert ? 'checked' : ''} data-k="invert"></label>
      <label class="set chk"><span>Reduce motion</span><input type="checkbox" ${st.reduceMotion ? 'checked' : ''} data-k="reduceMotion"></label>
      <label class="set chk"><span>Minimap in pipes</span><input type="checkbox" ${st.minimap ? 'checked' : ''} data-k="minimap"></label>
      <label class="set chk"><span>Your school follows you</span><input type="checkbox" ${st.school !== false ? 'checked' : ''} data-k="school"></label>
      <div class="row"><button class="btn danger" data-a="reset">Reset save</button><button class="btn primary" data-a="back">Back</button></div></div>`);
    s.querySelectorAll('input').forEach(inp => inp.oninput = () => {
      const k = inp.dataset.k; st[k] = inp.type === 'checkbox' ? inp.checked : +inp.value;
      this.ctx.applySettings(); progress.save(true);
    });
    s.querySelector('[data-a=back]').onclick = () => { audio.sfx('ui-back'); back(); };
    s.querySelector('[data-a=reset]').onclick = () => {
      audio.sfx('ui-click');
      this.confirm('Erase all progress and start over?', () => { this.ctx.resetSave(); }, () => this.settings(back), 'Erase', 'Keep');
    };
  }

  credits(back) {
    const s = this.open(`<div class="panel"><h2>Credits</h2>
      <p class="cred"><b>Bubble Nest</b><br>A game idea by Rich Conlan.</p>
      <p class="cred">Built with three.js (MIT license).</p>
      <p class="cred">Font: Fredoka (SIL Open Font License).</p>
      <div class="row"><button class="btn primary" data-a="back">Back</button></div></div>`);
    s.querySelector('[data-a=back]').onclick = () => { audio.sfx('ui-back'); back(); };
  }

  collection(back, { inGame }) {
    const phone = Math.min(innerWidth, innerHeight) < 500;
    const cards = FISH.map((f, i) => {
      const got = progress.s.collected.includes(f.id);
      const src = this.lockedHint(f.id);
      return `<button class="card ${got ? '' : 'locked'} ${progress.s.fish === f.id ? 'current' : ''}" data-f="${f.id}">
        <span class="pic" style="background-image:url(${this.ctx.portrait(f.id, !got)})"></span>
        ${phone ? '' : `<span class="nm">${got ? esc(f.name) : '???'}</span><span class="ln">${got ? esc(f.line) : esc(src)}</span>`}
      </button>`;
    }).join('');
    const s = this.open(`<div class="panel wide coll"><h2>Collection <small>${progress.s.collected.length} / ${FISH.length}</small></h2>
      <div class="grid ${phone ? 'strip' : ''}">${cards}</div>
      <div class="row"><button class="btn primary" data-a="back">Back</button></div></div>`);
    s.querySelector('[data-a=back]').onclick = () => { audio.sfx('ui-back'); back(); };
    s.querySelectorAll('.card').forEach(c => c.onclick = () => { audio.sfx('ui-click'); this.fishCard(c.dataset.f, () => this.collection(back, { inGame }), { inGame }); });
  }
  lockedHint(fid) {
    const lady = Object.values(LADIES).find(l => l.son === fid);
    if (!lady) return '';
    const tank = Object.values(NODES).find(n => n.lady === lady.id);
    return `${lady.name}'s fry, ${WORLD_NAME[tank?.world] || ''}`;
  }
  fishCard(fid, back, { inGame }) {
    const f = FISH_BY_ID[fid]; const got = progress.s.collected.includes(fid);
    const fins = { halfmoon: 'Halfmoon', veiltail: 'Veiltail', crowntail: 'Crowntail', plakat: 'Plakat', doubletail: 'Double tail' }[f.fins];
    const trails = progress.s.trails;
    const cur = progress.s.fishTrail[fid] || 'default';
    const trailHtml = got && trails.length > 1 ? `<div class="trails"><span>Bubble trail</span>${trails.map(t => `<button class="chipbtn ${t === cur ? 'on' : ''}" data-t="${t}">${TRAIL_NAMES[t]}</button>`).join('')}</div>` : '';
    const canSwim = got && inGame && progress.s.fish !== fid;
    const s = this.open(`<div class="panel fishcard">
      <div class="big" style="background-image:url(${this.ctx.portrait(fid, !got, true)})"></div>
      <div class="info"><h2>${got ? esc(f.name) : '???'}</h2>
      <p class="variety">${got ? fins : esc(this.lockedHint(fid))}</p>
      ${got ? `<p class="line">“${esc(f.line)}”</p>` : '<p class="line">Not hatched yet.</p>'}
      ${trailHtml}
      <div class="row">${canSwim ? '<button class="btn primary" data-a="swim">Swim as this fish</button>' : ''}<button class="btn ${canSwim ? '' : 'primary'}" data-a="back">Back</button></div></div></div>`);
    s.querySelector('[data-a=back]').onclick = () => { audio.sfx('ui-back'); back(); };
    s.querySelector('[data-a=swim]')?.addEventListener('click', () => { audio.sfx('ui-click'); this.ctx.switchFish(fid); });
    s.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { progress.s.fishTrail[fid] = b.dataset.t; progress.save(true); audio.sfx('star'); this.fishCard(fid, back, { inGame }); });
  }

  map(back, { worldTab } = {}) {
    this.mapBadge = false; this.refresh();
    const reached = progress.s.worlds;
    const world = worldTab || this.ctx.currentWorld() || 'cw';
    const nodes = Object.values(NODES).filter(n => n.world === world);
    const mazes = nodes.filter(n => n.type === 'maze');
    const ln = progress.ladyNests(world);
    const here = this.ctx.where();
    // layout: mazes in a row, their tanks above/below
    const mzIdx = Object.fromEntries(mazes.map((m, i) => [m.id, i]));
    const items = [];
    const pos = {};
    mazes.forEach((m, i) => { pos[m.id] = { x: 8 + i * (84 / Math.max(1, mazes.length - 1)), y: 50 }; });
    const tanksByMaze = {};
    for (const n of nodes) if (n.type !== 'maze') { (tanksByMaze[n.maze] ||= []).push(n); }
    for (const [mz, list] of Object.entries(tanksByMaze)) list.forEach((n, j) => { const p = pos[mz]; pos[n.id] = { x: p.x + (j - (list.length - 1) / 2) * 7, y: j % 2 ? 80 : 20 }; });
    const lines = [];
    for (const m of mazes) for (const [k, tgt] of Object.entries(m.exits)) {
      const tid = tgt.split(':')[0]; const a = pos[m.id], b = pos[tid]; if (!b || !NODES[tid] || NODES[tid].world !== world) continue;
      if (NODES[tid].type === 'maze' && mzIdx[tid] < mzIdx[m.id]) continue;
      lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
    }
    const ready = progress.readyFry();
    const visitedM = (id) => progress.s.seen.visited.includes(id);
    for (const n of nodes) {
      const p = pos[n.id]; if (!p) continue;
      const isHere = here === n.id;
      if (n.type === 'maze') {
        const st = progress.s.stars[n.id] || 0;
        items.push(`<div class="mnode maze ${visitedM(n.id) ? '' : 'unseen'} ${isHere ? 'here' : ''}" style="left:${p.x}%;top:${p.y}%"><span class="nm">${visitedM(n.id) ? esc(n.name) : '?'}</span><span class="stars sm">${[1, 2].map(i => `<span class="${i <= st ? 'on' : ''}">${i <= st ? ICON.star : ICON.starO}</span>`).join('')}</span></div>`);
      } else {
        const info = this.exitInfo(n.id);
        const home = n.type === 'tank' && progress.isHome(n.id);
        const r = ready.find(r => r.id === n.id);
        let btn = '';
        if (r) btn = `<button class="mini primary" data-become="${n.id}">Become ${esc(FISH_BY_ID[n.son].name)}</button>`;
        else if (home && here !== n.id) btn = `<button class="mini" data-go="${n.id}">Go</button>`;
        const label = n.type === 'machine' ? 'Bubble machine' : (visitedM(n.id) || home ? n.name.replace(' Tank', '') : (n.kind === 'lady' ? 'Lady?' : 'Tank?'));
        items.push(`<div class="mnode tank k-${info.kind} ${isHere ? 'here' : ''}" style="left:${p.x}%;top:${p.y}%"><span class="ic ${info.afford === false ? 'grey' : ''}">${ICON[info.icon]}</span><span class="nm">${esc(label)}</span><span class="sub">${esc(info.kind === 'machine' ? '' : info.text === n.name ? '' : (info.kind === 'lady' || info.kind === 'empty') ? 'Nest: ' + Z(n) + (Z(n) === 1 ? ' bite' : ' bites') : info.text)}</span>${btn}</div>`);
      }
    }
    const tabs = WORLDS.filter(w => reached.includes(w.id)).map(w => `<button class="tab ${w.id === world ? 'on' : ''}" data-w="${w.id}">${esc(w.name)}</button>`).join('');
    const s = this.open(`<div class="panel wide mapp"><h2>Map</h2><div class="tabs">${tabs}</div>
      <p class="frenzy">${progress.frenzy(world) ? 'Feeding Frenzy! Fry here grow twice as fast.' : `Lady nests ${ln.done}/${ln.total} · Frenzy at ${ln.total}`}</p>
      <div class="mapbox"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>${items.join('')}</div>
      <div class="row"><button class="btn primary" data-a="back">Back</button></div></div>`);
    s.querySelector('[data-a=back]').onclick = () => { audio.sfx('ui-back'); back(); };
    s.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { audio.sfx('ui-click'); this.map(back, { worldTab: b.dataset.w }); });
    s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { audio.sfx('ui-click'); this.ctx.fastTravel(b.dataset.go); });
    s.querySelectorAll('[data-become]').forEach(b => b.onclick = () => { audio.sfx('ui-click'); this.ctx.becomeFrom(b.dataset.become); });
  }

  card({ title, sub, fish, big = false, button = 'Hooray!', onDone }) {
    const s = this.open(`<div class="panel small celebrate ${big ? 'big' : ''}">${fish ? `<div class="big" style="background-image:url(${this.ctx.portrait(fish, false, true)})"></div>` : ''}<h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}<div class="row"><button class="btn primary" data-a="ok">${esc(button)}</button></div></div>`, 'dim');
    for (let i = 0; i < 24; i++) { const b = h('i', 'confetti'); b.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * 1.2}s;width:${6 + Math.random() * 18}px;height:${6 + Math.random() * 18}px`; s.appendChild(b); }
    s.querySelector('[data-a=ok]').onclick = () => { audio.sfx('ui-click'); onDone?.(); };
  }
  worldCard(world, done) {
    const s = this.open(`<div class="worldcard w-${world}"><small>Welcome to</small><div class="logo">${esc(WORLD_NAME[world])}</div></div>`, 'clear');
    const card = s.firstChild;
    setTimeout(() => { card?.classList.add('out'); }, 1800);
    setTimeout(() => { if (this.screen.contains(card)) this.close(); done?.(); }, 2300);
  }
  victory(done) {
    const s = this.open(`<div class="panel celebrate big"><h2>Full Collection!</h2><p>All 20 bettas, one bubble nest at a time.</p>
      <div class="roll"><p>Bubble Nest</p><p>A game idea by Rich Conlan</p><p>20 bettas, 25 nests, 19 mazes</p><p>Thanks for swimming!</p></div>
      <div class="row"><button class="btn primary" data-a="ok">Keep swimming</button></div></div>`, 'dim');
    for (let i = 0; i < 40; i++) { const b = h('i', 'confetti'); b.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * 2}s;width:${6 + Math.random() * 20}px;height:${6 + Math.random() * 20}px`; s.appendChild(b); }
    s.querySelector('[data-a=ok]').onclick = () => { audio.sfx('ui-click'); done(); };
  }
}
