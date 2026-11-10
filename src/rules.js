// THE TOWER GAME — rules engine. Pure logic (no DOM / Three). Used by the UI, the AI and the headless simulator.
// Source of truth: "The Tower Game Rulebook v1.0". Anything the rulebook leaves open is a [DECISION], and every number lives in balance.js.
//
// A game is a series of YEARS. Each year: both players plan orders in secret, then it resolves in phases:
//   economy -> recruitment -> movement -> combat -> building -> control -> end of year (upkeep, victory checks).
// No dice anywhere. Combat is deterministic: every strike is one hit; a unit dies when it has taken as many hits as it needs (most 1, Dragon 5), and heals fully at year end.
//
// ECONOMY (designer's ruling, overrides rulebook §15.3 "unspent resources are kept"): resources are a per-year BUDGET, like tapping lands in MTG.
// Each year the nodes you control give you a fixed amount of gold/iron/mana to spend; it does NOT accumulate — unspent resources are lost.
// Upkeep is paid first, out of the year's gold. The first year also gets a one-time opening budget (balance.js START_RESOURCES).

import { UNITS, FOUNDATION_HP, NORMAL_HP, REINFORCED_HP, MAX_LEVELS, GARRISON_HITS, DRAGON, ATTACH_BONUS_MIN, ARCANE_CONVERT, ONLY_GATHERERS, COSTS, FORTRESS_SPECS, FORTRESS, QUEUE_SLOTS, YIELD, DOUBLERS, PRIMARY_YIELD, PRIEST_RADIUS,
  START_RESOURCES, TECHS, FORTRESS_HOLD_YEARS, POINTS_HOLD_YEARS, FAMILIES, FAMILY_LIST, SUBTYPES, FAMILY_OF, RES_ALL } from './balance.js';

const SPECS_OK = ['outpost', 'barracks', 'stable', 'range', 'workshop', 'lair', 'monastery'];
export const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const RES_NAMES = [null, ...SUBTYPES]; export const RES_CODE = Object.fromEntries(SUBTYPES.map((k, i) => [k, i + 1]));
export const PHASES = ['economy', 'recruitment', 'movement', 'combat', 'building', 'control', 'endyear'];
export const inb = (s, x, y) => x >= 0 && y >= 0 && x < s.N && y < s.N;
export const ix = (s, x, y) => y * s.N + x;
export const manh = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ───────────────────────── state & scenario ─────────────────────────
export function newGame({ size = 75, seed = (Math.random() * 1e9) | 0, res = null } = {}) {   // res: optional per-year budget FLOOR, e.g. { gold: 500, iron: 500, mana: 500 } — every year each player has at least this much (fast/dirty playtests)
  const s = {
    N: size, seed, rng: mulberry32(seed), round: 1, first: 0, phase: 'plan', uid: 1, winner: null, winReason: '',
    res: new Uint8Array(size * size), points: [], units: [], towers: [], ug: new Array(size * size).fill(null), tg: new Array(size * size).fill(null),
    pl: [0, 1].map(() => ({ ...Object.fromEntries(RES_ALL.map((k) => [k, 0])), tech: { dragonlore: false, siegecraft: false, runic: false }, unpaid: 0 })), floor: res,
    orders: [blankOrders(), blankOrders()], clashes: [], log: [], events: [], fortress: [null, null], held: [0, 0], pointsHeld: [0, 0], stats: { kills: [0, 0], lost: [0, 0], levelsLost: 0, sieges: 0, wasted: [0, 0] },
  };
  scenario(s);
  refreshBudget(s, true);
  return s;
}
const blankOrders = () => ({ moves: {}, attacks: [], siege: [], builds: [], recruits: [], research: [], disband: [], flights: [], convert: [] });
export const say = (s, msg, owner = -1) => { s.log.push({ msg, owner, round: s.round }); s.events.push({ t: 'log', msg, owner }); };

export function addUnit(s, type, owner, x, y, z = 0) {
  const u = { id: s.uid++, type, owner, x, y, z, moved: false, idle: false, vH: false, vP: false, dmg: 0 };
  s.units.push(u); if (z === 0) s.ug[ix(s, x, y)] = u;
  s.events.push({ t: 'spawn', unit: snapU(u) });
  return u;
}
export function addTower(s, owner, x, y, spec, levels = [], fortress = false) {
  const t = { id: s.uid++, x, y, owner, spec, levels: levels.map((k) => ({ kind: k, hp: k === 'reinforced' ? REINFORCED_HP : NORMAL_HP })), fHp: FOUNDATION_HP, queue: [], fortress, garrison: null, builtRound: 0 };
  s.towers.push(t); s.tg[ix(s, x, y)] = t; s.events.push({ t: 'towerNew', tower: snapT(t) });
  return t;
}
export const snapU = (u) => ({ id: u.id, type: u.type, owner: u.owner, x: u.x, y: u.y, z: u.z });
export const snapT = (t) => ({ id: t.id, x: t.x, y: t.y, owner: t.owner, spec: t.spec, fortress: t.fortress, fHp: t.fHp, levels: t.levels.map((l) => ({ kind: l.kind, hp: l.hp })), garrison: t.garrison ? t.garrison.id : null });
export const unitById = (s, id) => s.units.find((u) => u.id === id);
export const towerById = (s, id) => s.towers.find((t) => t.id === id);
export const unitAt = (s, x, y) => s.ug[ix(s, x, y)];
export const towerAt = (s, x, y) => s.tg[ix(s, x, y)];

