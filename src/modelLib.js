import * as THREE from 'three';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { buildModel, TOPH, GLOW, TYPE_LIST, OWNER_COL, sprite } from './models.js';

// Loads assets/models/<type>.glb (listed in assets/models/models.json). Anything missing or broken falls back to the
// procedural model in models.js, so the game always runs.
export const lib = { meta: { flatShading: true, models: {} }, gltf: {}, status: {} };
export const MODEL_DIR = new URL('../assets/models/', import.meta.url).href;

export async function loadLibrary(bust = '') {
  try { lib.meta = await (await fetch(MODEL_DIR + 'models.json' + bust, { cache: 'no-cache' })).json(); } catch (e) { /* defaults */ }
  const loader = new GLTFLoader();
  await Promise.all(TYPE_LIST.map(async (t) => {
    const file = lib.meta.models?.[t]?.file || `${t}.glb`;
    try { lib.gltf[t] = await loader.loadAsync(MODEL_DIR + file + bust); lib.status[t] = 'glb'; }
    catch (e) { delete lib.gltf[t]; lib.status[t] = 'procedural'; }
  }));
  return lib.status;
}
export const topOf = (type) => lib.meta.models?.[type]?.top ?? TOPH[type];
const glowOf = (type) => { const g = lib.meta.models?.[type]?.glow; return g ? { color: new THREE.Color(g.color).getHex(), size: g.size, y: g.y } : GLOW[type]; };

// Re-tint 'owner' materials, enable shadows, tag animated nodes by name.
export function prepare(root, owner) {
  const flat = lib.meta.flatShading !== false, cache = new Map();
  root.traverse((o) => {
    const n = (o.name || '').toLowerCase();
    if (n.startsWith('wing_l')) o.userData.wing = 1; else if (n.startsWith('wing_r')) o.userData.wing = -1;
    else if (n.startsWith('halo')) o.userData.spin = true; else if (n.startsWith('flag')) o.userData.flag = true;
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      if (!cache.has(m)) {
        const c = m.clone();
        if (c.name === 'owner') c.color.setHex(OWNER_COL[owner]);   // matte paint: no emissive
        if (flat && c.isMeshStandardMaterial) c.flatShading = true;
        c.needsUpdate = true; cache.set(m, c);
      }
      return cache.get(m);
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  return root;
}
export function makeModel(type, owner) {
  const g = lib.gltf[type] ? new THREE.Group() : buildModel(type, owner);
  if (lib.gltf[type]) { g.add(prepare(lib.gltf[type].scene.clone(true), owner)); g.name = type; }
  else prepare(g, owner);
  g.userData.top = topOf(type);
  const gl = glowOf(type); if (gl) g.add(sprite(gl.color, gl.size, gl.y));
  return g;
}
