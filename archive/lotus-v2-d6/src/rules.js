// LOTUS — rules engine v2 (chess-like). Pure logic, no DOM/Three. Shared by the browser UI, the AI and the headless simulator.
// Every place where the manifesto is silent or was deliberately changed is marked  [DECISION]  (see README.md).
//
// Model: a roll of N gives N ACTIVATIONS. One activation = one action by one unit: a move, a capture, or a shot.
// There is no Power / HP / damage. A capture removes the piece. Fixed movement patterns, War-Chest/chess style.

// Board size is a parameter (odd, so there is a true centre). Manifesto: 75 x 75; built to scale to 151, 301, ...
// The island (21x21 ~ 20x20) and the 5-wide river stay fixed; the OUTER ZONES grow with the board.
export let N = 75, C = 37;
export const ISLAND = 10, RIVER_W = 5, LAKE_R = 6.5;
export const MAXLV = 4;
export let CONTROL_POINTS = [];                        // [DECISION] 4 on the island, 4 at the outer mid-edges, +4 at the outer quadrants on big boards
export let CP_WIN = 5;                                 // [DECISION] hold >= CP_WIN points AND more than the rival, at the start of your own turn
export let START_GAP = 30;                             // minimum distance between starting Towers (~0.4 of the board)
export function setCpWin(n) { CP_WIN = n; }            // tuning hook (tests / future options)
export function configure(size = 75) {
  N = Math.max(51, Math.floor(size) | 1); C = (N - 1) / 2;
  const edge = Math.round((C + ISLAND + RIVER_W) / 2), quad = Math.round(C - 0.30 * (N - 1));   // quad: 30% in from the corner
  const pts = [[-6,-6],[6,-6],[-6,6],[6,6],[-edge,0],[edge,0],[0,-edge],[0,edge]];
  if (N >= 111) pts.push([-quad,-quad],[quad,-quad],[-quad,quad],[quad,quad]);
  CONTROL_POINTS = pts.map(([dx, dy]) => ({ x: C + dx, y: C + dy }));
  CP_WIN = Math.max(3, Math.round(CONTROL_POINTS.length * 0.375));   // 8 points -> 3, 12 -> 5 (measured with the simulator; always needs a strict lead too)
  START_GAP = Math.round(N * 0.4);
  return N;
}
configure(75);

export const TYPES = {
  archer:     { id: 1, name: 'Archer' },
  infantry:   { id: 2, name: 'Infantry' },
  cavalry:    { id: 3, name: 'Cavalry' },
  ship:       { id: 4, name: 'Ship' },
  leviathan:  { id: 5, name: 'Leviathan',  lotus: 'Water Lotus' },
  inquisitor: { id: 5, name: 'Inquisitor', lotus: 'Earth Lotus' },
  dragon:     { id: 5, name: 'Dragon',     lotus: 'Air Lotus' },
  tower:      { id: 6, name: 'Tower' },
};
export const LOTUSES = ['leviathan', 'inquisitor', 'dragon'];
export const SUMMON = { 1: 'archer', 2: 'infantry', 3: 'cavalry', 4: 'ship', 6: 'tower' };
export const isLotus = (t) => LOTUSES.includes(t);

export const LAND = 0, WATER = 1, LAKE = 2, TEMPLE = 3, BRIDGE = 4;
export const isLandT = (t) => t === LAND || t === TEMPLE || t === BRIDGE;
export const isWaterT = (t) => t === WATER || t === LAKE;

