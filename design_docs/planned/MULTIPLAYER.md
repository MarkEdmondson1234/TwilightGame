# Multiplayer Design — Shared World, Soft Sync

**Status**: **Implemented** — Phases 0–4 built; see the Implementation Notes appendix
**Remaining**: Phase 5 (phrase book, shared decorations, mailbox gifting) — not built
**Feature flag**: `MULTIPLAYER_ENABLED` in `constants.ts` (+ `VITE_MULTIPLAYER_ENABLED`)
**Setup**: set `VITE_FIREBASE_DATABASE_URL` in `.env.local`, then
`firebase deploy --only database` to publish `database.rules.json`. Without the URL the game
runs exactly as single-player.

---

## 1. What we are building

Two to eight players — realistically a family and their friends — inhabit **the same Clover Village
at the same time**. You walk into the village and Sanne's character is already there, watering the
bed you tilled yesterday. She waves. You wave back. You both wander off to forage and meet again by
the pond.

That is the whole ambition. It is a peaceful game and the multiplayer should feel peaceful too:
*presence and traces*, not competition.

### Goals

1. **See each other** — remote players render as animated characters, correctly depth-sorted, with
   name tags, moving smoothly.
2. **Share the spaces that matter** — Clover Village, the farm area, the orchard. The world one
   player changes is the world the others see.
3. **Leave traces** — "Sanne watered your carrots", gifts in a mailbox, shared discoveries.
4. **Communicate safely** — emotes and a closed phrase book. No free-text chat (this game has a
   young audience; see §9).
5. **Degrade to single-player perfectly** — no Firebase, no network, bad Wi-Fi: the game plays
   exactly as it does today.

### Non-goals

- An authoritative game server. There is no server-side simulation and there will not be one.
- Anti-cheat. The threat model is "a nine-year-old with the dev console", and the cost of cheating
  is that they get extra carrots. Rules validate *shape*, not *fairness*.
- Lobbies, matchmaking, friend requests, instancing. One world, everyone in it.
- PvP or contested combat.
- Scale beyond ~20 concurrent players. The design would need a different transport at 100+.

---

## 2. Why this codebase is unusually ready for this

Most of the hard parts of a shared world are already solved here, by accident or by good design.
This is worth stating precisely, because it changes what the work actually is.

| Already true | Where | What it buys us |
|---|---|---|
| **Time is wall-clock derived** — `GAME_START_DATE + Date.now()`, 2 real hours per game day | `utils/TimeManager.ts:62` | Every client already agrees on the hour, day, season and year with **zero synchronisation**. Nothing to build. |
| **Weather is a seeded PRNG** keyed on time-slot index + season | `utils/WeatherManager.ts` | Every client already sees the same rain at the same moment. Guarded by `tests/deterministicWeather.test.ts`. |
| **A shared-world subsystem already ships** — the community garden | `firebase/communityGardenService.ts`, `utils/farmManager.ts` (`startSharedSync`) | The pattern is proven in production: optimistic local write → dirty set → batched flush every 10s → `onSnapshot` for remote changes → echo-suppression grace period. Generalise it; don't reinvent it. |
| **Auth exists, including anonymous** | `firebase/authService.ts:161` | A player can be identified without an account. Anonymous → linked account is already implemented. |
| **A layer that renders N animated characters with depth sorting** | `utils/pixi/NPCLayer.ts` | Remote players are, structurally, *NPCs we do not control*. The renderer barely changes. |
| **EventBus decouples managers from React** | `utils/EventBus.ts` | A `RemotePlayerManager` can drive re-renders exactly like `NPCManager` does. |
| **`firebase/safe.ts` stub pattern** | `firebase/safe.ts` | Multiplayer disables itself when the package or env is missing, with no call-site changes. |
| **Character appearance is one string** | `utils/characterSprites.ts:63` | Sprites resolve to `/assets/{characterId}/base/{dir}_{n}.png`. Replicating a player's look costs **one field**: `characterId`. |

So the remaining work is narrower than "make it multiplayer". It is four things:

1. A **presence transport** (who is here, where are they).
2. A **`RemotePlayerManager`** mirroring `NPCManager`.
3. A **render layer** mirroring `NPCLayer`.
4. A **classification decision** for every other piece of world state (§3) — which is mostly a game
   design question, not an engineering one.

---

## 3. The model: three tiers of state

Everything in the game falls into exactly one of these. Getting each item into the right row is the
single most important design decision in this document.

