// THE TOWER GAME — 3D playable prototype (human = player 0 vs built-in AIs, 2-8 players). Same rules engine and panels as the 2D prototype (src/play.js); the board is drawn by src/view3d.js.
import * as R from './rules.js';
import { planYear } from './ai.js';
import { createView } from './view3d.js';
import { NAME } from './models.js';
import { UNITS, UNIT_ORDER, SPECS, COSTS, TECHS, RES_ALL, SUBTYPES, FAMILY_LIST, RES_NAME, RES_INFO, ARCANE_CONVERT } from './balance.js';

const Q = new URLSearchParams(location.search), rich = Q.get('rich') === '1';
const mapId = Q.get('map'), players = +(Q.get('players') || 2), gameMode = Q.get('mode') === 'teams' ? 'teams' : 'ffa';
const loadMap = async (id) => { for (const dir of ['data/maps/large/', 'data/maps/']) { try { const r = await fetch(`./${dir}${id}.json`); if (r.ok) return await r.json(); } catch (e) { /* next */ } } return null; };
const layout = mapId ? await loadMap(mapId) : null;                                              // ?map=drowned-testament-4p | eight-crowns-8p | the-broken-crown ...  (no ?map = generated map for ?players=N)
const s = R.newGame({ layout, players, mode: gameMode, seed: Q.get('seed') ? +Q.get('seed') : undefined, terrain: players === 2 && Q.get('terrain') === '1' ? true : null, res: rich ? Object.fromEntries(SUBTYPES.map((k) => [k, 500])) : null });
const N = s.N;
const $ = (id) => document.getElementById(id);
const COL = ['#46587a', '#b0552f', '#4f8a46', '#c2a233', '#7a4f9a', '#2f9a9a', '#9a2f45', '#b4b4bc'], TXT = COL, RC = ['', ...SUBTYPES.map((k) => RES_INFO[k].color)];
const LET = { infantry: 'i', heavy_infantry: 'H', cavalry: 'c', heavy_cavalry: 'C', archer: 'a', siege: 'S', mage: 'm', dragon: 'D', monk: 'k', priest: 'p' };
const rec = { id: Date.now(), seed: s.seed, started: new Date().toISOString(), rich, years: [] };      // saved to this browser after every year
const HKEY = 'tower.games';
const readAll = () => { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } };
function persist() {
  Object.assign(rec, { round: s.round, winner: s.winner, reason: s.winReason, updated: new Date().toISOString(), log: s.log.map((l) => `[Y${l.round}] ${l.msg}`), units: s.units.map((u) => `${u.owner}:${u.type}@${u.x},${u.y}${u.z ? '^' : ''}`), towers: s.towers.map((t) => `${t.owner}:${t.fortress ? 'F' : t.spec}@${t.x},${t.y}L${t.levels.length}`) });
  try { const all = readAll().filter((g) => g.id !== rec.id); all.push(rec); localStorage.setItem(HKEY, JSON.stringify(all.slice(-30))); } catch (e) { /* storage blocked: the game still plays */ }
}
function downloadLog() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(readAll(), null, 2)], { type: 'application/json' })); a.download = `tower-game-log-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`; a.click(); }
let sel = null, mode = null, info = null, cardsApi = null;            // sel = {kind:'unit'|'tower', id}; mode = {type:'found', builderId, spec}
const cost = (c) => Object.entries(c || {}).filter(([, v]) => v).map(([k, v]) => `${v} ${RES_NAME[k] || k}`).join(' + ') || 'free';
const say = (t, bad) => { $('msg').textContent = t; $('msg').style.color = bad ? '#ff8d7a' : 'var(--gold)'; };

