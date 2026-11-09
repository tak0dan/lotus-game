import * as THREE from 'three';

// Procedural reference models + shared geometry helpers. These are the SOURCE for assets/models/*.glb
// (see tools/export.html) and the fallback used when a .glb is missing.
export const OWNER_COL = [0x58b4ff, 0xff6a55];

export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  sph: (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h),
  tor: (Rr, r, a = Math.PI * 2, s = 14) => new THREE.TorusGeometry(Rr, r, 6, s, a),
};
export const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.78, metalness: 0.22, ...o });
export const glow = (c, i = 1) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, flatShading: true });
export const part = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; };
export const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
export const sprite = (col, s, y = 0) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 })); sp.scale.set(s, s, 1); sp.position.y = y; return sp; };


const stone = mat(0x6d6f78), iron = mat(0x4a4d57, { metalness: 0.6 }), scrap = mat(0x7b6a55), cloth = mat(0xcfc7b0);
// Materials named 'owner' are re-tinted per player at load time. Node names 'wing_L' 'wing_R' 'halo' 'flag' are animated by the game.
export function ownerMat(o, i = 0.25) { return new THREE.MeshStandardMaterial({ name: 'owner', color: OWNER_COL[o], emissive: OWNER_COL[o], emissiveIntensity: i, flatShading: true, roughness: 0.5 }); }