| Tier | Meaning | Transport | Conflict rule |
|---|---|---|---|
| **Ephemeral** | Only true while you are online: position, facing, current emote | Realtime Database | Last write wins; `onDisconnect()` removes it |
| **Shared durable** | A change one player makes that others must see later | Firestore (existing pattern) | Last-write-wins, plus *claim transactions* for consumables (§8) |
| **Private** | Yours alone; nobody else can observe it | Firestore per-user cloud save (already built) | None — single writer |
| **Derived** | Recomputed identically on every client from time + seeds | **None** | Must stay deterministic (§7) |

### Classification of every subsystem

| System | Tier | Notes |
|---|---|---|
| Player position / direction / animation | Ephemeral | §5 |
| Emote, "is typing a phrase" | Ephemeral | Short TTL |
| Farm plots on `village` + `farm_area` | Shared durable | **Already shared.** Extend with claims (§8) |
| Placed items / decoration on shared maps | Shared durable | Phase 4. Currently `gameState.getPlacedItems(mapId)` is local |
| Community wreath / Yule decorations | Shared durable | Natural co-op showpiece |
| Player mailbox (gifts) | Shared durable | New; write to *recipient's* subcollection |
| World events / discoveries | Shared durable | **Already exists** — `sharedEvents` collection |
| NPC gossip / conversation summaries | Shared durable | **Already exists** — `conversations/{npcId}/summaries` |
| Inventory, gold, stamina | Private | Never replicate. Two players harvesting is not two players sharing a bag |
| Quests, event chains, magic level, cooking book | Private | Each player has their own story. Do not share |
| Friendships with NPCs | Private | Mum can be everyone's mum |
| Photos, paintings | Private, with opt-in share | Paintings already have Firestore storage; a "hang in the village gallery" feature is a Phase 5 idea |
| Foraging, berry bushes, fruit trees, cobwebs, mess piles | **Private (recommended)** | See the design note below |
| Shop stock | Private | Shared stock means the first player online empties the shop. Bad |
| Time, date, season, weather | Derived | Already correct |
| NPC positions and states | Derived | Currently **non-deterministic** — see §7 |
| Procedural `RANDOM_*` maps | Derived, currently **broken for sharing** — see §7 |

**Design note — renewables stay private.** It is tempting to make berry bushes and fruit trees
shared, for "realism". Don't. A shared renewable means whoever logs in first strips the map and
everyone else walks through an empty world. Private renewables mean the world is always generous,
which is the tone this game is going for. Share the things players *build* (farm beds, decorations);
keep the things the world *gives* per-player.

---

## 4. Transport: Realtime Database for presence, Firestore for everything else

We are already on Firestore and it is the right tool for durable shared state. It is the **wrong**
tool for position updates.

Firestore bills per document write. A player publishing position at 5 Hz for a two-hour session is
36,000 writes. The Firestore free tier is 20,000 writes **per day, across the whole project**. One
child playing one afternoon would exhaust it, and paid pricing is ~£0.14 per 100k writes — survivable
but absurd for data with a 200 ms shelf life.

Realtime Database bills by bandwidth and stored bytes, has sub-100 ms fan-out, and — decisively —
has **`onDisconnect()`**, which lets the *server* delete a player's presence node when their socket
drops. Without it, every crashed tab leaves a ghost standing in the village forever, and we would
have to invent a heartbeat-and-reap scheme to clean them up.

**Decision: add Realtime Database alongside Firestore, used only for ephemeral presence.**

New files, following the existing config/safe pattern exactly:

- `firebase/realtimeConfig.ts` — `getFirebaseRtdb()`, reads `VITE_FIREBASE_DATABASE_URL`
- `firebase/index.ts` — export the presence service
- `firebase/safe.ts` — `getPresenceService()` + a stub whose methods are all no-ops

### Presence schema

Keyed by map, so a client only subscribes to the players it can actually see:

```
presence/
  {mapId}/
    {uid}: {
      n:  "Sanne",        // display name, <= 20 chars
      c:  "character2",   // characterId — the whole of appearance
      x:  14.32,          // tile coords, 2dp
      y:  8.91,
      d:  "d",            // direction code: 'u' | 'd' | 'l' | 'r'
      s:  0,              // size tier (-3..3), for potion effects
      ff: false,          // fairy form
      e:  "wave",         // current emote id, or null
      t:  1735689600000   // server timestamp (rules-enforced)
    }
```

