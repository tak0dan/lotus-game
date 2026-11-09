import * as THREE from 'three';

// THE TOWER GAME — procedural miniatures, styled after the war-room table in "Justin and the Knights of Valour":
// matte, faceted, hand-carved figures on small stone plinths; towers are stacks of open-frame stone modules.
// These builders are the SOURCE of assets/models/*.glb (tools/export.html) and the fallback when a .glb is missing.
// Conventions: 1 unit = 1 board square · origin at the base centre · faces +Z · material named 'owner' is re-tinted per player ·
// nodes 'wing_L' 'wing_R' (flap), 'flag' (ripples), 'orb' (pulses) are animated by the game.

export const OWNER_COL = [0x46587a, 0xb0552f];          // slate blue / rust (the two paint jobs on the movie's table)
export const OWNER_DARK = [0x2c3a55, 0x7d3a20];
export const NAME = ['Slate', 'Rust'];

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

export const TYPE_HEIGHT = { infantry: 1.15, heavy_infantry: 1.2, cavalry: 1.1, heavy_cavalry: 1.2, archer: 1.2, siege: 1.1, mage: 1.8, dragon: 1.35 };

// ── figurines (built facing +X, wrapped so the finished model faces +Z) ──
function figure(type, o) {
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
    case 'dragon': {
      const sk = od, hi = om;
      add(part(G.box(0.8, 0.36, 0.42), sk, 0, Y + 0.42, 0), part(G.box(0.34, 0.3, 0.3), sk, 0.5, Y + 0.56, 0), part(G.cone(0.13, 0.36, 4), hi, 0.76, Y + 0.7, 0),
          part(G.box(0.34, 0.12, 0.34), hi, 0.52, Y + 0.34, 0), part(G.cone(0.1, 0.9, 4), sk, -0.7, Y + 0.34, 0));
      const nk = part(G.box(0.14, 0.5, 0.16), sk, 0.58, Y + 0.85, 0); nk.rotation.z = -0.35; add(nk);
      for (let i = 0; i < 6; i++) add(part(G.cone(0.05, 0.16, 3), hi, -0.35 + i * 0.16, Y + 0.67, 0));                                           // back spikes
      for (const dz of [0.17, -0.17]) for (const dx of [0.28, -0.3]) add(part(G.box(0.1, 0.24, 0.1), sk, dx, Y + 0.13, dz * 1.2));
      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.6, 0.05, 0.08, 0.1, 0.4, 0.75, -0.5, 0.25, 0.95, -0.25, 0.1, 1.2, 0.35, 0.05, 0.55], 3));
      wingGeo.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 0, 2, 5]); wingGeo.computeVertexNormals();
      const wm = new THREE.MeshStandardMaterial({ name: 'owner', color: OWNER_COL[o], side: THREE.DoubleSide, flatShading: true, roughness: 0.92 });
      for (const sgn of [1, -1]) { const w = new THREE.Group(); w.name = sgn > 0 ? 'wing_L' : 'wing_R'; w.position.set(0.05, Y + 0.62, 0.2 * sgn); const mesh = part(wingGeo, wm); mesh.scale.z = sgn; w.add(mesh); add(w); }
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
export const TYPE_LIST = ['infantry', 'heavy_infantry', 'cavalry', 'heavy_cavalry', 'archer', 'siege', 'mage', 'dragon', ...MODULES];
export const TOPH = { ...TYPE_HEIGHT, tower_foundation: FOUNDATION_H, tower_level: LEVEL_H, tower_level_reinforced: LEVEL_H };
export function buildModel(type, o) {
  if (type === 'tower_foundation') return towerFoundation(o);
  if (type === 'tower_level') return towerLevel('normal', o);
  if (type === 'tower_level_reinforced') return towerLevel('reinforced', o);
  return figure(type, o);
}
export const GLOW = { mage: { color: 0x9db8ff, size: 1.0, y: 1.6 } };

// ── resource markers (gold coins, iron ore, mana crystal) ──
export function resourceMarker(kind) {
  const g = new THREE.Group();
  if (kind === 'gold') { for (let i = 0; i < 4; i++) g.add(part(G.cyl(0.2 - i * 0.02, 0.2 - i * 0.02, 0.05, 10), mat(0xd9b24a, { metalness: 0.4, roughness: 0.5 }), (i % 2) * 0.03, 0.03 + i * 0.05, (i % 2) * -0.03)); }
  else if (kind === 'iron') { const rk = mat(0x5a5e66); g.add(part(G.oct(0.22), rk, 0, 0.18, 0), part(G.oct(0.14), mat(0x6b6f78), 0.18, 0.1, 0.08), part(G.oct(0.1), mat(0xa8633a), -0.12, 0.2, 0.12)); }
  else { const c = glow(0x7aa8ff, 0.8); g.add(part(G.cone(0.1, 0.5, 5), c, 0, 0.27, 0), part(G.cone(0.07, 0.32, 5), c, 0.14, 0.17, 0.05), part(G.cone(0.06, 0.26, 5), c, -0.12, 0.14, -0.08)); }
  g.name = 'res_' + kind; return g;
}