// ───────── selection helpers ─────────
const selUnit = () => (sel && sel.kind === 'unit' ? R.unitById(s, sel.id) : null);
const selTower = () => (sel && sel.kind === 'tower' ? R.towerById(s, sel.id) : null);
function select(x) {
  sel = x; mode = null; info = null;
  const u = selUnit();
  if (u && u.owner === 0) {                                        // precompute where it can move and what it can hit
    const reach = R.reach(s, u), strikes = new Set(), sieges = new Set();
    for (const e of s.units) if (e.owner !== 0) {
      let ok = R.canStrike(s, u, e);
      if (!ok && !UNITS[u.type].siege) for (const [k, v] of reach) if (R.canStrike(s, u, e, { x: k % N, y: Math.floor(k / N), z: v.climb ? 1 : 0 })) { ok = true; break; }
      if (ok) strikes.add(e.id);
    }
    if (UNITS[u.type].siege) for (const t of s.towers) if (t.owner !== 0 && R.canSiege(s, u, t, u, true)) sieges.add(t.id);
    info = { reach, strikes, sieges };
  }
  render();
}

// ───────── drawing ─────────
function draw() { view.update({ s, info, selected: sel, orders: s.orders[0] }); }

// ───────── side panels ─────────
function render() {
  draw();
  const pl = s.pl[0], inc = R.incomeOf(s, 0), up = R.upkeepOf(s, 0), com = R.committed(s, 0), mh = R.pointsHeld(s, 0), eh = Math.max(0, ...R.foesOf(s, 0).map((o) => R.pointsHeld(s, o)));
  const ef = s.towers.find((t) => t.fortress && R.isFoe(s, 0, t.owner));
  const nodes = Object.fromEntries(SUBTYPES.map((k) => [k, 0])); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const cc = s.res[R.ix(s, x, y)]; if (!cc) continue; const t = s.tg[R.ix(s, x, y)], u = s.ug[R.ix(s, x, y)]; if ((t && t.owner === 0) || (!t && u && u.owner === 0)) nodes[R.RES_NAMES[cc]]++; }
  const used = R.spendUsage(pl, com);
  const desk = RES_ALL.filter((k) => pl[k] > 0).map((k) => { const I = RES_INFO[k], n = pl[k], t = used[k] || 0; return `<span class="dc${I.primary ? ' prim' : ''}" style="--c:${I.color}" title="${RES_NAME[k]}${I.primary ? ' (wild: any of its two kinds)' : ''}: ${n} this year, ${t} tapped by your orders">${Array.from({ length: Math.min(n, 12) }, (_, i) => `<i class="${i < t ? 'tap' : ''}"></i>`).join('')}<b>${n - t}</b>${RES_NAME[k]}</span>`; }).join('') || '<small>no cards this year</small>';
  const held = SUBTYPES.filter((k) => nodes[k]).map((k) => `${nodes[k]} ${RES_NAME[k]}`).join(', ') || 'none';
  const nxt = RES_ALL.filter((k) => inc[k]).map((k) => `${inc[k]} ${RES_NAME[k]}`).join(', ') || 'nothing';
  $('status').innerHTML = `<h2>Round ${s.round} · your turn — your desk</h2><div class="desk">${desk}</div><small>Cards are tapped by your planned orders (${cost(com)}); <b>unspent cards are lost</b> at year end. A primary card (Physical/Mana/Spirit) is wild for its two kinds.<br>Nodes worked by you: ${held} · army upkeep ${up} Gold (gold first, then Physical)${pl.unpaid ? ` · <b style="color:#ff8d7a">${pl.unpaid} unit(s) idle: could not pay</b>` : ''}<br>Next year if nothing changes: ${nxt}</small>
    <div style="margin-top:6px"><small>Strategic points: you <b class="p0">${mh}</b> · best rival <b class="p1">${eh}</b> (need ${Math.floor(s.points.length / 2) + 1}, held ${s.pointsHeld[0]}/2 years) · enemy fortress held by you for ${s.held[0]} year(s)${ef ? '' : ' (gone)'}</small></div>
    <div class="row" style="margin-top:6px">${Object.entries(TECHS).map(([k, T]) => `<button data-act="research" data-tech="${k}" ${s.pl[0].tech[k] || s.orders[0].research.some((r) => r.tech === k) || !R.canAfford(pl, R.addCost(com, T.cost)) ? 'disabled' : ''} title="${T.text}">${T.name} (${cost(T.cost)})${s.pl[0].tech[k] ? ' ✓' : ''}</button>`).join('')}</div>`;
  renderSel(); renderOrders();
  $('log').innerHTML = s.log.slice(-45).map((l) => `<div class="${l.owner === 0 ? 'p0' : l.owner === 1 ? 'p1' : ''}">${l.round ? `<small>Y${l.round}</small> ` : ''}${l.msg}</div>`).join(''); $('log').scrollTop = 1e9;
  if (s.winner !== null) { $('over').style.display = 'grid'; $('overT').textContent = s.winner === 0 ? 'VICTORY' : s.winner === 1 ? 'DEFEAT' : 'DRAW'; $('overT').style.color = s.winner === 0 ? '#e8c477' : '#ff7a65'; $('overR').textContent = s.winReason; }
  showCard();
}
function renderSel() {
  const el = $('sel'), u = selUnit(), t = selTower();
  if (u) {
    const d = UNITS[u.type], mine = u.owner === 0;
    el.innerHTML = `<h2><span class="p${u.owner}">${d.name}</span> #${u.id}${mine ? '' : ' (enemy)'}</h2><small>${d.flying ? `flies tower to tower · strikes within ${R.dragonRadius(R.towerAt(s, u.x, u.y) || { levels: [] })} squares` : `MOV ${d.mov} · RNG ${d.rng || '–'}`} · ${d.hits} hit${d.hits > 1 ? 's' : ''} to kill${d.heavy ? ' (+ voids one hit from its light version or ranged)' : ''} · upkeep ${d.upkeep}g · at (${u.x},${u.y})${u.z ? ' · GARRISON' : ''}${u.idle ? ' · <b style="color:#ff8d7a">IDLE</b>' : ''}</small>` +
      (mine ? `<div class="row" style="margin-top:6px"><button data-act="clearunit">Clear its orders</button><button data-act="disband" title="Release this unit at the start of the year (stops its upkeep)">Disband</button>${d.builder ? `<select id="spec">${Object.keys(SPECS).filter((k) => !SPECS[k].convertOnly).map((k) => `<option value="${k}">${SPECS[k].name} (${cost(R.addCost(COSTS.foundation, COSTS.spec[k] || {}))})</option>`).join('')}</select><button data-act="found">Lay foundation…</button>` : ''}</div><small>${d.siege ? 'Siege: click an enemy tower in the orange ring (the engine must not move). ' : ''}Blue = move · green = climb a tower · red ring = strike.</small>` : '');
  } else if (t) {
    const mine = t.owner === 0, qs = R.queueSlots(t);
    const conv = mine && !t.fortress && t.spec !== 'arcane' && t.spec !== 'lair' ? `<div class="row" style="margin-top:6px"><button data-act="convert" title="Soul, Aether and Ember poured into the stone">Make Arcane (${cost(ARCANE_CONVERT)})</button></div>` : '';
    el.innerHTML = conv + `<h2><span class="p${t.owner}">${t.fortress ? 'Fortress' : SPECS[t.spec].name}</span> #${t.id}${mine ? '' : ' (enemy)'}</h2><small>(${t.x},${t.y}) · foundation ${t.fHp}/6 · levels [${t.levels.map((l) => (l.kind === 'reinforced' ? 'R' : 'N') + l.hp).join(' ') || 'none'}] · garrison ${t.garrison ? '#' + t.garrison.id + ' ' + t.garrison.type : 'none'} · queue ${t.queue.map((q) => q.type + ':' + q.left + 'y').join(', ') || 'empty'} (${qs} slot${qs > 1 ? 's' : ''})</small>` +
      (mine && t.queue.some((q) => q.left <= 0) ? `<div style="color:#ff8d7a;margin:6px 0"><b>Recruits are blocked:</b> every square next to this tower is occupied. A finished unit appears only on a free orthogonal neighbour — move a unit away.</div>` : '') + (mine ? `<div class="row" style="margin-top:6px"><button data-act="level" data-r="0" ${t.levels.length >= R.maxLevels(s, t) ? 'disabled' : ''}>+ Level (${cost(COSTS.normal)})</button><button data-act="level" data-r="1" ${t.levels.length >= R.maxLevels(s, t) ? 'disabled' : ''}>+ Reinforced (${cost(COSTS.reinforced)})</button>${t.garrison ? `<button data-act="selgar">Select garrison</button>` : ''}</div>
      <div class="row" style="margin-top:6px">${UNIT_ORDER.filter((ty) => R.recruitable(s, t, ty)).map((ty) => `<button data-act="recruit" data-type="${ty}" title="${UNITS[ty].time} year(s)" ${R.canAfford(s.pl[0], R.addCost(R.committed(s, 0), UNITS[ty].cost)) ? '' : 'disabled'}>${UNITS[ty].name} (${cost(UNITS[ty].cost)})</button>`).join('') || '<small>Nothing can be recruited here yet (needs a level, or the right specialisation).</small>'}</div>` : '');
  } else el.innerHTML = '<small>Click one of your units or towers (blue = yours). Click an enemy to inspect it.</small>';
}
function renderOrders() {
  const o = s.orders[0], rows = [];
  for (const [uid, m] of Object.entries(o.moves)) { const e = m.path[m.path.length - 1]; rows.push([`move #${uid} → (${e.x},${e.y})${m.climb ? ' ↑' : ''}`, `data-act="cancelmove" data-uid="${uid}"`]); }
  o.attacks.forEach((a, i) => rows.push([`strike #${a.unitId} → #${a.targetId}`, `data-act="cancel" data-kind="attacks" data-i="${i}"`]));
  o.siege.forEach((a, i) => rows.push([`siege #${a.unitId} → tower #${a.targetId}`, `data-act="cancel" data-kind="siege" data-i="${i}"`]));
  o.builds.forEach((b, i) => rows.push([b.kind === 'foundation' ? `found ${b.spec} at (${b.x},${b.y})` : `${b.reinforced ? 'reinforced ' : ''}level on tower #${b.towerId}`, `data-act="cancel" data-kind="builds" data-i="${i}"`]));
  for (const f of o.flights || []) rows.push([`fly #${f.unitId} → tower #${f.towerId}`, `data-act="cancel" data-kind="flights" data-i="${o.flights.indexOf(f)}"`]);
  for (const id of o.convert || []) rows.push([`make tower #${id} Arcane`, `data-act="cancel" data-kind="convert" data-i="${o.convert.indexOf(id)}"`]);
  for (const uid of (o.disband || [])) rows.push([`disband #${uid}`, `data-act="undisband" data-uid="${uid}"`]);
  o.recruits.forEach((r, i) => rows.push([`recruit ${UNITS[r.type].name} at #${r.towerId}`, `data-act="cancel" data-kind="recruits" data-i="${i}"`]));
  o.research.forEach((r, i) => rows.push([`research ${TECHS[r.tech].name}`, `data-act="cancel" data-kind="research" data-i="${i}"`]));
  $('orders').innerHTML = rows.length ? rows.map(([t, a]) => `<div><span>${t}</span><button ${a}>✕</button></div>`).join('') : '<small>No orders yet. Units without orders stay where they are.</small>';
}
async function showCard() {
  const box = $('cardbox'), u = selUnit(), t = selTower();
  if (!cardsApi || !(u || t)) { box.style.display = 'none'; return; }
  try { box.innerHTML = u ? cardsApi.unitCardHTML(u.type, u.owner) : cardsApi.towerCardHTML(t.owner); box.style.display = 'block'; } catch (e) { box.style.display = 'none'; }
}

