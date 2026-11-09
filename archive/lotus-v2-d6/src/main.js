import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import * as R from './rules.js';
import { aiTurn, aiPlaceStart } from './ai.js';
import { OWNER_COL, G, mat, glow, part, sprite, glowTex } from './models.js';
import { loadLibrary, makeModel, topOf } from './modelLib.js';

const SIZE = +new URLSearchParams(location.search).get('size') || 75;   // ?size=151 for a 150+ board
R.configure(SIZE);
const { N, C } = R;
const SC = N / 75;
const $ = (id) => document.getElementById(id);
const wx = (x) => x - C, wz = (y) => y - C;

// ───────────────────────── renderer / scene ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2a2630, 110 * SC, 260 * SC);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 900 * SC);
camera.position.set(0, N * 0.8, N * 0.75);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.46; controls.minDistance = 8; controls.maxDistance = N * 2.2;
controls.update();

scene.add(new THREE.HemisphereLight(0xb4c8ea, 0x3a3024, 1.5));
const sun = new THREE.DirectionalLight(0xffdcae, 2.1);
sun.position.set(-N * 0.6, N * 0.95, N * 0.45);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -N * 0.72, right: N * 0.72, top: N * 0.72, bottom: -N * 0.72, near: 1, far: 320 * SC });
sun.shadow.bias = -0.0004;
scene.add(sun);
const templeLight = new THREE.PointLight(0x66e0ff, 14, 14, 1.6);
templeLight.position.set(0, 2.4, 0);
scene.add(templeLight);

// sky dome + stars
{
  const g = new THREE.SphereGeometry(600 * SC, 24, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 p;void main(){float h=normalize(p).y;vec3 lo=vec3(.55,.38,.32),mid=vec3(.16,.2,.32),hi=vec3(.03,.05,.12);vec3 c=mix(lo,mid,smoothstep(-.05,.25,h));c=mix(c,hi,smoothstep(.2,.8,h));gl_FragColor=vec4(c,1.);}',
  });
  scene.add(new THREE.Mesh(g, m));
  const pos = []; for (let i = 0; i < 700; i++) { const a = Math.random() * 6.283, b = Math.random() * 1.2 + 0.12, r = 560 * SC; pos.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.3, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 })));
}

