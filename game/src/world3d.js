// Shared 3D pieces: panoramas, caustics, water surface, glass, palettes.
import * as THREE from 'three';
import { texture } from './assets.js';

export const WORLD_STYLE = {
  cw: { name: 'Clearwater', water: 0x5fc6d0, fog: 0x7fd3db, rim: 0xbff3ea, back: 0x9fdce0, accent: 0x5fb85a, pano: 'assets/bg/pano-clearwater.jpg', light: 0xfff4dd, amb: 0xdff8ff },
  cp: { name: 'Copperworks', water: 0x6ab3a8, fog: 0x8fb8a8, rim: 0xffd9a8, back: 0x7a5236, accent: 0xc8743a, pano: 'assets/bg/pano-copper.jpg', light: 0xffd9a0, amb: 0xffe8cc },
  nn: { name: 'Neon Night', water: 0x2a3a78, fog: 0x1e2a5a, rim: 0xff4fd8, back: 0x10142e, accent: 0x3cf0ff, pano: 'assets/bg/pano-neon.jpg', light: 0xc8b8ff, amb: 0x8a8aff },
};

// A panorama on the inside of a cylinder around a point.
export function makePanorama(world, radius = 30, height = 24, y = 0) {
  const st = WORLD_STYLE[world];
  const tex = texture(st.pano);
  const geo = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true);
  const mat = tex
    ? new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: true, depthWrite: false, color: 0xd0dada })
    : new THREE.MeshBasicMaterial({ color: st.back, side: THREE.BackSide, fog: false, depthWrite: false });
  if (tex) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(-1, 1); }
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y; m.renderOrder = -10;
  return m;
}

// Caustics on a floor: adds a moving light pattern in the fragment shader.
export function addCaustics(material, uTime, strength = 0.35) {
  material.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = 'varying vec3 vWorldP;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uTime; varying vec3 vWorldP;\n' + `
      float caus(vec2 p, float t){
        vec2 i = p; float c = 0.0;
        for (int n = 0; n < 3; n++) { float tt = t * (1.0 - 0.2 * float(n)); i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x)); c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.012), p.y / (cos(i.y + tt) / 0.012))); }
        c /= 3.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 7.0);
      }
` + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.85, 1.0, 1.0) * clamp(caus(vWorldP.xz * 0.9, uTime * 0.6), 0.0, 1.0) * ${strength.toFixed(2)};`);
  };
  material.customProgramCacheKey = () => 'caustics';
}

// Water surface seen from below: rippling, bright, see-through.
export function makeWaterSurface(w, d, uTime, color = 0xbff3ea) {
  const geo = new THREE.PlaneGeometry(w, d, 40, 20);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime, uColor: { value: new THREE.Color(color) } },
    vertexShader: `uniform float uTime; varying vec2 vXZ; void main(){ vec3 p = position; p.y += sin(p.x*1.3+uTime*1.2)*0.05 + cos(p.z*1.7+uTime)*0.04; vXZ = p.xz; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vXZ;
      void main(){ float r = sin(vXZ.x*2.1+uTime*1.3)*sin(vXZ.y*2.7-uTime*1.1); float a = 0.55 + 0.2*r; gl_FragColor = vec4(uColor*(1.25+0.4*r), a);
      #include <colorspace_fragment>
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 4;
  return m;
}

// Fresnel glass shell (additive rim) used for tank panes, tubes, bubbles.
export function rimMaterial(color, strength = 0.8, power = 2.0, base = 0.02) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength }, uPow: { value: power }, uBase: { value: base } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uStrength; uniform float uPow; uniform float uBase; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow); gl_FragColor = vec4(uColor * (f * uStrength + uBase), 1.0);
      #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

// Thin-film bubble shader (player bubble, food bubbles).
export function bubbleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec3 p = position * (1.0 + 0.025*sin(uTime*3.0 + position.y*6.0) + 0.02*sin(uTime*2.3+position.x*5.0)); vP = position; vec4 mv = modelViewMatrix*vec4(p,1.0); vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uTime; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec3 n = normalize(vN); vec3 v = normalize(vV); float f = pow(1.0 - abs(dot(n, v)), 2.2);
        vec3 film = 0.5 + 0.5*cos(6.28*(f*1.4 + vP.y*0.6 + uTime*0.08 + vec3(0.0, 0.33, 0.67)));
        vec3 c = film * f * 1.1 + vec3(1.0) * pow(max(0.0, dot(reflect(-v, n), normalize(vec3(-0.4, 0.8, 0.5)))), 40.0) * 0.9;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

// Bites: one instanced mesh.
export function makeBites(n, world) {
  const geo = new THREE.IcosahedronGeometry(0.12, 1); geo.scale(1, 0.75, 1);
  const mat = new THREE.MeshStandardMaterial({ color: world === 'cp' ? 0xf2d08a : 0xa0622d, roughness: 0.6, emissive: world === 'nn' ? 0xffb070 : world === 'cp' ? 0xffe0a0 : 0x000000, emissiveIntensity: world === 'nn' ? 0.6 : world === 'cp' ? 0.35 : 0 });
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  m.count = n;
  m.frustumCulled = false;
  return m;
}

// Canvas texture helper for labels / icons.
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.own = true;
  return t;
}
