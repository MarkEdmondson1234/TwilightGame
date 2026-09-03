/**
 * YuleCelebrationManager
 *
 * Manages the annual Yule gift-giving celebration:
 * - Once-per-year check (persisted to localStorage)
 * - Assigns random gift wishes to 7 NPCs
 * - Triggers the opening cutscene
 * - Moves NPCs to positions around the Yule tree
 * - Runs a 10-minute real-time countdown
 * - Handles gift interception (checks wish match, grants reward)
 * - Ends with a screen blackout and NPC restoration
 */

import type { Position } from '../types';
import { eventBus, GameEvent } from './EventBus';
import { TimeManager, Season } from './TimeManager';
import { inventoryManager } from './inventoryManager';
import { npcManager } from '../NPCManager';
import { cutsceneManager } from './CutsceneManager';
import { createMumNPC } from './npcs/homeNPCs';
import { createMushraNPC } from './npcs/forest/mushra';
import { createChillBearNPC } from './npcs/forest/chillBear';
import { createOldWomanKnittingNPC } from './npcs/village/oldWomanKnitting';
import { createVillageChildNPC } from './npcs/village/villageChild';
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
  YULE_STORAGE_KEY,
  YULE_MUM_GREETING,
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

interface CelebrationState {
  isActive: boolean;
  startTime: number;
  year: number;
  npcWishes: Record<string, string>; // celebrationId -> itemId
  giftsReceived: Set<string>; // celebrationIds who have received a gift
}

interface PersistedData {
  celebratedYears: number[];
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
// Manager
// ============================================================================

class YuleCelebrationManagerClass {
  private state: CelebrationState | null = null;
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;
  private originalScales: Map<string, number> = new Map();
  private pendingGiftDialogue: string | null = null;

  // ---- Persistence ----

