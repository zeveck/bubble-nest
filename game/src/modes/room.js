// The Fish Room: float around in a bubble, dock at bubble machines, visit the Grand Tank.
import * as THREE from 'three';
import { DOCKS, NODES } from '../data/worlds.js';
import { FISH, FISH_BY_ID } from '../data/fish.js';
import { Fish, getBody } from '../fishmodel.js';
import { modelMesh, texture } from '../assets.js';
import { FX } from '../fx.js';
import { WORLD_STYLE, rimMaterial, bubbleMaterial } from '../world3d.js';
import { input, isTouch } from '../input.js';
import { audio } from '../audio.js';
import { progress } from '../progress.js';

const RW = 6, RH = 3, RD = 5;
const X0 = -RW / 2, X1 = RW / 2, Z0 = -RD / 2, Z1 = RD / 2;
const R = 0.35;
const GT = { x: 0, y: 0.75, z: 0.2, w: 2, h: 1, d: 0.8 }; // grand tank (bottom y)
const DOCK_POS = { 'dock-cw': new THREE.Vector3(-2.3, 1.55, -2.05), 'dock-cp': new THREE.Vector3(0, 1.75, -2.05), 'dock-nn': new THREE.Vector3(2.3, 1.55, -2.05) };
const CAT = new THREE.Vector3(2.2, 0.55, 1.6);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

export class RoomMode {
  constructor(ctx) { this.ctx = ctx; this.camera = new THREE.PerspectiveCamera(60, 1, 0.02, 100); }

