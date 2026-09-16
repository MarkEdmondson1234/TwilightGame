# Sprint Plan — NPC Gardens

**Status: Complete.** All 12 tasks implemented; `make verify` green (1,439 tests,
172 files) and `npm run lint` clean of errors. Coverage was rebalanced during
implementation so ~10% holds *per map* (village 3/34, farm_area 12/120), not
just combined — see the design doc for the final patch table.

**Design:** [`NPC_GARDENS.md`](./NPC_GARDENS.md) (approved)
**Goal:** NPC gardeners plant ~10% of public farm tiles (village 34, farm_area 120)
as real shared plots; friendship levels scale the garden to ~80%; dialogue requests
steer what each gardener plants. Global state, deterministic layout, Firebase-optional.

**Verification:** `make verify` after every task; full suite green at the end.

---

## Task 1 — Types & constants
- [ ] `types/farm.ts`: `FarmPlot.plantedByNpc?: string` (gardener npcId).
- [ ] `constants.ts`: `NPC_GARDEN` — patch min/max per gardener, request share curve,
      reclaim grace, harvest yield cap, favourite weight, per-map cap check.
- [ ] `utils/EventBus.ts`: `FRIENDSHIP_LEVEL_CHANGED` event + payload (decouples
      FriendshipManager → NpcGardenManager; no import cycle).

## Task 2 — Gardener data
- [ ] `data/npcGardeners.ts`: roster (npcId, patch map, favourites, requestable
      crops, flavour lines for dialogue nodes + admire).

## Task 3 — FarmManager NPC support
- [ ] `plantNpcPlot(mapId, position, cropId, npcId)`: PLANTED plot with back-dated
      `plantedAtTimestamp` from the caller, `plantedByNpc` marker, marked dirty for
      the shared flush, emits `FARM_PLOT_CHANGED`.
- [ ] `calculatePlotState()`: `plantedByNpc` plots grow to READY, never wilt/die.
- [ ] `harvestCrop()` / `harvestCropWithMode()`: NPC plots cap yield (≤2) and drop
      no seeds; adjusted values flow into `claimSharedHarvest` rollback.

## Task 4 — Marker survives Firestore sync
- [ ] `firebase/communityGardenService.ts`: `plantedByNpc` on `SharedPlotDoc`,
      written by `writePlot`, restored by `docToFarmPlot`.

## Task 5 — Plan service (`firebase/npcGardenService.ts`)
- [ ] Doc per gardener: `{ npcId, gardenLevel, requestedCrop, updatedBy, updatedAt }`.
- [ ] `startListening()` + `onGardensChanged()`; restarts on `onAuthStateChange`
      (auth-retry rule, `tests/sharedWorldAuthRetry` pattern).
- [ ] `reportGardenProgress(npcId, level, crop?)` — transactional max-merge on
      `gardenLevel` (never shrinks), sets `requestedCrop`.
- [ ] Graceful fallback: getters return `null` and callers use local values.

## Task 6 — NpcGardenManager (`utils/NpcGardenManager.ts`)
- [ ] **Target layout** (pure, seeded): per-season tile shuffle per map
      (`createDecisionRandom(mapId:patches, seasonSlot)`), per-gardener prefix
      patches sized by effective level, per-tile crop choice (favourites ~70%,
      in-season shop crops ~30%, request share on the first tiles), back-dated
      staggered `plantedAt`. Winter: no new planting.
- [ ] **Reconcile pass**: plant eligible tiles (empty, or fallow/dead past reclaim
      grace) via `farmManager.plantNpcPlot`; leave player plots and READY NPC
      crops alone; seasonal bed-clearing of out-of-season NPC plots.
- [ ] `setRequest(npcId, cropId)`: plan doc + localStorage fallback
      (`twilight_npc_garden_requests` — fallback-only, deliberately not a
      CharacterData domain; commented in code).
- [ ] Subscriptions: `FRIENDSHIP_LEVEL_CHANGED` → `reportGardenProgress`; plan
      listener + `TIME_CHANGED` → reconcile active map; `setActiveMap()` from App.

## Task 7 — Firestore rules
- [ ] `firestore.rules`: `shared/world/npcGardens/{npcId}` block + `isValidNpcGardenPlan()`
      (npcId whitelist, level 1–9, crop id exists in the crop catalogue list).

## Task 8 — Interactions
- [ ] `utils/interactions/providers/npcGarden.ts` + registry line +
      `'npc_garden_admire'` in `InteractionType`: right-click "Admire" on
      `plantedByNpc` plots naming the gardener; left-click harvest comes free.

## Task 9 — Dialogue & friendship wiring
- [ ] Four gardener files: greeting response + `garden_favour` hub + per-crop
      request nodes (`requiredSeason` filtered, `requiredFriendshipTier`
      acquaintance-gated, stranger variant node).
- [ ] `utils/dialogueHandlers.ts`: intercept `garden_favour_<crop>` → `setRequest`.
- [ ] `utils/FriendshipManager.ts`: emit `FRIENDSHIP_LEVEL_CHANGED` on level-up.

## Task 10 — Startup wiring
- [ ] `utils/gameInitializer.ts`: initialise NpcGardenManager.
- [ ] `App.tsx`: `npcGardenManager.setActiveMap()` next to the shared-farm sync
      start/stop (both call sites).

## Task 11 — Tests (`tests/npcGarden.test.ts`)
Coverage bands (10% / ≤80%, per-map caps), aggregation (max + monotonic +
stacking), determinism (same day/plan ⇒ same layout, no `Math.random()`),
reconciliation rules (eligibility, idempotency, grace, no overwriting player
plots, seasonal clearing), marker round-trip + decay skip + yield cap, favourites
& in-season & request-share scaling, provider behaviour, request fallback
persistence, shared-plot leak guard (inverted: NPC plots ARE shared plots).

## Task 12 — Docs
- [ ] `docs/FARMING.md` section; design doc status → Implemented.