export const TOPH = { archer: 1.25, infantry: 1.2, cavalry: 1.0, ship: 1.5, leviathan: 1.35, inquisitor: 2.15, dragon: 1.3, tower: 0 };
export function buildModel(type, o) {
  const g = new THREE.Group(), m = new THREE.Group(); g.add(m); m.rotation.y = -Math.PI / 2;
  const om = ownerMat(o);
  const add = (...a) => m.add(...a);
  switch (type) {
    case 'archer':
      add(part(G.cone(0.22, 0.75, 6), mat(0x5d6a52), 0, 0.42, 0), part(G.sph(0.12), mat(0xd2b48c), 0, 0.92, 0), part(G.cone(0.15, 0.22, 6), mat(0x3d4636), 0, 1.04, 0));
      { const bow = part(G.tor(0.34, 0.025, Math.PI, 12), mat(0x6b4a2b), 0.14, 0.62, 0); bow.rotation.z = -Math.PI / 2; add(bow);
        add(part(G.cyl(0.006, 0.006, 0.68, 3), cloth, 0.14, 0.62, 0)); add(part(G.box(0.05, 0.05, 0.14), om, -0.05, 0.62, -0.18)); }
      break;
    case 'infantry':
      add(part(G.box(0.3, 0.34, 0.34), iron, 0, 0.27, 0), part(G.box(0.44, 0.46, 0.34), scrap, 0, 0.67, 0), part(G.sph(0.17, 8, 6), iron, 0, 1.03, 0),
        part(G.box(0.06, 0.5, 0.36), om, 0.26, 0.66, 0), part(G.box(0.2, 0.28, 0.16), mat(0x5a4a3a), -0.27, 0.7, 0));
      { const sp = part(G.cyl(0.015, 0.015, 1.3, 4), mat(0x8a8a90), 0.1, 0.8, -0.24); add(sp); add(part(G.cone(0.04, 0.14, 4), iron, 0.1, 1.5, -0.24)); }
      break;
    case 'cavalry':
      add(part(G.box(0.98, 0.28, 0.54), iron, 0, 0.36, 0), part(G.box(0.42, 0.3, 0.42), scrap, -0.18, 0.63, 0), part(G.box(0.98, 0.06, 0.2), om, 0, 0.52, 0));
      { const gun = part(G.cyl(0.07, 0.07, 0.66, 8), mat(0x2d3038), 0.5, 0.58, 0); gun.rotation.z = Math.PI / 2; add(gun);
        for (const [dx, dz] of [[0.32, 0.3], [-0.32, 0.3], [0.32, -0.3], [-0.32, -0.3]]) { const w = part(G.cyl(0.17, 0.17, 0.12, 10), mat(0x22242a), dx, 0.2, dz); w.rotation.x = Math.PI / 2; add(w); }
        add(part(G.cyl(0.05, 0.06, 0.34, 6), mat(0x2d3038), -0.38, 0.72, 0.15), part(G.sph(0.06, 6, 5), glow(0xff8a3a, 1.2), -0.38, 0.92, 0.15)); }
      break;
    case 'ship':
      add(part(G.box(1.15, 0.24, 0.52), mat(0x4a3a2c), 0, 0.12, 0), part(G.cone(0.27, 0.55, 4), mat(0x4a3a2c), 0.82, 0.12, 0), part(G.box(0.4, 0.28, 0.4), scrap, -0.3, 0.38, 0), part(G.box(1.0, 0.05, 0.1), om, 0, 0.26, 0.27), part(G.box(1.0, 0.05, 0.1), om, 0, 0.26, -0.27));
      { add(part(G.cyl(0.03, 0.03, 1.1, 5), mat(0x2d2a28), 0.15, 0.85, 0));
        const sail = part(new THREE.PlaneGeometry(0.62, 0.7), new THREE.MeshStandardMaterial({ name: 'owner', color: OWNER_COL[o], side: THREE.DoubleSide, flatShading: true, emissive: OWNER_COL[o], emissiveIntensity: 0.18 }), 0.15, 0.95, 0); sail.rotation.y = Math.PI / 2; add(sail);
        const gun = part(G.cyl(0.05, 0.05, 0.4, 6), mat(0x2d3038), 0.45, 0.35, 0); gun.rotation.z = Math.PI / 2; add(gun); }
      break;
    case 'leviathan': {
      const body = new THREE.MeshStandardMaterial({ color: 0x1f6f78, emissive: 0x0b4a55, emissiveIntensity: 0.6, flatShading: true, roughness: 0.4 });
      for (let i = 0; i < 9; i++) { const t = i / 8, r = 0.3 * (1 - 0.55 * t) + 0.05; add(part(G.sph(r, 8, 6), body, -0.95 + 1.9 * t, 0.1 + Math.sin(Math.PI * t) * 0.62, 0)); if (i > 0 && i < 8) add(part(G.cone(0.07, 0.22, 4), mat(0x0e3b44), -0.95 + 1.9 * t, 0.3 + Math.sin(Math.PI * t) * 0.62 + r * 0.6, 0)); }
      add(part(G.cone(0.2, 0.55, 6), body, 1.15, 0.2, 0), part(G.sph(0.045), glow(0xbafcff, 2), 1.0, 0.32, 0.12), part(G.sph(0.045), glow(0xbafcff, 2), 1.0, 0.32, -0.12));
      { const fin = part(G.cone(0.2, 0.6, 3), body, -1.1, 0.12, 0); fin.rotation.z = Math.PI / 2; add(fin); }
      break; }
    case 'inquisitor':
      add(part(G.cone(0.4, 1.3, 10), cloth, 0, 0.72, 0), part(G.tor(0.26, 0.04, Math.PI * 2, 12), glow(0xe8c477, 0.8), 0, 0.75, 0), part(G.sph(0.16), mat(0xe6cfa6), 0, 1.45, 0), part(G.cone(0.2, 0.34, 8), mat(0x8a7a52), 0, 1.58, -0.02), part(G.box(0.08, 0.4, 0.5), glow(0xe8c477, 0.5), 0.2, 0.9, 0));
      { const halo = part(G.tor(0.3, 0.03, Math.PI * 2, 20), glow(0xffe08a, 1.8), 0, 1.95, 0); halo.rotation.x = Math.PI / 2; halo.userData.spin = true; halo.name = 'halo'; add(halo); }
      break;
    case 'dragon': {
      const sk = new THREE.MeshStandardMaterial({ color: 0xcbbcff, emissive: 0x6a46d8, emissiveIntensity: 0.55, flatShading: true, roughness: 0.4 });
      const b = part(G.sph(0.32, 8, 6), sk, 0, 0.5, 0); b.scale.set(1.5, 0.85, 0.85); add(b);
      const neck = part(G.cyl(0.1, 0.17, 0.55, 6), sk, 0.5, 0.78, 0); neck.rotation.z = -0.8; add(neck);
      add(part(G.cone(0.12, 0.34, 5), sk, 0.82, 1.0, 0), part(G.sph(0.035), glow(0xffe08a, 2), 0.78, 1.08, 0.08), part(G.sph(0.035), glow(0xffe08a, 2), 0.78, 1.08, -0.08));
      { const tail = part(G.cone(0.13, 0.9, 5), sk, -0.78, 0.42, 0); tail.rotation.z = Math.PI / 2 + 0.2; add(tail); }
      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.7, 0, 0.1, 0.15, 0, 1.15, -0.35, 0, 1.0], 3)); wingGeo.setIndex([0, 1, 2, 1, 3, 2]); wingGeo.computeVertexNormals();
      const wm = new THREE.MeshStandardMaterial({ color: 0x8c6cf0, emissive: 0x4a2ab0, emissiveIntensity: 0.5, side: THREE.DoubleSide, flatShading: true, transparent: true, opacity: 0.92 });
      for (const s of [1, -1]) { const w = new THREE.Group(); w.position.set(0.05, 0.62, 0.15 * s); const wmsh = part(wingGeo, wm); wmsh.scale.z = s; w.add(wmsh); w.userData.wing = s; w.name = s > 0 ? 'wing_L' : 'wing_R'; add(w); }
      break; }
    case 'tower': {
      const body = mat(0x70727c);
      add(part(G.cyl(0.44, 0.5, 0.5, 8), mat(0x555863), 0, 0.25, 0), part(G.cyl(0.32, 0.4, 1.2, 8), body, 0, 1.0, 0), part(G.cyl(0.46, 0.4, 0.16, 8), iron, 0, 1.68, 0), part(G.cyl(0.44, 0.44, 0.1, 8), om, 0, 1.55, 0));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; add(part(G.box(0.14, 0.18, 0.14), iron, Math.cos(a) * 0.4, 1.84, Math.sin(a) * 0.4)); }
      add(part(G.sph(0.11, 6, 5), glow(0xff9a3a, 1.6), 0, 1.76, 0));
      { const pole = part(G.cyl(0.015, 0.015, 0.7, 4), iron, 0, 2.2, 0); add(pole); const flag = part(G.box(0.34, 0.2, 0.02), ownerMat(o, 0.4), 0.18, 2.4, 0); add(flag); flag.userData.flag = true; flag.name = 'flag'; }
      break; }
  }
  g.name = type; g.userData.top = TOPH[type];
  return g;
}

// Soft glow halos (not representable in glTF, so kept as data; override in assets/models/models.json)
export const GLOW = {
  leviathan: { color: 0x3ae8d0, size: 2.6, y: 0.5 }, inquisitor: { color: 0xffd37a, size: 1.8, y: 1.7 },
  dragon: { color: 0xa98aff, size: 2.4, y: 0.7 }, tower: { color: 0xff9a3a, size: 1.3, y: 1.8 },
};
export const TYPE_LIST = ['archer', 'infantry', 'cavalry', 'ship', 'leviathan', 'inquisitor', 'dragon', 'tower'];