  enter({ from = 'machine', via = null, victory = false }) {
    this.t = 0; this.victory = victory;
    const sc = this.scene = new THREE.Scene();
    sc.background = new THREE.Color(0x1a1a2e);
    sc.fog = new THREE.Fog(0x1a1a2e, 6, 14);
    sc.add(new THREE.HemisphereLight(0xffe8d0, 0x302040, 1.1));
    const lamp = new THREE.PointLight(0xffc880, 18, 9, 1.5); lamp.position.set(-2.4, 2.0, 1.6); sc.add(lamp);
    const moon = new THREE.DirectionalLight(0x9ab8ff, 0.8); moon.position.set(0, 3, -6); sc.add(moon);
    this.buildRoom();
    this.fx = new FX(sc, 400, 260);
    // player bubble
    const def = FISH_BY_ID[progress.s.fish];
    this.player = new Fish(getBody('male'), def);
    this.player.group.scale.setScalar(0.5);
    this.bubbleMat = bubbleMaterial();
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), this.bubbleMat);
    this.bubble.renderOrder = 5;
    this.holder = new THREE.Group(); this.holder.add(this.player.group, this.bubble); sc.add(this.holder);
    this.p = new THREE.Vector3(0, 2.25, 1.95); this.v = new THREE.Vector3(); this.yaw = Math.PI; this.pitch = 0; this.pushT = 0;
    if (via && DOCK_POS[via]) { this.p.copy(DOCK_POS[via]).add(new THREE.Vector3(0, 0, 0.9)); this.yaw = 0; }
    this.camYawOff = 0; this.camPitch = 0.25; this.camPos = new THREE.Vector3();
    this.dockT = 0; this.docking = null; this.leaving = false;
    // food bubbles
    this.food = [];
    const fm = bubbleMaterial();
    for (let i = 0; i < 24; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), fm); m.renderOrder = 5;
      const pos = new THREE.Vector3(X0 + 0.6 + Math.random() * (RW - 1.2), 0.5 + Math.random() * 2.2, Z0 + 0.8 + Math.random() * (RD - 1.6));
      const bite = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 1), new THREE.MeshStandardMaterial({ color: 0xa0622d, roughness: 0.6 }));
      m.add(bite); m.position.copy(pos); sc.add(m);
      this.food.push({ m, base: pos.clone(), ph: Math.random() * 6, alive: true });
    }
    this.catState = 'sleep'; this.catT = 0; this.catRest = 0;
    this.placeCamera(1);
    return this;
  }

  buildRoom() {
    const sc = this.scene;
    const floorT = texture('assets/tex/room-floor.jpg'), wallT = texture('assets/tex/room-wall.jpg');
    const fm = new THREE.MeshStandardMaterial({ color: floorT ? 0xffffff : 0xb07a4a, map: floorT, roughness: 0.7 });
    if (floorT) { floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(3, 2.5); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), fm); floor.rotation.x = -Math.PI / 2; sc.add(floor);
    const wm = new THREE.MeshStandardMaterial({ color: wallT ? 0xffffff : 0x4a9a98, map: wallT, roughness: 0.9, side: THREE.BackSide });
    if (wallT) { wallT.wrapS = wallT.wrapT = THREE.RepeatWrapping; wallT.repeat.set(3, 1.5); }
    const walls = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), [wm, wm, new THREE.MeshStandardMaterial({ color: 0xf2e8d8, side: THREE.BackSide }), fm, wm, wm]);
    walls.position.y = RH / 2; sc.add(walls);
    // window on the back wall
    const winT = texture('assets/bg/room-window.jpg');
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ color: winT ? 0xffffff : 0x203060, map: winT, fog: false }));
    win.position.set(-0.2, 2.15, Z0 + 0.01); sc.add(win);
    // shelves along the back wall with little tanks + docks
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.7 });
    for (const [x, y] of [[-2.3, 1.2], [2.3, 1.2], [0, 1.4]]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.5), wood); sh.position.set(x, y, Z0 + 0.25); sc.add(sh);
    }
    for (const [x, y, c] of [[-2.7, 0.5, 0x5fc6d0], [-1.9, 0.5, 0x8fd06a], [1.9, 0.5, 0x3a6ad0], [2.7, 0.5, 0xd08a5a]]) {
      const lowShelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.45), wood); lowShelf.position.set(x, y - 0.03, Z0 + 0.25); sc.add(lowShelf);
      const tk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.35), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.55, emissive: c, emissiveIntensity: 0.25 }));
      tk.position.set(x, y + 0.2, Z0 + 0.25); sc.add(tk);
    }
    // table + grand tank
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 1.1), wood); table.position.set(GT.x, GT.y - 0.04, GT.z); sc.add(table);
    for (const [dx, dz] of [[-1.05, -0.45], [1.05, -0.45], [-1.05, 0.45], [1.05, 0.45]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, GT.y - 0.08, 0.07), wood); leg.position.set(GT.x + dx, (GT.y - 0.08) / 2, GT.z + dz); sc.add(leg); }
    const gravel = texture('assets/tex/gravel.jpg');
    const gfloor = new THREE.Mesh(new THREE.BoxGeometry(GT.w, 0.08, GT.d), new THREE.MeshStandardMaterial({ map: gravel, color: gravel ? 0xffffff : 0xcdb894 })); gfloor.position.set(GT.x, GT.y + 0.04, GT.z); sc.add(gfloor);
    this.gtWater = new THREE.Mesh(new THREE.BoxGeometry(GT.w, GT.h * 0.92, GT.d), new THREE.MeshStandardMaterial({ color: 0x5fc6d0, transparent: true, opacity: 0.18, depthWrite: false, emissive: 0x2bb3c0, emissiveIntensity: 0.2 }));
    this.gtWater.position.set(GT.x, GT.y + GT.h * 0.46, GT.z); this.gtWater.renderOrder = 3; sc.add(this.gtWater);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(GT.w, GT.h, GT.d), rimMaterial(0xbff3ea, 0.6, 2.5, 0.02)); glass.position.set(GT.x, GT.y + GT.h / 2, GT.z); glass.renderOrder = 4; sc.add(glass);
    const p1 = modelMesh('prop-anubias', 0.35); if (p1) { p1.position.set(GT.x - 0.7, GT.y + 0.08, GT.z - 0.2); sc.add(p1); }
    const p2 = modelMesh('prop-cave', 0.3); if (p2) { p2.position.set(GT.x + 0.75, GT.y + 0.08, GT.z - 0.28); sc.add(p2); }
    this.gtLight = new THREE.PointLight(0x9af0ff, 0, 4); this.gtLight.position.set(GT.x, GT.y + GT.h + 0.3, GT.z); sc.add(this.gtLight);
    // grand tank fish
    this.gtFish = [];
    const coll = this.victory ? FISH.map(f => f.id) : progress.s.collected;
    coll.forEach((id, i) => {
      const f = new Fish(getBody('male'), FISH_BY_ID[id]);
      f.group.scale.setScalar(0.25);
      sc.add(f.group);
      this.gtFish.push({ f, a: i / Math.max(1, coll.length) * Math.PI * 2, r: 0.2 + (i % 3) * 0.08, y: 0.35 + (i % 4) * 0.13, sp: 0.4 + (i % 5) * 0.06 });
    });
    // armchair + cat
    const chair = modelMesh('armchair', 1.0);
    if (chair) { chair.position.set(2.3, 0, 1.7); chair.rotation.y = -2.3; sc.add(chair); }
    else { const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: 0xd8a83a })); c.position.set(2.3, 0.22, 1.7); sc.add(c); }
    const cat = modelMesh('cat', 0.75);
    this.cat = cat;
    if (cat) { cat.position.set(CAT.x, 0.45, CAT.z); cat.rotation.y = -2.3; sc.add(cat); }
    // paw (code)
    const paw = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.4, 4, 8), new THREE.MeshStandardMaterial({ color: 0xe8954a })); arm.rotation.z = Math.PI / 2; arm.position.x = 0.25; paw.add(arm);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffc8c0 })); pad.position.x = 0.5; paw.add(pad);
    paw.position.set(CAT.x - 0.1, 0.7, CAT.z - 0.1); paw.rotation.y = 2.3; paw.scale.setScalar(0.01); sc.add(paw);
    this.paw = paw;
    // lamp
    const lampM = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 })); pole.position.y = 0.9; lampM.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffc070, emissiveIntensity: 0.9, side: THREE.DoubleSide })); shade.position.y = 1.9; lampM.add(shade);
    lampM.position.set(-2.4, 0, 1.6); sc.add(lampM);
    // docks
    this.docks = [];
    for (const d of DOCKS) {
      const pos = DOCK_POS[d.id]; if (!pos) continue;
      const st = WORLD_STYLE[d.world];
      const unlocked = progress.s.docks.includes(d.id);
      const g = new THREE.Group(); g.position.copy(pos);
      const machine = modelMesh('bubble-machine', 0.55);
      if (machine) { machine.position.set(0, -0.62, -0.1); g.add(machine); }
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.45), wood); stand.position.set(0, -0.64, -0.1); g.add(stand);
      const ringMat = new THREE.MeshStandardMaterial({ color: st.rim === 0xff4fd8 ? 0xff4fd8 : (d.world === 'cw' ? 0x5fc6d0 : d.world === 'cp' ? 0xc8743a : 0xff4fd8), emissive: d.world === 'cw' ? 0x5fc6d0 : d.world === 'cp' ? 0xc8743a : 0xff4fd8, emissiveIntensity: unlocked ? 0.9 : 0.1 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 10, 40), ringMat); ring.position.z = 0.25; g.add(ring);
      if (!unlocked) {
        const lock = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.06), new THREE.MeshStandardMaterial({ color: 0xe8c040, metalness: 0.7, roughness: 0.3 }));
        const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 16, Math.PI), body.material); shackle.position.y = 0.07;
        lock.add(body, shackle); lock.position.z = 0.3; g.add(lock);
      }
      sc.add(g);
      this.docks.push({ d, g, ring, unlocked, center: pos.clone().add(new THREE.Vector3(0, 0, 0.25)) });
    }
  }

  exit() { this.player?.dispose(); this.gtFish?.forEach(f => f.f.dispose()); this.scene = null; }

  update(dt) {
    this.t += dt; this.bubbleMat.uniforms.uTime.value = this.t;
    const c = this.victory ? { fwd: 0, yawRate: 0.2, rise: 0, pitchT: 0 } : (this.leaving ? { fwd: 0, yawRate: 0, rise: 0 } : this.controls());
    this.yaw += c.yawRate * dt;
    if (c.pitchT != null) this.pitch += (THREE.MathUtils.clamp(c.pitchT, -1, 1) - this.pitch) * Math.min(1, dt * 3);
    else this.pitch += (c.rise * 0.4 - this.pitch) * Math.min(1, dt * 2);
    this.pushT = c.fwd > 0.5 ? this.pushT + dt : 0;
    const speed = (this.pushT > 1 ? 1.2 : 0.8) * c.fwd;
    const fx = Math.sin(this.yaw) * Math.cos(this.pitch), fz = Math.cos(this.yaw) * Math.cos(this.pitch), fy = Math.sin(this.pitch);
    tmp.set(fx * speed, fy * speed + c.rise * 0.6, fz * speed);
    this.v.lerp(tmp, Math.min(1, dt * 1.6));
    if (this.docking) { this.v.multiplyScalar(0.8); this.p.lerp(this.docking.center, Math.min(1, dt * 3)); }
    this.p.addScaledVector(this.v, dt);
    this.collide();
    this.holder.position.copy(this.p);
    this.player.group.rotation.set(-this.pitch, this.yaw, 0, 'YXZ');
    this.player.swim = 0.3 + this.v.length(); this.player.turn = -c.yawRate * 0.3; this.player.update(dt);
    this.bubble.rotation.y += dt * 0.3;
    // food
    for (const f of this.food) {
      if (!f.alive) continue;
      f.m.position.set(f.base.x + Math.sin(this.t * 0.5 + f.ph) * 0.1, f.base.y + Math.sin(this.t * 0.8 + f.ph) * 0.08, f.base.z);
      if (f.m.position.distanceTo(this.p) < R + 0.08 && !this.victory) {
        f.alive = false; f.m.visible = false;
        audio.sfx('nip', { semis: -3 }); audio.sfx('pop', { vol: 0.5 });
        this.fx.burst(f.m.position.x, f.m.position.y, f.m.position.z, 8, { shape: 'ring', color: 0xffffff, size: 0.06, speed: 0.4, life: 0.4 });
        progress.eat(1, 'room', { counts: true });
        this.ctx.biteBump();
      }
    }
    this.updateCat(dt);
    this.updateGrandTank(dt);
    this.updateDocks(dt);
    this.fx.update(dt);
    this.placeCamera(dt);
    this.ctx.setAction(this.victory ? null : this.currentAction());
    this.ctx.ui.roomUpdate(this);
  }

  controls() {
    const s = progress.s.settings, sens = s.sens || 1;
    let fwd = 0, yawRate = 0, rise = 0, pitchT = null;
    if (!input.enabled) return { fwd, yawRate, rise, pitchT };
    const touch = isTouch();
    if (input.pointer.down && !touch) {
      const nx = (input.pointer.x - innerWidth / 2) / (innerWidth / 2), ny = (input.pointer.y - innerHeight / 2) / (innerHeight / 2);
      const dz = (v) => Math.abs(v) < 0.08 ? 0 : (v - Math.sign(v) * 0.08) / 0.92;
      yawRate = -dz(nx) * 1.8 * sens; pitchT = -dz(ny) * 0.9 * (s.invert ? -1 : 1); fwd = 1;
    }
    if (input.held('KeyW', 'ArrowUp')) fwd = 1;
    if (input.held('KeyS', 'ArrowDown')) fwd = -0.6;
    if (input.held('KeyA', 'ArrowLeft')) yawRate = 1.6 * sens;
    if (input.held('KeyD', 'ArrowRight')) yawRate = -1.6 * sens;
    if (input.held('Space', 'KeyR') || input.rise) rise = 1;
    if (input.held('ShiftLeft', 'ShiftRight', 'KeyF') || input.dive) rise = -1;
    if (s.invert && (input.rise || input.dive)) rise = -rise;
    if (input.stick.active) {
      const sx = input.stick.x, sy = input.stick.y, mag = Math.min(1, Math.hypot(sx, sy));
      if (mag > 0.15) {
        const want = this.yaw + this.camYawOff + Math.atan2(-sx, sy);
        let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        yawRate = THREE.MathUtils.clamp(d * 3, -2.2, 2.2); fwd = mag * (Math.abs(d) > 2.4 ? 0.3 : 1);
        if (touch) pitchT = -(this.camPitch - 0.25) * 1.0;
      }
    }
    return { fwd, yawRate, rise, pitchT };
  }

  collide() {
    const p = this.p, v = this.v;
    const lim = (k, lo, hi) => { if (p[k] < lo) { p[k] = lo; v[k] = Math.abs(v[k]) * 0.4; } if (p[k] > hi) { p[k] = hi; v[k] = -Math.abs(v[k]) * 0.4; } };
    lim('x', X0 + R, X1 - R); lim('y', R + 0.02, RH - R - 0.05); lim('z', Z0 + R + 0.4, Z1 - R);
    // grand tank + table box
    const bx = { x0: GT.x - GT.w / 2 - 0.1, x1: GT.x + GT.w / 2 + 0.1, y1: GT.y + GT.h, z0: GT.z - GT.d / 2 - 0.1, z1: GT.z + GT.d / 2 + 0.1 };
    const cx = THREE.MathUtils.clamp(p.x, bx.x0, bx.x1), cy = THREE.MathUtils.clamp(p.y, 0, bx.y1), cz = THREE.MathUtils.clamp(p.z, bx.z0, bx.z1);
    tmp.set(p.x - cx, p.y - cy, p.z - cz); const d = tmp.length();
    if (d < R) { if (d < 1e-4) tmp.set(0, 1, 0); else tmp.divideScalar(d); p.addScaledVector(tmp, R - d + 0.001); v.addScaledVector(tmp, -1.3 * v.dot(tmp)); }
  }

  updateCat(dt) {
    if (!this.cat) return;
    this.catT += dt; this.catRest -= dt;
    const head = tmp2.copy(CAT).add(new THREE.Vector3(-0.2, 0.25, -0.2));
    const near = this.p.distanceTo(head) < 1.2;
    const breathe = 1 + Math.sin(this.t * 1.6) * 0.02;
    this.cat.scale.set(breathe, 1 / breathe, breathe);
    if (this.catState === 'sleep' && near && this.catRest <= 0 && !this.victory) { this.catState = 'flick'; this.catT = 0; audio.sfx('flick'); }
    if (this.catState === 'flick') {
      this.cat.rotation.z = Math.sin(this.catT * 30) * 0.02;
      if (this.catT > 0.6) { this.catState = 'swat'; this.catT = 0; audio.sfx('swat'); }
    }
    if (this.catState === 'swat') {
      const k = Math.sin(Math.min(1, this.catT / 0.5) * Math.PI);
      this.paw.scale.setScalar(Math.max(0.01, k * 1.8));
      const tip = new THREE.Vector3(1.0 * k, 0, 0).applyEuler(this.paw.rotation).add(this.paw.position);
      if (k > 0.5 && tip.distanceTo(this.p) < R + 0.3 && !this.swatHit) {
        this.swatHit = true;
        tmp.subVectors(this.p, CAT).setY(0.4).normalize(); this.v.addScaledVector(tmp, 3.2);
        const lost = progress.lose(5); this.ctx.biteBump(-lost); this.ctx.shake(0.12); audio.sfx('bonk');
        for (let i = 0; i < Math.ceil(lost / 2); i++) { const f = this.food.find(f => !f.alive); if (f) { f.alive = true; f.m.visible = true; f.base.copy(this.p).add(new THREE.Vector3((Math.random() - 0.5), Math.random() * 0.5, (Math.random() - 0.5))); f.base.y = THREE.MathUtils.clamp(f.base.y, 0.4, 2.5); } }
      }
      if (this.catT > 0.5) { this.catState = 'sleep'; this.catRest = 4; this.paw.scale.setScalar(0.01); this.swatHit = false; this.cat.rotation.z = 0; }
    }
  }

  updateGrandTank(dt) {
    const lit = this.victory ? 1 : 0.4;
    this.gtLight.intensity = lit * (this.victory ? 6 + Math.sin(this.t * 4) * 2 : 2);
    for (const g of this.gtFish) {
      g.a += g.sp * dt * (this.victory ? 1.8 : 1);
      const x = GT.x + Math.cos(g.a) * (0.55 + g.r), z = GT.z + Math.sin(g.a) * g.r * 0.6;
      const y = GT.y + 0.12 + g.y * 0.8 + Math.sin(g.a * 2) * 0.05;
      const f = g.f; f.group.position.set(x, y, z);
      f.group.rotation.set(0, Math.atan2(-Math.sin(g.a) * (0.55 + g.r), Math.cos(g.a) * g.r * 0.6) , 0);
      const dx = -Math.sin(g.a) * (0.55 + g.r), dz = Math.cos(g.a) * g.r * 0.6; f.group.rotation.y = Math.atan2(dx, dz);
      f.swim = 0.5; f.update(dt);
    }
    if (this.victory && Math.random() < dt * 30) this.fx.emit({ x: GT.x + (Math.random() - 0.5) * GT.w, y: GT.y + 0.1, z: GT.z + (Math.random() - 0.5) * GT.d, vy: 0.4, rise: 0.4, life: 2.5, size: 0.05 + Math.random() * 0.05, color: 0xffffff, alpha: 0.9, wobble: 0.3 });
  }

  updateDocks(dt) {
    let inRing = null;
    for (const k of this.docks) {
      k.ring.rotation.z = this.t * (k.unlocked ? 1 : 0.2);
      k.ring.material.emissiveIntensity = k.unlocked ? 0.7 + 0.3 * Math.sin(this.t * 3) : 0.1;
      if (k.center.distanceTo(this.p) < 0.4) inRing = k;
    }
    if (this.leaving) return;
    if (inRing && inRing.unlocked) { this.dockT += dt; if (this.dockT > 0.5) this.dock(inRing); }
    else this.dockT = 0;
  }
  dock(k) {
    if (this.leaving) return;
    this.leaving = true; this.docking = k;
    audio.sfx('dock'); audio.sfx('bloop');
    this.ctx.dock(k.d);
  }

  currentAction() {
    let best = null, bd = 1.2;
    for (const k of this.docks) { const d = k.center.distanceTo(this.p); if (d < bd) { bd = d; best = k; } }
    if (best && best.unlocked) return { id: 'dock:' + best.d.id, label: `Dock: to ${WORLD_STYLE[best.d.world].name}` };
    return null;
  }
  doAction(id) { if (id.startsWith('dock:')) { const k = this.docks.find(k => 'dock:' + k.d.id === id); if (k) this.dock(k); } }

  placeCamera(dt) {
    const look = input.takeLook(); const sens = (progress.s.settings.sens || 1) * 0.005;
    if (look.dx || look.dy) { this.camYawOff -= look.dx * sens; this.camPitch = THREE.MathUtils.clamp(this.camPitch + look.dy * sens, -0.5, 1.0); }
    if (!input.look.active && input.touchLook.id === null && (performance.now() - input.look.lastAt) / 1000 > 1.5) {
      this.camYawOff += (0 - this.camYawOff) * Math.min(1, dt * 1.5);
      if (!isTouch()) this.camPitch += (0.25 - this.camPitch) * Math.min(1, dt);
    }
    let want;
    if (this.victory) { const a = this.t * 0.25; want = new THREE.Vector3(GT.x + Math.sin(a) * 2.2, GT.y + 1.0, GT.z + Math.cos(a) * 2.2); }
    else {
      const cy = this.yaw + this.camYawOff + Math.PI + 0.45;
      want = tmp.set(Math.sin(cy) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(cy) * Math.cos(this.camPitch)).multiplyScalar(1.6).add(this.p).clone();
      want.x = THREE.MathUtils.clamp(want.x, X0 + 0.15, X1 - 0.15); want.y = THREE.MathUtils.clamp(want.y, 0.15, RH - 0.15); want.z = THREE.MathUtils.clamp(want.z, Z0 + 0.15, Z1 - 0.15);
    }
    if (dt >= 1) this.camPos.copy(want); else this.camPos.lerp(want, Math.min(1, dt * 5));
    const sh = this.ctx.shakeAmt || 0;
    this.camera.position.copy(this.camPos).add(new THREE.Vector3((Math.random() - 0.5) * sh * 0.3, (Math.random() - 0.5) * sh * 0.3, 0));
    this.camera.lookAt(this.victory ? new THREE.Vector3(GT.x, GT.y + 0.5, GT.z) : this.p);
  }

  dockScreen() {
    return this.docks.map(k => { const v = k.center.clone().add(new THREE.Vector3(0, 0.7, 0)).project(this.camera); return { id: k.d.id, world: k.d.world, unlocked: k.unlocked, x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, on: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1, dist: k.center.distanceTo(this.p) }; });
  }
  render(r) { r.render(this.scene, this.camera); }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  debug() { return { p: this.p.toArray().map(v => +v.toFixed(2)), docks: this.docks.map(k => ({ id: k.d.id, unlocked: k.unlocked, center: k.center.toArray() })), food: this.food.filter(f => f.alive).length, cat: this.catState }; }
  teleportTo(v) { this.p.set(...v); this.v.set(0, 0, 0); }
}
