// Bettas: a Meshy body (baked, recoloured in a shader) + code-built fins,
// gill covers and beard (one merged geometry per fin style) + code eyes.
// Fish space: head toward +Z, body length BODY_LEN, nose at +BODY_LEN/2.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const BODY_LEN = 0.6;
const NOSE_Z = BODY_LEN / 2;

// ---------- shared GLSL ----------
const NOISE_GLSL = /* glsl */`
float fh(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float fnoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(fh(i+vec3(0,0,0)),fh(i+vec3(1,0,0)),f.x), mix(fh(i+vec3(0,1,0)),fh(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(fh(i+vec3(0,0,1)),fh(i+vec3(1,0,1)),f.x), mix(fh(i+vec3(0,1,1)),fh(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm3(vec3 p){ return 0.55*fnoise(p) + 0.3*fnoise(p*2.03+7.1) + 0.15*fnoise(p*4.1+3.3); }
`;
const WAVE_GLSL = /* glsl */`
uniform float uPhase; uniform float uSwim; uniform float uTurn;
vec3 fishWave(vec3 p, float along){
  float a = clamp(along, 0.0, 1.8);
  float amp = (0.012 + 0.03*uSwim) * (0.12 + pow(a, 1.7));
  p.x += amp * sin(uPhase - a*4.2) + uTurn * 0.08 * a * a;
  return p;
}
`;
const COLOR_UNIFORMS_GLSL = /* glsl */`
uniform vec3 uBodyA; uniform vec3 uBodyB; uniform vec3 uFinA; uniform vec3 uFinB;
uniform vec3 uAccent; uniform vec3 uSheen; uniform int uPattern; uniform float uSeed;
uniform vec3 uTint; uniform float uTintAmt;
`;

function colorUniforms(def) {
  const c = (h) => new THREE.Color(h);
  return {
    uBodyA: { value: c(def.bodyA) }, uBodyB: { value: c(def.bodyB) },
    uFinA: { value: c(def.finA) }, uFinB: { value: c(def.finB) },
    uAccent: { value: c(def.accent) }, uSheen: { value: c(def.sheen) },
    uPattern: { value: def.pattern | 0 }, uSeed: { value: (def.seed ?? 0.37) },
    uTint: { value: new THREE.Color(1, 1, 1) }, uTintAmt: { value: 0 },
  };
}

// ---------- body ----------
const loader = new GLTFLoader();
const bodyCache = {};

export async function loadBody(kind, url) {
  let gltf;
  for (let i = 0; i < 4 && !gltf; i++) { try { gltf = await loader.loadAsync(url); } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 600 * (i + 1))); } }
  gltf.scene.updateMatrixWorld(true);
  let mesh = null;
  gltf.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
  const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const len = bb.max.z - bb.min.z;
  const s = BODY_LEN / len;
  const cx = (bb.max.x + bb.min.x) / 2, cy = (bb.max.y + bb.min.y) / 2, cz = (bb.max.z + bb.min.z) / 2;
  g.translate(-cx, -cy, -cz);
  g.scale(s, s, s);
  g.computeBoundingBox();
  // profile: top/bottom/half-width per bin along the body
  const N = 40, top = new Array(N).fill(-1), bot = new Array(N).fill(1), half = new Array(N).fill(0), midY = new Array(N).fill(0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const along = (NOSE_Z - p.getZ(i)) / BODY_LEN;
    const b = Math.min(N - 1, Math.max(0, Math.floor(along * N)));
    top[b] = Math.max(top[b], p.getY(i));
    bot[b] = Math.min(bot[b], p.getY(i));
    half[b] = Math.max(half[b], Math.abs(p.getX(i)));
  }
  for (let b = 0; b < N; b++) midY[b] = (top[b] + bot[b]) / 2;
  const map = mesh.material.map;
  if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; }
  const prof = (along, arr) => {
    const f = Math.min(N - 1.001, Math.max(0, along * N - 0.5));
    const i = Math.floor(f), t = f - i;
    return arr[i] * (1 - t) + arr[Math.min(N - 1, i + 1)] * t;
  };
  g.userData.keep = true;
  const body = {
    kind, geometry: g, map,
    top: a => prof(a, top), bot: a => prof(a, bot), half: a => prof(a, half), mid: a => prof(a, midY),
    finGeoms: {},
  };
  bodyCache[kind] = body;
  return body;
}

