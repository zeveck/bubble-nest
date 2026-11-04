// Tank mode: free 3D swimming in a small aquarium.
import * as THREE from 'three';
import { NODES } from '../data/worlds.js';
import { FISH_BY_ID, LADIES } from '../data/fish.js';
import { Fish, getBody } from '../fishmodel.js';
import { modelMesh, texture } from '../assets.js';
import { FX, trailShape } from '../fx.js';
import { WORLD_STYLE, makePanorama, addCaustics, makeWaterSurface, rimMaterial, makeBites, canvasTexture } from '../world3d.js';
import { input, isTouch } from '../input.js';
import { audio } from '../audio.js';
import { progress, Z } from '../progress.js';

const W = 14, H = 8, D = 7;
const X0 = -W / 2, X1 = W / 2, Y0 = -H / 2, Y1 = H / 2, Z0 = -D / 2, Z1 = D / 2;
const SURF = Y1 - 0.15;
const MOUTH = new THREE.Vector3(4, 3.0, 0);
const LEAF = new THREE.Vector3(1.5, SURF - 0.05, -0.6);
const FEED = new THREE.Vector3(5.6, SURF, 1.6);
const BUBBLE_OUT = new THREE.Vector3(-5.6, Y0 + 0.2, -2.3);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

function rng(seed) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

class Swimmer { // NPC fish wandering
  constructor(fish, rand, speed = 1.1, box = null) {
    this.fish = fish; this.rand = rand; this.speed = speed;
    this.p = new THREE.Vector3(X0 + 2 + rand() * (W - 4), Y0 + 1.5 + rand() * (H - 3), Z0 + 1 + rand() * (D - 2));
    this.yaw = rand() * 6.28; this.pitch = 0; this.target = this.p.clone(); this.t = 0;
    this.box = box;
  }
  pick() {
    const r = this.rand;
    this.target.set(X0 + 1.5 + r() * (W - 3), Y0 + 1.2 + r() * (H - 3), Z0 + 1 + r() * (D - 2));
  }
  update(dt, override) {
    this.t -= dt;
    const tg = override || this.target;
    if (!override && (this.t <= 0 || this.p.distanceTo(tg) < 0.6)) { this.pick(); this.t = 3 + this.rand() * 4; }
    tmp.subVectors(tg, this.p);
    const dist = tmp.length();
    const yawT = Math.atan2(tmp.x, tmp.z);
    let dy = yawT - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * Math.min(1, dt * 1.8);
    const pitchT = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)) * 0.8;
    this.pitch += (pitchT - this.pitch) * Math.min(1, dt * 2);
    const sp = Math.min(this.speed, dist * 1.5);
    this.p.x += Math.sin(this.yaw) * Math.cos(this.pitch) * sp * dt;
    this.p.z += Math.cos(this.yaw) * Math.cos(this.pitch) * sp * dt;
    this.p.y += Math.sin(this.pitch) * sp * dt;
    this.p.x = THREE.MathUtils.clamp(this.p.x, X0 + 0.8, X1 - 0.8);
    this.p.y = THREE.MathUtils.clamp(this.p.y, Y0 + 0.8, SURF - 0.3);
    this.p.z = THREE.MathUtils.clamp(this.p.z, Z0 + 0.7, Z1 - 0.7);
    const g = this.fish.group;
    g.position.copy(this.p); g.rotation.set(-this.pitch, this.yaw, 0, 'YXZ');
    this.fish.swim = 0.2 + 0.5 * sp / this.speed; this.fish.turn = THREE.MathUtils.clamp(-dy, -1, 1);
    this.fish.update(dt);
  }
}

