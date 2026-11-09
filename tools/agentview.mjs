// Text views of a game for agents (and humans): state, reach, rules. Keeps agents' context small and unambiguous.
import * as R from '../src/rules.js';
import { UNITS, UNIT_ORDER, SPECS, COSTS, TECHS, ACTIONS, FOUNDATION_HP, NORMAL_HP, REINFORCED_HP, MAX_LEVELS, GARRISON_DEF, YIELD, CAPITAL_GOLD, FORTRESS_HOLD_YEARS, POINTS_HOLD_YEARS, QUEUE_SLOTS, FORTRESS } from '../src/balance.js';

const SYM = { infantry: 'i', heavy_infantry: 'h', cavalry: 'c', heavy_cavalry: 'v', archer: 'a', siege: 's', mage: 'm', dragon: 'd' };
const costStr = (c) => Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${v}${k[0]}`).join('+') || 'free';
const NAMES = ['P1 (Slate)', 'P2 (Rust)'];

export function mapText(s) {
  const N = s.N, rows = [];
  const hdr1 = '    ' + Array.from({ length: N }, (_, x) => (x % 10 === 0 ? String(Math.floor(x / 10)) : ' ')).join(''), hdr2 = '    ' + Array.from({ length: N }, (_, x) => x % 10).join('');
  rows.push(hdr1, hdr2);
  for (let y = 0; y < N; y++) {
    let line = String(y).padStart(3) + ' ';
    for (let x = 0; x < N; x++) {
      const k = R.ix(s, x, y), t = s.tg[k], u = s.ug[k];
      let ch = '.';
      if (s.res[k]) ch = ['', '$', '=', '~'][s.res[k]];
      if (s.points.some((p) => p.x === x && p.y === y)) ch = '*';
      if (t) ch = t.fortress ? (t.owner === 0 ? 'F' : 'f') : (t.owner === 0 ? 'T' : 't');
      if (u) ch = u.owner === 0 ? SYM[u.type].toUpperCase() : SYM[u.type];
      line += ch;
    }
    rows.push(line);
  }
  return rows.join('\n');
}
const uLine = (s, u) => { const d = UNITS[u.type]; return `  #${u.id} ${u.type} (${u.x},${u.y})${u.z ? ' [GARRISON of tower at same square]' : ''} MOV${d.mov} ATK${d.atk} DEF${d.def} RNG${d.rng}${u.idle ? ' **IDLE (unpaid upkeep: cannot act this year)**' : ''}`; };
const tLine = (s, t) => `  #${t.id} ${t.fortress ? 'FORTRESS' : t.spec} (${t.x},${t.y}) owner ${t.owner + 1} levels[${t.levels.map((l) => (l.kind === 'reinforced' ? 'R' : 'N') + l.hp).join(' ') || 'none'}] foundation ${t.fHp}/${FOUNDATION_HP} garrison ${t.garrison ? '#' + t.garrison.id + ' ' + t.garrison.type : 'none'} queue [${t.queue.map((q) => q.type + ':' + q.left + 'y').join(', ') || 'empty'}]`;
export function ordersText(s, p) {
  const o = s.orders[p], L = [];
  for (const [uid, m] of Object.entries(o.moves)) L.push(`  move #${uid} -> (${m.path[m.path.length - 1].x},${m.path[m.path.length - 1].y})${m.climb ? ' [climb]' : ''}${m.fly ? ' [fly]' : ''}`);
  for (const a of o.attacks) L.push(`  attack #${a.unitId} -> unit #${a.targetId}`);
  for (const a of o.siege) L.push(`  siege #${a.unitId} -> tower #${a.targetId}`);
  for (const b of o.builds) L.push(b.kind === 'foundation' ? `  found tower (${b.spec}) at (${b.x},${b.y}) by #${b.builderId}` : `  add ${b.reinforced ? 'reinforced' : 'normal'} level to tower #${b.towerId}`);
  for (const r of o.recruits) L.push(`  recruit ${r.type} at tower #${r.towerId}`);
  for (const r of o.research) L.push(`  research ${r.tech}`);
  return L.length ? L.join('\n') : '  (none yet)';
}
export function stateText(s, p, ready, withMap = false) {
  const pl = s.pl[p], inc = R.incomeOf(s, p), up = R.upkeepOf(s, p), com = R.committed(s, p), out = [];
  out.push(`YEAR ${s.round} — you are ${NAMES[p]}.  ${s.winner !== null ? `GAME OVER: ${s.winReason}` : `PLANNING.  you: ${ready[p] ? 'READY' : 'not ready'}, opponent: ${ready[1 - p] ? 'READY' : 'planning'}`}`);
  out.push(`RESOURCES gold ${pl.gold} iron ${pl.iron} mana ${pl.mana}  | already committed by your orders: ${costStr(com)}  | income next year: gold +${inc.gold} iron +${inc.iron} mana +${inc.mana}  | upkeep due at year end: ${up} gold (if you cannot pay, units go IDLE)`);
  out.push(`TECH ${Object.entries(pl.tech).map(([k, v]) => k + ':' + (v ? 'yes' : 'no')).join(' ')}   UNPAID-IDLE units: ${pl.unpaid}`);
  const maj = Math.floor(s.points.length / 2) + 1;
  out.push(`STRATEGIC POINTS (hold ${maj} of ${s.points.length} with GARRISONED towers for ${POINTS_HOLD_YEARS} consecutive years to win): ` + s.points.map((pt) => `(${pt.x},${pt.y})=${R.pointOwner(s, pt) < 0 ? 'free' : 'P' + (R.pointOwner(s, pt) + 1)}`).join(' ') + `   | held-years: you ${s.pointsHeld[p]}, enemy ${s.pointsHeld[1 - p]}`);
  const ef = R.towerById(s, s.fortress[1 - p]), mf = R.towerById(s, s.fortress[p]);
  out.push(`FORTRESSES: yours #${s.fortress[p]} owner now P${mf ? mf.owner + 1 : '?'}; enemy #${s.fortress[1 - p]} at (${ef ? ef.x + ',' + ef.y : 'gone'}) owner now P${ef ? ef.owner + 1 : '?'}  | years you have held the enemy fortress: ${s.held[p]} (win at ${1 + FORTRESS_HOLD_YEARS}), enemy has held yours: ${s.held[1 - p]}`);
  if (withMap) out.push('', 'MAP  (x across, y down. Uppercase = P1 units/towers, lowercase = P2. i=infantry h=heavy inf c=cavalry v=heavy cav a=archer s=siege m=mage d=dragon; T/t tower, F/f fortress; $ gold cell, = iron cell, ~ mana cell, * strategic point; units standing ON a tower top are not drawn: see lists)', mapText(s));
  else { const cells = []; for (let y = 0; y < s.N; y++) for (let x = 0; x < s.N; x++) { const c = s.res[R.ix(s, x, y)]; if (c) { const t = s.tg[R.ix(s, x, y)]; cells.push(`${['', 'gold', 'iron', 'mana'][c]}(${x},${y})${t ? '[tower P' + (t.owner + 1) + ']' : ''}`); } } out.push('', `RESOURCE CELLS: ${cells.join(' ')}`, `(board ${s.N}x${s.N}; use the 'map' command for a picture)`); }
  out.push('', `YOUR UNITS (${s.units.filter((u) => u.owner === p).length}):`, ...s.units.filter((u) => u.owner === p).map((u) => uLine(s, u)));
  out.push('YOUR TOWERS:', ...s.towers.filter((t) => t.owner === p).map((t) => tLine(s, t)));
  out.push('', `ENEMY UNITS:`, ...s.units.filter((u) => u.owner !== p).map((u) => uLine(s, u)), 'ENEMY TOWERS:', ...s.towers.filter((t) => t.owner !== p).map((t) => tLine(s, t)));
  out.push('', 'YOUR ORDERS THIS YEAR:', ordersText(s, p));
  return out.join('\n');
}
export function reachText(s, p, uid) {
  const u = R.unitById(s, uid); if (!u) return `no such unit #${uid}`; if (u.owner !== p) return 'not your unit';
  const r = R.reach(s, u), cells = [...r.entries()].map(([k, e]) => ({ x: k % s.N, y: Math.floor(k / s.N), e }));
  const byRow = {}; for (const c of cells) (byRow[c.y] ||= []).push(c.x + (c.e.climb ? '^' : ''));
  const rows = Object.keys(byRow).sort((a, b) => a - b).map((y) => `  y=${y}: x=${byRow[y].sort((a, b) => parseInt(a) - parseInt(b)).join(',')}`);
  const strikes = []; const tws = []; const d = UNITS[u.type];
  for (const e of s.units.filter((z) => z.owner !== p)) { if (R.canStrike(s, u, e)) strikes.push(`#${e.id} ${e.type}(${e.x},${e.y}) from where it stands`); else for (const c of cells) if (R.canStrike(s, u, e, { x: c.x, y: c.y, z: c.e.climb ? 1 : 0 })) { strikes.push(`#${e.id} ${e.type}(${e.x},${e.y}) after moving`); break; } }
  if (d.siege) for (const t of s.towers.filter((z) => z.owner !== p)) if (R.canSiege(s, u, t, u, true)) tws.push(`tower #${t.id}(${t.x},${t.y}) in range now`);
  return `Unit #${u.id} ${u.type} at (${u.x},${u.y}) can move to ${cells.length} squares ('^' = climbs a tower, ends garrisoned):\n${rows.join('\n') || '  (nowhere)'}\nEnemy units it could strike: ${strikes.join('; ') || 'none'}${d.siege ? `\nTowers it can siege (only if it does NOT move this year): ${tws.join('; ') || 'none in range'}` : ''}`;
}
export function rulesText() {
  const rows = UNIT_ORDER.map((t) => { const d = UNITS[t]; return `  ${t.padEnd(15)} MOV${d.mov} ATK${d.atk} DEF${d.def} RNG${d.rng || '-'} cost ${costStr(d.cost).padEnd(7)} upkeep ${d.upkeep}g  recruited at ${SPECS[d.at].name}${d.minLevel > 1 ? ' (tower level ' + d.minLevel + '+)' : ''} in ${d.time}y${d.climb ? '' : '  cannot climb towers'}${d.builder ? '  BUILDER' : ''}${d.siege ? '  SIEGE' : ''}${d.flying ? '  FLYING' : ''}${d.arcane ? '  ARCANE' : ''}${d.tech ? '  needs ' + d.tech : ''}`; });
  return `THE TOWER GAME — rules as implemented (deterministic, no dice; one YEAR per round; both players plan secretly and simultaneously)

GOAL — you win by ANY of:
  1. FORTRESS: seize the enemy main fortress (an empty fortress tower can be entered by an enemy infantry/archer/mage that climbs it) and still hold it at the end of the FOLLOWING year.
  2. STRATEGIC POINTS: your GARRISONED towers stand on a majority of the strategic points (shown in the state) at the end of ${POINTS_HOLD_YEARS} consecutive years.
  3. ELIMINATION: the opponent has no towers and no builders (infantry) left.

THE YEAR (resolves in this order after BOTH sides say 'ready'):
  economy -> recruitment -> movement -> combat -> building -> control -> end of year (upkeep, victory checks)
  - economy: each resource cell you control pays: a unit standing on it ${YIELD.unit}; your tower on it ${YIELD.tower}, or ${YIELD.garrisoned} if garrisoned. + ${CAPITAL_GOLD} gold per fortress you own. Research orders complete here.
  - recruitment: queued units whose time is up appear on a free square next to their tower; then NEW recruit orders are paid for (cost is paid when the order resolves).
  - movement: all move orders advance one square at a time in lockstep. A unit stops if the next square is occupied. If enemies try to enter the SAME square they collide: both stop and fight each other in combat.
  - combat: all strike orders resolve at once from the post-movement positions. effective ATK = ATK + (number of OTHER friendly units striking the same target). If effective ATK > target's effective DEF the target is destroyed; equal = nothing happens; lower = nothing. Garrisons defend with DEF +${GARRISON_DEF} (not vs Arcane). Melee units strike orthogonally adjacent targets only; a garrison on a tower top can only be hit by RANGED units. Ranged units (RNG>0) need a clear line (towers block ground fire; a shooter on a tower shoots over lower towers; Arcane and Flying ignore lines). RNG is measured in orthogonal steps (Manhattan). Siege engines damage towers (see below).
  - building: foundations and levels go up.
  - end of year: you pay upkeep (gold) for every unit. If you cannot, the most expensive units become IDLE for the next year (they ignore orders) and you cannot recruit.

MOVEMENT: orthogonal only, 1 MOV per square. Friendly and enemy units block. Tower bases block (you can only CLIMB a tower, as the last step, costing +1 MOV: ending garrisoned). Leaving a tower top costs +1 MOV. Cavalry, heavy cavalry, siege engines and dragons cannot climb. Dragons fly: they ignore obstacles, move up to MOV squares Manhattan, and must end on a free square.

UNITS:
${rows.join('\n')}
  Costs use g=gold i=iron m=mana. Upkeep is gold per year per unit, paid at year end.

TOWERS: a tower is a foundation (${FOUNDATION_HP} structural) + up to ${MAX_LEVELS} levels: normal ${NORMAL_HP} structural (cost ${costStr(COSTS.normal)}) or reinforced ${REINFORCED_HP} (cost ${costStr(COSTS.reinforced)}). One level per tower per year. Laying a foundation costs ${costStr(COSTS.foundation)} + a specialisation surcharge; a builder (INFANTRY) must stand orthogonally next to the free target square at building time (it may MOVE there the same year). A tower needs at least 1 level to be garrisoned and to recruit. Adding a level requires a garrison of yours on that tower OR your infantry next to it. A new foundation cannot get its first level the same year.
  Specialisations (chosen when the foundation is laid; fixed): ${Object.entries(SPECS).map(([k, v]) => `${k} (${v.text}) surcharge ${costStr(COSTS.spec[k])}`).join(' | ')}.
  Fortresses recruit infantry/archers/cavalry (and heavies from level 2) and have ${FORTRESS.queueSlots} queue slots; other towers have ${QUEUE_SLOTS}.
  ONLY SIEGE ENGINES hurt towers: a siege engine that did NOT move this year, with RNG 5 and a clear line, removes 1 structural point (2 with Siegecraft) from the TOP level per siege order. At 0 the level is removed (the garrison drops with it; with no levels left it is evicted). When the foundation hits 0 the tower collapses. Damage is permanent.
  A tower with no garrison can be seized: an enemy unit that can climb walks onto it and the tower changes owner.

TECH: ${Object.entries(TECHS).map(([k, v]) => `${k} (cost ${costStr(v.cost)}): ${v.text}`).join('  |  ')}

COMMANDS (via the tg tool): move, attack, siege, found, level, recruit, research, clear, ready. You can re-issue orders any number of times before 'ready'; a new move order for the same unit replaces the old one.
  'attack' automatically plans the cheapest move that brings the target into reach AND the strike. Strikes only happen if the target is in reach at combat time (enemies may have moved away!).
`;
}
