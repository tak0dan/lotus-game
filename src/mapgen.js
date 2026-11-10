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
export function rotk(s, pt, k) {                                   // rotate a square by k sectors about the board centre
  if (k === 0) return { x: pt.x, y: pt.y };
  if (s.np === 2) return { x: s.N - 1 - pt.x, y: s.N - 1 - pt.y };
  const C = centre(s), a = (TAU * k) / s.np, dx = pt.x - C, dy = pt.y - C;
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
export const specFortresses = (s, spec) => { const out = []; for (let k = 0; k < s.np; k++) out.push(rotk(s, { x: Math.round(spec.fortress[0] * s.N), y: Math.round(spec.fortress[1] * s.N) }, k)); return out; };
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
  for (const f of spec.terrain) for (let k = 0; k < s.np; k++) paint(f, k);
  const clear = (c, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) put(Math.round(c.x) + dx, Math.round(c.y) + dy, 0); };
  for (const c of spec.crossings || []) for (let k = 0; k < s.np; k++) clear(rotk(s, { x: c.at[0] * N, y: c.at[1] * N }, k), Math.max(2, (c.width || 3) >> 1));   // designed crossings are open ground
  for (const f of F) clear(f, Math.max(4, Math.round(0.03 * N)));
  clear({ x: centre(s), y: centre(s) }, Math.max(4, Math.round(0.03 * N)));
  // safety net: if a fortress still cannot reach the next one over land, carve a 3-wide road to the hub (and warn)
  const reachable = () => { const seen = new Uint8Array(N * N), q = [F[0].y * N + F[0].x]; seen[q[0]] = 1; for (let h = 0; h < q.length; h++) { const k = q[h], x = k % N, y = (k - x) / N; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (seen[j] || s.ter[j] === 1 || s.ter[j] === 2) continue; seen[j] = 1; q.push(j); } } return F.every((f) => seen[f.y * N + f.x]); };
  if (!reachable()) { s.log.push({ msg: 'map spec: fortresses were cut off; carved roads to the hub', owner: -1, round: 0 }); const C = centre(s); for (const f of F) { const n = Math.ceil(Math.hypot(f.x - C, f.y - C)); for (let i = 0; i <= n; i++) clear({ x: f.x + ((C - f.x) * i) / n, y: f.y + ((C - f.y) * i) / n }, 1); } }
}
export function specPopulate(s, spec, taken) {
  const N = s.N, ix = (x, y) => y * N + x, ok = (x, y) => x >= 1 && y >= 1 && x < N - 1 && y < N - 1;
  const nodePos = spec.nodes.map((n) => ({ x: Math.round(n.at[0] * N), y: Math.round(n.at[1] * N), kind: n.kind }));
  for (let k = 0; k < s.np; k++) for (const n of nodePos) { const q = rotk(s, n, k); if (!ok(q.x, q.y) || taken.has(ix(q.x, q.y)) || s.res[ix(q.x, q.y)]) continue; if (s.ter[ix(q.x, q.y)] !== 0) s.ter[ix(q.x, q.y)] = 0; s.res[ix(q.x, q.y)] = RES_CODE[n.kind]; taken.add(ix(q.x, q.y)); }
  const spots = [];
  for (const p of spec.points) {                                      // a point goes on the free square beside its node that lies closest to the stated position
    const nd = nodePos[p.nextToNode] || nodePos[0], want = { x: p.at[0] * N, y: p.at[1] * N };
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => ({ x: nd.x + a, y: nd.y + b })).filter((c) => ok(c.x, c.y) && !nodePos.some((m) => m.x === c.x && m.y === c.y));
    opts.sort((a, b) => Math.hypot(a.x - want.x, a.y - want.y) - Math.hypot(b.x - want.x, b.y - want.y)); if (opts[0]) spots.push(opts[0]);
  }
  for (let k = 0; k < s.np; k++) for (const sp of spots) { const q = rotk(s, sp, k); if (!ok(q.x, q.y) || s.res[ix(q.x, q.y)] || taken.has(ix(q.x, q.y)) || s.points.some((r) => r.x === q.x && r.y === q.y)) continue; if (s.ter[ix(q.x, q.y)] === 1 || s.ter[ix(q.x, q.y)] === 2) s.ter[ix(q.x, q.y)] = 0; s.points.push(q); }
}
