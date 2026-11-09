# Data

| File | What |
|---|---|
| `lotus-games/game-2-seed-254595623.json` | the designer's own played Lotus v2 game (human vs AI, 41×41): seed, 57 rounds, winner, full 233-line log, final positions. Game 1 was lost (not persisted). |
| `simulations/tower-game_30x30_30games_seeds1-30.json` | AI-vs-AI statistics for the Tower Game (30 games, year cap 150) with the final code: all 30 unfinished. |
| `simulations/lotus-v2_75x75_30games_seeds7000-7029.json` | AI-vs-AI statistics for the archived Lotus v2 (75×75): 50% / 40% / 10% unfinished, median 123 rounds. |
| `../docs/playtest-1-raw/match-*.json` | the Claude-vs-Claude Tower Game match record (per-year orders, events, resources, units, towers). |

Regenerate: `node test/sim.mjs 30 150 1 30` (Tower Game) · `cd archive/lotus-v2-d6 && node test/sim.mjs 30 400 7000 75` (Lotus v2). The simulations were regenerated on 2026-11-10 with the final code; numbers match those measured during development.
