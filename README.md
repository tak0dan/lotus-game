# THE TOWER GAME  (base)  ·  Lotus lore layer

Current base: **The Tower Game** (rulebook v1.0, `The_Tower_Game_Rulebook_v1.0.md` (not included in this repo)) — deterministic, no dice, year-by-year simultaneous orders, physical towers with levels and garrisons, economy with upkeep,
siege-only tower destruction. The **Lotus** manifesto survives as the lore/world layer (`lore/`, `src/balance.js` LORE) and as an archived build.

## License — please read
**Source-available, personal use only. Not open source.** Full terms in [`LICENSE`](LICENSE); third-party material in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
- ✅ Read and study everything · clone/download it · play the game **locally, in a web browser, from the pages provided here**.
- ✅ Use the **written rules** to build a **physical** copy for yourself and give it away free.
- ❌ Anything else: no reuse in other projects or products, no modifying or republishing, no AI-training use.
- ❌ **No native builds**: the game may not be run outside a browser or outside the provided pages — in particular no Windows or macOS builds, wrappers, installers, launchers or store listings.
- ❌ A physical recreation **may not be sold** or used commercially.
- The author reserves all other rights, including the official tabletop edition and official digital versions on any platform.

**Direction:** the game is **tabletop-first**; a digital version is planned. This repository is the working prototype and the design record, published so it can be inspected.

## Source documents (what this project is built from)
| What | Where |
|---|---|
| **The four reference games** (rules + sources for each): Tower Game, Warhammer 40K, Jihui, War Chest | `reference-games/` |
| **The Tower Game rulebook v1.0** (Ukrainian; the mechanical base) | `reference-games/tower-game/The_Tower_Game_Rulebook_v1.0.md` |
| Jihui (the cube game from the Vol'jin novel), reconstructed rules | `reference-games/jihui/RULES.md` |
| **Lotus manifesto** (world, lore, original Lotus rules) | `lore/lotus_manifesto.txt` |
| Visual reference notes (movie war-room table style) | `reference/style-notes.md` — the screenshot itself is not in the repo |
| Design principle: deliberate rule gaps / "dirty play is a feature" | `docs/design-philosophy.md` |
| Playtest findings + raw reports and match record | `docs/exploits.md`, `docs/playtest-1-raw/` |
| **Development log** (chronological process, numbers, mistakes) | `docs/DEVLOG.md` |
| The full design conversation (redacted) | `docs/design-history/conversation-2026-11-09.md` |
| Data: the designer's played Lotus game, AI-vs-AI simulation results | `data/` |
| Playtest logs (incl. the failed opencode attempts) | `docs/playtest-logs/` |
| The previous Lotus game (D6 / ritual / Lotuses) | `archive/lotus-v2-d6/` |

## Status
| Part | State |
|---|---|
| Rules engine `src/rules.js` | done: economy → recruitment → movement → combat → building → control → end of year; sieges, garrisons, clash fights, upkeep/idle, 3 victory conditions |
| All numbers `src/balance.js` | done; tunable (`TG_TUNE='{"CAPITAL_GOLD":8}' node test/sim.mjs`) |
| Built-in AI `src/ai.js` | works, **passive**: games rarely finish (see Balance) |
| Simulator `test/sim.mjs` | done |
| Cards (units, tower, orders) `cards.html` | done — MTG-style, art rendered from the 3D models, printable 63×88 mm |
| 3D models `assets/models/*.glb` | done: 8 figurines + 3 tower modules, in the style of the movie's war-room table (`reference/style-notes.md`) |
| 3D client for the new game | **not built yet** (old Lotus client is archived); `spectate.html` is a 2D live viewer |
| Agent playtest harness | done: `tools/server.mjs`, `tools/tg.mjs`, `tools/play-match.sh` |

## Run
    ./run.sh                              # static server -> http://localhost:8000/cards.html
    node tools/server.mjs --bot1          # match server (you = player 0 via tools/tg.mjs, AI = player 1); spectate: /spectate.html
    node test/sim.mjs [games] [yearCap] [seed] [size]     # AI-vs-AI statistics
    tools/play-match.sh [yearCap] [seed] [model]          # TWO opencode agents play each other, dirty, and write findings (see below)

## Dirty-play playtests
`tools/play-match.sh` starts a local match server and two sandboxed opencode sessions (`--auto`, but bash limited to `node tg.mjs *`, edits limited to `findings.md`, no access outside the sandbox).
Each agent is briefed (`tools/agent-brief.md`) to win *and* to exploit the rules as hard as it can, read the rules for deliberate gaps, and log every exploit to `findings.md`
(mechanism, exact steps, evidence, severity, intended-looking?). Exploits are **documented, not fixed** — see `docs/design-philosophy.md` and `docs/exploits.md`.
Harness weaknesses are to be reported, never used. Match records land in `matches/` (git-ignored).

## Balance (simulator, 30×30 "Two Fortresses")
Starting economy as the rulebook gives it (12 gold upkeep, little income) is bankrupt by year 3; I added a **capital income** (`CAPITAL_GOLD`, now 10) — [DECISION], tune it.
With it, AI-vs-AI games are stable but stalemate (≈27 kills, ≈2 siege hits per 150 years, no winner) — the heuristic AI is too passive, not necessarily the rules.

## Layout
`src/` rules · balance · ai · models · modelLib · cards · `tools/` server, tg client, agent brief, viewer, exporter · `assets/models/` GLBs · `lore/` manifesto · `docs/` design notes ·
`reference/` visual notes · `archive/lotus-v2-d6/` the previous game (runs at /archive/lotus-v2-d6/) · `test/` simulator · `vendor/` Three.js.