`Direction` is a *numeric* enum in `types/core.ts`, so sending the raw value would break every
older client the day somebody reorders that enum. Four bytes of stable single-character codes is a
fair price for not leaving a compatibility landmine in a shared data format.

About 90 bytes per player. `onDisconnect(ref).remove()` is registered immediately after the first
write, so a closed tab, a killed browser or a dead Wi-Fi connection cleans itself up.

**Rooms are map IDs.** A client subscribes to `presence/{currentMapId}` only. Bandwidth therefore
scales with *co-located* players, not total players — which is the property that makes this cheap.

**Private maps are excluded.** `home_interior`, `home_upstairs`, `mums_kitchen`, `personal_garden`
and all `RANDOM_*` maps publish no presence. Define the shared set explicitly in `constants.ts`:

```ts
export const MULTIPLAYER = {
  /** Maps where other players are visible. Everything else is private. */
  SHARED_MAPS: new Set(['village', 'farm_area', 'orchard', 'sea_side', 'magical_lake']),
  PUBLISH_HZ: 5,               // max position writes per second
  MOVE_THRESHOLD_TILES: 0.08,  // don't publish sub-pixel jitter
  HEARTBEAT_MS: 15000,         // republish even when idle, so `t` stays fresh
  STALE_AFTER_MS: 45000,       // evict a remote player we stopped hearing from
  INTERPOLATION_DELAY_MS: 120, // render remote players this far in the past
  SNAP_DISTANCE_TILES: 3,      // teleport instead of lerping beyond this
  EMOTE_DURATION_MS: 3000,
} as const;
```

---

## 5. Presence protocol

### Publishing (local player → RTDB)

Driven from the existing `gameLoop` in `App.tsx`, through the controller hook — not from a timer, so
it stops when the tab is backgrounded:

1. Every frame, compare `playerPosRef.current` to the last published position.
2. Publish if `distance > MOVE_THRESHOLD_TILES` **and** at least `1000 / PUBLISH_HZ` ms have passed.
3. Publish unconditionally on direction change, emote, map change, and every `HEARTBEAT_MS`.
4. On map change: remove the node from the old map, register a fresh `onDisconnect` on the new one.

**Do not publish the animation frame.** Derive the remote walk cycle from distance travelled between
snapshots. This saves a field and, more importantly, makes the animation smooth regardless of packet
timing — the legs move because the character moved, which is always right.

### Subscribing (RTDB → remote players)

`presenceService` attaches `child_added` / `child_changed` / `child_removed` on
`presence/{currentMapId}`, filters out our own uid, and hands raw snapshots to `RemotePlayerManager`.

### Interpolation

Each remote player keeps a small buffer of the last two snapshots. On every game-loop tick we render
their position at `now - INTERPOLATION_DELAY_MS`, linearly interpolating between the bracketing
snapshots. 120 ms of deliberate lag buys completely smooth motion at 5 Hz updates, and nobody can
perceive it on another player's character.

If the gap between consecutive snapshots exceeds `SNAP_DISTANCE_TILES`, snap instead of lerping —
that is a teleport or a map transition, not movement.

The interpolation function must be **pure and exported**, so it can be unit-tested without Firebase:

```ts
// multiplayer/interpolation.ts
export function interpolateAt(
  buffer: PresenceSnapshot[],
  renderTimeMs: number
): { pos: Position; direction: Direction; speed: number } | null
```

---

## 6. Client architecture

Per the golden rule in `App.tsx`'s navigation header: **new system → new hook**. `App.tsx` gains
wiring only.

```
multiplayer/
  types.ts                    RemotePlayer, PresenceSnapshot, EmoteId
  presenceService.ts          Transport only. RTDB read/write/onDisconnect/room switching.
                              Mirrors the shape of firebase/communityGardenService.ts.
  RemotePlayerManager.ts      SSoT for remote players. Mirrors NPCManager:
                              getCurrentMapRemotePlayers(), tick(deltaTime), stale eviction,
                              emits REMOTE_PLAYER_* on the EventBus.
  interpolation.ts            Pure functions. Fully unit-tested.
  emotes.ts                   The closed emote/phrase vocabulary (SSoT, also used by rules).

hooks/
  useMultiplayerController.ts Domain controller. Subscribes on map change, pumps local position
                              out, ticks interpolation from the game loop, returns
                              { remotePlayers, remotePlayerUpdateTrigger, sendEmote }.

utils/pixi/
  RemotePlayerLayer.ts        extends PixiLayer. setDepthContainer() like NPCLayer/PlayerSprite,
                              zIndex = Z_DEPTH_SORTED_BASE + feetY, name-tag text, emote bubble.

components/
  RemotePlayerOverlay.tsx     DOM fallback for USE_PIXI_RENDERER=false + name tags + prompts.
  EmoteWheel.tsx              Radial emote picker (reuse RadialMenu conventions).
```

