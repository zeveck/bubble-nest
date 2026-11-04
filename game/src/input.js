// Turns keyboard, mouse and touch into game actions.
export const isTouch = () => matchMedia('(pointer: coarse)').matches || input.touchSeen;

const DIR_KEYS = {
  ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D', ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R',
};
const PREVENT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

export const input = {
  keys: new Set(),
  pressed: new Set(),        // codes pressed since last clearPressed()
  dirQueue: null,            // latest direction press (pipes)
  pointer: { x: 0, y: 0, down: false, right: false },
  look: { dx: 0, dy: 0, active: false, lastAt: -10 },
  stick: { active: false, id: null, cx: 0, cy: 0, x: 0, y: 0 },
  touchLook: { id: null, x: 0, y: 0 },
  swipe: { id: null, x: 0, y: 0 },
  rise: false, dive: false,
  press: null, tapAt: null, mode: 'title',
  touchSeen: false,
  enabled: true,
  canvas: null,
  stickEl: null, knobEl: null,
  anyInput: false,
  onFirstInput: null,
  stickZone: 130,

  init(canvas) {
    this.canvas = canvas;
    const first = () => { if (!this.anyInput) { this.anyInput = true; this.onFirstInput?.(); } };
    addEventListener('keydown', (e) => {
      first();
      if (PREVENT.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code); this.pressed.add(e.code);
      if (this.enabled && DIR_KEYS[e.code]) this.dirQueue = DIR_KEYS[e.code];
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => this.clear());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      first();
      if (e.pointerType === 'touch') { this.touchSeen = true; this._touchStart(e); return; }
      canvas.setPointerCapture?.(e.pointerId);
      this.pointer.x = e.clientX; this.pointer.y = e.clientY;
      if (e.button === 0) { this.pointer.down = true; this.press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), mode: 'pending', touch: false }; }
      if (e.button === 1 || e.button === 2) { this.pointer.right = true; this.look.active = true; }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') { this._touchMove(e); return; }
      if (this.pointer.right) { this.look.dx += e.clientX - this.pointer.x; this.look.dy += e.clientY - this.pointer.y; this.look.lastAt = performance.now(); }
      this.pointer.x = e.clientX; this.pointer.y = e.clientY;
      const pr = this.press;
      if (pr && pr.id === e.pointerId) { pr.x = e.clientX; pr.y = e.clientY; if (pr.mode === 'pending' && Math.hypot(pr.x - pr.x0, pr.y - pr.y0) > 6) pr.mode = 'hold'; }
    });
    const up = (e) => {
      if (e.pointerType === 'touch') { this._touchEnd(e); return; }
      if (e.button === 0) { this.pointer.down = false; this._release(e.pointerId); }
      if (e.button === 1 || e.button === 2) { this.pointer.right = false; this.look.active = false; this.look.lastAt = performance.now(); }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.style.touchAction = 'none';
    // stick visual
    const st = document.createElement('div'); st.className = 'stick'; st.innerHTML = '<div class="knob"></div>';
    document.body.appendChild(st); this.stickEl = st; this.knobEl = st.firstChild;
  },

  _touchStart(e) {
    const x = e.clientX, y = e.clientY, h = innerHeight;
    this.canvas.setPointerCapture?.(e.pointerId);
    if (!this.stick.active && x < this.stickZone + 40 && y > h - this.stickZone - 60 && this.mode !== 'pipe-swipe-only') {
      Object.assign(this.stick, { active: true, id: e.pointerId, cx: x, cy: y, x: 0, y: 0 });
      this._drawStick();
      return;
    }
    if (!this.press) this.press = { id: e.pointerId, x0: x, y0: y, x, y, t0: performance.now(), mode: 'pending', touch: true };
    if (this.swipe.id === null) Object.assign(this.swipe, { id: e.pointerId, x, y });
  },
  _touchMove(e) {
    const x = e.clientX, y = e.clientY;
    if (e.pointerId === this.stick.id) {
      const R = 56;
      let dx = (x - this.stick.cx) / R, dy = (y - this.stick.cy) / R;
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      this.stick.x = dx; this.stick.y = -dy;
      if (l > 0.45 && this.enabled) {
        this.stickDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      } else this.stickDir = null;
      this._drawStick();
      return;
    }
    const pr = this.press;
    if (pr && pr.id === e.pointerId) {
      if (pr.mode === 'pending' && Math.hypot(x - pr.x0, y - pr.y0) > 12) { pr.mode = 'look'; this.touchLook.id = pr.id; this.touchLook.x = x; this.touchLook.y = y; }
      if (pr.mode === 'look') { this.look.dx += x - this.touchLook.x; this.look.dy += y - this.touchLook.y; this.look.lastAt = performance.now(); this.touchLook.x = x; this.touchLook.y = y; }
      pr.x = x; pr.y = y;
    }
    if (e.pointerId === this.swipe.id) {
      const dx = x - this.swipe.x, dy = y - this.swipe.y;
      if (Math.hypot(dx, dy) >= 24) {
        if (this.enabled) this.dirQueue = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
        this.swipe.x = x; this.swipe.y = y;
      }
    }
  },
  _touchEnd(e) {
    if (e.pointerId === this.stick.id) { Object.assign(this.stick, { active: false, id: null, x: 0, y: 0 }); this.stickDir = null; this._drawStick(); }
    if (e.pointerId === this.touchLook.id) { this.touchLook.id = null; this.look.lastAt = performance.now(); }
    this._release(e.pointerId);
    if (e.pointerId === this.swipe.id) this.swipe.id = null;
  },
  _drawStick() {
    const s = this.stick, el = this.stickEl;
    if (!s.active) { el.classList.remove('on'); return; }
    el.classList.add('on');
    el.style.left = (s.cx - 60) + 'px'; el.style.top = (s.cy - 60) + 'px';
    this.knobEl.style.transform = `translate(${s.x * 44}px, ${-s.y * 44}px)`;
  },

  _release(id) {
    const pr = this.press;
    if (!pr || pr.id !== id) return;
    if (pr.mode === 'pending' && this.enabled) this.tapAt = { x: pr.x, y: pr.y };
    this.press = null;
  },
  tick() { // promote a still press to a hold after 200 ms
    const pr = this.press;
    if (pr && pr.mode === 'pending' && performance.now() - pr.t0 > 200) pr.mode = 'hold';
  },
  takeTap() { const t = this.tapAt; this.tapAt = null; return t; },
  holding() { return this.press && this.press.mode === 'hold' ? this.press : null; },
  held(...codes) { return codes.some(c => this.keys.has(c)); },
  wasPressed(...codes) { return codes.some(c => this.pressed.has(c)); },
  clearPressed() { this.pressed.clear(); },
  takeLook() { const l = { dx: this.look.dx, dy: this.look.dy }; this.look.dx = 0; this.look.dy = 0; return l; },
  heldDir() {
    for (const [code, d] of Object.entries(DIR_KEYS)) if (this.keys.has(code)) return d;
    return this.stickDir || null;
  },
  takeDir() { const d = this.dirQueue; this.dirQueue = null; return d; },
  clear() {
    this.keys.clear(); this.pressed.clear(); this.dirQueue = null;
    this.pointer.down = false; this.pointer.right = false; this.look.active = false;
    this.look.dx = 0; this.look.dy = 0;
    Object.assign(this.stick, { active: false, id: null, x: 0, y: 0 }); this.stickDir = null;
    this.touchLook.id = null; this.swipe.id = null; this.rise = false; this.dive = false;
    this.press = null; this.tapAt = null;
    if (this.stickEl) this._drawStick();
  },
};