const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
export const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
export const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
export const ix = (x, y) => y * N + x;

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────── board ─────────────────────────
export function makeBoard() {
  const terr = new Uint8Array(N * N);
  const r0 = ISLAND + 1, r1 = ISLAND + RIVER_W;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = Math.abs(x - C), dy = Math.abs(y - C), ch = Math.max(dx, dy);
    let t = LAND;
    if (ch >= r0 && ch <= r1) t = WATER;
    if (Math.hypot(dx, dy) <= LAKE_R) t = LAKE;
    terr[ix(x, y)] = t;
  }
  const f = (n) => Math.round(n * (N - 1)), rr = N / 75;          // ponds as fractions of the board so every size gets the same layout
  const ponds = [[f(.19),f(.19),4.6*rr],[f(.81),f(.19),4.6*rr],[f(.19),f(.81),4.6*rr],[f(.81),f(.81),4.6*rr],
                 [C,f(.08),3.6*rr],[C,f(.92),3.6*rr],[f(.08),C,3.6*rr],[f(.92),C,3.6*rr],[f(.35),f(.32),2.4*rr],[f(.65),f(.68),2.4*rr]];
  for (const [px, py, r] of ponds)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
      if (Math.hypot(x - px, y - py) <= r) terr[ix(x, y)] = WATER;
  const AX = [[1,0],[-1,0],[0,1],[0,-1]];
  for (let k = r0; k <= r1; k++) for (const [sx, sy] of AX) terr[ix(C + sx * k, C + sy * k)] = BRIDGE;
  for (let k = 2; k <= 8; k++) for (const [sx, sy] of AX) { const i = ix(C + sx * k, C + sy * k); if (terr[i] === LAKE) terr[i] = BRIDGE; }
  for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) terr[ix(C + dx, C + dy)] = TEMPLE;   // Water Temple: scenery for now (own rules to be designed)
  for (const p of CONTROL_POINTS) {          // safety net: a control point must be dry land
    if (terr[ix(p.x, p.y)] === LAND) continue;
    search: for (let d = 1; d < 12; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++)
      if (inb(p.x + dx, p.y + dy) && terr[ix(p.x + dx, p.y + dy)] === LAND) { p.x += dx; p.y += dy; break search; }
  }
  return { terr };
}
export const zoneOf = (x, y) => (Math.max(Math.abs(x - C), Math.abs(y - C)) <= ISLAND + RIVER_W ? 'island' : (x < C ? 'W' : 'E') + (y < C ? 'N' : 'S'));


// ───────────────────────── state ─────────────────────────
export function newGame(seed = (Math.random() * 1e9) | 0, size = N) {
  configure(size);
  return {
    size: N,
    board: makeBoard(), units: [], ug: new Array(N * N).fill(null), tg: new Array(N * N).fill(null),
    uidc: 1, current: 0, roll: 0, mode: 'setup', left: 0, turn: 1, winner: null, winReason: '',
    log: [], events: [], ver: 0, rng: mulberry32(seed), seed, placed: [false, false], siege: new Set(),
  };
}
export const say = (s, msg, owner = -1) => { s.log.push({ msg, owner, turn: s.turn }); s.events.push({ t: 'log' }); };
const bump = (s) => { s.ver++; };

export function addUnit(s, type, owner, x, y, extra = {}) {
  const u = { uid: s.uidc++, type, owner, x, y, level: 1, acted: false, ...extra };
  (type === 'tower' ? s.tg : s.ug)[ix(x, y)] = u;
  s.units.push(u); bump(s);
  s.events.push({ t: 'spawn', uid: u.uid });
  return u;
}
export function removeUnit(s, u, why = 'dead') {
  (u.type === 'tower' ? s.tg : s.ug)[ix(u.x, u.y)] = null;
  s.units.splice(s.units.indexOf(u), 1); bump(s);
  s.events.push({ t: 'remove', uid: u.uid, why, x: u.x, y: u.y });
}
function relocate(s, u, x, y) { s.ug[ix(u.x, u.y)] = null; u.x = x; u.y = y; s.ug[ix(x, y)] = u; bump(s); }
export { relocate as _relocate };
export const terrAt = (s, x, y) => s.board.terr[ix(x, y)];
export const unitAt = (s, x, y) => s.ug[ix(x, y)];
export const towerAt = (s, x, y) => s.tg[ix(x, y)];
export const ownUnits = (s, o) => s.units.filter((u) => u.owner === o);
export const towersOf = (s, o) => s.units.filter((u) => u.owner === o && u.type === 'tower');
export const isMobile = (u) => u.type !== 'tower';
export const nm = (u) => `P${u.owner + 1} ${TYPES[u.type].name}`;