// ───────────────────────── terrain ─────────────────────────
const board = R.makeBoard();
const terrainTop = (t) => (t === R.TEMPLE ? 0.25 : t === R.WATER || t === R.LAKE ? -0.4 : 0);
const zoneTint = { WN: 0x6f7e62, EN: 0x7d7060, WS: 0x5f7080, ES: 0x7a6370, island: 0xa8935f };
function buildTerrain() {
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const land = [], wat = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) (R.isWaterT(board.terr[R.ix(x, y)]) ? wat : land).push([x, y]);
  const lm = new THREE.InstancedMesh(G.box(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.05 }), land.length);
  const wm = new THREE.InstancedMesh(G.box(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), wat.length);
  lm.receiveShadow = true; lm.castShadow = true; wm.receiveShadow = false;
  const rnd = R.mulberry32(7);
  land.forEach(([x, y], i) => {
    const t = board.terr[R.ix(x, y)];
    const top = terrainTop(t), h = t === R.TEMPLE ? 1.1 : 0.9 + rnd() * 0.0;
    dummy.position.set(wx(x), top - h / 2, wz(y)); dummy.scale.set(0.985, h, 0.985); dummy.updateMatrix(); lm.setMatrixAt(i, dummy.matrix);
    let c = t === R.TEMPLE ? 0xd8d2bd : t === R.BRIDGE ? 0x4b4d57 : zoneTint[R.zoneOf(x, y)];
    col.set(c); col.offsetHSL(0, 0, (rnd() - 0.5) * 0.06); if ((x + y) % 2 === 0 && t !== R.TEMPLE) col.offsetHSL(0, 0, 0.012);
    lm.setColorAt(i, col);
  });
  wat.forEach(([x, y], i) => {
    dummy.position.set(wx(x), -1.3, wz(y)); dummy.scale.set(1, 1.8, 1); dummy.updateMatrix(); wm.setMatrixAt(i, dummy.matrix);
    col.set(board.terr[R.ix(x, y)] === R.LAKE ? 0x0f5a74 : 0x12526a); col.offsetHSL(0, 0, (rnd() - 0.5) * 0.04); wm.setColorAt(i, col);
  });
  scene.add(lm, wm);
  // outer slab under everything
  const slab = part(G.box(N + 60, 3, N + 60), mat(0x0d1015)); slab.position.y = -3.4; slab.castShadow = false; scene.add(slab);
  // water surface
  const wg = new THREE.PlaneGeometry(N + 4, N + 4, Math.min(120, N), Math.min(120, N)); wg.rotateX(-Math.PI / 2);
  const wmesh = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0x1d6b86, emissive: 0x06303f, emissiveIntensity: 0.9, transparent: true, opacity: 0.8, roughness: 0.25, metalness: 0.4, flatShading: true }));
  wmesh.position.y = -0.4; wmesh.receiveShadow = false; scene.add(wmesh);
  waterMesh = wmesh; waterBase = Float32Array.from(wg.attributes.position.array);
  // props: rocks + dead spires on loose land
  const rocks = new THREE.InstancedMesh(G.sph(0.18, 5, 4), mat(0x59585a), Math.round(190 * SC * SC)), spires = new THREE.InstancedMesh(G.cone(0.07, 0.8, 5), mat(0x2b2623), Math.round(80 * SC * SC));
  let ri = 0, si = 0; const r2 = R.mulberry32(99);
  const RMAX = Math.round(190 * SC * SC), SMAX = Math.round(80 * SC * SC);
  for (let n = 0; n < 900 * SC * SC && (ri < RMAX || si < SMAX); n++) {
    const x = Math.floor(r2() * N), y = Math.floor(r2() * N), t = board.terr[R.ix(x, y)];
    if (t !== R.LAND || (Math.abs(x - C) <= 9 && Math.abs(y - C) <= 9 && r2() < 0.7)) continue;
    const px = wx(x) + (r2() - 0.5) * 0.7, pz = wz(y) + (r2() - 0.5) * 0.7;
    if (r2() < 0.7 && ri < RMAX) { dummy.position.set(px, 0.02, pz); const s = 0.4 + r2() * 0.9; dummy.scale.set(s, s * 0.6, s); dummy.rotation.set(r2(), r2() * 6, 0); dummy.updateMatrix(); rocks.setMatrixAt(ri++, dummy.matrix); }
    else if (si < SMAX) { dummy.position.set(px, 0.3 + r2() * 0.25, pz); const s = 0.7 + r2() * 1.2; dummy.scale.set(1, s, 1); dummy.rotation.set((r2() - 0.5) * 0.3, 0, (r2() - 0.5) * 0.3); dummy.updateMatrix(); spires.setMatrixAt(si++, dummy.matrix); }
  }
  rocks.count = ri; spires.count = si; rocks.castShadow = spires.castShadow = true; scene.add(rocks, spires);
  dummy.rotation.set(0, 0, 0);
  // Water Temple dressing + sunken cathedral ruins in the lake
  const stone = mat(0xe0dbc8), dark = mat(0x3a3d46);
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const p = part(G.cyl(0.13, 0.16, 1.5, 7), stone, dx * 1.42, 0.25 + 0.75, dy * 1.42); scene.add(p);
    const cap = part(G.box(0.4, 0.12, 0.4), stone, dx * 1.42, 2.05, dy * 1.42); scene.add(cap);
  }
  templeRing = part(G.tor(0.85, 0.05, Math.PI * 2, 32), glow(0x7ee8ff, 1.4), 0, 2.6, 0); templeRing.rotation.x = Math.PI / 2; scene.add(templeRing);
  scene.add(Object.assign(sprite(0x66e0ff, 5, 2.4)));
  const rr = R.mulberry32(5);
  for (let i = 0; i < 26; i++) {
    const a = rr() * 6.283, d = 3.2 + rr() * 3.0; const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) < 0.7 || Math.abs(z) < 0.7) continue;
    const h = 0.6 + rr() * 1.4; const p = part(G.cyl(0.1 + rr() * 0.08, 0.17, h, 6), dark, x, -0.55 + h / 2 - 0.2, z);
    p.rotation.set((rr() - 0.5) * 0.4, 0, (rr() - 0.5) * 0.4); scene.add(p);
  }
}
let waterMesh, waterBase, templeRing;
buildTerrain();
// control point markers: gold = unclaimed, blue/red = claimed by a Tower
const cpMarkers = R.CONTROL_POINTS.map((p) => {
  const g = new THREE.Group(); g.position.set(wx(p.x), 0.02, wz(p.y));
  const ringM = new THREE.Mesh(G.tor(0.62, 0.05, Math.PI * 2, 28), new THREE.MeshBasicMaterial({ color: 0xe8c477, transparent: true, opacity: 0.95 })); ringM.rotation.x = Math.PI / 2; ringM.position.y = 0.05; g.add(ringM);
  const beamM = new THREE.Mesh(G.cyl(0.04, 0.04, 6, 6), new THREE.MeshBasicMaterial({ color: 0xe8c477, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); beamM.position.y = 3; g.add(beamM);
  const sp = sprite(0xe8c477, 2.2, 0.3); g.add(sp); scene.add(g);
  return { p, ringM, beamM, sp };
});
function updateCPMarkers() {
  for (const m of cpMarkers) {
    const o = S ? R.cpOwner(S, m.p) : -1, c = o < 0 ? 0xe8c477 : OWNER_COL[o];
    m.ringM.material.color.setHex(c); m.beamM.material.color.setHex(c); m.sp.material.color.setHex(c);
  }
}
function focusOn(x, y, dist = 26) {          // frame a board square (used after you place your first Tower)
  controls.target.set(wx(x), 0, wz(y)); camera.position.set(wx(x) + 4, dist * 0.8, wz(y) + dist); controls.update();
}

function setPips(entry, u) {
  const old = entry.pips; if (old) entry.group.remove(old);
  if (u.type === 'tower') { entry.pips = null; return; }
  const p = new THREE.Group(); const pm = glow(0xffd36a, 1.3);
  for (let i = 0; i < u.level; i++) { const o = new THREE.Mesh(G.cone(0.065, 0.14, 4), pm); o.position.set((i - (u.level - 1) / 2) * 0.17, 0, 0); p.add(o); }
  p.position.y = topOf(u.type) + 0.18; entry.group.add(p); entry.pips = p;
}

// ───────────────────────── game state + mesh sync ─────────────────────────
let S = null;
const ents = new Map();   // uid → {group, u, tgt, hop, dying, born, pips}
const unitLayer = new THREE.Group(); scene.add(unitLayer);
const fx = [];            // transient effects
const fxLayer = new THREE.Group(); scene.add(fxLayer);

function yFor(u) {
  if (u.type === 'tower') return terrainTop(R.terrAt(S, u.x, u.y));
  if (u.type === 'ship' || u.type === 'leviathan') return -0.34;
  const t = R.terrAt(S, u.x, u.y);
  let y = t === R.TEMPLE ? 0.25 : 0;
  if (S.tg[R.ix(u.x, u.y)]) y = 2.0;
  if (u.type === 'dragon') y += 0.3; if (u.type === 'inquisitor') y += 0.15;
  return y;
}
const worldPos = (x, y, h = 0) => new THREE.Vector3(wx(x), h, wz(y));
function ensureEnt(u) {
  let e = ents.get(u.uid);
  if (e) return e;
  const group = makeModel(u.type, u.owner);
  const ring = new THREE.Mesh(G.tor(0.42, 0.035, Math.PI * 2, 20), new THREE.MeshBasicMaterial({ color: OWNER_COL[u.owner], transparent: true, opacity: 0.9 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; if (u.type !== 'tower') group.add(ring);
  group.userData.uid = u.uid;
  e = { group, u, tgt: worldPos(u.x, u.y, yFor(u)), hop: 1, dying: 0, born: 0, pips: null, ring };
  group.position.copy(e.tgt);
  if (u.type !== 'tower') group.rotation.y = u.owner === 0 ? Math.PI : 0;
  unitLayer.add(group); ents.set(u.uid, e); setPips(e, u);
  return e;
}
function syncAll() {
  for (const u of S.units) { const e = ensureEnt(u); e.u = u; e.tgt.copy(worldPos(u.x, u.y, yFor(u))); }
  // refresh tower height when something steps onto a tower
}

function ring(pos, col, maxR = 1.6, dur = 0.7) {
  const m = new THREE.Mesh(G.tor(1, 0.04, Math.PI * 2, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = Math.PI / 2; m.position.copy(pos); m.position.y += 0.1; fxLayer.add(m); fx.push({ kind: 'ring', m, t: 0, dur, maxR });
}
function burst(pos, col, n = 14, spd = 3) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(G.sph(0.06, 4, 3), new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(pos); const a = Math.random() * 6.283, up = Math.random() * 0.9 + 0.2;
    fxLayer.add(m); fx.push({ kind: 'p', m, t: 0, dur: 0.55 + Math.random() * 0.3, v: new THREE.Vector3(Math.cos(a) * spd * Math.random(), up * spd, Math.sin(a) * spd * Math.random()) });
  }
}
function beam(a, b, col, dur = 0.28) {
  const d = b.clone().sub(a), len = d.length();
  const m = new THREE.Mesh(G.cyl(0.05, 0.05, len, 5), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  fxLayer.add(m); fx.push({ kind: 'beam', m, t: 0, dur });
}
function column(pos, col) {
  const m = new THREE.Mesh(G.cyl(0.5, 0.9, 9, 12, 1), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(pos); m.position.y += 4.5; fxLayer.add(m); fx.push({ kind: 'col', m, t: 0, dur: 1.4 });
  ring(pos, col, 3.2, 1.0); setTimeout(() => ring(pos, col, 2.2, 0.9), 250); burst(pos, col, 30, 4);
}
const headPos = (e) => e.group.position.clone().setY(e.group.position.y + Math.max(0.5, topOf(e.u.type) * 0.55));

function flush() {
  syncAll();
  const evs = S.events.splice(0);
  let logDirty = false;
  for (const ev of evs) {
    const e = ents.get(ev.uid);
    switch (ev.t) {
      case 'spawn': if (e) { e.born = 0.001; e.group.scale.setScalar(0.001); ring(e.tgt, OWNER_COL[e.u.owner], 1.2, 0.5); } break;
      case 'move': if (e) {
        const dx = e.tgt.x - e.group.position.x, dz = e.tgt.z - e.group.position.z;
        if (e.u.type !== 'tower' && (dx || dz)) e.heading = Math.atan2(dx, dz); e.hop = 0; } break;
      case 'attack': { const t = ents.get(ev.tuid); if (e && t) {
        const a = headPos(e), b = headPos(t); const col = ev.raze ? 0xffc060 : OWNER_COL[e.u.owner];
        if (ev.shot) beam(a, b, col); burst(b, 0xffd080, 22, 2.5);
        const dx = t.group.position.x - e.group.position.x, dz = t.group.position.z - e.group.position.z; if (e.u.type !== 'tower') e.heading = Math.atan2(dx, dz);
      } break; }
      case 'remove': { const t = ents.get(ev.uid); if (t) { t.dying = 0.001; const col = ev.why === 'sacrifice' ? 0xe8c477 : ev.why === 'raze' ? 0xff9a3a : 0xffffff; burst(t.group.position.clone().setY(t.group.position.y + 0.5), col, ev.why === 'raze' ? 40 : 14, ev.why === 'raze' ? 4.5 : 3); if (ev.why === 'sacrifice') ring(t.group.position, 0xe8c477, 2.2, 0.9); } break; }
      case 'chain': if (e) ring(e.group.position, 0xffffff, 1.6, 0.5); break;
      case 'level': if (e) { setPips(e, e.u); ring(e.group.position, 0xffd36a, 1.4, 0.7); } break;
      case 'empower': { const t = ents.get(ev.tuid); if (e && t) { beam(headPos(e), headPos(t), 0xffe08a, 0.6); } break; }
      case 'lotus': if (e) { e.born = 0.001; e.group.scale.setScalar(0.001); column(e.tgt, e.u.type === 'leviathan' ? 0x3ae8d0 : e.u.type === 'inquisitor' ? 0xffd37a : 0xa98aff); } break;
      case 'ritualEnd': showRolls(ev.rolls); break;
      case 'log': logDirty = true; break;
    }
  }
  if (logDirty) { renderLog(); persist(); }
  refreshUI();
}

// ───────────────────────── highlights / selection / hover ─────────────────────────
const hlMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false }), N * N);
hlMesh.count = 0; hlMesh.frustumCulled = false; hlMesh.renderOrder = 2; scene.add(hlMesh);
hlMesh.setColorAt(0, new THREE.Color(1, 1, 1));
const HLCOL = { move: new THREE.Color(0x3fd0ff), attack: new THREE.Color(0xff3b3b), summon: new THREE.Color(0xffd24a), ok: new THREE.Color(0x6dff9a) };
function setHighlights(list) {
  const d = new THREE.Object3D(); let i = 0;
  for (const h of list) {
    const t = R.terrAt(S, h.x, h.y);
    d.position.set(wx(h.x), terrainTop(t) + 0.03 + (R.isWaterT(t) ? 0.05 : 0), wz(h.y)); d.updateMatrix();
    hlMesh.setMatrixAt(i, d.matrix); hlMesh.setColorAt(i, HLCOL[h.k]); i++;
  }
  hlMesh.count = i; hlMesh.instanceMatrix.needsUpdate = true; if (hlMesh.instanceColor) hlMesh.instanceColor.needsUpdate = true;
}
const selRing = new THREE.Mesh(G.tor(0.55, 0.05, Math.PI * 2, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }));
selRing.rotation.x = Math.PI / 2; selRing.visible = false; scene.add(selRing);
const cursor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }));
cursor.renderOrder = 3; cursor.visible = false; scene.add(cursor);

const ui = { sel: null, empowering: false, rolling: false, aiBusy: false, hover: null, started: false };
function hlForState() {
  const list = [];
  if (!S || S.winner !== null) return list;
  if (S.current !== 0) return list;
  if (S.mode === 'summon') for (const t of R.summonTiles(S, 0, R.SUMMON[S.roll])) list.push({ ...t, k: 'summon' });
  if (S.mode === 'move' && ui.sel && R.canActivate(S, ui.sel)) {
    const u = ui.sel;
    if (ui.empowering) for (const t of R.empowerTargets(S, u)) list.push({ x: t.x, y: t.y, k: 'summon' });
    else {
      for (const k of R.reachable(S, u).keys()) list.push({ x: k % N, y: Math.floor(k / N), k: 'move' });
      for (const t of R.targets(S, u)) list.push({ x: t.x, y: t.y, k: 'attack' });
    }
  }
  if (S.mode === 'ritual') for (const u of R.sacrificeCandidates(S, 0)) list.push({ x: u.x, y: u.y, k: R.lotusOptions(S, 0, u, u.uid).length ? 'ok' : 'summon' });   // green = a Lotus is possible from here
  return list;
}
function select(u) {
  ui.sel = u; ui.empowering = false;
  refreshUI();
}

// ───────────────────────── UI ─────────────────────────
const LORE = {
  archer: ['The Children of the Last Watch', 'They are not taught whose lives matter.'],
  infantry: ['The Counted', 'One soldier can die. A formation must survive.'],
  cavalry: ['The Iron Pilgrims', 'A soldier who stops moving has already surrendered.'],
  ship: ['The Drowned Fleets', 'The Admiralty records these as operational losses. The sailors call them offerings.'],
  leviathan: ['The Hunger Beneath — Water Lotus', 'It does not protect them. It tolerates them.'],
  inquisitor: ['The Last Confession — Earth Lotus', 'It removes the permission to be afraid.'],
  dragon: ['The Exiled Heaven — Air Lotus', 'It is simply trying to remember the way home.'],
  tower: ['The Last Walls', 'A declaration that someone owns the ground beneath it.'],
};
const LOTUS_FX = { leviathan: 'Sacrifice: +1 Level to an ally.', inquisitor: 'Sacrifice: +1 Level to an ally.', dragon: 'Sacrifice: +1 Level to an ally. Dies if its Tower falls.' };
const TERR_NAME = { [R.LAND]: 'Wasteland', [R.WATER]: 'Water', [R.LAKE]: 'Lake (Leviathans forbidden)', [R.TEMPLE]: 'Water Temple (rules to come)', [R.BRIDGE]: 'Bridge / causeway' };
const who = (o) => (o === 0 ? 'You' : 'Exiled Host');
function cardFor(u) {
  const t = R.TYPES[u.type], L = LORE[u.type];
  const kv = (k, v) => `<div style="margin:2px 0"><b style="color:var(--gold);font-weight:600">${k}</b> ${v}</div>`;
  let body = '';
  if (u.type === 'tower') {
    const cp = R.CONTROL_POINTS.findIndex((p) => p.x === u.x && p.y === u.y);
    body = kv('Role', 'summons land here; raised beside / under Infantry') + (cp >= 0 ? kv('Control point', 'yes — counts toward victory') : '') + (R.isBesieged(S, u) ? kv('Besieged', '3+ enemies adjacent — falls if they hold through their turn') : kv('Falls when', '3+ enemy units stay adjacent for a full turn'));
  } else {
    const d = R.describe(S, u);
    body = kv('Moves', d.move) + kv('Attacks', d.attack) + (LOTUS_FX[u.type] ? kv('Special', LOTUS_FX[u.type]) : '') + kv('Ritual value', `${t.id} reroll${t.id > 1 ? 's' : ''} if sacrificed`);
  }
  const lv = u.type === 'tower' ? '' : ' · Level ' + u.level + (R.effLevel(S, u) > u.level ? ' (+1 Inquisitor)' : '');
  return `<h2><span style="color:#${OWNER_COL[u.owner].toString(16)}">${t.name}</span><small style="color:var(--dim)">${who(u.owner)}${lv}</small></h2><div class="sub">${L[0]}</div><div style="font-size:13px">${body}</div><div class="lore">“${L[1]}”</div>`;
}
// Lotus recipes: shown while choosing a sacrifice, and in the codex
const RECIPES_HTML = `<h2>The Ritual</h2><div class="sub">Sacrifice a unit → its ID = rerolls (Archer 1 · Infantry 2 · Cavalry 3 · Ship 4 · Lotus 5 · Tower 6). Each reroll of <b>5</b> calls a Lotus whose recipe holds at the sacrificed unit's square. Hover a unit to see how close it is. Green = a Lotus is possible from there.</div>
<div style="font-size:13px"><div style="margin:4px 0"><b style="color:#3ae8d0">Water Lotus · Leviathan</b> — 3 river/pond squares around the sacrificed unit. Not the lake.</div>
<div style="margin:4px 0"><b style="color:#ffd37a">Earth Lotus · Inquisitor</b> — 3 of your non-Tower units on the 8 squares around it. Group up first.</div>
<div style="margin:4px 0"><b style="color:#a98aff">Air Lotus · Dragon</b> — sacrifice a unit standing ON your Tower, or on a square with 3 of your Towers within 2.</div></div>
<div class="sub" style="margin-top:6px">One of each Lotus per player. A ritual uses your whole turn.</div>`;
function progressHTML(u) {
  const rr = R.TYPES[u.type].id, pr = R.lotusProgress(S, 0, u, u.uid), col = { leviathan: '#3ae8d0', inquisitor: '#ffd37a', dragon: '#a98aff' };
  return `${rr} reroll${rr > 1 ? 's' : ''} · P(at least one 5) = ${(100 * (1 - Math.pow(5 / 6, rr))).toFixed(0)}%<br>` + pr.map((x) => `<span style="color:${col[x.type]}">${R.TYPES[x.type].name}</span> ${x.owned ? '— you already have one' : x.ok ? '✔ possible here' : `✘ ${Math.min(x.have, x.need)}/${x.need} ${x.text}`}`).join('<br>');
}
function setHint(t) { $('hint').textContent = t; }
function refreshUI() {
  if (!S) return;
  const h = S.current === 0 && S.winner === null && S.mode !== 'setup' && !ui.aiBusy && !ui.rolling;
  const pl = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const cnt = (o) => `${pl(R.towersOf(S, o).length, 'tower')} · ${pl(R.ownUnits(S, o).filter(R.isMobile).length, 'unit')} · points ${R.controlCount(S, o)}/${R.CP_WIN}`;
  $('p0').lastElementChild.textContent = cnt(0); $('p1').lastElementChild.textContent = cnt(1);
  $('p0').classList.toggle('on', S.current === 0); $('p1').classList.toggle('on', S.current === 1);
  $('turn').textContent = S.mode === 'setup' ? 'Deployment' : `Round ${S.turn}`;
  if (S.roll) $('die').textContent = S.roll;
  const ch = h && S.mode === 'choose' ? R.choices(S) : null;
  const moveStarted = S.mode === 'move' && !S.touched;
  $('bRoll').disabled = !(h && S.mode === 'idle');
  $('bMove').disabled = !(h && ((ch && ch.move) || moveStarted || S.mode === 'summon' || S.mode === 'ritual') && R.ownUnits(S, 0).some(R.isMobile));
  $('bMove').classList.toggle('active', S.mode === 'move');
  const st = S.roll ? R.SUMMON[S.roll] : null;
  $('bSummon').textContent = st ? `Summon ${st === 'tower' ? 'Tower' : R.TYPES[st].name}` : 'Summon';
  $('bSummon').disabled = !(h && st && (S.mode === 'summon' || moveStarted || (ch && ch.summon)));
  $('bSummon').classList.toggle('active', S.mode === 'summon');
  $('bRitual').disabled = !(h && S.roll === 5 && (S.mode === 'ritual' || moveStarted || (ch && ch.ritual)));
  $('bRitual').classList.toggle('active', S.mode === 'ritual');
  $('bEnd').disabled = !(h && ['choose', 'move', 'summon', 'ritual'].includes(S.mode));
  $('bEnd').textContent = S.mode === 'choose' ? 'Pass' : 'End turn';
  const lot = ui.sel && R.isLotus(ui.sel.type) && S.mode === 'move' && R.canActivate(S, ui.sel) && R.empowerTargets(S, ui.sel).length > 0;
  $('bEmpower').classList.toggle('hide', !lot); $('bEmpower').classList.toggle('active', ui.empowering);
  // hint
  if (S.winner !== null) setHint(S.winner === 0 ? 'Victory.' : 'Defeat.');
  else if (S.mode === 'setup') setHint(`Place your starting Tower on wasteland in an outer zone, at least ${R.START_GAP} squares from the enemy's. Gold rings are control points.`);
  else if (S.current === 1) setHint('The Exiled Host moves…');
  else if (ui.rolling) setHint('The die turns…');
  else if (S.mode === 'idle') setHint('Your turn. Roll the die.');
  else if (S.mode === 'choose') setHint(S.roll === 5 ? 'A 5 — the Ritual (see recipes), or move.' : `Rolled ${S.roll}: ${S.roll} action${S.roll === 1 ? '' : 's'} to move/capture${st ? `, or summon ${st === 'tower' ? 'a Tower' : (/^[aeiou]/i.test(R.TYPES[st].name) ? 'an ' : 'a ') + R.TYPES[st].name}` : ''}.`);
  else if (S.mode === 'move') setHint(`${S.left} action${S.left === 1 ? '' : 's'} left — each unit takes ONE action: move, capture or shoot. Blue = move, red = capture.`);
  else if (S.mode === 'summon') setHint('Choose a glowing tile' + (st === 'tower' ? ' beside your Infantry.' : ' beside one of your Towers.'));
  else if (S.mode === 'ritual') setHint('Choose a unit to sacrifice (green = a Lotus is possible there). Hover for recipes and odds.');
  // selection ring + highlights
  if (ui.sel && !S.units.includes(ui.sel)) ui.sel = null;
  selRing.visible = !!ui.sel;
  if (ui.sel) selRing.position.copy(worldPos(ui.sel.x, ui.sel.y, yFor(ui.sel) + 0.08));
  setHighlights(hlForState());
  // card
  const cu = ui.hover || ui.sel;
  const card = $('card');
  if (S.mode === 'ritual' && S.current === 0 && !(cu && S.units.includes(cu))) { card.innerHTML = RECIPES_HTML; card.classList.remove('hide'); }
  else if (cu && S.units.includes(cu)) { card.innerHTML = cardFor(cu); card.classList.remove('hide'); } else card.classList.add('hide');
  updateCPMarkers();
}
function renderLog() {
  const el = $('logp');
  el.innerHTML = S.log.slice(-60).map((l) => `<div style="color:${l.owner === 0 ? '#8cc8f5' : l.owner === 1 ? '#f59a8c' : '#c9bf9a'}">${l.msg}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}
let rollToast = null;
function showRolls(rolls) {
  setTimeout(() => { setHint(`Ritual rerolls: ${rolls.join(' · ')}`); }, 50);
}

// ───────────────────────── game history (survives reloads; last 30 games) ─────────────────────────
const HKEY = 'lotus.games';
let rec = null;
const readAll = () => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } };
function persist() {
  if (!S || !rec) return;
  Object.assign(rec, { turn: S.turn, winner: S.winner, mode: S.mode, updated: new Date().toISOString(), log: S.log.map((l) => `[R${l.turn}] ${l.msg}`), units: S.units.map((u) => `${u.owner}:${u.type}@${u.x},${u.y}L${u.level}`) });
  try { const all = readAll().filter((g) => g.id !== rec.id); all.push(rec); localStorage.setItem(HKEY, JSON.stringify(all.slice(-30))); } catch (e) { /* storage blocked: history just won't persist */ }
}
const history = () => readAll();
function downloadHistory() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(readAll(), null, 2)], { type: 'application/json' }));
  a.download = `lotus-history-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`; a.click();
}

// ───────────────────────── flow ─────────────────────────
function newGame() {
  for (const e of ents.values()) unitLayer.remove(e.group); ents.clear(); fx.length = 0; fxLayer.clear();
  S = R.newGame(); rec = { id: Date.now(), seed: S.seed, started: new Date().toISOString() }; ui.sel = null; ui.empowering = false; ui.aiBusy = false; ui.rolling = false; ui.hover = null;
  $('die').textContent = '–'; $('over').classList.add('hide');
  S.log.push({ msg: 'Aurelia forgot how to live. Raise a Tower and begin.', owner: -1, turn: 1 }); renderLog();
  flush();
}
function after() {
  flush();
  if (ui.sel && !(S.mode === 'move' && R.canActivate(S, ui.sel))) { ui.sel = null; refreshUI(); }
  if (S.winner !== null) { setTimeout(showOver, 1400); return; }
  if (S.mode === 'move' && R.exhausted(S)) { R.endTurn(S); flush(); }
  if (S.winner !== null) { setTimeout(showOver, 1400); return; }
  if (S.current === 1 && !ui.aiBusy) setTimeout(runAI, 900);
}
function showOver() {
  const win = S.winner === 0;
  $('overT').textContent = win ? 'VICTORY' : 'DEFEAT';
  $('overT').style.color = win ? '#e8c477' : '#ff7a65';
  $('overQ').textContent = (S.winReason ? S.winReason + '  ' : '') + (win ? '“The towers stand. Whether that is faith or exploitation, Aurelia will not say.”' : '“Your Towers fall. The suffering, they will tell your people, had a purpose.”');
  $('over').classList.remove('hide');
}
function rollDie(done) {
  ui.rolling = true; $('die').classList.add('roll'); refreshUI();
  const iv = setInterval(() => { $('die').textContent = 1 + Math.floor(Math.random() * 6); }, 70);
  setTimeout(() => { clearInterval(iv); $('die').classList.remove('roll'); ui.rolling = false; done(); }, 650);
}
function revertToChoose() {
  if (S.mode === 'summon' || S.mode === 'ritual' || (S.mode === 'move' && !S.touched)) { S.mode = 'choose'; ui.sel = null; ui.empowering = false; }
}
$('bRoll').onclick = () => { if (S.current !== 0 || S.mode !== 'idle') return; rollDie(() => { R.doRoll(S); flush();
  const c = R.choices(S);
  if (!c.move && !c.summon && !c.ritual) { setHint(`Rolled ${S.roll}, but nothing can be done. Pass.`); }
}); };
$('bMove').onclick = () => { revertToChoose(); R.beginMove(S); flush(); };
$('bSummon').onclick = () => { revertToChoose(); R.beginSummon(S); flush(); };
$('bRitual').onclick = () => { revertToChoose(); R.beginRitual(S); flush(); };
$('bEmpower').onclick = () => { ui.empowering = !ui.empowering; refreshUI(); };
$('bEnd').onclick = () => { if (S.current !== 0) return; R.endTurn(S); ui.sel = null; after(); };
addEventListener('keydown', (e) => { if (e.code === 'Space' && ui.started) { e.preventDefault(); if (!$('bRoll').disabled) $('bRoll').click(); else if (!$('bEnd').disabled && S.mode === 'move') $('bEnd').click(); } });

function runAI() {
  if (ui.aiBusy || S.current !== 1 || S.winner !== null) return;
  ui.aiBusy = true;
  const gen = aiTurn(S); let first = true;
  const step = () => {
    if (first) { first = false; rollDie(() => { ui.rolling = false; tick(); }); return; }
    tick();
  };
  const tick = () => {
    const r = gen.next(); flush();
    if (r.done || S.current !== 1 || S.winner !== null) { ui.aiBusy = false; if (S.winner !== null) setTimeout(showOver, 1400); refreshUI(); return; }
    setTimeout(tick, r.value === 'roll' ? 900 : 720);
  };
  step();
}

// ───────────────────────── input ─────────────────────────
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function pick(ev) {
  mouse.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(unitLayer.children, true);
  for (const h of hits) { let o = h.object; while (o && o.userData.uid === undefined) o = o.parent; if (o) { const e = ents.get(o.userData.uid); if (e && !e.dying) return { x: e.u.x, y: e.u.y, u: e.u }; } }
  const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, p)) return null;
  const x = Math.round(p.x) + C, y = Math.round(p.z) + C; return R.inb(x, y) ? { x, y, u: null } : null;
}
const unitsAtTile = (x, y) => ({ u: S.ug[R.ix(x, y)], t: S.tg[R.ix(x, y)] });
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || !S || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || e.button !== 0) return;
  down = null; const p = pick(e); if (p) onTile(p.x, p.y, p.u);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!S || !ui.started) return;
  const p = pick(e); const tip = $('tip');
  if (!p) { cursor.visible = false; tip.style.display = 'none'; return; }
  cursor.visible = true; cursor.position.set(wx(p.x), terrainTop(R.terrAt(S, p.x, p.y)) + 0.04, wz(p.y));
  const { u, t } = unitsAtTile(p.x, p.y);
  const hov = u || t || null;
  if (hov !== ui.hover) { ui.hover = hov; const cu = ui.hover || ui.sel; if (cu && S.units.includes(cu)) { $('card').innerHTML = cardFor(cu); $('card').classList.remove('hide'); } else $('card').classList.add('hide'); }
  const cpi = R.CONTROL_POINTS.findIndex((q) => q.x === p.x && q.y === p.y);
  let txt = TERR_NAME[R.terrAt(S, p.x, p.y)] + (cpi >= 0 ? ` — CONTROL POINT (${R.cpOwner(S, R.CONTROL_POINTS[cpi]) < 0 ? 'unclaimed' : R.cpOwner(S, R.CONTROL_POINTS[cpi]) === 0 ? 'yours' : 'enemy'}) · build a Tower here` : '');
  let html = null;
  if (S.mode === 'ritual' && S.current === 0 && hov && hov.owner === 0) html = progressHTML(hov);
  if (S.mode === 'setup') { const ok = S.board.terr[R.ix(p.x, p.y)] === R.LAND && R.zoneOf(p.x, p.y) !== 'island'; cursor.material.color.set(ok ? 0x6dff9a : 0xff5050); txt = ok ? 'Place Tower here' : 'Invalid — outer zone wasteland only'; } else cursor.material.color.set(0xffffff);
  if (html) tip.innerHTML = html; else tip.textContent = txt; tip.style.display = 'block'; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px';
});
renderer.domElement.addEventListener('pointerleave', () => { $('tip').style.display = 'none'; cursor.visible = false; ui.hover = null; refreshUI(); });

function onTile(x, y, hitUnit) {
  if (S.winner !== null || ui.aiBusy || ui.rolling) return;
  if (S.mode === 'setup') {
    if (!R.placeStart(S, 0, x, y)) { setHint('That square will not hold a Tower. Pick outer-zone wasteland at least 10 squares from other Towers.'); return; }
    flush(); aiPlaceStart(S, 1); flush(); ui.sel = null; focusOn(x, y); refreshUI(); return;
  }
  if (S.current !== 0) return;
  const { u, t } = unitsAtTile(x, y);
  if (S.mode === 'summon') {
    const ty = R.SUMMON[S.roll]; if (R.summon(S, ty, x, y)) { ui.sel = null; after(); } return;
  }
  if (S.mode === 'ritual') {
    const c = [u, t].find((z) => z && z.owner === 0 && R.sacrificeCandidates(S, 0).includes(z));
    if (c) { ui.sel = null; R.ritual(S, c.uid); after(); } else setHint('Pick one of your own units (a lone Tower cannot be sacrificed).');
    return;
  }
  if (S.mode !== 'move') return;
  const s0 = ui.sel;
  if (s0 && R.canActivate(S, s0)) {
    if (ui.empowering) { if (u && R.doEmpower(S, s0, u)) { ui.sel = null; ui.empowering = false; after(); } return; }
    const foe = [u, t].find((z) => z && z.owner === 1);
    if (foe && R.doAttack(S, s0, foe)) { after(); return; }
    if (!u && R.doMove(S, s0, x, y)) { after(); return; }
    if (u === s0) { select(null); return; }
  }
  if (u && u.owner === 0 && R.isMobile(u)) { if (R.canActivate(S, u)) select(u); else setHint(S.left <= 0 ? 'No actions left this turn.' : 'That unit has already acted this turn.'); return; }
  select(null);
}

$('bStart').disabled = true; $('bStart').textContent = 'Summoning models…';
loadLibrary().then((st) => { console.info('models:', st); $('bStart').disabled = false; $('bStart').textContent = 'Enter Aurelia'; window.__lotus && (window.__lotus.modelStatus = st); });
$('bStart').onclick = () => { $('intro').classList.add('hide'); ui.started = true; newGame(); };
$('bAgain').onclick = () => newGame();
$('btnLog').onclick = downloadHistory;
$('btnNew').onclick = () => { if (confirm('Abandon this war and start again?')) newGame(); };
$('btnHelp').textContent = 'Codex'; $('btnHelp').onclick = () => { $('rules').classList.remove('hide'); };
$('rules').onclick = (e) => { if (e.target === $('rules')) $('rules').classList.add('hide'); };
$('rulesBox').innerHTML = `<h3 style="font-size:30px;margin:0 0 4px">Codex</h3><div class="sub" style="margin-bottom:8px">Everything the game does. Hover any unit for its own card; click outside to close.</div>
<h3>How to win</h3>
<ul><li><b>Control points.</b> The gold rings on the map. Raise a <b>Tower on one</b> to claim it. At the start of your own turn, if you hold <b>${R.CP_WIN} or more</b> and <b>more than your rival</b>, you win — so the rival always gets one turn to break it.</li>
<li><b>Elimination.</b> Towers are where units are summoned and Infantry are what raise Towers. A side with <b>no Towers and no Infantry</b> can never summon again and loses at once.</li></ul>
<h3>Your turn</h3>
<ul><li><b>Roll a D6</b> and choose one: <b>Move</b> — the roll is your number of <i>actions</i>; each unit may take <b>one</b> action (a move, a capture or a shot) · <b>Summon</b> the unit on the die: <b>1</b> Archer · <b>2</b> Infantry · <b>3</b> Cavalry · <b>4</b> Ship · <b>6</b> Tower · <b>5</b> is the <b>Ritual</b> (below).</li>
<li>Units are summoned on a free square beside one of your Towers (Ships need water). A Tower is raised <b>beside or under</b> one of your Infantry.</li>
<li>No health, no damage: a <b>capture removes the piece</b>. Nothing jumps over other pieces. A capture gives the capturer +1 Level (max 4); a Level adds reach, see below.</li></ul>
<h3>Units</h3>
<table style="width:100%;border-collapse:collapse;font-size:13px">
<tr style="color:var(--gold);text-align:left"><th>Unit</th><th>Moves</th><th>Captures</th></tr>
<tr><td><b>Infantry</b> · 2</td><td>1 step any direction (2 at Level 3+). <b>A connected formation moves together for one action</b> — keep them touching.</td><td>steps onto an adjacent enemy</td></tr>
<tr><td><b>Archer</b> · 1</td><td>2 steps</td><td>shoots at distance 2 to 1+Level, <i>not</i> adjacent; doesn't move</td></tr>
<tr><td><b>Cavalry</b> · 3</td><td>slides 8+ squares in a straight line (8 directions)</td><td>by landing on the enemy — and then <b>moves again, free</b></td></tr>
<tr><td><b>Ship</b> · 4</td><td>slides 6+ on water only</td><td>by landing, or fires on any adjacent enemy</td></tr>
<tr><td><b>Leviathan</b> · 5</td><td>slides 8+ on river/pond water, never the lake</td><td>by landing, or any enemy within Level squares</td></tr>
<tr><td><b>Inquisitor</b> · 5</td><td>3 steps</td><td>cannot capture; allies within ${R.INQ_R} squares act one Level higher</td></tr>
<tr><td><b>Dragon</b> · 5</td><td>lives on a Tower; jumps to any empty allied Tower within 12+</td><td>from a Tower, enemy units within 1+Level; never Towers</td></tr>
</table>
<div class="sub">The number after the name is its ID: how many rerolls it is worth as a sacrifice. A Lotus can also be sacrificed (one action) to give any ally +1 Level.</div>
<h3>Towers &amp; sieges</h3>
<ul><li>A Tower can't be captured. It falls if <b>3 or more enemy units stand around it from the start of their turn to its end</b> — the owner has one turn to capture or shoot them off. A besieged Tower shows this on its card. Archers/Ships don't need to be adjacent to help: kill the besiegers.</li>
<li>Your units may stand on your own Towers; enemies may not enter them. A Dragon dies if its Tower falls.</li></ul>
${RECIPES_HTML}
<h3>Terrain</h3>
<ul><li>Land units cannot cross water. The island is reached over <b>four 1-wide bridges</b> — chokepoints. Rivers and ponds are for Ships and Leviathans; the central lake is for Ships only.</li>
<li>The <b>Water Temple</b> in the lake has no rules yet — it is reserved for its own unit, like the other Lotus-specific victories.</li></ul>
<p style="color:var(--dim)">Board ${N}×${N}${N === 75 ? ' (add ?size=151 to the address for a bigger one)' : ''}.</p>`;

// ───────────────────────── loop ─────────────────────────
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  controls.update();
  // water waves
  if (waterMesh) {
    const p = waterMesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = waterBase[i * 3], z = waterBase[i * 3 + 2]; p.setY(i, Math.sin(x * 0.8 + t * 1.3) * 0.035 + Math.cos(z * 0.7 + t * 1.1) * 0.035); }
    p.needsUpdate = true;   // flat-shaded material derives normals in the shader
  }
  if (templeRing) { templeRing.rotation.z = t * 0.5; templeLight.intensity = 12 + Math.sin(t * 2) * 3; }
  // entities
  for (const [uid, e] of ents) {
    const g = e.group, k = 1 - Math.exp(-11 * dt);
    if (e.dying) {
      e.dying += dt; const s = Math.max(0, 1 - e.dying / 0.4); g.scale.setScalar(Math.max(s, 0.001)); g.position.y += dt * 0.6;
      if (e.dying > 0.4) { unitLayer.remove(g); ents.delete(uid); }
      continue;
    }
    g.position.x += (e.tgt.x - g.position.x) * k; g.position.z += (e.tgt.z - g.position.z) * k;
    let ty = e.tgt.y; const type = e.u.type;
    if (e.hop < 1) { e.hop += dt / 0.45; ty += Math.sin(Math.min(e.hop, 1) * Math.PI) * (type === 'dragon' ? 1.6 : type === 'ship' || type === 'leviathan' ? 0.1 : 0.45); }
    if (type === 'dragon') ty += Math.sin(t * 2 + uid) * 0.08; if (type === 'inquisitor') ty += Math.sin(t * 1.6 + uid) * 0.07;
    g.position.y += (ty - g.position.y) * k * 1.4;
    if (type === 'ship' || type === 'leviathan') { g.position.y += Math.sin(t * 1.5 + uid) * 0.0015; g.rotation.z = Math.sin(t * 1.3 + uid) * 0.04; }
    if (e.heading !== undefined && type !== 'tower') { let d = e.heading - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * (1 - Math.exp(-9 * dt)); }
    if (e.born) { e.born += dt; const b = Math.min(1, e.born / 0.55); const s = b < 1 ? 1 - Math.pow(1 - b, 3) * Math.cos(b * 9) * 0.4 : 1; g.scale.setScalar(Math.max(s * b, 0.001)); if (b >= 1) { e.born = 0; g.scale.setScalar(1); } }
    if (e.pips) e.pips.rotation.y = t * 1.4;
    g.traverse((o) => {
      if (o.userData.spin) o.rotation.z = t * 1.5;
      if (o.userData.wing) o.rotation.x = Math.sin(t * 5 + uid) * 0.45 * o.userData.wing;
      if (o.userData.flag) o.scale.x = 1 + Math.sin(t * 4 + uid) * 0.12;
    });
  }
  if (selRing.visible) { selRing.scale.setScalar(1 + Math.sin(t * 5) * 0.06); selRing.material.opacity = 0.7 + Math.sin(t * 5) * 0.25; }
  hlMesh.material.opacity = 0.38 + Math.sin(t * 4) * 0.1;
  // fx
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt; const a = f.t / f.dur;
    if (a >= 1) { fxLayer.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); fx.splice(i, 1); continue; }
    if (f.kind === 'ring') { const s = 0.2 + a * f.maxR; f.m.scale.set(s, s, s); f.m.material.opacity = 0.9 * (1 - a); }
    else if (f.kind === 'p') { f.v.y -= 6 * dt; f.m.position.addScaledVector(f.v, dt); f.m.material.opacity = 1 - a; f.m.scale.setScalar(1 - a * 0.6); }
    else if (f.kind === 'beam') { f.m.material.opacity = 0.95 * (1 - a); f.m.scale.x = f.m.scale.z = 1 - a * 0.6; }
    else if (f.kind === 'col') { f.m.material.opacity = 0.6 * (1 - a); f.m.scale.x = f.m.scale.z = 1 + a * 0.5; }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
window.__lotus = { get S() { return S; }, R, ui, camera, controls, newGame, flush, history, downloadHistory };   // handy for debugging / tests
