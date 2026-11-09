# Playtest logs

| Run | What it was | Outcome | Where |
|---|---|---|---|
| **Claude vs Claude (playtest 1)** | two Claude sessions as players on the match server, 500 of each resource, 30×30, year cap 10 | **draw** at year 10; findings in `docs/exploits.md` | `../playtest-1-raw/` (briefs, both `findings.md`, the full match record JSON) |
| **opencode vs opencode (last attempt)** | two sandboxed opencode sessions (`deepseek-v4.1-flash-free` / `mimo-v2.6-flash-free`), staggered, with backoff and model rotation | **never played**: every request got "Free usage limit reached" before the first command; year 1, 0 orders | `opencode-attempt-final/` (session logs, backoff log, server log, briefs, empty findings) |

Earlier opencode attempts (same failure, plus a session-id format error — IDs must start with `ses`, and a single-agent run that reached `rules`/`state` and then timed out on `glm-5.3-flash-free`) were overwritten while iterating; they are described in `docs/design-history/conversation-2026-11-09.md`.

The server also writes one match record per game to `matches/` (git-ignored); the one real match is copied into `playtest-1-raw/`.
