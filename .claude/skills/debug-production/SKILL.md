---
name: debug-production
description: Debug bugs that only happen in the deployed game — a player reports something that works fine locally, or two players see different behaviour. Use when someone says "it works on my machine", "X is broken on the live site", "we're both online but can't see each other", "check Sentry", "she can sign in and I can't", "can you see what error they got", or reports any failure you cannot reproduce with `make dev`. Also use before blaming a player's browser, network, ad blocker or account for a bug you have not actually observed.
---

# Debug Production

## Quick Start

```bash
claude mcp list | grep sentry                                    # 1. real player errors
node .claude/skills/debug-production/scripts/probe-live.mjs      # 2. what the live build logs
.claude/skills/debug-production/scripts/fetch-bundle.sh 'apiKey' # 3. what actually shipped
```

## When to Use

A player reports something you cannot reproduce with `make dev`; two players on
the same build behave differently; someone asks you to check Sentry; or you are
about to blame a browser, ad blocker, network or account for a bug you have not
observed yourself.

## Workflow

Bugs that only appear in the deployed build are a different job from local
debugging. You cannot add a `console.log` and reload, and the most dangerous
ones make no noise at all — a function returns early, nothing throws, Sentry
stays empty, and the symptom lands three subsystems away from the cause.

The method below is evidence-first. Gather what the deployed build actually
does *before* forming a theory, because the plausible-sounding theory ("their
browser blocks IndexedDB", "the secret must be missing") is usually wrong and
costs an hour.

## Step 0 — Pin down what you are debugging

Ask, or work out from the report:

- **Which build?** `VITE_APP_VERSION` is set to the commit SHA by
  `.github/workflows/deploy.yml`. Sentry tags events with it.
- **Everyone or one person?** A bug that hits one player of two is usually a
  race or a cached artefact, not a config difference — the config is baked into
  a bundle they both downloaded.
- **What exact words?** "It says Firebase not initialised" is a searchable
  string that leads straight to the throw site. A paraphrase is not.

## Step 1 — Look in Sentry first

Remote error reporting is live (`utils/errorReporting.ts`). Query it through
the **Sentry MCP server**, not the DSN — `VITE_SENTRY_DSN` is a write-only
ingest key and cannot read issues.

```bash
claude mcp list | grep sentry     # expect "✔ Connected"
```

If it says `Needs authentication`, ask the user to run `/mcp` and authorise it;
that OAuth flow cannot be completed for them. If the server is missing:
`claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`.

MCP tools are registered when a session starts, so a server added or authorised
mid-session shows `✔ Connected` while no `mcp__sentry__*` tool exists yet. If
`claude mcp list` is green but the tools are absent, say so and carry on with
steps 2 and 3 — they need a fresh session, and waiting for one is rarely worth
it when the deployed build is right there to interrogate.

**This project's Sentry coordinates** — pass these to every `mcp__sentry__*`
call rather than rediscovering them:

| Parameter | Value |
|---|---|
| `organizationSlug` | `twilightgame` |
| `projectSlug` | `javascript-react` |
| `regionUrl` | `https://de.sentry.io` |

The org is on Sentry's **EU region**. Omitting `regionUrl` can return empty
results or fail outright, which reads exactly like "no errors reported" — do
not mistake a missing region for an all-clear. The web dashboard is at
`https://twilightgame.sentry.io`.

Then look for issues in the relevant category tag — `auth`, `sync`,
`shared_farm`, `presence`, `game_crash` — around the time of the report.

Useful calls, in the order they usually pay off:

```
search_issues(organizationSlug='twilightgame', regionUrl='https://de.sentry.io',
              query='is:unresolved', period='24h')       # what is broken now
get_sentry_resource(resourceType='issue', organizationSlug='twilightgame',
                    resourceId='JAVASCRIPT-REACT-4')     # full detail on one
analyze_issue_with_seer(...)                             # only when stuck
```

`get_sentry_resource` is the one worth reaching for: a single call returns the
stack trace, the `category` tag, the `details` context passed to
`reportError()`, the player's browser/OS/locale/geo, and the **`release` tag**
(the git SHA). Check that SHA with `git branch --contains <sha>` before
debugging — the deployed build is often behind the fix already sitting on a
branch, and the answer is "merge it", not "investigate it".

**An empty Sentry is not an all-clear.** Nothing is reported when a function
returns `null` instead of throwing. Treat silence as "not this kind of bug yet"
and carry on to step 2. Stack traces are also still minified (source-map upload
is not set up), so expect names like `g5()` — step 3 is how you decode them.

## Step 2 — Watch the live site's console yourself

```bash
node .claude/skills/debug-production/scripts/probe-live.mjs
node .claude/skills/debug-production/scripts/probe-live.mjs --filter 'Presence|Multiplayer' --wait 45
node .claude/skills/debug-production/scripts/probe-live.mjs --url http://localhost:4000 --all
```

It loads the deployed game in headless Chrome, deduplicates the console, prints
failed Firebase/Google/Sentry requests — and, most importantly, checks a list of
**startup markers**.

The markers are the whole point. Every one names a step that must log *something*
on any outcome, success or failure. A `MISSING` marker means that step returned
without logging, which is precisely the failure mode that leaves no exception and
no Sentry event. Find the function that owes you that line and work out how it
returned early. Extend `MARKERS` in the script whenever you add a startup step
with mutually exclusive logged outcomes.

Limits: this probe reports console, network and startup markers — it does not
screenshot, so it cannot tell you whether anything *looks* right.

It can, though. The old claim here that "PixiJS never initialises under headless
SwiftShader" is **wrong** and wasted a lot of debugging time. PixiJS starts fine
and the world renders; what stops a naive screenshot is the splash screen
covering the canvas. Click the Play button, wait ~15s, then capture. On a
GPU-less machine add `--enable-unsafe-swiftshader` (probe-live.mjs already does).
See "Comparing rendered output" below.

## Comparing rendered output

When the question is "did this change how the game *looks*", screenshot both
versions and diff them. This settles in minutes what is otherwise an argument.

```bash
# 1. Serve the baseline beside your branch
git worktree add /tmp/base origin/main
ln -s "$PWD/node_modules" /tmp/base/node_modules
(cd /tmp/base && npx vite --port 4001 &)   # branch stays on 4000
```

Then, for each port: load the page, **click the Play button** (the splash covers
the canvas until you do), wait ~15s for textures, and screenshot. Launch Chrome
with `['--no-sandbox', '--enable-unsafe-swiftshader']`.

Diff the two with `sharp`: read both raw, compare per pixel, and write a heatmap
so the differences have a location rather than just a number. A mean absolute
difference under ~1/255 means "identical for review purposes".

**Expect animated NPCs to differ.** They animate on wall-clock time, so two runs
catch them at different frames. That shows up as thin *outlines* in the heatmap —
outlines mean a shifted or re-posed sprite, whereas a genuine quality change
fills the shape. Anything static that lights up is real.

Clean up with `git worktree remove --force /tmp/base`.

## Step 3 — Read what actually shipped

```bash
.claude/skills/debug-production/scripts/fetch-bundle.sh 'databaseURL' 'apiKey'
```

Downloads the deployed chunks and counts matches, so you can answer questions
the source cannot:

- **Was the GitHub secret really set?** Vite inlines every `import.meta.env.VITE_*`
  at build time. If the value is in the bundle, the secret is fine — stop
  suspecting it.
- **Which branch survived?** A truthy inlined string collapses
  `!!import.meta.env.X` to a constant, so `if (!a() || !b())` in the source can
  be `if(!a())` in production. **The log message it prints may therefore name the
  wrong cause.** This is a live trap: `[Presence] Realtime Database not configured`
  is printed by the *`isFirebaseInitialized()`* branch, and reads as a missing URL
  that is in fact present.
- **Is a module duplicated across chunks?** Count a unique string from it in every
  chunk. Two copies means two module-level singletons, and an `init()` that sets
  one while a getter reads the other.

To read minified code around a needle:

```bash
python3 -c "s=open('<dir>/<chunk>.js').read(); i=s.index('<needle>'); print(repr(s[i-600:i+600]))"
```

## Step 4 — The silent-failure checklist

When a step ran but logged nothing, it is almost always one of these:

1. **A boolean guard where a promise belongs.** `if (started) return cached;`
   hands the second concurrent caller a value that is still `null`. This is what
   broke sign-in, cloud saves and multiplayer at once (see
   [resources/case-firebase-init-race.md](resources/case-firebase-init-race.md)).
   Share the in-flight promise, never a "we already started" flag.
2. **A cache that latched a transient answer.** `if (attempted) return null;`
   evaluated once, early, before the thing it depends on was ready — and now
   permanent for the session. Only a real attempt may be final.
3. **Two callers racing at startup.** Anything called from a component effect on
   mount races `initializeGameAssets`. Effects win; async initialisation loses.
4. **A debug flag that is dead code.** `DEBUG.X: import.meta.env.DEV && false`
   never logs anywhere. Check whether the diagnostics you are hoping to read
   could ever have run.
5. **An error swallowed by design.** Grep the failure path for `catch` blocks
   gated behind a debug flag. A publish that fails 5×/second and warns zero
   times is invisible by construction.

## Step 5 — Prove it with a test that fails first

Before fixing, write the test and **watch it fail against the current code** —
temporarily restore the old implementation if you have already changed it. A
production race that cannot be reproduced in a test is a theory, not a diagnosis.

Mock the dynamic import, drive the two callers in the same tick, and assert the
observable that was missing (e.g. "`initializeFirebase` was called once"). See
`tests/firebaseSafeStartup.test.ts` for the shape. Then `make verify`.

## Step 6 — Leave it visible for next time

The fix is half the job; the other half is making sure the next instance of this
announces itself. Prefer, in order:

1. **Log the reason out loud**, not behind a debug flag, once per distinct
   situation so it cannot spam. A user-actionable sentence beats a code:
   `[Multiplayer] Other players will not appear on "farm_area": you are not signed in`.
2. **Report to Sentry** at the source (`reportError(error, category, extra)`),
   once per session for anything in a loop.
3. **Add a startup marker** to `probe-live.mjs` if you added a step with
   mutually exclusive outcomes.
4. **Make the diagnostics reachable in production** — `?debug=multiplayer` and
   `localStorage.twilight_debug` switch `DEBUG.*` on in a deployed build
   (`runtimeDebug()` in `constants.ts`).

## Reporting back

Say what you observed and where, separately from what you concluded. "The live
site logs none of the four possible outcomes of `safeInitializeFirebase()`" is
evidence. "Firebase never initialises" is the conclusion it supports. Keeping
them apart is what stops a plausible theory being repeated as fact.
