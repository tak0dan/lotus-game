// usage: node tools/mapstat.mjs data/maps/large/<map>.json [out.json] [out.ppm]   — measured coverage, node rings, distances, connectivity
import fs from 'fs'; import * as R from '../src/rules.js';
const L = JSON.parse(fs.readFileSync(process.argv[2])); const s = R.newGame({ layout: L, seed: 1 }); const N = s.N, np = s.np;
const cnt = Array(6).fill(0); for (const v of s.ter) cnt[v]++; const tot = N * N;
const bfs = (sx, sy) => { const d = new Int32Array(N * N).fill(-1); const q = [sy * N + sx]; d[q[0]] = 0; for (let h = 0; h < q.length; h++) { const k = q[h], x = k % N, y = (k - x) / N; for (const [a, b] of R.ORTH) { const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (d[j] >= 0 || R.blocked(s, nx, ny)) continue; d[j] = d[k] + 1; q.push(j); } } return d; };
const F = s.fortress.map((id) => R.towerById(s, id)), c = Math.floor(N / 2);
const d0 = bfs(F[0].x, F[0].y);
const ringsOf = (p) => { const near = []; for (const i of s.nodes) { const x = i % N, y = (i - x) / N, ds = F.map((f) => Math.abs(x - f.x) + Math.abs(y - f.y)), m = Math.min(...ds); if (ds.indexOf(m) === p) near.push(d0 === null ? m : m); } return near; };
const out = { map: L.name, players: np, board: N, coverage: Object.fromEntries(cnt.map((v, i) => [R.TERRAIN[i], +(100 * v / tot).toFixed(1)])), impassablePct: +(100 * (cnt[1] + cnt[2]) / tot).toFixed(1), nodes: s.nodes.length, points: s.points.length, fortresses: F.map((f) => [f.x, f.y]) };
const dist0 = (p) => { const d = bfs(F[p].x, F[p].y); const near = []; for (const i of s.nodes) { const x = i % N, y = (i - x) / N, ds = F.map((f) => Math.abs(x - f.x) + Math.abs(y - f.y)); if (ds.indexOf(Math.min(...ds)) === p && d[i] >= 0) near.push(d[i]); } return near; };
for (const p of [0, 1].filter((q) => q < F.length)) { const near = dist0(p); out['seat' + p + '_nodePathDist_<=14,15-40,41+'] = [near.filter((v) => v <= 14).length, near.filter((v) => v > 14 && v <= 40).length, near.filter((v) => v > 40).length]; out['seat' + p + '_nodesOwned'] = near.length; }
const reach = (p, q) => d0[F[q].y * N + F[q].x]; out.pathFromSeat0 = Object.fromEntries(F.map((f, q) => [q, d0[f.y * N + f.x]])); out.pathSeat0ToHub = d0[c * N + c];
out.allFortressesConnected = F.every((f) => d0[f.y * N + f.x] >= 0);
out.freeRecruitSquaresSeat0 = R.ORTH.filter(([a, b]) => { const x = F[0].x + a, y = F[0].y + b; return !R.blocked(s, x, y); }).length;
const bad = s.points.filter((p) => s.res[R.ix(s, p.x, p.y)]).length, adj = s.points.every((p) => R.ORTH.some(([a, b]) => s.res[R.ix(s, p.x + a, p.y + b)])); out.pointsOnNodes = bad; out.pointsAllAdjacent = adj;
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
if (process.argv[4]) { const K = Math.max(1, Math.floor(900 / N)), W = N * K, buf = Buffer.alloc(W * W * 3), col = [[70, 74, 60], [120, 120, 125], [40, 70, 120], [40, 90, 50], [150, 125, 80], [90, 100, 70]], rc = [null, [230, 190, 60], [190, 190, 200], [120, 170, 255], [255, 140, 70], [240, 235, 200], [190, 150, 255]];
  const put = (x, y, c2) => { for (let dy = 0; dy < K; dy++) for (let dx = 0; dx < K; dx++) { const o = ((y * K + dy) * W + x * K + dx) * 3; buf[o] = c2[0]; buf[o + 1] = c2[1]; buf[o + 2] = c2[2]; } };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; put(x, y, s.res[i] ? rc[s.res[i]] : col[s.ter[i]]); }
  for (const p of s.points) put(p.x, p.y, [255, 255, 255]); for (const f of F) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(f.x + dx, f.y + dy, [255, 60, 60]);
  fs.writeFileSync(process.argv[4], Buffer.concat([Buffer.from(`P6\n${W} ${W}\n255\n`), buf])); }
console.log(JSON.stringify(out));
