// THE TOWER GAME — high-detail miniatures (Albion-Online-like: chunky stylised proportions, smooth shading, hand-painted vertex colours,
// layered plate / cloth / leather / metal, readable silhouettes). Every figure is built from a small kit and MERGED per material, so a
// unit is ~10 meshes and exports to a light .glb.  Conventions as in models.js: faces +X while building (wrapped to +Z at the end),
// origin at the base centre, 1 unit = 1 tile, material 'owner' re-tinted per player, nodes 'wing_L' 'wing_R' 'flag' 'halo' 'orb' animate.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/utils/BufferGeometryUtils.js';
import { OWNER_COL, OWNER_DARK } from './models.js';

const Y0 = 0.11, H = 1.6;
const up = new THREE.Vector3(0, 1, 0);

// ── materials (smooth, vertex-coloured; userData.smooth tells the loader not to force flat shading) ──
function palette(o) {
  const mk = (name, color, { double, ...p } = {}) => { const m = new THREE.MeshStandardMaterial({ name, color, roughness: 0.62, metalness: 0, vertexColors: true, side: double ? THREE.DoubleSide : THREE.FrontSide, ...p }); m.userData.smooth = true; return m; };
  return {
    steel: mk('steel', 0x8d949d, { metalness: 0.55, roughness: 0.42 }), dark: mk('darksteel', 0x4d515c, { metalness: 0.5, roughness: 0.5 }),
    copper: mk('copper', 0xb8733a, { metalness: 0.75, roughness: 0.34 }), brass: mk('brass', 0xc9a24a, { metalness: 0.7, roughness: 0.36 }),
    leather: mk('leather', 0x5a3d28, { roughness: 0.85 }), dleather: mk('dleather', 0x33261c, { roughness: 0.9 }),
    cloth: mk('cloth', 0x30333a, { roughness: 0.95, double: true }), cloth2: mk('cloth_brown', 0x4a3426, { roughness: 0.95, double: true }),
    owner: mk('owner', OWNER_COL[o], { roughness: 0.85, double: true }), ownerDark: mk('ownerdark', OWNER_DARK[o], { roughness: 0.85, double: true }),
    skin: mk('skin', 0xc9a384, { roughness: 0.8 }), hair: mk('hair', 0xe6e2da, { roughness: 0.9 }), bone: mk('bone', 0xd8d0bd, { roughness: 0.8 }),
    wood: mk('wood', 0x8a6a45, { roughness: 0.9 }), dwood: mk('darkwood', 0x4f3a26, { roughness: 0.9 }), paper: mk('paper', 0xe9dcb8, { roughness: 0.95 }),
    stone: mk('stone', 0x5f626a, { roughness: 0.95 }), lstone: mk('lightstone', 0x8c8f95, { roughness: 0.95 }),
    powder: mk('powder', 0x93b5d1, { metalness: 0.35, roughness: 0.5 }), powderCloth: mk('powdercloth', 0x9fbdd6, { roughness: 0.95, double: true }),
    green: mk('camogreen', 0x56683a, { roughness: 0.95, double: true }), camoBrown: mk('camobrown', 0x6a4d33, { roughness: 0.95, double: true }),
    glow: new THREE.MeshStandardMaterial({ name: 'glow', color: 0x9fd0ff, emissive: 0x7fb8ff, emissiveIntensity: 1.4, roughness: 0.4, vertexColors: false }),
    ember: new THREE.MeshStandardMaterial({ name: 'ember', color: 0xffa24a, emissive: 0xff7a1a, emissiveIntensity: 1.2, roughness: 0.4, vertexColors: false }),
    horse: mk('horse', 0x6b4a33, { roughness: 0.85 }), horse2: mk('horse_dark', 0x2c2118, { roughness: 0.9 }), eye: new THREE.MeshStandardMaterial({ name: 'eye', color: 0xffd06a, emissive: 0xffa020, emissiveIntensity: 1.5, vertexColors: false }),
  };
}

// ── kit ──
export class Kit {
  constructor(o) { this.m = palette(o); this.root = new THREE.Group(); this.groups = new Map(); this.bags = new Map(); this.o = o; }
  group(name, pivot = [0, 0, 0]) { if (!this.groups.has(name)) { const g = new THREE.Group(); g.name = name; g.position.set(...pivot); g.userData.pivot = pivot; this.groups.set(name, g); this.root.add(g); } return this.groups.get(name); }
  // add a geometry: at (x,y,z) in the (group) frame, Euler rot, scale; tint 0..1 darkens/lightens the painted shade
  p(geo, key, { at = [0, 0, 0], rot = [0, 0, 0], sc = [1, 1, 1], tint = 1, grp = '' } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...sc));
    g.applyMatrix4(m); g.computeVertexNormals();
    const pv = grp ? this.groups.get(grp).userData.pivot : [0, 0, 0], pos = g.attributes.position, nor = g.attributes.normal, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {              // hand-painted look: lighter on top and on upward faces, darker low and in crevices
      const y = pos.getY(i) + pv[1], s = THREE.MathUtils.clamp(0.58 + 0.42 * (y / H) + 0.16 * nor.getY(i) - 0.06 * Math.abs(nor.getZ(i)), 0.3, 1.15) * tint;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = s;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const k = grp + '|' + key; if (!this.bags.has(k)) this.bags.set(k, []); this.bags.get(k).push(g); return this;
  }
  seg(a, b, r1, r2, key, o = {}) { return this.p(segGeo(a, b, r1, r2, o.sides || 10), key, o); }
  done() {
    for (const [k, list] of this.bags) {
      const [grp, key] = k.split('|'), mat = this.m[key]; if (!mat) throw new Error('no material ' + key);
      const mesh = new THREE.Mesh(mergeGeometries(list), mat); mesh.castShadow = mesh.receiveShadow = true; mesh.name = key;
      (grp ? this.groups.get(grp) : this.root).add(mesh);
    }
    return this.root;
  }
}

// ── geometry helpers ──
function segGeo(a, b, r1, r2, sides = 10) {            // tapered tube from a (radius r1) to b (radius r2)
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
  const g = new THREE.CylinderGeometry(r2, r1, len, sides, 1);
  g.applyMatrix4(new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(up, d.normalize()), new THREE.Vector3(1, 1, 1)));
  return g;
}
const rrect = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
export const rbox = (w, h, d, r = 0.02) => { const b = Math.min(0.018, w / 4, h / 4, d / 4), g = new THREE.ExtrudeGeometry(rrect(w - 2 * b, h - 2 * b, Math.max(0.002, r - b)), { depth: Math.max(0.002, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 3 }); g.translate(0, 0, -(d - 2 * b) / 2); return g; };
export const plate = (pts, d = 0.03, b = 0.01) => { const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 2, curveSegments: 3 }); g.translate(0, 0, -d / 2); return g; };
export const ell = (rx, ry = rx, rz = rx, w = 14, h = 10) => { const g = new THREE.SphereGeometry(1, w, h); g.scale(rx, ry, rz); return g; };
export const lathe = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
export const cyl = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
export const cone = (r, h, s = 10) => new THREE.ConeGeometry(r, h, s);
export const tor = (R, r, arc = Math.PI * 2, s = 20) => new THREE.TorusGeometry(R, r, 8, s, arc);
function cloth(w, h, { wave = 0.03, jag = 0.04, taper = 0.2, nx = 5, ny = 7, seed = 1 } = {}) {   // a hanging cloth panel in the XY plane (hem pointing -Y), rippled, ragged
  const g = new THREE.PlaneGeometry(w, h, nx, ny), p = g.attributes.position; let s = seed * 9301;
  const rnd = () => ((s = (s * 49297 + 233280) % 2147483647) / 2147483647);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), t = (h / 2 - y) / h;           // 0 top .. 1 hem
    p.setX(i, x * (1 - taper * t)); p.setZ(i, wave * Math.sin(x * 22 + seed) * (0.3 + t) + t * t * 0.03);
    if (t > 0.99) p.setY(i, y - jag * rnd());
  }
  return g;
}
const rot = (x = 0, y = 0, z = 0) => [x, y, z];

