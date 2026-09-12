# Intermittent iPhone gameplay reloads

Updated 12 September 2026. Device reported by the owner: iPhone, Firefox. The mobile title/startup fixes make the splash recoverable, but the owner clarified that gameplay still occasionally returns to it after roughly a minute at normal browser zoom, while remaining in the village. A map transition is not required. Do not mark the crash resolved.

## Observations

- Sentry shows Firefox iOS sessions on deployed release `ad622b4` at 11:31:18, 11:31:36 and 11:32:42 UTC. The first two reach renderer initialisation. These fresh sessions support the restart report, but do not establish why the browser restarted.
- No matching JavaScript exception or explicit WebGL context-loss report was returned by the queries around these sessions. A killed browser process may never run a final JavaScript handler or upload its last buffered event.
- No new-build performance summary had arrived at investigation time. The existing summary cadence was one minute, anchored to page initialisation rather than Play. That leaves short gameplay sessions poorly observed.
- Numeric measurements are present in older logs. Query them with the exact keys returned by Sentry's attribute endpoint, e.g. `tags[performance.resident_texture_mb,number]`. Bare field names and singular `tag[...]` returned null; those nulls were not evidence that the SDK omitted the numbers. Older-release iPhone samples showed 304 MiB estimated textures and approximately 60 fps. They do not prove the newer crash is caused by memory, nor rule out an iOS-specific memory/GPU problem.
- The local phone fixture loads 175 textures, approximately 299 MiB, for the village. These estimates omit browser, decoded-image, audio and other process memory. Chromium/SwiftShader cannot reproduce the physical iPhone's process budget or driver behaviour.
- Source review found explicit page reloads in the error-boundary buttons, not a timed automatic game reload. This narrows the code paths but is not a diagnosis of an OS kill.

## Diagnostics follow-up

Log `game.world_ready` once after renderer and initial world setup, with current camera/framebuffer dimensions and resident texture estimate. Then request a performance sample on the next visible game frame every 15 seconds for the first minute; return to the normal 60-second cadence afterwards. Anchor this short period to world readiness so waiting on the splash does not consume it.

Preserve the existing session log ceiling, background-gap handling and constant-space frame accounting. No tracing, replay, gameplay content or new player identity fields are added. Tests cover the immediate snapshot, four early windows, later cadence, duplicate readiness calls, background suppression and timer teardown.

After deployment, correlate the owner's next village restart with `game.world_ready`, early `game.performance` samples, operations and any context-loss event on that exact release. Compare resident textures, framebuffer dimensions and frame stalls. If those stay flat and the process still disappears without an event, additional physical-device evidence or a measured mobile memory reduction will be needed; do not claim a root cause from missing events alone.

Attribute discovery reference: [Sentry trace-item attributes API](https://docs.sentry.io/api/discover/list-trace-item-attributes/).
