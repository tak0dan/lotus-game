#!/usr/bin/env node
// THE TOWER GAME — local match server. Authoritative state, simultaneous orders, long-poll lockstep. Agents talk to it through tools/tg.mjs.
// usage: node tools/server.mjs [--port 8200] [--size 30] [--seed 1] [--cap 40] [--bot0] [--bot1]     (--botN = built-in AI plays side N)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as R from '../src/rules.js';
import { UNITS, TECHS } from '../src/balance.js';
import { planYear } from '../src/ai.js';
import { stateText, reachText, rulesText, ordersText, mapText } from './agentview.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const PORT = +arg('port', 8200), SIZE = +arg('size', 30), SEED = +arg('seed', (Math.random() * 1e6) | 0), CAP = +arg('cap', 40), BOTS = [!!arg('bot0', false), !!arg('bot1', false)];
// --rich  => every year both sides have a huge budget (a floor of 500 of everything) so the economy never gates anything: faster, dirtier, fewer tokens.  --res gold=300,iron=300,mana=300 for custom.
const resArg = arg('res', null);
const RES = resArg && resArg !== true ? Object.fromEntries(String(resArg).split(',').map((kv) => { const [k, v] = kv.split('='); return [k, +v]; })) : (arg('rich', false) ? { gold: 500, iron: 500, mana: 500 } : null);
let s, ready, waiters = [], history = [], startedAt;
const matchDir = path.join(ROOT, 'matches'); fs.mkdirSync(matchDir, { recursive: true });
function newMatch(o = {}) { s = R.newGame({ size: o.size || SIZE, seed: o.seed || SEED, res: RES }); ready = [false, false]; history = []; startedAt = new Date().toISOString(); botsPlan(); }
function botsPlan() { for (const p of [0, 1]) if (BOTS[p]) { planYear(s, p); ready[p] = true; } maybeResolve(); }
function maybeResolve() {
  if (s.winner !== null || !(ready[0] && ready[1])) return;
  const orders = JSON.parse(JSON.stringify(s.orders)), before = s.log.length, round = s.round;
  R.resolveYear(s);
  if (s.winner === null && s.round > CAP) { s.winner = -1; s.winReason = `Year cap (${CAP}) reached: draw.`; }
  history.push({ round, orders, log: s.log.slice(before).map((l) => l.msg), res: s.pl.map((p) => ({ gold: p.gold, iron: p.iron, mana: p.mana })), units: s.units.map((u) => `${u.owner}:${u.type}@${u.x},${u.y}${u.z ? '^' : ''}`), towers: s.towers.map((t) => `${t.owner}:${t.fortress ? 'F' : t.spec}@${t.x},${t.y}L${t.levels.length}`) });
  ready = [false, false]; save();
  const w = waiters; waiters = []; for (const f of w) f();
  if (s.winner === null) botsPlan();
}
function save() { try { fs.writeFileSync(path.join(matchDir, `match-${startedAt.replace(/[:.]/g, '-')}.json`), JSON.stringify({ startedAt, seed: s.seed, size: s.N, winner: s.winner, reason: s.winReason, years: s.round - 1, history }, null, 1)); } catch (e) { /* ignore */ } }
newMatch();