// Scenario "Two Fortresses": 180-degree symmetric. Rulebook: a 30x30 cut of the full map is recommended for first tests; bigger sizes scale the same layout.
function scenario(s) {
  const N = s.N, sc = N / 30, rot = (p) => ({ x: N - 1 - p.x, y: N - 1 - p.y });
  const F = [{ x: Math.round(4 * sc), y: Math.round(14 * sc) }]; F.push(rot(F[0]));
  const taken = new Set(); const take = (p) => taken.add(ix(s, p.x, p.y));
  for (const f of F) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) take({ x: f.x + dx, y: f.y + dy });
  // resource cells, mirrored
  const k = Math.max(1, Math.round(sc * sc / 2.2)), want = [['gold', 3 * k], ['iron', 3 * k], ['aether', k], ['ember', k], ['faith', k], ['soul', k]];
  for (const [kind, n] of want) {
    let placed = 0, guard = 0;
    while (placed < n && guard++ < 4000) {
      const mid = FAMILY_OF[kind] !== 'physical', lo = mid ? 0.34 : 0.04, hi = mid ? 0.49 : 0.46;     // Mana and Spirit nodes sit in the neutral middle
      const p = { x: Math.floor((lo + s.rng() * (hi - lo)) * N), y: Math.floor((0.06 + s.rng() * 0.88) * N) }, q = rot(p);
      if (!inb(s, p.x, p.y) || taken.has(ix(s, p.x, p.y)) || taken.has(ix(s, q.x, q.y)) || (p.x === q.x && p.y === q.y)) continue;
      s.res[ix(s, p.x, p.y)] = s.res[ix(s, q.x, q.y)] = RES_CODE[kind]; take(p); take(q); placed++;
    }
  }
  // strategic points: NEVER on a resource square, always right NEXT to one (so one unit cannot hold both), mirrored in pairs, spread over the whole map
  const cand = []; for (let y = 1; y < N - 1; y++) for (let x = 1; x < Math.floor(N / 2); x++) {
    const k = ix(s, x, y); if (s.res[k] || taken.has(k)) continue;
    if (ORTH.some(([dx, dy]) => s.res[ix(s, x + dx, y + dy)])) cand.push({ x, y });
  }
  const want_pts = Math.max(3, Math.round(sc * 3.2)), chosen = [], spacing = Math.max(5, Math.round(sc * 4));
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(s.rng() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  // first pass: one point per horizontal band so the line of points reaches from the home side to the centre
  const bands = want_pts; for (let bnd = 0; bnd < bands && chosen.length < want_pts; bnd++) {
    const lo = bnd * (N / 2) / bands, hi = (bnd + 1) * (N / 2) / bands;
    const p = cand.find((q) => q.x >= lo && q.x < hi && chosen.every((r) => Math.abs(r.x - q.x) + Math.abs(r.y - q.y) >= spacing) && F.every((f) => Math.abs(f.x - q.x) + Math.abs(f.y - q.y) >= spacing));
    if (p) chosen.push(p);
  }
  for (const p of cand) { if (chosen.length >= want_pts) break; if (chosen.every((r) => Math.abs(r.x - p.x) + Math.abs(r.y - p.y) >= spacing) && F.every((f) => Math.abs(f.x - p.x) + Math.abs(f.y - p.y) >= spacing)) chosen.push(p); }
  for (const p of chosen) { s.points.push(p); }
  for (const p of chosen) { s.points.push(rot(p)); }
  // fortresses + armies
  for (let o = 0; o < 2; o++) {
    const f = F[o], t = addTower(s, o, f.x, f.y, 'fortress', FORTRESS.levels, true); s.fortress[o] = t.id;
    const g = addUnit(s, 'infantry', o, f.x, f.y, 1); t.garrison = g;
    const near = []; for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) near.push({ x: f.x + dx, y: f.y + dy });
    near.sort((a, b) => (Math.abs(a.x - f.x) + Math.abs(a.y - f.y)) - (Math.abs(b.x - f.x) + Math.abs(b.y - f.y)) || a.y - b.y);
    const army = ['infantry', 'infantry', 'infantry', 'cavalry', 'cavalry', 'archer', 'archer', 'siege'];     // rulebook: 4 infantry (1 is the garrison), 2 cavalry, 2 archers, 1 siege
    for (const type of army) { const c = near.find((p) => inb(s, p.x, p.y) && !s.ug[ix(s, p.x, p.y)] && !s.tg[ix(s, p.x, p.y)] && !s.res[ix(s, p.x, p.y)]); addUnit(s, type, o, c.x, c.y); }
  }
  s.events.length = 0;
}