// ───────────────────────── levels ─────────────────────────
// [DECISION] Levels are tiny: a level adds +1 reach to a unit's pattern (see describe()). A kill gives +1 Level (max 4).
// The Inquisitor makes every ally within INQ_R squares act as one Level higher (max 4).
export const INQ_R = 4;
export function effLevel(s, u) {
  if (u.type === 'tower' || u.type === 'inquisitor') return u.level;
  for (const q of s.units) if (q.type === 'inquisitor' && q.owner === u.owner && cheb(q, u) <= INQ_R) return Math.min(MAXLV, u.level + 1);
  return u.level;
}

// ───────────────────────── movement patterns ─────────────────────────
// infantry  : steps 1 square (2 at Level 3+) in any of 8 directions; captures by stepping onto an adjacent enemy.
//             A connected formation moves together on ONE activation (every member shifts by the same step).
// archer    : steps up to 2; never captures by moving. Shoots any enemy 2..(1+Level) squares away (not adjacent).
// cavalry   : slides up to 8+(L-1) in a straight line (8 directions), captures by landing; after a capture it moves again free.
// ship      : slides up to 6+(L-1) on water; captures by landing; may instead fire on any enemy adjacent to it.
// leviathan : slides up to 8+(L-1) on river/pond water (never the lake); captures by landing or any enemy within L squares.
// inquisitor: steps up to 3, cannot capture.
// dragon    : lives on a Tower; jumps to any empty allied Tower within 12+4(L-1); shoots enemy units within 1+L; cannot hit Towers.
export function describe(s, u) {
  const L = effLevel(s, u);
  switch (u.type) {
    case 'infantry': { const f = formation(s, u).length; return { move: `${1 + Math.floor((L - 1) / 2)} step${L >= 3 ? 's' : ''} any direction` + (f > 1 ? ` — formation of ${f} moves as one` : ' — formation moves as one'), attack: 'steps onto an adjacent enemy' }; }
    case 'archer': return { move: '2 steps', attack: `shoots at distance 2–${1 + L} (not adjacent)` };
    case 'cavalry': return { move: `slides up to ${8 + L - 1} in a straight line`, attack: 'captures by landing, then moves again' };
    case 'ship': return { move: `slides up to ${6 + L - 1} on water`, attack: 'captures by landing, or fires on an adjacent enemy' };
    case 'leviathan': return { move: `slides up to ${8 + L - 1} on river water`, attack: `captures by landing, or any enemy within ${L}` };
    case 'inquisitor': return { move: '3 steps', attack: `cannot attack · allies within ${INQ_R} act one Level higher` };
    case 'dragon': return { move: `jumps to an empty allied Tower within ${12 + 4 * (L - 1)}`, attack: `from a Tower: enemy units within ${1 + L} (never Towers)` };
    default: return { move: '—', attack: `destroyed when 3 enemy units stay adjacent through a full turn` };
  }
}

function landOk(s, u, x, y) {          // can this piece stand on the terrain at (x,y)?
  const t = terrAt(s, x, y);
  if (u.type === 'ship') return isWaterT(t);
  if (u.type === 'leviathan') return t === WATER;      // never the lake
  return isLandT(t);
}
// A square a piece may pass over/stop on when empty. Own Towers are walkable for land pieces; enemy Towers block.
function openFor(s, u, x, y, grp) {
  if (!inb(x, y) || !landOk(s, u, x, y)) return false;
  const o = s.ug[ix(x, y)]; if (o && !(grp && grp.includes(o))) return false;
  const tw = s.tg[ix(x, y)]; if (tw && (tw.owner !== u.owner || u.type === 'ship' || u.type === 'leviathan')) return false;
  return true;
}
const enemyAt = (s, u, x, y) => { const o = inb(x, y) && s.ug[ix(x, y)]; return o && o.owner !== u.owner ? o : null; };

