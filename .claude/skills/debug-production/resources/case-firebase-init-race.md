# Case study: sign-in, cloud saves and multiplayer all dead, nothing thrown

September 2026. Two players on the same deployed build. One could sign in, the
other got "Firebase not initialized - call initializeFirebase() first" every
time, and neither could see the other in the shared farm.

Worth reading not for the bug but for how much of the first hour went into
theories that the evidence then killed.

## Theories that were wrong

Each was plausible, and each would have been reported as a diagnosis if nobody
had checked:

- *"Their browser blocks IndexedDB"* — `enableIndexedDbPersistence` is awaited
  during init, so a hang there looked like a candidate. It is wrapped in its own
  try/catch, and `auth` is assigned before it. Dead.
- *"The `VITE_FIREBASE_DATABASE_URL` secret was never set"* — the deployed
  console literally says `[Presence] Realtime Database not configured`. The
  bundle contains the URL. That message is printed by the *other* branch of the
  condition; Vite had collapsed the clause that would have distinguished them.
- *"They're both signed into the same account"* — would genuinely cause
  invisibility (own-uid filter), but did not explain the sign-in failure.
- *"The RTDB rules were never deployed"* — permission-denied writes were indeed
  invisible, but that was a second latent problem, not this one.

## What the evidence actually said

Running the live site in headless Chrome, the startup log contained **none** of
the four possible outcomes of `safeInitializeFirebase()` — not success, not
"not configured", not "package not installed", not "initialization failed" —
and yet startup carried on into `[GlobalEventManager] Initialised`, which
follows it. A function with four logged exits had taken a fifth.

The fifth exit was `if (!mod) return null`.

## The bug

```ts
let firebaseModule = null;
let loadAttempted = false;

async function loadFirebase() {
  if (loadAttempted) return firebaseModule;   // <- still null while in flight
  loadAttempted = true;
  firebaseModule = await import('./index');
  return firebaseModule;
}
```

Two callers race at startup: `useMultiplayerController` calls
`whenFirebaseSettled()` from an effect on mount, and `initializeGameAssets` then
calls `safeInitializeFirebase()`. The controller wins, sets the flag, and starts
a ~200 KB chunk download. The initialiser arrives, sees the flag, and is handed
`firebaseModule` — still `null` — so it returns without initialising anything
and without a word.

`auth` therefore stayed null and every auth path threw. Whether a given player
hit it came down to who won a race against a chunk download, which is why one
of the two could sign in.

`getRealtimeDb()` had the same shape independently: `if (initAttempted) return
null` was evaluated the moment a shared map loaded, before Firebase was up, and
latched "no multiplayer" for the session.

## Lessons

1. **Share the in-flight promise, never a "started" boolean.** The boolean is
   correct only if nobody asks during the flight, which is exactly when they do.
2. **Enumerate a function's exits and make every one of them log.** The bug was
   located by an exit that logged nothing, not by anything that failed.
3. **A log line names the branch its author expected, not the branch that ran.**
   Check the compiled bundle before trusting a message about configuration.
4. **Silence is a symptom.** Sentry was empty because nothing threw.
