// Rules regression tests:  node test/rules.test.mjs
import * as R from '../src/rules.js';
import { RES_ALL } from '../src/balance.js';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? '  ok   ' : '  FAIL ') + n + (x ? '  ' + x : '')); };
const blank = (seed = 3) => { const g = R.newGame({ seed }); g.units.length = 0; g.towers.length = 0; g.ug.fill(null); g.tg.fill(null); g.res.fill(0); g.points.length = 0; g.fortress = [null, null]; g.winner = null; return g; };
const tower = (g, o, x, y, spec, n, garrison) => { const w = R.addTower(g, o, x, y, spec, Array(n).fill('normal')); if (garrison) { const u = R.addUnit(g, garrison, o, x, y, 1); w.garrison = u; } return w; };
const log = (g, re) => g.log.some((l) => re.test(l.msg));
// ── map
{ const s = R.newGame({ seed: 7 }); const kinds = {}; for (const c of s.res) if (c) kinds[R.RES_NAMES[c]] = 1;
  t('75x75 map with all 6 node types', s.N === 75 && Object.keys(kinds).length === 6);
  t('strategic points are never on a resource square', s.points.every((p) => !s.res[R.ix(s, p.x, p.y)]));
  t('strategic points are always next to a resource square', s.points.every((p) => R.ORTH.some(([a, b]) => s.res[R.ix(s, p.x + a, p.y + b)])));
  t('at least 12 strategic points', s.points.length >= 12, String(s.points.length)); }
// ── payment
{ const pl = { gold: 1, iron: 0, aether: 0, ember: 1, faith: 0, soul: 0, physical: 2, mana: 0, spirit: 0 };
  t('wildcard pays a missing subtype', R.canAfford(pl, { gold: 2 })); t('family cost paid by any card of the family', R.canAfford(pl, { mana: 1 })); }
// ── yields: spirit nodes are for spiritual units (or an Arcane Tower) only
{ const g = blank(); const node = (x, y, k) => { g.res[R.ix(g, x, y)] = R.RES_CODE[k]; };
  node(5, 5, 'aether'); node(7, 5, 'faith'); node(9, 5, 'gold'); node(11, 5, 'soul'); node(13, 5, 'ember');
  R.addUnit(g, 'infantry', 0, 5, 5); R.addUnit(g, 'infantry', 0, 7, 5); R.addUnit(g, 'monk', 0, 11, 5); R.addUnit(g, 'mage', 0, 9, 5); R.addUnit(g, 'mage', 0, 13, 5);
  const inc = R.incomeOf(g, 0);
  t('infantry on a Mana node yields 1', inc.aether === 1); t('infantry on a Spirit node yields NOTHING', inc.faith === 0);
  t('Monk on a Spirit node yields 2', inc.soul === 2); t('Mage on a Physical node yields 1', inc.gold === 1); t('Mage on a Mana node yields 2', inc.ember === 2); }
{ const g = blank(); g.res[R.ix(g, 5, 5)] = R.RES_CODE.faith; g.res[R.ix(g, 8, 5)] = R.RES_CODE.faith;
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
// ── monk / disband
{ const g = blank(); const m = R.addUnit(g, 'monk', 1, 20, 10), v = R.addUnit(g, 'infantry', 0, 24, 10);
  const o = R.planAttack(g, 1, m.id, v.id); R.resolveYear(g); const a = g.units.find((u) => u.id === m.id);
  t('monk strikes and returns exactly as far as it went', o && a && a.x === 20 && !g.units.includes(v)); }
{ const g = blank(); const u = R.addUnit(g, 'infantry', 0, 5, 5); R.setDisband(g, 0, u.id); R.resolveYear(g); t('disband removes the unit with no battle loss', !g.units.includes(u) && g.stats.lost[0] === 0); }
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