export function formation(s, u) {
  if (u.type !== 'infantry') return [u];
  const q = [u], seen = new Set([u.uid]);
  for (let i = 0; i < q.length; i++) for (const [dx, dy] of DIRS) {
    const x = q[i].x + dx, y = q[i].y + dy; const o = inb(x, y) && s.ug[ix(x, y)];
    if (o && o.owner === u.owner && o.type === 'infantry' && !seen.has(o.uid)) { seen.add(o.uid); q.push(o); }
  }
  return q;
}
function formationFits(s, grp, dx, dy) {
  for (const m of grp) {
    const x = m.x + dx, y = m.y + dy;
    if (!inb(x, y) || !isLandT(terrAt(s, x, y))) return false;
    const o = s.ug[ix(x, y)]; if (o && !grp.includes(o)) return false;
    const tw = s.tg[ix(x, y)]; if (tw && tw.owner !== m.owner) return false;
  }
  return true;
}

// Everything a unit could do right now (ignores whether it has an activation): { moves: Map(idx→1), caps: Map(uid→{e,kind}) }
export function actions(s, u) {
  const moves = new Map(), caps = new Map();
  if (u.type === 'tower') return { moves, caps };
  const L = effLevel(s, u);
  const cap = (e, kind) => { if (!caps.has(e.uid)) caps.set(e.uid, { e, kind }); };
  const stepBFS = (n, canCapture) => {      // walk up to n steps over open squares
    const dist = new Map([[ix(u.x, u.y), 0]]), q = [[u.x, u.y]];
    const grp = u.type === 'infantry' ? formation(s, u) : null;
    for (let h = 0; h < q.length; h++) {
      const [cx, cy] = q[h], d = dist.get(ix(cx, cy)); if (d >= n) continue;
      for (const [dx, dy] of DIRS) {
        const x = cx + dx, y = cy + dy; if (!inb(x, y)) continue;
        const e = enemyAt(s, u, x, y);
        if (e) { if (canCapture && !(s.tg[ix(x, y)] && s.tg[ix(x, y)].owner !== u.owner)) cap(e, 'move'); continue; }
        if (dist.has(ix(x, y)) || !openFor(s, u, x, y, grp)) continue;
        dist.set(ix(x, y), d + 1); q.push([x, y]); moves.set(ix(x, y), 1);
      }
    }
  };
  const slide = (n) => {
    for (const [dx, dy] of DIRS) for (let k = 1; k <= n; k++) {
      const x = u.x + dx * k, y = u.y + dy * k; if (!inb(x, y) || !landOk(s, u, x, y)) break;
      const e = enemyAt(s, u, x, y);
      if (e) { if (!(s.tg[ix(x, y)] && s.tg[ix(x, y)].owner !== u.owner)) cap(e, 'move'); break; }
      if (!openFor(s, u, x, y)) break;
      moves.set(ix(x, y), 1);
    }
  };
  const shoot = (lo, hi) => { for (const e of s.units) if (e.owner !== u.owner && e.type !== 'tower') { const d = cheb(u, e); if (d >= lo && d <= hi) cap(e, 'shot'); } };
  switch (u.type) {
    case 'infantry': stepBFS(1 + Math.floor((L - 1) / 2), true);
      if (moves.size) { const grp = formation(s, u); if (grp.length > 1) for (const k of [...moves.keys()]) if (!formationFits(s, grp, (k % N) - u.x, Math.floor(k / N) - u.y)) moves.delete(k); }
      break;
    case 'archer': stepBFS(2, false); shoot(2, 1 + L); break;
    case 'inquisitor': stepBFS(3, false); break;
    case 'cavalry': slide(8 + L - 1); break;
    case 'ship': slide(6 + L - 1); shoot(1, 1); break;
    case 'leviathan': slide(8 + L - 1); shoot(1, L); break;
    case 'dragon':
      if (s.tg[ix(u.x, u.y)]) shoot(1, 1 + L);   // can attack only from a Tower
      for (const t of towersOf(s, u.owner)) if ((t.x !== u.x || t.y !== u.y) && !s.ug[ix(t.x, t.y)] && cheb(t, u) <= 12 + 4 * (L - 1)) moves.set(ix(t.x, t.y), 1);
      break;
  }
  return { moves, caps };
}
export const reachable = (s, u) => actions(s, u).moves;                       // empty squares it can move to
export const targets = (s, u) => [...actions(s, u).caps.values()].map((c) => c.e);   // enemies it can capture now
export const canAttack = (s, u) => u.type !== 'tower' && u.type !== 'inquisitor' && !(u.type === 'dragon' && !s.tg[ix(u.x, u.y)]);

