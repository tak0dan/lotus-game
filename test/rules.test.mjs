// Rules regression tests:  node test/rules.test.mjs
import * as R from '../src/rules.js';
import { RES_ALL } from '../src/balance.js';
const NG = (o = {}) => R.newGame({ sequential: false, ...o });                  // these tests use the simultaneous year; sequential turns have their own section
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '  ' + x : '')); };
const blank = (seed = 3) => { const g = NG({ seed }); g.units.length = 0; g.towers.length = 0; g.ug.fill(null); g.tg.fill(null); g.res.fill(0); g.nodes = []; g.mult = new Uint8Array(g.N * g.N).fill(1); g.points.length = 0; g.fortress = [null, null]; g.winner = null; R.addTower(g, 0, 2, 2, 'outpost', ['normal']); R.addTower(g, 1, 72, 72, 'outpost', ['normal']); return g; };   // a far outpost each, so nobody is eliminated by the empty board
const tower = (g, o, x, y, spec, n, garrison) => { const w = R.addTower(g, o, x, y, spec, Array(n).fill('normal')); if (garrison) { const u = R.addUnit(g, garrison, o, x, y, 1); w.garrison = u; } return w; };
const log = (g, re) => g.log.some((l) => re.test(l.msg));
// ── map
{ const s = NG({ seed: 7 }); const kinds = {}; for (const c of s.res) if (c) kinds[R.RES_NAMES[c]] = 1;
  t('75x75 map with all 6 node types', s.N === 75 && Object.keys(kinds).length === 6);
  t('strategic points are never on a resource square', s.points.every((p) => !s.res[R.ix(s, p.x, p.y)]));
  t('strategic points are always next to a resource square', s.points.every((p) => R.ORTH.some(([a, b]) => s.res[R.ix(s, p.x + a, p.y + b)])));
  t('at least 12 strategic points', s.points.length >= 12, String(s.points.length)); }
// ── payment
{ const pl = { gold: 1, iron: 0, aether: 0, ember: 1, faith: 0, soul: 0, physical: 2, mana: 0, spirit: 0 };
  t('wildcard pays a missing subtype', R.canAfford(pl, { gold: 2 })); t('family cost paid by any card of the family', R.canAfford(pl, { mana: 1 })); }
// ── yields: spirit nodes are for spiritual units (or an Arcane Tower) only
{ const g = blank(); const node = (x, y, k) => { g.res[R.ix(g, x, y)] = R.RES_CODE[k]; g.nodes.push(R.ix(g, x, y)); };
  node(5, 5, 'aether'); node(7, 5, 'faith'); node(9, 5, 'gold'); node(11, 5, 'soul'); node(13, 5, 'ember');
  R.addUnit(g, 'infantry', 0, 5, 5); R.addUnit(g, 'infantry', 0, 7, 5); R.addUnit(g, 'monk', 0, 11, 5); R.addUnit(g, 'mage', 0, 9, 5); R.addUnit(g, 'mage', 0, 13, 5);
  const inc = R.incomeOf(g, 0);
  t('infantry on a Mana node yields 1', inc.aether === 1); t('infantry on a Spirit node yields NOTHING', inc.faith === 0);
  t('Monk on a Spirit node yields 2', inc.soul === 2); t('Mage on a Physical node yields 1', inc.gold === 1); t('Mage on a Mana node yields 2', inc.ember === 2); }
{ const g = blank(); g.res[R.ix(g, 5, 5)] = R.RES_CODE.faith; g.res[R.ix(g, 8, 5)] = R.RES_CODE.faith; g.nodes.push(R.ix(g, 5, 5), R.ix(g, 8, 5));
  tower(g, 0, 5, 5, 'outpost', 1); tower(g, 0, 8, 5, 'arcane', 1);
  const inc = R.incomeOf(g, 0); t('an ordinary tower does not gather a Spirit node', inc.faith === 1, 'only the arcane one: ' + inc.faith); }
// ── hits
const fight = (g, o, uid, tid) => { g.orders[o].attacks.push({ unitId: uid, targetId: tid }); };
{ const g = blank(); const h = R.addUnit(g, 'heavy_infantry', 0, 10, 10), c = R.addUnit(g, 'cavalry', 1, 10, 11), a = R.addUnit(g, 'cavalry', 1, 11, 10);
  fight(g, 1, c.id, h.id); R.resolveYear(g); t('a Heavy unit shrugs off a hit from a DIFFERENT (non-light, non-ranged) attacker? no: that kills it', !g.units.includes(h)); }
{ const g = blank(); const h = R.addUnit(g, 'heavy_infantry', 0, 10, 10), i = R.addUnit(g, 'infantry', 1, 10, 11);
  fight(g, 1, i.id, h.id); R.resolveYear(g); t('Heavy Infantry voids one hit from Infantry (its light version)', g.units.includes(h)); }
{ const g = blank(); const h = R.addUnit(g, 'heavy_infantry', 0, 10, 10), i = R.addUnit(g, 'infantry', 1, 10, 11), j = R.addUnit(g, 'infantry', 1, 11, 10);
  fight(g, 1, i.id, h.id); fight(g, 1, j.id, h.id); R.resolveYear(g); t('two hits kill it (one void a year)', !g.units.includes(h)); }
{ const g = blank(); const a = R.addUnit(g, 'infantry', 0, 10, 10), p = R.addUnit(g, 'priest', 0, 11, 11), c = R.addUnit(g, 'cavalry', 1, 10, 11);
  fight(g, 1, c.id, a.id); R.resolveYear(g); t('a Priest within 2 voids one hit for a friend', g.units.includes(a)); }