// ───────────────────────── derived ─────────────────────────
export const unitDef = (u) => UNITS[u.type];
export const towerHeight = (t) => t.levels.length;
export function attachedTowers(s, t) { return ORTH.map(([dx, dy]) => (inb(s, t.x + dx, t.y + dy) ? s.tg[ix(s, t.x + dx, t.y + dy)] : null)).filter((a) => a && a.owner === t.owner && a.levels.length); }
export function maxLevels(s, t) {                                      // 5, or 5 + the shared levels when 3 towers are attached
  const a = attachedTowers(s, t); return MAX_LEVELS + (a.length >= ATTACH_BONUS_MIN ? Math.min(...a.map((x) => x.levels.length)) : 0);
}
export const dragonRadius = (t) => DRAGON.radius + Math.max(0, towerHeight(t) - DRAGON.minHeight);
export const canPerch = (t) => towerHeight(t) >= DRAGON.minHeight && t.spec !== 'arcane';
export const towerHP = (t) => t.fHp + t.levels.reduce((a, l) => a + l.hp, 0);
export const towerSpecs = (t) => (t.fortress ? FORTRESS_SPECS : [t.spec]);
export function recruitable(s, t, type) {                 // can this tower build this unit type (ignoring cost/queue)?
  const d = UNITS[type]; if (!d) return false;
  if (!towerSpecs(t).includes(d.at)) return false;
  if (t.fortress ? false : towerHeight(t) < d.minLevel) return false;
  if (t.fortress && towerHeight(t) < d.minLevel) return false;
  if (d.tech && !s.pl[t.owner].tech[d.tech]) return false;
  return true;
}
export const queueSlots = (t) => (t.fortress ? FORTRESS.queueSlots : QUEUE_SLOTS);
export const addCost = (a, b) => { const o = { ...a }; for (const k of Object.keys(b)) o[k] = (o[k] || 0) + b[k]; return o; };
// Cards: a player holds `pl[sub]` of each subtype and `pl[family]` PRIMARY cards, which can stand in for either subtype of that family.
// A cost key may be a subtype ("faith: 1": that subtype or a primary of its family) or a family ("spirit: 2": any two Spirit cards).
export function canAfford(pl, cost) {
  for (const f of FAMILY_LIST) {
    const [a, b] = FAMILIES[f].subs, na = cost[a] || 0, nb = cost[b] || 0, any = cost[f] || 0;
    if (!na && !nb && !any) continue;
    const sa = pl[a] || 0, sb = pl[b] || 0, w = pl[f] || 0;
    if (Math.max(0, na - sa) + Math.max(0, nb - sb) > w) return false;       // wildcards needed for the shortfall of a specific subtype
    if (na + nb + any > sa + sb + w) return false;                           // and enough cards in the family overall
  }
  return true;
}
export function spend(pl, cost) {                                              // taps the cards: exact subtype first, primaries last
  for (const f of FAMILY_LIST) {
    const [a, b] = FAMILIES[f].subs;
    for (const [k, n] of [[a, cost[a] || 0], [b, cost[b] || 0]]) { const t = Math.min(pl[k] || 0, n); pl[k] = (pl[k] || 0) - t; pl[f] = (pl[f] || 0) - (n - t); }
    let any = cost[f] || 0;
    for (const k of [a, b, f]) { const t = Math.min(pl[k] || 0, any); pl[k] = (pl[k] || 0) - t; any -= t; }
  }
}
export function spendUsage(pl, cost) {                                         // which cards a cost would tap (for the desk display)
  const c = { ...pl }; spend(c, cost); const u = {}; for (const k of RES_ALL) if ((pl[k] || 0) - (c[k] || 0) > 0) u[k] = (pl[k] || 0) - (c[k] || 0); return u;
}
export const have = (pl, sub) => (pl[sub] || 0) + (pl[FAMILY_OF[sub]] || 0);  // how many of this subtype you could pay with
export const canGather = (type, fam) => !ONLY_GATHERERS[fam] || ONLY_GATHERERS[fam].includes(type);   // Physical and Mana nodes: any unit. Spirit nodes: only spiritual units ...
export const unitYield = (type, family) => ((DOUBLERS[family] || []).includes(type) ? YIELD.double : YIELD.unit);   // ... the specialist yields it twice
export const upkeepOf = (s, o) => s.units.filter((u) => u.owner === o).reduce((a, u) => a + UNITS[u.type].upkeep, 0);
export function incomeOf(s, o) {                          // the cards your nodes and towers give this year
  const inc = Object.fromEntries(RES_ALL.map((k) => [k, 0]));
  for (let y = 0; y < s.N; y++) for (let x = 0; x < s.N; x++) {
    const c = s.res[ix(s, x, y)]; if (!c) continue;
    const sub = RES_NAMES[c], fam = FAMILY_OF[sub], t = s.tg[ix(s, x, y)], u = s.ug[ix(s, x, y)];
    if (t) {
      if (t.owner !== o) continue;
      if (!ONLY_GATHERERS[fam] || t.spec === 'arcane') inc[sub] += YIELD.tower;   // the tower yields by itself (a Spirit node: only an ARCANE tower can gather it)
      const g = t.garrison; if (g && g.owner === o && canGather(g.type, fam)) inc[sub] += unitYield(g.type, fam);   // a garrison adds its part
    } else if (u && u.owner === o && canGather(u.type, fam)) inc[sub] += unitYield(u.type, fam);                  // a unit on a bare node
  }
  for (const t of s.towers) if (t.owner === o && t.levels.length) { const py = PRIMARY_YIELD[t.fortress ? 'fortress' : t.spec]; if (py) for (const [k, n] of Object.entries(py)) inc[k] += n; }
  return inc;
}
export function committed(s, o) {                         // resources already promised by planned orders
  let c = { gold: 0, iron: 0, mana: 0 }; const od = s.orders[o];
  for (const r of od.recruits) c = addCost(c, UNITS[r.type].cost);
  for (const b of od.builds) c = addCost(c, buildCost(b));
  for (const r of od.research) c = addCost(c, TECHS[r.tech].cost);
  for (const r of od.convert || []) c = addCost(c, ARCANE_CONVERT);
  return c;
}
export const buildCost = (b) => (b.kind === 'foundation' ? addCost(COSTS.foundation, COSTS.spec[b.spec] || {}) : b.reinforced ? COSTS.reinforced : COSTS.normal);

// ───────────────────────── geometry: line of sight, reach ─────────────────────────
function lineCells(a, b) {                                // Bresenham, excluding both endpoints
  const out = []; let x = a.x, y = a.y; const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1; let err = dx - dy;
  for (let i = 0; i < 200; i++) {
    if (x === b.x && y === b.y) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; }
    if (!(x === b.x && y === b.y)) out.push({ x, y });
  }
  return out;
}
function losClear(s, a, tx, ty) {                         // towers block ground fire; height shoots over lower towers
  const h = a.z === 1 ? towerHeight(s.tg[ix(s, a.x, a.y)]) : 0;
  for (const c of lineCells(a, { x: tx, y: ty })) { const t = s.tg[ix(s, c.x, c.y)]; if (t && towerHeight(t) >= Math.max(1, h + (h ? 1 : 0)) && !(c.x === a.x && c.y === a.y)) return false; }
  return true;
}
export function canStrike(s, a, t, at = a) {              // can unit `a` (standing at `at`) strike unit `t` now?
  const d = UNITS[a.type]; if (a.owner === t.owner) return false;
  const dist = Math.abs(at.x - t.x) + Math.abs(at.y - t.y);
  if (d.flying) { const pt = s.tg[ix(s, at.x, at.y)]; return !!pt && dist >= 1 && dist <= dragonRadius(pt); }   // a Dragon strikes from its perch, over everything
  if (t.z === 1 && d.rng === 0) return false;                      // a garrison can only be hit by ranged units
  if (d.rng === 0) return dist === 1;
  if (dist < 1 || dist > d.rng) return false;
  if (d.arcane) return true;
  return losClear(s, { x: at.x, y: at.y, z: at.z ?? a.z }, t.x, t.y);
}
export function canSiege(s, a, tw, at = a, ignoreMoved = false) {
  const d = UNITS[a.type]; if (!d.siege || a.owner === tw.owner) return false;
  if (a.moved && !ignoreMoved) return false;
  const dist = Math.abs(at.x - tw.x) + Math.abs(at.y - tw.y); if (dist < 1 || dist > d.rng) return false;
  return losClear(s, { x: at.x, y: at.y, z: 0 }, tw.x, tw.y);
}