// ── a standard armoured humanoid; returns joints so each unit can add its own gear ──
function humanoid(k, c = {}) {
  const { bulk = 1, leg = 'dleather', boot = 'dark', torso = 'cloth', arm = 'cloth', lean = 0, plateLegs = false, plateArms = false, ownerTabard = false, hand = 'dark', shoulderPlates = true, headY = 1.03 } = c;
  const J = { feet: Y0, hip: Y0 + 0.44, chest: Y0 + 0.74, neck: Y0 + 0.93, head: Y0 + headY };
  for (const s of [1, -1]) {                                          // legs + boots
    const z = 0.1 * s * bulk, hip = [-0.01, J.hip, z], knee = [0.03 + lean * 0.02, Y0 + 0.23, z * 1.02], ankle = [0, Y0 + 0.06, z * 1.04];
    k.seg(hip, knee, 0.075 * bulk, 0.062 * bulk, leg).seg(knee, ankle, 0.062 * bulk, 0.055 * bulk, leg);
    k.p(ell(0.075 * bulk, 0.07 * bulk, 0.07 * bulk), plateLegs ? boot : leg, { at: [0.035, Y0 + 0.23, z * 1.02] });    // knee
    k.p(rbox(0.22, 0.1, 0.12 * bulk, 0.03), boot, { at: [0.06, Y0 + 0.07, z * 1.04] }); k.p(rbox(0.09, 0.14, 0.12 * bulk, 0.03), boot, { at: [-0.01, Y0 + 0.14, z * 1.04] });
    if (plateLegs) { k.seg([0.0, Y0 + 0.2, z], [0.0, Y0 + 0.08, z], 0.08 * bulk, 0.07 * bulk, boot); k.p(rbox(0.06, 0.1, 0.13 * bulk, 0.02), 'steel', { at: [0.07, Y0 + 0.24, z * 1.02] }); }
  }
  k.p(rbox(0.3 * bulk, 0.12, 0.3 * bulk, 0.05), torso, { at: [0, J.hip + 0.04, 0] });                            // hips
  k.p(ell(0.19 * bulk, 0.24, 0.2 * bulk), torso, { at: [lean * 0.04, J.chest - 0.02, 0] });                  // chest
  k.p(ell(0.15 * bulk, 0.1, 0.16 * bulk), torso, { at: [0, J.hip + 0.12, 0] });
  k.p(rbox(0.33 * bulk, 0.065, 0.34 * bulk, 0.02), 'dleather', { at: [0.005, J.hip + 0.12, 0] });                 // belt
  k.p(rbox(0.05, 0.055, 0.02, 0.01), 'brass', { at: [0.185 * bulk, J.hip + 0.12, 0] });
  k.seg([0, J.chest + 0.15, 0], [0, J.neck + 0.02, 0], 0.07, 0.06, torso);                                 // neck
  return J;
}
const armTo = (k, S, Hd, { r = 0.05, key = 'cloth', plate = false, fist = 'dark', side = 1, big = 1 } = {}) => {   // shoulder S -> hand Hd, elbow bent outward/down
  const E = [(S[0] + Hd[0]) / 2 - 0.05, (S[1] + Hd[1]) / 2 - 0.03, (S[2] + Hd[2]) / 2 + 0.05 * side];
  k.seg(S, E, r, r * 0.9, key).seg(E, Hd, r * 0.92, r * 1.0, key);
  k.p(ell(r * 1.05), key, { at: E });
  if (plate) { k.seg(lerp(E, Hd, 0.12), lerp(E, Hd, 0.92), r * 1.28, r * 1.45, plate === true ? 'dark' : plate); k.seg(lerp(E, Hd, 0.5), lerp(E, Hd, 0.56), r * 1.55, r * 1.55, 'steel'); k.p(rbox(0.1, 0.1, 0.1, 0.03), plate === true ? 'steel' : plate, { at: E, tint: 1.05 }); }
  k.p(ell(0.062 * big, 0.056 * big, 0.058 * big), fist, { at: Hd });
  return E;
};
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const pauldron = (k, x, y, z, s = 1, key = 'steel', trim = 'copper') => {          // layered shoulder guard: a flared dome plus overlapping lames stepping down and out
  const side = Math.sign(z) || 1, tilt = 0.45 * side;
  const dome = (r, h, rr) => lathe([[0.001, h], [r * 0.55, h * 0.93], [r * 0.9, h * 0.62], [r, h * 0.2], [rr, 0]], 16);
  k.p(dome(0.1 * s, 0.075 * s, 0.135 * s), key, { at: [x, y, z], rot: rot(tilt, 0, 0), sc: [1.05, 1, 0.9], tint: 1.05 });
  for (let i = 1; i <= 3; i++) k.p(lathe([[0.1 * s - i * 0.008, 0.012], [0.13 * s + i * 0.012, 0.0], [0.145 * s + i * 0.012, -0.022 * s]], 16), key, { at: [x, y - i * 0.042 * s, z + side * i * 0.012 * s], rot: rot(tilt, 0, 0), sc: [1.05, 1, 0.9], tint: 1.0 - i * 0.07 });
  k.p(tor(0.135 * s, 0.009 * s, Math.PI * 2, 20), trim, { at: [x, y + 0.0, z], rot: rot(Math.PI / 2 + tilt, 0, 0), sc: [1.05, 0.9, 1] });
  for (let i = 0; i < 4; i++) k.p(ell(0.012 * s), trim, { at: [x + 0.07 * s * Math.cos(i * 1.6), y + 0.06 * s, z + side * 0.04 * s + 0.07 * s * Math.sin(i * 1.6)] });
};
const helmPerforated = (k, x, y, z, s = 1, crest = true) => {      // closed great-helm with a perforated visor (the Iron Fist helm)
  k.p(lathe([[0.001, -0.14], [0.11, -0.13], [0.135, -0.05], [0.14, 0.04], [0.115, 0.12], [0.06, 0.17], [0.001, 0.185]], 18), 'dark', { at: [x, y, z], sc: [s, s, s] });
  k.p(rbox(0.07, 0.17, 0.2, 0.03), 'steel', { at: [x + 0.12 * s, y - 0.01 * s, z], sc: [s, s, s] });                    // visor plate
  k.p(rbox(0.012, 0.03, 0.14, 0.01), 'dark', { at: [x + 0.158 * s, y + 0.035 * s, z], sc: [s, s, s] });                // eye slit
  for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) k.p(cyl(0.007, 0.007, 0.02, 6), 'dark', { at: [x + 0.158 * s, y - 0.025 * s - r * 0.028 * s, z + c * 0.03 * s], rot: rot(0, 0, Math.PI / 2), sc: [s, s, s] });
  k.p(tor(0.14 * s, 0.01 * s, Math.PI * 2, 18), 'steel', { at: [x, y + 0.03 * s, z], rot: rot(Math.PI / 2, 0, 0) });
  if (crest) { k.p(cone(0.03 * s, 0.14 * s, 5), 'steel', { at: [x - 0.01 * s, y + 0.22 * s, z] }); for (const d of [-1, 1]) k.p(cone(0.02 * s, 0.09 * s, 5), 'steel', { at: [x - 0.015 * s, y + 0.18 * s, z + d * 0.04 * s], rot: rot(d * 0.35, 0, 0) }); }
};
const feet = (k, o) => k.p(cyl(0.3, 0.32, 0.03, 4), 'owner', { at: [0, 0.02, 0], rot: rot(0, Math.PI / 4, 0), tint: 1 });
// the stone plinth every miniature stands on, with a thin owner-coloured rim
const base = (k, s = 1) => { k.p(rbox(0.76 * s, 0.06, 0.76 * s, 0.05), 'stone', { at: [0, 0.03, 0] }); k.p(rbox(0.7 * s, 0.045, 0.7 * s, 0.04), 'lstone', { at: [0, 0.085, 0] }); k.p(rbox(0.725 * s, 0.012, 0.725 * s, 0.03), 'owner', { at: [0, 0.062, 0] }); };

