/**
 * YuleCelebrationManager
 *
 * Runs the annual Yule gift-giving celebration — a shared community event,
 * like the Harvest Feast (utils/HarvestFeastManager.ts), not the private,
 * click-to-begin instance this used to be. Every client runs this exact same
 * deterministic logic off the same TimeManager clock, so the tree, the NPC
 * gathering and the gift wishes look the same to every player physically
 * present in the village, with almost no new networking:
 *
 * - The tree is an ordinary PlacedItem, already synced across players for
 *   free (hooks/useSharedPlacedItemsController.ts).
 * - Which item each NPC wishes for, and which reward a gift earns, are pure
 *   deterministic functions of the year (and NPC, for rewards) via
 *   createDecisionRandom — the same trick WeatherManager and
 *   harvestFeastConsumptionOrder() use — so every client agrees on "the
 *   correct gift" and on what a claim rewards without any shared state.
 * - The one thing that genuinely cannot be derived from currently-live state
 *   is which of the 7 NPCs has already been gifted this year: once an NPC's
 *   wish thought-bubble disappears there's nothing left to observe, unlike
 *   Harvest Feast's food (which stays visible as shared PlacedItems until
 *   eaten). That is tracked by the small, additive Firestore doc in
 *   firebase/yuleCelebrationService.ts.
 *
 * check() is polled from App.tsx every TIMING.SEASONAL_EVENT_CHECK_MS,
 * alongside HarvestFeastManager/SeasonalEventManager/WreathWorkshopManager.
 * checkCatchUpCutscene() is polled from the same place App.tsx checks
 * position-based cutscenes, gated the same way (!activeNPC && !isCutscenePlaying).
 */

import type { Position } from '../types';
import { eventBus, GameEvent } from './EventBus';
import { TimeManager, Season } from './TimeManager';
import { gameState } from '../GameState';
import { inventoryManager } from './inventoryManager';
import { npcManager } from '../NPCManager';
import { mapManager } from '../maps/MapManager';
import { cutsceneManager } from './CutsceneManager';
import { createMumNPC } from './npcs/homeNPCs';
import { createMushraNPC } from './npcs/forest/mushra';
import { createChillBearNPC } from './npcs/forest/chillBear';
import { createOldWomanKnittingNPC } from './npcs/village/oldWomanKnitting';
import { createVillageChildNPC } from './npcs/village/villageChild';
import { createDecisionRandom } from './seededRandom';
import { hasCrossedSeasonDay42 } from './seasonReconcile';
import { getYuleCelebrationService } from '../firebase/safe';
import {
  YULE_NPC_CONFIGS,
  YULE_WISH_POOL,
  YULE_RARE_REWARDS,
  YULE_COMMON_REWARDS,
  YULE_PERFECT_GIFT_DIALOGUES,
  YULE_ANY_GIFT_DIALOGUES,
  YULE_CELEBRATION_DURATION_MS,
  YULE_CUTSCENE_ID,
  YULE_MAP_ID,
  YULE_MUM_GREETING,
  YULE_DAY,
  YULE_GATHER_HOUR,
  YULE_TREE_POSITION,
  YULE_TREE_ITEM_ID,
  YULE_TREE_IMAGE,
  YULE_TREE_PLACED_ID,
  YULE_CATCHUP_CUTSCENE_ID,
} from '../data/yuleCelebration';
import { debugLog } from './debugLog';

// ============================================================================
// Types
// ============================================================================

export interface YuleGiftResult {
  wasWish: boolean;
  dialogue: string;
  rewardItemId: string;
}

// ============================================================================
// Player clearance (issue #27 — player must not end up trapped inside an
// NPC placed for the celebration)
// ============================================================================

/** Minimum distance (tiles) the player must be from a Yule NPC's celebration tile. */
const YULE_PLAYER_CLEARANCE = 1.2;

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * If the player's current position is too close to one of the positions Yule
 * NPCs are about to occupy, find the nearest clear tile to nudge them to.
 * Returns null if the player's current position is already clear (the common case).
 *
 * Searches outward in square rings from the player's own position so the nudge
 * is always the smallest one that clears every occupied tile.
 *
 * Also imported by utils/HarvestFeastManager.ts, which reuses this exact
 * helper for its own NPC gathering — do not change this signature.
 */
