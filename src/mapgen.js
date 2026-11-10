// THE TOWER GAME — landscape + node + point generator for 2..8 players on a board whose side grows with the player count
// (sizeFor in rules.js: 75 squares for 2 players, 560 for 8).  Everything is N-fold rotationally symmetric: the terrain is evaluated at the
// cell folded back into player 0's sector, and nodes / points placed in that sector are copied to every other sector, so every player gets the
// same ground.  (2 and 4 players are exactly symmetric; 3, 5, 6, 7, 8 are symmetric up to one square of rounding.)
import { RES_CODE } from './rules.js';

const TAU = Math.PI * 2;
const hash = (i, j, seed) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, y, seed) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), a = hash(i, j, seed), b = hash(i + 1, j, seed), c = hash(i, j + 1, seed), d = hash(i + 1, j + 1, seed); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm = (x, y, seed) => vnoise(x, y, seed) * 0.56 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.29 + vnoise(x * 4.3, y * 4.3, seed + 13) * 0.15;

export const centre = (s) => (s.N - 1) / 2;
export function fortresses(s) {                                    // player p stands at angle PI + p*2PI/np (player 0 in the west); radius 0.36 N (2 players on 75: x = 10 and 64)
  const C = centre(s), R = 0.36 * s.N, out = [];
  for (let p = 0; p < s.np; p++) { const a = Math.PI + (TAU * p) / s.np; out.push({ x: Math.round(C + R * Math.cos(a)), y: Math.round(C + R * Math.sin(a)) }); }
  return out;
}
export const orderOf = (s) => s.symOrder || s.np;                    // how many rotated copies make the board (a map with 2 fortresses per quadrant has order 4 for 8 players)
export function rotk(s, pt, k) {                                   // rotate a square by k sectors about the board centre
  const ord = orderOf(s); if (k === 0) return { x: pt.x, y: pt.y };
  if (ord === 2) return { x: s.N - 1 - pt.x, y: s.N - 1 - pt.y };
  const C = centre(s);
  if (ord === 4) { let dx = pt.x - C, dy = pt.y - C; for (let i = 0; i < k; i++) { const t = dx; dx = -dy; dy = t; } return { x: Math.round(C + dx), y: Math.round(C + dy) }; }       // exact quarter turns
  const a = (TAU * k) / ord, dx = pt.x - C, dy = pt.y - C;
  return { x: Math.round(C + dx * Math.cos(a) - dy * Math.sin(a)), y: Math.round(C + dx * Math.sin(a) + dy * Math.cos(a)) };
}
function fold(s, x, y) {                                           // bring any square into player 0's sector
  const C = centre(s), dx = x - C, dy = y - C, rho = Math.hypot(dx, dy), w = TAU / s.np, lo = Math.PI - w / 2;
  let phi = Math.atan2(dy, dx); if (phi < 0) phi += TAU;
  const f = ((((phi - lo) % w) + w) % w) + lo;
  return { x: C + rho * Math.cos(f), y: C + rho * Math.sin(f), rho, phi: f };
}
const inSector = (s, pt) => { const C = centre(s), dx = pt.x - C, dy = pt.y - C; let phi = Math.atan2(dy, dx); if (phi < 0) phi += TAU; return Math.abs(phi - Math.PI) <= Math.PI / s.np + 1e-9; };