// ═════════════════════════════ units ═════════════════════════════
const UNITS_HD = {
  infantry(k) {                                                    // Crown Levy / Foundation Company: padded, patched, numbered helm, spear, painted round shield, mason's tools
    const J = humanoid(k, { bulk: 1, torso: 'cloth2', leg: 'dleather', boot: 'leather', arm: 'cloth2' });
    k.p(ell(0.21, 0.19, 0.22), 'owner', { at: [0.012, J.chest - 0.12, 0], sc: [1, 1, 1], tint: 0.95 });                        // tabard
    k.p(plate([[-0.1, 0], [0.1, 0], [0.07, -0.26], [0, -0.32], [-0.07, -0.26]], 0.03), 'owner', { at: [0.175, J.hip + 0.08, 0], rot: rot(0, Math.PI / 2, 0) });
    k.p(plate([[-0.1, 0], [0.1, 0], [0.07, -0.3], [0, -0.36], [-0.07, -0.3]], 0.03), 'ownerDark', { at: [-0.17, J.hip + 0.08, 0], rot: rot(0, Math.PI / 2, 0) });
    pauldron(k, 0, J.neck - 0.04, 0.2, 0.75, 'leather', 'dark'); pauldron(k, 0, J.neck - 0.04, -0.2, 0.75, 'leather', 'dark');
    armTo(k, [0, J.neck - 0.06, 0.19], [0.17, Y0 + 0.62, 0.3], { key: 'cloth2', plate: 'leather', side: 1 });
    armTo(k, [0, J.neck - 0.06, -0.19], [0.14, Y0 + 0.78, -0.22], { key: 'cloth2', plate: 'leather', side: -1 });
    k.p(ell(0.125, 0.12, 0.125), 'skin', { at: [0.01, J.head, 0] });                                                          // head + kettle helm
    k.p(lathe([[0.001, 0], [0.13, 0.0], [0.145, 0.03], [0.12, 0.1], [0.06, 0.14], [0.001, 0.155]], 16), 'steel', { at: [0, J.head + 0.0, 0] });
    k.p(tor(0.19, 0.012, Math.PI * 2, 20), 'steel', { at: [0, J.head + 0.02, 0], rot: rot(Math.PI / 2, 0, 0), sc: [1, 1.1, 1] });
    k.p(rbox(0.02, 0.1, 0.03, 0.01), 'steel', { at: [0.135, J.head - 0.03, 0] }); k.p(rbox(0.03, 0.05, 0.09, 0.01), 'brass', { at: [0.142, J.head + 0.06, 0] });  // nasal + numbered ID plate
    k.p(ell(0.06, 0.05, 0.12), 'cloth2', { at: [-0.05, J.neck + 0.02, 0] });
    k.seg([0.04, Y0 - 0.0, 0.36], [0.04, Y0 + 1.3, 0.36], 0.018, 0.016, 'dwood'); k.p(plate([[0, 0], [0.05, 0.1], [0, 0.24], [-0.05, 0.1]], 0.012), 'steel', { at: [0.04, Y0 + 1.35, 0.36], rot: rot(0, Math.PI / 2, 0) });   // spear
    k.p(cyl(0.2, 0.2, 0.045, 18), 'owner', { at: [0.2, Y0 + 0.66, 0.3], rot: rot(0, 0, Math.PI / 2) }); k.p(tor(0.2, 0.02, Math.PI * 2, 22), 'steel', { at: [0.225, Y0 + 0.66, 0.3], rot: rot(0, Math.PI / 2, 0) });
    k.p(ell(0.04, 0.04, 0.04), 'steel', { at: [0.235, Y0 + 0.66, 0.3] });
    k.p(rbox(0.05, 0.16, 0.05, 0.015), 'wood', { at: [-0.12, J.hip + 0.03, -0.17], rot: rot(0.3, 0, 0.2) }); k.p(rbox(0.1, 0.06, 0.06, 0.015), 'steel', { at: [-0.12, J.hip + 0.12, -0.19], rot: rot(0.3, 0, 0.2) });   // mason's hammer
    k.seg([0.0, J.hip + 0.12, 0.17], [0.04, J.hip - 0.12, 0.2], 0.008, 0.008, 'leather'); k.p(ell(0.03), 'copper', { at: [0.04, J.hip - 0.14, 0.2] });   // measuring cord + plumb
  },
  heavy_infantry(k) {                                              // armoured military household: cathedral iron plate, great helm with crest, tower shield, warhammer
    const J = humanoid(k, { bulk: 1.25, torso: 'dark', leg: 'dark', boot: 'dark', plateLegs: true, headY: 1.06 });
    k.p(ell(0.23, 0.26, 0.26), 'steel', { at: [0.02, J.chest - 0.0, 0], tint: 1.0 }); k.p(rbox(0.06, 0.36, 0.32, 0.03), 'dark', { at: [0.215, J.chest - 0.02, 0] });   // breastplate + ridge
    k.p(plate([[-0.12, 0], [0.12, 0], [0.09, -0.28], [0, -0.36], [-0.09, -0.28]], 0.035), 'owner', { at: [0.2, J.hip + 0.05, 0], rot: rot(0, Math.PI / 2, 0) });
    k.p(plate([[-0.14, 0], [0.14, 0], [0.1, -0.34], [0, -0.42], [-0.1, -0.34]], 0.035), 'ownerDark', { at: [-0.22, J.hip + 0.06, 0], rot: rot(0, Math.PI / 2, 0) });
    for (let i = 0; i < 4; i++) k.p(rbox(0.07, 0.03, 0.36, 0.01), 'steel', { at: [0.2, J.hip + 0.06 - i * 0.03, 0], tint: 0.9 + i * 0.03 });     // faulds
    pauldron(k, 0, J.neck - 0.02, 0.28, 1.0, 'steel', 'brass'); pauldron(k, 0, J.neck - 0.02, -0.28, 1.0, 'steel', 'brass');
    k.p(rbox(0.12, 0.05, 0.28, 0.02), 'steel', { at: [0.06, J.neck + 0.0, 0] });                                                // gorget
    armTo(k, [0, J.neck - 0.07, 0.25], [0.2, Y0 + 0.62, 0.34], { r: 0.06, key: 'dark', plate: 'steel', side: 1, big: 1.2 });
    armTo(k, [0, J.neck - 0.07, -0.25], [0.2, Y0 + 0.86, -0.24], { r: 0.06, key: 'dark', plate: 'steel', side: -1, big: 1.2 });
    helmPerforated(k, 0.01, J.head + 0.02, 0, 1.1, true);
    k.p(plate([[-0.2, 0.0], [0.2, 0.0], [0.2, -0.45], [0, -0.72], [-0.2, -0.45]], 0.045, 0.012), 'steel', { at: [0.27, Y0 + 0.82, 0.42], rot: rot(0, Math.PI / 2, 0), sc: [1, 1, 1] });  // tower shield
    k.p(plate([[-0.16, -0.04], [0.16, -0.04], [0.16, -0.4], [0, -0.64], [-0.16, -0.4]], 0.03), 'owner', { at: [0.3, Y0 + 0.8, 0.42], rot: rot(0, Math.PI / 2, 0) });
    k.p(rbox(0.04, 0.5, 0.06, 0.015), 'brass', { at: [0.325, Y0 + 0.6, 0.42] }); k.p(ell(0.045), 'brass', { at: [0.33, Y0 + 0.75, 0.42] });
    k.seg([0.15, Y0 + 0.4, -0.3], [0.2, Y0 + 1.15, -0.3], 0.02, 0.02, 'dwood'); k.p(rbox(0.12, 0.11, 0.08, 0.02), 'steel', { at: [0.2, Y0 + 1.2, -0.3] }); k.p(cone(0.025, 0.12, 5), 'steel', { at: [0.2, Y0 + 1.32, -0.3] }); k.p(cone(0.02, 0.1, 5), 'steel', { at: [0.2, Y0 + 1.2, -0.38], rot: rot(Math.PI / 2, 0, 0) });  // warhammer
  },
  monk(k) {                                                        // Iron Fist: heavy bare-handed warrior, plated gauntlets, black tabard with owner stripes, perforated helm, scarf, pauldrons
    const J = humanoid(k, { bulk: 1.18, torso: 'cloth', leg: 'cloth', boot: 'dleather', plateLegs: false, lean: 1, headY: 1.04 });
    for (const s of [1, -1]) { k.p(rbox(0.1, 0.1, 0.1, 0.03), 'dark', { at: [0.07, Y0 + 0.27, 0.115 * s * 1.18] }); k.seg([0.03, Y0 + 0.26, 0.12 * s], [0.01, Y0 + 0.09, 0.12 * s], 0.075, 0.07, 'dleather'); k.p(rbox(0.04, 0.12, 0.13, 0.02), 'steel', { at: [0.075, Y0 + 0.11, 0.115 * s * 1.18] }); }
    k.p(ell(0.215, 0.27, 0.23), 'cloth', { at: [0.02, J.chest - 0.02, 0] });
    k.p(plate([[-0.06, 0], [0.06, 0], [0.05, -0.34], [0, -0.42], [-0.05, -0.34]], 0.03), 'owner', { at: [0.215, J.chest + 0.1, 0.08], rot: rot(0, Math.PI / 2, 0) });   // chest stripes
    k.p(plate([[-0.06, 0], [0.06, 0], [0.05, -0.34], [0, -0.42], [-0.05, -0.34]], 0.03), 'owner', { at: [0.215, J.chest + 0.1, -0.08], rot: rot(0, Math.PI / 2, 0) });
    k.p(plate([[-0.06, 0], [0.06, 0], [0.05, -0.5], [0, -0.58], [-0.05, -0.5]], 0.03), 'owner', { at: [0.2, J.hip + 0.05, 0.12], rot: rot(0, Math.PI / 2, 0) });          // skirt stripes
    k.p(plate([[-0.06, 0], [0.06, 0], [0.05, -0.5], [0, -0.58], [-0.05, -0.5]], 0.03), 'owner', { at: [0.2, J.hip + 0.05, -0.12], rot: rot(0, Math.PI / 2, 0) });
    k.p(plate([[-0.2, 0], [0.2, 0], [0.18, -0.52], [0, -0.62], [-0.18, -0.52]], 0.03), 'cloth', { at: [0.2, J.hip + 0.06, 0], rot: rot(0, Math.PI / 2, 0) });
    k.p(plate([[-0.22, 0], [0.22, 0], [0.2, -0.62], [0, -0.74], [-0.2, -0.62]], 0.03), 'cloth', { at: [-0.2, J.hip + 0.06, 0], rot: rot(0, Math.PI / 2, 0) });           // back panel / cloak
    k.p(rbox(0.04, 0.06, 0.34, 0.01), 'owner', { at: [-0.215, J.hip - 0.22, 0] });
    pauldron(k, 0, J.neck - 0.03, 0.29, 1.05, 'steel', 'brass'); pauldron(k, 0, J.neck - 0.03, -0.29, 1.05, 'steel', 'brass');
    k.p(lathe([[0.1, 0], [0.145, 0.05], [0.16, 0.12], [0.11, 0.16]], 14), 'cloth2', { at: [0.02, J.neck - 0.04, 0] });                      // scarf
    armTo(k, [0, J.neck - 0.07, 0.27], [0.34, Y0 + 0.78, 0.2], { r: 0.068, key: 'cloth', plate: 'dark', side: 1, big: 1.5, fist: 'steel' });     // lead fist forward
    armTo(k, [0, J.neck - 0.07, -0.27], [0.12, Y0 + 0.66, -0.3], { r: 0.068, key: 'cloth', plate: 'dark', side: -1, big: 1.5, fist: 'steel' });  // guard fist
    for (const f of [[0.34, Y0 + 0.78, 0.2], [0.12, Y0 + 0.66, -0.3]]) { k.p(rbox(0.1, 0.12, 0.12, 0.03), 'steel', { at: [f[0] + 0.03, f[1], f[2]] }); for (let i = -1; i <= 1; i++) k.p(ell(0.018), 'brass', { at: [f[0] + 0.09, f[1] + 0.02, f[2] + i * 0.035] }); }
    helmPerforated(k, 0.04, J.head + 0.0, 0, 1.0, true);
  },
  priest(k) {                                                      // War Priest: cathedral worn as armour — spired crown, filigree plate, open book, banner
    const J = humanoid(k, { bulk: 1.3, torso: 'dark', leg: 'dark', boot: 'dark', plateLegs: true, headY: 1.1 });
    k.p(ell(0.25, 0.3, 0.27), 'dark', { at: [0.015, J.chest + 0.0, 0] }); k.p(ell(0.2, 0.2, 0.23), 'owner', { at: [0.07, J.chest + 0.02, 0], tint: 0.9 });
    k.p(plate([[0, 0.16], [0.07, 0], [0.05, -0.18], [0, -0.26], [-0.05, -0.18], [-0.07, 0]], 0.03), 'brass', { at: [0.265, J.chest + 0.05, 0], rot: rot(0, Math.PI / 2, 0) });     // sunburst keystone
    for (const z of [-0.14, 0.14]) k.p(plate([[0, 0], [0.04, 0.12], [0, 0.26], [-0.04, 0.12]], 0.02), 'copper', { at: [0.24, J.chest - 0.06, z], rot: rot(0, Math.PI / 2, 0) });
    k.p(plate([[-0.18, 0], [0.18, 0], [0.16, -0.5], [0, -0.64], [-0.16, -0.5]], 0.035), 'paper', { at: [0.22, J.hip + 0.06, 0], rot: rot(0, Math.PI / 2, 0) });   // white surcoat
    k.p(plate([[-0.06, 0], [0.06, 0], [0.05, -0.5], [0, -0.58], [-0.05, -0.5]], 0.04), 'owner', { at: [0.235, J.hip + 0.06, 0], rot: rot(0, Math.PI / 2, 0) });                 // stole
    k.p(plate([[-0.2, 0], [0.2, 0], [0.17, -0.66], [0, -0.8], [-0.17, -0.66]], 0.035), 'ownerDark', { at: [-0.23, J.hip + 0.08, 0], rot: rot(0, Math.PI / 2, 0) });
    for (const s of [1, -1]) {
      pauldron(k, 0, J.neck - 0.0, 0.31 * s, 1.15, 'dark', 'copper');
      k.p(cone(0.05, 0.22, 5), 'dark', { at: [0.0, J.neck + 0.13, 0.33 * s], rot: rot(0.2 * s, 0, 0.1 * s) }); k.p(cone(0.04, 0.16, 5), 'copper', { at: [0.02, J.neck + 0.05, 0.4 * s], rot: rot(0.9 * s, 0, 0) });  // pauldron spikes
    }
    k.p(rbox(0.14, 0.06, 0.3, 0.02), 'dark', { at: [0.06, J.neck + 0.0, 0] });
    armTo(k, [0, J.neck - 0.07, 0.29], [0.3, Y0 + 0.82, 0.18], { r: 0.07, key: 'dark', plate: 'copper', side: 1, big: 1.25, fist: 'dark' });     // left hand holds the book
    armTo(k, [0, J.neck - 0.07, -0.29], [0.1, Y0 + 0.95, -0.3], { r: 0.07, key: 'dark', plate: 'copper', side: -1, big: 1.25, fist: 'dark' });    // right hand holds the banner pole
    // closed helm with horns
    k.p(lathe([[0.001, -0.15], [0.115, -0.14], [0.14, -0.05], [0.145, 0.05], [0.11, 0.14], [0.05, 0.19], [0.001, 0.21]], 18), 'dark', { at: [0.01, J.head, 0] });
    k.p(rbox(0.08, 0.18, 0.18, 0.03), 'dark', { at: [0.125, J.head - 0.0, 0] }); k.p(rbox(0.012, 0.025, 0.12, 0.008), 'ember', { at: [0.168, J.head + 0.03, 0] });
    for (const s of [1, -1]) { k.p(cone(0.03, 0.2, 5), 'copper', { at: [-0.02, J.head + 0.15, 0.13 * s], rot: rot(0.7 * s, 0, 0.2) }); k.p(cone(0.025, 0.13, 5), 'copper', { at: [0.05, J.head + 0.2, 0.05 * s], rot: rot(0.2 * s, 0, -0.1) }); }
    k.p(cone(0.04, 0.2, 5), 'dark', { at: [0.0, J.head + 0.3, 0] });
    // spired crown behind the head (the gothic cathedral facade as a halo)
    for (let i = -3; i <= 3; i++) { const a = i * 0.3, h = 0.34 - Math.abs(i) * 0.04; k.p(plate([[-0.04, 0], [0.04, 0], [0.03, h * 0.6], [0, h], [-0.03, h * 0.6]], 0.02), i % 2 ? 'copper' : 'brass', { at: [-0.17, J.head + 0.12 + Math.cos(a) * 0.04, Math.sin(a) * 0.3], rot: rot(0, Math.PI / 2 - a * 0.7, 0.0) }); }
    k.p(tor(0.3, 0.012, Math.PI, 24), 'brass', { at: [-0.17, J.head + 0.1, 0], rot: rot(0, Math.PI / 2, 0) });
    // open book with a glowing sigil
    k.p(rbox(0.2, 0.025, 0.14, 0.01), 'leather', { at: [0.4, Y0 + 0.86, 0.18], rot: rot(0, 0, -0.35) }); k.p(rbox(0.19, 0.012, 0.13, 0.005), 'paper', { at: [0.4, Y0 + 0.875, 0.18], rot: rot(0, 0, -0.35) });
    k.p(tor(0.04, 0.005, Math.PI * 2, 14), 'glow', { at: [0.4, Y0 + 0.89, 0.18], rot: rot(Math.PI / 2 - 0.35, 0, 0) });
    // banner
    k.seg([0.05, Y0 + 0.0, -0.34], [0.05, Y0 + 1.75, -0.34], 0.022, 0.02, 'dwood'); k.p(cone(0.035, 0.14, 6), 'brass', { at: [0.05, Y0 + 1.83, -0.34] }); k.p(ell(0.04), 'brass', { at: [0.05, Y0 + 1.74, -0.34] });
    const fl = k.group('flag', [0.05, Y0 + 1.6, -0.34]);
    k.p(cloth(0.36, 0.56, { wave: 0.04, taper: 0.1, seed: 3 }), 'owner', { at: [0.0, -0.28, 0.0], rot: rot(0, Math.PI / 2, 0), grp: 'flag' }); k.p(rbox(0.36, 0.03, 0.03, 0.01), 'brass', { at: [0, 0.0, 0.0], rot: rot(0, Math.PI / 2, 0), grp: 'flag' });
  },
  archer(k) {                                                      // powder-blue plate with copper trim and scratches, heavy bow, green/powder/brown camouflage cape (Salamander-legion style)
    const J = humanoid(k, { bulk: 1.05, torso: 'powder', leg: 'powder', boot: 'powder', plateLegs: true, lean: 1, headY: 1.02 });
    k.p(ell(0.2, 0.25, 0.21), 'powder', { at: [0.02, J.chest - 0.02, 0] }); k.p(rbox(0.05, 0.3, 0.26, 0.03), 'copper', { at: [0.2, J.chest + 0.0, 0] });
    k.p(rbox(0.04, 0.03, 0.34, 0.01), 'copper', { at: [0.2, J.chest + 0.13, 0] });
    for (const z of [-0.17, 0.17]) k.p(rbox(0.06, 0.2, 0.05, 0.015), 'powder', { at: [0.22, J.hip + 0.12, z], tint: 0.95 });
    for (let i = 0; i < 4; i++) k.p(rbox(0.07, 0.025, 0.3, 0.01), 'powder', { at: [0.17, J.hip + 0.07 - i * 0.03, 0], tint: 0.9 + i * 0.03 });                  // tassets
    for (let i = 0; i < 6; i++) k.p(rbox(0.012, 0.004, 0.06 + (i % 3) * 0.03, 0.002), 'copper', { at: [0.222, J.chest - 0.06 + i * 0.045, -0.06 + (i % 3) * 0.05], rot: rot(0, 0, 0.5 - i * 0.2) });   // copper scratches
    pauldron(k, 0, J.neck - 0.02, 0.26, 1.15, 'powder', 'copper'); pauldron(k, 0, J.neck - 0.02, -0.26, 1.15, 'powder', 'copper');
    for (let i = 0; i < 5; i++) { k.p(rbox(0.006, 0.004, 0.07, 0.002), 'copper', { at: [0.0 + i * 0.01, J.neck + 0.0 + i * 0.012, 0.29 + i * 0.01], rot: rot(0, 0.4, 0.8) }); }
    k.p(rbox(0.1, 0.05, 0.12, 0.02), 'owner', { at: [0.0, J.neck - 0.07, -0.29] });                                                                     // owner armband
    // hood + open-faced helm
    k.p(ell(0.125, 0.12, 0.125), 'skin', { at: [0.02, J.head, 0] }); k.p(lathe([[0.001, 0], [0.135, 0.0], [0.15, 0.04], [0.12, 0.12], [0.06, 0.17], [0.001, 0.18]], 16), 'powder', { at: [0.0, J.head - 0.0, 0] });
    k.p(rbox(0.04, 0.12, 0.05, 0.015), 'powder', { at: [0.14, J.head - 0.04, 0] }); k.p(tor(0.145, 0.01, Math.PI * 2, 18), 'copper', { at: [0.0, J.head + 0.025, 0], rot: rot(Math.PI / 2, 0, 0) });
    k.p(cone(0.025, 0.12, 5), 'copper', { at: [-0.04, J.head + 0.22, 0], rot: rot(0, 0, 0.3) });
    k.p(ell(0.09, 0.05, 0.13), 'green', { at: [-0.085, J.neck + 0.03, 0], tint: 0.9 });                                                                  // hood fold
    // heavy bow in the lead hand (a tall recurve with copper limb tips) + drawn arrow
    const B = [0.36, Y0 + 0.86, 0.12];
    armTo(k, [0, J.neck - 0.07, 0.27], [B[0] - 0.03, B[1], B[2]], { r: 0.058, key: 'powder', plate: 'copper', side: 1, big: 1.15, fist: 'leather' });
    armTo(k, [0, J.neck - 0.07, -0.27], [0.2, Y0 + 0.86, -0.1], { r: 0.058, key: 'powder', plate: 'powder', side: -1, big: 1.1, fist: 'leather' });
    const bow = (t) => [B[0] + 0.09 * Math.cos(t) - 0.0, B[1] + t * 0.0, 0];
    const pts = []; for (let i = 0; i <= 12; i++) { const t = (i / 12 - 0.5) * 2; pts.push([B[0] + 0.12 * (1 - t * t) * 0.9 + (t * t) * 0.14 - 0.0, B[1] + t * 0.62, B[2]]); }
    for (let i = 0; i < pts.length - 1; i++) k.seg(pts[i], pts[i + 1], i === 6 ? 0.03 : 0.02 + 0.004 * (1 - Math.abs(i - 6) / 6), 0.02 + 0.004 * (1 - Math.abs(i + 1 - 6) / 6), i < 2 || i > 9 ? 'copper' : 'dwood', { sides: 8 });
    k.p(ell(0.03, 0.05, 0.03), 'copper', { at: [pts[0][0], pts[0][1] - 0.02, B[2]] }); k.p(ell(0.03, 0.05, 0.03), 'copper', { at: [pts[12][0], pts[12][1] + 0.02, B[2]] });
    k.seg(pts[0], [0.2, Y0 + 0.86, -0.1], 0.004, 0.004, 'bone'); k.seg(pts[12], [0.2, Y0 + 0.86, -0.1], 0.004, 0.004, 'bone');
    k.seg([0.5, B[1], B[2]], [0.18, B[1] - 0.005, B[2] - 0.2], 0.01, 0.01, 'dwood'); k.p(cone(0.02, 0.07, 4), 'copper', { at: [0.53, B[1], B[2]], rot: rot(0, 0, -Math.PI / 2) });
    // quiver with heavy bolts
    k.p(cyl(0.065, 0.055, 0.46, 10), 'leather', { at: [-0.17, J.chest - 0.02, -0.12], rot: rot(0, 0, 0.35) }); k.p(tor(0.062, 0.01, Math.PI * 2, 12), 'copper', { at: [-0.14, J.chest + 0.2, -0.12], rot: rot(Math.PI / 2 + 0.0, 0, 0.35) });
    for (let i = 0; i < 4; i++) { k.seg([-0.14, J.chest + 0.2, -0.12 + (i - 1.5) * 0.02], [-0.1 + i * 0.01, J.chest + 0.4, -0.12 + (i - 1.5) * 0.03], 0.006, 0.006, 'dwood'); k.p(cone(0.014, 0.05, 4), 'copper', { at: [-0.1 + i * 0.01, J.chest + 0.43, -0.12 + (i - 1.5) * 0.03] }); }
    // camouflage cape: overlapping ragged panels in green, powder blue and brown
    const cam = ['green', 'powderCloth', 'camoBrown', 'green', 'camoBrown', 'powderCloth', 'green'];
    for (let i = 0; i < 7; i++) { const z = (i - 3) * 0.085, h = 0.78 - Math.abs(i - 3) * 0.05 + (i % 2) * 0.05; k.p(cloth(0.14, h, { wave: 0.03, jag: 0.07, taper: 0.1, seed: i + 2 }), cam[i], { at: [-0.2 - Math.abs(i - 3) * 0.012, J.neck - 0.02 - h / 2 + 0.06, z], rot: rot(0, Math.PI / 2, 0.14), tint: 0.92 + (i % 3) * 0.05 }); }
    k.p(rbox(0.05, 0.03, 0.46, 0.01), 'camoBrown', { at: [-0.14, J.neck - 0.0, 0] });
  },
  cavalry(k) { rider(k, false); },
  heavy_cavalry(k) { rider(k, true); },
  siege(k) {                                                       // cathedral-iron siege engine: braced frame, great wheels, throwing arm with a bell-metal counterweight
    k.p(rbox(0.95, 0.09, 0.5, 0.03), 'dwood', { at: [0, Y0 + 0.2, 0] }); k.p(rbox(0.9, 0.04, 0.54, 0.02), 'dark', { at: [0, Y0 + 0.265, 0] });
    for (const z of [0.3, -0.3]) for (const x of [-0.32, 0.32]) {
      k.p(cyl(0.17, 0.17, 0.06, 20), 'dwood', { at: [x, Y0 + 0.17, z], rot: rot(Math.PI / 2, 0, 0) }); k.p(tor(0.17, 0.022, Math.PI * 2, 22), 'dark', { at: [x, Y0 + 0.17, z], rot: rot(0, 0, 0) }); k.p(ell(0.045), 'brass', { at: [x, Y0 + 0.17, z + 0.03 * Math.sign(z)] });
      for (let i = 0; i < 6; i++) k.seg([x, Y0 + 0.17, z], [x + 0.16 * Math.cos(i * 1.05), Y0 + 0.17 + 0.16 * Math.sin(i * 1.05), z], 0.013, 0.013, 'dark');
    }
    for (const z of [0.2, -0.2]) { k.seg([-0.2, Y0 + 0.27, z], [-0.04, Y0 + 0.82, z], 0.04, 0.035, 'dwood'); k.seg([0.2, Y0 + 0.27, z], [0.04, Y0 + 0.82, z], 0.04, 0.035, 'dwood'); k.p(rbox(0.12, 0.08, 0.06, 0.02), 'dark', { at: [0, Y0 + 0.84, z] }); }
    k.seg([0, Y0 + 0.84, 0.2], [0, Y0 + 0.84, -0.2], 0.03, 0.03, 'steel');
    const arm = k.group('arm', [0, Y0 + 0.84, 0]);                                                                  // throwing arm (static pose, drawn back)
    k.p(rbox(1.0, 0.07, 0.07, 0.02), 'dwood', { at: [0.28, 0.12, 0], rot: rot(0, 0, 0.5), grp: 'arm' }); k.p(rbox(0.1, 0.1, 0.1, 0.03), 'steel', { at: [0.7, 0.34, 0], rot: rot(0, 0, 0.5), grp: 'arm' });
    k.p(cyl(0.1, 0.13, 0.22, 12), 'brass', { at: [-0.22, -0.12, 0], rot: rot(0, 0, 0.5), grp: 'arm' }); k.p(cyl(0.12, 0.14, 0.04, 12), 'dark', { at: [-0.22, -0.01, 0], rot: rot(0, 0, 0.5), grp: 'arm' });   // the bell
    k.p(ell(0.03, 0.045, 0.03), 'dark', { at: [-0.22, -0.26, 0], grp: 'arm' });
    k.seg([0.7, Y0 + 1.18, 0], [0.62, Y0 + 0.78, 0], 0.01, 0.01, 'leather'); k.p(ell(0.09, 0.07, 0.07), 'stone', { at: [0.6, Y0 + 0.74, 0] }); k.p(ell(0.06, 0.05, 0.06), 'dark', { at: [0.64, Y0 + 0.7, 0.06] });  // sling stone
    k.p(rbox(0.3, 0.05, 0.5, 0.02), 'owner', { at: [0.28, Y0 + 0.29, 0] }); k.p(rbox(0.04, 0.2, 0.4, 0.02), 'owner', { at: [-0.45, Y0 + 0.32, 0] });
    for (let i = 0; i < 6; i++) k.p(ell(0.012), 'brass', { at: [-0.44 + i * 0.16, Y0 + 0.27, 0.27] });
    k.p(rbox(0.18, 0.15, 0.2, 0.03), 'dwood', { at: [-0.12, Y0 + 0.36, 0.0] }); k.p(rbox(0.16, 0.1, 0.1, 0.02), 'steel', { at: [-0.12, Y0 + 0.36, 0.0], tint: 0.9 });
  },
  mage(k) {                                                        // Architect-school mage: tall collar, layered robes, runic sash, staff crowned with a spire, floating orb and rings
    const J = humanoid(k, { bulk: 0.95, torso: 'cloth', leg: 'cloth', boot: 'dleather', headY: 1.08 });
    k.p(lathe([[0.001, 0], [0.2, 0], [0.27, 0.14], [0.21, 0.5], [0.15, 0.66], [0.1, 0.76], [0.001, 0.8]], 18), 'cloth', { at: [0, Y0 + 0.0, 0] }); k.p(lathe([[0.001, 0], [0.22, 0], [0.285, 0.12], [0.26, 0.2]], 18), 'owner', { at: [0, Y0 + 0.0, 0], tint: 0.9 });
    k.p(plate([[-0.09, 0], [0.09, 0], [0.07, -0.58], [0, -0.7], [-0.07, -0.58]], 0.03), 'owner', { at: [0.2, J.chest + 0.14, 0], rot: rot(0, Math.PI / 2, 0.0) });
    k.p(rbox(0.28, 0.07, 0.27, 0.025), 'brass', { at: [0.0, J.hip + 0.08, 0] }); for (let i = 0; i < 5; i++) k.p(rbox(0.012, 0.03, 0.03, 0.005), 'glow', { at: [0.145, J.hip + 0.08, -0.1 + i * 0.05] });
    k.p(lathe([[0.1, 0], [0.19, 0.06], [0.23, 0.2], [0.17, 0.26], [0.09, 0.2]], 16), 'ownerDark', { at: [-0.01, J.neck - 0.02, 0] });                  // raised collar
    for (const s of [1, -1]) { pauldron(k, 0, J.neck - 0.04, 0.23 * s, 0.9, 'cloth', 'brass'); }
    armTo(k, [0, J.neck - 0.07, 0.21], [0.28, Y0 + 0.9, 0.16], { r: 0.055, key: 'cloth', plate: 'brass', side: 1, fist: 'skin' });
    armTo(k, [0, J.neck - 0.07, -0.21], [0.15, Y0 + 0.74, -0.22], { r: 0.055, key: 'cloth', plate: 'brass', side: -1, fist: 'skin' });
    k.p(ell(0.115, 0.125, 0.115), 'skin', { at: [0.02, J.head, 0] }); k.p(rbox(0.04, 0.05, 0.16, 0.02), 'dark', { at: [0.115, J.head + 0.03, 0] });  // half-mask over the eyes
    k.p(lathe([[0.001, 0], [0.145, 0.0], [0.165, 0.07], [0.14, 0.2], [0.07, 0.3], [0.001, 0.36]], 16), 'cloth', { at: [-0.02, J.head - 0.02, 0] }); k.p(cone(0.04, 0.2, 6), 'owner', { at: [-0.1, J.head + 0.22, 0], rot: rot(0, 0, 0.7) });
    k.p(ell(0.09, 0.1, 0.12), 'cloth', { at: [-0.1, J.neck + 0.02, 0] });
    k.seg([0.2, Y0 + 0.0, 0.34], [0.2, Y0 + 1.55, 0.34], 0.02, 0.016, 'dwood'); for (let i = 0; i < 4; i++) k.p(tor(0.03, 0.007, Math.PI * 2, 10), 'brass', { at: [0.2, Y0 + 0.5 + i * 0.28, 0.34], rot: rot(Math.PI / 2, 0, 0) });
    k.p(cone(0.045, 0.3, 4), 'brass', { at: [0.2, Y0 + 1.75, 0.34] }); for (const dz of [-1, 1]) k.p(plate([[0, 0], [0.025, 0.1], [0, 0.22], [-0.025, 0.1]], 0.015), 'brass', { at: [0.2, Y0 + 1.5, 0.34 + dz * 0.07], rot: rot(dz * 0.4, 0, 0) });
    k.group('orb', [0.2, Y0 + 1.62, 0.34]); k.p(ell(0.06), 'glow', { grp: 'orb' }); k.group('halo', [0.2, Y0 + 1.62, 0.34]); k.p(tor(0.1, 0.008, Math.PI * 2, 24), 'brass', { rot: rot(Math.PI / 2, 0, 0), grp: 'halo' }); k.p(tor(0.12, 0.006, Math.PI * 2, 24), 'glow', { rot: rot(Math.PI / 2 + 0.7, 0.4, 0), grp: 'halo' });
  },
  dragon(k) { wyvern(k); },
};

