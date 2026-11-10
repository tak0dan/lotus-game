# Development log — from the Lotus manifesto to The Tower Game

A chronological account of how this project got here: what was built, what the numbers said, what went wrong, and the decisions that shaped it. The complete word-for-word record is `docs/design-history/conversation-2026-11-09.md`. Dates are the session's (2026-11-05 → 2026-11-10).

## Phase 1 — Lotus v1: the manifesto, built literally (Nov 5)
- **Request:** read `lotus_manifesto.txt` (a tabletop game with a D6 turn, sacrifice rituals, three Lotuses) and build a 3D game from it.
- **Built:** a pure rules engine (so it could be tested headlessly), a heuristic AI, a headless simulator, and a Three.js client (procedural models, effects, UI). Verified with a real headless Chrome click-through and screenshots.
- **Decisions (the manifesto leaves many open):** 41×41 board for 2 players, victory = raze every enemy tower, one Lotus of each kind per player, ritual = each reroll is a D6 and a 5 calls a Lotus whose conditions hold.
- **First numbers (20 AI-vs-AI games):** wins 11 / 8 / 1 unfinished, median 49 turns; all three Lotuses appeared.
- **Tooling around it:** `.glb` pipeline (each unit as an editable Blender-ready file, with a viewer and fallback), a no-cache local server, a GitHub Pages workflow.

## Phase 2 — first playtests by the designer, and what they exposed (Nov 5–9)
- **History autosave** was added after the designer played two games in Zen and the first was lost; game 2's log was pasted back and is now `data/lotus-games/game-2-seed-254595623.json` (57 rounds, human won).
- **Reading that log found real bugs:** the ending named the wrong loser; "an Ship / an Cavalry"; moves weren't logged; and the AI **wasted ~20% of its turns**. Root cause: the AI scored "stay put" positively (standing near its own tower), so it always found a "best" action that did nothing and never fell back to summoning. Fixing the scoring dropped idle turns from 269 to 155 per 1,306 (and to zero on rolls of 1–3). A 60-game check showed no first-move advantage (27 / 31 / 2).
- **Designer feedback (the important part):** the map was too small for the movement formulas; Infantry (meant to be slowest, formation-based, like a 40K battalion) crossed 20–25% of the map and killed on the way; Cavalry (long move, short range) was a sniper because "range = Power" had been read literally; and with no in-game explanation only the Leviathan was ever summoned.
- **Response:** board to the manifesto's 75×75, formation movement for Infantry, melee Cavalry, an in-game Codex, ritual odds and recipe progress. Then the designer asked for a more **chess-like, War Chest-style** ruleset instead of formulas.

## Phase 3 — Lotus v2: chess-like (Nov 9)
- **Direction:** keep the skeleton (D6 turn, summon table, ritual, Lotuses), drop Power/HP/damage; fixed movement patterns; a capture removes the piece. Victory: **control points** (towers built on them) + **elimination** (no towers and no infantry). Water Temple and the Lotus-specific wins were deliberately shelved as separate design.
- **Simulator-driven tuning:** the control-point threshold decided game length. CP_WIN 3 (with a strict lead) gave a 46% / 46% split, 92% finishing, median 135 rounds; 4–5 left most games unfinished.
- **A second AI hole found by tracing one stalled game:** armies got stuck on the river bank because the AI used straight-line distance (the island is reachable only over four 1-wide bridges). Replaced with BFS path distance: control towers built per game doubled, captures per game went from ~6 to 21–35.
- **Parametric board:** `?size=` (odd, 75 → 151 → 301) with island/river fixed and the outer zones scaling; verified at 75 and 151 in the browser.
- **Final regenerated data:** `data/simulations/lotus-v2_75x75_30games_seeds7000-7029.json` (50% / 40% / 10% unfinished; median 123 rounds; 26 control-point wins, 1 elimination).