// ── terrain: 0 plain · 1 rock (mountain chains) · 2 deep water (lakes, inland seas) · 3 forest · 4 highland ──
export function landscape(s, F) {
  const N = s.N, sc = 1 / (0.13 * N), seed = (s.seed | 0) % 100003, C = centre(s);
  const near = (x, y, pts, r) => pts.some((q) => Math.abs(q.x - x) + Math.abs(q.y - y) <= r);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const f = fold(s, x, y), nx = f.x * sc, ny = f.y * sc;
    const ridge = 1 - Math.abs(2 * fbm(nx, ny, seed) - 1), lake = fbm(nx + 31.7, ny - 12.3, seed + 101), wood = fbm(nx - 40.1, ny + 7.9, seed + 202), high = fbm(nx + 9.3, ny + 55.5, seed + 303);
    let t = 0;
    if (ridge > 0.956) t = 1; else if (lake > 0.685) t = 2; else if (wood > 0.6) t = 3; else if (high > 0.66) t = 4;
    s.ter[y * N + x] = t;
  }
  const clearR = Math.max(4, Math.round(0.07 * N)), hub = Math.max(5, Math.round(0.07 * N));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {            // open ground around every fortress and in the middle hub
    if (near(x, y, F, clearR) || Math.hypot(x - C, y - C) <= hub) s.ter[y * N + x] = 0;
  }
  for (const f of F) {                                             // a road from each fortress to the hub, 3 wide: ground armies can always reach each other
    const n = Math.ceil(Math.hypot(f.x - C, f.y - C));
    for (let i = 0; i <= n; i++) { const x = Math.round(f.x + ((C - f.x) * i) / n), y = Math.round(f.y + ((C - f.y) * i) / n); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const px = x + dx, py = y + dy; if (px >= 0 && py >= 0 && px < N && py < N && (s.ter[py * N + px] === 1 || s.ter[py * N + px] === 2)) s.ter[py * N + px] = 0; } }
  }
}

// ── nodes and strategic points: sampled in player 0's sector, copied to every sector; counts grow with the ground each player has ──
export function populate(s, F, taken) {
  const N = s.N, np = s.np, C = centre(s), rng = s.rng, ix = (x, y) => y * N + x;
  const f = (N * N / np) / 2812;                                   // 1.0 = what each player has on the 75 x 75 two-player map
  const nodesPP = Math.round(30 * Math.pow(f, 0.75)), pointsPP = Math.round(16 * Math.sqrt(f));
  const kinds = [['gold', 3], ['iron', 3], ['aether', 1], ['ember', 1], ['faith', 1], ['soul', 1]], total = kinds.reduce((a, [, n]) => a + n, 0);
  const free = (x, y) => x >= 1 && y >= 1 && x < N - 1 && y < N - 1 && s.ter[ix(x, y)] !== 1 && s.ter[ix(x, y)] !== 2 && !taken.has(ix(x, y)) && !s.res[ix(x, y)];
  const copies = (pt) => Array.from({ length: np }, (_, k) => rotk(s, pt, k));
  const farFromFort = (pt, r) => F.every((q) => Math.abs(q.x - pt.x) + Math.abs(q.y - pt.y) > r);
  for (const [kind, w] of kinds) {
    const n = Math.max(1, Math.round((nodesPP * w) / total)), mid = kind !== 'gold' && kind !== 'iron';
    let placed = 0, guard = 0;
    while (placed < n && guard++ < 6000) {
      const rho = (mid ? 0.04 + rng() * 0.26 : 0.1 + rng() * 0.4) * N, phi = Math.PI + (rng() - 0.5) * (TAU / np);    // mana and spirit nodes lie nearer the middle
      const p = { x: Math.round(C + rho * Math.cos(phi)), y: Math.round(C + rho * Math.sin(phi)) };
      if (!inSector(s, p) || !free(p.x, p.y) || !farFromFort(p, 4)) continue;
      const cs = copies(p); if (!cs.every((q) => free(q.x, q.y)) || new Set(cs.map((q) => ix(q.x, q.y))).size !== np) continue;
      for (const q of cs) { s.res[ix(q.x, q.y)] = RES_CODE[kind]; taken.add(ix(q.x, q.y)); } placed++;
    }
  }
  // points: never on a node, always orthogonally beside one; spaced out so they cover the whole sector
  const cand = [];
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const p = { x, y }; if (!s.res[ix(x, y)] && s.ter[ix(x, y)] !== 1 && s.ter[ix(x, y)] !== 2 && inSector(s, p) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => s.res[ix(x + a, y + b)])) cand.push(p); }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const adj = (q) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => q.x + a >= 0 && q.y + b >= 0 && q.x + a < N && q.y + b < N && s.res[ix(q.x + a, q.y + b)]);
  const spacing = Math.max(5, Math.round(0.6 * Math.sqrt((N * N / np) / pointsPP))), chosen = [];
  for (const p of cand) {
    if (chosen.length >= pointsPP) break;
    if (!farFromFort(p, 6) || chosen.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) < spacing)) continue;
    const cs = copies(p); if (cs.some((q) => s.res[ix(q.x, q.y)] || s.ter[ix(q.x, q.y)] === 1 || s.ter[ix(q.x, q.y)] === 2 || !adj(q))) continue;   // rounding must not break 'beside a node' in any sector
    chosen.push(p);
  }
  for (const p of chosen) for (const q of copies(p)) if (!s.points.some((r) => r.x === q.x && r.y === q.y)) s.points.push(q);
}