// ───────────────────────── planning helpers (UI + AI) ─────────────────────────
// Ground movement: orthogonal, 1 MOV per square, units and tower bases block; leaving a tower costs +1; climbing a tower costs +1.
export function reach(s, u) {
  const d = UNITS[u.type], out = new Map();
  if (d.flying) return out;                                      // a Dragon never walks: it flies from tower to tower (see canLand / setFlight)
  const start = ix(s, u.x, u.y), q = [start], cost = new Map([[start, u.z === 1 ? 1 : 0]]), prev = new Map();
  for (let h = 0; h < q.length; h++) {
    const cur = q[h], cx = cur % s.N, cy = (cur - cx) / s.N, cc = cost.get(cur);
    for (const [dx, dy] of ORTH) {
      const x = cx + dx, y = cy + dy; if (!inb(s, x, y)) continue; const k = ix(s, x, y);
      if (cost.has(k)) continue;
      const t = s.tg[k];
      if (t) {                                                    // a tower base: can only be climbed, as the last step
        if (!d.climb || towerHeight(t) < 1 || t.garrison || cc + 2 > d.mov) continue;
        cost.set(k, cc + 2); prev.set(k, cur); out.set(k, { cost: cc + 2, prev: cur, climb: true }); continue;
      }
      if (s.ug[k] || cc + 1 > d.mov) continue;
      cost.set(k, cc + 1); prev.set(k, cur); q.push(k); out.set(k, { cost: cc + 1, prev: cur });
    }
  }
  return out;
}
export function pathTo(s, u, x, y) {
  const r = reach(s, u), k = ix(s, x, y), e = r.get(k); if (!e) return null;
  if (e.fly) return { path: [{ x, y }], fly: true, climb: false, cost: e.cost };
  const cells = []; let c = k; const start = ix(s, u.x, u.y);
  while (c !== start) { cells.push({ x: c % s.N, y: Math.floor(c / s.N) }); c = r.get(c)?.prev ?? -1; if (c < 0) break; }
  return { path: cells.reverse(), fly: false, climb: !!e.climb, cost: e.cost };
}
export function setMove(s, p, uid, x, y) {
  const u = unitById(s, uid); if (!u || u.owner !== p || u.idle) return false;
  if (x === u.x && y === u.y) { delete s.orders[p].moves[uid]; return true; }
  const pt = pathTo(s, u, x, y); if (!pt) return false;
  s.orders[p].moves[uid] = { path: pt.path, climb: pt.climb, fly: pt.fly };
  return true;
}
export const clearUnitOrders = (s, p, uid) => { const o = s.orders[p]; o.flights = (o.flights || []).filter((f) => f.unitId !== uid); delete o.moves[uid]; o.attacks = o.attacks.filter((a) => a.unitId !== uid); o.siege = o.siege.filter((a) => a.unitId !== uid); o.disband = (o.disband || []).filter((x) => x !== uid); o.builds = o.builds.filter((b) => b.builderId !== uid); };
export const clearOrders = (s, p) => { s.orders[p] = blankOrders(); };
export const plannedPos = (s, u) => { const fl = (s.orders[u.owner].flights || []).find((f) => f.unitId === u.id); if (fl) { const t = towerById(s, fl.towerId); if (t) return { x: t.x, y: t.y, z: 1 }; } const m = s.orders[u.owner].moves[u.id]; if (!m || !m.path.length) return { x: u.x, y: u.y, z: u.z }; const e = m.path[m.path.length - 1]; return { x: e.x, y: e.y, z: m.climb ? 1 : 0 }; };

// Order an attack: finds the cheapest reachable square from which `target` is in reach, and plans the move too.
export function planAttack(s, p, uid, targetId, isTower = false) {
  const u = unitById(s, uid); if (!u || u.owner !== p || u.idle) return false;
  const d = UNITS[u.type], tgt = isTower ? towerById(s, targetId) : unitById(s, targetId); if (!tgt || tgt.owner === p) return false;
  const fl = (s.orders[p].flights || []).find((f) => f.unitId === uid), here = d.flying ? plannedPos(s, u) : { x: u.x, y: u.y, z: u.z };
  const ok = (pos) => (isTower ? (d.siege && canSiege(s, u, tgt, pos, true)) : canStrike(s, u, tgt, pos));
  const maxOut = d.hitrun ? Math.floor(d.mov / 2) : Infinity;                // a Monk must be able to come back the same distance
  let best = null;
  if (ok(here)) best = { x: u.x, y: u.y, cost: 0 };
  if (!(isTower && d.siege)) {                                    // siege engines may not move and fire
    const r = reach(s, u);
    for (const [k, e] of r) { const pos = { x: k % s.N, y: Math.floor(k / s.N), z: e.climb ? 1 : 0 }; if (e.cost <= maxOut && (!best || e.cost < best.cost) && ok(pos)) best = { x: pos.x, y: pos.y, cost: e.cost }; }
  }
  if (!best) return false;
  clearUnitOrders(s, p, uid); if (fl) s.orders[p].flights.push(fl);
  let steps = 0; if (best.cost > 0) { setMove(s, p, uid, best.x, best.y); steps = (s.orders[p].moves[uid]?.path || []).length; }
  (isTower ? s.orders[p].siege : s.orders[p].attacks).push(d.hitrun && !isTower ? { unitId: uid, targetId, retreat: steps } : { unitId: uid, targetId });
  return true;
}
export function setRecruit(s, p, towerId, type) {
  const t = towerById(s, towerId); if (!t || t.owner !== p || !recruitable(s, t, type)) return false;
  const used = t.queue.length + s.orders[p].recruits.filter((r) => r.towerId === towerId).length; if (used >= queueSlots(t)) return false;
  const c = addCost(committed(s, p), UNITS[type].cost); if (!canAfford(s.pl[p], c)) return false;
  s.orders[p].recruits.push({ towerId, type }); return true;
}
export function setBuildFoundation(s, p, builderId, x, y, spec) {
  const u = unitById(s, builderId); if (!u || u.owner !== p || !UNITS[u.type].builder || u.idle) return false;
  const pos = plannedPos(s, u); if (Math.abs(pos.x - x) + Math.abs(pos.y - y) !== 1 || !inb(s, x, y) || s.ug[ix(s, x, y)] || s.tg[ix(s, x, y)]) return false;
  if (spec === 'lair' && !s.pl[p].tech.dragonlore) return false;
  if (!SPECS_OK.includes(spec)) return false;                                  // Arcane Towers are made by pouring resources into a finished tower, never founded
  if (s.orders[p].builds.some((b) => b.kind === 'foundation' && b.x === x && b.y === y)) return false;
  const b = { kind: 'foundation', builderId, x, y, spec }; if (!canAfford(s.pl[p], addCost(committed(s, p), buildCost(b)))) return false;
  s.orders[p].builds.push(b); return true;
}
export function setBuildLevel(s, p, towerId, reinforced) {
  const t = towerById(s, towerId); if (!t || t.owner !== p || towerHeight(t) >= maxLevels(s, t)) return false;
  if (s.orders[p].builds.some((b) => b.kind === 'level' && b.towerId === towerId)) return false;
  const b = { kind: 'level', towerId, reinforced: !!reinforced }; if (!canAfford(s.pl[p], addCost(committed(s, p), buildCost(b)))) return false;
  s.orders[p].builds.push(b); return true;
}
export function canLand(s, u, t) {                          // may Dragon `u` perch on tower `t` this year?
  if (!UNITS[u.type].flying || u.idle || !canPerch(t) || (u.z === 1 && s.tg[ix(s, u.x, u.y)] === t)) return false;
  const g = t.garrison; if (!g) return true;
  return g.owner !== u.owner && !UNITS[g.type].flying;                            // an enemy garrison is crushed; a friend or another Dragon blocks the perch
}
export function setFlight(s, p, uid, towerId) {
  const u = unitById(s, uid), t = towerById(s, towerId); if (!u || !t || u.owner !== p || !canLand(s, u, t)) return false;
  clearUnitOrders(s, p, uid); s.orders[p].flights.push({ unitId: uid, towerId }); return true;
}
export function setConvert(s, p, towerId) {
  const t = towerById(s, towerId); if (!t || t.owner !== p || t.fortress || t.spec === 'arcane' || t.spec === 'lair' || !t.levels.length || t.queue.length) return false;
  if (s.orders[p].convert.includes(towerId) || !canAfford(s.pl[p], addCost(committed(s, p), ARCANE_CONVERT))) return false;
  s.orders[p].convert.push(towerId); return true;
}
export function setResearch(s, p, tech) {
  if (s.pl[p].tech[tech] || s.orders[p].research.some((r) => r.tech === tech) || !canAfford(s.pl[p], addCost(committed(s, p), TECHS[tech].cost))) return false;
  s.orders[p].research.push({ tech }); return true;
}
export const cancelOrder = (s, p, kind, i) => { s.orders[p][kind].splice(i, 1); };
// Disband: dismiss a unit for good (it stops costing upkeep from next year). The way out of a poverty trap — rulebook 20: "disband part of the army".
export function setDisband(s, p, uid) { const u = unitById(s, uid); if (!u || u.owner !== p || s.orders[p].disband.includes(uid)) return false; clearUnitOrders(s, p, uid); s.orders[p].disband.push(uid); return true; }

