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