function makeBodyMaterial(body, U) {
  const m = new THREE.MeshStandardMaterial({ map: body.map, roughness: 0.38, metalness: 0.05 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying float vAlong; varying vec3 vFishPos;\n' + WAVE_GLSL + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vAlong = (${NOSE_Z.toFixed(4)} - position.z) / ${BODY_LEN.toFixed(4)};
       vFishPos = position;
       transformed = fishWave(transformed, vAlong);`);
    sh.fragmentShader = 'varying float vAlong; varying vec3 vFishPos;\n' + COLOR_UNIFORMS_GLSL + NOISE_GLSL + sh.fragmentShader
      .replace('#include <map_fragment>', `
        vec4 texel = texture2D(map, vMapUv);
        float lum = clamp(dot(texel.rgb, vec3(0.299,0.587,0.114)), 0.35, 1.0);
        vec3 base = mix(uBodyA, uBodyB, smoothstep(0.1, 0.95, vAlong));
        vec3 P = vFishPos * 10.0 + uSeed * 13.0;
        if (uPattern == 1) { float n = fbm3(P*1.3); base = mix(base, uAccent, smoothstep(0.52, 0.6, n)); base = mix(base, uFinB, smoothstep(0.62,0.7,fbm3(P*1.1+4.0))*0.8); }
        else if (uPattern == 3) { float n = fbm3(P*0.9); base = mix(base, uAccent, smoothstep(0.5, 0.56, n)); base = mix(base, vec3(0.06), smoothstep(0.7,0.74,fbm3(P*1.4+9.0))); }
        else if (uPattern == 4) { base *= 1.15; }
        float detail = 0.5 + 0.62 * lum;
        if (uPattern == 4) detail = 0.3 + 0.95 * lum;
        diffuseColor.rgb *= base * detail;
        diffuseColor.rgb = mix(diffuseColor.rgb, uTint, uTintAmt);
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float fr = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.5);
        totalEmissiveRadiance += uSheen * (fr * 0.18 + (uPattern == 4 ? 0.05 : 0.0));
      `);
  };
  m.customProgramCacheKey = () => 'betta-body';
  return m;
}

// ---------- fin styles ----------
// Each part: base line (fish space) sampled by u in [0,1], outward ray dir(u), length len(u).
// part ids: 0 caudal, 1 dorsal, 2 anal, 3 ventral, 4 pectoral, 5 gill, 6 beard
const STYLES = {
  halfmoon:   { caudal: { spread: 2.7, len: 0.37, droop: 0.0 }, dorsal: [0.40, 0.84, 0.15, 0.26, 0.15, 0.9], anal: [0.33, 0.93, 0.14, 0.28, 0.25, 0.9], ventral: 0.22, edge: 1, rays: 26 },
  veiltail:   { caudal: { spread: 1.7, len: 0.48, droop: 0.9 }, dorsal: [0.40, 0.84, 0.14, 0.26, 0.4, 1.4], anal: [0.33, 0.93, 0.14, 0.28, 0.5, 1.3], ventral: 0.24, edge: 0, rays: 18 },
  crowntail:  { caudal: { spread: 2.6, len: 0.42, droop: 0.0 }, dorsal: [0.40, 0.84, 0.15, 0.26, 0.15, 0.9], anal: [0.33, 0.93, 0.14, 0.28, 0.25, 0.9], ventral: 0.22, edge: 2, rays: 14 },
  plakat:     { caudal: { spread: 1.7, len: 0.2, droop: 0.0 }, dorsal: [0.45, 0.80, 0.08, 0.10, 0.4, 0.9], anal: [0.36, 0.90, 0.07, 0.11, 0.4, 0.9], ventral: 0.13, edge: 0, rays: 14 },
  doubletail: { caudal: { spread: 2.8, len: 0.38, droop: 0.0 }, dorsal: [0.30, 0.86, 0.16, 0.26, 0.15, 0.9], anal: [0.33, 0.93, 0.14, 0.28, 0.25, 0.9], ventral: 0.22, edge: 3, rays: 24 },
  female:     { caudal: { spread: 1.9, len: 0.24, droop: 0.0 }, dorsal: [0.44, 0.80, 0.09, 0.11, 0.4, 0.9], anal: [0.38, 0.90, 0.08, 0.11, 0.35, 0.9], ventral: 0.12, edge: 0, rays: 14 },
};
export const FIN_STYLES = Object.keys(STYLES);
const EDGE_IDS = {}; // style -> edge kind

const zAt = a => NOSE_Z - a * BODY_LEN;

function buildPart(nu, nv, partId, side, fn) {
  // fn(u) -> { base: Vector3, dir: Vector3 (unit), len, nrm hint }
  const pos = [], fin = [], basev = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      const r = fn(u);
      const P = r.base.clone().addScaledVector(r.dir, r.len * v);
      if (r.bend) P.addScaledVector(r.bend, r.len * v * v * 0.5);
      pos.push(P.x, P.y, P.z);
      fin.push(u, v, partId, side);
      basev.push(r.base.x, r.base.y, r.base.z);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aFin', new THREE.Float32BufferAttribute(fin, 4));
  g.setAttribute('aBase', new THREE.Float32BufferAttribute(basev, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildFins(body, styleName) {
  const S = STYLES[styleName];
  const parts = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  // caudal: fan from a short vertical base at the tail stub
  {
    const a0 = 0.955;
    const t = body.top(a0 - 0.03), b = body.bot(a0 - 0.03), m = (t + b) / 2;
    const h = Math.max(0.02, (t - b) * 0.75);
    const C = S.caudal;
    parts.push(buildPart(28, 8, 0, 0, (u) => {
      const th = (u - 0.5) * C.spread - C.droop * 0.5;
      const dir = V(0, Math.sin(th), -Math.cos(th)).normalize();
      let len = C.len * (0.92 + 0.08 * Math.cos((u - 0.5) * Math.PI));
      if (styleName === 'veiltail') len *= 0.75 + 0.5 * (1 - u);
      return { base: V(0, m + (u - 0.5) * h, zAt(a0)), dir, len };
    }));
  }
  // dorsal: base along the back, rays sweep up and back
  {
    const [a0, a1, l0, l1, k0, k1] = S.dorsal;
    parts.push(buildPart(14, 6, 1, 0, (u) => {
      const a = a0 + (a1 - a0) * u;
      const base = V(0, body.top(a) - 0.006, zAt(a));
      const k = k0 + (k1 - k0) * u;
      const dir = V(0, 1, -k).normalize();
      return { base, dir, len: l0 + (l1 - l0) * Math.sin(Math.min(1, u * 1.15) * Math.PI / 2), bend: V(0, -0.1, -0.3) };
    }));
  }
  // anal: along the belly, rays down and back
  {
    const [a0, a1, l0, l1, k0, k1] = S.anal;
    parts.push(buildPart(16, 6, 2, 0, (u) => {
      const a = a0 + (a1 - a0) * u;
      const base = V(0, body.bot(a) + 0.006, zAt(a));
      const k = k0 + (k1 - k0) * u;
      const dir = V(0, -1, -k).normalize();
      return { base, dir, len: l0 + (l1 - l0) * Math.pow(u, 0.7), bend: V(0, 0.1, -0.3) };
    }));
  }
  // ventrals (pair)
  for (const side of [-1, 1]) {
    const a = 0.27;
    parts.push(buildPart(3, 6, 3, side, (u) => {
      const base = V(side * 0.012, body.bot(a) + 0.008, zAt(a + u * 0.03));
      const dir = V(side * 0.25, -1, -0.9).normalize();
      return { base, dir, len: S.ventral * (1 - u * 0.5), bend: V(0, 0.2, -0.6) };
    }));
  }
  // pectorals (pair): small round fans on the sides behind the gills
  for (const side of [-1, 1]) {
    const a = 0.27;
    const y = body.mid(a) - (body.top(a) - body.bot(a)) * 0.12;
    parts.push(buildPart(8, 4, 4, side, (u) => {
      const base = V(side * body.half(a) * 0.92, y + (u - 0.5) * 0.03, zAt(a));
      const th = (u - 0.5) * 1.3;
      const dir = V(side * 0.55, Math.sin(th), -0.85).normalize();
      return { base, dir, len: 0.075 };
    }));
  }
  // gill covers (pair): hinged at their front edge, swing out on flare
  for (const side of [-1, 1]) {
    const a = 0.2;
    const t = body.top(a), b = body.bot(a);
    parts.push(buildPart(6, 3, 5, side, (u) => {
      const y = b + (t - b) * (0.2 + 0.6 * u);
      const base = V(side * body.half(a) * 0.98, y, zAt(a));
      const dir = V(side * 0.15, (u - 0.5) * 0.3, -1).normalize();
      return { base, dir, len: 0.05 + 0.02 * Math.sin(u * Math.PI) };
    }));
  }
  // beard: a ruffle under the gills
  {
    const a = 0.2;
    parts.push(buildPart(10, 3, 6, 0, (u) => {
      const ang = (u - 0.5) * 2.4;
      const base = V(Math.sin(ang) * body.half(a) * 0.8, body.bot(a) + 0.012, zAt(a) - Math.cos(ang) * 0.004);
      const dir = V(Math.sin(ang) * 0.6, -1, -0.5).normalize();
      return { base, dir, len: 0.045 };
    }));
  }
  const g = mergeGeometries(parts, false);
  g.userData.keep = true;
  g.userData.edge = S.edge; g.userData.rays = S.rays;
  return g;
}

function finGeometry(body, style) {
  if (!body.finGeoms[style]) body.finGeoms[style] = buildFins(body, style);
  return body.finGeoms[style];
}

const FIN_VERT = /* glsl */`
attribute vec4 aFin; attribute vec3 aBase;
uniform float uFlare; uniform float uFinScale;
varying vec4 vFin; varying vec3 vN; varying vec3 vFishPos; varying vec3 vView;
#include <fog_pars_vertex>
${WAVE_GLSL}
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
void main(){
  vFin = aFin;
  float part = aFin.z; float side = aFin.w; float v = aFin.y;
  vec3 rel = position - aBase;
  vec3 n = normal;
  if (part > 4.5 && part < 5.5) {          // gill cover: swing out about its front edge
    mat3 R = rotY(side * (0.1 + 0.75 * uFlare)); rel = R * rel; n = R * n;
  } else if (part > 5.5) {                 // beard: tucked unless flaring
    rel *= mix(0.35, 1.15, uFlare);
  } else {
    float sc = uFinScale * (1.0 + 0.22 * uFlare);
    rel *= sc;
    if (part > 2.5 && part < 4.5) {        // ventral/pectoral paddle
      float flap = sin(uPhase * 0.9 + side * 1.3) * (0.25 + 0.3 * uSwim);
      if (part > 3.5) flap = sin(uPhase * 1.6 + side * 2.0) * 0.45 + side * 0.15;
      mat3 R = rotY(side * flap * 0.6); rel = R * rel; n = R * n;
    }
  }
  vec3 p = aBase + rel;
  // flutter along the membrane
  float fl = sin(uPhase * 0.7 - v * 4.0 + aFin.x * 5.0) * v * v * (0.012 + 0.018 * uSwim);
  if (part < 2.5) fl += sin(aFin.x * 23.0 + v * 2.0) * v * v * 0.018;
  p += n * fl;
  float along = (${NOSE_Z.toFixed(4)} - p.z) / ${BODY_LEN.toFixed(4)};
  p = fishWave(p, along);
  vFishPos = position;
  vN = normalize(normalMatrix * n);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  vView = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;
const FIN_FRAG = /* glsl */`
${COLOR_UNIFORMS_GLSL}
uniform int uEdge; uniform float uRays; uniform float uFlareF; uniform float uOpacity; uniform vec3 uLightDir;
varying vec4 vFin; varying vec3 vN; varying vec3 vFishPos; varying vec3 vView;
#include <fog_pars_fragment>
${NOISE_GLSL}
void main(){
  float u = vFin.x, v = vFin.y, part = vFin.z;
  float rays = (part < 0.5) ? uRays : (part < 2.5 ? uRays * 0.6 : 6.0);
  float rp = abs(fract(u * rays) - 0.5) * 2.0;     // 0 on a ray, 1 between rays
  float limit = 1.0;
  if (part < 2.5) {
    if (uEdge == 1) limit = 1.0 - 0.018 * rp;                 // halfmoon: soft scallop
    else if (uEdge == 2) limit = mix(1.0, 0.58, smoothstep(0.08, 0.35, rp));  // crowntail spikes
    else if (uEdge == 3 && part < 0.5) limit = mix(1.0, 0.25, smoothstep(0.17, 0.0, abs(u - 0.5)));  // doubletail split
    else limit = 1.0 - 0.05 * (1.0 - rp);
  }
  if (part > 2.5 && part < 3.5) limit = 1.0 - 0.5 * abs(u - 0.5) * 2.0 * v;
  if (part > 4.5 && part < 5.5) limit = 1.0 - 0.6 * pow(abs(u - 0.5) * 2.0, 2.0);
  if (part > 3.5 && part < 4.5) limit = 1.0 - 0.45 * pow(abs(u - 0.5) * 2.0, 2.0);
  if (part > 1.5 && part < 2.5) limit = min(limit, 1.0 - 0.35 * smoothstep(0.75, 1.0, u) * smoothstep(0.3, 1.0, v));
  if (part > 0.5 && part < 1.5) limit = min(limit, 1.0 - 0.55 * smoothstep(0.55, 1.0, u) * smoothstep(0.2, 1.0, v) - 0.25 * smoothstep(0.25, 0.0, u));
  if (part > 4.5 && uFlareF < 0.04) discard;
  float edgeA = smoothstep(limit, limit - 0.05, v);
  if (edgeA < 0.01) discard;

  vec3 col = mix(uFinA, uFinB, smoothstep(0.0, 1.0, v));
  vec3 P = vFishPos * 10.0 + uSeed * 13.0;
  if (uPattern == 2) col = mix(col, uAccent, smoothstep(0.52, 0.58, v) * (1.0 - smoothstep(0.78, 0.84, v)));
  else if (uPattern == 5) col = mix(col, uAccent, smoothstep(limit - 0.2, limit - 0.08, v));
  else if (uPattern == 1) col = mix(col, uAccent, smoothstep(0.55, 0.62, fbm3(P * 1.2)));
  else if (uPattern == 3) { col = mix(col, uAccent, smoothstep(0.5, 0.56, fbm3(P * 0.8))); col = mix(col, vec3(0.06), smoothstep(0.72,0.76,fbm3(P*1.3+9.0))); }
  else if (uPattern == 4) col = mix(col, uAccent, smoothstep(0.75, 1.0, v) * 0.5);
  if (part > 4.5 && part < 5.5) col = mix(uBodyA, uFinA, 0.3);
  if (part > 3.5 && part < 4.5) col = mix(uFinA, uBodyA, 0.5) * 1.1;            // gill cover
  if (part > 5.5) col = uFinB * 0.35;                                           // beard: dark
  // rays and membrane shading
  float ray = 1.0 - smoothstep(0.0, 0.22, rp);
  col *= 0.82 + 0.28 * ray;
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vView);
  float lam = abs(dot(N, normalize(uLightDir)));
  float fr = pow(1.0 - abs(dot(N, V)), 2.0);
  vec3 lit = col * (0.7 + 0.35 * lam) + uSheen * fr * 0.15 + col * 0.25 * (1.0 - v);
  lit = mix(lit, uTint, uTintAmt);
  float a = uOpacity * mix(1.0, 0.8, v * v) * edgeA;
  if (part > 4.5) a = edgeA * smoothstep(0.04, 0.3, uFlareF);
  if (part > 3.5 && part < 4.5) a *= 0.7;
  gl_FragColor = vec4(lit, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function makeFinMaterial(geo, U) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]),
    vertexShader: FIN_VERT, fragmentShader: FIN_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true,
  });
  Object.assign(m.uniforms, U, {
    uFlareF: U.uFlare, uEdge: { value: geo.userData.edge }, uRays: { value: geo.userData.rays },
    uOpacity: { value: 0.9 }, uLightDir: { value: new THREE.Vector3(0.3, 1, 0.5).normalize() },
  });
  return m;
}

// ---------- eyes ----------
let eyeGeo = null;
function eyeGeometry(body) {
  if (body.eyeGeo) return body.eyeGeo;
  const a = 0.105;
  const y = body.mid(a) + (body.top(a) - body.bot(a)) * 0.12;
  const x = body.half(a) * 0.86;
  const r = (body.top(a) - body.bot(a)) * 0.15;
  const parts = [];
  for (const s of [-1, 1]) {
    const ball = new THREE.SphereGeometry(r, 16, 12);
    ball.translate(s * x, y, zAt(a));
    const hl = new THREE.SphereGeometry(r * 0.28, 8, 6);
    hl.translate(s * (x + r * 0.75), y + r * 0.38, zAt(a) + r * 0.3);
    const cBall = new Float32Array(ball.attributes.position.count * 3).fill(0.04);
    ball.setAttribute('color', new THREE.BufferAttribute(cBall, 3));
    const cHl = new Float32Array(hl.attributes.position.count * 3).fill(1);
    hl.setAttribute('color', new THREE.BufferAttribute(cHl, 3));
    parts.push(ball, hl);
  }
  body.eyeGeo = mergeGeometries(parts.map(p => p.toNonIndexed()), false);
  body.eyeGeo.userData.keep = true;
  return body.eyeGeo;
}
function makeEyeMaterial(U) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.0, emissive: 0x000000 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = WAVE_GLSL + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       transformed = fishWave(transformed, (${NOSE_Z.toFixed(4)} - position.z) / ${BODY_LEN.toFixed(4)});`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
       totalEmissiveRadiance += vColor.rgb * 0.6;`);
  };
  m.customProgramCacheKey = () => 'betta-eye';
  return m;
}

// ---------- Fish ----------
export class Fish {
  constructor(body, def, opts = {}) {
    this.def = def;
    this.body = body;
    this.U = Object.assign(colorUniforms(def), {
      uPhase: { value: Math.random() * 10 }, uSwim: { value: 0.3 }, uTurn: { value: 0 },
      uFlare: { value: 0 }, uFinScale: { value: opts.finScale ?? 1 },
    });
    this.group = new THREE.Group();
    this.bodyMesh = new THREE.Mesh(body.geometry, makeBodyMaterial(body, this.U));
    this.bodyMesh.castShadow = !!opts.shadow;
    this.group.add(this.bodyMesh);
    const style = opts.fins === false ? null : (def.fins || 'halfmoon');
    if (style) {
      const fg = finGeometry(body, style);
      this.finMesh = new THREE.Mesh(fg, makeFinMaterial(fg, this.U));
      this.finMesh.renderOrder = 3;
      this.finMesh.frustumCulled = false;
      this.group.add(this.finMesh);
    }
    this.eyeMesh = new THREE.Mesh(eyeGeometry(body), makeEyeMaterial(this.U));
    this.group.add(this.eyeMesh);
    this.bodyMesh.frustumCulled = false;
    this.swim = 0.3; this.flare = 0; this.flareTarget = 0; this.turn = 0;
  }
  setDef(def) {
    this.def = def;
    const c = colorUniforms(def);
    for (const k in c) this.U[k].value = c[k].value;
  }
  update(dt) {
    const freq = 5 + 9 * this.swim;
    this.U.uPhase.value += dt * freq;
    this.U.uSwim.value += (this.swim - this.U.uSwim.value) * Math.min(1, dt * 4);
    this.flare += (this.flareTarget - this.flare) * Math.min(1, dt * 6);
    this.U.uFlare.value = this.flare;
    this.U.uTurn.value += (this.turn - this.U.uTurn.value) * Math.min(1, dt * 5);
  }
  dispose() {
    this.bodyMesh.material.dispose();
    this.finMesh?.material.dispose();
    this.eyeMesh.material.dispose();
  }
}

export function getBody(kind) { return bodyCache[kind]; }