export class TankMode {
  constructor(ctx) {
    this.ctx = ctx;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 200);
  }

  enter({ tankId, from = 'pipe', demo = false }) {
    this.id = tankId; this.node = NODES[tankId]; this.world = this.node.world; this.demo = demo;
    this.from = from;
    const st = WORLD_STYLE[this.world];
    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(st.water, 0.042);
    scene.background = new THREE.Color(st.back);
    this.uTime = { value: 0 };
    this.t = 0;
    // lights
    scene.add(new THREE.HemisphereLight(st.amb, 0x2a4a50, 1.4));
    const sun = new THREE.DirectionalLight(st.light, 2.0);
    sun.position.set(-3, 12, 5); sun.target.position.set(0, 0, 0);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6, near: 1, far: 30 });
    scene.add(sun, sun.target);
    // surroundings
    scene.add(makePanorama(this.world, 30, 26, 4));
    const table = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 30), new THREE.MeshStandardMaterial({ color: this.world === 'cp' ? 0x6a4028 : this.world === 'nn' ? 0x1a1a30 : 0xc8a070, roughness: 0.8 }));
    table.position.set(0, Y0 - 0.5 - 0.6, 0); scene.add(table);
    this.buildTank();
    this.buildContents();
    this.fx = new FX(scene, 500, 260);
    // player
    const def = FISH_BY_ID[progress.s.fish];
    this.player = new Fish(getBody('male'), def, { shadow: true });
    scene.add(this.player.group);
    this.p = new THREE.Vector3(); this.v = new THREE.Vector3();
    this.yaw = -Math.PI / 2; this.pitch = 0; this.pushT = 0;
    if (from === 'start') { this.p.set(-3.5, 1.2, 0.8); this.yaw = Math.atan2(FEED.x - 0.5 + 3.5, FEED.z - 0.8); this.pitch = 0.15; }
    else if (from === 'pipe' || from === 'title') { this.p.set(MOUTH.x - 0.6, MOUTH.y - 1.4, 0.3); this.yaw = -Math.PI / 2 - 0.3; this.pitch = -0.35; }
    else { this.p.set(0, 0, 1); this.yaw = -Math.PI / 2; }
    if (demo) this.p.set(-2, 0, 0);
    this.camYawOff = 0; this.camPitch = 0.32; this.camLookT = 0;
    this.camPos = new THREE.Vector3();
    this.auto = null; this.actionLock = 0; this.enteringTube = false; this.tubeCool = 1.2;
    this.firstVisit = from === 'start';
    this.streak = 0; this.streakT = 0; this.trailT = 0;
    // feeder
    const isHome = progress.isHome(tankId);
    let feed = 0;
    if (progress.s.startBites && tankId === 'cw-home' && !demo) { feed = 8; progress.s.startBites = false; }
    else if (from === 'pipe' && isHome) feed = progress.feederSize(tankId);
    this.spawnFeed(feed);
    this.feederBites = feed;
    this.placeCamera(1);
    return this;
  }

  buildTank() {
    const sc = this.scene, st = WORLD_STYLE[this.world];
    // gravel floor with caustics
    const gtex = texture('assets/tex/gravel.jpg');
    const gm = new THREE.MeshStandardMaterial({ color: gtex ? 0xffffff : 0xcdb894, map: gtex, roughness: 0.9 });
    if (gtex) { gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.repeat.set(4, 2); }
    addCaustics(gm, this.uTime, this.world === 'nn' ? 0.15 : 0.35);
    const gg = new THREE.PlaneGeometry(W, D, 28, 14); gg.rotateX(-Math.PI / 2);
    const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i); gp.setY(i, 0.25 * Math.sin(x * 0.6) * Math.cos(z * 0.9) + 0.35 * (z < 0 ? -z / D * 2 : 0)); }
    gg.computeVertexNormals();
    const floor = new THREE.Mesh(gg, gm); floor.position.y = Y0; floor.receiveShadow = false; sc.add(floor);
    // back poster
    const posterN = 1 + (rng(this.id)() * 4 | 0);
    const ptex = texture(`assets/bg/poster-${posterN}.jpg`);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: ptex ? 0xffffff : 0x3a8a80, map: ptex, fog: true }));
    poster.position.set(0, 0, Z0 - 0.25); sc.add(poster);
    // glass panes: rim shells
    const glass = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, H + 1.0, D + 0.1), rimMaterial(st.rim, 0.35, 3.0, 0.01));
    glass.position.y = 0.1; glass.renderOrder = 4; sc.add(glass);
    // frame edges
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x33424a, roughness: 0.5, metalness: 0.3 });
    const edges = [];
    for (const [x, z] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.12, H + 0.7, 0.12), frameMat); e.position.set(x, 0.3, z); edges.push(e); }
    for (const y of [Y0 - 0.05, Y1 + 0.6]) for (const z of [Z0, Z1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.16, 0.16), frameMat); e.position.set(0, y, z); edges.push(e); }
    for (const y of [Y0 - 0.05, Y1 + 0.6]) for (const x of [X0, X1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, D + 0.2), frameMat); e.position.set(x, y, 0); edges.push(e); }
    edges.forEach(e => sc.add(e));
    // lid with a hole for the tube (two slabs)
    const lid = new THREE.Mesh(new THREE.BoxGeometry(W - 1.2, 0.15, D), new THREE.MeshStandardMaterial({ color: 0xe8f2f0, roughness: 0.3, transparent: true, opacity: 0.55 })); lid.position.set(-1.2 + 0.6 - 0.6 , Y1 + 0.62, 0);
    lid.scale.x = (W - 3) / (W - 1.2); lid.position.x = X0 + (W - 3) / 2; sc.add(lid);
    // water surface
    this.surface = makeWaterSurface(W, D, this.uTime, st.rim); this.surface.position.y = SURF + 0.1; sc.add(this.surface);
    // hanging tube
    const tubeLen = Y1 + 2.5 - MOUTH.y;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, tubeLen, 24, 1, true), rimMaterial(st.rim, 0.7, 2.2, 0.0));
    tube.position.set(MOUTH.x, MOUTH.y + tubeLen / 2, 0); tube.renderOrder = 4; sc.add(tube);
    const ringMat = new THREE.MeshStandardMaterial({ color: st.rim, emissive: st.rim, emissiveIntensity: 0.6, roughness: 0.3 });
    this.mouthRing = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 10, 32), ringMat);
    this.mouthRing.rotation.x = Math.PI / 2; this.mouthRing.position.copy(MOUTH); sc.add(this.mouthRing);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.12, 10, 32), frameMat); collar.rotation.x = Math.PI / 2; collar.position.set(MOUTH.x, Y1 + 0.62, 0); sc.add(collar);
    // filter in the back corner with bubbles
    const filt = new THREE.Mesh(new THREE.BoxGeometry(1.0, H - 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0xdfe7ea, roughness: 0.4 }));
    filt.position.set(X0 + 0.6, 0.1, Z0 + 0.4); filt.castShadow = true; sc.add(filt);
    this.filterSpot = new THREE.Vector3(X0 + 1.2, Y0 + 1, Z0 + 0.6);
  }

  buildContents() {
    const sc = this.scene, r = rng(this.id), id = this.id, node = this.node;
    // props
    const props = [['prop-anubias', 2.4], ['prop-driftwood', 4.2], ['prop-cave', 2.0], ['prop-castle', 2.6], ['prop-anubias', 2.0]];
    const spots = [[-4.5, -1.5], [-1.5, -2.2], [2.5, -2.0], [-3, 1.2], [5.5, -2.2], [0.5, 1.8]];
    const chosen = [];
    for (let i = 0; i < 4; i++) {
      const [name, size] = props[(r() * props.length) | 0];
      const s = spots.splice((r() * spots.length) | 0, 1)[0];
      const m = modelMesh(name, size * (0.85 + r() * 0.3), { shadow: true });
      if (!m) continue;
      m.position.set(s[0], Y0 + 0.1, s[1]); m.rotation.y = r() * 6.28; sc.add(m); chosen.push(m);
      if (name === 'prop-anubias') m.userData.sway = r() * 6;
    }
    this.props = chosen;
    // leaf (nest spot)
    const ls = new THREE.Shape(); ls.moveTo(-0.85, 0); ls.bezierCurveTo(-0.5, 0.55, 0.45, 0.6, 0.9, 0); ls.bezierCurveTo(0.45, -0.6, -0.5, -0.55, -0.85, 0);
    const leafGeo = new THREE.ShapeGeometry(ls, 16); leafGeo.rotateX(-Math.PI / 2);
    const veins = canvasTexture(256, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(60,90,30,0.55)'; c.lineWidth = 4; c.beginPath(); c.moveTo(10, h / 2); c.lineTo(w - 10, h / 2); c.stroke(); c.lineWidth = 2.5; for (let i = 1; i < 7; i++) { const x = i * w / 7.5; c.beginPath(); c.moveTo(x, h / 2); c.lineTo(x + 26, h / 2 - 34); c.moveTo(x, h / 2); c.lineTo(x + 26, h / 2 + 34); c.stroke(); } });
    { const uv = leafGeo.attributes.uv, pos = leafGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.9) / 1.8, (pos.getZ(i) + 0.6) / 1.2); }
    this.leafMat = new THREE.MeshStandardMaterial({ map: veins, color: 0x8ab84a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x7ac050, emissiveIntensity: 0.45 });
    this.leaf = new THREE.Mesh(leafGeo, this.leafMat); this.leaf.position.copy(LEAF); this.leaf.position.y = SURF + 0.05; sc.add(this.leaf);
    this.leaf.visible = node.kind !== 'home';
    // nest foam
    this.foamMax = 70;
    const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf6fbff, roughness: 0.1, transparent: true, opacity: 0.9, emissive: 0xdff6ff, emissiveIntensity: 0.55 }), this.foamMax);
    const fr = rng(id + 'foam'); this.foamData = [];
    for (let i = 0; i < this.foamMax; i++) {
      const a = fr() * 6.28, d = Math.sqrt(fr()) * 0.95;
      this.foamData.push({ x: LEAF.x + Math.cos(a) * d * 1.1, z: LEAF.z + Math.sin(a) * d * 0.8, r: 0.06 + fr() * 0.09, y: SURF - 0.02 - fr() * 0.08 });
    }
    foam.count = 0; sc.add(foam); this.foam = foam;
    this.foamShown = 0;
    const t = progress.s.tanks[id];
    if (t?.claimed) this.setFoam(this.foamMax);
    // eggs
    const eggs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd98a, emissive: 0xffc860, emissiveIntensity: 0.45, roughness: 0.3 }), 24);
    const er = rng(id + 'eggs'); const mtx = new THREE.Matrix4();
    for (let i = 0; i < 24; i++) { mtx.makeTranslation(LEAF.x + (er() - 0.5) * 0.9, SURF - 0.12 - er() * 0.06, LEAF.z + (er() - 0.5) * 0.6); eggs.setMatrixAt(i, mtx); }
    eggs.visible = t?.stage === 'eggs'; sc.add(eggs); this.eggs = eggs;
    // lady
    this.npcs = [];
    if (node.kind === 'lady') {
      const lady = LADIES[node.lady];
      const f = new Fish(getBody('female'), lady, { shadow: true });
      f.group.scale.setScalar(0.85);
      sc.add(f.group);
      this.lady = new Swimmer(f, rng(id + 'lady'), 0.9);
      this.npcs.push(this.lady);
    }
    // residents
    for (const [fid, home] of Object.entries(progress.s.fishHome)) {
      if (home !== id || fid === progress.s.fish) continue;
      const f = new Fish(getBody('male'), FISH_BY_ID[fid], { shadow: true });
      sc.add(f.group);
      this.npcs.push(new Swimmer(f, rng(id + fid), 1.0));
    }
    // fry cloud / grown young fish
    this.fry = null; this.young = null;
    this.refreshFry();
    // bubble-out machine (home tanks, once the room has been found)
    this.bubbleOut = null;
    if (node.kind === 'home') {
      const m = modelMesh('bubble-machine', 1.2, { shadow: true });
      if (m) { m.position.copy(BUBBLE_OUT); m.rotation.y = 0.7; this.scene.add(m); this.bubbleOut = m; m.visible = progress.s.roomFound; }
    }
    // bites
    this.bites = makeBites(64, this.world); this.bites.count = 0; sc.add(this.bites);
    this.biteData = [];
  }

  refreshFry() {
    const t = progress.s.tanks[this.id], node = this.node;
    if (this.fry) { this.scene.remove(this.fry); this.fry = null; }
    if (this.young) { this.scene.remove(this.young.fish.group); this.npcs = this.npcs.filter(n => n !== this.young); this.young = null; }
    if (!t?.stage || !node.son) return;
    const son = FISH_BY_ID[node.son];
    if (t.stage === 'fry' || t.stage === 'done' || t.stage === 'grown') {
      const n = t.stage === 'fry' ? 30 : 6;
      const body = getBody('male');
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(son.bodyA).lerp(new THREE.Color(0xffffff), 0.3), map: body.map, roughness: 0.4 });
      const im = new THREE.InstancedMesh(body.geometry, mat, n);
      im.frustumCulled = false;
      const r = rng(this.id + 'fry');
      this.fryData = Array.from({ length: n }, () => ({ a: r() * 6.28, b: r() * 6.28, rad: 0.4 + r() * 1.2, sp: 0.6 + r() * 0.8, y: r() }));
      this.fryScale = t.stage === 'fry' ? 0.12 : 0.3;
      this.scene.add(im); this.fry = im;
    }
    if (t.stage === 'grown') {
      const f = new Fish(getBody('male'), son, { shadow: true });
      f.group.scale.setScalar(0.85);
      this.scene.add(f.group);
      this.young = new Swimmer(f, rng(this.id + 'young'), 0.9);
      this.young.p.set(LEAF.x - 1, 1.5, 0.5);
      this.npcs.push(this.young);
    }
    this.eggs.visible = t.stage === 'eggs';
  }

  setFoam(n) {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const f = this.foamData[i]; m.makeScale(f.r, f.r * 0.8, f.r); m.setPosition(f.x, f.y, f.z); this.foam.setMatrixAt(i, m); }
    this.foam.count = n; this.foam.instanceMatrix.needsUpdate = true; this.foamShown = n;
  }

  spawnFeed(n) {
    const r = rng(this.id + 'feed' + progress.s.eaten);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = 0.3 + r() * 1.6;
      const c = n > 12 ? FEED.clone().lerp(new THREE.Vector3(0, SURF, 0), r() * 0.8) : FEED;
      this.biteData.push({ p: new THREE.Vector3(c.x + Math.cos(a) * d - 0.5, SURF - 0.05, THREE.MathUtils.clamp(c.z + Math.sin(a) * d, Z0 + 0.5, Z1 - 0.5)), ph: r() * 6, sink: 0, alive: true });
    }
    if (n > 0 && this.from === 'pipe') audio.sfx('feeder');
  }

  exit() {
    this.player?.dispose();
    this.scene?.traverse(o => { if (o.isMesh && o.geometry && !o.geometry.userData?.shared) { } });
    this.scene = null;
  }

  // ---------- controls ----------
  controls(dt) {
    const s = progress.s.settings, sens = s.sens || 1;
    let fwd = 0, yawRate = 0, rise = 0, pitchT = null;
    const touch = isTouch();
    if (input.enabled) {
      if (input.pointer.down && !touch) {
        const nx = (input.pointer.x - innerWidth / 2) / (innerWidth / 2), ny = (input.pointer.y - innerHeight / 2) / (innerHeight / 2);
        const dz = (v) => Math.abs(v) < 0.08 ? 0 : (v - Math.sign(v) * 0.08) / 0.92;
        yawRate = -dz(nx) * 2.6 * sens; pitchT = -dz(ny) * 1.1 * (s.invert ? -1 : 1); fwd = 1;
      }
      if (input.held('KeyW', 'ArrowUp')) fwd = 1;
      if (input.held('KeyS', 'ArrowDown')) fwd = -0.5;
      if (input.held('KeyA', 'ArrowLeft')) yawRate = 2.2 * sens;
      if (input.held('KeyD', 'ArrowRight')) yawRate = -2.2 * sens;
      if (input.held('Space', 'KeyR') || input.rise) rise = 1;
      if (input.held('ShiftLeft', 'ShiftRight', 'KeyF') || input.dive) rise = -1;
      if (s.invert && (input.rise || input.dive)) rise = -rise;
      if (input.stick.active) {
        const sx = input.stick.x, sy = input.stick.y, mag = Math.min(1, Math.hypot(sx, sy));
        if (mag > 0.15) {
          const camYaw = this.yaw + this.camYawOff;
          const want = camYaw + Math.atan2(-sx, sy);
          let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
          yawRate = THREE.MathUtils.clamp(d * 4, -3, 3);
          fwd = mag * (Math.abs(d) > 2.4 ? 0.3 : 1);
          if (touch) pitchT = -(this.camPitch - 0.28) * 1.2;
        }
      }
    }
    return { fwd, yawRate, rise, pitchT };
  }

  update(dt) {
    this.t += dt; this.uTime.value = this.t;
    const c = this.demo ? this.demoControls(dt) : (this.auto ? this.autoControls(dt) : this.controls(dt));
    if (!this.demo && this.auto && (input.held('KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight') || input.stick.active || input.pointer.down)) this.auto = null;
    // movement
    this.yaw += c.yawRate * dt;
    if (c.pitchT !== null && c.pitchT !== undefined) this.pitch += (THREE.MathUtils.clamp(c.pitchT, -1.1, 1.1) - this.pitch) * Math.min(1, dt * 3);
    else if (c.rise) this.pitch += (c.rise * 0.5 - this.pitch) * Math.min(1, dt * 3);
    else this.pitch += (0 - this.pitch) * Math.min(1, dt * 1.5);
    this.pushT = c.fwd > 0.5 ? this.pushT + dt : 0;
    const speed = (this.pushT > 1 ? 5 : 3.5) * c.fwd;
    const fx = Math.sin(this.yaw) * Math.cos(this.pitch), fz = Math.cos(this.yaw) * Math.cos(this.pitch), fy = Math.sin(this.pitch);
    tmp.set(fx * speed, fy * speed + c.rise * 2, fz * speed);
    const k = Math.min(1, dt * (c.fwd || c.rise ? 3 : 2.5));
    this.v.lerp(tmp, k);
    this.p.addScaledVector(this.v, dt);
    // walls: slide
    const m = 0.55;
    if (this.p.x < X0 + m) { this.p.x = X0 + m; this.v.x = 0; } if (this.p.x > X1 - m) { this.p.x = X1 - m; this.v.x = 0; }
    if (this.p.y < Y0 + 0.6) { this.p.y = Y0 + 0.6; this.v.y = 0; } if (this.p.y > SURF - 0.12) { this.p.y = SURF - 0.12; this.v.y = Math.min(0, this.v.y); }
    if (this.p.z < Z0 + m) { this.p.z = Z0 + m; this.v.z = 0; } if (this.p.z > Z1 - m) { this.p.z = Z1 - m; this.v.z = 0; }
    const g = this.player.group;
    g.position.copy(this.p); g.rotation.set(-this.pitch, this.yaw, 0, 'YXZ');
    const spd = this.v.length();
    this.player.swim = THREE.MathUtils.clamp(0.25 + spd / 5, 0.25, 1);
    this.player.turn = THREE.MathUtils.clamp(-c.yawRate * 0.4, -1, 1);
    this.player.update(dt);
    // trail bubbles
    this.trailT -= dt;
    if (spd > 1.5 && this.trailT <= 0) {
      this.trailT = 0.12;
      const def = this.player.def, trail = progress.s.fishTrail[def.id] || 'default';
      tmp2.set(-fx, -fy, -fz).multiplyScalar(0.5).add(this.p);
      this.fx.emit({ x: tmp2.x, y: tmp2.y, z: tmp2.z, vy: 0.4, rise: 0.6, life: 1.6, size: 0.12, color: trail === 'rainbow' ? new THREE.Color().setHSL((this.t * 0.3) % 1, 0.8, 0.7) : def.trail, shape: trailShape(trail), alpha: 0.8, wobble: 0.5 });
    }
    // head
    const head = tmp2.set(fx, fy, fz).multiplyScalar(0.32).add(this.p).clone();
    this.head = head;
    this.updateBites(dt, head);
    for (const n of this.npcs) {
      let over = null;
      if (n === this.lady && this.courtT > 0) { const a = this.t * 1.6; over = new THREE.Vector3(LEAF.x + Math.cos(a) * 1.0, SURF - 0.8, LEAF.z + Math.sin(a) * 0.8); }
      n.update(dt, over);
    }
    this.updateFry(dt);
    this.updateNest(dt);
    // filter bubbles
    if (Math.random() < dt * 14) this.fx.emit({ x: this.filterSpot.x + (Math.random() - 0.5) * 0.3, y: this.filterSpot.y, z: this.filterSpot.z, vy: 1.2, rise: 0.5, life: 4, size: 0.1 + Math.random() * 0.1, color: 0xffffff, alpha: 0.7, wobble: 0.6, drag: 0.2 });
    this.mouthRing.material.emissiveIntensity = 0.5 + 0.35 * Math.sin(this.t * 3);
    if (this.leaf.visible) { const c = progress.canNest(this.id); this.leafMat.emissive.set(c ? 0xffe9a8 : 0x7ac050); this.leafMat.emissiveIntensity = c ? 0.5 + 0.3 * Math.sin(this.t * 4) : 0.45; if (c && Math.random() < dt * 4) this.fx.emit({ x: LEAF.x + (Math.random() - 0.5) * 1.2, y: SURF - 0.4, z: LEAF.z + (Math.random() - 0.5) * 0.8, vy: 0.5, life: 1, size: 0.18, shape: 'spark', color: 0xfff0a0, alpha: 0.9 }); }
    for (const p of this.props) if (p.userData.sway !== undefined) p.rotation.z = Math.sin(this.t * 0.8 + p.userData.sway) * 0.04;
    if (this.bubbleOut) this.bubbleOut.visible = progress.s.roomFound;
    this.fx.update(dt);
    // tube entry
    if (!this.demo && !this.enteringTube) {
      const dxz = Math.hypot(head.x - MOUTH.x, head.z - MOUTH.z);
      this.tubeCool -= dt;
      const lockFirst = this.firstVisit && this.bitesLeft > 0 && this.t < 8;
      if (dxz < 0.8 && head.y > MOUTH.y - 0.5 && this.tubeCool <= 0 && !lockFirst) { this.enteringTube = true; this.ctx.leaveTank(this.id); }
      // bubble-out
    }
    if (!this.demo && this.id === 'cw-home') {
      if (this.t > 3 && this.bitesLeft > 0) this.ctx.tip('rise');
      if (this.feederBites > 0 && this.bitesLeft === 0) this.ctx.tip('tube');
    }
    this.placeCamera(dt);
    // action prompt
    this.ctx.setAction(this.demo ? null : this.currentAction());
    if (!this.demo) this.ctx.ui.tankUpdate(this);
  }

  demoControls(dt) {
    const tg = new THREE.Vector3(Math.cos(this.t * 0.3) * 3.5, -0.8 + Math.sin(this.t * 0.4) * 0.8, -1.4 + Math.sin(this.t * 0.3) * 0.6);
    tmp.subVectors(tg, this.p);
    let d = Math.atan2(tmp.x, tmp.z) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    return { fwd: 0.6, yawRate: THREE.MathUtils.clamp(d * 2, -1.5, 1.5), rise: 0, pitchT: Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)) * 0.7 };
  }
  autoControls(dt) {
    const tg = this.auto;
    tmp.subVectors(tg, this.p);
    let d = Math.atan2(tmp.x, tmp.z) - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    return { fwd: 1, yawRate: THREE.MathUtils.clamp(d * 5, -4, 4), rise: 0, pitchT: Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)) };
  }

  updateBites(dt, head) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
    let n = 0;
    this.streakT -= dt; if (this.streakT <= 0) this.streak = 0;
    for (const b of this.biteData) {
      if (!b.alive) continue;
      const y = b.p.y + Math.sin(this.t * 2 + b.ph) * 0.03;
      if (!this.demo && head.distanceTo(tmp.set(b.p.x, y, b.p.z)) < 0.55) {
        b.alive = false;
        this.streak++; this.streakT = 0.6;
        audio.sfx('nip', { semis: Math.min(12, this.streak) + (this.player.def.pitch || 0) * 0.5 });
        this.fx.burst(b.p.x, y, b.p.z, 5, { color: 0xc98a4a, shape: 'dot', size: 0.12, speed: 0.8, life: 0.4 });
        progress.eat(1, this.world);
        this.ctx.biteBump();
        continue;
      }
      m.compose(tmp.set(b.p.x, y, b.p.z), q.setFromEuler(new THREE.Euler(b.ph, b.ph * 2, 0)), sc);
      this.bites.setMatrixAt(n++, m);
    }
    this.bites.count = n; this.bites.instanceMatrix.needsUpdate = true;
    this.bitesLeft = n;
  }

  updateFry(dt) {
    if (!this.fry) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3().setScalar(this.fryScale);
    const c = new THREE.Vector3(LEAF.x - 0.5, SURF - 1.2, LEAF.z);
    this.fryData.forEach((f, i) => {
      f.a += f.sp * dt;
      const x = c.x + Math.cos(f.a) * f.rad * 1.4, z = c.z + Math.sin(f.a) * f.rad, y = c.y + Math.sin(f.a * 2 + f.b) * 0.3 - f.y * 0.8;
      e.set(0, f.a + Math.PI, 0); q.setFromEuler(e);
      m.compose(tmp.set(x, y, z), q, s);
      this.fry.setMatrixAt(i, m);
    });
    this.fry.instanceMatrix.needsUpdate = true;
  }

  updateNest(dt) {
    if (this.building) {
      this.building.t += dt;
      const n = Math.min(this.foamMax, Math.floor(this.building.t / 1.6 * this.foamMax));
      if (n > this.foamShown) {
        const f = this.foamData[n - 1];
        if (n % 3 === 0) audio.sfx('pop', { semis: (Math.random() * 6 - 3) });
        this.fx.emit({ x: f.x, y: f.y, z: f.z, size: 0.25, life: 0.3, shape: 'ring', color: 0xffffff, alpha: 0.8 });
        this.setFoam(n);
      }
      if (this.building.t > 1.8 && !this.building.done) {
        this.building.done = true;
        const ok = this.building.ok;
        if (this.node.kind === 'lady') { this.courtT = 2.4; audio.sfx('courtship'); }
        else { this.building = null; this.afterAction = true; }
      }
    }
    if (this.courtT > 0) {
      this.courtT -= dt;
      if (this.courtT <= 0) {
        this.building = null; this.refreshFry(); this.eggs.visible = true; this.afterAction = true;
        audio.sfx('eggs');
        this.fx.burst(LEAF.x, SURF - 0.15, LEAF.z, 14, { shape: 'spark', color: 0xfff2cc, size: 0.2, speed: 0.6, life: 0.9 });
        this.ctx.statusChanged();
      }
    }
  }

  placeCamera(dt) {
    const look = input.takeLook();
    const sens = (progress.s.settings.sens || 1) * 0.005;
    if (look.dx || look.dy) { this.camYawOff -= look.dx * sens; this.camPitch = THREE.MathUtils.clamp(this.camPitch + look.dy * sens, -0.6, 1.1); }
    const sinceLook = (performance.now() - input.look.lastAt) / 1000;
    if (!input.look.active && input.touchLook.id === null && sinceLook > 1.5) {
      this.camYawOff += (0 - this.camYawOff) * Math.min(1, dt * 1.5);
      if (!isTouch()) this.camPitch += (0.32 - this.camPitch) * Math.min(1, dt * 1.0);
    }
    const cy = this.yaw + this.camYawOff + Math.PI + (this.demo ? 0 : 0.55);
    let dist = this.demo ? 7 : 2.6;
    let cp = this.camPitch;
    const nearTop = THREE.MathUtils.smoothstep(this.p.y, SURF - 2.2, SURF - 0.6);
    cp = cp * (1 - nearTop) + Math.min(cp, -0.3) * nearTop;
    const off = tmp.set(Math.sin(cy) * Math.cos(cp), Math.sin(cp), Math.cos(cy) * Math.cos(cp)).multiplyScalar(dist);
    const target = tmp2.copy(this.p).add(off);
    // keep inside the water box
    target.x = THREE.MathUtils.clamp(target.x, X0 + 0.3, X1 - 0.3);
    target.z = THREE.MathUtils.clamp(target.z, Z0 + 0.3, Z1 - 0.3);
    target.y = THREE.MathUtils.clamp(target.y, Y0 + 0.4, SURF - 0.35);
    if (this.demo) target.set(Math.sin(this.t * 0.1) * 2, 0.6, Z1 - 0.6);
    this.focus = (this.building || this.courtT > 0) ? LEAF : null;
    if (this.focus) target.set(LEAF.x - 1.5, SURF - 3.0, Z1 - 0.8);
    if (dt >= 1) this.camPos.copy(target); else this.camPos.lerp(target, Math.min(1, dt * 6));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.demo ? new THREE.Vector3(0, -0.3, -2) : this.focus ? LEAF : this.p);
  }

  currentAction() {
    if (this.building || this.courtT > 0) return null;
    const node = this.node, t = progress.s.tanks[this.id];
    const head = this.head || this.p;
    // nest
    if (progress.canNest(this.id) && head.distanceTo(LEAF) < 2.2) {
      const z = Z(node);
      const afford = progress.s.bites >= z;
      return { id: 'nest', label: afford ? `Build bubble nest: ${z} ${(z) === 1 ? 'bite' : 'bites'}` : `Need ${z - progress.s.bites} more ${(z - progress.s.bites) === 1 ? 'bite' : 'bites'}`, disabled: !afford };
    }
    if (this.young && head.distanceTo(this.young.p) < 2.5) return { id: 'become', label: `Become ${FISH_BY_ID[node.son].name}` };
    if (this.bubbleOut?.visible && head.distanceTo(BUBBLE_OUT) < 2.2) return { id: 'bubbleout', label: 'Bubble out to the Fish Room' };
    if (this.afterAction || (this.feederBites > 0 && this.bitesLeft === 0)) return { id: 'pipes', label: 'Back to the pipes' };
    return null;
  }

  doAction(id) {
    if (id === 'nest') {
      if (!progress.nest(this.id)) { audio.sfx('deny'); return; }
      audio.sfx('pop');
      this.building = { t: 0 };
      this.foamShown = 0; this.setFoam(0);
      this.ctx.statusChanged();
      return;
    }
    if (id === 'become') { this.ctx.becomeFish(this.node.son, this.id); return; }
    if (id === 'bubbleout') { this.ctx.toRoom('bubbleout', this.id); return; }
    if (id === 'pipes') { this.auto = MOUTH.clone().add(new THREE.Vector3(0, 0.3, 0)); return; }
  }

  // change player fish in place (after becoming)
  swapPlayer(def) {
    this.scene.remove(this.player.group); this.player.dispose();
    this.player = new Fish(getBody('male'), def, { shadow: true });
    this.scene.add(this.player.group);
    this.fx.burst(this.p.x, this.p.y, this.p.z, 30, { shape: 'star', color: def.trail, size: 0.3, speed: 2, life: 1.2 });
    // the young fish becomes the player: remove the npc
    if (this.young) { this.scene.remove(this.young.fish.group); this.npcs = this.npcs.filter(n => n !== this.young); this.p.copy(this.young.p); this.young = null; }
    this.refreshResidents();
    this.refreshFry();
  }
  refreshResidents() {
    for (const n of this.npcs.filter(n => n !== this.lady && n !== this.young)) { this.scene.remove(n.fish.group); }
    this.npcs = this.npcs.filter(n => n === this.lady || n === this.young);
    for (const [fid, home] of Object.entries(progress.s.fishHome)) {
      if (home !== this.id || fid === progress.s.fish) continue;
      const f = new Fish(getBody('male'), FISH_BY_ID[fid], { shadow: true });
      this.scene.add(f.group);
      const sw = new Swimmer(f, rng(this.id + fid), 1.0); sw.p.copy(this.p).add(new THREE.Vector3(-1.5, -0.8, 0.6)); sw.p.x = Math.max(X0 + 1, sw.p.x); sw.p.y = Math.max(Y0 + 1, sw.p.y); this.npcs.push(sw);
    }
  }

  status() {
    const node = this.node, t = progress.s.tanks[this.id];
    const fs = progress.fryStatus(this.id);
    let line = '';
    if (node.kind === 'home') line = 'Your tank';
    else if (!t?.claimed) { const near = this.head && this.head.distanceTo(LEAF) < 2.2; line = near ? `Build the nest here: ${Z(node)} ${(Z(node)) === 1 ? 'bite' : 'bites'}` : (node.kind === 'lady' ? `${LADIES[node.lady].name} is waiting. Swim to the leaf to nest: ${Z(node)} ${(Z(node)) === 1 ? 'bite' : 'bites'}` : `Swim to the leaf to claim it: ${Z(node)} ${(Z(node)) === 1 ? 'bite' : 'bites'}`); }
    else if (fs?.stage === 'eggs') line = `Eggs: hatch in ${fs.left} ${fs.left === 1 ? 'bite' : 'bites'}`;
    else if (fs?.stage === 'fry') line = `Fry: grown in ${fs.left} ${fs.left === 1 ? 'bite' : 'bites'}`;
    else if (fs?.stage === 'grown') line = `${FISH_BY_ID[node.son].name} is grown! Swim over to become him.`;
    else line = 'Your tank';
    return { name: node.name, line };
  }

  leafScreen() {
    if (!this.leaf.visible || !progress.canNest(this.id) || this.building) return null;
    const v = LEAF.clone().add(new THREE.Vector3(0, 0.2, 0)).project(this.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, on: v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1, nx: v.x, ny: v.y, behind: v.z > 1 };
  }
  render(renderer) { renderer.render(this.scene, this.camera); }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  debug() { return { p: this.p.toArray().map(v => +v.toFixed(2)), yaw: +this.yaw.toFixed(2), bitesLeft: this.bitesLeft, action: this.currentAction()?.id || null, mouth: MOUTH.toArray(), leaf: LEAF.toArray(), young: this.young ? this.young.p.toArray() : null, bubbleOut: BUBBLE_OUT.toArray() }; }
  teleportTo(v, yaw) { this.p.set(...v); this.v.set(0, 0, 0); if (yaw != null) this.yaw = yaw; }
}