export function findSafePlayerPosition(
  playerPosition: Position,
  occupiedPositions: Position[]
): Position | null {
  const isTooClose = (pos: Position) =>
    occupiedPositions.some((occupied) => distance(pos, occupied) < YULE_PLAYER_CLEARANCE);

  if (!isTooClose(playerPosition)) return null;

  const MAX_SEARCH_RADIUS = 6;
  for (let radius = 1; radius <= MAX_SEARCH_RADIUS; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue; // ring only, nearest first
        const candidate = { x: playerPosition.x + dx, y: playerPosition.y + dy };
        if (!isTooClose(candidate)) return candidate;
      }
    }
  }
  // Effectively unreachable (would need 7 NPCs to blanket a 13x13 area), but
  // never leave the player stuck with no fallback.
  return null;
}

// ============================================================================
// Pure helpers (exported for tests)
// ============================================================================

/**
 * Deterministic wish assignment — Fisher-Yates over the wish pool, seeded on
 * the year, identical on every client. Wishes must be shared now that "the
 * correct gift" is a globally-exclusive claim: two players must agree on
 * which item is right for a given NPC.
 */
export function computeYuleWishes(year: number): Record<string, string> {
  const rng = createDecisionRandom(`yule-wishes-${year}`, 0);
  const shuffled = [...YULE_WISH_POOL];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const wishes: Record<string, string> = {};
  YULE_NPC_CONFIGS.forEach((config, i) => {
    if (i < shuffled.length) {
      wishes[config.celebrationId] = shuffled[i];
    }
  });
  return wishes;
}

/**
 * Deterministic reward pick for one NPC's gift, seeded on (year, npcId) so a
 * same-tick race between two simultaneous gifters converges on the identical
 * reward regardless of which client's write reaches Firestore first.
 */
export function pickYuleReward(year: number, npcId: string, wasWish: boolean): string {
  const pool = wasWish ? YULE_RARE_REWARDS : YULE_COMMON_REWARDS;
  const rng = createDecisionRandom(`yule-reward-${year}-${npcId}`, 0);
  return pool[Math.floor(rng() * pool.length)];
}

// ============================================================================
// Manager
// ============================================================================

class YuleCelebrationManagerClass {
  /** In-memory only: guards against re-placing NPCs every ~10s tick. */
  private npcsGatheredForYear: number | null = null;
  private pendingPlayerNudge: Position | null = null;
  private originalScales: Map<string, number> = new Map();
  private pendingGiftDialogue: string | null = null;

  private claimUnsubscribe: (() => void) | null = null;
  private listeningYear: number | null = null;
  private remoteClaims: string[] = [];

  private blackoutTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // ---- Clock-driven gathering ----

  /**
   * Safe to call unconditionally — App.tsx's game loop only reaches this call
   * site while it is safe to open a cutscene, mirroring
   * HarvestFeastManager.check().
   */
  check(playerPosition?: Position): void {
    const time = TimeManager.getCurrentTime();

    this.trackLastKnownDay();
    this.syncClaimSubscription(time.year);

    if (time.season !== Season.WINTER || time.day !== YULE_DAY) return;
    if (gameState.hasYuleBeenCelebrated(time.year)) return;

    if (time.hour >= YULE_GATHER_HOUR) {
      this.ensureTreeAndGatheringStarted(time.year, playerPosition);
      this.maybeConclude(time.year);
    }
  }

  /**
   * The retrospective "you missed it" recap cutscene. Must only be called
   * while it is safe to open a cutscene — see HarvestFeastManager's
   * checkCatchUpCutscene() for why this is a separate call site from check().
   */
  checkCatchUpCutscene(): void {
    const time = TimeManager.getCurrentTime();

    // Winter is the last season of the year (TimeManager.SEASON_ORDER), so
    // the relevant past Yule is always this year's if we're currently in
    // Winter, and last year's (year - 1) for every other season.
    const targetYear = time.season === Season.WINTER ? time.year : time.year - 1;
    if (targetYear < 0) return; // no prior Yule exists yet on a brand new save

    if (gameState.hasYuleBeenCelebrated(targetYear)) return;

    const pastDay42ThisWinter = time.season === Season.WINTER && time.day > YULE_DAY;

    const lastKnownDay = gameState.getYuleLastKnownDay();
    const crossedWhileClosed =
      lastKnownDay !== null &&
      hasCrossedSeasonDay42(
        lastKnownDay,
        TimeManager.getTotalGameDays(),
        TimeManager.seasonStartDayInYear(Season.WINTER),
        TimeManager.DAYS_PER_YEAR
      );

    if (!pastDay42ThisWinter && !crossedWhileClosed) return;

    const started = cutsceneManager.triggerManualCutscene(YULE_CATCHUP_CUTSCENE_ID);
    if (started) {
      gameState.markYuleCelebrated(targetYear);
      debugLog('YuleCelebration', `Catch-up recap shown for year ${targetYear}`);
    }
  }