// ───────────────────────── turn flow ─────────────────────────
export function placeStart(s, owner, x, y) {
  if (s.mode !== 'setup' || s.placed[owner]) return false;
  if (!inb(x, y) || terrAt(s, x, y) !== LAND || zoneOf(x, y) === 'island') return false;   // [DECISION] start in an outer zone
  if (s.tg[ix(x, y)] || CONTROL_POINTS.some((p) => p.x === x && p.y === y)) return false;
  for (const t of s.units) if (t.type === 'tower' && cheb(t, { x, y }) < START_GAP) return false;   // [DECISION] start towers >= ~0.4 of the board apart
  addUnit(s, 'tower', owner, x, y, { start: true });
  s.placed[owner] = true;
  say(s, `Player ${owner + 1} raises a Tower.`, owner);
  if (s.placed[0] && s.placed[1]) { s.mode = 'idle'; s.current = 0; say(s, 'The war for Aurelia begins.'); beginTurnChecks(s); }
  return true;
}
export function doRoll(s, forced) {
  s.roll = forced || 1 + Math.floor(s.rng() * 6);
  s.mode = 'choose';
  say(s, `Player ${s.current + 1} rolls a ${s.roll}.`, s.current);
  return s.roll;
}
export function sacrificeCandidates(s, o) {
  const tw = towersOf(s, o);
  return s.units.filter((u) => u.owner === o && (u.type !== 'tower' || tw.length > 1));
}
export function choices(s) {
  const o = s.current, r = s.roll, st = SUMMON[r];
  return { move: ownUnits(s, o).some((u) => isMobile(u) && (actionsAny(s, u))), summon: st && summonTiles(s, o, st).length ? st : null, summonType: st || null, ritual: r === 5 && sacrificeCandidates(s, o).length > 0 };
}
function actionsAny(s, u) { const a = actions(s, u); return a.moves.size > 0 || a.caps.size > 0 || (isLotus(u.type) && empowerTargets(s, u).length > 0); }
export function beginMove(s) { s.mode = 'move'; s.left = s.roll; s.touched = false; for (const u of s.units) u.acted = false; }
export function beginSummon(s) { s.mode = 'summon'; }
export function beginRitual(s) { s.mode = 'ritual'; }

export function summonTiles(s, o, type) {
  const seen = new Set(), out = [];
  const push = (x, y) => { const k = ix(x, y); if (!seen.has(k)) { seen.add(k); out.push({ x, y }); } };
  if (type === 'tower') {   // a Tower may only be raised on a square attached to your Infantry, or under it   [DECISION: "or under it"]
    for (const i of s.units) if (i.owner === o && i.type === 'infantry')
      for (const [dx, dy] of [[0, 0], ...DIRS]) {
        const x = i.x + dx, y = i.y + dy; if (!inb(x, y)) continue;
        const t = terrAt(s, x, y), occ = s.ug[ix(x, y)];
        if ((t === LAND || t === BRIDGE) && (!occ || (occ.owner === o && occ.type === 'infantry')) && !s.tg[ix(x, y)]) push(x, y);
      }
    return out;
  }
  for (const tw of towersOf(s, o))
    for (const [dx, dy] of DIRS) {
      const x = tw.x + dx, y = tw.y + dy; if (!inb(x, y)) continue;
      const t = terrAt(s, x, y);
      if ((type === 'ship' ? isWaterT(t) : isLandT(t)) && !s.ug[ix(x, y)] && !s.tg[ix(x, y)]) push(x, y);
    }
  return out;
}
export function summon(s, type, x, y) {
  if (s.mode !== 'summon') return null;
  if (!summonTiles(s, s.current, type).some((p) => p.x === x && p.y === y)) return null;
  addUnit(s, type, s.current, x, y);
  const cp = type === 'tower' && CONTROL_POINTS.findIndex((p) => p.x === x && p.y === y);
  say(s, `Player ${s.current + 1} summons ${type === 'tower' ? 'a Tower' : (/^[aeiou]/i.test(TYPES[type].name) ? 'an ' : 'a ') + TYPES[type].name} at (${x},${y})${cp >= 0 && type === 'tower' ? ' — CONTROL POINT claimed' : ''}.`, s.current);
  endTurn(s);
  return true;
}

