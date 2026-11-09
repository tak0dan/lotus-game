# The Tower Game

`The_Tower_Game_Rulebook_v1.0.md` — the designer's rulebook v1.0 (Ukrainian). It is the mechanical base of this project.

- How it is implemented: `src/rules.js`; every number lives in `src/balance.js`; the `[DECISION]` comments mark where the engine fills a gap the rulebook leaves open.
- What was tested and found: `docs/exploits.md`, `docs/playtest-1-raw/`.
- Rulebook hooks that are still open: §9.3 (cavalry/siege cannot climb towers "without a special structure or a corresponding property" — not implemented), the victory conditions beyond "capture the main fortress", and the "open questions" table in Part XII.