  /** Consumed by App.tsx right after check() to nudge the player clear of a gathering NPC. */
  consumePendingPlayerNudge(): Position | null {
    const pos = this.pendingPlayerNudge;
    this.pendingPlayerNudge = null;
    return pos;
  }

  // ---- State queries ----

  isActive(): boolean {
    return this.npcsGatheredForYear !== null;
  }

  canReceiveGift(npcId: string): boolean {
    if (!this.isActive()) return false;
    const isParticipant = YULE_NPC_CONFIGS.some((c) => c.celebrationId === npcId);
    if (!isParticipant) return false;
    return !this.getEffectiveClaimedNpcIds().includes(npcId);
  }

  /** Returns all current wishes (npcId -> itemId) for rendering thought bubbles */
  getAllWishes(): Record<string, string> {
    if (this.npcsGatheredForYear === null) return {};
    return computeYuleWishes(this.npcsGatheredForYear);
  }

  /** Returns the set of NPC IDs that have already received a gift */
  getGiftsReceived(): Set<string> {
    return new Set(this.getEffectiveClaimedNpcIds());
  }

  // ---- Timer ----

  getRemainingMs(): number {
    const startedAt = gameState.getYuleStartedAt();
    if (startedAt === null) return 0;
    const elapsed = Date.now() - startedAt;
    return Math.max(0, YULE_CELEBRATION_DURATION_MS - elapsed);
  }

  getFormattedTimeRemaining(): string {
    const ms = this.getRemainingMs();
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // ---- Gift interception ----

  /**
   * Called from the existing gift-giving handler when a gift is given to an
   * NPC during the Yule celebration. Returns null if not applicable (not
   * gathering, NPC not a participant), or 'already_claimed' if another player
   * (or this one, earlier) already gifted that NPC this year.
   */
  interceptGift(npcId: string, itemId: string): YuleGiftResult | 'already_claimed' | null {
    if (this.npcsGatheredForYear === null) return null;
    if (!YULE_NPC_CONFIGS.some((c) => c.celebrationId === npcId)) return null;

    const year = this.npcsGatheredForYear;

    if (this.getEffectiveClaimedNpcIds().includes(npcId)) {
      return 'already_claimed';
    }

    const wish = computeYuleWishes(year)[npcId];
    const wasWish = wish === itemId;
    const rewardItemId = pickYuleReward(year, npcId, wasWish);

    inventoryManager.addItem(rewardItemId, 1);
    eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: rewardItemId });

    const dialoguePool = wasWish ? YULE_PERFECT_GIFT_DIALOGUES : YULE_ANY_GIFT_DIALOGUES;
    const dialogue = dialoguePool[Math.floor(Math.random() * dialoguePool.length)];
    this.pendingGiftDialogue = dialogue;

    gameState.recordYuleGiftClaim(npcId);
    const service = getYuleCelebrationService();
    if (service.isAvailable()) {
      void service.claimGift(year, npcId);
    }

    const result: YuleGiftResult = { wasWish, dialogue, rewardItemId };

    eventBus.emit(GameEvent.YULE_GIFT_GIVEN, {
      npcId,
      itemId,
      wasWish,
      dialogue,
      rewardItemId,
    });