const num = (v) => Number(v);
function doOrder(p, cmd, a) {
  if (s.winner !== null) return { ok: false, msg: 'the game is over' };
  if (ready[p]) return { ok: false, msg: 'you already said ready for this year; wait for the year to resolve' };
  const ok = (v, msg, why) => ({ ok: !!v, msg: v ? msg : 'REJECTED — ' + why });
  const unit = R.unitById(s, num(a[0]));
  const uWhy = !unit ? `no unit #${a[0]}` : unit.owner !== p ? `unit #${a[0]} is not yours` : unit.idle ? `unit #${a[0]} is IDLE (unpaid upkeep)` : null;
  switch (cmd) {
    case 'move': { const u = R.unitById(s, num(a[0])); const r = R.setMove(s, p, num(a[0]), num(a[1]), num(a[2])); return ok(r, `ordered #${a[0]} to (${a[1]},${a[2]})`, uWhy || `(${a[1]},${a[2]}) is not reachable within MOV by orthogonal steps (units and tower bases block; towers can only be climbed as the last step, +1 MOV). Use: reach ${a[0]}`); }
    case 'attack': return ok(R.planAttack(s, p, num(a[0]), num(a[1]), false), `unit #${a[0]} will strike unit #${a[1]} (moving first if needed)`, uWhy || (!R.unitById(s, num(a[1])) ? `no enemy unit #${a[1]}` : `unit #${a[0]} cannot get #${a[1]} into reach this year (melee needs an orthogonally adjacent target that is not a tower garrison; ranged needs range+clear line). Use: reach ${a[0]}`));
    case 'siege': return ok(R.planAttack(s, p, num(a[0]), num(a[1]), true), `siege #${a[0]} fires on tower #${a[1]}`, uWhy || (unit && !UNITS[unit.type].siege ? 'only siege engines can attack towers' : `tower #${a[1]} is not an enemy tower within range 5 with a clear line from where the engine STANDS (siege engines may not move and fire)`));
    case 'found': return ok(R.setBuildFoundation(s, p, num(a[0]), num(a[1]), num(a[2]), a[3] || 'outpost'), `foundation (${a[3] || 'outpost'}) at (${a[1]},${a[2]}) by #${a[0]}`, uWhy || 'builder must be INFANTRY, standing (after its planned move) orthogonally next to the target square, which must be empty with no tower; you need the resources (foundation + spec surcharge); lair needs dragonlore; spec must be one of outpost|barracks|stable|range|workshop|arcane|lair');
    case 'level': return ok(R.setBuildLevel(s, p, num(a[0]), a[1] === 'reinforced'), `level ordered on tower #${a[0]}`, 'must be your tower, below 4 levels, one order per tower, and affordable (normal 2i, reinforced 1g+4i)');
    case 'recruit': return ok(R.setRecruit(s, p, num(a[0]), a[1]), `recruit ${a[1]} at tower #${a[0]}`, 'tower must be yours, have a free queue slot, the right specialisation and enough LEVELS for that unit, (dragon needs dragonlore), and you must afford it after your other orders');
    case 'fly': return ok(R.setFlight(s, p, num(a[0]), num(a[1])), `dragon #${a[0]} will fly to tower #${a[1]}`, 'cannot land there (needs a tower of height 3+, not Arcane, no friend/Dragon inside)');
    case 'convert': return ok(R.setConvert(s, p, num(a[0])), `tower #${a[0]} will become an Arcane Tower`, 'cannot convert: needs 2 soul + 2 aether + 2 ember, a finished non-fortress tower, no recruit in progress');
    case 'disband': return ok(R.setDisband(s, p, num(a[0])), `unit #${a[0]} will be dismissed (no upkeep from next year)`, uWhy || 'cannot disband that unit');
    case 'research': return ok(R.setResearch(s, p, a[0]), `research ${a[0]}`, 'unknown tech, already known/ordered, or unaffordable');
    case 'clear': if (a[0]) R.clearUnitOrders(s, p, num(a[0])); else R.clearOrders(s, p); return { ok: true, msg: 'cleared' };
    default: return { ok: false, msg: 'unknown command ' + cmd };
  }
}
const send = (res, code, body, type = 'text/plain; charset=utf-8') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch (e) { r({}); } }); });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), parts = url.pathname.split('/').filter(Boolean);
  try {
    if (parts[0] === 'api') {
      if (parts[1] === 'new') { const b = await readBody(req); newMatch(b); return send(res, 200, 'new match'); }
      if (parts[1] === 'rules') return send(res, 200, rulesText());
      if (parts[1] === 'spectate') return send(res, 200, { N: s.N, round: s.round, winner: s.winner, reason: s.winReason, ready, res: s.res ? Array.from(s.res) : [], points: s.points, pl: s.pl, units: s.units, towers: s.towers.map((t) => ({ ...t, garrison: t.garrison ? t.garrison.id : null })), log: s.log.slice(-25) }, 'application/json');
      if (parts[1] === 'p') {
        const p = num(parts[2]); if (p !== 0 && p !== 1) return send(res, 400, 'player must be 0 or 1');
        if (parts[3] === 'state') return send(res, 200, stateText(s, p, ready, url.searchParams.get('map') === '1'));
        if (parts[3] === 'map') return send(res, 200, mapText(s));
        if (parts[3] === 'orders') return send(res, 200, ordersText(s, p));
        if (parts[3] === 'reach') return send(res, 200, reachText(s, p, num(parts[4])));
        if (parts[3] === 'log') { const n = +(url.searchParams.get('n') || 30); return send(res, 200, s.log.slice(-n).map((l) => `[Y${l.round}] ${l.msg}`).join('\n')); }
        if (parts[3] === 'order') { const b = await readBody(req); return send(res, 200, doOrder(p, b.cmd, b.args || []), 'application/json'); }
        if (parts[3] === 'ready') { if (s.winner !== null) return send(res, 200, 'the game is over'); ready[p] = true; maybeResolve(); return send(res, 200, s.winner !== null ? `GAME OVER: ${s.winReason}` : ready[p] ? 'ready — now run: wait' : `the year resolved immediately; it is now year ${s.round} — read the log and plan again`); }
        if (parts[3] === 'wait') {
          if (s.winner !== null) return send(res, 200, `GAME OVER: ${s.winReason}`);
          if (!ready[p]) return send(res, 200, `it is year ${s.round} and you have NOT said ready yet — plan your orders (state), then ready`);
          const seen = s.round;
          const done = () => send(res, 200, s.winner !== null ? `GAME OVER: ${s.winReason}\n` + s.log.filter((l) => l.round >= seen).slice(-30).map((l) => `[Y${l.round}] ${l.msg}`).join('\n') : `year ${seen} resolved — it is now year ${s.round}. Events of year ${seen}:\n` + (s.log.filter((l) => l.round === seen).map((l) => `  ${l.msg}`).join('\n') || '  (quiet year)'));
          waiters.push(done); setTimeout(() => { const i = waiters.indexOf(done); if (i >= 0) { waiters.splice(i, 1); send(res, 200, 'still waiting for the opponent to finish planning (call wait again)'); } }, 25000); return;
        }
      }
      return send(res, 404, 'unknown api');
    }
    // static files (spectate.html etc.)
    let f = path.join(ROOT, parts.length ? decodeURIComponent(url.pathname) : 'spectate.html');
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return send(res, 404, 'not found');
    send(res, 200, fs.readFileSync(f), MIME[path.extname(f)] || 'application/octet-stream');
  } catch (e) { send(res, 500, 'server error: ' + e.message); }
}).listen(PORT, '127.0.0.1', () => console.log(`Tower Game server on http://localhost:${PORT}  size ${SIZE} seed ${SEED} cap ${CAP} bots ${BOTS} start-res ${RES ? JSON.stringify(RES) : 'default'}  (spectate: http://localhost:${PORT}/spectate.html)`));
