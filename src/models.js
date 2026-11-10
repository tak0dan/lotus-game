import * as THREE from 'three';
import { HD_TYPES, buildHD } from './models_hd.js';

// THE TOWER GAME — procedural miniatures, styled after the war-room table in "Justin and the Knights of Valour":
// matte, faceted, hand-carved figures on small stone plinths; towers are stacks of open-frame stone modules.
// These builders are the SOURCE of assets/models/*.glb (tools/export.html) and the fallback when a .glb is missing.
// Conventions: 1 unit = 1 board square · origin at the base centre · faces +Z · material named 'owner' is re-tinted per player ·
// nodes 'wing_L' 'wing_R' (flap), 'flag' (ripples), 'orb' (pulses) are animated by the game.

export const OWNER_COL = [0x46587a, 0xb0552f, 0x4f8a46, 0xc2a233, 0x7a4f9a, 0x2f9a9a, 0x9a2f45, 0xb4b4bc];     // slate, rust, green, ochre, violet, teal, crimson, silver          // slate blue / rust (the two paint jobs on the movie's table)
export const OWNER_DARK = [0x2c3a55, 0x7d3a20, 0x2f5a2c, 0x8a7120, 0x523368, 0x1f6868, 0x6a1f30, 0x7d7d85];
export const NAME = ['Slate', 'Rust', 'Moss', 'Ochre', 'Violet', 'Teal', 'Crimson', 'Silver'];

// ── shared helpers (also used by the scene code) ──
export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  sph: (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h),
  tor: (Rr, r, a = Math.PI * 2, s = 14) => new THREE.TorusGeometry(Rr, r, 6, s, a),
  oct: (r) => new THREE.OctahedronGeometry(r, 0),
};
export const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.92, metalness: 0.0, ...o });
export const glow = (c, i = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, flatShading: true, roughness: 0.5 });
export const part = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
export const glowTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
export const sprite = (col, s, y = 0) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); sp.scale.set(s, s, 1); sp.position.y = y; return sp; };

const WOOD = mat(0xc7a57a), DWOOD = mat(0x7a5a3a), STONE = mat(0x8c8f95), DSTONE = mat(0x5f626a), LSTONE = mat(0xa9acb1), IRON = mat(0x4b4e57), LEATHER = mat(0x6b4a32), BONE = mat(0xd8d0bd);
export const ownerMat = (o, dark = false) => mat(dark ? OWNER_DARK[o] : OWNER_COL[o], { name: 'owner' });

// A small square stone plinth every figurine stands on (as on the movie's table).
const plinth = () => { const g = new THREE.Group(); g.name = 'plinth'; g.add(part(G.box(0.74, 0.07, 0.74), DSTONE, 0, 0.035, 0), part(G.box(0.66, 0.04, 0.66), STONE, 0, 0.09, 0)); return g; };

export const TYPE_HEIGHT = { infantry: 1.55, heavy_infantry: 1.75, cavalry: 1.9, heavy_cavalry: 2.0, archer: 1.65, monk: 1.5, priest: 2.15, siege: 1.45, mage: 2.2, dragon: 2.1 };

