// Pipe mode: an arcade maze of water tubes on a vertical plane.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAZES } from '../data/mazes.js';
import { NODES, WORLDS } from '../data/worlds.js';
import { FISH_BY_ID } from '../data/fish.js';
import { Fish, getBody } from '../fishmodel.js';
import { modelMesh, texture } from '../assets.js';
import { FX, trailShape } from '../fx.js';
import { WORLD_STYLE, rimMaterial, makeBites, canvasTexture } from '../world3d.js';
import { input, isTouch } from '../input.js';
import { audio } from '../audio.js';
import { progress, WORLD_BY_ID } from '../progress.js';

export const CELL = 1.6;
const SPEED = 4; // cells per second
const DV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
const PERP = { U: ['L', 'R'], D: ['L', 'R'], L: ['U', 'D'], R: ['U', 'D'] };
const CUR_CH = { '>': 'R', '<': 'L', '^': 'U', 'v': 'D' };
const ENEMY = {
  snail: { speed: 0.45, model: 'snail', size: 0.95, color: 0xffd060 },
  shrimp: { speed: 0.85, model: 'shrimp', size: 0.9, color: 0xff6a4a },
  crayfish: { speed: 0.8, model: 'crayfish', size: 1.05, color: 0x4a8aff },
  jelly: { speed: 0.6, model: null, size: 0.9, color: 0xe8e6ff },
  king: { speed: 0.75, model: 'crayfish', size: 1.45, color: 0xffc040 },
};
export const ENEMY_YAW = { snail: 0, shrimp: 0, crayfish: 0, king: 0 }; // model facing offsets (radians), tuned from previews

function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

export class PipeMode {
  constructor(ctx) {
    this.ctx = ctx;
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
  }

  // ---------- grid helpers ----------
  ch(x, y) { const m = this.maze; if (y < 0 || y >= m.h || x < 0 || x >= m.w) return '#'; return m.grid[y][x]; }
  wpos(x, y, out = new THREE.Vector3()) { return out.set((x - this.maze.w / 2 + 0.5) * CELL, (this.maze.h / 2 - y - 0.5) * CELL, 0); }
  valveOpen(x, y) {
    const v = this.valveAt[x + ',' + y]; if (!v) return true;
    const per = v.open + v.shut; const t = (this.t + (per - v.phase % per)) % per;
    return t < v.open;
  }
  valveWarn(v) { const per = v.open + v.shut; const t = (this.t + (per - v.phase % per)) % per; return t > v.open - 0.5 && t < v.open; }
  // can an entity at (x,y) move in dir d? returns 'ok' | 'exit' | 'wrap' | false
  canMove(x, y, d, who) {
    const [dx, dy] = DV[d]; const nx = x + dx, ny = y + dy; const m = this.maze;
    if (nx < 0 || nx >= m.w || ny < 0 || ny >= m.h) {
      const ex = this.exitAt[x + ',' + y];
      if (ex && ex.dir === d) return who === 'player' && !this.exitLocked(ex.n) ? 'exit' : false;
      if (this.ch(x, y) === 'W' && dy === 0) return 'wrap';
      return false;
    }
    const c = this.ch(nx, ny);
    if (c === '#') return false;
    if (c === 'G' && !this.valveOpen(nx, ny)) return false;
    if (who !== 'player' && this.exitAt[nx + ',' + ny]) return false; // enemies stay out of exit mouths
    return 'ok';
  }
  exitLocked(n) {
    const tgt = this.node?.exits?.[n]; if (!tgt) return false;
    const tn = NODES[tgt.split(':')[0]];
    return !!(tn?.locked?.bettas && progress.s.collected.length < tn.locked.bettas);
  }
  openDirs(x, y, who) { return ['U', 'D', 'L', 'R'].filter(d => this.canMove(x, y, d, who)); }
  isJunction(x, y) { const n = ['U', 'D', 'L', 'R'].filter(d => { const [dx, dy] = DV[d]; return this.ch(x + dx, y + dy) !== '#'; }); return n.length >= 3 || (n.length === 2 && !(n.includes('U') && n.includes('D')) && !(n.includes('L') && n.includes('R'))); }

  enter({ mazeId, exit = 1, from = 'tank' }) {
    const maze = this.maze = MAZES[mazeId];
    this.id = mazeId; this.world = maze.world; this.node = NODES[mazeId];
    this.wstyle = WORLD_STYLE[this.world];
    this.wcfg = WORLD_BY_ID[this.world];
    this.dark = !!maze.dark || this.world === 'nn';
    this.t = 0; this.rand = mulberry(hashStr(mazeId));
    this.exitAt = {}; for (const [n, e] of Object.entries(maze.exits)) this.exitAt[e.x + ',' + e.y] = { ...e, n: +n };
    this.valveAt = {}; for (const v of maze.valves || []) this.valveAt[v.x + ',' + v.y] = v;
    this.portalAt = {}; for (const p of maze.portals || []) { this.portalAt[p.a.x + ',' + p.a.y] = p.b; this.portalAt[p.b.x + ',' + p.b.y] = p.a; }
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(this.wstyle.back);
    scene.add(new THREE.HemisphereLight(this.wstyle.amb, 0x203040, this.dark ? 0.5 : 1.3));
    const sun = new THREE.DirectionalLight(this.wstyle.light, this.dark ? 0.5 : 1.8); sun.position.set(-4, 10, 12); scene.add(sun);
    this.pool = new THREE.PointLight(0xfff0d8, this.dark ? 30 : 0, 9, 1.6); scene.add(this.pool);
    this.buildBackdrop();
    this.buildMaze();
    this.buildBites();
    this.fx = new FX(scene, 500, 520);
    // player
    const def = FISH_BY_ID[progress.s.fish];
    this.player = new Fish(getBody('male'), def, { finScale: 1.15 });
    this.player.group.scale.setScalar(1.55);
    scene.add(this.player.group);
    const ex = maze.exits[exit] || Object.values(maze.exits)[0];
    this.P = { x: ex.x, y: ex.y, dir: OPP[ex.dir], f: 0, moving: true, kind: 'player' };
    this.queued = null; this.queuedJunctions = 0; this.lastDirSeen = null;
    this.facing = (this.P.dir === 'L') ? -1 : 1;
    this.yawVis = this.facing * Math.PI / 2; this.pitchVis = 0;
    this.safeT = 1.5; this.dazeT = 0; this.flareT = 0; this.hits = 0;
    this.temps = []; this.leaving = false; this.portalLock = null;
    this.streak = 0; this.streakT = 0; this.trailT = 0;
    this.buildEnemies();
    this.kingHits = 0; this.kingBumpedFlare = false;
    this.buildGates();
    this.buildSchool(ex);
    this.camPos = this.wpos(this.P.x, this.P.y).clone();
    this.mouseAxis = null;
    this.placeCamera(1);
    this.leftBy = null;
    return this;
  }

