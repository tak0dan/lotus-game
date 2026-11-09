#!/usr/bin/env bash
# Run a full match between TWO opencode agent sessions on a local Tower Game server, each playing dirty and writing a findings.md.
# usage: tools/play-match.sh [yearCap=12] [seed=1] [model=provider/model] [port=8200]
set -u
CAP="${1:-12}"; SEED="${2:-1}"; MODEL="${3:-}"; PORT="${4:-8200}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; TS="$(date +%Y%m%d-%H%M%S)"; OUT="$ROOT/matches/agent-run-$TS"; mkdir -p "$OUT"
URL="http://localhost:$PORT"
echo "== Tower Game agent match  cap=$CAP seed=$SEED port=$PORT out=$OUT"
node "$ROOT/tools/server.mjs" --port "$PORT" --seed "$SEED" --cap "$CAP" --rich >"$OUT/server.log" 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1.5; echo "   spectate live:  $URL/spectate.html"
for P in 0 1; do
  D="$OUT/p$P"; mkdir -p "$D"; cp "$ROOT/tools/tg.mjs" "$D/"; echo "# Findings — player $((P+1))" > "$D/findings.md"
  [ "$P" = 0 ] && NAME="PLAYER 1 (Slate)" || NAME="PLAYER 2 (Rust)"
  sed -e "s/{{PLAYER_NAME}}/$NAME/g" -e "s/{{YEAR_CAP}}/$CAP/g" "$ROOT/tools/agent-brief.md" > "$D/BRIEF.md"
  cat > "$D/opencode.json" <<'JSON'
{ "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": { "*": "deny", "node tg.mjs *": "allow", "node tg.mjs": "allow" },
    "edit": { "*": "deny", "findings.md": "allow" }, "write": { "*": "deny", "findings.md": "allow" },
    "webfetch": "deny", "external_directory": "deny" } }
JSON
done
over() { curl -s "$URL/api/spectate" | grep -q '"winner":null' && return 1 || return 0; }
MODELS=(${MODEL:-opencode/deepseek-v4.1-flash-free} opencode/mimo-v2.6-flash-free opencode/glm-5.3-flash-free opencode/big-pickle opencode/longcat-2.5-free)
# one opencode run with backoff: if the free tier says "limit reached", wait, then rotate to the next model (same session id, so the game context is kept)
oc() {   # oc <player> <message>
  P=$1; MSG=$2; D="$OUT/p$P"; SID="ses_tg${TS//[^0-9]/}p$P"; cd "$D"; export TG_URL="$URL" TG_PLAYER="$P"
  for try in 1 2 3 4 5 6; do
    M="${MODELS[$(( (P + try - 1) % ${#MODELS[@]} ))]}"; [ "$try" = 1 ] && M="${MODELS[$(( P % ${#MODELS[@]} ))]}"
    timeout 2400 opencode run --auto -s "$SID" -m "$M" --title "Tower Game P$((P+1)) (dirty playtest)" "$MSG" >>"$D/session.log" 2>&1
    tail -3 "$D/session.log" | grep -q "Free usage limit" || return 0
    echo "[$(date +%T)] p$P: limit on $M, backing off 90s and rotating model" >>"$OUT/backoff.log"; sleep 90
  done
}
play() {   # play <player>: brief first; if the session ends before the game does, nudge it (max 10 nudges)
  P=$1; oc "$P" "$(cat "$OUT/p$P/BRIEF.md")"
  for n in $(seq 1 10); do
    over && break
    oc "$P" "The game is NOT over yet. Run: node tg.mjs state — and keep playing (and keep appending to findings.md) until the output says GAME OVER."
  done
}
play 0 & A=$!; sleep 30; play 1 & B=$!      # staggered start: two long briefs at once trips the free-tier rate limit
echo "   agents running (pids $A $B) ..."
wait $A $B
curl -s "$URL/api/spectate" | python3 -c "import sys,json; d=json.load(sys.stdin); print('RESULT: winner=',d['winner'],'|',d['reason'],'| year',d['round'])" | tee "$OUT/result.txt"
cp "$ROOT"/matches/match-*.json "$OUT/" 2>/dev/null
echo "   findings: $OUT/p0/findings.md  $OUT/p1/findings.md"