    return result;
  }

  /** Retrieve the Yule gift reaction text for the dialogue box (consumed once). */
  getPendingGiftDialogue(): string | null {
    return this.pendingGiftDialogue;
  }

  /** Clear after the dialogue box has consumed it. */
  clearPendingGiftDialogue(): void {
    this.pendingGiftDialogue = null;
  }

  // ---- End ----

  /**
   * Force-end the celebration immediately (e.g. player leaves the village).
   * Skips the blackout animation and cleans up NPCs synchronously.
   *
   * removeDynamicNPC() is passed YULE_MAP_ID explicitly rather than relying on
   * npcManager's "current" map — MapManager.loadMap() sets that as soon as a map
   * transition starts (before the caller here gets to run), so by the time this is
   * invoked from App.tsx's handleMapTransition, currentMapId is already the
   * destination map, not 'village'. See NPCManager.removeDynamicNPC/clearEventOverrides.
   */
  forceEnd(): void {
    if (this.npcsGatheredForYear === null) return;

    const year = this.npcsGatheredForYear;
    const giftsGiven = this.getEffectiveClaimedNpcIds().length;

    this.clearBlackoutTimeout();
    this.teardownGathering();

    gameState.markYuleCelebrated(year);
    gameState.setYuleStartedAt(null);
    this.npcsGatheredForYear = null;

    eventBus.emit(GameEvent.YULE_CELEBRATION_ENDED, { year, giftsGiven });

    debugLog('YuleCelebration', 'Celebration force-ended (player left village).');
  }

  /**
   * Dev/testing convenience: wipe this save's progress and remove any tree
   * still standing, so the whole event can be replayed on the dev server
   * without waiting for a real new year. Exposed on the console via
   * `window.yuleCelebrationManager.resetForTesting()`.
   */
  resetForTesting(): void {
    const year = TimeManager.getCurrentTime().year;
    this.clearBlackoutTimeout();
    this.teardownGathering();
    gameState.resetYuleProgress();
    this.npcsGatheredForYear = null;
    debugLog('YuleCelebration', `Reset for testing (was year ${year})`);
  }

  /** Clean up intervals/subscriptions — call from App.tsx unmount cleanup. */
  dispose(): void {
    this.clearBlackoutTimeout();
    this.claimUnsubscribe?.();
    this.claimUnsubscribe = null;
    this.listeningYear = null;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private trackLastKnownDay(): void {
    const totalDays = TimeManager.getTotalGameDays();
    if (gameState.getYuleLastKnownDay() !== totalDays) {
      gameState.setYuleLastKnownDay(totalDays);
    }
  }

  private syncClaimSubscription(year: number): void {
    if (this.listeningYear === year) return;
    this.claimUnsubscribe?.();
    this.listeningYear = year;
    this.remoteClaims = [];
    this.claimUnsubscribe = getYuleCelebrationService().subscribe(year, (npcIds) => {
      this.remoteClaims = npcIds;
      eventBus.emit(GameEvent.YULE_CLAIMS_SYNCED, { claimedNpcIds: this.getEffectiveClaimedNpcIds() });
    });
  }

  /** Deduped union of this client's local claims and the last-synced shared record. */
  private getEffectiveClaimedNpcIds(): string[] {
    const local = gameState.getYuleGiftsClaimedLocally();
    return [...new Set([...local, ...this.remoteClaims])];
  }

  private ensureTreeAndGatheringStarted(year: number, playerPosition?: Position): void {
    if (this.npcsGatheredForYear === year) return;
    if (mapManager.getCurrentMapId() !== YULE_MAP_ID) return;

    if (!gameState.getPlacedItems(YULE_MAP_ID).some((i) => i.id === YULE_TREE_PLACED_ID)) {
      gameState.addPlacedItem({
        id: YULE_TREE_PLACED_ID,
        itemId: YULE_TREE_ITEM_ID,
        position: YULE_TREE_POSITION,
        mapId: YULE_MAP_ID,
        image: YULE_TREE_IMAGE,
        timestamp: Date.now(),
        permanent: true,
      });
      debugLog('YuleCelebration', 'Yule tree raised in the village square');
    }

    if (playerPosition) {
      this.pendingPlayerNudge = findSafePlayerPosition(
        playerPosition,
        YULE_NPC_CONFIGS.map((config) => config.position)
      );
    }

    this.placeFestivalNPCs();

    for (const config of YULE_NPC_CONFIGS) {
      if (!config.isDynamic) {
        npcManager.setEventOverridePosition(config.celebrationId, config.position);
      }
    }

    for (const config of YULE_NPC_CONFIGS) {
      npcManager.freezeWandering(config.celebrationId);
    }

    this.originalScales.clear();
    for (const config of YULE_NPC_CONFIGS) {
      if (config.scaleOverride === undefined) continue;
      const original = npcManager.setEventScaleOverride(config.celebrationId, config.scaleOverride);
      if (original !== null) {
        this.originalScales.set(config.celebrationId, original);
      }
    }

    inventoryManager.addItem('food_yule_log', 1);
    eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: 'food_yule_log' });

    this.npcsGatheredForYear = year;
    if (gameState.getYuleStartedAt() === null) {
      gameState.setYuleStartedAt(Date.now());
    }

    eventBus.emit(GameEvent.YULE_CELEBRATION_STARTED, {
      year,
      npcWishes: computeYuleWishes(year),
      claimedNpcIds: this.getEffectiveClaimedNpcIds(),
    });

    cutsceneManager.triggerManualCutscene(YULE_CUTSCENE_ID);

    debugLog('YuleCelebration', 'Celebration started — 10 minutes on the clock!');
  }

  private placeFestivalNPCs(): void {
    for (const config of YULE_NPC_CONFIGS) {
      if (!config.isDynamic) continue;
      let npc = null;
      if (config.originalId === 'mum') {
        npc = createMumNPC(config.celebrationId, config.position, 'Mum');
      } else if (config.originalId === 'mushra') {
        npc = createMushraNPC(config.celebrationId, config.position, 'Mushra');
      } else if (config.originalId === 'chill_bear') {
        npc = createChillBearNPC(config.celebrationId, config.position, 'Mr Bear');
      } else if (config.originalId === 'old_woman_knitting') {
        npc = createOldWomanKnittingNPC(config.celebrationId, config.position, 'Althea');
      } else if (config.originalId === 'child') {
        npc = createVillageChildNPC(config.celebrationId, config.position, 'Little Girl');
      }
      if (npc) {
        npcManager.addDynamicNPC(npc);
      }
    }
  }

  private maybeConclude(year: number): void {
    if (this.npcsGatheredForYear !== year) return;

    const startedAt = gameState.getYuleStartedAt();
    if (startedAt === null) return;
    if (Date.now() < startedAt + YULE_CELEBRATION_DURATION_MS) return;

    const giftsGiven = this.getEffectiveClaimedNpcIds().length;

    // Signal blackout start — App.tsx fades screen to black
    eventBus.emit(GameEvent.YULE_BLACKOUT, { phase: 'fade_in' });

    this.clearBlackoutTimeout();
    this.blackoutTimeoutId = setTimeout(() => {
      this.blackoutTimeoutId = null;
      this.teardownGathering();

      // Signal blackout end — App.tsx fades back in
      eventBus.emit(GameEvent.YULE_BLACKOUT, { phase: 'fade_out' });

      eventBus.emit(GameEvent.YULE_CELEBRATION_ENDED, { year, giftsGiven });

      gameState.markYuleCelebrated(year);
      gameState.setYuleStartedAt(null);
      this.npcsGatheredForYear = null;

      debugLog('YuleCelebration', 'Celebration ended. Until next Yule!');
    }, 1500); // 1.5 s — matches the CSS blackout transition duration
  }

  private clearBlackoutTimeout(): void {
    if (this.blackoutTimeoutId !== null) {
      clearTimeout(this.blackoutTimeoutId);
      this.blackoutTimeoutId = null;
    }
  }

  private teardownGathering(): void {
    for (const config of YULE_NPC_CONFIGS) {
      if (config.isDynamic) {
        npcManager.removeDynamicNPC(config.celebrationId, YULE_MAP_ID);
      }
    }

    npcManager.clearEventOverrides();
    for (const [npcId, originalScale] of this.originalScales) {
      npcManager.restoreEventScale(npcId, originalScale);
    }
    this.originalScales.clear();

    // The tree is added with permanent: true (so players can't pick it up
    // mid-celebration) but is not meant to outlive the celebration itself —
    // removePlacedItem() is a harmless no-op if it's already gone.
    gameState.removePlacedItem(YULE_TREE_PLACED_ID);
  }
}

export const yuleCelebrationManager = new YuleCelebrationManagerClass();
export { YULE_MUM_GREETING };