  private loadPersistedData(): PersistedData {
    try {
      const raw = localStorage.getItem(YULE_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as PersistedData;
    } catch {
      // corrupted data — start fresh
    }
    return { celebratedYears: [] };
  }

  private savePersistedData(data: PersistedData): void {
    try {
      localStorage.setItem(YULE_STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.warn('[YuleCelebration] Failed to persist celebration data');
    }
  }

  hasBeenCelebratedThisYear(year: number): boolean {
    return this.loadPersistedData().celebratedYears.includes(year);
  }

  // ---- Year / season check ----

  canStartCelebration(): boolean {
    if (this.state?.isActive) return false;
    const time = TimeManager.getCurrentTime();
    if (time.season !== Season.WINTER) return false;
    if (time.day < 42) return false;
    if (this.hasBeenCelebratedThisYear(time.year)) return false;
    return true;
  }

  // ---- Lifecycle ----

  startCelebration(): void {
    if (!this.canStartCelebration()) {
      console.warn('[YuleCelebration] Cannot start celebration — conditions not met');
      return;
    }

    const time = TimeManager.getCurrentTime();
    const wishes = this.assignWishes();

    this.state = {
      isActive: false, // becomes true after cutscene ends
      startTime: 0,
      year: time.year,
      npcWishes: wishes,
      giftsReceived: new Set(),
    };

    cutsceneManager.triggerManualCutscene(YULE_CUTSCENE_ID);
  }

  /**
   * Called by App.tsx when the Yule celebration cutscene finishes.
   * Moves NPCs to celebration positions, gives Mum's Yule log, starts timer.
   *
   * Pass the player's current position to have the player nudged out of the way
   * if it's too close to a tile an NPC is about to be placed on (issue #27 — the
   * player must not end up trapped inside an NPC's collision box). Returns the
   * safe position to teleport the player to, or null if no nudge is needed.
   */
  onCutsceneComplete(playerPosition?: Position): Position | null {
    if (!this.state) return null;

    this.state.isActive = true;
    this.state.startTime = Date.now();

    // Check the player isn't standing where an NPC is about to be placed BEFORE
    // placing any of them, so the returned position is always safe by the time
    // the caller acts on it.
    const safePlayerPosition = playerPosition
      ? findSafePlayerPosition(
          playerPosition,
          YULE_NPC_CONFIGS.map((config) => config.position)
        )
      : null;

    // Place dynamic festival NPCs on the village map
    this.placeFestivalNPCs();

    // Override village NPC positions
    for (const config of YULE_NPC_CONFIGS) {
      if (!config.isDynamic) {
        npcManager.setEventOverridePosition(config.celebrationId, config.position);
      }
    }

    // Freeze all Yule NPCs in position (prevents wandering ones like Little Girl and Mushra from drifting away)
    for (const config of YULE_NPC_CONFIGS) {
      npcManager.freezeWandering(config.celebrationId);
    }

    // Apply temporary scale overrides for the duration of the celebration.
    // Uses setEventScaleOverride so the animation system's per-state scale logic
    // doesn't immediately overwrite the override every tick.
    this.originalScales.clear();
    for (const config of YULE_NPC_CONFIGS) {
      if (config.scaleOverride === undefined) continue;
      const original = npcManager.setEventScaleOverride(config.celebrationId, config.scaleOverride);
      if (original !== null) {
        this.originalScales.set(config.celebrationId, original);
      }
    }

    // Mum gives the player a Yule log automatically
    inventoryManager.addItem('food_yule_log', 1);
    eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: 'food_yule_log' });

    // Notify React so it can show Mum's greeting toast
    eventBus.emit(GameEvent.YULE_CELEBRATION_STARTED, {
      year: this.state.year,
      npcWishes: this.state.npcWishes,
    });

    // Also emit the Mum greeting as a special first gift event marker
    // (App.tsx shows the YULE_MUM_GREETING toast on YULE_CELEBRATION_STARTED)

    this.startTimer();
    debugLog('YuleCelebration', 'Celebration started — 10 minutes on the clock!');

    return safePlayerPosition;
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

  private startTimer(): void {
    this.timerIntervalId = setInterval(() => {
      if (this.getRemainingMs() <= 0) {
        this.endCelebration();
      }
    }, 1000);
  }

  // ---- Timer ----

  getRemainingMs(): number {
    if (!this.state?.isActive) return 0;
    const elapsed = Date.now() - this.state.startTime;
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

  // ---- State queries ----

  isActive(): boolean {
    return this.state?.isActive === true;
  }

  canReceiveGift(npcId: string): boolean {
    if (!this.state?.isActive) return false;
    const isParticipant = YULE_NPC_CONFIGS.some((c) => c.celebrationId === npcId);
    if (!isParticipant) return false;
    return !this.state.giftsReceived.has(npcId);
  }

  getNPCWish(npcId: string): string | null {
    if (!this.state) return null;
    if (this.state.giftsReceived.has(npcId)) return null;
    return this.state.npcWishes[npcId] ?? null;
  }

  /** Returns all current wishes (npcId -> itemId) for rendering thought bubbles */
  getAllWishes(): Record<string, string> {
    return this.state?.npcWishes ?? {};
  }

  /** Returns the set of NPC IDs that have already received a gift */
  getGiftsReceived(): Set<string> {
    return this.state?.giftsReceived ?? new Set();
  }

  // ---- Gift interception ----

  /**
   * Called from the existing gift-giving handler when a gift is given to an NPC
   * during the Yule celebration. Returns null if not applicable (not active, NPC
   * already gifted, etc.).
   */
  interceptGift(npcId: string, itemId: string): YuleGiftResult | null {
    if (!this.state?.isActive) return null;
    if (!this.canReceiveGift(npcId)) return null;

    const wish = this.state.npcWishes[npcId];
    const wasWish = wish === itemId;

    // Choose reward
    const rewardPool = wasWish ? YULE_RARE_REWARDS : YULE_COMMON_REWARDS;
    const rewardItemId = rewardPool[Math.floor(Math.random() * rewardPool.length)];

    // Grant reward
    if (rewardItemId) {
      inventoryManager.addItem(rewardItemId, 1);
      eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'add', itemId: rewardItemId });
    }

    // Choose dialogue
    const dialoguePool = wasWish ? YULE_PERFECT_GIFT_DIALOGUES : YULE_ANY_GIFT_DIALOGUES;
    const dialogue = dialoguePool[Math.floor(Math.random() * dialoguePool.length)];

    // Store dialogue text so the DialogueBox can retrieve it via yule_gift_reaction node
    this.pendingGiftDialogue = dialogue;

    // Mark this NPC as gifted
    this.state.giftsReceived.add(npcId);

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

  endCelebration(): void {
    if (!this.state) return;

    this.clearTimer();

    const giftsGiven = this.state.giftsReceived.size;
    const year = this.state.year;

    // Signal blackout start — App.tsx fades screen to black
    eventBus.emit(GameEvent.YULE_BLACKOUT, { phase: 'fade_in' });

    // After blackout covers the screen, restore NPCs and fade out
    setTimeout(() => {
      // Remove dynamic festival NPCs
      for (const config of YULE_NPC_CONFIGS) {
        if (config.isDynamic) {
          npcManager.removeDynamicNPC(config.celebrationId, YULE_MAP_ID);
        }
      }

      // Restore village NPCs to their original positions and scales
      npcManager.clearEventOverrides();
      for (const [npcId, originalScale] of this.originalScales) {
        npcManager.restoreEventScale(npcId, originalScale);
      }
      this.originalScales.clear();

      // Signal blackout end — App.tsx fades back in
      eventBus.emit(GameEvent.YULE_BLACKOUT, { phase: 'fade_out' });

      // Emit celebration ended (App.tsx shows the "Merry Yule" toast)
      eventBus.emit(GameEvent.YULE_CELEBRATION_ENDED, { year, giftsGiven });

      // Save the year so the celebration cannot run again this year
      const data = this.loadPersistedData();
      if (!data.celebratedYears.includes(year)) {
        data.celebratedYears.push(year);
        this.savePersistedData(data);
      }

      this.state = null;
      debugLog('YuleCelebration', 'Celebration ended. Until next Yule!');
    }, 1500); // 1.5 s — matches the CSS blackout transition duration
  }

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
    if (!this.state) return;

    this.clearTimer();

    const giftsGiven = this.state.giftsReceived.size;
    const year = this.state.year;

    // Remove dynamic festival NPCs immediately (currentMapId is still 'village')
    for (const config of YULE_NPC_CONFIGS) {
      if (config.isDynamic) {
        npcManager.removeDynamicNPC(config.celebrationId, YULE_MAP_ID);
      }
    }

    // Restore village NPCs to their original positions and scales
    npcManager.clearEventOverrides();
    for (const [npcId, originalScale] of this.originalScales) {
      npcManager.restoreEventScale(npcId, originalScale);
    }
    this.originalScales.clear();

    // Emit ended (no blackout — player already left)
    eventBus.emit(GameEvent.YULE_CELEBRATION_ENDED, { year, giftsGiven });

    // Save the year
    const data = this.loadPersistedData();
    if (!data.celebratedYears.includes(year)) {
      data.celebratedYears.push(year);
      this.savePersistedData(data);
    }

    this.state = null;
    debugLog('YuleCelebration', 'Celebration force-ended (player left village).');
  }

  /** Clean up intervals — call from App.tsx useEffect cleanup. */
  dispose(): void {
    this.clearTimer();
  }

  // ---- Helpers ----

  private clearTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  /** Fisher-Yates shuffle, returns a new array */
  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Randomly assigns one wish per NPC with no duplicates.
   * Returns a record of celebrationId -> itemId.
   */
  private assignWishes(): Record<string, string> {
    const shuffled = this.shuffle(YULE_WISH_POOL);
    const wishes: Record<string, string> = {};
    YULE_NPC_CONFIGS.forEach((config, i) => {
      if (i < shuffled.length) {
        wishes[config.celebrationId] = shuffled[i];
      }
    });
    return wishes;
  }
}

export const yuleCelebrationManager = new YuleCelebrationManagerClass();
export { YULE_MUM_GREETING };