// Move-phase actions: each costs one activation, one action per unit.
export function canActivate(s, u) { return s.mode === 'move' && u.owner === s.current && isMobile(u) && !u.acted && s.left > 0; }
export function doMove(s, u, x, y) {
  if (!canActivate(s, u) || !reachable(s, u).has(ix(x, y))) return false;
  s.left--; s.touched = true;
  const from = { x: u.x, y: u.y };
  const grp = formation(s, u), dx = x - u.x, dy = y - u.y;
  for (const m of grp) s.ug[ix(m.x, m.y)] = null;
  for (const m of grp) { s.events.push({ t: 'move', uid: m.uid, from: { x: m.x, y: m.y } }); m.x += dx; m.y += dy; s.ug[ix(m.x, m.y)] = m; m.acted = true; }
  bump(s);
  say(s, grp.length > 1 ? `P${u.owner + 1} Infantry formation of ${grp.length} advances (${from.x},${from.y})→(${x},${y}).` : `${nm(u)} moves (${from.x},${from.y})→(${x},${y}).`, u.owner);
  return true;
}
export function doAttack(s, u, e) {
  if (!canActivate(s, u)) return false;
  const c = actions(s, u).caps.get(e.uid); if (!c) return false;
  s.left--; s.touched = true; u.acted = true;
  const where = { x: e.x, y: e.y };
  s.events.push({ t: 'attack', uid: u.uid, tuid: e.uid, killed: true, shot: c.kind === 'shot' });
  removeUnit(s, e, 'kill');
  if (c.kind === 'move') relocate(s, u, where.x, where.y);
  say(s, `${nm(u)} ${c.kind === 'shot' ? 'shoots' : 'captures'} ${nm(e)} at (${where.x},${where.y}).`, u.owner);
  if (c.kind === 'move') s.events.push({ t: 'move', uid: u.uid, from: { x: u.x, y: u.y } });
  if (u.level < MAXLV) { u.level++; s.events.push({ t: 'level', uid: u.uid }); }
  if (u.type === 'cavalry') { u.acted = false; s.left++; s.events.push({ t: 'chain', uid: u.uid }); }   // moves again after a capture, free
  checkWin(s);
  return true;
}
export function empowerTargets(s, l) { return s.units.filter((u) => u.owner === l.owner && u !== l && u.type !== 'tower' && u.level < MAXLV); }
export function doEmpower(s, l, t) {
  if (!isLotus(l.type) || !canActivate(s, l) || !empowerTargets(s, l).includes(t)) return false;
  s.left--; s.touched = true;
  s.events.push({ t: 'empower', uid: l.uid, tuid: t.uid });
  removeUnit(s, l, 'sacrifice');
  t.level++; s.events.push({ t: 'level', uid: t.uid });
  say(s, `Player ${l.owner + 1} sacrifices the ${TYPES[l.type].name}: ${TYPES[t.type].name} rises to Level ${t.level}.`, l.owner);
  return true;
}