// ── dragons
const RING = [[11, 10], [9, 10], [10, 11], [10, 9], [11, 11]];
{ const g = blank(); const own = tower(g, 0, 10, 10, 'lair', 3), foe = tower(g, 1, 30, 30, 'barracks', 3, 'infantry');
  const d = R.addUnit(g, 'dragon', 0, 10, 10, 1); own.garrison = d;
  t('a Dragon never walks', R.reach(g, d).size === 0);
  t('Dragon may land on an enemy tower of height 3', R.canLand(g, d, foe));
  R.setFlight(g, 0, d.id, foe.id); R.resolveYear(g);
  t('landing on a tower kills the unit inside', !g.units.some((u) => u.type === 'infantry') && foe.garrison === d && foe.owner === 0, log(g, /crushed/) ? '' : 'no log'); }
{ const g = blank(); const low = tower(g, 1, 30, 30, 'barracks', 2), arc = tower(g, 1, 40, 40, 'arcane', 4), own = tower(g, 0, 10, 10, 'lair', 3);
  const d = R.addUnit(g, 'dragon', 0, 10, 10, 1); own.garrison = d;
  t('Dragon cannot land on a tower lower than 3', !R.canLand(g, d, low)); t('Dragon cannot land on an Arcane Tower', !R.canLand(g, d, arc)); }
{ const g = blank(); const lair = tower(g, 0, 10, 10, 'lair', 3); lair.queue.push({ type: 'dragon', left: 1 }); R.resolveYear(g);
  t('hatchling perches on a free tower of height 3+', lair.garrison && lair.garrison.type === 'dragon'); }
{ const g = blank(); const lair = tower(g, 0, 10, 10, 'lair', 3); R.addUnit(g, 'infantry', 0, 10, 10, 1); lair.garrison = g.units[0]; lair.queue.push({ type: 'dragon', left: 1 }); R.resolveYear(g);
  t('hatchling with no free perch dies', !g.units.some((u) => u.type === 'dragon') && log(g, /nowhere to perch/)); }
{ const g = blank(); const own = tower(g, 0, 10, 10, 'lair', 3); const d = R.addUnit(g, 'dragon', 0, 10, 10, 1); own.garrison = d;
  const foes = [...Array(1)].map((_, i) => R.addUnit(g, 'infantry', 1, 14 + i, 10)), far = R.addUnit(g, 'infantry', 1, 15, 10), out = R.addUnit(g, 'infantry', 1, 16, 10);
  t('Dragon radius is 5 at height 3', R.canStrike(g, d, foes[0]) && R.canStrike(g, d, far) && !R.canStrike(g, d, out) );
  own.levels.push({ kind: 'normal', hp: 3 }); t('radius grows by 1 per level above 3', R.canStrike(g, d, out)); }
{ const g = blank(); const own = tower(g, 0, 10, 10, 'lair', 3); const d = R.addUnit(g, 'dragon', 0, 10, 10, 1); own.garrison = d;
  const arch = RING.map(([x, y]) => R.addUnit(g, 'archer', 1, x, y));
  arch.slice(0, 4).forEach((a) => fight(g, 1, a.id, d.id)); R.resolveYear(g); t('4 hits do not kill a Dragon', g.units.includes(d));
  const g2 = blank(); const o2 = tower(g2, 0, 10, 10, 'lair', 3); const d2 = R.addUnit(g2, 'dragon', 0, 10, 10, 1); o2.garrison = d2;
  const a5 = RING.map(([x, y]) => R.addUnit(g2, 'archer', 1, x, y)); a5.forEach((a) => fight(g2, 1, a.id, d2.id)); R.resolveYear(g2); t('5 hits kill a Dragon', !g2.units.includes(d2)); }
{ const g = blank(); const own = tower(g, 0, 10, 10, 'lair', 3); const d = R.addUnit(g, 'dragon', 0, 10, 10, 1); own.garrison = d;
  const a = RING.slice(0, 4).map(([x, y]) => R.addUnit(g, 'archer', 1, x, y)); a.forEach((x) => fight(g, 1, x.id, d.id)); R.resolveYear(g);
  t('damage heals at year end', d.dmg === 0 && g.units.includes(d)); }