// ── figurines (built facing +X, wrapped so the finished model faces +Z) ──
function figure(type, o) {
  if (HD_TYPES.includes(type)) return buildHD(type, o);                // the high-detail kit (src/models_hd.js); the code below is the low-poly fallback
  const g = new THREE.Group(), m = new THREE.Group(); g.add(m); m.rotation.y = -Math.PI / 2;
  g.add(plinth());
  const om = ownerMat(o), od = ownerMat(o, true);
  const add = (...a) => m.add(...a);
  const Y = 0.11;                                               // top of plinth
  const head = (x, y, z, r = 0.1) => part(G.sph(r, 6, 5), WOOD, x, y, z);
  switch (type) {
    case 'infantry':
      add(part(G.cone(0.27, 0.78, 5), om, 0, Y + 0.39, 0), head(0, Y + 0.9, 0), part(G.cone(0.13, 0.2, 5), od, 0, Y + 1.02, 0),
          part(G.box(0.06, 0.46, 0.34), od, 0.2, Y + 0.5, 0), part(G.box(0.03, 0.34, 0.24), om, 0.235, Y + 0.5, 0),   // shield
          part(G.cyl(0.018, 0.018, 1.05, 4), DWOOD, -0.05, Y + 0.6, -0.2), part(G.cone(0.045, 0.16, 4), IRON, -0.05, Y + 1.2, -0.2),    // spear
          part(G.box(0.26, 0.5, 0.05), od, -0.2, Y + 0.45, 0));                                                                    // cloak back
      break;
    case 'heavy_infantry':
      add(part(G.box(0.46, 0.55, 0.34), od, 0, Y + 0.42, 0), part(G.cone(0.31, 0.3, 6), om, 0, Y + 0.17, 0), part(G.box(0.22, 0.2, 0.22), IRON, 0, Y + 0.84, 0), part(G.box(0.05, 0.12, 0.2), om, 0, Y + 1.0, 0),
          part(G.box(0.07, 0.8, 0.5), od, 0.27, Y + 0.5, 0), part(G.box(0.04, 0.6, 0.38), om, 0.31, Y + 0.5, 0), part(G.box(0.045, 0.1, 0.18), DSTONE, 0.325, Y + 0.5, 0),   // tower shield
          part(G.box(0.1, 0.5, 0.04), DWOOD, -0.18, Y + 0.7, 0.2), part(G.box(0.2, 0.06, 0.06), IRON, -0.18, Y + 1.0, 0.2));            // axe
      break;
    case 'archer':
      add(part(G.cone(0.25, 0.85, 5), om, 0, Y + 0.42, 0), head(0, Y + 0.95, 0), part(G.cone(0.16, 0.26, 5), od, -0.02, Y + 1.07, 0),       // hood
          part(G.box(0.3, 0.7, 0.06), od, -0.2, Y + 0.5, 0), part(G.box(0.08, 0.34, 0.1), LEATHER, -0.18, Y + 0.78, 0.12));              // cloak, quiver
      { const bow = part(G.tor(0.36, 0.022, Math.PI, 10), DWOOD, 0.14, Y + 0.64, 0); bow.rotation.z = -Math.PI / 2; add(bow); add(part(G.cyl(0.006, 0.006, 0.72, 3), BONE, 0.14, Y + 0.64, 0)); }
      break;
    case 'cavalry': case 'heavy_cavalry': {
      const hv = type === 'heavy_cavalry', s = hv ? 1.12 : 1;
      const horse = hv ? od : mat(0x6d4b33);
      add(part(G.box(0.86 * s, 0.34 * s, 0.34 * s), horse, 0, Y + 0.44 * s, 0), part(G.box(0.3 * s, 0.26 * s, 0.26 * s), horse, 0.48 * s, Y + 0.66 * s, 0), part(G.box(0.26 * s, 0.17 * s, 0.17 * s), horse, 0.7 * s, Y + 0.62 * s, 0),
          part(G.cone(0.07, 0.34, 4), horse, -0.52 * s, Y + 0.46 * s, 0));
      for (const [dx, dz] of [[0.32, 0.11], [0.32, -0.11], [-0.3, 0.11], [-0.3, -0.11]]) add(part(G.box(0.07, 0.3 * s, 0.07), horse, dx * s, Y + 0.15 * s, dz));
      add(part(G.box(0.5 * s, 0.05, 0.4 * s), om, 0, Y + 0.63 * s, 0));                                                                        // saddle cloth
      if (hv) add(part(G.box(0.6, 0.2, 0.42), om, 0.02, Y + 0.5, 0), part(G.box(0.16, 0.22, 0.2), om, 0.5 * s, Y + 0.7 * s, 0));               // barding
      add(part(G.cone(0.19, 0.55, 5), om, 0, Y + 0.95 * s, 0), head(0, Y + 1.3 * s, 0, 0.09), part(G.cone(0.1, 0.17, 5), hv ? IRON : od, 0, Y + 1.43 * s, 0),
          part(G.box(0.3, 0.5, 0.05), od, -0.22, Y + 0.95 * s, 0), part(G.cyl(0.016, 0.016, 1.15 * s, 4), DWOOD, 0.45 * s, Y + 0.98 * s, -0.17), part(G.cone(0.04, 0.16, 4), IRON, 0.45 * s, Y + 1.6 * s, -0.17));
      break; }
    case 'monk':                                                                                       // lean, hooded, barefoot; a staff held low — made to run in and out
      add(part(G.cone(0.23, 0.82, 6), om, 0, Y + 0.41, 0), part(G.box(0.34, 0.07, 0.2), od, 0, Y + 0.52, 0), head(0, Y + 0.93, 0, 0.1), part(G.cone(0.15, 0.2, 6), od, -0.03, Y + 1.04, 0),
          part(G.box(0.07, 0.4, 0.4), om, 0.08, Y + 0.6, 0), part(G.box(0.26, 0.55, 0.05), od, -0.2, Y + 0.5, 0));
      { const st = part(G.cyl(0.016, 0.016, 1.15, 4), DWOOD, 0.22, Y + 0.58, 0.18); st.rotation.x = -0.18; add(st); add(part(G.sph(0.045, 5, 4), IRON, 0.22, Y + 1.15, 0.13)); }
      break;
    case 'priest':                                                                                     // long robe, tall mitre, a stole, and a censer on a chain
      add(part(G.cone(0.31, 1.05, 7), om, 0, Y + 0.52, 0), part(G.cone(0.34, 0.2, 7), od, 0, Y + 0.1, 0), part(G.box(0.1, 0.8, 0.34), od, 0.05, Y + 0.62, 0), head(0, Y + 1.15, 0, 0.1),
          part(G.cone(0.14, 0.34, 4), od, 0, Y + 1.42, 0), part(G.box(0.3, 0.05, 0.22), LSTONE, 0, Y + 1.27, 0), part(G.box(0.3, 0.9, 0.05), od, -0.2, Y + 0.6, 0));
      { add(part(G.cyl(0.008, 0.008, 0.42, 3), BONE, 0.24, Y + 0.72, 0.2)); add(part(G.sph(0.075, 6, 5), IRON, 0.24, Y + 0.48, 0.2)); }
      break;
    case 'siege':
      add(part(G.box(0.9, 0.1, 0.5), DWOOD, 0, Y + 0.18, 0), part(G.box(0.1, 0.7, 0.07), DWOOD, -0.1, Y + 0.55, 0.2), part(G.box(0.1, 0.7, 0.07), DWOOD, -0.1, Y + 0.55, -0.2), part(G.box(0.08, 0.08, 0.5), DWOOD, -0.1, Y + 0.9, 0));
      for (const dz of [0.3, -0.3]) for (const dx of [-0.32, 0.32]) { const w = part(G.cyl(0.14, 0.14, 0.07, 8), DWOOD, dx, Y + 0.14, dz); w.rotation.x = Math.PI / 2; add(w); }
      { const arm = part(G.box(1.15, 0.07, 0.09), DWOOD, 0.1, Y + 0.95, 0); arm.rotation.z = 0.5; arm.position.set(0.1, Y + 0.95, 0); add(arm);
        add(part(G.box(0.3, 0.28, 0.28), DSTONE, -0.47, Y + 0.68, 0), part(G.box(0.2, 0.12, 0.2), om, 0.62, Y + 1.2, 0), part(G.sph(0.1, 5, 4), STONE, 0.62, Y + 1.32, 0)); }
      break;
    case 'mage':
      add(part(G.cone(0.31, 1.0, 6), om, 0, Y + 0.5, 0), part(G.cone(0.34, 0.2, 6), od, 0, Y + 0.1, 0), head(0, Y + 1.12, 0, 0.1),
          part(G.cone(0.15, 0.62, 5), od, 0, Y + 1.5, 0), part(G.cyl(0.19, 0.19, 0.03, 6), od, 0, Y + 1.22, 0),                                    // very tall pointed hat + brim
          part(G.box(0.07, 0.5, 0.5), om, 0.0, Y + 0.7, 0), part(G.box(0.3, 0.9, 0.06), od, -0.2, Y + 0.6, 0));                                   // long sleeves, cloak
      { add(part(G.cyl(0.016, 0.016, 1.4, 4), DWOOD, 0.26, Y + 0.7, 0.16)); const orb = part(G.oct(0.09), glow(0x9db8ff, 1.2), 0.26, Y + 1.45, 0.16); orb.name = 'orb'; orb.userData.orb = true; add(orb); }
      break;
    case 'dragon': {                                                         // a WYVERN: two legs, wings for arms, perched on a tower top (much bigger than any other unit)
      const sk = od, hi = om, S = 1.0, P = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const q = part(geo, m, x * S, y * S, z * S); q.scale.setScalar(S); q.rotation.set(rx, ry, rz); return q; };
      add(P(G.box(0.62, 0.42, 0.4), sk, 0, 0.62, 0, 0, 0, 0.35));                                              // torso, leaning forward
      add(P(G.box(0.34, 0.3, 0.34), sk, -0.3, 0.46, 0, 0, 0, 0.2));                                           // haunch
      for (const dz of [0.17, -0.17]) {                                                                         // two hind legs gripping the stone
        add(P(G.box(0.14, 0.34, 0.14), sk, -0.14, 0.28, dz, 0, 0, -0.25), P(G.box(0.1, 0.22, 0.1), sk, -0.05, 0.1, dz, 0, 0, 0.45));
        for (const k of [-1, 0, 1]) add(P(G.cone(0.025, 0.14, 3), hi, 0.1, 0.03, dz + k * 0.05, 0, 0, -Math.PI / 2));   // talons
      }
      add(P(G.cone(0.13, 1.35, 4), sk, -0.95, 0.3, 0, 0, 0, Math.PI / 2 + 0.7));                                // long tail hanging down behind the tower
      add(P(G.cone(0.06, 0.2, 3), hi, -1.5, 0.05, 0, 0, 0, Math.PI));                                          // tail barb
      add(P(G.box(0.12, 0.5, 0.14), sk, 0.28, 0.98, 0, 0, 0, -0.25), P(G.box(0.1, 0.4, 0.12), sk, 0.4, 1.34, 0, 0, 0, 0.35));   // S-shaped neck
      add(P(G.box(0.3, 0.14, 0.2), sk, 0.62, 1.55, 0, 0, 0, -0.1), P(G.cone(0.05, 0.3, 4), hi, 0.5, 1.7, 0.09, 0, 0, 2.0), P(G.cone(0.05, 0.3, 4), hi, 0.5, 1.7, -0.09, 0, 0, 2.0));   // head + two horns
      for (let i = 0; i < 5; i++) add(P(G.cone(0.04, 0.14, 3), hi, -0.25 + i * 0.12, 0.88 - i * 0.02, 0));    // back spikes
      const wingGeo = new THREE.BufferGeometry();                                                              // wing membrane: arm bone + three fingers
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.2, 0.7, 0.3, 0.1, 1.05, 0.75, 0.15, 0.75, 1.25, 0.1, 0.2, 1.15, -0.3, 0.05, 0.6], 3));
      wingGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 1]); wingGeo.computeVertexNormals();
      const wm = new THREE.MeshStandardMaterial({ name: 'owner', color: OWNER_COL[o], side: THREE.DoubleSide, flatShading: true, roughness: 0.92 });
      for (const sgn of [1, -1]) { const w = new THREE.Group(); w.name = sgn > 0 ? 'wing_L' : 'wing_R'; w.position.set(0.02 * S, 0.8 * S, 0.2 * sgn * S); const mesh = part(wingGeo, wm); mesh.scale.set(S, S, S * sgn); w.add(mesh); add(w); }
      break; }
  }
  g.name = type; g.userData.top = TYPE_HEIGHT[type];
  return g;
}