// ───────────────────────── the year ─────────────────────────
function phase(s, name) { s.phase = name; s.events.push({ t: 'phase', name, round: s.round }); }
export function resolveYear(s) {
  if (s.winner !== null) return s.events;
  s.events = [];
  const order = s.first === 0 ? [0, 1] : [1, 0];
  phase(s, 'economy'); economy(s, order);
  phase(s, 'recruitment'); recruitment(s, order);
  phase(s, 'movement'); movement(s, order);
  phase(s, 'combat'); combat(s, order);
  phase(s, 'building'); building(s, order);
  phase(s, 'control'); control(s);
  phase(s, 'endyear'); endYear(s);
  return s.events;
}

function economy(s, order) {
  for (const o of order) for (const uid of s.orders[o].disband || []) { const u = unitById(s, uid); if (u && u.owner === o) { killUnit(s, u, 'disbanded'); say(s, `P${o + 1} dismisses a ${UNITS[u.type].name}.`, o); } }
  // The year's budget was set when the previous year ended (refreshBudget): it is what your nodes yield, minus upkeep. Research is paid from it here.
  for (const o of order) {
    for (const r of s.orders[o].research) { const T = TECHS[r.tech], pl = s.pl[o]; if (!pl.tech[r.tech] && canAfford(pl, T.cost)) { spend(pl, T.cost); pl.tech[r.tech] = true; say(s, `P${o + 1} completes ${T.name}.`, o); s.events.push({ t: 'tech', owner: o, tech: r.tech }); } }
  }
  for (const o of [0, 1]) s.events.push({ t: 'income', owner: o, now: Object.fromEntries(RES_ALL.map((k) => [k, s.pl[o][k]])) });
}
// A new year's budget: what the controlled nodes yield (+ the capital), minus the army's upkeep paid out of the gold. Nothing is carried over.
export function refreshBudget(s, first = false) {
  for (const o of [0, 1]) {
    const pl = s.pl[o], inc = incomeOf(s, o), up = upkeepOf(s, o);
    pl.unpaid = 0; for (const u of s.units) if (u.owner === o) u.idle = false;
    for (const k of RES_ALL) pl[k] = inc[k] + (first ? (START_RESOURCES[k] || 0) : 0);
    const avail = pl.gold + pl.physical;                                      // upkeep is paid in Gold, and a Physical card may stand in for it
    if (avail >= up) { const g = Math.min(pl.gold, up); pl.gold -= g; pl.physical -= up - g; }
    else {                                                                    // cannot cover the upkeep: the most expensive units stand idle this year
      let short = up - avail; pl.gold = 0; pl.physical = 0;
      for (const u of s.units.filter((z) => z.owner === o).sort((a, b) => UNITS[b.type].upkeep - UNITS[a.type].upkeep || a.id - b.id)) { if (short <= 0) break; u.idle = true; short -= UNITS[u.type].upkeep; pl.unpaid++; }
      say(s, `P${o + 1} cannot cover its upkeep (${up} gold vs ${avail} available): ${pl.unpaid} unit${pl.unpaid > 1 ? 's' : ''} stand idle this year.`, o);
    }
    if (s.floor) for (const k of RES_ALL) pl[k] = Math.max(pl[k], s.floor[k] || 0);
    s.events.push({ t: 'budget', owner: o, budget: Object.fromEntries(RES_ALL.map((k) => [k, pl[k]])), upkeep: up, unpaid: pl.unpaid });
  }
}

