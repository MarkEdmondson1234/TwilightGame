# Debugging a player session in Sentry

The deployed build must have `VITE_SENTRY_DSN` configured. Diagnostics start
alongside error reporting; no new secret or paid profiling feature is required.
They use Sentry Logs, with automatic tracing and replay still disabled.
Local builds without a DSN do not collect or send session diagnostics.

In the TwilightGame Sentry organization, open **Logs** and select the time of
play. Search for `game.session_start` or `game.performance`, then filter by
`game.session_id` to see one page session. Error events carry the same tag, plus
`game.map`, `graphics.tier`, and the latest device/performance contexts. Each
reload creates a new ID. Existing Sentry release metadata identifies the build.

Log messages:

- `game.session_start`: user agent, reported CPU cores/memory, pixel ratio,
  selected graphics tier, resolution, antialiasing, mipmaps, texture budget and
  texture loading concurrency. Zero cores/memory means the browser did not
  expose the value, not that the device has no memory.
- `game.renderer_ready`: GPU renderer, obtained from the existing game context.
  Browsers can redact or withhold this information.
- `game.performance`: aggregate FPS, worst frame and count of frames over 50 ms
  across the reporting window; visible sprite count, estimated scene/resident
  texture memory, viewport size and JS heap when exposed by the browser.
- `game.operation`: duration, success, slow flag and background-interrupted flag.
  Operations cover map transition preparation (including procedural generation),
  map loading, texture batches, local save serialization/storage, and cloud
  uploads/downloads. Transition preparation is synchronous work, **not** total
  time until every texture appears on screen. Texture batches report separately.
  Transition logs carry the source map; map-load logs carry the destination.

Compare `device.user_agent`, `graphics.renderer`, `graphics.tier`, and memory
across Chromebook/iPhone sessions. Filter operations on
`operation.background_interrupted:false` before comparing durations. A slow
local save is >=50 ms; other operations are marked slow at >=1,000 ms. These
thresholds are diagnostic heuristics, not evidence of a particular root cause.

## Cost and overhead

Frame accumulation is constant-space arithmetic on the existing game loop.
A summary is due once per minute and emitted on the next game frame. It reuses
the existing performance monitor for a scene snapshot once per report. Reporting
on the next frame preserves long stalls even if the timer resumes first.
Hidden-tab intervals and partial windows crossing visibility changes are
excluded. Map changes reset the frame window; at least five seconds of samples
are required. No frames means no performance report.

Operation completions are sampled to one per operation/outcome/speed class per
minute. This preserves the first slow or failed completion even if an earlier
fast operation was reported. There is a hard cap of **360 diagnostic log entries
per page session**, shared by all message types; subsequent diagnostics stop
sending until reload. Normal exception reporting is unaffected. These are sampled
observations, not complete operation counts or an exhaustive session recording.

No names, chat, diary, save contents, asset URLs or player coordinates are added.
Generated map seeds are grouped into a `_generated` map family. IDs are random,
in memory only, and do not identify a device across reloads. The existing opaque
Firebase user association remains; default PII collection remains disabled.
No console-forwarding integration, replay, or browser profiler is enabled.

Tests: `npx vitest run tests/sessionDiagnostics.test.ts tests/errorReporting.test.ts`.