function horse(k, { armored = false, coat = 'horse' } = {}) {
  const Yb = Y0 + 0.5;
  k.p(ell(0.42, 0.21, 0.17), coat, { at: [0, Yb, 0] }); k.p(ell(0.22, 0.2, 0.17), coat, { at: [0.3, Yb + 0.02, 0] }); k.p(ell(0.22, 0.2, 0.18), coat, { at: [-0.3, Yb + 0.0, 0] });
  k.seg([0.34, Yb + 0.1, 0], [0.52, Yb + 0.46, 0], 0.13, 0.085, coat); k.p(ell(0.13, 0.09, 0.12), coat, { at: [0.6, Yb + 0.5, 0], rot: rot(0, 0, -0.5) });
  k.seg([0.58, Yb + 0.47, 0], [0.72, Yb + 0.38, 0], 0.075, 0.05, coat); k.p(ell(0.05, 0.045, 0.05), 'horse2', { at: [0.74, Yb + 0.36, 0] });
  for (const s of [1, -1]) { k.p(cone(0.025, 0.08, 5), coat, { at: [0.55, Yb + 0.64, 0.05 * s], rot: rot(0.2 * s, 0, 0.1) }); k.p(ell(0.014), 'eye', { at: [0.66, Yb + 0.54, 0.085 * s] }); }
  for (let i = 0; i < 7; i++) k.p(cone(0.03, 0.16, 4), 'horse2', { at: [0.4 + i * 0.03, Yb + 0.42 + i * 0.045, 0], rot: rot(0, 0, 0.9 - i * 0.05), tint: 0.9 });          // mane
  k.seg([-0.46, Yb + 0.08, 0], [-0.7, Yb - 0.24, 0], 0.06, 0.03, 'horse2'); k.p(ell(0.045, 0.1, 0.04), 'horse2', { at: [-0.72, Yb - 0.3, 0] });                    // tail
  const legs = [[0.32, 0.12, 0.2], [0.32, -0.12, -0.05], [-0.3, 0.12, -0.12], [-0.3, -0.12, 0.2]];   // [x, z, forward swing]
  for (const [x, z, sw] of legs) {
    const hip = [x, Yb - 0.08, z], knee = [x + sw * 0.4, Y0 + 0.26, z], fet = [x + sw * 0.15, Y0 + 0.1, z], hoof = [x + sw * 0.5, Y0 + 0.02, z];
    k.seg(hip, knee, 0.065, 0.045, coat).seg(knee, fet, 0.04, 0.032, coat); k.seg(fet, hoof, 0.034, 0.045, 'horse2'); k.p(cyl(0.05, 0.055, 0.03, 8), 'dark', { at: [hoof[0], hoof[1], hoof[2]] }); k.p(ell(0.05), coat, { at: knee });
  }
  if (armored) {                                                   // barding: chamfron, crinet, peytral, flanchards
    k.p(rbox(0.2, 0.1, 0.14, 0.03), 'steel', { at: [0.64, Yb + 0.5, 0], rot: rot(0, 0, -0.5) }); k.p(cone(0.03, 0.1, 5), 'brass', { at: [0.68, Yb + 0.58, 0], rot: rot(0, 0, -0.5) });
    for (let i = 0; i < 5; i++) k.p(rbox(0.09, 0.05, 0.1, 0.015), 'steel', { at: [0.38 + i * 0.045, Yb + 0.2 + i * 0.07, 0], rot: rot(0, 0, 0.9), tint: 0.95 });
    k.p(rbox(0.1, 0.34, 0.34, 0.04), 'steel', { at: [0.46, Yb - 0.02, 0] }); k.p(rbox(0.04, 0.2, 0.3, 0.02), 'brass', { at: [0.52, Yb - 0.0, 0] });
    for (const s of [1, -1]) k.p(rbox(0.5, 0.3, 0.04, 0.03), 'steel', { at: [-0.1, Yb - 0.04, 0.19 * s] });
    k.p(rbox(0.22, 0.04, 0.34, 0.02), 'steel', { at: [-0.45, Yb + 0.18, 0] });
  }
  // caparison + tack
  for (const s of [1, -1]) k.p(plate([[-0.3, 0.12], [0.2, 0.12], [0.2, -0.14], [0.05, -0.2], [-0.1, -0.14], [-0.3, -0.2]], 0.03), 'owner', { at: [0, Yb - 0.02, 0.185 * s], tint: 0.95 });
  k.p(rbox(0.3, 0.06, 0.36, 0.03), 'leather', { at: [-0.02, Yb + 0.21, 0] });
  k.seg([0.64, Yb + 0.46, 0.0], [0.4, Yb + 0.3, 0.0], 0.008, 0.008, 'leather');
}
function rider(k, heavy) {
  const sc = 0.82;
  horse(k, { armored: heavy, coat: heavy ? 'horse2' : 'horse' });
  const Yr = Y0 + 0.5 + 0.2;                                                                    // rider seated above the saddle
  const t = heavy ? 'dark' : 'cloth2', limb = heavy ? 'dark' : 'cloth2';
  for (const s of [1, -1]) { k.seg([-0.02, Yr + 0.06, 0.08 * s], [0.12, Yr - 0.12, 0.2 * s], 0.065, 0.055, limb); k.seg([0.12, Yr - 0.12, 0.2 * s], [0.1, Yr - 0.3, 0.21 * s], 0.052, 0.045, limb); k.p(rbox(0.16, 0.06, 0.08, 0.02), heavy ? 'steel' : 'leather', { at: [0.15, Yr - 0.33, 0.21 * s] }); }
  k.p(ell(0.19, 0.25, 0.19), heavy ? 'steel' : 'cloth2', { at: [-0.02, Yr + 0.3, 0] });
  if (!heavy) { k.p(ell(0.2, 0.18, 0.2), 'owner', { at: [0.0, Yr + 0.24, 0], tint: 0.95 }); k.p(rbox(0.05, 0.28, 0.3, 0.02), 'leather', { at: [-0.02, Yr + 0.3, 0] }); k.p(plate([[-0.1, 0], [0.1, 0], [0.12, -0.55], [-0.12, -0.55]], 0.02), 'ownerDark', { at: [-0.22, Yr + 0.52, 0], rot: rot(0, Math.PI / 2, 0.15) }); }          // light: cloak
  else { k.p(rbox(0.06, 0.34, 0.3, 0.03), 'dark', { at: [0.17, Yr + 0.3, 0] }); k.p(plate([[-0.14, 0], [0.14, 0], [0.12, -0.4], [-0.12, -0.4]], 0.03), 'owner', { at: [-0.2, Yr + 0.55, 0], rot: rot(0, Math.PI / 2, 0.1) }); }
  for (const s of [1, -1]) pauldron(k, 0, Yr + 0.52, 0.24 * s, heavy ? 1.15 : 0.8, heavy ? 'steel' : 'leather', heavy ? 'brass' : 'dark');
  armTo(k, [0.02, Yr + 0.48, 0.22], [0.4, Yr + 0.35, 0.26], { r: 0.052, key: limb, plate: heavy ? 'steel' : 'leather', side: 1, fist: 'dark' });
  armTo(k, [0.02, Yr + 0.48, -0.22], [0.36, Yr + 0.4, -0.2], { r: 0.052, key: limb, plate: heavy ? 'steel' : 'leather', side: -1, fist: 'dark' });
  if (heavy) helmPerforated(k, 0.0, Yr + 0.72, 0, 1.0, true);
  else { k.p(ell(0.12, 0.115, 0.12), 'skin', { at: [0.02, Yr + 0.7, 0] }); k.p(lathe([[0.001, 0], [0.135, 0], [0.15, 0.04], [0.11, 0.11], [0.001, 0.14]], 14), 'steel', { at: [0, Yr + 0.69, 0] }); k.p(rbox(0.025, 0.1, 0.03, 0.01), 'steel', { at: [0.135, Yr + 0.66, 0] }); k.p(ell(0.08, 0.05, 0.12), 'owner', { at: [-0.06, Yr + 0.58, 0] }); }
  // lance with an owner pennant (carried couched forward)
  k.seg([-0.15, Yr + 0.2, -0.2], [0.85, Yr + 0.5, 0.0], 0.02, 0.016, 'dwood'); k.p(cone(0.03, 0.2, 5), 'steel', { at: [0.97, Yr + 0.54, 0], rot: rot(0, 0, -Math.PI / 2 + 0.28) });
  k.p(plate([[0, 0.07], [0.2, 0.0], [0, -0.07]], 0.01), 'owner', { at: [0.7, Yr + 0.5, 0.0], rot: rot(0, 0, 0.28) });
  if (heavy) { k.p(plate([[-0.2, 0], [0.2, 0], [0.2, -0.36], [0, -0.58], [-0.2, -0.36]], 0.03), 'steel', { at: [0.2, Yr + 0.4, 0.32], rot: rot(0, Math.PI / 2, 0) }); k.p(plate([[-0.15, -0.03], [0.15, -0.03], [0.15, -0.3], [0, -0.5], [-0.15, -0.3]], 0.025), 'owner', { at: [0.225, Yr + 0.38, 0.32], rot: rot(0, Math.PI / 2, 0) }); }
  k.root.scale.setScalar(sc);
}

