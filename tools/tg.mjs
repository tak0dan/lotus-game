#!/usr/bin/env node
// tg — command-line client for the Tower Game match server.  env: TG_URL (default http://localhost:8200)  TG_PLAYER (0 or 1)
const URL_ = process.env.TG_URL || 'http://localhost:8200', P = process.env.TG_PLAYER;
const [cmd, ...a] = process.argv.slice(2);
const help = `tg <command>
  rules                          the full rules (read this first)
  state                          year, resources, your units/towers, enemy units/towers, your orders (compact: no map)
  map                            ASCII picture of the board
  reach <unitId>                 where a unit can move + which enemies it could strike
  move <unitId> <x> <y>          move a unit (replaces its previous move)
  attack <unitId> <enemyUnitId>  strike an enemy unit (plans the needed move too)
  siege <unitId> <enemyTowerId>  siege engine fires on a tower (it must NOT move this year)
  found <builderId> <x> <y> <spec>   lay a tower foundation next to the builder (spec: outpost|barracks|stable|range|workshop|arcane|lair)
  level <towerId> [reinforced]   add a tower level
  recruit <towerId> <unitType>   recruit a unit
  research <dragonlore|siegecraft>
  fly <dragonId> <towerId>       a Dragon flies to another tower (height 3+, not Arcane); landing kills the garrison
  convert <towerId>              pour 2 soul + 2 aether + 2 ember into a tower: it becomes an Arcane Tower
  disband <unitId>               dismiss a unit for good (it stops costing upkeep from next year — the way out of a poverty trap)
  clear [unitId]                 cancel orders (one unit, or all)
  orders                         list your orders so far
  ready                          finish planning; the year resolves when both sides are ready
  wait                           block until the year has resolved (repeat if it says still waiting)
  log [n]                        recent events`;
if (!cmd || cmd === 'help') { console.log(help); process.exit(0); }
if (P !== '0' && P !== '1') { console.error('set TG_PLAYER=0 or 1'); process.exit(2); }
const base = `${URL_}/api/p/${P}`;
const get = async (p) => (await fetch(base + p)).text();
const post = async (p, body) => (await fetch(base + p, { method: 'POST', body: JSON.stringify(body) })).json();
try {
  if (cmd === 'rules') console.log(await (await fetch(URL_ + '/api/rules')).text());
  else if (cmd === 'state') console.log(await get('/state'));
  else if (cmd === 'map') console.log(await get('/map'));
  else if (cmd === 'orders') console.log(await get('/orders'));
  else if (cmd === 'reach') console.log(await get('/reach/' + a[0]));
  else if (cmd === 'log') console.log(await get('/log?n=' + (a[0] || 30)));
  else if (cmd === 'ready') console.log(await get('/ready'));
  else if (cmd === 'wait') console.log(await get('/wait'));
  else { const r = await post('/order', { cmd, args: a }); console.log((r.ok ? 'OK: ' : '') + r.msg); }
} catch (e) { console.error('cannot reach the game server at ' + URL_ + ': ' + e.message); process.exit(1); }