// ───────────────────────── the Ritual (roll 5) ─────────────────────────
export function lotusOptions(s, owner, pt, excl = null) {
  const have = new Set(s.units.filter((u) => u.owner === owner && isLotus(u.type)).map((u) => u.type));   // [DECISION] one of each Lotus per player
  const U = (x, y) => { const o = s.ug[ix(x, y)]; return o && o.uid !== excl ? o : null; };
  const T = (x, y) => { const o = s.tg[ix(x, y)]; return o && o.uid !== excl ? o : null; };
  const opts = [];
  const near = (r, f) => { const o = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = pt.x + dx, y = pt.y + dy; if (inb(x, y) && f(x, y)) o.push({ x, y, d: Math.max(Math.abs(dx), Math.abs(dy)) }); } return o.sort((a, b) => a.d - b.d); };
  if (!have.has('leviathan') && near(1, (x, y) => terrAt(s, x, y) === WATER).length >= 3) {   // Water: three water squares around the point
    const sp = near(2, (x, y) => terrAt(s, x, y) === WATER && !U(x, y) && !T(x, y))[0];
    if (sp) opts.push({ type: 'leviathan', x: sp.x, y: sp.y });
  }
  if (!have.has('inquisitor') && near(1, (x, y) => (x !== pt.x || y !== pt.y) && U(x, y) && U(x, y).owner === owner).length >= 3) {   // Earth: three allied non-Tower units around
    const sp = near(1, (x, y) => isLandT(terrAt(s, x, y)) && !U(x, y))[0];
    if (sp) opts.push({ type: 'inquisitor', x: sp.x, y: sp.y });
  }
  if (!have.has('dragon')) {      // Air: on a Tower, or on a tile attached to three other Towers
    const tws = near(2, (x, y) => T(x, y) && T(x, y).owner === owner);
    if (tws.some((t) => t.x === pt.x && t.y === pt.y) || tws.length >= 3) {
      const sp = tws.find((t) => !U(t.x, t.y));
      if (sp) opts.push({ type: 'dragon', x: sp.x, y: sp.y });
    }
  }
  return opts;
}
// What the UI shows while choosing a sacrifice: how close the square is to each Lotus recipe.
export function lotusProgress(s, owner, pt, excl = null) {
  const owned = new Set(s.units.filter((u) => u.owner === owner && isLotus(u.type)).map((u) => u.type));
  const feasible = new Set(lotusOptions(s, owner, pt, excl).map((o) => o.type));
  const U = (x, y) => { const o = s.ug[ix(x, y)]; return o && o.uid !== excl ? o : null; };
  const T = (x, y) => { const o = s.tg[ix(x, y)]; return o && o.uid !== excl ? o : null; };
  let water = 0, allies = 0, towers = 0, onTower = false;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const x = pt.x + dx, y = pt.y + dy; if (!inb(x, y)) continue;
    const near1 = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
    if (near1 && terrAt(s, x, y) === WATER) water++;
    if (near1 && (dx || dy) && U(x, y) && U(x, y).owner === owner) allies++;
    const t = T(x, y); if (t && t.owner === owner) { towers++; if (!dx && !dy) onTower = true; }
  }
  return [
    { type: 'leviathan', owned: owned.has('leviathan'), ok: feasible.has('leviathan'), have: water, need: 3, text: 'river/pond squares next to the sacrificed unit (not the lake)' },
    { type: 'inquisitor', owned: owned.has('inquisitor'), ok: feasible.has('inquisitor'), have: allies, need: 3, text: 'of your non-Tower units on the 8 squares around it' },
    { type: 'dragon', owned: owned.has('dragon'), ok: feasible.has('dragon'), have: onTower ? 3 : towers, need: 3, text: onTower ? 'standing on your Tower ✓' : 'of your Towers within 2 squares (or stand the unit ON a Tower)' },
  ];
}
// [DECISION] Each reroll is a D6; a 5 calls a Lotus whose conditions hold at the sacrificed unit's square. At most one Lotus per ritual,
// one of each kind per player. The ritual uses the whole turn.
export function ritual(s, uid, forcedRolls) {
  if (s.mode !== 'ritual') return null;
  const u = s.units.find((z) => z.uid === uid);
  if (!u || !sacrificeCandidates(s, s.current).includes(u)) return null;
  const owner = u.owner, pt = { x: u.x, y: u.y };
  const rerolls = TYPES[u.type].id;
  removeUnit(s, u, 'sacrifice');
  say(s, `Player ${owner + 1} sacrifices a ${TYPES[u.type].name} — ${rerolls} reroll${rerolls > 1 ? 's' : ''}.`, owner);
  const rolls = []; let created = null;
  for (let i = 0; i < rerolls; i++) {
    const r = forcedRolls ? forcedRolls[i] : 1 + Math.floor(s.rng() * 6);
    rolls.push(r);
    if (r !== 5) continue;
    const opts = lotusOptions(s, owner, pt);
    if (!opts.length) { say(s, 'A 5 — but the ground refuses the Lotus here.', owner); continue; }
    const o = opts[Math.floor(s.rng() * opts.length)];
    created = addUnit(s, o.type, owner, o.x, o.y);
    s.events.push({ t: 'lotus', uid: created.uid });
    say(s, `The ${TYPES[o.type].lotus} blooms: a ${TYPES[o.type].name} is reborn!`, owner);
    break;
  }
  if (!created) say(s, `The ritual rolls ${rolls.join(', ')} — nothing answers.`, owner);
  s.events.push({ t: 'ritualEnd', rolls, x: pt.x, y: pt.y });
  endTurn(s);
  return { rolls, created };
}