// ───────── input ─────────
function onHover({ x, y }) {
  if (!R.inb(s, x, y)) return;
  const c = s.res[R.ix(s, x, y)], u = R.unitAt(s, x, y), t = R.towerAt(s, x, y), pt = s.points.some((p) => p.x === x && p.y === y);
  $('hover').textContent = `(${x},${y})${c ? ' · ' + RES_NAME[R.RES_NAMES[c]] + ' node' : ''}${pt ? ' · strategic point' : ''}${t ? ` · P${t.owner + 1} ${t.fortress ? 'fortress' : t.spec} (${t.levels.length} lvl)` : ''}${u ? ` · P${u.owner + 1} ${u.type} #${u.id}` : ''}`;
}
function onCell({ x, y }, pick) {
  if (s.winner !== null) return;
  if (!R.inb(s, x, y)) return;
  const u = pick && pick.kind === 'unit' ? R.unitById(s, pick.id) : R.unitAt(s, x, y), t = R.towerAt(s, x, y), me = selUnit();
  if (mode && mode.type === 'found') {
    const ok = R.setBuildFoundation(s, 0, mode.builderId, x, y, mode.spec); mode = null;
    say(ok ? `Foundation ordered at (${x},${y}).` : 'Rejected: the builder must end next to a free square, and you must afford it (a lair needs Dragonlore).', !ok); return render();
  }
  if (me && me.owner === 0 && UNITS[me.type].flying && t && !u) { const ok = R.setFlight(s, 0, me.id, t.id); say(ok ? `Dragon #${me.id} will fly to the tower at (${x},${y}).${t.garrison ? ' The unit inside will be crushed.' : ''}` : 'The Dragon cannot land there: the tower needs height 3+, must not be Arcane, and must not hold a friend or another Dragon.', !ok); return render(); }
  if (me && me.owner === 0) {                                      // order the selected unit
    if (u && u.owner !== 0) { const ok = R.planAttack(s, 0, me.id, u.id, false); say(ok ? `#${me.id} will strike #${u.id}.` : `#${me.id} cannot get #${u.id} into reach this year (melee: adjacent and not a tower garrison; ranged: range and a clear line).`, !ok); return render(); }
    if (t && t.owner !== 0) {
      if (UNITS[me.type].siege) { const ok = R.planAttack(s, 0, me.id, t.id, true); say(ok ? `Siege order on tower #${t.id}.` : 'Out of range or no clear line — and a siege engine may not move.', !ok); return render(); }
      if (t.garrison) { const ok = R.planAttack(s, 0, me.id, t.garrison.id, false); say(ok ? `#${me.id} will strike the garrison.` : 'Only ranged units can hit a garrison.', !ok); return render(); }
      const ok = R.setMove(s, 0, me.id, x, y); say(ok ? 'Moving to seize the empty tower.' : 'Cannot seize that tower (needs a level, an infantry/archer/mage that can climb, and reach).', !ok); return render();
    }
    if (!u && !(t && t.owner !== 0)) { const ok = R.setMove(s, 0, me.id, x, y); if (ok) { say(`#${me.id} → (${x},${y}).`); return render(); } }
  }
  if (pick && pick.kind === 'tower') return select({ kind: 'tower', id: pick.id });
  if (t && !u) return select({ kind: 'tower', id: t.id });
  if (u) return select({ kind: 'unit', id: u.id });
  if (t) return select({ kind: 'tower', id: t.id });
  say('Not reachable. Blue squares are where the selected unit can go this year.', !!me); select(me && me.owner === 0 ? sel : null);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const a = b.dataset.act, t = selTower(), u = selUnit();
  if (a === 'disband' && u) { R.setDisband(s, 0, u.id); say(`#${u.id} will be disbanded at the start of the year.`); }
  else if (a === 'clearunit' && u) { R.clearUnitOrders(s, 0, u.id); say('Orders cleared.'); }
  else if (a === 'found' && u) { mode = { type: 'found', builderId: u.id, spec: $('spec').value }; return say(`Click a free square next to #${u.id} (or next to where it is ordered to move) to lay the ${mode.spec} foundation.`); }
  else if (a === 'level' && t) { const ok = R.setBuildLevel(s, 0, t.id, b.dataset.r === '1'); say(ok ? 'Level ordered.' : 'Rejected: affordable? one order per tower per year; max 5 levels (more with 3 attached towers).', !ok); }
  else if (a === 'convert' && t) { const ok = R.setConvert(s, 0, t.id); say(ok ? 'Conversion to an Arcane Tower ordered.' : 'Rejected: needs 2 Soul + 2 Aether + 2 Ember, a finished (non-fortress, non-lair) tower with no recruit in progress.', !ok); }
  else if (a === 'recruit' && t) { const ok = R.setRecruit(s, 0, t.id, b.dataset.type); say(ok ? `${UNITS[b.dataset.type].name} ordered.` : 'Rejected: queue full or unaffordable.', !ok); }
  else if (a === 'selgar' && t && t.garrison) return select({ kind: 'unit', id: t.garrison.id });
  else if (a === 'research') { const ok = R.setResearch(s, 0, b.dataset.tech); say(ok ? 'Research ordered.' : 'Rejected.', !ok); }
  else if (a === 'cancel') R.cancelOrder(s, 0, b.dataset.kind, +b.dataset.i);
  else if (a === 'undisband') s.orders[0].disband = s.orders[0].disband.filter((x) => x !== +b.dataset.uid);
  else if (a === 'cancelmove') delete s.orders[0].moves[b.dataset.uid];
  render();
});
$('dl').onclick = downloadLog;
$('clearall').onclick = () => { R.clearOrders(s, 0); say('All orders cleared.'); render(); };
let busy = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function endYear() {                                           // END TURN: your orders resolve now; then every other seat takes its turn, one after another, like chess
  if (s.winner !== null || busy || s.turn !== 0) return;
  busy = true; document.activeElement && document.activeElement.blur && document.activeElement.blur();
  const before = s.log.length, yr = { round: s.round, seat: 0, budget: Object.fromEntries(RES_ALL.map((k) => [k, s.pl[0][k]])), orders: JSON.parse(JSON.stringify(s.orders[0])) };
  R.resolveTurn(s); sel = null; info = null; mode = null; render();
  while (s.winner === null && s.turn !== 0 && s.alive[0]) {
    const p = s.turn; say(`Seat ${p + 1} (${NAME[p]}) is playing…`); await sleep(350);
    planYear(s, p); const b2 = s.log.length; R.resolveTurn(s); render(); await sleep(550);
  }
  while (s.winner === null && !s.alive[0]) { planYear(s, s.turn); R.resolveTurn(s); }            // you are out: the others finish the game
  yr.events = s.log.slice(before).map((l) => l.msg); rec.years.push(yr); persist();
  say(s.winner !== null ? 'Game over.' : `Round ${s.round}: your turn.`); busy = false; render();
}
$('end').onclick = endYear;
addEventListener('keydown', (e) => {
  // Enter ends the year ONCE: ignore key auto-repeat, and let a focused button/select handle its own Enter (it used to fire twice per press)
  if (e.key === 'Enter') { if (busy) return; if (e.repeat || ['BUTTON', 'SELECT', 'INPUT'].includes(document.activeElement.tagName)) return; e.preventDefault(); endYear(); }
  if (e.key === 'Escape') { sel = null; info = null; mode = null; render(); }
});

const fort0 = R.towerById(s, s.fortress[0]);
const view = await createView(s, $('c'), { onHover, onClick: onCell, onFocus: () => view.focus(fort0.x, fort0.y), onFocusPlayer: (p) => { const f = R.towerById(s, s.fortress[p]); if (f) view.focus(f.x, f.y); } });
view.focus(fort0.x, fort0.y);
persist(); render();
// card art needs the 3D models; load in the background and degrade silently if WebGL or a model is unavailable
import('./modelLib.js').then(async (m) => { await m.loadLibrary(); cardsApi = await import('./cards.js'); cardsApi.injectCardCSS(); render(); }).catch(() => {});
window.__tg = { s, R, view, select, endYear, get sel() { return sel; } };
