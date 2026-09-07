---
name: Setup Sentry MCP
description: One-time setup that lets Claude Code and Pi read production errors from Sentry via the MCP server. Use when someone says "set up Sentry", "Sentry MCP 401/unauthorized", "Sentry not connecting", "can't see Sentry issues in Claude/Pi", "new machine setup", or when debug-production can't query issues because the Sentry server is missing or failing auth.
---

# Setup Sentry MCP

Connect the coding agents (Claude Code **and** Pi — they read the same config)
to Sentry's hosted MCP server at `https://mcp.sentry.dev/mcp`, so production
errors can be queried from chat. The *usage* side — when and how to query
issues — lives in the `debug-production` skill; this skill is only about the
connection.

## How it works

- `./.mcp.json` (**gitignored** — it holds a literal token on configured
  machines) tells the agent gateway to call Sentry with an
  `Authorization: Sentry-Bearer <token>` header. Template: `.mcp.json.example`.
- The token is a Sentry **user auth token** (`sntryu_…`). It is *not* the same
  as `SENTRY_AUTH_TOKEN` used for source-map uploads (`project:releases`
  scope, GitHub Actions secret) — different token, different job. Don't mix
  them up when debugging "why can't I see issues".
- **The config is only read at agent startup.** Editing `.mcp.json` does
  nothing until the host process is fully restarted. Pi additionally caches
  the resolved tool list in `~/.pi/agent/mcp-cache.json` (keyed by a config
  hash), which is also only refreshed on startup. This is the #1 gotcha.

## Step 1 — Create the token (2 min)

1. sentry.io → Settings → Auth Tokens → create a **user auth token**.
2. Scopes: `org:read`, `project:read`, `event:read`, `issue:read` — add
   `issue:write` only if you want to resolve/assign issues from chat.
3. Copy it (shown once, prefix `sntryu_`).

## Step 2 — Run the setup script

```bash
SENTRY_ACCESS_TOKEN=sntryu_… scripts/setup-sentry-mcp.sh
# or run it bare and paste the token when prompted (input hidden)
```

The script verifies the token against the Sentry API, writes `./.mcp.json`
(mode 600, literal token — the most reliable path, identical for every client
and launch mode), sets it via `launchctl setenv` on macOS for GUI-launched
hosts, and appends an export to `~/.zshenv` if not already present. It never
prints the token.

## Step 3 — Restart, then verify

Fully quit and relaunch the agent host (not just `/mcp` reconnect), then:

```bash
claude mcp list | grep sentry        # Claude Code: expect "✔ Connected"
```

For Pi (or a deeper check from either): ask the agent to list Sentry
organizations → expect `twilightgame`; then find projects → expect
`javascript-react`; then search issues → recent issues should appear.

## Manual setup (instead of the script)

1. Put the token in `~/.zshenv`: `export SENTRY_ACCESS_TOKEN=sntryu_…`
2. **macOS GUI caveat:** hosts launched by Finder/launchd never read
   `~/.zshenv`. Add `launchctl setenv SENTRY_ACCESS_TOKEN sntryu_…` (resets on
   reboot — re-run it, or skip the env-var path entirely).
3. `cp .mcp.json.example .mcp.json` and replace the placeholder with either
   the literal token (always works) or a placeholder your client expands:
   Pi gateway: `Sentry-Bearer $env:SENTRY_ACCESS_TOKEN` ·
   Claude Code: `Sentry-Bearer ${SENTRY_ACCESS_TOKEN}`.
4. `chmod 600 .mcp.json`, then restart (Step 3).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 401 on connect, literal token in file | token rotated/revoked, or the edit never loaded | re-run script with `FORCE=1`, then **fully** restart the host |
| 401, using the `$env:` placeholder | host was GUI-launched and never inherited the var from `~/.zshenv` | `launchctl setenv …` + restart, or embed the literal token |
| Config edits have no effect | config is cached at startup | full restart; check `~/.pi/agent/mcp-cache.json` hash changed |
| Connected, but queries come back empty | org is on the **EU region** — raw REST calls need `regionUrl: 'https://de.sentry.io'` | prefer the MCP tools (they handle routing); for raw REST, pass regionUrl |
| Works for a teammate, not you | token lacks scopes | recreate with the scopes from Step 1 |
| "no errors reported" but players are hitting errors | nothing has called `reportError` recently, or DSN unset in that build | see `debug-production` Step 1, not this skill |

## Security rules (do not skip)

- `.mcp.json` is gitignored for a reason — never commit it, and never paste
  the token into chat, issues, PRs or screenshots.
- Keep the token out of anything that ships to the browser (no `VITE_`-style
  inlining — same reasoning as `SENTRY_AUTH_TOKEN` in `.env.example`).
- The token is read-scoped; if it ever leaks, rotate it at Settings → Auth
  Tokens and re-run the script with `FORCE=1`.