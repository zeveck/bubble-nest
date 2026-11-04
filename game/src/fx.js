// Pooled particles (bubbles, puffs, sparkles, hearts, stars) as one Points draw per scene.
import * as THREE from 'three';

const SHAPES = { bubble: 0, dot: 1, spark: 2, heart: 3, star: 4, ring: 5 };

const VERT = `
attribute float aSize; attribute vec4 aColor; attribute float aShape;
varying vec4 vColor; varying float vShape;
uniform float uScale;
void main(){
  vColor = aColor; vShape = aShape;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying vec4 vColor; varying float vShape;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y;
  float r = length(p); float a = 0.0;
  if (vShape < 0.5) {            // bubble: rim + highlight
    a = smoothstep(1.0, 0.85, r) * (0.25 + 0.75 * smoothstep(0.55, 0.95, r));
    a += smoothstep(0.3, 0.0, length(p - vec2(-0.35, 0.35))) * 0.9;
  } else if (vShape < 1.5) {     // soft dot
    a = smoothstep(1.0, 0.2, r);
  } else if (vShape < 2.5) {     // sparkle (4-point)
    float s = max(smoothstep(0.25, 0.0, abs(p.x)) * smoothstep(1.0, 0.0, abs(p.y)), smoothstep(0.25, 0.0, abs(p.y)) * smoothstep(1.0, 0.0, abs(p.x)));
    a = s + smoothstep(0.4, 0.0, r);
  } else if (vShape < 3.5) {     // heart
    vec2 q = p * 1.15; q.y += 0.25;
    float h = q.x*q.x + pow(q.y - pow(abs(q.x), 0.66), 2.0);
    a = smoothstep(0.62, 0.5, h);
  } else if (vShape < 4.5) {     // star
    float ang = atan(p.y, p.x); float k = 0.55 + 0.45 * cos(ang * 5.0 - 1.57);
    a = smoothstep(k * 0.95, k * 0.8, r);
  } else {                        // ring
    a = smoothstep(0.12, 0.0, abs(r - 0.75));
  }
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

export class FX {
  constructor(scene, max = 600, scale = 300) {
    this.max = max;
    this.p = []; // particles
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.col = new Float32Array(max * 4); this.shape = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aShape', new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { uScale: { value: scale } }, transparent: true, depthWrite: false });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.geo = g;
    scene.add(this.points);
  }
  emit(o) {
    if (this.p.length >= this.max) this.p.shift();
    const c = new THREE.Color(o.color ?? 0xffffff);
    this.p.push({
      x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      life: o.life || 1, t: 0, size: o.size || 0.2, grow: o.grow ?? 0,
      r: c.r, g: c.g, b: c.b, a: o.alpha ?? 1, shape: SHAPES[o.shape || 'bubble'] ?? 0,
      drag: o.drag ?? 0.5, rise: o.rise ?? 0, wobble: o.wobble ?? 0, phase: Math.random() * 6.28,
    });
  }
  burst(x, y, z, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI, sp = (o.speed ?? 1) * (0.4 + Math.random() * 0.8);
      this.emit({ ...o, x, y, z, vx: Math.cos(a) * Math.cos(b) * sp, vy: Math.sin(b) * sp + (o.up || 0), vz: Math.sin(a) * Math.cos(b) * sp * (o.flat ? 0.1 : 1), life: (o.life || 0.6) * (0.7 + Math.random() * 0.6), size: (o.size || 0.15) * (0.6 + Math.random() * 0.8) });
    }
  }
  update(dt) {
    const P = this.p;
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i]; q.t += dt;
      if (q.t >= q.life) { P.splice(i, 1); continue; }
      const d = Math.exp(-q.drag * dt);
      q.vx *= d; q.vy = q.vy * d + q.rise * dt; q.vz *= d;
      q.x += q.vx * dt + (q.wobble ? Math.sin(q.t * 6 + q.phase) * q.wobble * dt : 0); q.y += q.vy * dt; q.z += q.vz * dt;
    }
    const n = P.length;
    for (let i = 0; i < n; i++) {
      const q = P[i], k = q.t / q.life;
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.size[i] = q.size * (1 + q.grow * k);
      const fade = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      this.col[i * 4] = q.r; this.col[i * 4 + 1] = q.g; this.col[i * 4 + 2] = q.b; this.col[i * 4 + 3] = q.a * fade;
      this.shape[i] = q.shape;
    }
    this.geo.setDrawRange(0, n);
    for (const k of ['position', 'aSize', 'aColor', 'aShape']) this.geo.attributes[k].needsUpdate = true;
  }
  clear() { this.p.length = 0; this.geo.setDrawRange(0, 0); }
}

export function trailShape(trail) {
  return { hearts: 'heart', stars: 'star', rings: 'ring', sparkles: 'spark', glow: 'dot', rainbow: 'bubble' }[trail] || 'bubble';
}
