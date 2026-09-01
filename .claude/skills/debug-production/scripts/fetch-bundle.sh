#!/usr/bin/env bash
# Download the deployed JS chunks so you can read what actually shipped.
#
# Vite inlines every `import.meta.env.VITE_*` at build time, so the deployed
# bundle is the only place that tells you whether a GitHub Actions secret was
# really set. It also shows which branch of a condition survived: a truthy
# inlined string collapses `!!import.meta.env.X` to a constant, so a two-clause
# `if` in the source can be a one-clause `if` in production — and the log
# message it prints may name the wrong cause.
#
# Usage:
#   fetch-bundle.sh                                   # download chunks only
#   fetch-bundle.sh 'apiKey' 'databaseURL'            # download, then count matches
#   fetch-bundle.sh --url https://example.com/app/ 'Firebase'
set -euo pipefail

URL="https://code.markedmondson.me/TwilightGame/"
OUT="${TMPDIR:-/tmp}/twilight-bundle"

while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --url) URL="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

BASE="${URL%/}/"
mkdir -p "$OUT"
echo "→ $BASE  ->  $OUT"

curl -sS "$BASE" -o "$OUT/index.html"

# Entry chunks referenced by the HTML, then the lazy chunks those import.
# (No mapfile/readarray here: macOS ships bash 3.2.)
chunks=$(grep -oE 'assets/[A-Za-z0-9_.-]+\.js' "$OUT/index.html" | sort -u)
for _pass in 1 2; do
  for chunk in $chunks; do
    name="$(basename "$chunk")"
    [ -s "$OUT/$name" ] && continue
    curl -sS -o "$OUT/$name" "${BASE}assets/$name" && echo "  fetched $name ($(wc -c <"$OUT/$name" | tr -d ' ') bytes)"
  done
  chunks=$(cat "$OUT"/*.js 2>/dev/null |
    grep -oE '"\./[A-Za-z0-9_.-]+\.js"' |
    sed -e 's|^"\./||' -e 's|"$||' |
    sed 's|^|assets/|' | sort -u)
done

if [[ $# -gt 0 ]]; then
  echo
  for pattern in "$@"; do
    echo "--- $pattern ---"
    grep -c "$pattern" "$OUT"/*.js 2>/dev/null | grep -v ':0$' || echo "  (no matches in any chunk)"
  done
  echo
  echo "Read the surrounding minified code with:"
  echo "  python3 -c \"s=open('$OUT/<chunk>.js').read(); i=s.index('<needle>'); print(repr(s[i-600:i+600]))\""
fi
