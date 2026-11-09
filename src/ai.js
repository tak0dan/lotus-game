// THE TOWER GAME — opponent. Plans a whole year of orders through the SAME planning API the UI uses (R.setMove, R.planAttack, ...),
// without looking at the human's orders. Heuristic, objective-driven: economy first, then expansion, then coordinated strikes and sieges.
import * as R from './rules.js';
import { UNITS, TECHS, MAX_LEVELS } from './balance.js';

const WANT = { infantry: 5, archer: 2, cavalry: 2, heavy_infantry: 2, siege: 2, heavy_cavalry: 1, mage: 0, dragon: 0 };

function field(s, goals) {                                   // BFS path distance over squares not blocked by tower bases
  const N = s.N, dist = new Int16Array(N * N).fill(-1), q = [];
  for (const g of goals) { const k = R.ix(s, g.x, g.y); if (dist[k] < 0) { dist[k] = 0; q.push(k); } }
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % N, y = (k - x) / N, d = dist[k] + 1;
    for (const [dx, dy] of R.ORTH) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (dist[j] >= 0 || s.tg[j]) continue; dist[j] = d; q.push(j); } }
  return dist;
}
const fd = (s, f, x, y) => { const v = f[R.ix(s, x, y)]; return v < 0 ? 999 : v; };

