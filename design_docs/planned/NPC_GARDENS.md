# NPC Gardens — villagers tend the public farming patches

**Status:** Implemented (sprint: [`NPC_GARDENS_SPRINT.md`](./NPC_GARDENS_SPRINT.md))
**Feature:** The public farming areas (village beds, farm-area field) are partly planted
by NPC gardeners. Each gardener has favourite plants; the friendlier the players get
with them, the more of the shared patches they plant. Coverage starts at ~10% and can
reach ~80% when every gardener is befriended to the maximum.

---

## 1. What the player sees

- Roughly **10% of the public farm tiles** always have something growing in them —
  a mix of seedlings, young plants and ready crops, so the village beds and the
  farm-area field never look entirely bare. (`personal_garden` is untouched; it is
  the player's own. There is no greenhouse map.)
- Clicking an NPC-tended plant says who planted it and what they love growing
  ("Old Woman: 'Lovely, isn't it? Lavender's been my favourite these sixty years.'").
- Ready NPC crops **can be harvested — once, by whoever gets there first**, exactly
  like a shared plot. The loser of a photo-finish gets the existing "someone got
  there first" toast, and the gardener quietly replants the tile a couple of days
  later.
- Talking to a gardener NPC offers *"Could you plant something for me?"* — pick a
  crop, and they plant **more of it** in their patch, for everyone.
- **The garden is one shared world object built on the existing shared-farm state.**
  When any player befriends a gardener, that gardener plants more *for everyone*.
  Players can each champion a different NPC — one befriends the Elder, another the
  Old Woman — and the effects stack, growing the communal garden from 10% toward
  80% of the tiles.

## 2. Key design decisions

### 2.1 The garden tiles are already Firestore-controlled global state — verified

This feature modifies **existing** shared state rather than adding a new store:

- `SHARED_FARM_MAP_IDS = {'village', 'farm_area'}` (`constants.ts`) marks exactly the
  public farming maps. `personal_garden` is deliberately not in the set.
- Every non-fallow plot on those maps is written to Firestore
  `shared/farming/plots/{mapId:x:y}` by `FarmManager.flushDirtyPlots()` (10s batch),
  and cleared remotely when it returns to fallow (`clearPlot`).
- `FarmManager.startSharedSync()` listens via `communityGardenService.onPlotsChanged`
  and applies other players' plots locally; plots at positions that are no longer
  `SOIL_FALLOW` are rejected as orphans.
- Harvests on those maps settle through the `claimPlot` transaction (first picker
  wins; a loser's harvest is rolled back with `FARM_HARVEST_CONTESTED`).
- Plot documents already carry attribution: `plantedBy`, `plantedByUid`,
  `claimedBy`.

So the NPC garden **is that state**: NPC plants are real shared `FarmPlot`s in the
existing collection, and everything above (sync, races, rendering, harvest UX)
already works. The only genuinely new global state is four tiny **gardener plan
documents** (below).

### 2.2 The gardener plan — the new global state

One Firestore document per gardener at `shared/world/npcGardens/{npcId}`:

`{ npcId, gardenLevel, requestedCrop, updatedBy, updatedAt }`

- `gardenLevel` = the **highest friendship level any player has reached** with that
  NPC (1–9). Monotonic — it never shrinks, so a new player can never wither the
  garden. Written via a transactional max-merge when any player levels up.
- `requestedCrop` = the most recent request made to that gardener (last writer
  wins — one crop per gardener at a time; the gardener mentions the change in
  dialogue, so a friend's request is visible, not surprising).
- New `firebase/npcGardenService.ts` (mirrors `communityGardenService`:
  `startListening()`, `onGardensChanged()`, `reportGardenProgress()`) plus a
  validated `firestore.rules` block.
- **Fallback, no Firebase:** `gardenLevel` falls back to your own friendship level
  and the request to your locally saved one. The garden looks and behaves
  identically offline; Firebase only merges multiple players' contributions.

### 2.3 Planting is a deterministic target plus a reconciliation pass

The garden has one authoritative layout function, and a gardener process that
nudges reality toward it using the existing plot machinery:

1. **Target layout** — a pure function of `(calendar day seed, mapId, npcId,
   gardenLevel, requestedCrop)` via `utils/seededRandom.ts` (the same trick as
   weather and fairy spawns). For each public map it yields the set of tiles each
   gardener tends, the crop on each, and a **back-dated `plantedAtTimestamp`**
   (deterministic stagger) so the patch shows a mix of growth stages. Nothing here
   is ever stored — every client computes the same target.
2. **Reconciliation pass** — on map entry, day rollover and gardener-plan changes,
   the client compares target vs actual (the plots it already knows from
   FarmManager, including Firestore-synced ones) and **plants real shared plots**
   via FarmManager on target tiles that are eligible:
   - No plot at all → plant (this is how a fresh world reaches its 10%).
   - Fallow and untouched for ≥ 2 game days (`stateChangedAtTimestamp` older than
     the reclaim grace) → the gardener reclaims the bed. A player who harvested an
     NPC crop gets that window to plant the tile themselves; the garden only
     reclaims tiles nobody is using.
   - A plot a player is growing (any non-fallow state) → never touched. Player
     crops always win their tile.
   - Writes are idempotent: every client computes the same crop and the same
     back-dated `plantedAtTimestamp` for a tile, so simultaneous reconciles write
     identical documents. The one genuine race — two players picking the same
     ready crop — is exactly what the existing `claimPlot` transaction settles.
3. **Seasonal bed-clearing** — at season rollover, NPC plots whose crop is no
   longer in season are cleared and replanted with the new season's choice
   (one-time churn, visible and charming). Herbs regrow through their own
   `HERB_COOLDOWN` machinery instead.

This keeps **one source of truth** (the existing plots collection), reuses the
entire shared-farm pipeline, and adds no new per-tile sync.

### 2.4 What changes inside FarmManager (small, deliberate)

NPC plants are normal plots with one optional marker: `FarmPlot.plantedByNpc?:
string` (the gardener's npcId), threaded through `writePlot`/`docToFarmPlot` so it
survives sync. Two behavioural gates, both local and cheap:

- **Never wilt or die:** the decay evaluation in `updateAllPlots()` skips plots
  with `plantedByNpc` (the villagers water them). Without this, an unvisited
  garden would rot into dead crops and death toasts.
- **Modest yield:** harvesting an NPC plot yields `min(crop.harvestYield, 2)` and
  drops **no seeds** — the garden is ambience and snacks, not a seed farm.

Rendering and the harvest interaction need **no changes at all** — TileLayer
already renders plots with growth stages, and the farming provider already
harvests READY plots through the claim transaction.

## 3. The gardeners and their favourites

| NPC (id) | Patch | Favourites (weighted) | Personality in dialogue |
|---|---|---|---|
| `village_elder` | village beds | `radish`, `pea`, `sunflower` | Wise, seasonal advice |
| `village_child` | village beds | `strawberry`, `pumpkin` | Enthusiastic, messy rows |
| `old_woman_knitting` | farm-area field | `lavender`, `mint`, `thyme` (herbs) | Sixty years of gardening |
| `spring_periwinkle` | farm-area field | `melon`, `cucumber` | Spring visitor, misses her garden when away |

All four have `canBefriend: true`. Animals (cow, cat, dog, duck) and the shopkeeper
do not garden. Planting always respects `plantSeasons` via the existing
`getCropsForSeason()`; favourites are weighted ~70%, other in-season shop crops ~30%.

### 3.1 Scaling: 10% baseline → 80% at maximum friendship

Public farm tiles: **village 34, farm_area 120 — 154 tiles**. Each gardener has a
baseline patch size (level 1) and a maximum (level 9), interpolated monotonically:
`tiles(level) = min + round((max − min) × (level − 1) / 8)`. Baseline sums are
~10% *of each map* (village 3/34 = 8.8%, farm_area 12/120 = 10%), not just of
the combined total.

| Gardener | Level 1 | Level 9 | Map cap check |
|---|---|---|---|
| village_elder | 2 | 15 | village: 15 + 12 = 27 of 34 (79%) |
| village_child | 1 | 12 | |
| old_woman_knitting | 7 | 48 | farm_area: 48 + 48 = 96 of 120 (80%) |
| spring_periwinkle | 5 | 48 | |
| **Total** | **15 ≈ 9.7%** | **123 ≈ 79.9%** | |

- Each befriending player pushes *their* gardener up; befriending different NPCs
  stacks (the co-op design).
- Patches grow as a **prefix** of a per-season seeded shuffle of each map's tiles
  (`createDecisionRandom(mapId + ':patches', seasonSlot)`), so befriending an NPC
  extends her patch outward instead of relocating it.
- The **requested crop fills a growing share** of the patch — from about a third
  at low friendship to about three-fifths at high friendship — and the patch itself
  is growing too, so "the friendlier you get, the more they plant of your thing"
  holds twice over. Favourites always fill the remainder.
- All numbers live in `constants.ts` (`NPC_GARDEN`), not inline.

### 3.2 Growth, winter, and the tile lifecycle

- NPC plants never wilt or die; growth stage is computed from the back-dated
  `plantedAtTimestamp` vs the crop's real `growthTime`. No ticking state.
- **Harvest → replant:** the existing claim transaction gives the crop to the
  first picker; the plot reads fallow remotely; after the 2-day reclaim grace the
  next reconciliation pass replants it (deterministically) if nobody claimed the
  tile.
- **Winter:** no new planting (matches the Elder's advice). Herb patches
  (`thyme`/`mint`/`lavender`) go through the real herb states and render
  dormant-but-alive through winter; other NPC plots hold their last planting
  until the spring bed-clearing.

## 4. Dialogue design

Static nodes, in keeping with the existing system — no new machinery:

- Each gardener's `greeting` responses gain **"Could you plant something for me?"**
  → node `garden_favour` (gated `requiredFriendshipTier: 'acquaintance'`; strangers
  get a gentle "ask me when we know each other better" node instead).
- `garden_favour` lists the gardener's **requestable crops** — her favourites plus
  a few common shop crops — as static `DialogueResponse`s with `requiredSeason`
  filters, ending in "Actually, never mind."
- Selecting one routes through a `garden_favour_<crop>` node; `handleDialogueAction`
  intercepts those node ids (same pattern as `handleSeedPickup`) to call
  `npcGardenManager.setRequest(npcId, cropId)`, which reports the request to the
  global plan document. The NPC replies in character and mentions her favourite if
  you asked for something she doesn't grow.
- The favour node reflects the **current global request** ("Last time you asked me
  for tomatoes — they're coming up lovely."), so players see each other's requests.

Dialogue nodes are added to each gardener's own definition file
(`utils/npcs/village/*.ts`), per the per-NPC SSoT; shared flavour lines live in
`data/npcGardeners.ts`.

## 5. Integration points (files)

| File | Change |
|---|---|
| `firebase/npcGardenService.ts` *(new)* | Plan docs under `shared/world/npcGardens`; `startListening()` + `onGardensChanged()` (mirrors `communityGardenService`); `reportGardenProgress(npcId, level, crop?)` does a transactional **max-merge** on `gardenLevel` and sets `requestedCrop`. Graceful no-Firebase fallback to local values. |
| `firestore.rules` | New validated block for `shared/world/npcGardens/{npcId}` (new `isValidNpcGardenPlan()`: npcId whitelist, level 1–9, crop id must exist), following `isValidSharedPlot()`. |
| `utils/NpcGardenManager.ts` *(new)* | The gardener process: target-layout function (pure, seeded), reconciliation pass (map entry / day rollover / plan change) planting eligible tiles via FarmManager, seasonal bed-clearing, request handling. Subscribes to the plan listener; emits `FARM_PLOT_CHANGED` via existing plant paths. |
| `data/npcGardeners.ts` *(new)* | Gardener roster: npcId, patch map, favourites, requestable crops, flavour lines. |
| `firebase/communityGardenService.ts` | `plantedByNpc` field added to `SharedPlotDoc`, `writePlot` and `docToFarmPlot` so the marker survives sync. |
| `types/farm.ts` | `FarmPlot.plantedByNpc?: string`. |
| `utils/farmManager.ts` | Two gates: decay evaluation skips `plantedByNpc` plots; harvest of an NPC plot caps yield (≤2) and drops no seeds. Plant/flush/sync/claim paths otherwise untouched. |
| `utils/CharacterData.ts` | Tiny `npcGarden` domain — offline fallback for your last request per gardener. |
| `constants.ts` | `NPC_GARDEN` constants (patch min/max table, caps, request share, reclaim grace, yield cap, weights). |
| `utils/interactions/providers/npcGarden.ts` *(new)* + `registry.ts` line | "Admire" interaction on NPC-tended tiles (right-click/long-press; left-click harvest comes free from the farming provider). |
| `utils/npcs/village/{villageElder,oldWomanKnitting,springPeriwinkle,villageChild}.ts` | Request dialogue nodes. |
| `utils/dialogueHandlers.ts` | Intercept `garden_favour_*` node ids → `setRequest`. |
| `utils/FriendshipManager.ts` | On friendship level-up (existing announcement point), notify NpcGardenManager so the global plan grows. |
| `utils/gameInitializer.ts` | Initialise NpcGardenManager at startup. |
| `docs/FARMING.md` | Document the system. |

*Explicitly unchanged:* `utils/pixi/TileLayer.ts`, `components/TileRenderer.tsx`
(plots already render), the farming interaction provider (READY plots already
harvest through the claim transaction), and the cloud-save filter (shared-map
plots are already excluded — NPC plants inherit that).

## 6. Tests (new `tests/npcGarden.test.ts`, style of `tests/itemSSoT.test.ts`)

1. **Coverage bands** — level 1: 8–12% of each public map's `SOIL_FALLOW` tiles;
   all four at level 9: 78–80% total, no single map above 80%.
2. **Aggregation** — effective level is the max across players, monotonic (never
   shrinks); befriending different NPCs stacks independently (the co-op case).
3. **Determinism** — same (day, plan) ⇒ identical target tiles, crops and
   `plantedAtTimestamp`s; different days differ; no `Math.random()` anywhere in
   the new module.
4. **Reconciliation** — eligible tiles (empty, or fallow past reclaim grace) get
   planted; player-grown plots are never overwritten; writes are idempotent
   (reconciling twice changes nothing); harvested NPC plots are reclaimed after
   the grace window, not before.
5. **Marker round-trip** — `plantedByNpc` survives `writePlot` → `docToFarmPlot`;
   decay skips NPC plots; NPC harvests cap yield and drop no seeds.
6. **Favourites respected** — each gardener's non-requested tiles are
   majority-favourites; every planted crop is in-season per `canPlantInSeason`;
   the request share grows monotonically with level and respects the caps.
7. **Interactions & dialogue** — NPC tiles offer no till/plant/water (they're
   occupied plots); admire names the right gardener; request dialogue nodes exist
   for all four gardeners and are hidden below acquaintance tier.
8. **Persistence** — the local request fallback round-trips through CharacterData.
9. **Leak guard (inverted)** — NPC plots are ordinary shared plots: they land in
   `shared/farming/plots`, and the shared-map exclusion in `cloudSaveService`
   still keeps them (and all shared plots) out of local saves.

## 7. Edge cases

- Player crops always win their tile; the gardener only ever claims tiles that are
  empty or fallow past the reclaim grace.
- `spring_periwinkle` is only on the map 3 days in 8 — her patch persists while
  she's away (she planted it before leaving).
- Dev `timeOverride` / `TESTING_MODE` respected via TimeManager, like real plots.
- Offline / no Firebase: fully functional; your friendship drives the plan, plots
  are local for the session and self-heal from the target on reload (shared plots
  are already excluded from local saves — existing behaviour).
- Two players request different crops from the same gardener: last request wins;
  both see the change (the gardener mentions it), per the co-op design.
- A request for a crop that goes out of season: the NPC keeps the last in-season
  request until told otherwise; dialogue says so.
- A player who harvests an NPC plot then plants it within the 2-day grace keeps
  the tile while they keep it planted; the gardener only reclaims neglected beds.

## 8. Out of scope (future)

- NPCs visibly walking to their patch and "gardening" (animation).
- Gifting harvests back to the gardener for bonus friendship (gift reactions could
  make this cheap later).
- NPCs reacting if you harvest "their" prize plant.