// ── tower modules (stackable; one board square; 0.5 foundation + 0.6 per level) ──
export const FOUNDATION_H = 0.5, LEVEL_H = 0.6;
const post = (x, z, h, m) => part(G.box(0.13, h, 0.13), m, x, h / 2, z);
function chalice(y) { const c = new THREE.Group(); c.add(part(G.cyl(0.07, 0.03, 0.05, 6), DSTONE, 0, y + 0.025, 0), part(G.cyl(0.02, 0.02, 0.07, 5), DSTONE, 0, y + 0.085, 0), part(G.cone(0.075, 0.07, 6), DSTONE, 0, y + 0.15, 0)); c.children[2].rotation.x = Math.PI; return c; }
export function towerFoundation(o) {
  const g = new THREE.Group(); g.name = 'tower_foundation';
  g.add(part(G.box(0.94, FOUNDATION_H, 0.94), STONE, 0, FOUNDATION_H / 2, 0), part(G.box(1.0, 0.1, 1.0), DSTONE, 0, 0.05, 0), part(G.box(0.86, 0.06, 0.86), LSTONE, 0, FOUNDATION_H + 0.01, 0));
  const flag = part(G.box(0.3, 0.18, 0.02), ownerMat(o), 0.2, FOUNDATION_H - 0.12, 0.48); flag.name = 'flag'; flag.userData.flag = true; g.add(flag);       // owner colour band on the base
  g.userData.height = FOUNDATION_H; return g;
}
export function towerLevel(kind, o) {                    // open frame: 4 corner posts + slab; reinforced adds half walls
  const g = new THREE.Group(); g.name = kind === 'reinforced' ? 'tower_level_reinforced' : 'tower_level';
  const h = LEVEL_H - 0.1, m = kind === 'reinforced' ? DSTONE : STONE;
  for (const [x, z] of [[0.36, 0.36], [-0.36, 0.36], [0.36, -0.36], [-0.36, -0.36]]) g.add(post(x, z, h, m));
  g.add(part(G.box(0.94, 0.1, 0.94), LSTONE, 0, h + 0.05, 0));
  if (kind === 'reinforced') for (const [x, z, w, d] of [[0.44, 0, 0.07, 0.72], [-0.44, 0, 0.07, 0.72], [0, 0.44, 0.72, 0.07], [0, -0.44, 0.72, 0.07]]) g.add(part(G.box(w, h * 0.55, d), m, x, h * 0.28, z));
  g.add(chalice(h + 0.1));                                                                                                        // chalice relief on the slab
  const band = part(G.box(0.86, 0.04, 0.86), ownerMat(o), 0, h + 0.012, 0); g.add(band);
  g.userData.height = LEVEL_H; return g;
}
export const MODULES = ['tower_foundation', 'tower_level', 'tower_level_reinforced'];
export const TYPE_LIST = ['infantry', 'heavy_infantry', 'cavalry', 'heavy_cavalry', 'archer', 'monk', 'priest', 'siege', 'mage', 'dragon', ...MODULES];
export const TOPH = { ...TYPE_HEIGHT, tower_foundation: FOUNDATION_H, tower_level: LEVEL_H, tower_level_reinforced: LEVEL_H };
export function buildModel(type, o) {
  if (type === 'tower_foundation') return towerFoundation(o);
  if (type === 'tower_level') return towerLevel('normal', o);
  if (type === 'tower_level_reinforced') return towerLevel('reinforced', o);
  return figure(type, o);
}
export const GLOW = { mage: { color: 0x9db8ff, size: 1.0, y: 1.6 } };