export function planYear(s, p) {
  R.clearOrders(s, p);
  const E = 1 - p, pl = s.pl[p], busy = new Set();
  const mine = () => s.units.filter((u) => u.owner === p && !u.idle);
  const foes = () => s.units.filter((u) => u.owner === E);
  const myT = () => s.towers.filter((t) => t.owner === p), enT = () => s.towers.filter((t) => t.owner === E);
  const myF = R.towerById(s, s.fortress[p]) || myT()[0], enF = R.towerById(s, s.fortress[E]);
  const free = (u) => !busy.has(u.id) && !u.idle;
  const nearest = (list, from) => list.reduce((b, x) => (!b || R.manh(x, from) < R.manh(b, from) ? x : b), null);

  // ── 0. research (when rich enough and it would matter) ──
  if (!pl.tech.siegecraft && pl.iron >= 12 && s.units.some((u) => u.owner === p && u.type === 'siege')) R.setResearch(s, p, 'siegecraft');

  // ── 1. strikes: coordinated attacks (ATK + 1 per other friend on the same target) ──
  const attackers = mine().filter((u) => !UNITS[u.type].siege);
  const targets = foes().filter((t) => t.z === 0 || attackers.some((a) => UNITS[a.type].rng > 0));
  const value = (t) => UNITS[t.type].atk + UNITS[t.type].def + (UNITS[t.type].siege ? 3 : 0);
  for (const t of targets.sort((a, b) => value(b) - value(a))) {
    const can = attackers.filter((a) => free(a) && canHit(s, a, t)); if (!can.length) continue;
    can.sort((a, b) => UNITS[b.type].atk - UNITS[a.type].atk);
    for (let n = 1; n <= can.length; n++) {                                 // smallest group that actually wins
      const grp = can.slice(0, n), def = UNITS[t.type].def + (t.z === 1 && !grp.every((g) => UNITS[g.type].arcane) ? 2 : 0);
      if (grp.every((g) => UNITS[g.type].atk + (n - 1) > def)) { for (const g of grp) if (R.planAttack(s, p, g.id, t.id)) busy.add(g.id); break; }
    }
  }
  // ── 2. sieges ──
  for (const u of mine().filter((z) => UNITS[z.type].siege && free(z))) {
    const tw = enT().filter((t) => R.canSiege(s, u, t, u, true)).sort((a, b) => (b.fortress ? 1 : 0) - (a.fortress ? 1 : 0))[0];
    if (tw && R.planAttack(s, p, u.id, tw.id, true)) busy.add(u.id);
  }
  // ── 3. garrisons: every tower with a level gets a defender ──
  for (const t of myT().filter((z) => z.levels.length && !z.garrison)) {
    const c = nearest(mine().filter((u) => free(u) && UNITS[u.type].climb && !(R.plannedPos(s, u).x === t.x && R.plannedPos(s, u).y === t.y)), t);
    if (c && R.setMove(s, p, c.id, t.x, t.y)) busy.add(c.id);
  }
  // ── 4. levels for towers that are short ──
  for (const t of myT()) {
    const want = t.fortress ? 2 : 1 + (isPoint(s, t) ? 1 : 0);
    if (t.levels.length >= want || t.builtRound === s.round) continue;
    let tended = t.garrison && t.garrison.owner === p;
    if (!tended) { const b = nearest(mine().filter((u) => free(u) && UNITS[u.type].builder), t); if (b) { const adj = adjacentTo(s, b, t); if (adj && R.setMove(s, p, b.id, adj.x, adj.y)) { busy.add(b.id); tended = true; } } }
    if (tended) R.setBuildLevel(s, p, t.id, pl.iron >= 10) || R.setBuildLevel(s, p, t.id, false);   // spend spare iron on reinforced levels
  }
  // ── 5. new foundations: strategic points first, then resource cells, plus one workshop by the fortress ──
  let founded = 0;
  const cells = [];
  for (const pt of s.points) if (!s.tg[R.ix(s, pt.x, pt.y)]) cells.push({ ...pt, w: 6, spec: 'outpost' });
  for (let y = 0; y < s.N; y++) for (let x = 0; x < s.N; x++) { const c = s.res[R.ix(s, x, y)]; if (c && !s.tg[R.ix(s, x, y)]) cells.push({ x, y, w: c === 2 ? 4 : c === 1 ? 3 : 2, spec: 'outpost' }); }
  if (myF && !myT().some((t) => t.spec === 'workshop') && pl.iron >= 5) { const c = nearFree(s, myF, 2, 4); if (c) cells.push({ ...c, w: 5, spec: 'workshop' }); }
  const hasEnemyNear = (c) => foes().some((f) => R.manh(f, c) <= 4);
  cells.sort((a, b) => (b.w - R.manh(b, myF) * 0.12) - (a.w - R.manh(a, myF) * 0.12));
  for (const c of cells) {
    if (founded >= 2 || myT().length >= 3 + s.points.length) break;
    if (hasEnemyNear(c) || s.ug[R.ix(s, c.x, c.y)]) continue;
    const b = nearest(mine().filter((u) => free(u) && UNITS[u.type].builder), c); if (!b) break;
    const adj = adjacentTo(s, b, c); if (!adj || R.manh(b, adj) > UNITS.infantry.mov) continue;
    if (!R.setMove(s, p, b.id, adj.x, adj.y) && !(b.x === adj.x && b.y === adj.y)) continue;
    if (R.setBuildFoundation(s, p, b.id, c.x, c.y, c.spec)) { busy.add(b.id); founded++; }
  }
  // ── 6. recruiting: stay solvent ──
  const counts = {}; for (const u of s.units) if (u.owner === p) counts[u.type] = (counts[u.type] || 0) + 1;
  for (const t of myT()) for (const q of t.queue) counts[q.type] = (counts[q.type] || 0) + 1;
  const inc = R.incomeOf(s, p).gold, up = R.upkeepOf(s, p);
  for (const t of myT()) {
    for (let slot = 0; slot < R.queueSlots(t) - t.queue.length; slot++) {
      const options = Object.keys(UNITS).filter((ty) => R.recruitable(s, t, ty) && (counts[ty] || 0) < (WANT[ty] ?? 0) + (enT().length ? 2 : 0));
      options.sort((a, b) => ((counts[a] || 0) / (WANT[a] || 1)) - ((counts[b] || 0) / (WANT[b] || 1)));
      for (const ty of options) {
        const gAfter = pl.gold - (R.committed(s, p).gold + UNITS[ty].cost.gold || 0), net = inc - up - UNITS[ty].upkeep;
        if (net < -4 && pl.gold < 12) continue;                                 // not sustainable
        if (gAfter + 2 * Math.min(0, net) < 0) continue;
        if (R.setRecruit(s, p, t.id, ty)) { counts[ty] = (counts[ty] || 0) + 1; break; }
      }
    }
  }
  // ── 7. economy squatters: stand on free resource cells ──
  const squat = [];
  for (let y = 0; y < s.N; y++) for (let x = 0; x < s.N; x++) { const c = s.res[R.ix(s, x, y)]; if (c && !s.tg[R.ix(s, x, y)] && !(s.ug[R.ix(s, x, y)] && s.ug[R.ix(s, x, y)].owner === p)) squat.push({ x, y, w: c === 1 ? 3 : c === 2 ? 3 : 2 }); }
  squat.sort((a, b) => (b.w - R.manh(b, myF) * 0.15) - (a.w - R.manh(a, myF) * 0.15));
  let sent = 0;
  for (const c of squat) { if (sent >= 6) break;
    const u = nearest(mine().filter((z) => free(z) && (z.type === 'infantry' || z.type === 'archer') && !z.z && R.manh(z, c) <= UNITS[z.type].mov + 2 && !foes().some((f) => R.manh(f, c) <= 3)), c);
    if (u && R.setMove(s, p, u.id, c.x, c.y)) { busy.add(u.id); sent++; } }
  // ── 8. the army: advance when strong enough, otherwise hold the home ground ──
  const str = (list) => list.reduce((a, u) => a + UNITS[u.type].atk + UNITS[u.type].def, 0);
  const army = mine().filter((u) => free(u) && !UNITS[u.type].builder || (free(u) && s.units.filter((z) => z.owner === p && z.type === 'infantry').length > 4 && !u.z));
  const armyPool = army.filter((u) => u.z === 0 && !(UNITS[u.type].siege && !enT().length));
  const aggressive = s.round >= 6 && str(armyPool) >= 0.5 * str(foes().filter((u) => UNITS[u.type].mov > 0));
  const goals = aggressive ? (enT().length ? enT().sort((a, b) => (b.fortress ? 1 : 0) - (a.fortress ? 1 : 0) || R.manh(a, myF) - R.manh(b, myF)).slice(0, 3) : foes()) : [myF, ...s.points.filter((pt) => R.pointOwner(s, pt) !== E)].filter(Boolean);
  const f = field(s, goals.map((g) => ({ x: g.x, y: g.y })));
  const escort = (u) => !UNITS[u.type].siege || armyPool.filter((z) => z !== u && !UNITS[z.type].siege && R.manh(z, u) <= 3).length >= 1;   // siege only advances with an escort
  for (const u of armyPool) {
    if (!escort(u)) continue;
    const r = R.reach(s, u); let best = null, bd = fd(s, f, u.x, u.y);
    for (const [k, e] of r) { const x = k % s.N, y = Math.floor(k / s.N), d = fd(s, f, x, y); if (d < bd || (d === bd && best && e.cost < best.cost)) { bd = d; best = { x, y, cost: e.cost }; } }
    if (best && !(R.manh(best, u) === 0)) { if (!aggressive && bd < 3) continue; R.setMove(s, p, u.id, best.x, best.y); }
  }
  return s.orders[p];
}
function canHit(s, a, t) { const d = UNITS[a.type]; if (d.siege) return false; const r = R.reach(s, a); if (R.canStrike(s, a, t)) return true; for (const [k, e] of r) { if (R.canStrike(s, a, t, { x: k % s.N, y: Math.floor(k / s.N), z: e.climb ? 1 : 0 })) return true; } return false; }
const isPoint = (s, t) => s.points.some((p) => p.x === t.x && p.y === t.y);
function adjacentTo(s, u, c) {                                // free square next to c that u can reach (or stands on)
  let best = null;
  for (const [dx, dy] of R.ORTH) { const x = c.x + dx, y = c.y + dy; if (!R.inb(s, x, y) || s.tg[R.ix(s, x, y)]) continue;
    if (u.x === x && u.y === y) return { x, y };
    if (s.ug[R.ix(s, x, y)]) continue; const e = R.reach(s, u).get(R.ix(s, x, y)); if (e && (!best || e.cost < best.cost)) best = { x, y, cost: e.cost }; }
  return best;
}
function nearFree(s, c, lo, hi) {
  for (let r = lo; r <= hi; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.abs(dx) + Math.abs(dy) !== r) continue; const x = c.x + dx, y = c.y + dy;
    if (R.inb(s, x, y) && !s.tg[R.ix(s, x, y)] && !s.ug[R.ix(s, x, y)] && !s.res[R.ix(s, x, y)] && !s.points.some((p) => p.x === x && p.y === y)) return { x, y }; }
  return null;
}