  buildBackdrop() {
    const tex = texture(this.wstyle.pano);
    const m = this.maze;
    const wv = Math.max(m.w * CELL * 2.2, 90), hv = Math.max(m.h * CELL * 2.2, 50);
    let mat;
    if (tex) {
      const t = tex.clone(); t.needsUpdate = true; t.userData.own = true; t.wrapS = THREE.RepeatWrapping;
      t.repeat.set(0.5, 1); t.offset.set(0.25, 0);
      mat = new THREE.MeshBasicMaterial({ map: t, depthWrite: false, color: this.dark ? 0x8888aa : 0xdddddd });
    } else mat = new THREE.MeshBasicMaterial({ color: this.wstyle.back });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(wv * 3, hv * 3), mat);
    plane.position.z = -40; plane.renderOrder = 0;
    this.backdrop = plane; this.scene.add(plane);
  }

  buildMaze() {
    const m = this.maze, st = this.wstyle;
    const back = [], tubes = [], joints = [];
    const R = 0.58;
    const v = new THREE.Vector3(), v2 = new THREE.Vector3();
    const open = (x, y) => this.ch(x, y) !== '#';
    const addBack = (cx, cy, w, h) => { const g = new THREE.PlaneGeometry(w, h); g.translate(cx, cy, -R * 0.9); back.push(g); };
    const extend = []; // tubes going outward from exits/wraps
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (!open(x, y)) continue;
      this.wpos(x, y, v);
      addBack(v.x, v.y, 1.25, 1.25);
      const nb = { R: open(x + 1, y), D: open(x, y + 1), L: open(x - 1, y), U: open(x, y - 1) };
      if (nb.R) { const g = new THREE.CylinderGeometry(R, R, CELL, 18, 1, true); g.rotateZ(Math.PI / 2); g.translate(v.x + CELL / 2, v.y, 0); tubes.push(g); addBack(v.x + CELL / 2, v.y, CELL, 1.25); }
      if (nb.D) { const g = new THREE.CylinderGeometry(R, R, CELL, 18, 1, true); g.translate(v.x, v.y - CELL / 2, 0); tubes.push(g); addBack(v.x, v.y - CELL / 2, 1.25, CELL); }
      const straight = (nb.L && nb.R && !nb.U && !nb.D) || (nb.U && nb.D && !nb.L && !nb.R);
      const ex = this.exitAt[x + ',' + y];
      const wrap = this.ch(x, y) === 'W';
      if (ex || wrap) {
        const d = ex ? ex.dir : (x === 0 ? 'L' : 'R');
        const [dx, dy] = DV[d];
        const len = CELL * 1.6;
        const g = new THREE.CylinderGeometry(R, R, len, 18, 1, true);
        if (dx) g.rotateZ(Math.PI / 2);
        g.translate(v.x + dx * len / 2, v.y - dy * len / 2, 0); tubes.push(g);
        addBack(v.x + dx * len / 2, v.y - dy * len / 2, dx ? len : 1.25, dy ? len : 1.25);
        extend.push({ x, y, d, ex, wrap, p: v.clone() });
      } else if (!straight) {
        const g = new THREE.SphereGeometry(R, 18, 12); g.translate(v.x, v.y, 0); joints.push(g); tubes.push(g);
      }
    }
    const backMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(st.back).multiplyScalar(this.world === 'cw' ? 0.75 : 0.6), roughness: 0.9 });
    if (this.world === 'cw') backMat.color.set(0x7cc4c8);
    if (this.dark) {
      this.uPool = { value: new THREE.Vector3() };
      backMat.onBeforeCompile = (sh) => {
        sh.uniforms.uPool = this.uPool;
        sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWP = (modelMatrix*vec4(transformed,1.0)).xyz;');
        sh.fragmentShader = 'uniform vec3 uPool; varying vec3 vWP;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float dd = distance(vWP.xy, uPool.xy) / ${(3 * CELL).toFixed(2)};
          gl_FragColor.rgb *= mix(1.6, 0.25, smoothstep(0.6, 1.4, dd));`);
      };
    }
    const backMesh = new THREE.Mesh(mergeGeometries(back.map(g => g.toNonIndexed())), backMat);
    backMesh.renderOrder = 1; this.scene.add(backMesh);
    const rim = this.world === 'nn' ? 0xff4fd8 : st.rim;
    const tubeMat = rimMaterial(rim, this.world === 'nn' ? 1.3 : 0.55, this.world === 'nn' ? 3.0 : 3.2, this.world === 'nn' ? 0.02 : 0.015);
    const tubeMesh = new THREE.Mesh(mergeGeometries(tubes.map(g => g.toNonIndexed())), tubeMat);
    tubeMesh.renderOrder = 4; this.scene.add(tubeMesh);
    this.tubeMat = tubeMat;
    if (this.world === 'nn') { // second neon colour on joints
      const jm = new THREE.Mesh(mergeGeometries(joints.map(g => g.toNonIndexed()).length ? joints.map(g => g.toNonIndexed()) : [new THREE.SphereGeometry(0.01)]), rimMaterial(0x3cf0ff, 0.7, 3.5, 0.0));
      jm.scale.setScalar(1.02); jm.renderOrder = 4; this.scene.add(jm);
    }
    // copper collars at joints
    if (this.world === 'cp') {
      const col = new THREE.InstancedMesh(new THREE.TorusGeometry(R + 0.04, 0.09, 8, 20), new THREE.MeshStandardMaterial({ color: 0xc8743a, metalness: 0.8, roughness: 0.35 }), joints.length * 2 + 4);
      const mtx = new THREE.Matrix4(); let n = 0;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        if (!open(x, y)) continue;
        const nbR = open(x + 1, y), nbD = open(x, y + 1), nbL = open(x - 1, y), nbU = open(x, y - 1);
        const straight = (nbL && nbR && !nbU && !nbD) || (nbU && nbD && !nbL && !nbR);
        if (straight || n >= col.count - 1) continue;
        this.wpos(x, y, v);
        mtx.makeRotationY(Math.PI / 2); mtx.setPosition(v.x, v.y, 0); col.setMatrixAt(n++, mtx);
      }
      col.count = n; this.scene.add(col);
    }
    // exits: mouth rings; wraps: fading discs
    this.exitObjs = [];
    for (const e of extend) {
      const [dx, dy] = DV[e.d];
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.06, 0.08, 8, 24), new THREE.MeshStandardMaterial({ color: e.ex ? 0xffffff : st.rim, emissive: e.ex ? 0xfff0b0 : st.rim, emissiveIntensity: 0.6 }));
      ring.position.set(e.p.x + dx * CELL * 1.6, e.p.y - dy * CELL * 1.6, 0);
      if (dx) ring.rotation.y = Math.PI / 2; else ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
      if (e.ex) this.exitObjs.push({ n: e.ex.n, ring, pos: ring.position.clone(), dir: e.d });
    }
    // currents: chevrons on the back wall
    const curs = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const d = CUR_CH[this.ch(x, y)]; if (d) curs.push({ x, y, d }); }
    if (curs.length) {
      const tex = canvasTexture(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(242,226,196,0.95)'; c.lineWidth = 9; c.lineCap = 'round'; for (const yy of [14, 44]) { c.beginPath(); c.moveTo(14, yy + 10); c.lineTo(32, yy - 6); c.lineTo(50, yy + 10); c.stroke(); } });
      tex.wrapT = THREE.RepeatWrapping;
      this.curTex = tex;
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false });
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, CELL), mat, curs.length);
      const mtx = new THREE.Matrix4(), q = new THREE.Quaternion();
      const rot = { U: 0, L: Math.PI / 2, D: Math.PI, R: -Math.PI / 2 };
      curs.forEach((c, i) => { this.wpos(c.x, c.y, v); q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rot[c.d]); mtx.compose(v.setZ(-0.45), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, mtx); });
      im.renderOrder = 2; this.scene.add(im);
      this.hasCurrents = true;
    }
    // valves
    this.valveObjs = [];
    for (const vv of m.valves || []) {
      this.wpos(vv.x, vv.y, v);
      const horiz = this.ch(vv.x - 1, vv.y) !== '#' || this.ch(vv.x + 1, vv.y) !== '#';
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0xc8743a, metalness: 0.8, roughness: 0.3 }));
      if (horiz) disc.rotation.z = Math.PI / 2;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x441111, emissive: 0xff2a2a, emissiveIntensity: 0 }));
      lamp.position.set(v.x + (horiz ? 0 : 0.75), v.y + (horiz ? 0.75 : 0), 0.3);
      disc.position.copy(v); this.scene.add(disc, lamp);
      this.valveObjs.push({ v: vv, disc, lamp, base: v.clone(), horiz, wasOpen: true });
    }
    // portals
    this.portalObjs = [];
    (m.portals || []).forEach((p, i) => {
      for (const c of [p.a, p.b]) {
        this.wpos(c.x, c.y, v);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 10, 32), new THREE.MeshStandardMaterial({ color: i % 2 ? 0x3cf0ff : 0xff4fd8, emissive: i % 2 ? 0x3cf0ff : 0xff4fd8, emissiveIntensity: 1.2 }));
        ring.position.copy(v); this.scene.add(ring); this.portalObjs.push(ring);
      }
    });
  }

  buildBites() {
    const m = this.maze;
    this.biteCells = [];
    this.shrimps = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const c = this.ch(x, y);
      if (c === '.' || CUR_CH[c]) this.biteCells.push({ x, y, alive: true, eatenOnce: false, respawnAt: 0 });
      if (c === 'o') this.shrimps.push({ x, y, alive: true });
    }
    this.bitesTotal = this.biteCells.length;
    this.bitesEatenUnique = 0;
    this.biteMesh = makeBites(this.biteCells.length + 64, this.world);
    this.biteMesh.renderOrder = 2;
    this.scene.add(this.biteMesh);
    // brine shrimp pickups: curled capsule + halo
    const geo = new THREE.TorusGeometry(0.16, 0.06, 8, 14, Math.PI * 1.4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff8a5c, emissive: 0xff6a3a, emissiveIntensity: 0.5, roughness: 0.4 });
    this.shrimpMeshes = this.shrimps.map(s => { const mm = new THREE.Mesh(geo, mat); this.wpos(s.x, s.y, mm.position); this.scene.add(mm); return mm; });
  }

  buildEnemies() {
    const m = this.maze;
    this.enemies = [];
    (m.enemies || []).forEach((en, i) => {
      const sp = m.spawns[en.spawn ?? i] || m.spawns[0];
      const cfg = ENEMY[en.type];
      let obj;
      if (en.type === 'jelly') obj = this.makeJelly();
      else {
        obj = modelMesh(cfg.model, cfg.size, { cloneMaterial: true });
        if (!obj) { obj = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), new THREE.MeshStandardMaterial({ color: cfg.color })); b.position.y = 0.35; obj.add(b); obj.userData.mesh = b; }
        const inner = obj; obj = new THREE.Group(); inner.position.y -= cfg.size * 0.35; obj.add(inner); obj.userData.inner = inner;
        const mesh = inner.userData.mesh;
        if (mesh?.material) { mesh.material.emissive = new THREE.Color(this.dark || en.type === 'king' ? cfg.color : 0x000000); mesh.material.emissiveIntensity = en.type === 'king' ? 0.5 : this.dark ? 0.35 : 0; if (en.type === 'king') mesh.material.color.set(0xffd080); }
      }
      // glowing eyes so enemies read in the dark
      this.scene.add(obj);
      const e = { type: en.type, cfg, obj, x: sp.x, y: sp.y, home: { x: sp.x, y: sp.y }, dir: null, f: 0, moving: true, state: 'roam', stateT: 0, loop: en.loop || null, loopI: 0, phase: en.phase || 0, dartT: 0, tellT: 0, restT: 0, kind: 'enemy', wob: this.rand() * 6 };
      if (e.loop) { e.dir = e.loop[0]; }
      else e.dir = this.openDirs(e.x, e.y, 'enemy')[0] || 'L';
      this.enemies.push(e);
    });
  }

  buildGates() {
    this.gates = [];
    for (const e of this.exitObjs) {
      if (!this.exitLocked(e.n)) continue;
      const gate = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xffa020, emissiveIntensity: 0.8, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
      gate.position.copy(e.pos); if (e.dir === 'L' || e.dir === 'R') gate.rotation.y = Math.PI / 2; else gate.rotation.x = Math.PI / 2;
      this.scene.add(gate); this.gates.push(gate);
    }
  }
  // your school: collected fish that follow your path
  buildSchool(ex) {
    this.school = [];
    this.hist = []; this.histD = 0; this.seg = 0;
    if (progress.s.settings.school === false) return;
    const ids = progress.s.collected.filter(id => id !== progress.s.fish).slice(-4).reverse();
    for (const id of ids) {
      const f = new Fish(getBody('male'), FISH_BY_ID[id], { finScale: 1.1 });
      f.group.scale.setScalar(1.15); f.swim = 0.7; f.group.visible = false;
      this.scene.add(f.group); this.school.push({ f, seg: 0 });
    }
    // prefill the path from the entry tube so the school swims in after you
    const [dx, dy] = DV[ex.dir]; const start = this.wpos(ex.x, ex.y);
    const yaw = (OPP[ex.dir] === 'L') ? -Math.PI / 2 : Math.PI / 2;
    const pitch = OPP[ex.dir] === 'U' ? 1.2 : OPP[ex.dir] === 'D' ? -1.2 : 0;
    for (let i = 8; i >= 0; i--) this.pushHist(new THREE.Vector3(start.x + dx * i * CELL * 0.6, start.y - dy * i * CELL * 0.6, 0), yaw, pitch, true);
  }
  pushHist(p, yaw, pitch, force) {
    const last = this.hist[this.hist.length - 1];
    if (last && !force && last.p.distanceTo(p) < 0.08 && last.seg === this.seg) return;
    if (last && last.seg === this.seg) this.histD += last.p.distanceTo(p);
    else if (last) this.histD += 0.001;
    this.hist.push({ p: p.clone(), yaw, pitch, seg: this.seg, d: this.histD });
    if (this.hist.length > 600) this.hist.splice(0, 100);
  }
  updateSchool(dt) {
    if (!this.school?.length) return;
    this.pushHist(this.fishPos(), this.yawVis, this.pitchVis);
    const H = this.hist; if (!H.length) return;
    this.school.forEach((s, i) => {
      const want = this.histD - (i + 1) * 0.95 * CELL;
      let j = H.length - 1; while (j > 0 && H[j].d > want) j--;
      const a = H[j], b = H[Math.min(H.length - 1, j + 1)];
      if (want < H[0].d) { s.f.group.visible = false; return; }
      let pos, yaw = a.yaw, pitch = a.pitch;
      if (a.seg === b.seg && b.d > a.d) { const k = THREE.MathUtils.clamp((want - a.d) / (b.d - a.d), 0, 1); pos = a.p.clone().lerp(b.p, k); }
      else pos = a.p.clone();
      if (s.seg !== a.seg && s.f.group.visible) this.fx.burst(pos.x, pos.y, 0.2, 8, { shape: 'ring', color: 0xffffff, size: 0.3, speed: 1, life: 0.4, flat: true });
      s.seg = a.seg;
      const gg = s.f.group; gg.visible = true;
      gg.position.copy(pos).setZ(-0.05 * (i + 1));
      gg.rotation.set(0, 0, 0); gg.rotateY(yaw); gg.rotateX(-pitch);
      s.f.swim = this.P.moving ? 0.8 : 0.3; s.f.update(dt);
    });
  }

  makeJelly() {
    const g = new THREE.Group();
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xe8e6ff, emissive: 0xb0a8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.75, roughness: 0.2 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.scale.y = 0.8; g.add(dome);
    const tents = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.6, 5), domeMat);
      t.position.set(Math.cos(a) * 0.22, -0.3, Math.sin(a) * 0.22); g.add(t); tents.push(t);
    }
    g.userData.dome = dome; g.userData.tents = tents; g.userData.mat = domeMat;
    return g;
  }

  exit() {
    this.ctx.ui.pipeExit();
    this.player?.dispose();
    this.scene?.traverse(o => { if (o.isMesh || o.isInstancedMesh) { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose?.(); } });
    this.scene = null;
    audio.loop('current-loop', false);
  }

  // ---------- movement ----------
  speedMul(e) {
    const c = CUR_CH[this.ch(e.x, e.y)];
    if (!c || !e.dir) return 1;
    if (c === e.dir) return 1.8;
    if (c === OPP[e.dir]) return 0.45;
    return 1;
  }

  // arrive at a new cell centre (after f reached 1); handles wrap/exit/portal. Returns false if leaving the maze.
  stepCell(e) {
    const [dx, dy] = DV[e.dir];
    const r = this.canMove(e.x, e.y, e.dir, e.kind);
    if (r === 'exit') { this.leaveBy(this.exitAt[e.x + ',' + e.y].n); return false; }
    if (r === 'wrap') { e.x = e.x === 0 ? this.maze.w - 1 : 0; if (e.kind === 'player') { audio.sfx('wrap', { vol: 0.6 }); this.seg++; } return true; }
    e.x += dx; e.y += dy;
    if (e.kind === 'player') {
      const p = this.portalAt[e.x + ',' + e.y];
      if (p && this.portalLock !== e.x + ',' + e.y) {
        this.fx.burst(...this.wpos(e.x, e.y).toArray(), 16, { shape: 'spark', color: 0xff4fd8, size: 0.4, speed: 2, life: 0.6, flat: true });
        e.x = p.x; e.y = p.y; this.portalLock = p.x + ',' + p.y; audio.sfx('portal'); this.seg++;
        this.fx.burst(...this.wpos(e.x, e.y).toArray(), 16, { shape: 'spark', color: 0x3cf0ff, size: 0.4, speed: 2, life: 0.6, flat: true });
      } else if (!p) this.portalLock = null;
    }
    return true;
  }

  movePlayer(dt) {
    const P = this.P;
    // input
    const d = input.takeDir();
    if (d) { this.queued = d; this.queuedJunctions = 0; }
    const held = input.heldDir();
    if (held && held !== P.dir) { this.queued = held; this.queuedJunctions = 0; }
    if (input.pointer.down && !isTouch()) this.mouseSteer();
    if (this.dazeT > 0) return;
    // reverse at once
    if (this.queued && P.dir && this.queued === OPP[P.dir] && P.moving) {
      const [dx, dy] = DV[P.dir];
      P.x += dx; P.y += dy; P.f = 1 - P.f; P.dir = this.queued; this.queued = null;
      // if that put us outside (wrap/exit edge), undo safely
      if (this.ch(P.x, P.y) === '#') { P.x -= dx; P.y -= dy; P.f = 0; }
    }
    // pre-turn cornering near the next centre
    if (this.queued && P.moving && PERP[P.dir].includes(this.queued) && P.f > 0.7) {
      const [dx, dy] = DV[P.dir];
      if (this.canMove(P.x + dx, P.y + dy, this.queued, 'player') && this.canMove(P.x, P.y, P.dir, 'player') === 'ok') { P.x += dx; P.y += dy; P.f = 0; P.dir = this.queued; this.queued = null; }
    }
    if (this.queued && P.moving && PERP[P.dir].includes(this.queued) && P.f < 0.3 && this.canMove(P.x, P.y, this.queued, 'player')) { P.f = 0; P.dir = this.queued; this.queued = null; }
    // stopped: try queued, then current
    if (!P.moving || P.f === 0) {
      if (this.queued && this.canMove(P.x, P.y, this.queued, 'player')) { P.dir = this.queued; this.queued = null; P.moving = true; }
      else if (P.dir && this.canMove(P.x, P.y, P.dir, 'player')) P.moving = true;
      else { P.moving = false; return; }
    }
    let adv = SPEED * this.speedMul(P) * dt;
    while (adv > 0 && P.moving) {
      const step = Math.min(adv, 1 - P.f);
      P.f += step; adv -= step;
      if (P.f >= 1 - 1e-6) {
        P.f = 0;
        if (!this.stepCell(P)) return;
        this.onPlayerCell();
        // decide at the centre
        if (this.queued && this.canMove(P.x, P.y, this.queued, 'player')) { P.dir = this.queued; this.queued = null; }
        else {
          if (this.queued && this.isJunction(P.x, P.y)) { this.queuedJunctions++; if (this.queuedJunctions >= 2) this.queued = null; }
          if (!this.canMove(P.x, P.y, P.dir, 'player')) { P.moving = false; return; }
        }
        adv *= 1; // speed of new cell applies next frame
      }
    }
  }

  mouseSteer() {
    // raycast the pointer onto the maze plane (z = 0)
    const ndc = new THREE.Vector2(input.pointer.x / innerWidth * 2 - 1, -(input.pointer.y / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3(); ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit);
    const me = this.fishPos();
    const dx = hit.x - me.x, dy = hit.y - me.y;
    if (Math.hypot(dx, dy) < CELL * 0.4) return;
    let axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (this.mouseAxis && this.mouseAxis !== axis) {
      const big = axis === 'x' ? Math.abs(dx) : Math.abs(dy), small = axis === 'x' ? Math.abs(dy) : Math.abs(dx);
      if (big < small * 1.25) axis = this.mouseAxis;
    }
    this.mouseAxis = axis;
    const d = axis === 'x' ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'U' : 'D');
    if (d !== this.P.dir) { this.queued = d; this.queuedJunctions = 0; }
  }

  onPlayerCell() {
    const P = this.P;
    // bites
    for (const b of this.biteCells) if (b.alive && b.x === P.x && b.y === P.y) this.eatBite(b);
    for (let i = 0; i < this.shrimps.length; i++) {
      const s = this.shrimps[i];
      if (s.alive && s.x === P.x && s.y === P.y) {
        s.alive = false; this.shrimpMeshes[i].visible = false;
        this.flareT = this.id === 'nn-gm' ? 6 : (this.wcfg.flareTime ?? 6); this.flareTicked = false; this.kingBumpedFlare = false;
        if (this.id === 'nn-gm') s.respawnAt = this.t + 20;
        audio.sfx('gulp'); audio.sfx('flare'); audio.setBright(true);
        progress.eat(1, this.world);
        this.fx.burst(...this.fishPos().toArray(), 18, { shape: 'spark', color: 0xffb070, size: 0.5, speed: 3, life: 0.6, flat: true });
        for (const e of this.enemies) if (e.state === 'roam' || e.state === 'dart') { e.state = 'scared'; e.dir = e.dir ? OPP[e.dir] : e.dir; e.f = e.f ? 1 - e.f : 0; if (e.f) { const [dx, dy] = DV[OPP[e.dir]]; e.x += dx; e.y += dy; } }
        this.ctx.tip('flare');
      }
    }
    for (const t of this.temps) if (t.alive && t.x === P.x && t.y === P.y) { t.alive = false; progress.eat(1, this.world, { counts: false }); audio.sfx('regrab', { vol: 0.6 }); this.ctx.biteBump(); }
  }

  eatBite(b) {
    b.alive = false;
    if (!b.eatenOnce) { b.eatenOnce = true; this.bitesEatenUnique++; }
    if (this.maze.refill) b.respawnAt = this.t + 20;
    this.streak++; this.streakT = 0.6;
    audio.sfx('nip', { semis: Math.min(12, this.streak * 0.5) + (this.player.def.pitch || 0) * 0.5, vol: 0.7 });
    const p = this.wpos(b.x, b.y);
    this.fx.burst(p.x, p.y, 0.2, 4, { shape: 'dot', color: 0xd09050, size: 0.25, speed: 1.2, life: 0.35, flat: true });
    progress.eat(1, this.world);
    this.ctx.biteBump();
    if (this.bitesEatenUnique >= this.bitesTotal && !this.cleared) this.onCleared();
  }

  onCleared() {
    this.cleared = true;
    const bonus = this.wcfg.clearBonus ?? 10;
    let total = bonus; let stars = 1;
    if (this.hits === 0) { total += bonus; stars = 2; }
    progress.eat(total, this.world, { counts: false });
    progress.star(this.id, stars);
    audio.sfx('clear'); setTimeout(() => audio.sfx('star'), 500);
    this.ctx.toast(stars === 2 ? `Maze cleared without a bump! +${total}` : `Maze cleared! +${total}`, 'star');
    this.clearWave = 0;
  }

  leaveBy(n) {
    if (this.leaving) return;
    this.leaving = true; this.leftBy = n;
    audio.sfx('tube');
    this.ctx.leaveMaze(this.id, n);
  }

  // ---------- enemies ----------
  bfsDir(from, to, who = 'enemy') {
    const m = this.maze, key = (x, y) => y * m.w + x;
    const prev = new Map(); const q = [[from.x, from.y]]; prev.set(key(from.x, from.y), null);
    let found = null;
    while (q.length) {
      const [x, y] = q.shift();
      if (x === to.x && y === to.y) { found = [x, y]; break; }
      for (const d of ['U', 'D', 'L', 'R']) {
        const r = this.canMove(x, y, d, who); if (!r || r === 'exit') continue;
        let nx = x + DV[d][0], ny = y + DV[d][1];
        if (r === 'wrap') nx = x === 0 ? m.w - 1 : 0;
        const k = key(nx, ny); if (prev.has(k)) continue;
        prev.set(k, [x, y, d]); q.push([nx, ny]);
      }
    }
    if (!found) return null;
    let cur = found, dir = null;
    while (true) { const p = prev.get(key(cur[0], cur[1])); if (!p) break; dir = p[2]; cur = [p[0], p[1]]; }
    return dir;
  }
  nearestOpen(x, y) {
    let best = null, bd = 1e9; const m = this.maze;
    for (let yy = 0; yy < m.h; yy++) for (let xx = 0; xx < m.w; xx++) { if (this.ch(xx, yy) === '#' || this.exitAt[xx + ',' + yy]) continue; const d = Math.abs(xx - x) + Math.abs(yy - y); if (d < bd) { bd = d; best = { x: xx, y: yy }; } }
    return best;
  }
  sight(e) { // shrimp: player in same row/col within 6, no walls/closed valves between
    const P = this.P;
    if (e.x !== P.x && e.y !== P.y) return null;
    const dist = Math.abs(e.x - P.x) + Math.abs(e.y - P.y); if (dist > 6 || dist === 0) return null;
    const d = e.x === P.x ? (P.y > e.y ? 'D' : 'U') : (P.x > e.x ? 'R' : 'L');
    let x = e.x, y = e.y;
    for (let i = 0; i < dist; i++) { if (this.canMove(x, y, d, 'enemy') !== 'ok') return null; x += DV[d][0]; y += DV[d][1]; }
    return d;
  }
  chooseDir(e) {
    const opts = this.openDirs(e.x, e.y, 'enemy');
    if (!opts.length) return null;
    const noRev = opts.filter(d => d !== OPP[e.dir]);
    const pool = noRev.length ? noRev : opts;
    const P = this.P;
    if (e.state === 'scared') {
      let best = pool[0], bd = -1;
      for (const d of pool) { const nx = e.x + DV[d][0], ny = e.y + DV[d][1]; const dd = Math.abs(nx - P.x) + Math.abs(ny - P.y); if (dd > bd) { bd = dd; best = d; } }
      return best;
    }
    if (e.state === 'home') return this.bfsDir(e, e.home) || pool[0];
    if (e.type === 'jelly' && e.loop) {
      const d = e.loop[e.loopI % e.loop.length]; e.loopI++;
      return opts.includes(d) ? d : pool[0];
    }
    if (e.type === 'king' && e.state === 'roam') { const d = this.bfsDir(e, this.P); if (d) return d; }
    if (e.type === 'crayfish' && e.state === 'roam') {
      const [dx, dy] = DV[P.dir || 'R'];
      let tx = P.x + dx * 3, ty = P.y + dy * 3;
      if (this.ch(tx, ty) === '#') { tx = P.x; ty = P.y; }
      const t = this.ch(tx, ty) === '#' ? P : { x: tx, y: ty };
      const d = this.bfsDir(e, t);
      if (d && pool.includes(d)) return d;
      if (d && opts.includes(d) && this.rand() < 0.3) return d;
    }
    return pool[(this.rand() * pool.length) | 0];
  }
  updateEnemies(dt) {
    const P = this.P;
    for (const e of this.enemies) {
      if (e.state === 'gone') continue;
      e.stateT += dt;
      if (e.state === 'rest') { e.restT -= dt; if (e.restT <= 0) e.state = 'roam'; this.placeEnemy(e, dt); continue; }
      if (e.state === 'scared' && this.flareT <= 0) e.state = 'roam';
      if (e.type === 'crayfish' && e.state === 'roam') { e.cray = (e.cray || 0) + dt; if (e.cray > 10) { e.cray = 0; e.state = 'rest'; e.restT = 4; continue; } if (Math.random() < dt * 0.7) audio.sfx('click', { vol: 0.25 }); }
      if (e.type === 'shrimp' && e.state === 'roam' && e.f < 0.15) {
        const d = this.sight(e);
        if (d && (e.dartCool || 0) <= 0) { e.state = 'tell'; e.tellT = 0.3; e.dartDir = d; audio.sfx('chirp', { vol: 0.6 }); }
      }
      if (e.state === 'tell') { e.tellT -= dt; if (e.tellT <= 0) { e.state = 'dart'; e.dartT = 1.5; if (e.f === 0) e.dir = e.dartDir; } this.placeEnemy(e, dt); continue; }
      if (e.state === 'dart') { e.dartT -= dt; if (e.dartT <= 0) { e.state = 'roam'; e.dartCool = 2; } }
      if (e.dartCool > 0) e.dartCool -= dt;
      if (e.type === 'jelly') { e.pulse = ((this.t + e.phase) % 2.5); const was = e.pulsing; e.pulsing = e.pulse > 1.9; if (e.pulsing && !was) audio.sfx('thrum', { vol: Math.max(0.1, 0.6 - this.distTo(e) * 0.05) }); }
      let sp = e.cfg.speed;
      if (e.state === 'scared') sp = 0.6; else if (e.state === 'home') sp = 1.5; else if (e.state === 'dart') sp = 1.1;
      let adv = SPEED * sp * this.speedMul(e) * dt;
      if (!e.dir || (e.f === 0 && !this.canMove(e.x, e.y, e.dir, 'enemy'))) { e.dir = this.chooseDir(e); if (!e.dir) { this.placeEnemy(e, dt); continue; } }
      while (adv > 0) {
        const st = Math.min(adv, 1 - e.f); e.f += st; adv -= st;
        if (e.f >= 1 - 1e-6) {
          e.f = 0; this.stepCell(e);
          if (e.state === 'home' && e.x === e.home.x && e.y === e.home.y) { e.state = 'rest'; e.restT = e.type === 'king' ? 3 : 5; break; }
          if (e.state === 'dart' && this.canMove(e.x, e.y, e.dir, 'enemy')) { /* keep darting straight */ }
          else e.dir = this.chooseDir(e);
          if (!e.dir) break;
        }
      }
      this.placeEnemy(e, dt);
    }
  }
  epos(e, out = new THREE.Vector3()) {
    this.wpos(e.x, e.y, out);
    if (e.dir && e.f) { out.x += DV[e.dir][0] * e.f * CELL; out.y -= DV[e.dir][1] * e.f * CELL; }
    return out;
  }
  distTo(e) { return this.epos(e).distanceTo(this.fishPos()) / CELL; }
  placeEnemy(e, dt) {
    const o = e.obj; this.epos(e, o.position); o.position.z = 0;
    e.wob += dt * 6;
    const yawT = e.dir === 'L' ? -Math.PI / 2 : e.dir === 'R' ? Math.PI / 2 : (e.lastYaw ?? Math.PI / 2);
    if (e.dir === 'L' || e.dir === 'R') e.lastYaw = yawT;
    if (e.type === 'jelly') {
      const pulse = e.pulsing ? 1 : 0, k = (this.t + e.phase) % 2.5;
      const s = 1 + (k > 1.5 && k < 1.9 ? (k - 1.5) * 0.4 : 0) - pulse * 0.15;
      o.userData.dome.scale.set(s, 0.8 / s, s);
      o.userData.mat.emissiveIntensity = 0.5 + pulse * 1.2 + (k > 1.5 ? 0.4 : 0);
      o.userData.tents.forEach((t, i) => { t.rotation.z = Math.sin(this.t * 3 + i) * 0.3; });
      o.position.y += Math.sin(this.t * 2 + e.phase) * 0.06;
    } else {
      const inner = o.userData.inner;
      o.rotation.y += (yawT + (ENEMY_YAW[e.type] || 0) - o.rotation.y) * Math.min(1, dt * 10);
      o.rotation.z = (e.dir === 'U' ? 0.5 : e.dir === 'D' ? -0.5 : 0) * (e.lastYaw > 0 ? 1 : -1);
      inner.position.y = -e.cfg.size * 0.35 + (e.type === 'snail' ? Math.abs(Math.sin(e.wob * 0.5)) * 0.04 : 0);
      const s = e.state === 'tell' ? 0.85 : 1; inner.scale.set(1, s, 1);
      if (e.type === 'crayfish') inner.rotation.z = Math.sin(e.wob * 2) * 0.05;
      if (e.type === 'shrimp') inner.rotation.x = Math.sin(e.wob * 1.5) * 0.08;
    }
    // tint for scared / home / rest
    const mat = e.type === 'jelly' ? o.userData.mat : o.userData.inner?.userData.mesh?.material;
    if (mat) {
      if (!mat.userData.base) mat.userData.base = { c: mat.color.clone(), e: mat.emissive.clone(), ei: mat.emissiveIntensity };
      const b = mat.userData.base;
      if (e.state === 'scared') { const blink = this.flareT < 1.5 && Math.floor(this.t * 8) % 2; mat.color.copy(blink ? b.c : new THREE.Color(0x9ab8ff)); mat.emissive.set(0x4a6aff); mat.emissiveIntensity = 0.5; }
      else if (e.state === 'home' || e.state === 'rest') { mat.color.set(0x8a8a90); mat.emissive.set(0x000000); mat.emissiveIntensity = 0; o.visible = e.state === 'home' ? Math.floor(this.t * 6) % 2 === 0 : true; }
      else { mat.color.copy(b.c); mat.emissive.copy(b.e); mat.emissiveIntensity = b.ei; o.visible = true; }
    }
  }

  checkHits() {
    if (this.leaving) return;
    const me = this.fishPos();
    for (const e of this.enemies) {
      if (e.state === 'home' || e.state === 'rest' || e.state === 'gone') continue;
      const d = this.epos(e).distanceTo(me) / CELL;
      const reach = e.type === 'jelly' && e.pulsing ? 1.0 : 0.5;
      if (d >= reach) continue;
      if (e.type === 'king' && e.state === 'scared') {
        if (this.kingBumpedFlare) continue;
        this.kingBumpedFlare = true; this.kingHits++;
        e.state = 'home'; audio.sfx('shoo'); audio.sfx('bonk'); this.ctx.shake(0.3);
        this.fx.burst(me.x, me.y, 0.3, 24, { shape: 'star', color: 0xffd040, size: 0.5, speed: 3.5, life: 0.8, flat: true });
        if (this.kingHits >= 3) this.beatKing(e);
        else this.ctx.toast(`King Claw is stunned! ${3 - this.kingHits} more ${3 - this.kingHits === 1 ? 'bump' : 'bumps'} while flaring.`, 'star');
        continue;
      }
      if (e.state === 'gone') continue;
      if (e.state === 'scared') { // bump it home
        e.state = 'home'; audio.sfx('shoo'); progress.eat(5, this.world); this.ctx.biteBump(5);
        this.fx.burst(me.x, me.y, 0.3, 14, { shape: 'star', color: 0xffe080, size: 0.45, speed: 3, life: 0.7, flat: true });
        audio.sfx('wrap', { vol: 0.4 });
        continue;
      }
      if (this.safeT > 0 || this.dazeT > 0) continue;
      this.onHit(e.type === 'king' ? 10 : null);
      if (e.type === 'king') e.state = 'home';
      break;
    }
  }
  beatKing(e) {
    e.state = 'gone'; e.obj.visible = false;
    const p = this.epos(e);
    this.fx.burst(p.x, p.y, 0.3, 50, { shape: 'star', color: 0xffd040, size: 0.6, speed: 5, life: 1.4, flat: true });
    this.fx.burst(p.x, p.y, 0.3, 40, { shape: 'dot', color: 0xd09050, size: 0.35, speed: 4, life: 1.0, flat: true });
    progress.eat(60, this.world); this.ctx.biteBump(60);
    const first = !progress.s.grandWon;
    progress.s.grandWon = true;
    if (!progress.s.trails.includes('crown')) progress.s.trails.push('crown');
    progress.star(this.id, 2); progress.save(true);
    audio.sfx('frenzy'); setTimeout(() => audio.sfx('star'), 600);
    this.ctx.toast(first ? 'You beat King Claw! +60 bites and the Crown bubble trail.' : 'You beat King Claw again! +60 bites.', 'star');
  }
  onHit(lossOverride) {
    this.hits++; progress.s.hits++;
    const loss = lossOverride ?? this.wcfg.hitLoss ?? 3;
    const lost = progress.lose(loss);
    this.dazeT = 0.4; this.safeT = 1.9;
    audio.sfx('bonk'); if (lost) audio.sfx('scatter', { vol: 0.7 });
    this.ctx.shake(0.25); this.ctx.biteBump(-lost);
    // half of the lost bites drop along the corridor
    const back = Math.ceil(lost / 2);
    const P = this.P; const spots = [];
    for (const d of [P.dir, OPP[P.dir]]) {
      if (!d) continue;
      let x = P.x, y = P.y;
      for (let i = 0; i < 3; i++) { if (this.canMove(x, y, d, 'enemy') !== 'ok') break; x += DV[d][0]; y += DV[d][1]; if (i >= 1) spots.push({ x, y }); }
    }
    if (!spots.length) spots.push({ x: P.x, y: P.y });
    for (let i = 0; i < back; i++) { const s = spots[i % spots.length]; this.temps.push({ x: s.x, y: s.y, alive: true, until: this.t + 4, off: i }); }
    const me = this.fishPos();
    this.fx.burst(me.x, me.y, 0.3, 10, { shape: 'dot', color: 0xc98a4a, size: 0.3, speed: 3, life: 0.6, flat: true });
  }

  fishPos(out = new THREE.Vector3()) { return this.epos(this.P, out); }

  update(dt) {
    this.t += dt;
    if (this.safeT > 0) this.safeT -= dt;
    if (this.dazeT > 0) this.dazeT -= dt;
    if (this.flareT > 0) {
      this.flareT -= dt;
      if (this.flareT < 1 && !this.flareTicked) { this.flareTicked = true; audio.sfx('flare-end'); }
      if (this.flareT <= 0) audio.setBright(false);
    }
    this.streakT -= dt; if (this.streakT <= 0) this.streak = 0;
    if (!this.leaving) this.movePlayer(dt);
    this.updateEnemies(dt);
    this.checkHits();
    // valves
    for (const vo of this.valveObjs) {
      const open = this.valveOpen(vo.v.x, vo.v.y);
      const slide = open ? 1.25 : 0;
      vo.disc.position.copy(vo.base); if (vo.horiz) vo.disc.position.y += slide; else vo.disc.position.x += slide;
      vo.disc.position.z = open ? -0.2 : 0;
      const warn = this.valveWarn(vo.v);
      vo.lamp.material.emissiveIntensity = !open ? 1.2 : warn ? (Math.floor(this.t * 10) % 2 ? 1.5 : 0.2) : 0;
      if (warn && !vo.warned && this.distTo({ x: vo.v.x, y: vo.v.y, f: 0 }) < 8) { vo.warned = true; audio.sfx('hiss', { vol: 0.5 }); }
      if (open && !vo.wasOpen) { vo.warned = false; }
      if (open !== vo.wasOpen && this.distTo({ x: vo.v.x, y: vo.v.y, f: 0 }) < 8) { audio.sfx('clunk', { vol: 0.5 }); if (!open) this.fx.burst(vo.base.x, vo.base.y, 0.4, 6, { shape: 'dot', color: 0xf2e2c4, size: 0.5, speed: 1, life: 0.8, up: 0.8 }); }
      vo.wasOpen = open;
    }
    // refill
    if (this.maze.refill) for (const b of this.biteCells) if (!b.alive && b.respawnAt && this.t > b.respawnAt) { b.alive = true; b.respawnAt = 0; }
    this.temps = this.temps.filter(t => t.alive && t.until > this.t);
    this.shrimps.forEach((s, i) => { if (!s.alive && s.respawnAt && this.t > s.respawnAt) { s.alive = true; s.respawnAt = 0; this.shrimpMeshes[i].visible = true; } });
    for (const g of this.gates || []) g.material.emissiveIntensity = 0.6 + 0.3 * Math.sin(this.t * 3);
    this.updateFishVisual(dt);
    this.updateSchool(dt);
    this.updateBiteMesh();
    for (let i = 0; i < this.shrimpMeshes.length; i++) { const m = this.shrimpMeshes[i]; m.rotation.z = this.t * 2 + i; m.scale.setScalar(1 + 0.15 * Math.sin(this.t * 6 + i)); }
    for (const r of this.portalObjs) { r.rotation.z = this.t; }
    for (const e of this.exitObjs) e.ring.material.emissiveIntensity = 0.5 + 0.3 * Math.sin(this.t * 3 + e.n);
    if (this.curTex) this.curTex.offset.y = -this.t * 1.2;
    if (this.hasCurrents) {
      const onCur = CUR_CH[this.ch(this.P.x, this.P.y)];
      audio.loop('current-loop', !!onCur, 0.35);
    }
    this.fx.update(dt);
    this.placeCamera(dt);
    if (this.uPool) this.uPool.value.copy(this.fishPos());
    this.pool.position.copy(this.fishPos()).setZ(2.5);
    this.ctx.ui.pipeUpdate(this);
  }

  updateFishVisual(dt) {
    const P = this.P, g = this.player.group;
    this.fishPos(g.position);
    if (P.dir === 'L') this.facing = -1; else if (P.dir === 'R') this.facing = 1;
    const yawT = this.facing * Math.PI / 2;
    const pitchT = P.dir === 'U' ? 1.2 : P.dir === 'D' ? -1.2 : 0;
    const k = Math.min(1, dt / 0.06);
    this.yawVis += (yawT - this.yawVis) * k; this.pitchVis += (pitchT - this.pitchVis) * k;
    let spin = 0;
    if (this.dazeT > 0) spin = (0.4 - this.dazeT) / 0.4 * Math.PI * 2;
    g.rotation.set(0, 0, 0); g.rotateY(this.yawVis + spin); g.rotateX(-this.pitchVis);
    g.visible = !(this.safeT > 0 && this.safeT < 1.5 && Math.floor(this.t * 12) % 2 === 0 && this.dazeT <= 0);
    this.player.swim = P.moving ? 0.8 : 0.3;
    this.player.flareTarget = this.flareT > 0 ? 1 : 0;
    this.player.update(dt);
    // trail
    this.trailT -= dt;
    if (P.moving && this.trailT <= 0) {
      this.trailT = 0.1;
      const def = this.player.def, trail = progress.s.fishTrail[def.id] || 'default';
      const p = g.position, [dx, dy] = DV[P.dir || 'R'];
      this.fx.emit({ x: p.x - dx * 0.5, y: p.y + dy * 0.5, z: 0.1, vy: 0.3, rise: 0.4, life: 1.0, size: 0.18, color: trail === 'rainbow' ? new THREE.Color().setHSL((this.t * 0.4) % 1, 0.8, 0.7) : trail === 'crown' ? 0xffd040 : def.trail, shape: trailShape(trail), alpha: 0.75, wobble: 0.6 });
    }
    if (this.flareT > 0 && Math.random() < dt * 20) this.fx.emit({ x: g.position.x + (Math.random() - 0.5) * 0.8, y: g.position.y + (Math.random() - 0.5) * 0.6, z: 0.3, life: 0.5, size: 0.25, shape: 'spark', color: 0xffc070, alpha: 0.9 });
  }

  updateBiteMesh() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
    let n = 0;
    for (const b of this.biteCells) {
      if (!b.alive) continue;
      this.wpos(b.x, b.y, v); v.y += Math.sin(this.t * 2 + b.x + b.y) * 0.04;
      q.setFromAxisAngle(new THREE.Vector3(0.3, 1, 0).normalize(), this.t + b.x);
      m.compose(v, q, s); this.biteMesh.setMatrixAt(n++, m);
    }
    for (const t of this.temps) {
      if (!t.alive) continue;
      this.wpos(t.x, t.y, v); v.x += (t.off % 3 - 1) * 0.25; v.y += Math.sin(this.t * 8 + t.off) * 0.08;
      const left = t.until - this.t; s.setScalar(left < 1 ? left : 1.2);
      m.compose(v, q, s); this.biteMesh.setMatrixAt(n++, m); s.setScalar(1);
    }
    this.biteMesh.count = n; this.biteMesh.instanceMatrix.needsUpdate = true;
  }

  placeCamera(dt) {
    const me = this.fishPos();
    const aspect = this.camera.aspect;
    const cellsW = isTouch() ? 12 : 15;
    const visW = cellsW * CELL;
    const dist = (visW / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / aspect;
    this.camDist = dist;
    const visH = visW / aspect;
    // dead zone follow
    const tgt = this.camTarget || (this.camTarget = me.clone());
    const dzx = visW * 0.12, dzy = visH * 0.12;
    if (me.x - tgt.x > dzx) tgt.x = me.x - dzx; if (tgt.x - me.x > dzx) tgt.x = me.x + dzx;
    if (me.y - tgt.y > dzy) tgt.y = me.y - dzy; if (tgt.y - me.y > dzy) tgt.y = me.y + dzy;
    const mw = (this.maze.w + 2) * CELL / 2, mh = (this.maze.h + 2) * CELL / 2;
    const cx = visW / 2 >= mw ? 0 : THREE.MathUtils.clamp(tgt.x, -mw + visW / 2, mw - visW / 2);
    const cy = visH / 2 >= mh ? 0 : THREE.MathUtils.clamp(tgt.y, -mh + visH / 2, mh - visH / 2);
    const tilt = THREE.MathUtils.degToRad(12);
    const want = new THREE.Vector3(cx, cy + Math.sin(tilt) * dist, Math.cos(tilt) * dist);
    if (dt >= 1) this.camPos.copy(want); else this.camPos.lerp(want, Math.min(1, dt * 5));
    const sh = this.ctx.shakeAmt || 0;
    this.camera.position.copy(this.camPos).add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0));
    this.camera.lookAt(this.camPos.x, this.camPos.y - Math.sin(tilt) * dist, 0);
    this.backdrop.position.x = this.camPos.x * 0.75; this.backdrop.position.y = this.camPos.y * 0.75;
  }

  render(renderer) { renderer.render(this.scene, this.camera); }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }

  // screen positions of exits for HUD labels
  exitScreen() {
    const out = [];
    for (const e of this.exitObjs) {
      const v = e.pos.clone().project(this.camera);
      out.push({ n: e.n, x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, on: Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && v.z < 1, dir: e.dir });
    }
    return out;
  }
  enemyScreen() {
    return this.enemies.map(e => { const v = this.epos(e).project(this.camera); return { x: v.x, y: v.y, d: this.distTo(e), state: e.state }; });
  }
  debug() {
    return { boss: this.enemies.find(e => e.type === 'king') ? { hits: this.kingHits, state: this.enemies.find(e => e.type === 'king').state } : null, school: this.school?.length || 0, maze: this.id, leftBy: this.leftBy || null, x: this.P.x, y: this.P.y, dir: this.P.dir, f: +this.P.f.toFixed(2), moving: this.P.moving, queued: this.queued, flare: +this.flareT.toFixed(2), hits: this.hits, bitesLeft: this.bitesTotal - this.bitesEatenUnique, bitesTotal: this.bitesTotal, cleared: !!this.cleared, safe: +this.safeT.toFixed(2), enemies: this.enemies.map(e => ({ type: e.type, x: e.x, y: e.y, state: e.state })) };
  }
}