// ── resource markers: one per node type (6) and one per family (3 primaries) ──
export function resourceMarker(kind) {
  const g = new THREE.Group(), add = (...o) => g.add(...o);
  const coins = () => { for (let i = 0; i < 4; i++) add(part(G.cyl(0.2 - i * 0.02, 0.2 - i * 0.02, 0.05, 10), mat(0xd9b24a, { metalness: 0.4, roughness: 0.5 }), (i % 2) * 0.03, 0.03 + i * 0.05, (i % 2) * -0.03)); };
  const ore = (x = 0, z = 0) => { const rk = mat(0x5a5e66); add(part(G.oct(0.22), rk, x, 0.18, z), part(G.oct(0.14), mat(0x6b6f78), x + 0.18, 0.1, z + 0.08), part(G.oct(0.1), mat(0xa8633a), x - 0.12, 0.2, z + 0.12)); };
  const crystal = (col, x = 0, z = 0, s = 1) => { const c = glow(col, 0.8); add(part(G.cone(0.1 * s, 0.5 * s, 5), c, x, 0.27 * s, z), part(G.cone(0.07 * s, 0.32 * s, 5), c, x + 0.14 * s, 0.17 * s, z + 0.05), part(G.cone(0.06 * s, 0.26 * s, 5), c, x - 0.12 * s, 0.14 * s, z - 0.08)); };
  const ember = (x = 0, z = 0) => { const c = glow(0xff7a3a, 1.1); add(part(G.oct(0.16), c, x, 0.16, z), part(G.oct(0.1), glow(0xffb36a, 1.2), x + 0.15, 0.1, z + 0.06), part(G.oct(0.08), c, x - 0.1, 0.1, z - 0.1)); };
  const faith = (x = 0, z = 0) => { add(part(G.cyl(0.07, 0.09, 0.42, 8), mat(0xe8dfc2), x, 0.21, z), part(G.sph(0.06, 6, 5), glow(0xffe9a8, 1.6), x, 0.5, z)); const r = part(G.tor(0.16, 0.012, Math.PI * 2, 16), glow(0xffe9a8, 1.2), x, 0.62, z); r.rotation.x = Math.PI / 2; add(r); };
  const soul = (x = 0, z = 0) => { add(part(G.sph(0.12, 8, 6), glow(0xb99cff, 1.3), x, 0.38, z), part(G.cone(0.08, 0.3, 5), glow(0x8f6bff, 0.9), x, 0.17, z)); };
  const pair = (A, B) => { A(-0.17, 0); B(0.17, 0); };
  switch (kind) {
    case 'gold': coins(); break;                       case 'iron': ore(); break;
    case 'aether': case 'mana-old': crystal(0x7ea9ff); break;   case 'ember': ember(); break;
    case 'faith': faith(); break;                      case 'soul': soul(); break;
    case 'physical': { g.add(Object.assign(new THREE.Group(), {})); const c = new THREE.Group(); coins(); g.children.forEach((o) => { o.position.x -= 0.2; }); ore(0.22, 0); break; }
    case 'mana': crystal(0x7ea9ff, -0.2, 0, 0.8); ember(0.22, 0); break;
    case 'spirit': faith(-0.2, 0); soul(0.22, 0); break;
  }
  g.name = 'res_' + kind; return g;
}
