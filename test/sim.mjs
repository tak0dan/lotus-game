// Headless AI-vs-AI soak test + balance statistics for THE TOWER GAME.
// usage: node test/sim.mjs [games=20] [yearCap=120] [startSeed=1] [boardSize=30]
import * as R from '../src/rules.js';
import { planYear } from '../src/ai.js';
const games = +process.argv[2] || 20, cap = +process.argv[3] || 120, seed0 = +process.argv[4] || 1, size = +process.argv[5] || 30;
const st = { p0: 0, p1: 0, none: 0, why: { fortress: 0, points: 0, elimination: 0 }, years: [], kills: 0, levelsLost: 0, sieges: 0, towersBuilt: 0, idle: 0, unitYears: 0, recruits: 0, gold: [], armies: [] };
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const s = R.newGame({ size, seed: seed0 + g });
  while (s.winner === null && s.round <= cap) {
    planYear(s, 0); planYear(s, 1); R.resolveYear(s);
    for (const u of s.units) { st.unitYears++; if (u.idle) st.idle++; }
    if (s.round % 20 === 0) st.armies.push(s.units.length);
  }
  if (s.winner === 0) st.p0++; else if (s.winner === 1) st.p1++; else st.none++;
  if (s.winner !== null) st.why[/fortress/.test(s.winReason) ? 'fortress' : /majority/.test(s.winReason) ? 'points' : 'elimination']++;
  st.years.push(s.round); st.kills += s.stats.kills[0] + s.stats.kills[1]; st.levelsLost += s.stats.levelsLost; st.sieges += s.stats.sieges;
  st.towersBuilt += s.log.filter((l) => /lays a/.test(l.msg)).length; st.recruits += s.log.filter((l) => /orders /.test(l.msg)).length;
  st.gold.push(s.pl[0].gold + s.pl[1].gold);
}
st.years.sort((a, b) => a - b);
const pct = (n) => (100 * n / games).toFixed(0) + '%', avg = (a) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
console.log(JSON.stringify({ board: size, games, secs: ((Date.now() - t0) / 1000).toFixed(1), wins: { P1_first: pct(st.p0), P2: pct(st.p1), unfinished: pct(st.none) }, endedBy: st.why,
  years: { median: st.years[st.years.length >> 1], p10: st.years[Math.floor(games * 0.1)], p90: st.years[Math.floor(games * 0.9)] },
  perGame: { kills: (st.kills / games).toFixed(1), siegeHits: (st.sieges / games).toFixed(1), levelsLost: (st.levelsLost / games).toFixed(1), foundations: (st.towersBuilt / games).toFixed(1), recruitOrders: (st.recruits / games).toFixed(1) },
  idleUnitYears: (100 * st.idle / Math.max(1, st.unitYears)).toFixed(1) + '%', armySizeEvery20y: avg(st.armies), avgGoldLeft: avg(st.gold) }, null, 1));
