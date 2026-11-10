#!/usr/bin/env bash
# THE TOWER GAME — uninstaller. Removes exactly what install.sh created (listed in the install manifest): the game folder, the
# `tower-game` command, the menu entry and the icon. It also stops the local server. It never touches your browser data.
#
# Usage: ./uninstall.sh [--prefix DIR] [--yes] [--help]       (also reachable as: tower-game uninstall)
set -euo pipefail

DATA="${XDG_DATA_HOME:-$HOME/.local/share}"
PREFIX="$DATA/tower-game"; YES=0; MARK=".tower-game-install"
# when run from inside an install, that install is the target
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; [ -f "$SELF/$MARK" ] && PREFIX="$SELF"
usage() { sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
while [ $# -gt 0 ]; do
  case "$1" in --prefix) PREFIX="$2"; shift 2 ;; -y|--yes) YES=1; shift ;; -h|--help) usage 0 ;; *) echo "unknown option: $1" >&2; usage 2 ;; esac
done
say() { printf '%s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

case "$PREFIX" in /|"$HOME"|"$HOME/"|"") die "refusing to remove '$PREFIX'" ;; esac
[ -f "$PREFIX/$MARK" ] || die "'$PREFIX' is not a Tower Game install (no $MARK found) — nothing removed. Use --prefix if you installed elsewhere."

PORT=$(sed -n 's/^PORT=//p' "$PREFIX/$MARK" | head -1); FILES=(); while IFS= read -r l; do FILES+=("$l"); done < <(sed -n 's/^FILE=//p' "$PREFIX/$MARK")
say "This will remove:"; say "  $PREFIX  (the game folder)"; for f in "${FILES[@]}"; do [ -e "$f" ] && say "  $f"; done
if [ "$YES" != 1 ]; then read -r -p "Remove The Tower Game? [y/N] " a; case "$a" in y|Y|yes|YES) ;; *) say "cancelled."; exit 1 ;; esac; fi

# stop the local server, if it is ours
RUN="${XDG_RUNTIME_DIR:-/tmp}"; PIDF="$RUN/tower-game-${PORT:-8000}.pid"
if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then kill "$(cat "$PIDF")" 2>/dev/null || true; fi; rm -f "$PIDF" "$RUN/tower-game-${PORT:-8000}.log"

# remove only files that still carry our marker (never a different file that happens to have the same name)
for f in "${FILES[@]}"; do
  [ -e "$f" ] || continue
  case "$f" in
    *tower-game.svg) rm -f "$f" ;;
    *) if grep -q "tower-game launcher (installed by\|installed by The Tower Game" "$f" 2>/dev/null; then rm -f "$f"; else say "  skipped $f (not created by the installer)"; fi ;;
  esac
done
command -v update-desktop-database >/dev/null && update-desktop-database "$DATA/applications" >/dev/null 2>&1 || true
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q -t "$DATA/icons/hicolor" >/dev/null 2>&1 || true

# finally the game folder (this script may be running from inside it — bash has already read it; the delete is the last step)
rm -rf "${PREFIX:?}"
say "The Tower Game has been removed."
