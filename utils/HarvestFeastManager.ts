/**
 * HarvestFeastManager
 *
 * Runs the annual Harvest Feast — a shared community event, unlike the
 * private, per-player Yule celebration (utils/YuleCelebrationManager.ts).
 * Every client runs this exact same deterministic logic off the same
 * TimeManager clock, so the table, the food, the NPC gathering and Elias's
 * closing speech look the same to every player physically present in the
 * village, with almost no new networking:
 *
 * - The table and every food item are ordinary PlacedItems, already synced
 *   across players for free (hooks/useSharedPlacedItemsController.ts).
 * - Which food item disappears next is a deterministic function of the year
 *   (createDecisionRandom, same trick WeatherManager uses) filtered down to
 *   whichever slots are actually occupied; WHEN each disappears is paced from
 *   gameState.harvestFeast.gatherStartedAt — real Date.now() when this client
 *   first saw gathering begin, not a pure calendar formula, precisely so a
 *   dev time-override (TimeManager.setTimeOverride) makes this testable: it
 *   moves the displayed clock without moving Date.now(), so anchoring to the
 *   calendar would never line up with real elapsed time under override.
 * - The one thing that genuinely cannot be derived from currently-live state
 *   is which distinct meals the community has contributed, since individual
 *   dishes get eaten before the event ends. That is tracked by the small,
 *   additive Firestore doc in firebase/harvestFeastService.ts.
 *
 * check() is polled from App.tsx every TIMING.SEASONAL_EVENT_CHECK_MS,
 * alongside SeasonalEventManager/WreathWorkshopManager. It now triggers
 * Elias's gathering/closing speeches as cutscenes (ensureGatheringStarted(),
 * maybeConclude()) — that is safe without any extra gating in here, because
 * App.tsx's game loop already early-returns before reaching this call site
 * whenever `activeNPC || isCutscenePlaying || activeChainPopup || ui.miniGame`
 * is true, so check() only ever runs when it is safe to open a cutscene.
 * checkCatchUpCutscene() is polled from the same place App.tsx checks
 * position-based cutscenes and re-checks that same condition explicitly,
 * since — unlike the rest of this manager — the gathering/closing check and
 * the catch-up check happen at different points in the frame and
 * cutsceneManager.startCutscene() does not itself guard against clobbering
 * an in-progress cutscene.
 */

import type { Position } from '../types';
import { TimeManager, Season } from './TimeManager';
import { gameState } from '../GameState';
import { npcManager } from '../NPCManager';
import { mapManager } from '../maps/MapManager';
import { cutsceneManager } from './CutsceneManager';
import { createMumNPC } from './npcs/homeNPCs';
import { createOldWomanKnittingNPC } from './npcs/village/oldWomanKnitting';
import { createVillageChildNPC } from './npcs/village/villageChild';
import { createMushraNPC } from './npcs/forest/mushra';
import { createChillBearNPC } from './npcs/forest/chillBear';
import { findSafePlayerPosition } from './YuleCelebrationManager';
import { createDecisionRandom } from './seededRandom';
import { hasCrossedAutumnDay42 } from './seasonReconcile';
import { getHarvestFeastService } from '../firebase/safe';
import { getItem } from '../data/items';
import { debugLog } from './debugLog';
import {
  HARVEST_FEAST_MAP_ID,
  HARVEST_FEAST_TABLE_POSITION,
  HARVEST_FEAST_TABLE_ITEM_ID,
  HARVEST_FEAST_TABLE_IMAGE,
  HARVEST_FEAST_TABLE_PLACED_ID,
  HARVEST_FEAST_CATCHUP_CUTSCENE_ID,
  HARVEST_FEAST_DAY,
  HARVEST_FEAST_TABLE_HOUR,
  HARVEST_FEAST_GATHER_HOUR,
  HARVEST_FEAST_CONSUMPTION_INTERVAL_MS,
  HARVEST_FEAST_BASELINE_SLOT_COUNT,
  FOOD_SLOT_OFFSETS,
  HARVEST_FEAST_BASELINE_FOOD,
  HARVEST_FEAST_NPC_CONFIGS,
  HARVEST_FEAST_GATHERING_CUTSCENE_ID,
  HARVEST_FEAST_CLOSING_CUTSCENE_IDS,
  harvestFeastFoodPlacedItemId,
} from '../data/harvestFeast';