Plus:

- `utils/EventBus.ts` — `REMOTE_PLAYER_JOINED`, `REMOTE_PLAYER_LEFT`, `REMOTE_PLAYER_MOVED`,
  `REMOTE_PLAYER_EMOTED`, with payload types
- `hooks/useGameEvents.ts` — a `remotePlayerUpdateTrigger`, exactly like `npcUpdateTrigger`
- `constants.ts` — the `MULTIPLAYER` block above, `MULTIPLAYER_ENABLED`, `DEBUG.MULTIPLAYER`
- `zIndex.ts` — `Z_PLAYER_NAME_TAG` in the overlay range if tags are DOM-rendered

### Data flow

```
  local movement (usePlayerMovement)
        │
        ▼
  useMultiplayerController ──throttle──▶ presenceService.publish() ──▶ RTDB
                                                                        │
  RemotePlayerLayer.render() ◀── RemotePlayerManager ◀──child_changed────┘
        ▲                              │
        └──── gameLoop tick ───────────┘  (interpolate, evict stale, emit events)
```

### Failure isolation

A presence failure must **never** touch the game loop. Commit `dec0da7` fixed a splash screen that
blocked game init; the same class of bug is easy to reintroduce here. Rules:

- `presenceService` never throws to callers — it logs and returns `false`, like `writePlot` does.
- `RemotePlayerManager.tick()` is wrapped so an exception cannot break the frame.
- Presence subscription is **not** awaited during map load.

---

## 7. Determinism: the parts that will silently disagree

Three systems are in the "Derived" tier but are not actually deterministic today. Each will produce
visible disagreement between players.

### 7.1 NPC wander (will diverge — must fix)

`NPCManager.updateNPCs` picks directions and durations with `Math.random()` in five places
(`NPCManager.ts:751`, `752`, `762`, `795`, `830`). Alice's deer is by the pond; Bob's is in the
trees. When they say "look at the deer!" they are pointing at nothing.

Three options:

| Option | Cost | Verdict |
|---|---|---|
| **A. Accept it** — NPCs are local scenery | Zero | Cheapest, but kills shared moments. Acceptable for Phase 1 only |
| **B. Seeded wander** — replace `Math.random()` with a PRNG keyed on `(npcId, floor(now / DECISION_INTERVAL_MS))` | ~40 lines in `NPCManager` | **Recommended, and what was built.** Zero bandwidth, testable, and it makes NPC behaviour reproducible for debugging too. See the caveat below — this converges *decisions*, not *positions* |
| **C. Host-authoritative NPCs** — elect the lowest-uid client in the room to publish NPC positions | High | Adds a host-handoff failure mode for a purely cosmetic benefit. No |

Option B follows the pattern `WeatherManager` already uses and that `tests/deterministicWeather.test.ts`
already guards. Same trick, same test shape.

**Caveat, stated plainly because it was overclaimed in the first draft of this document.**
Identical decisions do *not* guarantee identical positions. Every client now picks the same
direction for the same NPC at the same instant, but two clients that started watching an NPC at
different times — or that reached a wall from slightly different places — can still drift apart.
Full convergence would mean expressing the wander as a closed-form function of time (smooth noise
around a base position, evaluated at `now`), which would replace the behaviour of every wandering
NPC wholesale, including its interaction with animated states, `allowedDirections`, `canFly` and
follow behaviour. That is a large, risky rewrite of a working system for a cosmetic benefit. What
is built gets the shared-moment payoff — "look, the deer!" — for a fraction of the risk. Revisit
if drift turns out to be noticeable in practice.

Note that NPC *dialogue* state stays local and should: `isInDialogue` freezes an NPC for the player
talking to them. Two players can both be mid-conversation with Mum, each seeing her attentive. That
is the correct behaviour, not a bug.

`fairyAttractionManager` has two `Math.random()` calls and needs the same treatment; its spawn
condition is already time-and-bluebell keyed, so it is nearly deterministic already.

### 7.2 Procedural maps (currently per-player instances)

`generateRandomForest(seed: number = Date.now())` (`maps/procedural.ts:208`) — every client that
walks into the forest generates a *different forest*. Two players "in the forest together" are in
different worlds with differently-placed lakes, wolves and bears.

