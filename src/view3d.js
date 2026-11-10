// THE TOWER GAME — 3D board view (Three.js). Pure presentation: it reads the rules state and draws it; the page (play3d.js) owns all game logic.
//   const view = await createView(state, element, { onHover(cell), onClick(cell, pick) });   view.update({ s, info, sel, orders }) after every change.
// 1 world unit = 1 board square; the board is centred on the origin; x east, z south.  Handles up to 560 x 560: terrain is a texture on one plane plus
// instanced meshes (rocks, trees, highland, node crystals, point rings), so only towers and units are individual objects.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { makeModel, loadLibrary } from './modelLib.js';
import { FOUNDATION_H, LEVEL_H, OWNER_COL } from './models.js';
import { RES_INFO, SUBTYPES } from './balance.js';

const HIGH = 0.35, hash = (x, y) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

export async function createView(s, el, handlers = {}) {
  await loadLibrary();
  const N = s.N, half = N / 2, W = (x) => x - half + 0.5;                      // cell -> world coordinate
  const ter = (x, y) => s.ter[y * N + x];
  const ground = (x, y) => (ter(x, y) === 4 ? HIGH : 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = false;
  el.appendChild(renderer.domElement); renderer.domElement.style.display = 'block';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x15171d); scene.fog = new THREE.Fog(0x15171d, Math.max(60, N * 0.35), Math.max(260, N * 1.6));
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, Math.max(500, N * 3));
  scene.add(new THREE.HemisphereLight(0xc7d2ea, 0x2a2e22, 1.15)); const sun = new THREE.DirectionalLight(0xfff0d8, 2.0); sun.position.set(-40, 80, 30); scene.add(sun);

  // ── ground texture: one pixel per square ──
  const base = [[74, 80, 60], [95, 95, 100], [38, 72, 128], [52, 74, 46], [128, 108, 74], [66, 92, 80]];        // plain, rock, water, forest, highland, marsh
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const cx = cv.getContext('2d'), img = cx.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = base[ter(x, y)], v = (hash(x, y) - 0.5) * 5, o = (y * N + x) * 4; img.data[o] = c[0] + v; img.data[o + 1] = c[1] + v; img.data[o + 2] = c[2] + v; img.data[o + 3] = 255; }
  cx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })); plane.rotation.x = -Math.PI / 2; scene.add(plane);

  // ── instanced scenery ──
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const inst = (geo, mat, cells, place, tint) => {
    if (!cells.length) return null; const m = new THREE.InstancedMesh(geo, mat, cells.length);
    cells.forEach(([x, y], i) => { place(dummy, x, y, hash(x + 7, y + 3)); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); if (tint) { col.set(tint(hash(x, y + 11))); m.setColorAt(i, col); } });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; scene.add(m); return m;
  };
  const by = { 1: [], 3: [], 4: [] }; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const t = ter(x, y); if (by[t]) by[t].push([x, y]); }
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  inst(new THREE.BoxGeometry(1, 1, 1), rockMat, by[1], (d, x, y, r) => { const h = 1.0 + r * 1.6; d.position.set(W(x), h / 2, W(y)); d.scale.set(0.96, h, 0.96); d.rotation.set(0, r * 0.4, 0); }, (r) => (r < 0.5 ? 0x6b6d75 : 0x80838b));
  inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), by[4], (d, x, y) => { d.position.set(W(x), HIGH / 2, W(y)); d.scale.set(1, HIGH, 1); d.rotation.set(0, 0, 0); }, (r) => (r < 0.5 ? 0x8d7a52 : 0x9a8660));
  inst(new THREE.ConeGeometry(0.42, 1.25, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true }), by[3], (d, x, y, r) => { d.position.set(W(x) + (r - 0.5) * 0.3, 0.62, W(y) + (hash(x, y + 5) - 0.5) * 0.3); d.scale.setScalar(0.8 + r * 0.5); d.rotation.set(0, 0, 0); }, (r) => (r < 0.5 ? 0x2f5a30 : 0x3c6e3a));
  // water gets a faint sheen so it reads as water
  const wcells = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (ter(x, y) === 2) wcells.push([x, y]);
  inst(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x3f7bd0, roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.55 }), wcells, (d, x, y) => { d.position.set(W(x), 0.04, W(y)); d.rotation.set(-Math.PI / 2, 0, 0); d.scale.set(1, 1, 1); });
  // resource nodes: crystals coloured by kind; strategic points: gold rings
  const nodeCells = s.nodes.map((i) => [i % N, Math.floor(i / N)]);
  const kindCol = ['', ...SUBTYPES.map((k) => RES_INFO[k].color)];
  const nodeMesh = inst(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, roughness: 0.35, flatShading: true }), nodeCells, (d, x, y) => { d.position.set(W(x), 0.42 + ground(x, y), W(y)); d.scale.set(0.8, 1.25, 0.8); d.rotation.set(0, 0.5, 0); }, null);
  if (nodeMesh) { nodeCells.forEach(([x, y], i) => { col.set(kindCol[s.res[y * N + x]]); nodeMesh.setColorAt(i, col); }); nodeMesh.instanceColor.needsUpdate = true; }
  const ptMat = new THREE.MeshStandardMaterial({ color: 0xe8c477, emissive: 0x8a6a20, roughness: 0.4 });
  inst(new THREE.TorusGeometry(0.46, 0.05, 6, 24), ptMat, s.points.map((p) => [p.x, p.y]), (d, x, y) => { d.position.set(W(x), 0.07 + ground(x, y), W(y)); d.rotation.set(-Math.PI / 2, 0, 0); d.scale.set(1, 1, 1); });

  // ── towers and units (individual objects) ──
  const towers = new Map(), units = new Map(), overlay = new THREE.Group(), lines = new THREE.Group(); scene.add(overlay, lines);
  const towerSig = (t) => `${t.owner}|${t.spec}|${t.levels.map((l) => l.kind[0]).join('')}|${t.fortress ? 1 : 0}`;
  const towerTop = (t) => ground(t.x, t.y) + FOUNDATION_H + t.levels.length * LEVEL_H;
  function buildTower(t) {
    const g = new THREE.Group(); g.userData = { towerId: t.id };
    const f = makeModel('tower_foundation', t.owner); f.position.y = 0; g.add(f);
    t.levels.forEach((l, i) => { const m = makeModel(l.kind === 'reinforced' ? 'tower_level_reinforced' : 'tower_level', t.owner); m.position.y = FOUNDATION_H + i * LEVEL_H; g.add(m); });
    if (t.fortress) { const flag = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 4), new THREE.MeshStandardMaterial({ color: OWNER_COL[t.owner], emissive: OWNER_COL[t.owner], emissiveIntensity: 0.3 })); flag.position.y = FOUNDATION_H + t.levels.length * LEVEL_H + 0.35; g.add(flag); }
    g.position.set(W(t.x), ground(t.x, t.y), W(t.y)); return g;
  }
  const modelOf = (u) => { const g = new THREE.Group(); g.add(makeModel(u.type, u.owner)); g.userData = { unitId: u.id }; return g; };
  const sel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffe08a })); sel.rotation.x = -Math.PI / 2; sel.visible = false; scene.add(sel);
  const quad = new THREE.PlaneGeometry(0.92, 0.92), matReach = new THREE.MeshBasicMaterial({ color: 0x50aaff, transparent: true, opacity: 0.38, depthWrite: false }), matClimb = new THREE.MeshBasicMaterial({ color: 0x78ffa0, transparent: true, opacity: 0.45, depthWrite: false });

  function update({ s: st = s, info = null, selected = null, orders = null } = {}) {
    // towers
    const seen = new Set();
    for (const t of st.towers) {
      seen.add(t.id); const sig = towerSig(t), have = towers.get(t.id);
      if (!have || have.sig !== sig) { if (have) scene.remove(have.g); const g = buildTower(t); scene.add(g); towers.set(t.id, { g, sig }); }
    }
    for (const [id, v] of towers) if (!seen.has(id)) { scene.remove(v.g); towers.delete(id); }
    // units
    const useen = new Set();
    for (const u of st.units) {
      useen.add(u.id); let v = units.get(u.id);
      if (!v) { const g = modelOf(u); const tgt = new THREE.Vector3(); g.position.set(W(u.x), 0, W(u.y)); scene.add(g); v = { g, tgt, type: u.type }; units.set(u.id, v); }
      const T = u.z === 1 ? st.towers.find((t) => t.x === u.x && t.y === u.y) : null;
      v.tgt.set(W(u.x), T ? towerTop(T) : ground(u.x, u.y), W(u.y));
      v.g.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) o.material.emissiveIntensity = u.idle ? 0.0 : o.material.emissiveIntensity; });
    }
    for (const [id, v] of units) if (!useen.has(id)) { scene.remove(v.g); units.delete(id); }
    // selection + reach overlay
    overlay.clear(); sel.visible = false;
    const seln = selected && (selected.kind === 'unit' ? units.get(selected.id) : towers.get(selected.id));
    if (seln) { sel.visible = true; sel.position.set(seln.g.position.x, 0.12, seln.g.position.z); if (selected.kind === 'unit') { const u = st.units.find((z) => z.id === selected.id); if (u) sel.position.set(W(u.x), 0.12, W(u.y)); } else { const t = st.towers.find((z) => z.id === selected.id); if (t) sel.position.set(W(t.x), 0.12, W(t.y)); } }
    if (info && info.reach) {
      const a = [], b = []; for (const [k, v] of info.reach) { const x = k % N, y = Math.floor(k / N); (v.climb ? b : a).push([x, y]); }
      for (const [list, mat] of [[a, matReach], [b, matClimb]]) if (list.length) { const m = new THREE.InstancedMesh(quad, mat, list.length); list.forEach(([x, y], i) => { dummy.position.set(W(x), 0.06 + ground(x, y), W(y)); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); }); overlay.add(m); }
      for (const id of info.strikes || []) { const u = st.units.find((z) => z.id === id); if (u) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff5a4a })); r.rotation.x = -Math.PI / 2; r.position.set(W(u.x), 0.14 + (u.z ? towerTop(st.towers.find((t) => t.x === u.x && t.y === u.y) || { x: u.x, y: u.y, levels: [] }) : 0), W(u.y)); overlay.add(r); } }
      for (const id of info.sieges || []) { const t = st.towers.find((z) => z.id === id); if (t) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.06, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffa040 })); r.rotation.x = -Math.PI / 2; r.position.set(W(t.x), 0.14, W(t.y)); overlay.add(r); } }
    }
    // planned orders of the human player as lines on the board
    lines.clear();
    if (orders) {
      const seg = (ax, az, bx, bz, c) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, 0.5, az), new THREE.Vector3(bx, 0.5, bz)]); lines.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: c }))); };
      for (const [uid, m] of Object.entries(orders.moves || {})) { const u = st.units.find((z) => z.id === +uid), e = m.path[m.path.length - 1]; if (u && e) seg(W(u.x), W(u.y), W(e.x), W(e.y), 0x6fc0ff); }
      for (const a of orders.attacks || []) { const u = st.units.find((z) => z.id === a.unitId), t = st.units.find((z) => z.id === a.targetId); if (u && t) seg(W(u.x), W(u.y), W(t.x), W(t.y), 0xff5a4a); }
      for (const a of orders.siege || []) { const u = st.units.find((z) => z.id === a.unitId), t = st.towers.find((z) => z.id === a.targetId); if (u && t) seg(W(u.x), W(u.y), W(t.x), W(t.y), 0xffa040); }
      for (const f of orders.flights || []) { const u = st.units.find((z) => z.id === f.unitId), t = st.towers.find((z) => z.id === f.towerId); if (u && t) seg(W(u.x), W(u.y), W(t.x), W(t.y), 0xd8a0ff); }
    }
  }

  // ── camera, resize, picking, input ──
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 5; controls.maxDistance = Math.max(60, N * 1.3); controls.screenSpacePanning = false; if ('zoomToCursor' in controls) controls.zoomToCursor = true;
  function focus(x, y, dist = Math.min(34, Math.max(14, N * 0.12))) { controls.target.set(W(x), 0, W(y)); camera.position.set(W(x) + dist * 0.15, dist * 0.8, W(y) + dist * 0.85); controls.update(); }
  const resize = () => { const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }; addEventListener('resize', resize); resize();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const cellAt = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return ray; };
  function pickAt(e) {
    const rc = cellAt(e), objs = [...[...towers.values()].map((v) => v.g), ...[...units.values()].map((v) => v.g)];
    const hits = rc.intersectObjects(objs, true);
    for (const h of hits) { let o = h.object; while (o && !(o.userData && (o.userData.unitId || o.userData.towerId))) o = o.parent; if (o) return { pick: o.userData.unitId ? { kind: 'unit', id: o.userData.unitId } : { kind: 'tower', id: o.userData.towerId } }; }
    const gh = rc.intersectObject(plane)[0]; if (!gh) return null;
    return { cell: { x: Math.floor(gh.point.x + half), y: Math.floor(gh.point.z + half) } };
  }
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, b: e.button }; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || down.b !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; } down = null;
    const r = pickAt(e); if (!r) return;
    if (r.pick) { const o = r.pick.kind === 'unit' ? s.units.find((u) => u.id === r.pick.id) : s.towers.find((t) => t.id === r.pick.id); if (o) handlers.onClick && handlers.onClick({ x: o.x, y: o.y }, r.pick); } else if (r.cell && r.cell.x >= 0 && r.cell.y >= 0 && r.cell.x < N && r.cell.y < N) handlers.onClick && handlers.onClick(r.cell, null);
  });
  let lastHover = 0; renderer.domElement.addEventListener('pointermove', (e) => { const now = performance.now(); if (now - lastHover < 60) return; lastHover = now; const gh = cellAt(e).intersectObject(plane)[0]; if (gh) { const c = { x: Math.floor(gh.point.x + half), y: Math.floor(gh.point.z + half) }; if (c.x >= 0 && c.y >= 0 && c.x < N && c.y < N) handlers.onHover && handlers.onHover(c); } });
  addEventListener('keydown', (e) => {                                  // WASD / arrows pan, Q/E rotate, F focus own fortress
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase(), v = (e.shiftKey ? 3 : 1) * Math.max(2, camera.position.y * 0.12), f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize(); const r = new THREE.Vector3().crossVectors(f, camera.up).normalize(); let d = null;
    if (k === 'w' || k === 'arrowup') d = f.multiplyScalar(v); else if (k === 's' || k === 'arrowdown') d = f.multiplyScalar(-v); else if (k === 'a' || k === 'arrowleft') d = r.multiplyScalar(-v); else if (k === 'd' || k === 'arrowright') d = r.multiplyScalar(v);
    if (d) { camera.position.add(d); controls.target.add(d); e.preventDefault(); }
    if (k === 'q' || k === 'e') { const a = (k === 'q' ? 1 : -1) * 0.15, o = camera.position.clone().sub(controls.target); o.applyAxisAngle(new THREE.Vector3(0, 1, 0), a); camera.position.copy(controls.target).add(o); }
    if (k === 'f' && handlers.onFocus) handlers.onFocus(); if (/^[1-8]$/.test(k) && handlers.onFocusPlayer) handlers.onFocusPlayer(+k - 1);
  });
  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), 0.05);
    for (const v of units.values()) { const d = v.tgt.clone().sub(v.g.position); if (d.length() > 0.01) { if (Math.hypot(d.x, d.z) > 0.05) v.g.rotation.y = Math.atan2(d.x, d.z); v.g.position.addScaledVector(d, Math.min(1, dt * 7)); } }
    for (const v of units.values()) v.g.traverse((o) => { if (o.userData && o.userData.spin) o.rotation.y += dt * 1.2; });
    controls.update(); renderer.render(scene, camera);
  })();
  return { update, focus, scene, camera, controls, renderer, units, towers };
}
