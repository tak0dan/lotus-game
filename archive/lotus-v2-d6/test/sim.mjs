// Headless AI-vs-AI soak test + balance statistics.  usage: node test/sim.mjs [games=20] [roundCap=400] [startSeed=1000] [boardSize=75]
import * as R from '../src/rules.js';
import { aiTurn, aiPlaceStart } from '../src/ai.js';

const games = +process.argv[2] || 20, cap = +process.argv[3] || 400, seed0 = +process.argv[4] || 1000, size = +process.argv[5] || 75;
const st = { games, size: 0, p0: 0, p1: 0, draw: 0, byControl: 0, byElim: 0, rounds: [], blooms: { leviathan: 0, inquisitor: 0, dragon: 0 }, ritualsTried: 0, ritualsWon: 0,
  captures: 0, shots: 0, razed: 0, idleTurns: 0, turns: 0, cpBuilt: 0, infFormation: [], rollDead: 0, cavChain: 0 };
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const s = R.newGame(seed0 + g, size); st.size = R.N; if (process.env.CPWIN) R.setCpWin(+process.env.CPWIN);
  aiPlaceStart(s, 0); aiPlaceStart(s, 1);
  if (s.mode !== 'idle') throw new Error('setup failed ' + s.mode);
  let guard = 0;
  while (s.winner === null && s.turn < cap && guard++ < cap * 4) {
    const before = s.log.length;
    for (const _ of aiTurn(s)) { /* run to completion */ }
    s.events.length = 0; st.turns++;
    if (s.log.length - before <= 1) st.idleTurns++;
  }
  if (s.winner === 0) st.p0++; else if (s.winner === 1) st.p1++; else st.draw++;
  if (s.winner !== null) { if (/control points/.test(s.winReason)) st.byControl++; else st.byElim++; }
  st.rounds.push(s.turn);
  for (const l of s.log) {
    const m = l.msg;
    if (/sacrifices a/.test(m)) st.ritualsTried++;
    if (/blooms/.test(m)) { st.ritualsWon++; for (const k of Object.keys(st.blooms)) if (m.includes(R.TYPES[k].name)) st.blooms[k]++; }
    if (/ captures /.test(m)) st.captures++; if (/ shoots /.test(m)) st.shots++;
    if (/RAZED/.test(m)) st.razed++; if (/CONTROL POINT claimed/.test(m)) st.cpBuilt++;
    const f = m.match(/formation of (\d+)/); if (f) st.infFormation.push(+f[1]);
  }
}
st.rounds.sort((a, b) => a - b);
const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + '%' : '-');
const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-');
console.log(JSON.stringify({
  board: st.size, games, secs: ((Date.now() - t0) / 1000).toFixed(1),
  wins: { P1_firstMover: pct(st.p0, games), P2: pct(st.p1, games), unfinished: pct(st.draw, games) },
  endedBy: { controlPoints: st.byControl, elimination: st.byElim },
  rounds: { median: st.rounds[st.rounds.length >> 1], p10: st.rounds[Math.floor(st.rounds.length * 0.1)], p90: st.rounds[Math.floor(st.rounds.length * 0.9)] },
  ritual: { tried: st.ritualsTried, lotusCreated: st.ritualsWon, successRate: pct(st.ritualsWon, st.ritualsTried), blooms: st.blooms },
  perGame: { captures: (st.captures / games).toFixed(1), shots: (st.shots / games).toFixed(1), towersRazed: (st.razed / games).toFixed(1), controlTowersBuilt: (st.cpBuilt / games).toFixed(1) },
  idleTurnRate: pct(st.idleTurns, st.turns), avgFormationSize: avg(st.infFormation),
}, null, 1));
