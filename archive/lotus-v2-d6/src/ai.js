// LOTUS — heuristic opponent for the chess-like rules. A generator: yields after every state-changing step so the UI can pace it.
import * as R from './rules.js';
const { cheb, ix } = R;

const VALUE = { archer: 3, infantry: 4, cavalry: 5, ship: 3, leviathan: 15, inquisitor: 15, dragon: 15 };

export function aiPlaceStart(s, owner) {
  const h = s.units.find((u) => u.type === 'tower');
  const tries = [];
  if (h) tries.push({ x: R.N - 1 - h.x, y: R.N - 1 - h.y });              // mirror the human's start: equal conditions
  for (let i = 0; i < 600; i++) tries.push({ x: Math.floor(s.rng() * R.N), y: Math.floor(s.rng() * R.N) });
  for (const t of tries) for (let d = 0; d < 6; d++) for (let oy = -d; oy <= d; oy++) for (let ox = -d; ox <= d; ox++)
    if (R.placeStart(s, owner, t.x + ox, t.y + oy)) return true;
  return false;
}

const nearest = (list, p) => { let b = null, bd = 1e9; for (const e of list) { const d = cheb(e, p); if (d < bd) { bd = d; b = e; } } return [b, bd]; };

// Path distance (BFS) from a set of source squares over terrain accepted by `pass`; -1 = unreachable. Replaces straight-line distance,
// which left whole armies stuck on the river bank (the island is only reachable over the four 1-wide bridges).
function field(sources, pass, terr) {
  const NN = R.N, dist = new Int16Array(NN * NN).fill(-1), q = [];
  for (const p of sources) { const i = ix(p.x, p.y); if (dist[i] < 0) { dist[i] = 0; q.push(i); } }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % NN, y = (i - x) / NN, d = dist[i] + 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy; if (!R.inb(nx, ny)) continue;
      const j = ny * NN + nx; if (dist[j] >= 0 || !pass(terr[j])) continue;
      dist[j] = d; q.push(j);
    }
  }
  return dist;
}
const fd = (f, p) => { const v = f[ix(p.x, p.y)]; return v < 0 ? 999 : v; };

// What a unit is walking toward.
function goalsFor(s, u, me) {
  const enemyTowers = s.units.filter((e) => e.owner !== me && e.type === 'tower');
  const foes = s.units.filter((e) => e.owner !== me && e.type !== 'tower');
  const openCPs = R.CONTROL_POINTS.filter((p) => R.cpOwner(s, p) !== me);
  switch (u.type) {
    case 'infantry': return openCPs.length ? openCPs.concat(enemyTowers) : enemyTowers;
    case 'inquisitor': return R.ownUnits(s, me).filter((a) => a.type === 'infantry');
    case 'cavalry': case 'archer': return foes.length ? foes.concat(enemyTowers) : enemyTowers;
    default: return foes.length ? foes : enemyTowers;
  }
}

function bestAction(s, me) {
  let best = null;
  const terr = s.board.terr, F = {};
  const fieldFor = (u) => {
    const water = u.type === 'ship' || u.type === 'leviathan';
    const key = u.type === 'infantry' ? 'inf' : u.type === 'inquisitor' ? 'inq' : water ? 'water' : 'foe';
    if (!F[key]) {
      const goals = goalsFor(s, u, me);
      F[key] = field(goals, water ? R.isWaterT : R.isLandT, terr);
    }
    return F[key];
  };
  for (const u of R.ownUnits(s, me)) {
    if (!R.canActivate(s, u)) continue;
    const f = u.type === 'dragon' ? null : fieldFor(u), here = f ? fd(f, u) : 0;
    const { moves, caps } = R.actions(s, u);
    for (const { e, kind } of caps.values()) {
      let sc = 10 + VALUE[e.type] * 3 + (kind === 'shot' ? 1 : 0);          // captures are worth a lot
      if (u.type === 'cavalry') sc += 2;                                     // the free chain move
      if (e.type === 'infantry' && R.towersOf(s, me).some((t) => cheb(t, e) <= 3)) sc += 6;   // clear attackers off my Towers
      if (!best || sc > best.score) best = { u, kind: 'cap', e, score: sc };
    }
    for (const k of moves.keys()) {
      const d = { x: k % R.N, y: Math.floor(k / R.N) };
      let gain;
      if (u.type === 'dragon') { const foes = s.units.filter((z) => z.owner !== me); gain = foes.length ? nearest(foes, u)[1] - nearest(foes, d)[1] : 0; }
      else gain = here >= 999 ? 0 : here - fd(f, d);
      // Infantry carry the objective (control points); long-range pieces are capped so they don't hog the activations.
      let sc = u.type === 'infantry' ? gain * 3 : u.type === 'cavalry' ? Math.min(gain, 6) * 0.25 : u.type === 'archer' ? gain * 0.5 : gain * 0.3;
      if (u.type === 'infantry' && R.CONTROL_POINTS.some((p) => p.x === d.x && p.y === d.y && R.cpOwner(s, p) !== me)) sc += 5;   // arrive on an open point
      if (u.type === 'archer') {                                              // step into shooting position
        const L = R.effLevel(s, u), foe = s.units.find((z) => z.owner !== me && z.type !== 'tower' && cheb(z, d) >= 2 && cheb(z, d) <= 1 + L);
        if (foe) sc += 4;
      }
      if (u.type === 'inquisitor') sc += R.ownUnits(s, me).filter((z) => z !== u && z.type !== 'tower' && cheb(z, d) <= R.INQ_R).length * 0.4;
      if (sc > 0.3 && (!best || sc > best.score)) best = { u, kind: 'move', d, score: sc };
    }
  }
  return best;
}

