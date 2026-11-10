# THE TOWER GAME  (base)  ·  Lotus lore layer

Current base: **The Tower Game** (rulebook v1.0, `The_Tower_Game_Rulebook_v1.0.md` (not included in this repo)) — deterministic, no dice, year-by-year simultaneous orders, physical towers with levels and garrisons, economy with upkeep,
siege-only tower destruction. The **Lotus** manifesto survives as the lore/world layer (`lore/`, `src/balance.js` LORE) and as an archived build.

## License — please read
**Open to play, print and build on — free forever; only the author sells.** Full terms: [`LICENSE`](LICENSE) (v2.0). Third-party material: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md). Not an open-source license.
- ✅ **Play** at will, free, in a browser from the pages provided here.
- ✅ **Print** the rules, cards and 3D models (e.g. on a 3D printer) and play on a real table; give copies away free.
- ✅ **Share** unmodified copies free · **build** on it: house rules, new content and **DLCs** may be published free under this same license.
- ✅ **Help:** ideas, issues, playtests, pull requests — see [`CONTRIBUTING.md`](CONTRIBUTING.md).
- ❌ **Nobody may sell it or make money from it** — not the game, not printed rules/cards/models, not DLCs, not a service built on it.
- ❌ **No native builds:** the game runs only in a browser from the provided pages — no Windows, macOS, mobile or console builds, wrappers, installers or store listings.
- ⚖️ **The author owns the commercial publishing rights** to the game *and* to every DLC and contribution (contributors keep their copyright and credit). The author plans an official tabletop edition and digital versions.

**Direction:** the game is **tabletop-first**; a digital version is planned. This repository is the working prototype and the design record, kept open so it can be played, printed, studied and improved.

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
| **Playable version** | `play.html` — a **2D prototype** (you vs the AI, real rules engine); `index.html` is the menu. The **3D client is not built yet** (the old Lotus 3D client is archived and still playable) |
| Agent playtest harness | done: `tools/server.mjs`, `tools/tg.mjs`, `tools/play-match.sh` |

## Run
**Play it (browser only — see the license):**

    ./run.sh                    # serves the game on http://localhost:8000 and opens your browser at the menu
    ./install.sh                # optional, Linux: per-user install — adds the `tower-game` command and an application-menu entry
    tower-game                  # start (opens the browser) · tower-game stop · tower-game status · tower-game uninstall
    ./uninstall.sh              # removes exactly what install.sh created (reads its manifest; never touches your browser data)

`install.sh [--prefix DIR] [--bin DIR] [--port N] [--no-desktop] [--yes]` copies only the playable files (no docs/data/tests) to `~/.local/share/tower-game`, runs a **local-only** web server (127.0.0.1) and opens the game in your web browser — it is a convenience launcher, not a native app. On Windows/macOS there is no installer by design (see `LICENSE` §3.2): open the pages through any local web server.

**Tools:**

    node tools/server.mjs --bot1          # match server (you = player 0 via tools/tg.mjs, AI = player 1); watch at /spectate.html
    node test/sim.mjs [games] [yearCap] [seed] [size]     # AI-vs-AI statistics
    tools/play-match.sh [yearCap] [seed] [model]          # two agent sessions play each other, dirty, and write findings (see below)

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