Two acceptable answers:

- **Exclude `RANDOM_*` maps from presence** (Phase 1 default — they are already off `SHARED_MAPS`).
- **Make the seed global**: `seed = floor(Date.now() / MS_PER_GAME_DAY) * 1000 + depth`. Everyone
  who enters the forest at depth 2 today gets the same forest, and it reshuffles daily. This is a
  small change with a large payoff and is the recommended Phase 3 follow-up.

The second option also fixes a latent single-player oddity: today, stepping out of the forest and
back in regenerates it entirely.

### 7.3 Add a determinism test file

`tests/determinism.test.ts` — instantiate two `NPCManager`s, tick both with an identical fixed clock,
assert identical positions after N steps. Follow the collect-then-assert style of `tests/itemSSoT.test.ts`.

---

## 8. Contention: the double-harvest problem

There is exactly one genuinely contended action in a peaceful game: **two players harvest the same
crop at the same moment**. Both clients optimistically grant an item and both write `FALLOW`. Two
carrots exist where one grew.

This is **already possible today** on the shared farm — `farmManager` flushes dirty plots on a 10 s
interval with last-write-wins, so the window is up to ten seconds wide. It is a pre-existing bug
that multiplayer will make visible.

### Solution: optimistic grant with claim transaction and silent rollback

```
1. Player clicks harvest.
2. Client grants the item immediately and plays the animation. (Feel is preserved — no round-trip.)
3. Client fires runTransaction() on shared/farming/plots/{plotId}:
     read state; if state === HARVESTABLE → set FALLOW, claimedBy = uid, claimedAt = ts
     else → abort
4. On abort: silently remove the item from inventory, show
   "Sanne got there first!" as a toast, and revert the plot.
```

Blocking on the transaction before granting would be *correct* and would feel awful — a 200 ms stall
on every harvest, in a game whose whole appeal is unhurried tactility. Optimistic-with-rollback puts
the cost entirely on the rare collision.

The `claimedBy` field is also what powers the nice half of this: `"Sanne watered your carrots"`
notifications. `communityGardenService` already writes `plantedBy` / `plantedByUid` — extend, don't
add.

Non-farm contention does not exist, because renewables are private (§3).

---

## 9. Player-to-player interaction, in risk order

This game is played by children. Interaction design here is a safety decision before it is a feature
decision, and the safest system is one where **the vocabulary is closed** — where it is not possible
to say something harmful, rather than possible-but-moderated.

| Tier | Feature | Risk | Phase |
|---|---|---|---|
| 1 | See each other, name tags | Display names are user-set → needs a filter or a generator (§12) | 1 |
| 2 | **Emote wheel** — ~8 fixed emotes (wave, laugh, heart, question, thumbs up, sad, dance, follow-me) | None. Closed vocabulary | 2 |
| 3 | **Phrase book** — ~20 fixed sentences ("Hello!", "Come and see this", "Thank you", "Want to farm together?") | None. Closed vocabulary, and trivially localisable | 5 |
| 4 | **Mailbox gifting** — leave an item for a named player, collected later | Low. Item-only, no text | 4 |
| 5 | Free-text chat | High. Requires moderation, reporting, parental controls | **Not recommended. Do not build.** |

Emotes render through the existing `ThoughtBubbleLayer` / `components/ThoughtBubble.tsx` — the art
and the positioning logic are already there.

The emote and phrase vocabularies live in `multiplayer/emotes.ts` as the single source of truth, and
the **security rules validate against the same list** (§10). A client cannot publish an emote id that
is not in the allowlist, so an inspected-console child cannot make their character say anything.

### Co-op activities worth building on top

- **Community garden** — exists. Surface attribution in the UI so it feels collaborative.
- **Shared Yule / seasonal decorating** — `YuleCelebrationManager`, `SeasonalEventManager` and
  `WreathWorkshopManager` already coordinate world-wide events on a shared clock. A wreath that
  everyone contributes a flower to is a small change with a big feeling.
- **Shared discoveries** — `sharedEvents` already exists and is already read by the gossip system.
  "Mark found the Fairy Queen's ring" appearing in Sanne's NPC dialogue is nearly free.

---

## 10. Security rules

### Realtime Database (`database.rules.json` — new file)

