#!/usr/bin/env bash
# THE TOWER GAME — installer (Linux, per-user, no root needed).
#
# What it does: copies the playable files to ~/.local/share/tower-game, adds a `tower-game` command to ~/.local/bin and an
# application-menu entry. Starting it runs a small LOCAL web server (127.0.0.1 only) and opens the game in your web browser.
# Nothing is installed system-wide and nothing leaves your machine. Remove it with ./uninstall.sh (or `tower-game uninstall`).
#
# Usage: ./install.sh [--prefix DIR] [--bin DIR] [--port N] [--no-desktop] [--yes] [--help]
# License: see LICENSE — play, print and build for free; no commercial use; the game runs in a browser from the provided pages.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
PREFIX="$DATA/tower-game"; BIN="$HOME/.local/bin"; PORT=8000; DESKTOP=1; YES=0
MARK=".tower-game-install"

usage() { sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
while [ $# -gt 0 ]; do
  case "$1" in
    --prefix) PREFIX="$2"; shift 2 ;;  --bin) BIN="$2"; shift 2 ;;  --port) PORT="$2"; shift 2 ;;
    --no-desktop) DESKTOP=0; shift ;;  -y|--yes) YES=1; shift ;;   -h|--help) usage 0 ;;
    *) echo "unknown option: $1" >&2; usage 2 ;;
  esac
done
APPS="$DATA/applications"; ICONS="$DATA/icons/hicolor/scalable/apps"
say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = Linux ] || die "this installer is for Linux. On other systems open index.html through any local web server (see README) — the game runs in a browser."
command -v python3 >/dev/null || die "python3 is required (it serves the game locally). Install it with your package manager."
[ -f "$SRC/index.html" ] && [ -f "$SRC/src/rules.js" ] && [ -f "$SRC/tools/serve.py" ] || die "run this from the game's folder (index.html, src/, tools/ not found next to install.sh)"
case "$PORT" in ''|*[!0-9]*) die "--port must be a number" ;; esac
case "$PREFIX" in /|"$HOME"|"$HOME/"|"") die "refusing to use '$PREFIX' as the install folder" ;; esac
if [ -e "$PREFIX" ] && [ ! -f "$PREFIX/$MARK" ]; then die "'$PREFIX' exists and is not a Tower Game install — choose another --prefix"; fi

say "The Tower Game — installing for $USER"
say "  game files  → $PREFIX"
say "  command     → $BIN/tower-game"
[ "$DESKTOP" = 1 ] && say "  menu entry  → $APPS/tower-game.desktop (+ icon)"
say "  local port  → $PORT (127.0.0.1 only)"
if [ "$YES" != 1 ]; then read -r -p "Continue? [y/N] " a; case "$a" in y|Y|yes|YES) ;; *) say "cancelled."; exit 1 ;; esac; fi

# --- copy the playable files (not docs/data/tests/history: those stay in the repository) ---
ITEMS=(index.html play.html cards.html spectate.html src assets vendor tools lore archive LICENSE THIRD_PARTY_NOTICES.md README.md CONTRIBUTING.md)
mkdir -p "$PREFIX"
for it in "${ITEMS[@]}"; do [ -e "$SRC/$it" ] || continue; rm -rf "${PREFIX:?}/$it"; cp -a "$SRC/$it" "$PREFIX/$it"; done
cp "$SRC/uninstall.sh" "$PREFIX/uninstall.sh"; chmod +x "$PREFIX/uninstall.sh"
find "$PREFIX" -name node_modules -prune -exec rm -rf {} + 2>/dev/null || true

# --- launcher ---
mkdir -p "$BIN"
LAUNCH="$BIN/tower-game"
cat > "$LAUNCH" <<LAUNCHER
#!/usr/bin/env bash
# tower-game launcher (installed by The Tower Game's install.sh — remove with: tower-game uninstall)
PREFIX="$PREFIX"; PORT="\${TOWER_GAME_PORT:-$PORT}"
RUN="\${XDG_RUNTIME_DIR:-/tmp}"; PIDF="\$RUN/tower-game-\$PORT.pid"; LOG="\$RUN/tower-game-\$PORT.log"
url="http://localhost:\$PORT/"
alive() { [ -f "\$PIDF" ] && kill -0 "\$(cat "\$PIDF")" 2>/dev/null; }
up() { python3 - "\$PORT" <<'PY' 2>/dev/null
import sys,urllib.request
urllib.request.urlopen("http://127.0.0.1:%s/index.html"%sys.argv[1],timeout=1); 
PY
}
case "\${1:-start}" in
  start|play)
    if ! alive; then
      up && { echo "port \$PORT is already serving something; opening it" >&2; } || { nohup python3 "\$PREFIX/tools/serve.py" "\$PORT" >"\$LOG" 2>&1 & echo \$! >"\$PIDF"; }
      for _ in \$(seq 1 40); do up && break; sleep 0.1; done
    fi
    page="\${2:-}"; [ -n "\$page" ] && url="\$url\$page"
    echo "The Tower Game → \$url   (stop with: tower-game stop)"
    [ -n "\${TOWER_GAME_NO_BROWSER:-}" ] || { xdg-open "\$url" >/dev/null 2>&1 || echo "open \$url in your browser"; } ;;
  stop)   if alive; then kill "\$(cat "\$PIDF")" && rm -f "\$PIDF" && echo stopped; else echo "not running"; fi ;;
  status) if alive; then echo "running: \$url (pid \$(cat "\$PIDF"))"; else echo "not running"; fi ;;
  url)    echo "\$url" ;;
  uninstall) shift; exec "\$PREFIX/uninstall.sh" "\$@" ;;
  *) echo "usage: tower-game [start|stop|status|url|uninstall]   (TOWER_GAME_PORT=N to change the port; start cards.html with: tower-game start cards.html)" ;;
esac
LAUNCHER
chmod +x "$LAUNCH"

# --- menu entry + icon ---
CREATED=("$LAUNCH")
if [ "$DESKTOP" = 1 ]; then
  mkdir -p "$APPS" "$ICONS"
  cp "$SRC/assets/icon.svg" "$ICONS/tower-game.svg"; CREATED+=("$ICONS/tower-game.svg")
  cat > "$APPS/tower-game.desktop" <<DESK
[Desktop Entry]
# installed by The Tower Game's install.sh
Type=Application
Name=The Tower Game
Comment=Tabletop-first strategy game - opens in your web browser
Exec=$LAUNCH start
Icon=tower-game
Terminal=false
Categories=Game;StrategyGame;
Keywords=strategy;towers;board game;
DESK
  CREATED+=("$APPS/tower-game.desktop")
  command -v update-desktop-database >/dev/null && update-desktop-database "$APPS" >/dev/null 2>&1 || true
  command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t "$DATA/icons/hicolor" >/dev/null 2>&1 || true
fi

# --- manifest: exactly what uninstall.sh may remove ---
{ echo "# Tower Game install manifest — do not edit"; echo "PREFIX=$PREFIX"; echo "PORT=$PORT"; for f in "${CREATED[@]}"; do echo "FILE=$f"; done; } > "$PREFIX/$MARK"

say ""
say "Installed. Start it with:  tower-game"
case ":$PATH:" in *":$BIN:"*) ;; *) say "  (note: $BIN is not on your PATH — run $LAUNCH, or use the application menu)";; esac
say "Stop it with: tower-game stop     ·     Remove it with: tower-game uninstall   (or ./uninstall.sh)"