## Phase 4 — pivot to The Tower Game (Nov 9)
- **Decision:** no dice; **The Tower Game** (deterministic, yearly simultaneous orders, physical towers, economy with upkeep, siege-only tower destruction) becomes the base; win by holding the enemy fortress **and** control points; combat = ATK vs DEF as in the rulebook; **economy: yes**. Lotus is archived whole (`archive/lotus-v2-d6/`) and its lore kept (`lore/`, `src/balance.js`).
- **Visual reference:** a screenshot of the war-room miniature table from *Justin and the Knights of Valour* → carved, matte, faceted figurines (slate blue vs rust), towers as stackable open-frame modules. 11 models + **MTG-style unit/tower/order cards** whose art is rendered from the same models.
- **Rules engine, AI, simulator** rewritten around the rulebook; all numbers moved into one file (`src/balance.js`).
- **Balance finding #1:** with the rulebook's upkeep as written (12 gold/year for the starting army vs ~4 income) both sides go bankrupt by year 3 — 49% of units idle, no recruiting. Added a **capital income** (a flagged decision; now 10).
- **Rules finding #2:** enemies contesting one square just stopped forever. The rulebook says a collision occurs, so a clash now makes the two units fight.
- **Result:** the built-in AI is stable but passive — in 30 games × 150 years, **0 finished** (`data/simulations/tower-game_30x30_30games_seeds1-30.json`).

## Phase 5 — dirty-play playtesting (Nov 9–10)
- **Designer principle:** rules should contain deliberate gaps that reward careful reading ("dirty play is a feature"; the Lotus Leviathan needed the inner waters and the Mage Tower — which the first rebuild had silently dropped). Documented, never patched, during a test (`docs/design-philosophy.md`).
- **Harness:** a match server with simultaneous orders and long-polling, a CLI (`tg`) for agents, a brief telling agents to win *and* break the game, a sandbox, and a `--rich` mode (500 of each resource) to make games fast and token-cheap.
- **opencode attempts failed for outside reasons:** a session-id format error (IDs must start with `ses`), then the free tier answering "Free usage limit reached" to every real-size request; tiny prompts worked. A solo agent reached `rules`/`state` then timed out. Logs: `docs/playtest-logs/opencode-attempt-final/`.
- **Claude vs Claude (two sessions, ~3 minutes, ~25 commands each): draw at the year-10 cap.** No game-breaking exploit; verified findings (silent build-order failure, recruit-square denial, pace issues) are in `docs/exploits.md`. A caveat I found myself: my agent-facing rules text had dropped the rulebook's §9.3 "special structure" hint, so the agents could not find any hidden path.

## Phase 6 — reference games, jihui, repository (Nov 10)
- **Four reference games** with rules + sources: the Tower Game, Warhammer 40K (11th edition, June 2026, summarised from secondary sources), War Chest, and **jihui** — the cube game in the Warcraft novel *Vol'jin: Shadows of the Horde*, which looks like the ancestor of the Lotus rules (D6-valued pieces, ritual rerolls, a one-of-six "fireship").
- **Jihui research:** the book scene, then every scene that discusses or uses the game as a metaphor (Tushui vs Huojin balance, "a standstill is the greatest victory", the fireship used for real), plus wiki, quest and Internet Archive checks.
- **Licensing:** after the repo went public, a custom license was added, then revised the same day from "personal use only" (v1.0) to **open-play, non-commercial** (v2.0): play at will in a browser; print rules, cards and 3D models; share and build on it (DLCs allowed, free, same license); nobody but the author may sell anything; no native Windows/macOS builds; the author holds the exclusive commercial publishing right to all contributions and DLCs. History was rewritten once before publishing to remove private folder names from the conversation export, and the cleaned history was published as a fresh repo.
- **Launching:** the stale Lotus client at the repo root could not load against the new engine, so the root became a menu; a **2D playable prototype** (`play.html`) was written on the real rules engine, plus per-user `install.sh` / `uninstall.sh` for Linux (manifest-based, with safety refusals; tested in a sandbox).
- **Repository:** pushed privately to GitHub in stages (code → rulebook → conversation → reference games → jihui → logs and data).

## Mistakes and lessons (mine, kept for honesty)
- **Dropped designed content twice:** the Mage Tower (Lotus rebuild) and the rulebook's §9.3 hint (agent rules text). Rule: ask before removing anything that looks like an unexplained gap.
- **Read an ambiguous formula literally** ("Attack Range = Power" made Cavalry a sniper); and **ran a 41×41 board with 75×75-scale formulas**.
- **Heuristic AI bugs masquerade as balance problems** — twice (the stay-put score, the river bank). Trace one bad game before tuning numbers.
- **A relay of a subagent's claim was wrong** ("foundation vanished") until checked against the match record (it was never built — a silent failure, a better finding).
- **Process hazards:** `pkill -f` patterns that matched my own command line killed the shell more than once; the scratchpad directory vanished mid-session; the free LLM tier cannot carry a multi-year game.