// ───────────────────────── victory ─────────────────────────
export const cpOwner = (s, p) => { const t = s.tg[ix(p.x, p.y)]; return t ? t.owner : -1; };
export const controlCount = (s, o) => CONTROL_POINTS.filter((p) => cpOwner(s, p) === o).length;
// Elimination: with no Tower to summon beside and no Infantry to raise a new one, a side can never summon again.
export const eliminated = (s, o) => !towersOf(s, o).length && !ownUnits(s, o).some((u) => u.type === 'infantry');
function win(s, w, why) { if (s.winner !== null) return; s.winner = w; s.winReason = why; s.mode = 'over'; say(s, why); }
export function checkWin(s) {
  if (s.winner !== null || s.mode === 'setup') return;
  for (const o of [1 - s.current, s.current]) if (eliminated(s, o)) { win(s, 1 - o, `Player ${o + 1} has no Towers and no Infantry — it can summon nothing more. Player ${2 - o} rules Aurelia.`); return; }
}
// Sieges: [DECISION] a Tower falls if 3+ enemy units have stood around it since the start of the besieger's turn and still do at its end —
// the defender always gets one turn to break the siege.
const besiegers = (s, t, o) => { let n = 0; for (const [dx, dy] of DIRS) { const m = inb(t.x + dx, t.y + dy) && s.ug[ix(t.x + dx, t.y + dy)]; if (m && m.owner === o && m.type !== 'inquisitor' && m.type !== 'dragon') n++; } return n; };
export const isBesieged = (s, t) => besiegers(s, t, 1 - t.owner) >= 3;
function beginTurnChecks(s) {
  s.siege = new Set(towersOf(s, 1 - s.current).filter((t) => isBesieged(s, t)).map((t) => t.uid));
}
export function endTurn(s) {
  if (s.winner !== null) return;
  const E = s.current;
  for (const u of s.units) u.acted = false;
  for (const t of towersOf(s, 1 - E)) if (s.siege.has(t.uid) && isBesieged(s, t)) {   // siege held for a full turn
    const rider = s.ug[ix(t.x, t.y)];
    removeUnit(s, t, 'raze');
    say(s, `A Tower at (${t.x},${t.y}) is RAZED by P${E + 1}'s siege.`, E);
    if (rider && rider.type === 'dragon') { removeUnit(s, rider, 'kill'); say(s, `The Dragon, homeless, fades.`, 1 - E); }
  }
  checkWin(s); if (s.winner !== null) return;
  s.current = 1 - E; s.roll = 0; s.left = 0; s.mode = 'idle';
  if (s.current === 0) s.turn++;
  s.events.push({ t: 'turn' });
  if (controlCount(s, s.current) >= CP_WIN && controlCount(s, s.current) > controlCount(s, 1 - s.current)) { win(s, s.current, `Player ${s.current + 1} held ${controlCount(s, s.current)} control points (more than its rival) through a full round and rules Aurelia.`); return; }
  beginTurnChecks(s);
}
export function exhausted(s) {
  if (s.mode !== 'move') return false;
  if (s.left <= 0) return true;
  return !s.units.some((u) => u.owner === s.current && isMobile(u) && !u.acted && actionsAny(s, u));
}