function freeNeighbour(s, x, y) { for (const [dx, dy] of ORTH) { const nx = x + dx, ny = y + dy; if (inb(s, nx, ny) && !s.ug[ix(s, nx, ny)] && !s.tg[ix(s, nx, ny)]) return { x: nx, y: ny }; } return null; }
function recruitment(s, order) {
  for (const o of order) {
    for (const t of s.towers.filter((z) => z.owner === o)) {            // finish what is in the queue
      for (const it of t.queue) it.left--;
      for (const it of [...t.queue]) if (it.left <= 0 && UNITS[it.type].flying) {       // a hatchling must perch at once on a free tower of height 3+ (not arcane) — or it dies
        t.queue.splice(t.queue.indexOf(it), 1);
        const perch = [t, ...s.towers.filter((z) => z !== t && z.owner === o)].filter((z) => z.owner === o && canPerch(z) && !z.garrison).sort((a, b) => (a === t ? -1 : b === t ? 1 : (Math.abs(a.x - t.x) + Math.abs(a.y - t.y)) - (Math.abs(b.x - t.x) + Math.abs(b.y - t.y))))[0];
        if (!perch) { say(s, `P${o + 1}'s Dragon hatches with nowhere to perch and dies.`, o); s.events.push({ t: 'hatchDied', tower: t.id }); continue; }
        const u = addUnit(s, it.type, o, perch.x, perch.y, 1); perch.garrison = u; s.events.push({ t: 'towerGarrison', id: perch.id, unit: u.id }); say(s, `P${o + 1} Dragon hatches and perches on the tower at (${perch.x},${perch.y}).`, o);
      }
      for (const it of [...t.queue]) if (it.left <= 0) { const c = freeNeighbour(s, t.x, t.y); if (!c) { it.left = 0; continue; } const u = addUnit(s, it.type, o, c.x, c.y); u.moved = false; t.queue.splice(t.queue.indexOf(it), 1); say(s, `P${o + 1} ${UNITS[it.type].name} musters at (${c.x},${c.y}).`, o); }
    }
    for (const r of s.orders[o].recruits) {                              // new orders: pay now
      const t = towerById(s, r.towerId), pl = s.pl[o]; if (!t || t.owner !== o || !recruitable(s, t, r.type) || t.queue.length >= queueSlots(t)) continue;
      if (pl.unpaid > 0) { say(s, `P${o + 1} cannot recruit: unpaid upkeep.`, o); continue; }
      const cost = UNITS[r.type].cost; if (!canAfford(pl, cost)) continue;
      spend(pl, cost);
      t.queue.push({ type: r.type, left: UNITS[r.type].time }); s.events.push({ t: 'recruit', tower: t.id, type: r.type });
      say(s, `P${o + 1} orders ${UNITS[r.type].name} at (${t.x},${t.y}).`, o);
    }
  }
}

function movement(s, order) {
  s.clashes = [];
  for (const u of s.units) { u.moved = false; u.origin = { x: u.x, y: u.y }; }
  for (const o of order) for (const f of s.orders[o].flights || []) {       // Dragons fly tower to tower before anything walks
    const u = unitById(s, f.unitId), t = towerById(s, f.towerId); if (!u || !t || u.owner !== o || !canLand(s, u, t)) continue;
    if (s.orders[1 - o].flights.some((g) => g.towerId === f.towerId && g.unitId !== f.unitId)) { say(s, `Two Dragons race for the tower at (${t.x},${t.y}); neither lands.`); continue; }
    landDragon(s, u, t);
  }
  const movers = [];
  for (const o of order) for (const u of s.units.filter((z) => z.owner === o)) { const m = s.orders[o].moves[u.id]; if (m && m.path.length && !u.idle) movers.push({ u, path: m.path, climb: m.climb, fly: m.fly, i: 0, stop: false, first: true }); }
  const maxLen = movers.reduce((a, m) => Math.max(a, m.path.length), 0);
  for (let step = 0; step < maxLen; step++) {
    const active = movers.filter((m) => !m.stop && m.i < m.path.length); if (!active.length) break;
    const byCell = new Map();
    for (const m of active) { m.next = m.path[m.i]; const k = ix(s, m.next.x, m.next.y); (byCell.get(k) || byCell.set(k, []).get(k)).push(m); }
    for (const [, list] of byCell) if (list.length > 1) {
      const owners = new Set(list.map((m) => m.u.owner));
      if (owners.size > 1) {                                                   // rulebook 6.1: enemies contesting a square collide — and the collision is fought out in the combat phase
        for (const m of list) m.stop = true;
        for (const a of list) for (const b of list) if (a.u.owner !== b.u.owner && a.u.owner === 0) s.clashes.push([a.u.id, b.u.id]);
        say(s, `Clash at (${list[0].next.x},${list[0].next.y}): the vanguards collide.`); s.events.push({ t: 'clash', x: list[0].next.x, y: list[0].next.y }); }
      else for (const m of list.slice(1)) m.stop = true;                       // same owner: only the first gets the square
    }
    let pending = active.filter((m) => !m.stop);
    for (let pass = 0; pass < 4 && pending.length; pass++) {
      let progress = false;
      for (const m of [...pending]) if (tryEnter(s, m)) { pending.splice(pending.indexOf(m), 1); progress = true; }
      if (!progress) break;
    }
    for (const m of pending) m.stop = true;
  }
}
function landDragon(s, u, t) {
  const from = { x: u.x, y: u.y, z: 1 }, ot = s.tg[ix(s, u.x, u.y)]; if (ot) { ot.garrison = null; s.events.push({ t: 'towerGarrison', id: ot.id, unit: null }); }
  if (t.garrison) { say(s, `P${u.owner + 1}'s Dragon lands on the tower at (${t.x},${t.y}) — the ${UNITS[t.garrison.type].name} inside is crushed.`, u.owner); killUnit(s, t.garrison, 'crushed'); }
  u.x = t.x; u.y = t.y; u.z = 1; t.garrison = u; u.moved = true;
  if (t.owner !== u.owner) { s.events.push({ t: 'towerOwner', id: t.id, owner: u.owner }); say(s, `P${u.owner + 1} takes the tower at (${t.x},${t.y})${t.fortress ? ' — THE FORTRESS' : ''} from the air!`, u.owner); t.owner = u.owner; }
  s.events.push({ t: 'move', id: u.id, from, to: { x: u.x, y: u.y, z: 1 }, fly: true }); s.events.push({ t: 'towerGarrison', id: t.id, unit: u.id });
}
function tryEnter(s, m) {
  const u = m.u, d = UNITS[u.type], c = m.next, k = ix(s, c.x, c.y), last = m.i === m.path.length - 1, from = { x: u.x, y: u.y, z: u.z };
  const t = s.tg[k];
  if (m.fly) { if (s.ug[k] || t) return false; }
  else if (t) {
    if (!(last && m.climb && d.climb && towerHeight(t) >= 1 && !t.garrison)) return false;
    if (u.z === 0) s.ug[ix(s, u.x, u.y)] = null; else { const ot = s.tg[ix(s, u.x, u.y)]; if (ot) ot.garrison = null; }
    u.x = c.x; u.y = c.y; u.z = 1; t.garrison = u; u.moved = true;
    if (t.owner !== u.owner) { s.events.push({ t: 'towerOwner', id: t.id, owner: u.owner }); say(s, `P${u.owner + 1} seizes an empty tower at (${t.x},${t.y})${t.fortress ? ' — THE FORTRESS' : ''}!`, u.owner); t.owner = u.owner; }
    s.events.push({ t: 'move', id: u.id, from, to: { x: u.x, y: u.y, z: 1 } }); s.events.push({ t: 'towerGarrison', id: t.id, unit: u.id });
    m.i++; return true;
  }
  else if (s.ug[k]) return false;
  if (u.z === 1) { const ot = s.tg[ix(s, u.x, u.y)]; if (ot) { ot.garrison = null; s.events.push({ t: 'towerGarrison', id: ot.id, unit: null }); } }
  else s.ug[ix(s, u.x, u.y)] = null;
  u.x = c.x; u.y = c.y; u.z = 0; s.ug[k] = u; u.moved = true; m.i++;
  s.events.push({ t: 'move', id: u.id, from, to: { x: u.x, y: u.y, z: 0 }, fly: !!m.fly });
  return true;
}