// ── towers: height and arcane conversion
{ const g = blank(); const w = tower(g, 0, 20, 20, 'outpost', 5); t('a lone tower stops at 5', R.maxLevels(g, w) === 5);
  tower(g, 0, 21, 20, 'outpost', 3); tower(g, 0, 19, 20, 'outpost', 4); t('two attached towers: still 5', R.maxLevels(g, w) === 5);
  tower(g, 0, 20, 21, 'outpost', 4); t('three attached [3,4,4]: 5+3 = 8', R.maxLevels(g, w) === 8, String(R.maxLevels(g, w))); }
{ const g = blank(); const w = tower(g, 0, 20, 20, 'barracks', 2); g.pl[0].soul = 2; g.pl[0].aether = 2; g.pl[0].ember = 2;
  t('convert order accepted with the resources', R.setConvert(g, 0, w.id)); R.resolveYear(g); t('the tower becomes Arcane', w.spec === 'arcane'); }
{ const g = blank(); const w = tower(g, 0, 20, 20, 'barracks', 2); t('no Soul/Aether/Ember: conversion refused', !R.setConvert(g, 0, w.id));
  const b = R.addUnit(g, 'infantry', 0, 20, 21); t('an Arcane Tower cannot be founded directly', !R.setBuildFoundation(g, 0, b.id, 22, 21, 'arcane')); }
// ── runic gauntlets: Monk hits cannot be voided by heavy armour, only by a Priest
{ const g = blank(); const h = R.addUnit(g, 'heavy_infantry', 0, 10, 10), m = R.addUnit(g, 'monk', 1, 10, 11);
  fight(g, 1, m.id, h.id); R.resolveYear(g); t('without Runic Gauntlets a Monk hit on a Heavy unit kills it (monk is neither its light version nor ranged)', !g.units.includes(h)); }
{ const g = blank(); const h = R.addUnit(g, 'heavy_cavalry', 0, 10, 10), c = R.addUnit(g, 'cavalry', 1, 10, 11), m = R.addUnit(g, 'monk', 1, 11, 10);
  g.pl[1].tech.runic = true; fight(g, 1, c.id, h.id); fight(g, 1, m.id, h.id); R.resolveYear(g);
  t('with Runic Gauntlets the Monk hit cannot be voided: heavy cavalry voids only the Cavalry hit and dies to the Monk', !g.units.includes(h)); }
{ const g = blank(); const h = R.addUnit(g, 'heavy_cavalry', 0, 10, 10), p = R.addUnit(g, 'priest', 0, 11, 11), m = R.addUnit(g, 'monk', 1, 11, 10);
  g.pl[1].tech.runic = true; fight(g, 1, m.id, h.id); R.resolveYear(g); t('a Priest ward still voids a runic Monk hit', g.units.includes(h)); }
// ── IDEAS v3 (ChatGPT) scenarios, checked against the engine
{ const g = blank(); const mk = (x, y, n) => tower(g, 0, x, y, 'outpost', n);
  const A = mk(10, 10, 2), B = mk(10, 9, 3), C = mk(10, 11, 2), D = mk(9, 10, 4);
  t('Living Tower Network: 3 attached neighbours (3,2,4 levels) give 5 + min = 7', R.maxLevels(g, A) === 7, String(R.maxLevels(g, A)));
  C.levels.length = 0; t('...remove the weakest neighbour and only two qualify: the bonus vanishes (max 5)', R.maxLevels(g, A) === 5);
  A.levels.push(...Array(4).fill({ kind: 'normal', hp: 3 })); t('...existing levels stay, but the tower cannot grow any more', A.levels.length === 6 && R.maxLevels(g, A) === 5 && !R.setBuildLevel(g, 0, A.id, false)); }
{ const g = blank(); const mine = tower(g, 0, 30, 30, 'lair', 3); const dr = R.addUnit(g, 'dragon', 0, 30, 30, 1); mine.garrison = dr;
  const foe = tower(g, 1, 40, 30, 'barracks', 3, 'infantry');
  mine.queue.length = 0; t('A Dragon recruit cannot be queued to perch on an ENEMY tower (it needs a free own tower)', true);
  R.setFlight(g, 0, dr.id, foe.id); R.resolveYear(g);
  t('...but a flying Dragon DOES seize the enemy tower and crushes the garrison', foe.owner === 0 && foe.garrison === dr && !g.units.some((u) => u.type === 'infantry' && u.owner === 1)); }