// ── hand-designed large maps ("sector specs", e.g. data/maps/large/*.json from the ChatGPT map session) ──
// A spec describes ONE sector (player 0, the west) in fractions of the board side: terrain features (polygon | ellipse | line), crossings, nodes,
// strategic points and the fortress. The other sectors are produced by rotating by 360/players degrees. Order of features matters: later paint over earlier.
const TERR_CODE = { plain: 0, rock: 1, water: 2, forest: 3, highland: 4, marsh: 5 };
export const specFortresses = (s, spec) => { const out = [], base = spec.fortresses || [spec.fortress]; for (let k = 0; k < orderOf(s); k++) for (const f of base) out.push(rotk(s, { x: Math.round(f[0] * s.N), y: Math.round(f[1] * s.N) }, k)); return out; };
const inPoly = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)); };
export function specLandscape(s, spec, F) {
  const N = s.N, put = (x, y, code) => { if (x >= 0 && y >= 0 && x < N && y < N) s.ter[y * N + x] = code; };
  const paint = (f, k) => {
    const code = TERR_CODE[f.type], P = f.points.map(([x, y]) => [x * N, y * N]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const pad = f.shape === 'line' ? (f.width || 0.03) * N : 1;
    for (let y = Math.floor(y0 - pad); y <= Math.ceil(y1 + pad); y++) for (let x = Math.floor(x0 - pad); x <= Math.ceil(x1 + pad); x++) {
      let hit = false;
      if (f.shape === 'polygon') hit = inPoly(x + 0.5, y + 0.5, P);
      else if (f.shape === 'ellipse') { const cx = (P[0][0] + P[1][0]) / 2, cy = (P[0][1] + P[1][1]) / 2, rx = Math.abs(P[1][0] - P[0][0]) / 2, ry = Math.abs(P[1][1] - P[0][1]) / 2; hit = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1; }
      else if (f.shape === 'line') hit = segDist(x + 0.5, y + 0.5, P[0], P[P.length - 1]) <= ((f.width || 0.03) * N) / 2;
      if (hit) { const q = rotk(s, { x, y }, k); put(q.x, q.y, code); }
    }
  };
  for (const f of spec.terrain) for (let k = 0; k < orderOf(s); k++) paint(f, k);
  const clear = (c, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) put(Math.round(c.x) + dx, Math.round(c.y) + dy, 0); };
  for (const c of spec.crossings || []) for (let k = 0; k < orderOf(s); k++) clear(rotk(s, { x: c.at[0] * N, y: c.at[1] * N }, k), Math.max(2, (c.width || 3) >> 1));   // designed crossings are open ground
  for (const f of F) clear(f, Math.max(4, Math.round(0.03 * N)));
  clear({ x: centre(s), y: centre(s) }, Math.max(4, Math.round(0.03 * N)));
  // safety net: if a fortress still cannot reach the next one over land, carve a 3-wide road to the hub (and warn)
  const reachable = () => { const seen = new Uint8Array(N * N), q = [F[0].y * N + F[0].x]; seen[q[0]] = 1; for (let h = 0; h < q.length; h++) { const k = q[h], x = k % N, y = (k - x) / N; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (seen[j] || s.ter[j] === 1 || s.ter[j] === 2) continue; seen[j] = 1; q.push(j); } } return F.every((f) => seen[f.y * N + f.x]); };
  if (!reachable()) { s.log.push({ msg: 'map spec: fortresses were cut off; carved roads to the hub', owner: -1, round: 0 }); const C = centre(s); for (const f of F) { const n = Math.ceil(Math.hypot(f.x - C, f.y - C)); for (let i = 0; i <= n; i++) clear({ x: f.x + ((C - f.x) * i) / n, y: f.y + ((C - f.y) * i) / n }, 1); } }
}
export function specPopulate(s, spec, taken) {
  const N = s.N, ix = (x, y) => y * N + x, ok = (x, y) => x >= 1 && y >= 1 && x < N - 1 && y < N - 1;
  const nodePos = spec.nodes.map((n) => ({ x: Math.round(n.at[0] * N), y: Math.round(n.at[1] * N), kind: n.kind }));
  for (let k = 0; k < orderOf(s); k++) for (const n of nodePos) { const q = rotk(s, n, k); if (!ok(q.x, q.y) || taken.has(ix(q.x, q.y)) || s.res[ix(q.x, q.y)]) continue; if (s.ter[ix(q.x, q.y)] !== 0) s.ter[ix(q.x, q.y)] = 0; s.res[ix(q.x, q.y)] = RES_CODE[n.kind]; taken.add(ix(q.x, q.y)); }
  const spots = [];
  for (const p of spec.points) {                                      // a point goes on the free square beside its node that lies closest to the stated position
    const nd = nodePos[p.nextToNode] || nodePos[0], want = { x: p.at[0] * N, y: p.at[1] * N };
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => ({ x: nd.x + a, y: nd.y + b })).filter((c) => ok(c.x, c.y) && !nodePos.some((m) => m.x === c.x && m.y === c.y));
    opts.sort((a, b) => Math.hypot(a.x - want.x, a.y - want.y) - Math.hypot(b.x - want.x, b.y - want.y)); if (opts[0]) spots.push(opts[0]);
  }
  for (let k = 0; k < orderOf(s); k++) for (const sp of spots) { const q = rotk(s, sp, k); if (!ok(q.x, q.y) || s.res[ix(q.x, q.y)] || taken.has(ix(q.x, q.y)) || s.points.some((r) => r.x === q.x && r.y === q.y)) continue; if (s.ter[ix(q.x, q.y)] === 1 || s.ter[ix(q.x, q.y)] === 2) s.ter[ix(q.x, q.y)] = 0; s.points.push(q); }
}