const needHits = (t, a) => UNITS[t.type].hits + (t.z === 1 && !UNITS[t.type].flying && !UNITS[a.type].arcane ? GARRISON_HITS : 0);   // hits to kill: its own, +1 inside a tower
function combat(s, order) {
  const strikes = [];                                                         // validated against the post-movement position
  for (const o of order) {
    for (const a of s.orders[o].attacks) { const u = unitById(s, a.unitId), t = unitById(s, a.targetId); if (u && t && !u.idle && u.owner === o && canStrike(s, u, t)) strikes.push({ u, t }); }
  }
  for (const [aid, bid] of s.clashes) {                                        // collisions strike both ways regardless of reach
    const a = unitById(s, aid), b = unitById(s, bid); if (!a || !b || UNITS[a.type].siege || UNITS[b.type].siege || a.z || b.z) continue;
    strikes.push({ u: a, t: b }, { u: b, t: a });
  }
  const byTarget = new Map(); for (const st of strikes) (byTarget.get(st.t.id) || byTarget.set(st.t.id, []).get(st.t.id)).push(st);
  const dead = new Set();
  for (const [tid, list] of byTarget) {
    const t = unitById(s, tid), td = UNITS[t.type], wins = [...list];         // every strike is one hit — no ATK, no DEF
    let left = wins.length; const notes = [];
    if (left && td.heavy && !t.vH) {                                          // a HEAVY unit voids one hit a year — only from its light version, or from a distance
      const i = wins.findIndex((st) => !(st.u.type === 'monk' && s.pl[st.u.owner].tech.runic) && (st.u.type === td.light || UNITS[st.u.type].rng > 0 || UNITS[st.u.type].flying));   // runic-gauntlet Monks cannot be shrugged off by armour
      if (i >= 0) { wins.splice(i, 1); left--; t.vH = true; notes.push('its heavy armour'); }
    }
    if (left && !t.vP && priestNear(s, t)) { wins.shift(); left--; t.vP = true; notes.push('a Priest'); }   // a PRIEST's ward: one hit a year for each friend within its radius
    const need = needHits(t, list[0].u); t.dmg = (t.dmg || 0) + left;
    const killed = t.dmg >= need;
    for (const st of list) s.events.push({ t: 'attack', a: st.u.id, target: t.id, killed });
    if (killed) dead.add(t.id);
    else { s.events.push({ t: 'hurt', id: t.id, dmg: t.dmg, need }); if (notes.length) { s.events.push({ t: 'void', id: t.id }); say(s, `P${t.owner + 1} ${td.name} #${t.id} voids a blow (${notes.join(' and ')}).`, t.owner); } if (td.hits > 1 && t.dmg) say(s, `P${t.owner + 1} ${td.name} #${t.id} is hit (${t.dmg}/${need}) — it will recover by the new year.`, t.owner); }
  }
  for (const id of dead) { const t = unitById(s, id); if (t) killUnit(s, t, 'slain'); }
  for (const o of order) {                                                    // siege on towers (sequential: structural damage accumulates)
    for (const a of s.orders[o].siege) {
      const u = unitById(s, a.unitId), tw = towerById(s, a.targetId); if (!u || !tw || u.idle || u.owner !== o || !canSiege(s, u, tw)) continue;
      const dmg = s.pl[o].tech.siegecraft ? 2 : 1; s.stats.sieges++;
      s.events.push({ t: 'siege', a: u.id, tower: tw.id, dmg });
      damageTower(s, tw, dmg);
    }
  }
  for (const o of order) for (const a of s.orders[o].attacks) {               // a Monk strikes and then moves back EXACTLY as many squares as it came (not more, not less)
    if (!a.retreat) continue;
    const u = unitById(s, a.unitId); if (!u || u.idle || u.z || !u.origin) continue;
    let best = null;
    for (const [k, e] of reach(s, u)) { if (e.fly || e.climb || e.cost !== a.retreat) continue; const x = k % s.N, y = Math.floor(k / s.N), d = Math.abs(x - u.origin.x) + Math.abs(y - u.origin.y); if (!best || d < best.d) best = { x, y, d }; }
    if (!best) continue;
    const from = { x: u.x, y: u.y, z: 0 }; s.ug[ix(s, u.x, u.y)] = null; u.x = best.x; u.y = best.y; s.ug[ix(s, u.x, u.y)] = u;
    s.events.push({ t: 'move', id: u.id, from, to: { x: u.x, y: u.y, z: 0 } }); say(s, `P${o + 1} Monk #${u.id} withdraws ${a.retreat} square${a.retreat > 1 ? 's' : ''}.`, o);
  }
}
const priestNear = (s, t) => s.units.some((p) => p.owner === t.owner && UNITS[p.type].priest && p !== t && !p.idle && Math.max(Math.abs(p.x - t.x), Math.abs(p.y - t.y)) <= PRIEST_RADIUS);
function killUnit(s, u, why) {
  if (u.z === 1) { const t = s.tg[ix(s, u.x, u.y)]; if (t) { t.garrison = null; s.events.push({ t: 'towerGarrison', id: t.id, unit: null }); } } else s.ug[ix(s, u.x, u.y)] = null;
  s.units.splice(s.units.indexOf(u), 1); s.events.push({ t: 'remove', id: u.id, why });
  if (why === 'disbanded') return;                                            // dismissed, not killed: no loss, no message here
  s.stats.lost[u.owner]++; s.stats.kills[1 - u.owner]++;
  say(s, `P${u.owner + 1} ${UNITS[u.type].name} is destroyed at (${u.x},${u.y}).`, 1 - u.owner);
}
function damageTower(s, t, dmg) {
  while (dmg > 0 && s.towers.includes(t)) {
    if (t.levels.length) {
      const top = t.levels[t.levels.length - 1], take = Math.min(dmg, top.hp); top.hp -= take; dmg -= take;
      if (top.hp <= 0) {
        t.levels.pop(); s.stats.levelsLost++; say(s, `A level of the tower at (${t.x},${t.y}) falls (${t.levels.length} left).`, 1 - t.owner);
        if (t.garrison && UNITS[t.garrison.type].flying && !canPerch(t)) { say(s, `The Dragon on the tower at (${t.x},${t.y}) falls with it.`, t.owner); killUnit(s, t.garrison, 'fell'); }
        else if (!t.levels.length && t.garrison) evict(s, t);
      }
    } else { t.fHp -= dmg; dmg = 0; if (t.fHp <= 0) { destroyTower(s, t); break; } }
  }
  if (s.towers.includes(t)) s.events.push({ t: 'towerSet', tower: snapT(t) });
}
function evict(s, t) {
  const g = t.garrison; if (!g) return; t.garrison = null; const c = freeNeighbour(s, t.x, t.y);
  if (c) { g.x = c.x; g.y = c.y; g.z = 0; s.ug[ix(s, c.x, c.y)] = g; s.events.push({ t: 'move', id: g.id, from: { x: t.x, y: t.y, z: 1 }, to: { x: c.x, y: c.y, z: 0 } }); }
  else killUnit(s, { ...g, z: 1 }, 'crushed');
}
function destroyTower(s, t) {
  if (t.garrison) evict(s, t);
  s.towers.splice(s.towers.indexOf(t), 1); s.tg[ix(s, t.x, t.y)] = null; s.events.push({ t: 'towerGone', id: t.id });
  say(s, `The tower at (${t.x},${t.y}) collapses${t.fortress ? ' — A FORTRESS FALLS' : ''}.`, 1 - t.owner);
}

