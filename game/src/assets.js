// Asset loading with a cache, progress for the loading screen, and safe fallbacks.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const models = {}, textures = {}, pending = {};
export const loadStats = { total: 0, done: 0, bytes: 0 };

function track(p) {
  loadStats.total++;
  return p.finally(() => { loadStats.done++; });
}

// Loads a GLB and bakes it into a single geometry + material (props and creatures are one mesh each).
export function loadModel(name) {
  if (models[name]) return Promise.resolve(models[name]);
  if (pending['m:' + name]) return pending['m:' + name];
  const tryLoad = async () => { for (let i = 0; ; i++) { try { return await gltfLoader.loadAsync(`assets/models/${name}.glb`); } catch (e) { if (i >= 3) throw e; await new Promise(r => setTimeout(r, 600 * (i + 1))); } } };
  const p = track(tryLoad().then(gltf => {
    gltf.scene.updateMatrixWorld(true);
    const geos = [], mats = [];
    gltf.scene.traverse(o => {
      if (o.isMesh) {
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
        for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
        geos.push(g); mats.push(o.material);
      }
    });
    const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, true);
    geometry.computeBoundingBox();
    geometry.userData.keep = true;
    const material = mats[0];
    if (material.map) { material.map.colorSpace = THREE.SRGBColorSpace; material.map.anisotropy = 4; }
    const m = { geometry, material, bbox: geometry.boundingBox.clone() };
    models[name] = m;
    return m;
  }).catch(() => { models[name] = null; return null; }));
  pending['m:' + name] = p;
  return p;
}
export function model(name) { return models[name] || null; }

// A mesh instance of a loaded model, scaled to a size (longest side) and sitting on y = 0, centred in x/z.
export function modelMesh(name, size = 1, opts = {}) {
  const m = models[name];
  if (!m) return null;
  const g = m.geometry; const b = m.bbox;
  const ext = new THREE.Vector3().subVectors(b.max, b.min);
  const s = size / Math.max(ext.x, ext.y, ext.z);
  const mat = opts.material || (opts.cloneMaterial ? m.material.clone() : m.material);
  const mesh = new THREE.Mesh(g, mat);
  const inner = new THREE.Group();
  mesh.scale.setScalar(s);
  mesh.position.set(-(b.min.x + b.max.x) / 2 * s, -b.min.y * s, -(b.min.z + b.max.z) / 2 * s);
  inner.add(mesh);
  inner.userData.mesh = mesh;
  mesh.castShadow = !!opts.shadow; mesh.receiveShadow = !!opts.receive;
  return inner;
}

export function loadTexture(path, { srgb = true, repeat = false } = {}) {
  if (textures[path]) return Promise.resolve(textures[path]);
  if (pending['t:' + path]) return pending['t:' + path];
  const p = track(texLoader.loadAsync(path).then(t => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    textures[path] = t; return t;
  }).catch(() => { textures[path] = null; return null; }));
  pending['t:' + path] = p;
  return p;
}
export function texture(path) { return textures[path] || null; }

export async function loadAll(list) {
  return Promise.all(list.map(x => x.startsWith('model:') ? loadModel(x.slice(6)) : loadTexture(x.split('|')[0], { repeat: x.includes('|repeat'), srgb: !x.includes('|linear') })));
}