```json
{
  "rules": {
    "presence": {
      "$mapId": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid",
          ".validate": "newData.hasChildren(['n','c','x','y','d','t'])",
          "n":  { ".validate": "newData.isString() && newData.val().length <= 20" },
          "c":  { ".validate": "newData.val() === 'character1' || newData.val() === 'character2'" },
          "x":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 200" },
          "y":  { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 200" },
          "d":  { ".validate": "newData.val() === 'up' || newData.val() === 'down' || newData.val() === 'left' || newData.val() === 'right'" },
          "e":  { ".validate": "newData.val() === null || newData.val() === 'wave' || newData.val() === 'laugh' || newData.val() === 'heart' || newData.val() === 'question' || newData.val() === 'thumbsup' || newData.val() === 'sad' || newData.val() === 'dance' || newData.val() === 'followme'" },
          "t":  { ".validate": "newData.val() === now" },
          "$other": { ".validate": false }
        }
      }
    }
  }
}
```

`"t": newData.val() === now` forces a server timestamp, so stale-eviction cannot be gamed by a
client lying about its clock. `"$other": false` rejects arbitrary extra keys — without it, presence
becomes an unmoderated free-text channel by the back door, which defeats §9 entirely.

The emote allowlist is duplicated here from `multiplayer/emotes.ts`. **Add a test that asserts the
two lists match** — this is exactly the kind of drift `tests/` exists to catch.

### Firestore (`firestore.rules` — extend the existing file)

- `shared/farming/plots/{plotId}` — add `claimedBy` / `claimedAt` to `isValidSharedPlot()`
- `users/{uid}/mailbox/{giftId}` — `allow create: if isAuthenticated()` with validation that the
  item id is a string and quantity is a small positive int; `allow read, delete: if isOwner(uid)`.
  A gift is written by the *sender* into the *recipient's* subcollection, which is the one place
  this design lets a user write outside their own document tree

---

## 11. Cost

Four players, two hours a day, all in the village:

| | Per player | Total/month |
|---|---|---|
| Presence upload | 90 B × 5/s × 7200 s ≈ 3.2 MB/day | ~390 MB |
| Presence download | 3.2 MB × 3 peers ≈ 9.7 MB/day | ~1.2 GB |
| Firestore writes | Unchanged (farm flush every 10 s only when dirty) | Well under free tier |

RTDB free tier is 1 GB stored / 10 GB downloaded per month and 100 simultaneous connections. This
sits comfortably inside it. Storage is negligible — presence nodes are deleted on disconnect.

The design breaks down somewhere around 30–50 concurrent players in one map, where fan-out becomes
quadratic. At that point the answer is interest management (only subscribe to players within N tiles,
via geohash-style bucket keys) — worth noting, not worth building now.

---

## 12. Risks and open questions

| Risk | Mitigation |
|---|---|
| **Display names.** They come from the account `displayName`, which is user-set free text — a hole in the closed-vocabulary safety model of §9 | Generate names from a curated word list (`Brave Otter`, `Quiet Fern`) and let players *pick*, not type. Decide before Phase 1 ships |
| **Same account, two devices.** `syncManager` is last-write-wins; two live sessions on one account will clobber each other's saves | Take a session lock in `users/{uid}/meta/session` at sign-in; warn and go read-only on the second device |
| **NPC divergence noticed before Phase 3** | Ship Phase 1 to a small group who know; or pull §7.1 forward |
| **Only two character sprite sets exist** (`character1`, `character2`) | Everyone looks like one of two people. Fine for family scale; a real limitation later. Tint/palette variation via Pixi `tint` is a cheap partial answer |
| **Interiors.** Should two players be able to stand in the same kitchen? | Recommend private interiors for Phase 1 — the maps are 15×9 and two characters would be in each other's way. Revisit for shops |
| **Testing multiplayer locally** needs two identities | Two browser profiles + two anonymous sign-ins. RTDB emulator (`firebase emulators:start`) for the automated path — `connectFirestoreEmulator` is already wired in `firebase/config.ts:91` |

---

## 13. Phased plan

Each phase is independently shippable behind `MULTIPLAYER_ENABLED` and leaves the game working.

### Phase 0 — Foundations (no visible change)

- `firebase/realtimeConfig.ts`, RTDB env var, `database.rules.json`
- `multiplayer/types.ts`, `multiplayer/emotes.ts`, `multiplayer/interpolation.ts`
- `constants.ts`: `MULTIPLAYER` block, `MULTIPLAYER_ENABLED`, `DEBUG.MULTIPLAYER`
- `firebase/safe.ts`: `getPresenceService()` + stub

