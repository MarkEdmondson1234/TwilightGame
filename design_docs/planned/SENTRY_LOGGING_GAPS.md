# Sentry Logging Gaps — Targeted Additions

**Status**: Implemented
**Scope**: Three additions to the existing Sentry reporting pipeline. This is explicitly
**not** a logging expansion — no console forwarding, no scheduled logs, no new PII.

---

## Why (evidence from the week-one audit)

The existing pipeline works: in the first week of production it caught two real bugs
remotely (the `frameStyle` undefined-field write, the `HighlightLayer.clear` null crash),
and the per-minute performance logs already hold actionable signals — a `village` minute at
41 FPS with 35 stalls, and `shop` textures at 656MB resident. But three blind spots mean
whole classes of failure stay invisible:

1. **Silent data loss.** `CharacterData` — the SSoT persistence API — fails with
   `console.error` only. Diary Firestore writes are swallowed by
   `catch { /* Non-fatal */ }`, painting cloud sync likewise. A player whose saves stop
   working just loses progress and tells nobody.
2. **Self-healing fallbacks that mask bugs.** `CookingManager` silently re-adds missing
   recipes ("Tea was missing! Re-adding it."); `MapManager` falls back to safe spawn
   positions and even logs "player may be stuck!" — to a console nobody reads in
   production. Each paper-over hides an upstream data or authoring bug.
3. **Slow minutes without attribution.** The 41 FPS village minute says *it happened*, not
   *why*. Fields stop at sprite counts; NPC population, weather and remote-player counts
   would identify the cause.

## Design

### A. Once-per-session reporting helpers (`utils/errorReporting.ts`)

`reportErrorOnce(error, category, extra?, key?)` and `reportMessageOnce(...)` — identical
to `reportError`/`reportMessage` except a module-scoped `Set` dedupes by `key` (defaulting
to a stable string derived from the arguments). Lifetime = page session: a page reload
resets it, which is the right cadence — "is this happening at all in production", not
"how often". Same safe-no-op guarantee when the DSN is unset.

Two new `ErrorReportCategory` values:

- `'persistence'` — data durability failures outside the syncManager pipeline (local save
  failures, domain loads, diary/painting durability, save-data integrity self-heals).
- `'map'` — map authoring/integrity problems that survive validation (invalid transition
  spawn targets, no valid spawn at all).

`'sync'` keeps meaning exactly "the syncManager pipeline".

### B. Wiring (the whole feature, site by site)

| Site | Report | Category |
|---|---|---|
| `CharacterData.load` catch | `reportErrorOnce(error, …, { domain, operation: 'load' })` | persistence |
| `CharacterData.save` catch | `…operation: 'save'` | persistence |
| `CharacterData.saveAll` catch | `…operation: 'saveAll'` | persistence |
| `CharacterData` unknown domain (load/save) | `reportMessageOnce('Unknown … domain')` — a union member without a switch case saves nothing | persistence |
| `CookingManager` progress-without-unlock | `reportMessageOnce(…, { recipeId })` — key includes the recipe | persistence |
| `MapManager.loadMap` validation failure | `reportMessageOnce('Map has validation errors', …, { mapId })` | map |
| `MapManager.transitionToMap` invalid spawn fallback | `…, { mapId, x, y }` | map |
| `MapManager.transitionToMap` no valid spawn found | separate key — "player may be stuck" is its own issue | map |
| `diaryService.saveToFirestore` catch | `reportErrorOnce(error, …, { service: 'diary' })` | persistence |
| `paintingImageService.syncPaintingsFromCloud` catch | `…, { service: 'paintings' })` | persistence |

### C. Slow-minute runtime attribution (`utils/sessionDiagnostics.ts`)

- `SLOW_MINUTE_STALLS = 5` — a minute needs ≥5 frames over 50ms to count as slow
  (healthy minutes log 0–1; the observed bad minute had 35).
- `setSlowMinuteContext(getter)` — registration API, so sessionDiagnostics never imports
  game modules (GameState already imports sessionDiagnostics; the cycle would be real).
- When a minute crosses the threshold, the registered getter's fields are merged into
  that minute's summary (log + `game_performance` context). Healthy minutes are unchanged,
  so the cost on the 99% case is zero. Getter failures are swallowed by the existing
  `safely()`.
- New `utils/diagnosticsRuntimeContext.ts` provides the getter:
  `runtime.npc_count`, `runtime.remote_players`, `runtime.weather`, `runtime.season`.
  Registered once from `gameInitializer.ts` — App.tsx untouched.

## What we are deliberately NOT doing

- **No console forwarding.** 324 `console.warn/error` sites exist; piping them wholesale
  recreates the AbortError disaster (85 of the first 87 events were noise that buried the
  one real bug). Sites are chosen by hand for signal.
- **No scheduled or per-frame logging.** Slow-minute context is event-triggered only.
- **No new PII.** Counters and enum names only; metadata-only as before.

## Bounds

Every addition flows through an existing bound: once-per-session keys, the
`MAX_LOGS`/per-minute dedup in session diagnostics, or `captureMessage` grouping. The
per-map `map:` keys self-cap at (number of maps) reports per session in the worst case.

## Tests

- `tests/errorReporting.test.ts` — once-helpers dedupe by key, and stay no-ops unconfigured.
- `tests/sessionDiagnostics.test.ts` — runtime context appears only on slow minutes, never
  on healthy ones, and a throwing getter cannot break the report.
- `tests/persistenceReporting.test.ts` (new) — a `CharacterData` save failure reports once
  per domain (not per failure), and CookingManager's progress-without-unlock self-heal
  reports once.

### Found during design: the tea self-heal is dead code

`CookingManager`'s "tea was missing" re-add can never fire: tea is category `'starter'`
(`data/recipes.ts`) and the starter loop directly above it adds every starter first. Left in
place as a guard against a future reclassification, deliberately **not** wired to Sentry,
and annotated in the code so nobody wires telemetry into unreachable code by mistake.