function building(s, order) {
  for (const o of order) {
    for (const id of s.orders[o].convert || []) {                          // pour Soul + Aether + Ember into a tower: it becomes an Arcane Tower
      const t = towerById(s, id), pl = s.pl[o]; if (!t || t.owner !== o || t.fortress || t.spec === 'arcane' || t.spec === 'lair' || !t.levels.length || t.queue.length || !canAfford(pl, ARCANE_CONVERT)) continue;
      if (t.garrison && UNITS[t.garrison.type].flying) { say(s, `The Dragon on the tower at (${t.x},${t.y}) will not stay on an Arcane Tower.`, o); continue; }
      spend(pl, ARCANE_CONVERT); t.spec = 'arcane'; s.events.push({ t: 'towerSet', tower: snapT(t) }); say(s, `P${o + 1}'s tower at (${t.x},${t.y}) becomes an Arcane Tower.`, o);
    }
    for (const b of s.orders[o].builds) {
      const pl = s.pl[o], cost = buildCost(b); if (!canAfford(pl, cost)) continue;
      if (b.kind === 'foundation') {
        const u = unitById(s, b.builderId); if (!u || u.owner !== o || u.z !== 0 || !UNITS[u.type].builder || Math.abs(u.x - b.x) + Math.abs(u.y - b.y) !== 1) continue;
        if (s.ug[ix(s, b.x, b.y)] || s.tg[ix(s, b.x, b.y)] || (b.spec === 'lair' && !pl.tech.dragonlore)) continue;
        spend(pl, cost);
        const t = addTower(s, o, b.x, b.y, b.spec, []); t.builtRound = s.round; say(s, `P${o + 1} lays a ${b.spec} foundation at (${b.x},${b.y}).`, o);
      } else {
        const t = towerById(s, b.towerId); if (!t || t.owner !== o || towerHeight(t) >= maxLevels(s, t) || t.builtRound === s.round) continue;
        const tended = (t.garrison && t.garrison.owner === o) || ORTH.some(([dx, dy]) => { const u = inb(s, t.x + dx, t.y + dy) && s.ug[ix(s, t.x + dx, t.y + dy)]; return u && u.owner === o && UNITS[u.type].builder; });
        if (!tended) continue;
        spend(pl, cost);
        t.levels.push({ kind: b.reinforced ? 'reinforced' : 'normal', hp: b.reinforced ? REINFORCED_HP : NORMAL_HP }); t.builtRound = s.round;
        s.events.push({ t: 'towerSet', tower: snapT(t) }); say(s, `P${o + 1} raises a ${b.reinforced ? 'reinforced ' : ''}level at (${t.x},${t.y}) — now ${t.levels.length}.`, o);
      }
    }
  }
}

export const pointOwner = (s, p) => { const t = s.tg[ix(s, p.x, p.y)]; return t && t.garrison ? t.garrison.owner : -1; };
export const pointsHeld = (s, o) => s.points.filter((p) => pointOwner(s, p) === o).length;
function control(s) { s.events.push({ t: 'control', points: s.points.map((p) => pointOwner(s, p)) }); }

export const eliminated = (s, o) => !s.towers.some((t) => t.owner === o) && !s.units.some((u) => u.owner === o && UNITS[u.type].builder);
function endYear(s) {
  for (const o of [0, 1]) { const pl = s.pl[o]; s.stats.wasted[o] += RES_ALL.reduce((a, k) => a + (pl[k] || 0), 0); }   // unspent budget is LOST
  // victory: (1) hold the enemy fortress through the next year  (2) strategic majority for POINTS_HOLD_YEARS years  (3) elimination
  for (const o of [0, 1]) {
    const F = towerById(s, s.fortress[1 - o]);
    s.held[o] = F && F.owner === o ? s.held[o] + 1 : 0;
    const maj = Math.floor(s.points.length / 2) + 1, hold = pointsHeld(s, o);
    s.pointsHeld[o] = hold >= maj ? s.pointsHeld[o] + 1 : 0;
  }
  const win = (w, why) => { if (s.winner === null) { s.winner = w; s.winReason = why; say(s, why); s.events.push({ t: 'win', winner: w, why }); } };
  for (const o of [0, 1]) {
    if (s.held[o] >= 1 + FORTRESS_HOLD_YEARS) win(o, `Player ${o + 1} has held the enemy fortress through a full year and wins.`);
    else if (s.pointsHeld[o] >= POINTS_HOLD_YEARS) win(o, `Player ${o + 1} has held the strategic majority for ${POINTS_HOLD_YEARS} years and wins.`);
  }
  for (const o of [0, 1]) if (eliminated(s, o)) win(1 - o, `Player ${o + 1} has no towers and no builders left. Player ${2 - o} wins.`);
  for (const u of s.units) { u.moved = false; u.vH = false; u.vP = false; u.dmg = 0; }                  // everything that survived is whole again
  s.orders = [blankOrders(), blankOrders()]; s.round++; s.first = 1 - s.first; s.phase = 'plan';
  s.events.push({ t: 'year', round: s.round });
  if (s.winner === null) refreshBudget(s, false);                              // next year's budget, planned against right away
}