**Done when**: `make verify` green, game behaviour byte-identical, stub-parity test passes.

### Phase 1 — Ghosts (the milestone that proves it)

- `multiplayer/presenceService.ts`, `multiplayer/RemotePlayerManager.ts`
- `hooks/useMultiplayerController.ts`, wired into `App.tsx` gameLoop and map-change effect
- `utils/pixi/RemotePlayerLayer.ts` + `components/RemotePlayerOverlay.tsx` (DOM fallback)
- EventBus events + `useGameEvents` trigger

**Done when**: two browser profiles, two anonymous accounts, both in Clover Village — each sees the
other walk, correctly depth-sorted behind and in front of trees, name tag above, and the ghost
disappears within a second of closing the other tab.

### Phase 2 — Presence polish

- Interpolation + walk-cycle-from-speed
- Emote wheel (`components/EmoteWheel.tsx`, keyboard `T`, touch button — **both**, per CLAUDE.md)
- Map-change room switching, stale eviction, heartbeat
- HUD indicator: "2 friends in the village"

### Phase 3 — Determinism

- Seeded NPC wander (§7.1) + `fairyAttractionManager`
- Global daily seed for `RANDOM_*` maps (§7.2)
- `tests/determinism.test.ts`

### Phase 4 — Shared world correctness

- Harvest claim transactions + optimistic rollback (§8)
- `"Sanne watered your carrots"` attribution surfaced in the UI
- Shared placed items / decorations on `SHARED_MAPS`
- Mailbox gifting

### Phase 5 — Optional social

- Phrase book, shared Yule wreath, village painting gallery

---

## 14. Testing

Follow `tests/README.md` conventions — node environment, collect every violation, assert once, and
write the failure message so it says how to fix the problem.

| File | Guards |
|---|---|
| `tests/multiplayerSafeStubs.test.ts` | Every method on the real presence service exists on the stub. Catches the drift that makes the game crash *only* when Firebase is absent |
| `tests/presenceProtocol.test.ts` | Throttle logic, move threshold, heartbeat, stale eviction — against a fake transport. Mirror the `firebase/safe` mocking in `tests/sharedFarmSyncRetry.test.ts` |
| `tests/remotePlayerInterpolation.test.ts` | `interpolateAt()` — pure, no Firebase. Buffer under/overrun, snap threshold, direction selection |
| `tests/determinism.test.ts` | Two `NPCManager` instances + fixed clock ⇒ identical positions |
| `tests/emoteVocabulary.test.ts` | `multiplayer/emotes.ts` and `database.rules.json` list the *same* emote ids. This is the safety-critical one |

Manual: `make dev`, two browser profiles, watch the console with `DEBUG.MULTIPLAYER` on.

---

## 15. Rollback

`MULTIPLAYER_ENABLED = false` in `constants.ts` disables every subscription, publish and render path
at the controller boundary. No other code changes behaviour. Every network call routes through
`firebase/safe.ts`, so an uninstalled `firebase` package or missing `VITE_FIREBASE_DATABASE_URL`
produces a silent, fully-playable single-player game — the same guarantee the cloud-save and
community-garden features already provide.

---

## Appendix: Implementation Notes

What was actually built, and where it differs from the design above.

### Files

**New — transport and state**
| File | Role |
|---|---|
| `firebase/realtimeConfig.ts` | Realtime Database init, keyed on `VITE_FIREBASE_DATABASE_URL` |
| `firebase/presenceService.ts` | Presence transport: rooms, `onDisconnect`, publish, child events |
| `multiplayer/types.ts` | `PresenceWire`, `LocalPresenceState`, `PresenceSample`, `RemotePlayer` |
| `multiplayer/wire.ts` | Pure encode/decode + inbound validation (no Firebase import) |
| `multiplayer/interpolation.ts` | Pure lerp/snap/hold |
| `multiplayer/publishPolicy.ts` | Pure `shouldPublish()` decision |
| `multiplayer/emotes.ts` | The closed vocabulary, SSoT |
| `multiplayer/localEmote.ts` | Your own emote + expiry |
| `multiplayer/RemotePlayerManager.ts` | SSoT for other players; mirrors `NPCManager` |
| `multiplayer/remoteSprites.ts` | Frame/scale/flip resolution, cached per character |
| `utils/seededRandom.ts` | mulberry32 + FNV-1a, for determinism |