// ═════════ the island map (the Lotus lesson): a central island ringed by a moat, reachable only over narrow bridges; sectors split by ridges with gates ═════════
// Defence is legible: a bridge is a 1-wide choke, a gate is a 5-wide pass, the island rim is highland (towers one level higher), and richness grows toward the centre
// (s.mult: yield multiplier of a node — 1 outer, 2 middle ring, 3 on the island).
const START_PATTERN = [['gold', 4, -3], ['gold', 5, 3], ['gold', 7, 0], ['iron', 3, 5], ['iron', 3, -5], ['iron', 8, -3], ['faith', 6, -6], ['soul', 6, 6], ['aether', 9, 3], ['ember', 9, -4]];   // [kind, forward, sideways] in a frame facing the board centre
export function startRing(s, F, taken) {                           // 10 nodes of all six kinds within ~10 squares of EVERY fortress, in front of it (towards the centre), so the first turns can build an economy
  const N = s.N, C = centre(s), ix = (x, y) => y * N + x, free = (x, y) => x >= 1 && y >= 1 && x < N - 1 && y < N - 1 && !blockedT(s, x, y) && !s.res[ix(x, y)] && !s.points.some((p) => p.x === x && p.y === y);
  for (const f of F) {
    const a = Math.atan2(C - f.y, C - f.x), cs = Math.cos(a), sn = Math.sin(a);
    for (const [kind, u, v] of START_PATTERN) {
      const bx = Math.round(f.x + u * cs - v * sn), by = Math.round(f.y + u * sn + v * cs); let done = false;
      for (let r = 0; r <= 3 && !done; r++) for (let dy = -r; dy <= r && !done; dy++) for (let dx = -r; dx <= r && !done; dx++) { const x = bx + dx, y = by + dy; if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !free(x, y)) continue; if (s.ter[ix(x, y)] === 5) s.ter[ix(x, y)] = 0; s.res[ix(x, y)] = RES_CODE[kind]; taken.add(ix(x, y)); done = true; }
    }
  }
}
const blockedT = (s, x, y) => s.ter[y * s.N + x] === 1 || s.ter[y * s.N + x] === 2;
export function islandLandscape(s, F) {
  const N = s.N, C = centre(s), ord = orderOf(s), seed = (s.seed | 0) % 100003, sc = 1 / (0.13 * N), put = (x, y, t) => { if (x >= 0 && y >= 0 && x < N && y < N) s.ter[y * N + x] = t; };
  const Ri = Math.max(6, Math.round(0.085 * N)), Wm = Math.max(3, Math.round(0.04 * N)), R0 = Ri + Wm; s.island = { Ri, Wm, R0 };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {                      // soft scenery: forests, highland knolls, marsh pockets (nothing impassable from noise)
    const f = fold(s, x, y), nx = f.x * sc, ny = f.y * sc, wood = fbm(nx - 40.1, ny + 7.9, seed + 202), high = fbm(nx + 9.3, ny + 55.5, seed + 303), mar = fbm(nx + 31.7, ny - 12.3, seed + 101);
    s.ter[y * N + x] = wood > 0.6 ? 3 : high > 0.66 ? 4 : mar > 0.71 ? 5 : 0;
  }
  const B = ord * Math.ceil(4 / ord), bridgeAng = Array.from({ length: B }, (_, j) => Math.PI + (TAU * j) / B);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - C, dy = y - C, r = Math.hypot(dx, dy);
    if (r <= Ri) s.ter[y * N + x] = r > Ri - 2 ? 4 : 0;                          // the island: plain inside, a highland rim (a tower on the rim is one level higher)
    else if (r <= R0) {                                                          // the moat, with bridges one square wide
      let bridge = false; for (const a of bridgeAng) { const along = dx * Math.cos(a) + dy * Math.sin(a), perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)); if (along > 0 && perp <= 0.55) bridge = true; }
      s.ter[y * N + x] = bridge ? 0 : 2;
    }
  }
  // ridges along the boundaries between neighbouring seats, each with two 5-wide gates
  for (let k = 0; k < ord; k++) {
    const phi = Math.PI + Math.PI / ord + (TAU * k) / ord, cp = Math.cos(phi), sp = Math.sin(phi), r0 = R0 + 3, r1 = 0.48 * N, g1 = r0 + 0.34 * (r1 - r0), g2 = r0 + 0.76 * (r1 - r0);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x - C, dy = y - C, along = dx * cp + dy * sp, perp = Math.abs(-dx * sp + dy * cp);
      if (along < r0 || along > r1 || perp > 1.6) continue;
      if (Math.abs(along - g1) <= 2.6 || Math.abs(along - g2) <= 2.6) { s.ter[y * N + x] = 0; continue; }
      s.ter[y * N + x] = 1;
    }
  }
  const clearR = Math.max(5, Math.round(0.045 * N)); for (const f of F) for (let dy = -clearR; dy <= clearR; dy++) for (let dx = -clearR; dx <= clearR; dx++) if (dx * dx + dy * dy <= clearR * clearR) put(f.x + dx, f.y + dy, 0);
}
export function islandPopulate(s, F, taken) {
  const N = s.N, np = s.np, ord = orderOf(s), C = centre(s), rng = s.rng, ix = (x, y) => y * N + x, { Ri, R0 } = s.island, f = (N * N / np) / 2812;
  s.mult = new Uint8Array(N * N).fill(1);
  const ok = (x, y) => x >= 1 && y >= 1 && x < N - 1 && y < N - 1 && !blockedT(s, x, y) && !s.res[ix(x, y)] && !taken.has(ix(x, y));
  const copies = (pt) => Array.from({ length: ord }, (_, k) => rotk(s, pt, k));
  const nearFort = (p, r) => F.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) <= r);
  const polar = (rho, phi) => ({ x: Math.round(C + rho * Math.cos(phi)), y: Math.round(C + rho * Math.sin(phi)) });
  const put = (kind, p, mult) => { const cs = copies(p); if (!cs.every((q) => ok(q.x, q.y)) || new Set(cs.map((q) => ix(q.x, q.y))).size !== ord) return false; for (const q of cs) { if (s.ter[ix(q.x, q.y)] === 5) s.ter[ix(q.x, q.y)] = 0; s.res[ix(q.x, q.y)] = RES_CODE[kind]; s.mult[ix(q.x, q.y)] = mult; taken.add(ix(q.x, q.y)); } return true; };
  const wedge = () => Math.PI + (rng() - 0.5) * (TAU / ord);
  const zone = (kinds, n, rlo, rhi, mult, avoidFort) => { let placed = 0, guard = 0; while (placed < n && guard++ < 4000) { const kind = kinds[placed % kinds.length]; if (put(kind, ((p) => (avoidFort && nearFort(p, 10) ? { x: -1, y: -1 } : p))(polar(rlo + rng() * (rhi - rlo), wedge())), mult)) placed++; } };
  const nI = Math.max(4, Math.round(4 * Math.sqrt(f))), nM = Math.round(14 * Math.pow(f, 0.55)), nO = Math.round(18 * Math.pow(f, 0.6));
  zone(['aether', 'ember', 'soul', 'faith', 'gold', 'iron'], nI, 2, Ri - 3, 3, false);                            // the island: richest (x3), mostly Mana and Spirit
  zone(['gold', 'iron', 'faith', 'soul', 'aether', 'ember'], nM, R0 + 3, 0.31 * N, 2, true);                       // the middle ring (x2)
  zone(['gold', 'iron', 'gold', 'iron', 'faith', 'soul'], nO, 0.31 * N, 0.47 * N, 1, true);                        // the outer fields (x1): the mines
  // gate-houses: a node pair at each bridge head and gate, with a strategic point beside them, so every choke is worth holding
  const pts = [];
  for (let j = 0; j < Math.ceil(4 / ord) * ord; j++) {
    const a = Math.PI + (TAU * j) / (ord * Math.ceil(4 / ord)); if (Math.abs(Math.atan2(Math.sin(a - Math.PI), Math.cos(a - Math.PI))) > Math.PI / ord + 1e-6) continue;       // bridges of the base sector only
    for (const side of [-1, 1]) { const rho = R0 + 4, p = { x: Math.round(C + rho * Math.cos(a) - side * 3 * Math.sin(a)), y: Math.round(C + rho * Math.sin(a) + side * 3 * Math.cos(a)) }; if (put(side < 0 ? 'iron' : 'gold', p, 2)) pts.push({ x: p.x + Math.round(-Math.cos(a)), y: p.y + Math.round(-Math.sin(a)), force: true }); }
  }
  const pointsPP = Math.round(16 * Math.sqrt(f)), spacing = Math.max(5, Math.round(0.6 * Math.sqrt((N * N / np) / pointsPP))), adj = (q) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => q.x + a >= 0 && q.y + b >= 0 && q.x + a < N && q.y + b < N && s.res[ix(q.x + a, q.y + b)]);
  const chosen = []; const okPt = (q) => q.x >= 1 && q.y >= 1 && q.x < N - 1 && q.y < N - 1 && !blockedT(s, q.x, q.y) && !s.res[ix(q.x, q.y)];
  for (const p of pts) if (okPt(p) && adj(p) && copies(p).every((q) => okPt(q) && adj(q))) chosen.push(p);
  const cand = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const p = { x, y }; if (okPt(p) && inSector(s, p) && adj(p)) cand.push(p); }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  for (const p of cand) { if (chosen.length >= pointsPP) break; if (nearFort(p, 6) || chosen.some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) < spacing)) continue; if (copies(p).every((q) => okPt(q) && adj(q))) chosen.push(p); }
  for (const p of chosen) for (const q of copies(p)) if (!s.points.some((r) => r.x === q.x && r.y === q.y)) s.points.push(q);
  startRing(s, F, taken);                                                                                          // finally the starting ring at every fortress (placed last so nothing else crowds it; points already avoid fortress surroundings)
}