function pickSacrifice(s, me) {
  let best = null;
  for (const u of R.sacrificeCandidates(s, me)) {
    if (u.type === 'tower' || R.isLotus(u.type) || u.level > 2) continue;
    if (!R.lotusOptions(s, me, u, u.uid).length) continue;                  // must actually work from here
    const sc = R.TYPES[u.type].id * 2 - u.level;
    if (!best || sc > best.sc) best = { u, sc };
  }
  return best && best.u;
}

function chooseTile(s, me, type, tiles) {
  if (type === 'tower') {                                                    // claim control points first
    const cp = tiles.find((t) => R.CONTROL_POINTS.some((p) => p.x === t.x && p.y === t.y));
    if (cp) return cp;
  }
  const goals = type === 'tower' || type === 'infantry' ? R.CONTROL_POINTS.filter((p) => R.cpOwner(s, p) !== me) : s.units.filter((e) => e.owner !== me);
  const jitter = () => (s.rng() - 0.5) * 2;
  return tiles.map((t) => ({ t, sc: (goals.length ? nearest(goals, t)[1] : 0) + jitter() })).sort((a, b) => a.sc - b.sc)[0].t;
}

export function* aiTurn(s) {
  const me = s.current;
  R.doRoll(s); yield 'roll';
  const roll = s.roll;
  if (roll === 5) {
    const c = pickSacrifice(s, me);
    if (c && s.rng() < 0.9) { R.beginRitual(s); R.ritual(s, c.uid); yield 'ritual'; return; }
  }
  const sType = R.SUMMON[roll];
  let tiles = sType ? R.summonTiles(s, me, sType) : [];
  const mine = R.towersOf(s, me).length;
  if (sType === 'tower') {                                                   // towers only where they matter: on / near an unclaimed control point
    const open = R.CONTROL_POINTS.filter((p) => R.cpOwner(s, p) !== me);
    tiles = tiles.filter((t) => R.CONTROL_POINTS.some((p) => p.x === t.x && p.y === t.y) || (mine < 4 || (mine < 14 && open.some((p) => cheb(p, t) <= 10))));
  }
  if (sType && sType !== 'tower' && R.ownUnits(s, me).filter(R.isMobile).length >= 16) tiles = [];   // army cap: spend the turn moving instead
  const doSummon = () => { const t = chooseTile(s, me, sType, tiles); R.beginSummon(s); R.summon(s, sType, t.x, t.y); };
  const mobile = R.ownUnits(s, me).filter(R.isMobile);
  const infCount = mobile.filter((u) => u.type === 'infantry').length;
  if (tiles.length) {
    const cpTower = sType === 'tower' && tiles.some((t) => R.CONTROL_POINTS.some((p) => p.x === t.x && p.y === t.y));
    const wantInf = sType === 'infantry' && infCount < 10;
    if (cpTower || sType === 'tower' || wantInf || mobile.length < 4) { doSummon(); yield 'summon'; return; }
  }
  if (!mobile.length) { R.endTurn(s); yield 'pass'; return; }
  R.beginMove(s);
  let acted = 0;
  for (let guard = 0; guard < 40 && s.left > 0; guard++) {
    const a = bestAction(s, me);
    if (!a || (a.score < 8 && acted === 0 && tiles.length && s.rng() < 0.6)) {   // nothing decisive: building up beats shuffling
      if (acted === 0 && tiles.length) { doSummon(); yield 'summon'; return; }
    }
    if (!a) break;
    if (a.kind === 'cap') R.doAttack(s, a.u, a.e); else R.doMove(s, a.u, a.d.x, a.d.y);
    acted++; yield a.kind;
    if (s.winner !== null) return;
  }
  R.endTurn(s); yield 'end';
}