**New — UI**
`utils/pixi/RemotePlayerLayer.ts`, `components/RemotePlayerOverlay.tsx` (DOM fallback),
`components/EmoteWheel.tsx`, `components/PresenceIndicator.tsx`,
`hooks/useMultiplayerController.ts`.

**Changed**: `constants.ts` (`MULTIPLAYER` block, flag, `DEBUG.MULTIPLAYER`), `zIndex.ts`,
`utils/EventBus.ts` (4 events), `hooks/useGameEvents.ts`, `hooks/usePixiRenderer.ts`,
`hooks/useKeyboardControls.ts` (T), `components/TouchControls.tsx` (emote button), `App.tsx`
(wiring only), `NPCManager.ts` + `utils/fairyAttractionManager.ts` + `maps/index.ts`
(determinism), `firebase/communityGardenService.ts` (`claimPlot`), `utils/farmManager.ts`
(claim + rollback), `firebase/safe.ts`, `firebase/index.ts`, `database.rules.json`,
`firebase.json`, `.env.example`, `vite-env.d.ts`.

### Decisions taken during implementation

**Positions never touch React.** The design implied a `remotePlayerUpdateTrigger` driving
re-renders. That would have cost a full React render per frame per remote player. Instead
`usePixiRenderer`'s per-frame `updateAnimations()` polls `remotePlayerManager` directly — the same
way it already reads `npcManager` — and the EventBus trigger fires only on **join/leave**, which
is what the HUD actually needs. The DOM fallback drives its own `requestAnimationFrame`, so the
PixiJS path pays nothing for it.

**The transport moved into `firebase/`.** It was first written as `multiplayer/presenceService.ts`,
which statically imported `firebase/database` and so would have crashed a build without the
`firebase` package — exactly the failure `firebase/safe.ts` exists to prevent. It now lives beside
`communityGardenService` and is reached through `getPresenceService()`, resolved once via dynamic
import and cached in a ref for the game loop. `tests/multiplayerSafeStubs.test.ts` guards the
parity, and `PresenceService.#emit` is a true `#private` method rather than a TypeScript `private`
one so it does not appear in that runtime comparison.

**Animation frames are not sent.** The walk cycle is derived from distance travelled between
interpolated positions. One less wire field, and the legs move because the character moved, which
looks right at any update rate.

**Claims are optimistic with silent rollback, and asymmetric.** A *proven* loss (the plot doc
exists and its state has moved on) rolls the harvest back. A network failure or a missing doc keeps
the crop: confiscating something a player legitimately picked is a far worse experience than one
duplicate carrot. Both directions are asserted in `tests/sharedFarmHarvestClaim.test.ts`.

**Procedural maps now use a shared daily seed** (`hash(kind:totalDays:depth)` rather than
`Date.now()`). Besides making forests shareable in principle, this fixes a long-standing
single-player oddity: stepping out of the forest and straight back in used to regenerate it
entirely. They remain off `SHARED_MAPS` for now.

### Verification

`make verify`: 63 files, 654 tests, typecheck clean. `npm run lint`: 0 errors.

Runtime behaviour was compared against a pristine worktree of `main` under headless Chrome
(puppeteer, SwiftShader). Both render identically and produce the same two pre-existing
`src=""` React warnings, so the change is behaviourally inert with multiplayer unconfigured —
which is the default. The multiplayer UI is covered by `tests/multiplayerUI.test.tsx`.

> **Correction (2026-09-02):** this section previously claimed PixiJS does not finish initialising
> under SwiftShader and the world renders black. That is wrong. PixiJS initialises and the world
> renders headlessly; what the probe sees is the splash screen, which covers the canvas until
> "Play" is clicked. On a GPU-less machine Chrome also needs `--enable-unsafe-swiftshader`.

**Not verified end-to-end**: two real browsers, two accounts, seeing each other move. That needs a
Realtime Database instance and `firebase deploy --only database`, which this session did not have.
Everything up to the network boundary is tested.

### Not built (Phase 5 and one Phase 4 item)

- **Mailbox gifting** — needs a Firestore subcollection, security rules for cross-user writes, and
  inventory UI. Deliberately deferred as a feature in its own right.
- **Shared placed items / decorations** on shared maps — `gameState.getPlacedItems()` is still local.
- **Phrase book**, shared Yule wreath, village painting gallery.
- **Display-name generation.** Names still come from the in-game character name, which is free
  text. §12 flags this: a curated adjective-plus-animal generator should land before this is
  shown to anyone outside the family.
- **Session lock** for the same account signed in on two devices at once.