// ============================================================================
// Pure helpers (exported for tests)
// ============================================================================

export type HarvestFeastTier = 1 | 2 | 3;

export function computeFeastTier(distinctPlayerMealCount: number): HarvestFeastTier {
  if (distinctPlayerMealCount === 0) return 1;
  if (distinctPlayerMealCount > 3) return 3;
  return 2;
}

/**
 * Deterministic consumption order over the 8 fixed food slots (Fisher-Yates,
 * seeded on the year) — identical on every client, no shared state required.
 */
export function harvestFeastConsumptionOrder(year: number): number[] {
  const slots = FOOD_SLOT_OFFSETS.map((_, i) => i);
  const rng = createDecisionRandom(`harvest-feast-eat-${year}`, 0);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

// ============================================================================
// Manager
// ============================================================================

class HarvestFeastManagerClass {
  /** In-memory only: guards against re-placing NPCs / re-toasting every 10s tick. */
  private npcsGatheredForYear: number | null = null;
  private pendingPlayerNudge: Position | null = null;

  private contributionUnsubscribe: (() => void) | null = null;
  private listeningYear: number | null = null;
  private remoteContributions: string[] = [];

  /**
   * The clock-driven physical event: table, baseline food, gathering,
   * consumption, conclusion (the gathering and conclusion steps trigger
   * Elias's speech cutscenes). Safe to call unconditionally — App.tsx's game
   * loop already only reaches this call site while it is safe to open a
   * cutscene, so this does not need its own extra gating the way
   * checkCatchUpCutscene() does.
   */
  check(playerPosition?: Position): void {
    const time = TimeManager.getCurrentTime();

    this.trackLastKnownDay();
    this.syncContributionSubscription(time.year);

    if (time.season !== Season.AUTUMN || time.day !== HARVEST_FEAST_DAY) return;
    if (gameState.hasHarvestFeastBeenCelebrated(time.year)) return;

    if (time.hour >= HARVEST_FEAST_TABLE_HOUR) {
      this.ensureTableAndBaselineFood(time.year);
    }

    if (time.hour >= HARVEST_FEAST_GATHER_HOUR) {
      this.ensureGatheringStarted(time.year, playerPosition);
      this.tickConsumption(time.year);
      this.maybeConclude(time.year);
    }
  }

  /**
   * The retrospective "you missed it" recap cutscene. Must only be called
   * while it is safe to open a cutscene — App.tsx gates its own position-
   * based cutscene checks the same way (`!activeNPC && !isCutscenePlaying`),
   * and this should be called from the same guarded spot.
   */
  checkCatchUpCutscene(): void {
    const time = TimeManager.getCurrentTime();

    // Which year's autumn is the relevant one right now: if we are currently
    // in autumn or winter, that is this year's autumn; if spring or summer,
    // this year's autumn has not happened yet, so the relevant one is last
    // year's (year - 1).
    const targetYear =
      time.season === Season.SPRING || time.season === Season.SUMMER ? time.year - 1 : time.year;
    if (targetYear < 0) return; // no prior autumn exists yet on a brand new save

    if (gameState.hasHarvestFeastBeenCelebrated(targetYear)) return;

    const pastDay42ThisAutumn = time.season === Season.AUTUMN && time.day > HARVEST_FEAST_DAY;

    const lastKnownDay = gameState.getHarvestFeastLastKnownDay();
    const crossedWhileClosed =
      lastKnownDay !== null &&
      hasCrossedAutumnDay42(
        lastKnownDay,
        TimeManager.getTotalGameDays(),
        TimeManager.seasonStartDayInYear(Season.AUTUMN),
        TimeManager.DAYS_PER_YEAR
      );

    if (!pastDay42ThisAutumn && !crossedWhileClosed) return;

    const started = cutsceneManager.triggerManualCutscene(HARVEST_FEAST_CATCHUP_CUTSCENE_ID);
    if (started) {
      gameState.markHarvestFeastCelebrated(targetYear);
      debugLog('HarvestFeast', `Catch-up recap shown for year ${targetYear}`);
    }
  }

  /** Consumed by App.tsx right after check() to nudge the player clear of a gathering NPC. */
  consumePendingPlayerNudge(): Position | null {
    const pos = this.pendingPlayerNudge;
    this.pendingPlayerNudge = null;
    return pos;
  }

  // ---- Contribution window (used by the table interaction + modal) ----

  isTableOpenForContributions(): boolean {
    const time = TimeManager.getCurrentTime();
    return (
      time.season === Season.AUTUMN &&
      time.day === HARVEST_FEAST_DAY &&
      time.hour >= HARVEST_FEAST_TABLE_HOUR &&
      time.hour < HARVEST_FEAST_GATHER_HOUR &&
      !gameState.hasHarvestFeastBeenCelebrated(time.year)
    );
  }

  /** Player-available slot indices (2-7) not currently occupied. */
  getOpenFoodSlots(): number[] {
    const time = TimeManager.getCurrentTime();
    const items = gameState.getPlacedItems(HARVEST_FEAST_MAP_ID);
    const open: number[] = [];
    for (let slot = HARVEST_FEAST_BASELINE_SLOT_COUNT; slot < FOOD_SLOT_OFFSETS.length; slot++) {
      const id = harvestFeastFoodPlacedItemId(slot, time.year);
      if (!items.some((i) => i.id === id)) open.push(slot);
    }
    return open;
  }

  /**
   * Place one food item at the given slot. Returns false (no-op) if the
   * table is not currently open for contributions or the slot is taken.
   * Callers (data/questHandlers/harvestFeastHandler.ts) own removing the
   * item from the player's inventory.
   */
  placeFoodAtSlot(slot: number, itemId: string, image: string): boolean {
    if (!this.isTableOpenForContributions()) return false;

    const time = TimeManager.getCurrentTime();
    const id = harvestFeastFoodPlacedItemId(slot, time.year);
    if (gameState.getPlacedItems(HARVEST_FEAST_MAP_ID).some((i) => i.id === id)) return false;

    gameState.addPlacedItem({
      id,
      itemId,
      position: FOOD_SLOT_OFFSETS[slot],
      mapId: HARVEST_FEAST_MAP_ID,
      image,
      timestamp: Date.now(),
      permanent: true,
      placedOnSurface: true, // sits on the table regardless of which food item this is
      customScale: 0.75, // smaller than the default 1 tile, so all 8 slots fit the table's width
    });

    gameState.recordHarvestFeastContribution(itemId);
    const service = getHarvestFeastService();
    if (service.isAvailable()) {
      void service.contributeMeal(time.year, itemId);
    }

    debugLog('HarvestFeast', `Placed ${itemId} on the feast table (slot ${slot})`);
    return true;
  }

  /**
   * Dev/testing convenience: wipe this save's progress AND remove any
   * table/food still standing, so the whole event can be replayed on the dev
   * server without waiting for a real new year. Exposed on the console via
   * `window.harvestFeastManager.resetForTesting()` — see
   * utils/gameInitializer.ts's dev commands log.
   */
  resetForTesting(): void {
    const year = TimeManager.getCurrentTime().year;
    this.teardownGathering(); // also removes the table
    for (const item of gameState.getPlacedItems(HARVEST_FEAST_MAP_ID)) {
      if (item.id.startsWith('harvest_feast_food_slot_')) {
        gameState.removePlacedItem(item.id);
      }
    }
    gameState.resetHarvestFeastProgress();
    this.npcsGatheredForYear = null;
    debugLog('HarvestFeast', `Reset for testing (was year ${year})`);
  }

  /** Clean up the Firestore subscription — call from App.tsx unmount cleanup. */
  dispose(): void {
    this.contributionUnsubscribe?.();
    this.contributionUnsubscribe = null;
    this.listeningYear = null;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private trackLastKnownDay(): void {
    const totalDays = TimeManager.getTotalGameDays();
    if (gameState.getHarvestFeastLastKnownDay() !== totalDays) {
      gameState.setHarvestFeastLastKnownDay(totalDays);
    }
  }

  private syncContributionSubscription(year: number): void {
    if (this.listeningYear === year) return;
    this.contributionUnsubscribe?.();
    this.listeningYear = year;
    this.remoteContributions = [];
    this.contributionUnsubscribe = getHarvestFeastService().subscribe(year, (mealIds) => {
      this.remoteContributions = mealIds;
    });
  }

  /** Deduped union of this client's local contributions and the last-synced shared record. */
  private getEffectiveContributedMealCount(): number {
    const local = gameState.getHarvestFeastContributedMealIds();
    return new Set([...local, ...this.remoteContributions]).size;
  }

  private ensureTableAndBaselineFood(year: number): void {
    const items = gameState.getPlacedItems(HARVEST_FEAST_MAP_ID);

    if (!items.some((i) => i.id === HARVEST_FEAST_TABLE_PLACED_ID)) {
      gameState.addPlacedItem({
        id: HARVEST_FEAST_TABLE_PLACED_ID,
        itemId: HARVEST_FEAST_TABLE_ITEM_ID,
        position: HARVEST_FEAST_TABLE_POSITION,
        mapId: HARVEST_FEAST_MAP_ID,
        image: HARVEST_FEAST_TABLE_IMAGE,
        timestamp: Date.now(),
        permanent: true,
      });
      debugLog('HarvestFeast', 'Table erected in the village square');
    }

    for (const food of HARVEST_FEAST_BASELINE_FOOD) {
      const id = harvestFeastFoodPlacedItemId(food.slot, year);
      if (items.some((i) => i.id === id)) continue;
      const def = getItem(food.itemId);
      if (!def) continue;
      gameState.addPlacedItem({
        id,
        itemId: food.itemId,
        position: FOOD_SLOT_OFFSETS[food.slot],
        mapId: HARVEST_FEAST_MAP_ID,
        image: def.image ?? HARVEST_FEAST_TABLE_IMAGE,
        timestamp: Date.now(),
        permanent: true,
        placedOnSurface: true, // sits on the table regardless of which food item this is
        customScale: 0.75, // smaller than the default 1 tile, so all 8 slots fit the table's width
      });
      debugLog('HarvestFeast', `${food.npcDisplayName} placed ${food.itemId} on the table`);
    }
  }

  private ensureGatheringStarted(year: number, playerPosition?: Position): void {
    if (this.npcsGatheredForYear === year) return;
    if (mapManager.getCurrentMapId() !== HARVEST_FEAST_MAP_ID) return;

    if (playerPosition) {
      this.pendingPlayerNudge = findSafePlayerPosition(
        playerPosition,
        HARVEST_FEAST_NPC_CONFIGS.map((c) => c.position)
      );
    }

    for (const config of HARVEST_FEAST_NPC_CONFIGS) {
      if (config.isDynamic) {
        let npc = null;
        if (config.originalId === 'mum') {
          npc = createMumNPC(config.celebrationId, config.position, 'Mum');
        } else if (config.originalId === 'old_woman_knitting') {
          npc = createOldWomanKnittingNPC(config.celebrationId, config.position, 'Althea');
        } else if (config.originalId === 'child') {
          npc = createVillageChildNPC(config.celebrationId, config.position, 'Little Girl');
        } else if (config.originalId === 'mushra') {
          npc = createMushraNPC(config.celebrationId, config.position, 'Mushra');
        } else if (config.originalId === 'chill_bear') {
          npc = createChillBearNPC(config.celebrationId, config.position, 'Mr Bear');
        }
        if (npc) npcManager.addDynamicNPC(npc);
      } else {
        npcManager.setEventOverridePosition(config.celebrationId, config.position);
      }
      npcManager.freezeWandering(config.celebrationId);
    }

    this.npcsGatheredForYear = year;
    if (gameState.getHarvestFeastGatherStartedAt() === null) {
      gameState.setHarvestFeastGatherStartedAt(Date.now());
    }

    cutsceneManager.triggerManualCutscene(HARVEST_FEAST_GATHERING_CUTSCENE_ID);

    debugLog('HarvestFeast', 'Villagers gather round the table');
  }

  private tickConsumption(year: number): void {
    // Anchored to gatherStartedAt (real Date.now() when THIS client first
    // observed gathering begin) rather than a pure calendar formula — see the
    // doc comment on GameState's harvestFeast.gatherStartedAt field for why:
    // a dev time-override moves TimeManager's displayed clock without moving
    // Date.now(), so a formula tied to the calendar would never line up with
    // real elapsed time when testing via the console/DevTools.
    const startedAt = gameState.getHarvestFeastGatherStartedAt();
    if (startedAt === null) return;

    // Rank only among slots actually occupied (not the full fixed 8), so a
    // sparse feast (e.g. just the two baseline dishes) finishes in 2
    // intervals rather than waiting on whichever rank the shuffle happened
    // to assign those slots out of 8. The contribution window is already
    // closed by the time this runs (gathering starts at the same hour the
    // table stops accepting food), so "which slots are occupied" is stable
    // shared state, not something that shifts the schedule mid-flight.
    const items = gameState.getPlacedItems(HARVEST_FEAST_MAP_ID);
    const occupiedSlots = harvestFeastConsumptionOrder(year).filter((slot) =>
      items.some((i) => i.id === harvestFeastFoodPlacedItemId(slot, year))
    );
    const now = Date.now();

    occupiedSlots.forEach((slot, rank) => {
      const dueAt = startedAt + (rank + 1) * HARVEST_FEAST_CONSUMPTION_INTERVAL_MS;
      if (now < dueAt) return;
      // removePlacedItem() is a harmless no-op if another client's tick
      // already removed this slot.
      gameState.removePlacedItem(harvestFeastFoodPlacedItemId(slot, year));
    });
  }

  private maybeConclude(year: number): void {
    // Only a client that actually saw the gathering start concludes the
    // feast on its own save — a client that was never present this year
    // should not mark itself "celebrated" just because other players' ticks
    // emptied the table; it genuinely missed the live event and should get
    // the catch-up recap later instead.
    if (this.npcsGatheredForYear !== year) return;

    const items = gameState.getPlacedItems(HARVEST_FEAST_MAP_ID);
    const anyFoodLeft = FOOD_SLOT_OFFSETS.some((_, slot) =>
      items.some((i) => i.id === harvestFeastFoodPlacedItemId(slot, year))
    );
    if (anyFoodLeft) return;

    const tier = computeFeastTier(this.getEffectiveContributedMealCount());

    cutsceneManager.triggerManualCutscene(HARVEST_FEAST_CLOSING_CUTSCENE_IDS[tier]);

    this.teardownGathering();
    gameState.markHarvestFeastCelebrated(year);
    gameState.resetHarvestFeastContributions();
    gameState.setHarvestFeastGatherStartedAt(null);
    this.npcsGatheredForYear = null;

    debugLog('HarvestFeast', `Feast concluded — tier ${tier}`);
  }

  private teardownGathering(): void {
    for (const config of HARVEST_FEAST_NPC_CONFIGS) {
      if (config.isDynamic) {
        npcManager.removeDynamicNPC(config.celebrationId, HARVEST_FEAST_MAP_ID);
      }
    }
    npcManager.clearEventOverrides();
    // The table is added with permanent: true (so players can't pick it up
    // mid-feast) but is not meant to outlive the feast itself — see the
    // "added and removed within the same year" doc comment on
    // HARVEST_FEAST_TABLE_PLACED_ID. removePlacedItem() is a harmless no-op
    // if it's already gone (e.g. resetForTesting() ran first).
    gameState.removePlacedItem(HARVEST_FEAST_TABLE_PLACED_ID);
  }
}

export const harvestFeastManager = new HarvestFeastManagerClass();