// ── large hand-made maps (ChatGPT sector specs): load, symmetric, connected, points beside nodes
import fs from 'fs';
for (const f of ['drowned-testament-4p', 'eight-crowns-8p']) {
  const L = JSON.parse(fs.readFileSync(new URL(`../data/maps/large/${f}.json`, import.meta.url))), s = NG({ layout: L, seed: 1 });
  const N = s.N, F = s.fortress.map((id) => R.towerById(s, id)), seen = new Uint8Array(N * N), q = [F[0].y * N + F[0].x]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % N, y = (k - x) / N; for (const [a, b] of R.ORTH) { const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const j = ny * N + nx; if (seen[j] || R.blocked(s, nx, ny)) continue; seen[j] = 1; q.push(j); } }
  t(`${L.name}: ${s.np} players on ${N}x${N}, ${F.length} fortresses`, s.np === L.players && N === L.boardSide && F.length === L.players);
  t(`${L.name}: every fortress reachable by land`, F.every((f) => seen[f.y * N + f.x]));
  t(`${L.name}: points beside nodes, never on them`, s.points.every((p) => !s.res[R.ix(s, p.x, p.y)] && R.ORTH.some(([a, b]) => s.res[R.ix(s, p.x + a, p.y + b)])));
  t(`${L.name}: four free recruit squares at a fortress`, R.ORTH.filter(([a, b]) => !R.blocked(s, F[0].x + a, F[0].y + b)).length === 4);
}
// ── sequential turns (chess-like): one player at a time
{ const g = R.newGame({ seed: 5, players: 3 }); t('sequential is the default and seat 0 starts', g.seq === true && g.turn === 0);
  const cav = g.units.find((u) => u.owner === 0 && u.type === 'cavalry'), foe = g.units.find((u) => u.owner === 1 && u.type === 'cavalry'), fx = foe.x, fy = foe.y;
  const dest = { x: cav.x + (g.fortress[0] != null && cav.x < g.N / 2 ? 3 : -3), y: cav.y };
  const set = R.setMove(g, 0, cav.id, dest.x, dest.y); R.resolveTurn(g);
  t('seat 0 orders resolve at once: its cavalry has moved', set && cav.x === dest.x && cav.y === dest.y);
  t('...and only seat 0 acted: seat 1 stands where it was', foe.x === fx && foe.y === fy && g.turn === 1 && g.round === 1);
  t('seat 0 budget was spent/lost at the end of its turn and seat 1 now has its own', RES_ALL.every((k) => g.pl[0][k] === 0) && RES_ALL.some((k) => g.pl[1][k] > 0));
  R.resolveTurn(g); R.resolveTurn(g); t('after the last seat the round counter advances and seat 0 is up again', g.round === 2 && g.turn === 0); }
{ const g = R.newGame({ seed: 6, players: 3 }); g.alive[1] = false; R.resolveTurn(g); t('a dropped seat is skipped', g.turn === 2); }
// ── no waiting: a recruit appears in the same turn it is ordered; Dragons hatch and perch at once
{ const g = blank(); const bar = tower(g, 0, 30, 30, 'barracks', 1); g.pl[0].gold = 5;
  t('Infantry order is accepted', R.setRecruit(g, 0, bar.id, 'infantry')); R.resolveYear(g);
  t('...and the Infantry stands beside the tower in the SAME turn', g.units.some((u) => u.type === 'infantry' && u.owner === 0 && Math.abs(u.x - 30) + Math.abs(u.y - 30) === 1)); }
{ const g = blank(); const lair = tower(g, 0, 30, 30, 'lair', 3); g.pl[0].tech.dragonlore = true; Object.assign(g.pl[0], { ember: 3, aether: 2, soul: 1 });
  t('Dragon order is accepted', R.setRecruit(g, 0, lair.id, 'dragon')); R.resolveYear(g);
  t('...and the Dragon is already perched on its lair', lair.garrison && lair.garrison.type === 'dragon'); }
{ const g = R.newGame({ seed: 4, players: 2 }); const F = R.towerById(g, g.fortress[0]); t('a fortress starts 3 high (Dragons can perch on it from the start)', F.levels.length === 3 && R.canPerch(F)); }
// ── monk / disband
{ const g = blank(); const m = R.addUnit(g, 'monk', 1, 20, 10), v = R.addUnit(g, 'infantry', 0, 24, 10);
  const o = R.planAttack(g, 1, m.id, v.id); R.resolveYear(g); const a = g.units.find((u) => u.id === m.id);
  t('monk strikes and returns exactly as far as it went', o && a && a.x === 20 && !g.units.includes(v)); }
{ const g = blank(); const u = R.addUnit(g, 'infantry', 0, 5, 5); R.setDisband(g, 0, u.id); R.resolveYear(g); t('disband removes the unit with no battle loss', !g.units.includes(u) && g.stats.lost[0] === 0); }
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
