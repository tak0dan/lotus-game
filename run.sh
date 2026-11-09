#!/usr/bin/env bash
# Local launcher: no-cache server + opens the browser. Usage: ./run.sh [port]
PORT="${1:-8000}"; cd "$(dirname "$0")"
python3 tools/serve.py "$PORT" & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT INT TERM
sleep 0.6; (xdg-open "http://localhost:$PORT" || open "http://localhost:$PORT") >/dev/null 2>&1 &
wait $SRV
