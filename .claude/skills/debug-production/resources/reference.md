# Reference

Longer-form material for the `debug-production` skill.

- [case-firebase-init-race.md](case-firebase-init-race.md) — a worked example:
  sign-in, cloud saves and multiplayer all dead, no exception anywhere, found by
  reading the deployed bundle.

## Where the evidence lives

| Question | Where to look |
|---|---|
| Did a real player hit an error? | Sentry, via the MCP server (Claude Code: `claude mcp list`; Pi: ask the agent to list organizations) |
| What does the deployed build log? | `scripts/probe-live.mjs` |
| Was a build secret set? | `scripts/fetch-bundle.sh` — Vite inlines `VITE_*` |
| Which commit is live? | `VITE_APP_VERSION` (set to `github.sha` in `deploy.yml`) |
| Are the Firebase rules deployed? | `.github/workflows/firebase.yml` run history |

## Sentry categories

`utils/errorReporting.ts` tags every event with one of:
`auth`, `sync`, `shared_farm`, `presence`, `game_crash`.

Add a category rather than overloading an existing one — the tag is what makes
the dashboard filterable.

## Suppressed at the client (deliberate)

`initErrorReporting()` drops two families before they ever reach Sentry:
`AbortError` (cancelled in-flight requests) and the transient network-death
family — "Failed to fetch" (Chrome), "Load failed" (Safari), "NetworkError when
attempting to fetch resource" (Firefox), "FetchEvent.respondWith …" (service
worker). They arrive frameless and carry no URL or feature — untriageable —
and were burying real issues. When debugging connectivity, read the live
console via `probe-live.mjs` or the feature's own catch-block warnings instead
(see the rationale comment in `utils/errorReporting.ts`).

## Session logs (the Logs dataset)

`utils/sessionDiagnostics.ts` ships bounded, metadata-only lifecycle telemetry
via `Sentry.logger.info` — query it with `search_events(dataset='logs')`, not
the errors dataset. Two gotchas: logs filter by **`severity:`** (`level:` is an
invalid attribute there) and every entry carries `game.session_id` + `game.map`
attributes, so you can reconstruct one player's session minute by minute.

| Message | Meaning | Useful attributes |
|---|---|---|
| `game.session_start` | Player opened the game | — |
| `game.renderer_ready` | Pixi renderer up — session reached playability | — |
| `game.performance` | One-minute window summary | fps / worst-frame / stall fields |
| `game.operation` | One completion per operation/outcome/speed per minute | `operation.name` (map_transition, map_load, texture_batch, local_save, cloud_upload, cloud_download), `operation.duration_ms`, `operation.success`, `operation.slow`, `operation.background_interrupted` |

Everything is info-severity by design (360 logs max per session, no gameplay
payloads); warnings and errors arrive through `reportError()`/`reportMessage()`
as issues instead. A session missing `renderer_ready` after `session_start` is
a startup hang that never threw — exactly the failure mode Step 2's markers
probe for.

## Not set up yet

- **Performance tracing and session replay.** Deliberately off — separate quota,
  and replay records gameplay. See the Sentry section of `CLAUDE.md`.

## Recently changed

- **Source map upload is live.** `@sentry/vite-plugin` uploads maps from CI when
  `SENTRY_AUTH_TOKEN` is set, so production stack traces show real `file.ts:line`
  frames and a GitHub permalink. Caveat: errors caught in app code and passed to
  `reportError()` can still arrive frameless — triage those from the culprit
  line and the `details` context (see the SKILL.md caveat).