function wyvern(k) {                                               // perched wyvern: two legs gripping, wings as arms, S-neck, long tail hanging down
  const S = 1.0;
  k.p(ell(0.34, 0.2, 0.2), 'dark', { at: [0, 0.65, 0], rot: rot(0, 0, 0.35) }); k.p(ell(0.2, 0.18, 0.17), 'dark', { at: [-0.3, 0.48, 0] }); k.p(ell(0.17, 0.14, 0.16), 'steel', { at: [0.18, 0.62, 0], tint: 0.95 });
  for (let i = 0; i < 7; i++) k.p(cone(0.035, 0.12, 4), 'copper', { at: [-0.18 + i * 0.1, 0.84 - i * 0.015, 0], rot: rot(0, 0, -0.2) });                         // back spines
  for (const s of [1, -1]) { const hip = [-0.12, 0.42, 0.17 * s], knee = [0.06, 0.3, 0.2 * s], foot = [0.1, 0.12, 0.2 * s]; k.seg(hip, knee, 0.1, 0.07, 'dark'); k.seg(knee, foot, 0.07, 0.045, 'dark'); for (const z of [-1, 0, 1]) k.p(cone(0.02, 0.1, 4), 'bone', { at: [0.2, 0.06, 0.2 * s + z * 0.05], rot: rot(0, 0, -Math.PI / 2 + 0.3) }); k.p(ell(0.06), 'dark', { at: knee }); }
  k.seg([-0.32, 0.46, 0], [-0.78, 0.0, 0], 0.11, 0.03, 'dark', { sides: 8 }); k.p(plate([[0, 0.1], [0.08, 0], [0, -0.1], [-0.08, 0]], 0.02), 'copper', { at: [-0.8, -0.03, 0], rot: rot(0, Math.PI / 2, 0.3) });
  k.seg([0.2, 0.74, 0], [0.34, 1.0, 0], 0.1, 0.07, 'dark'); k.seg([0.34, 1.0, 0], [0.44, 1.3, 0], 0.07, 0.06, 'dark');
  k.p(ell(0.15, 0.085, 0.09), 'dark', { at: [0.55, 1.34, 0], rot: rot(0, 0, -0.2) }); k.p(ell(0.09, 0.05, 0.07), 'steel', { at: [0.68, 1.29, 0], rot: rot(0, 0, -0.35) });
  for (const s of [1, -1]) { k.p(cone(0.025, 0.24, 5), 'bone', { at: [0.44, 1.46, 0.08 * s], rot: rot(0.3 * s, 0, 0.9) }); k.p(ell(0.018), 'eye', { at: [0.62, 1.38, 0.07 * s] }); k.p(cone(0.012, 0.05, 4), 'bone', { at: [0.74, 1.24, 0.03 * s], rot: rot(0, 0, Math.PI) }); }
  for (let i = 0; i < 4; i++) k.p(cone(0.02, 0.09, 4), 'copper', { at: [0.3 + i * 0.04, 1.1 + i * 0.07, 0], rot: rot(0, 0, 0.5) });
  const wingGeo = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.1, 0.55, 0.22, 0.12, 1.05, 0.72, 0.18, 0.72, 1.25, 0.12, 0.28, 1.12, -0.28, 0.06, 0.62, -0.3, 0.1, 0.1], 3)); g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1]); g.computeVertexNormals(); return g; })();
  for (const [s, name] of [[1, 'wing_L'], [-1, 'wing_R']]) {
    k.group(name, [0.02, 0.85, 0.2 * s]);
    const mg = wingGeo.clone(); mg.scale(1, 1, s); k.p(mg, 'owner', { grp: name, tint: 0.92 });
    k.seg([0, 0, 0], [-0.06 * 0, 0.55, 0.22 * s], 0.035, 0.026, 'dark', { grp: name }); k.seg([-0.1 * 0, 0.55, 0.22 * s], [0.12, 1.05, 0.72 * s], 0.026, 0.016, 'dark', { grp: name });
    k.seg([0.0, 0.55, 0.22 * s], [0.18, 0.72, 1.25 * s], 0.014, 0.008, 'bone', { grp: name }); k.seg([0.0, 0.55, 0.22 * s], [0.12, 0.28, 1.12 * s], 0.014, 0.008, 'bone', { grp: name });
  }
}

export const HD_TYPES = Object.keys(UNITS_HD);
export const HD_TOP = { infantry: 1.55, heavy_infantry: 1.75, cavalry: 1.9, heavy_cavalry: 2.0, archer: 1.65, monk: 1.5, priest: 2.15, siege: 1.45, mage: 2.2, dragon: 2.1 };
export function buildHD(type, o) {
  const k = new Kit(o); base(k, /cavalry/.test(type) ? 1.25 : 1); UNITS_HD[type](k);
  const root = k.done(); const wrap = new THREE.Group(); root.rotation.y = -Math.PI / 2; wrap.add(root); wrap.name = type; wrap.userData.top = HD_TOP[type];
  return wrap;
}
