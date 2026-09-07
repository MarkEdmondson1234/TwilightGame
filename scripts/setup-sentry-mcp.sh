#!/usr/bin/env bash
# Setup Sentry MCP access for Claude Code and Pi (setup-sentry-mcp skill).
#
# Reads SENTRY_ACCESS_TOKEN (env var, or prompts — input hidden), then:
#   1. verifies the token against the Sentry API
#   2. writes ./.mcp.json with a literal token (gitignored, mode 600)
#   3. registers the token via `launchctl setenv` on macOS (GUI-launched hosts)
#   4. appends an export to ~/.zshenv if not already present
#
# The token is never printed. Re-run with FORCE=1 to overwrite an existing
# .mcp.json (e.g. after rotating the token).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MCP_JSON="$ROOT/.mcp.json"

if [[ -f "$MCP_JSON" ]] && grep -q "sntryu_\|\$env:" "$MCP_JSON" && [[ "${FORCE:-0}" != "1" ]]; then
  echo "✅ .mcp.json already has a Sentry entry — nothing to do."
  echo "   Re-run with FORCE=1 to overwrite (e.g. after rotating the token)."
  exit 0
fi

TOKEN="${SENTRY_ACCESS_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "SENTRY_ACCESS_TOKEN not set — paste your Sentry user token (input hidden)."
  echo "Create one at: sentry.io → Settings → Auth Tokens (scopes: org:read, project:read, event:read, issue:read)."
  read -rs -p "Token: " TOKEN
  echo ""
fi
if [[ ! "$TOKEN" =~ ^[A-Za-z0-9_-]{20,}$ ]]; then
  echo "❌ That doesn't look like a Sentry token (expected a long sntryu_… string, no spaces). Aborting." >&2
  exit 1
fi

# Best-effort verification so a typo doesn't cost you a restart cycle.
CODE="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" https://sentry.io/api/0/organizations/ || echo 000)"
case "$CODE" in
  200) echo "✅ Token verified against the Sentry API" ;;
  401) echo "❌ Sentry rejected this token (401) — check that it wasn't truncated and has the right scopes." >&2; exit 1 ;;
  *)   echo "⚠️  Could not verify token (HTTP $CODE) — continuing anyway (offline?)." ;;
esac

# 1. Local MCP config with the literal token — the most reliable auth path:
#    works identically in Claude Code and Pi regardless of how the host was launched.
umask 077
cat > "$MCP_JSON" <<EOF
{
  "mcpServers": {
    "sentry": {
      "url": "https://mcp.sentry.dev/mcp",
      "headers": {
        "Authorization": "Sentry-Bearer $TOKEN"
      }
    }
  }
}
EOF
chmod 600 "$MCP_JSON"
echo "✅ Wrote $MCP_JSON (mode 600, gitignored)"

# 2. macOS: make the token visible to GUI/launchd-launched agent hosts too,
#    so a future switch to the \$env: placeholder in .mcp.json would also work.
if [[ "$(uname)" == "Darwin" ]]; then
  launchctl setenv SENTRY_ACCESS_TOKEN "$TOKEN"
  echo "✅ launchctl setenv SENTRY_ACCESS_TOKEN (note: resets on logout/reboot —"
  echo "   the literal token in .mcp.json doesn't depend on it, so this is just a fallback)"
fi

# 3. Persist for shell-launched hosts (~/.zshenv), unless it's already there.
ZSHENV="$HOME/.zshenv"
if [[ -f "$ZSHENV" ]] && grep -qF "SENTRY_ACCESS_TOKEN=" "$ZSHENV"; then
  echo "ℹ️  ~/.zshenv already references SENTRY_ACCESS_TOKEN — left unchanged."
else
  {
    echo ""
    echo "# Sentry MCP token for Claude Code / Pi (setup-sentry-mcp skill) — never commit"
    echo "export SENTRY_ACCESS_TOKEN=\"$TOKEN\""
  } >> "$ZSHENV"
  echo "✅ Added export to ~/.zshenv"
fi

echo ""
echo "Done. Next steps:"
echo "  1. FULLY restart your agent host (Claude Code / Pi) — MCP config is only read at startup."
echo "  2. Verify:  claude mcp list | grep sentry   (expect '✔ Connected')"
echo "     or ask the agent to 'list my Sentry organizations' (expect: twilightgame)."
echo "  Troubleshooting: .claude/skills/setup-sentry-mcp/SKILL.md"