/**
 * NpcGardenManager — the gardener process for the public farming patches.
 *
 * See design_docs/planned/NPC_GARDENS.md. The public farm tiles (village,
 * farm_area — exactly SHARED_FARM_MAP_IDS) are partly planted by NPC
 * gardeners, so the patches never look bare. Architecture:
 *
 * 1. **Target layout** (pure, deterministic): a pure function of
 *    (game-day slot, map, plan) computes which tiles each gardener tends,
 *    what crop each holds, and a back-dated plantedAtTimestamp so the patch
 *    shows a mix of growth stages. Nothing is stored — every client computes
 *    the same target from the same inputs (utils/seededRandom.ts, the same
 *    trick as weather and fairy spawns).
 *
 * 2. **Reconciliation pass**: compares target vs actual (farmManager plots,
 *    including Firestore-synced ones) and plants eligible tiles via
 *    farmManager.plantNpcPlot(). NPC plants are therefore ordinary shared
 *    plots — they flush to Firestore, render for free, and harvest through
 *    the existing claim transaction. The gardener only ever claims tiles
 *    that are empty, or fallow past the reclaim grace (so a player who
 *    harvests an NPC crop gets a window to claim the tile themselves).
 *
 * 3. **Plan** (the only new global state): per gardener, the highest
 *    friendship level any player reached (monotonic max-merge in Firestore,
 *    firebase/npcGardenService.ts) and the current requested crop. Without
 *    Firebase the plan falls back to the local player's friendship.
 *
 * All randomness comes from createDecisionRandom, never the bare global PRNG. Two
 * players who befriend the same NPCs compute the same garden; players who
 * befriend *different* NPCs each grow their own gardener's patch, and the
 * effects stack in the one shared world.
 */

import { TileType, FarmPlotState, type Position, type FarmPlot } from '../types';
import { farmManager } from './farmManager';
import { mapManager } from '../maps/MapManager';
import { TimeManager, Season } from './TimeManager';
import { createDecisionRandom } from './seededRandom';
import { canPlantInSeason, getCrop, getCropsForSeason } from '../data/crops';
import {
  getGardenersForMap,
  getGardener,
  getPatchSizeForLevel,
  getRequestTileCount,
} from '../data/npcGardeners';
import { NPC_GARDEN } from '../constants';
import { eventBus, GameEvent } from './EventBus';
import { friendshipManager } from './FriendshipManager';
import { getNpcGardenService } from '../firebase/safe';
import { debugLog } from './debugLog';

/** One tile an NPC gardener should have planted. */
export interface NpcGardenTarget {
  mapId: string;
  x: number;
  y: number;
  npcId: string;
  cropId: string;
  /** Back-dated planting time (deterministic stagger within the crop's growth). */
  plantedAt: number;
}

/** Injected clock/plan inputs for the pure target-layout function. */
export interface GardenPlanInputs {
  season: Season;
  /** Season identity for the patch shuffle — changes each season. */
  seasonSlot: number;
  /** Game-day slot for daily crop variety — TimeManager.totalDays. */
  daySlot: number;
  /** Effective garden level per gardener (max across players), 1-9. */
  effectiveLevels: Record<string, number>;
  /** Current request per gardener, if any. */
  requests: Record<string, string | null>;
}

const LOCAL_REQUESTS_KEY = 'twilight_npc_garden_requests';

/** Fisher–Yates over a copy, driven by the seeded generator. */
function shuffleTiles<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * The season identity the patch shuffle is keyed on: patches drift slowly
 * between seasons but never within one.
 */
export function seasonSlotAt(totalDays: number): number {
  return Math.floor(totalDays / TimeManager.DAYS_PER_SEASON);
}

/**
 * Which crops a gardener may sow in a season. Quest crops are excluded by id
 * (they are never ordinary field crops); seedSource does not filter here,
 * because the gardener brings her own seeds whatever the shop stocks.
 */
const QUEST_CROP_IDS = new Set(['fairy_bluebell', 'magic_bean']);

function inSeasonCropIds(season: Season): string[] {
  return getCropsForSeason(season)
    .filter((crop) => !QUEST_CROP_IDS.has(crop.id))
    .map((crop) => crop.id);
}

/** Pick the crop for one non-requested tile — deterministic per (tile, day). */
function pickDailyCrop(
  gardenerFavourites: string[],
  inSeasonCrops: string[],
  mapId: string,
  x: number,
  y: number,
  daySlot: number
): string | null {
  if (inSeasonCrops.length === 0) return null;
  const random = createDecisionRandom(`npc_garden:crop:${mapId}:${x}:${y}`, daySlot);
  const favouritePool = gardenerFavourites.filter((cropId) => inSeasonCrops.includes(cropId));
  const useFavourite = random() < NPC_GARDEN.FAVOURITE_WEIGHT && favouritePool.length > 0;
  const pool = useFavourite ? favouritePool : inSeasonCrops;
  return pool[Math.floor(random() * pool.length)];
}

/** Deterministic stagger: how far back from the day's start this tile was "planted". */
function plantedAtFor(
  cropGrowthMs: number,
  mapId: string,
  x: number,
  y: number,
  daySlot: number,
  dayStartMs: number
): number {
  const random = createDecisionRandom(`npc_garden:when:${mapId}:${x}:${y}`, daySlot);
  // Anywhere from just-sown to 90% grown — never already past harvest on
  // arrival, so a ready crop always came from a real planting the players
  // could watch ripen.
  const offset = Math.floor(random() * 0.9 * cropGrowthMs);
  return dayStartMs - offset;
}

/**
 * The pure target layout: which tiles each gardener tends on this map today,
 * with what crop and what back-dated planting time. Deterministic in
 * (inputs) alone — the same inputs always produce the same garden, on every
 * client, with no network traffic for the layout itself.
 */
export function computeGardenTarget(mapId: string, inputs: GardenPlanInputs): NpcGardenTarget[] {
  // Winter: the gardeners rest the beds *for the player's seed economy*, but
  // the patches are never left bare — the whole point of the garden is that
  // there is always something growing. In winter each gardener keeps her
  // patch sown with her own favourites (she brings her own seeds, so the
  // plantSeasons gate — which exists to pace what the player can buy and sow
  // — does not bind her), and the spring bed-clearing swaps anything the new
  // season cannot grow.
  const isWinter = inputs.season === Season.WINTER;

  const tiles = getPublicFarmTiles(mapId);
  if (tiles.length === 0) return [];

  const gardeners = getGardenersForMap(mapId);
  if (gardeners.length === 0) return [];

  const shuffleRandom = createDecisionRandom(
    `${NPC_GARDEN.PATCH_SHUFFLE_PREFIX}:${mapId}`,
    inputs.seasonSlot
  );
  const orderedTiles = shuffleTiles(tiles, shuffleRandom);

  const inSeasonShopCrops = isWinter ? null : inSeasonCropIds(inputs.season);

  const targets: NpcGardenTarget[] = [];
  let cursor = 0;

  // Back-dated planting times are keyed to the start of the current game day
  // (TimeManager's shared wall clock), not Date.now() — so two clients
  // reconciling the same tile write the *same* timestamp and reconciliation
  // is exactly idempotent.
  const dayStartMs = TimeManager.GAME_START_DATE + inputs.daySlot * TimeManager.MS_PER_GAME_DAY;

  for (const gardener of gardeners) {
    const level = inputs.effectiveLevels[gardener.npcId] ?? 1;
    const patchSize = Math.min(
      getPatchSizeForLevel(gardener.npcId, level),
      orderedTiles.length - cursor
    );
    if (patchSize <= 0) continue;

    const request = inputs.requests[gardener.npcId] ?? null;
    const requestTiles =
      request && canPlantInSeason(request, inputs.season)
        ? getRequestTileCount(gardener.npcId, patchSize, level)
        : 0;

    for (let i = 0; i < patchSize && cursor < orderedTiles.length; i++, cursor++) {
      const tile = orderedTiles[cursor];
      const cropId =
        i < requestTiles && request
          ? request
          : pickDailyCrop(
              gardener.favourites,
              // In winter the daily variety comes from the gardener's own
              // favourites, not the season's shop catalogue.
              isWinter ? gardener.favourites : inSeasonShopCrops,
              mapId,
              tile.x,
              tile.y,
              inputs.daySlot
            );
      if (!cropId) continue;
      const crop = getCrop(cropId);
      if (!crop) continue;

      targets.push({
        mapId,
        x: tile.x,
        y: tile.y,
        npcId: gardener.npcId,
        cropId,
        plantedAt: plantedAtFor(
          crop.growthTime,
          mapId,
          tile.x,
          tile.y,
          inputs.daySlot,
          dayStartMs
        ),
      });
    }
  }

  return targets;
}

/** All SOIL_FALLOW tile positions on a map (cached — designed maps are static). */
const publicTilesCache: Map<string, Position[]> = new Map();

export function getPublicFarmTiles(mapId: string): Position[] {
  const cached = publicTilesCache.get(mapId);
  if (cached) return cached;

  const tiles: Position[] = [];
  const mapDef = mapManager.getMap(mapId);
  if (mapDef) {
    for (let y = 0; y < mapDef.grid.length; y++) {
      for (let x = 0; x < mapDef.grid[y].length; x++) {
        if (mapDef.grid[y][x] === TileType.SOIL_FALLOW) {
          tiles.push({ x, y });
        }
      }
    }
  }
  publicTilesCache.set(mapId, tiles);
  return tiles;
}

/**
 * Whether a gardener may (re)plant this tile right now. Pure so tests can
 * pin the reclaim window: empty tiles always; fallow/dead ones only once the
 * state change is older than the grace — a player who just harvested an NPC
 * crop gets that window to plant the tile themselves.
 */
export function isTileEligibleForNpcPlanting(
  plot: FarmPlot | undefined,
  nowMs: number,
  graceMs: number
): boolean {
  if (!plot) return true;
  if (plot.state === FarmPlotState.FALLOW) {
    return nowMs - plot.stateChangedAtTimestamp >= graceMs;
  }
  if (plot.state === FarmPlotState.DEAD) {
    // NPC plots never die, so a DEAD plot is either player-made (leave it —
    // clearing dead crops is a player action with its own lesson) or stale
    // data from before the marker existed (old enough to reclaim).
    return Boolean(plot.plantedByNpc) && nowMs - plot.stateChangedAtTimestamp >= graceMs;
  }
  return false;
}

class NpcGardenManager {
  /** The map the player is currently on (set from App.tsx alongside the
   *  shared-farm sync lifecycle) — reconciles run against this map. */
  private activeMapId: string | null = null;

  /** Local fallback for requests when Firebase is unavailable. */
  private localRequests: Record<string, string | null> = {};

  /** Cached effective plan (remote merged with local fallback). */
  private planLevels: Record<string, number> = {};
  private planRequests: Record<string, string | null> = {};

  private initialised = false;
  private lastSeenSeason: Season | null = null;
  private lastSeenDay: number | null = null;
  private unsubscribers: Array<() => void> = [];

  /** Game days → ms, for the reclaim grace window. */
  private get reclaimGraceMs(): number {
    return NPC_GARDEN.RECLAIM_GRACE_GAME_DAYS * TimeManager.MS_PER_GAME_DAY;
  }

  /**
   * Effective garden level for a gardener: the highest level any player has
   * reached (Firestore plan), or the local player's level offline. Never
   * below 1. Monotonic in practice — plans only ever grow.
   */
  getEffectiveLevel(npcId: string): number {
    const planLevel = this.planLevels[npcId] ?? 1;
    const localLevel = friendshipManager.getFriendshipLevel(npcId);
    return Math.max(planLevel, localLevel);
  }

  /** The current request for a gardener: Firestore plan, or local fallback. */
  getRequest(npcId: string): string | null {
    return this.planRequests[npcId] ?? this.localRequests[npcId] ?? null;
  }

  initialise(): void {
    if (this.initialised) return;
    this.initialised = true;

    this.loadLocalRequests();

    // Auth-retry lives inside the service (it re-subscribes on sign-in).
    getNpcGardenService().startListening();
    this.unsubscribers.push(
      getNpcGardenService().onPlansChanged((plans) => {
        this.mergePlans(plans);
        this.reconcileActiveMap('plan-updated');
      })
    );

    // Friendship level-ups grow the gardener's patch for everyone.
    this.unsubscribers.push(
      eventBus.on(GameEvent.FRIENDSHIP_LEVEL_CHANGED, ({ npcId, level }) => {
        if (!getGardener(npcId)) return;
        void getNpcGardenService().reportGardenProgress(npcId, level);
        this.planLevels[npcId] = Math.max(this.planLevels[npcId] ?? 1, level);
        this.reconcileActiveMap('friendship-level-up');
      })
    );

    // Day/season rollover: re-roll crops (day) and re-seed patch shapes
    // (season) when the clock moves — and clear out-of-season beds in spring.
    this.unsubscribers.push(
      eventBus.on(GameEvent.TIME_CHANGED, () => {
        const time = TimeManager.getCurrentTime();
        const seasonChanged = this.lastSeenSeason !== null && this.lastSeenSeason !== time.season;
        const dayChanged = this.lastSeenDay !== null && this.lastSeenDay !== time.totalDays;
        this.lastSeenSeason = time.season;
        this.lastSeenDay = time.totalDays;
        if (seasonChanged || dayChanged) {
          this.reconcileActiveMap(seasonChanged ? 'season-changed' : 'day-changed');
        }
      })
    );
  }

  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.initialised = false;
  }

  /** Called from App.tsx whenever the player enters a map. */
  setActiveMap(mapId: string): void {
    this.activeMapId = mapId;
    this.reconcileMap(mapId, 'map-entered');
  }

  /**
   * The player asked a gardener to plant something (or asked her to stop).
   * Written to the global plan (last writer wins) and to the local fallback
   * so the request survives offline reloads. Takes effect on the next
   * reconcile — immediate for the requesting player.
   */
  setRequest(npcId: string, cropId: string | null): void {
    const gardener = getGardener(npcId);
    if (!gardener) return;

    this.planRequests[npcId] = cropId;
    this.saveLocalRequest(npcId, cropId);

    void getNpcGardenService().reportGardenProgress(
      npcId,
      this.getEffectiveLevel(npcId),
      cropId
    );

    this.reconcileMap(gardener.mapId, 'request-set');
  }

  /** Info for the "Admire" interaction on an NPC-tended tile. */
  getNpcPlantAt(mapId: string, x: number, y: number): { npcId: string; cropId: string } | null {
    const plot = farmManager.getPlot(mapId, { x, y });
    if (!plot?.plantedByNpc || !plot.cropType) return null;
    return { npcId: plot.plantedByNpc, cropId: plot.cropType };
  }

  /**
   * Compare target vs actual and plant what's missing. Cheap: bounded by the
   * map's public tile count, and idempotent — reconciling twice changes
   * nothing, and two clients reconciling the same tile write the same crop
   * with near-identical back-dated timestamps.
   */
  reconcileMap(mapId: string, reason: string): void {
    const time = TimeManager.getCurrentTime();
    const nowMs = Date.now();
    const isWinter = time.season === Season.WINTER;

    const effectiveLevels: Record<string, number> = {};
    const requests: Record<string, string | null> = {};
    for (const gardener of getGardenersForMap(mapId)) {
      effectiveLevels[gardener.npcId] = this.getEffectiveLevel(gardener.npcId);
      requests[gardener.npcId] = this.getRequest(gardener.npcId);
    }

    const targets = computeGardenTarget(mapId, {
      season: time.season,
      seasonSlot: seasonSlotAt(time.totalDays),
      daySlot: time.totalDays,
      effectiveLevels,
      requests,
    });

    let planted = 0;
    for (const target of targets) {
      const plot = farmManager.getPlot(mapId, { x: target.x, y: target.y });

      if (isTileEligibleForNpcPlanting(plot, nowMs, this.reclaimGraceMs)) {
        if (
          farmManager.plantNpcPlot(
            mapId,
            { x: target.x, y: target.y },
            target.cropId,
            target.npcId,
            target.plantedAt
          )
        ) {
          planted++;
        }
        continue;
      }

      // Requests take over a gardener's own non-ready plants within the day —
      // ripening crops are left for picking, and herb beds keep their own
      // lifecycle (they convert when the herb is finally removed).
      if (
        plot?.plantedByNpc === target.npcId &&
        plot.cropType !== target.cropId &&
        target.cropId === requests[target.npcId] &&
        (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED)
      ) {
        if (
          farmManager.plantNpcPlot(
            mapId,
            { x: target.x, y: target.y },
            target.cropId,
            target.npcId,
            nowMs
          )
        ) {
          planted++;
        }
        continue;
      }

      // Seasonal bed-clearing: an NPC plot still holding a crop that cannot
      // be planted in the current season is cleared and replanted (unless it
      // is READY — that one waits to be picked, then converts on replant).
      // Never in winter: the winter beds are deliberately out-of-season
      // (hardy favourites), and spring's arrival re-seeds them anyway.
      if (
        !isWinter &&
        plot?.plantedByNpc &&
        plot.cropType &&
        !canPlantInSeason(plot.cropType, time.season) &&
        (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED)
      ) {
        if (
          farmManager.plantNpcPlot(
            mapId,
            { x: target.x, y: target.y },
            target.cropId,
            target.npcId,
            nowMs
          )
        ) {
          planted++;
        }
      }
    }

    if (planted > 0) {
      debugLog('NpcGarden', `Reconciled ${mapId} (${reason}): planted ${planted} NPC plot(s)`);
    }
  }

  private reconcileActiveMap(reason: string): void {
    if (this.activeMapId) {
      this.reconcileMap(this.activeMapId, reason);
    }
  }

  /** Merge the synced Firestore plans into the local view (levels are maxes). */
  private mergePlans(plans: Map<string, { npcId: string; gardenLevel: number; requestedCrop: string | null }>): void {
    plans.forEach((plan, npcId) => {
      this.planLevels[npcId] = Math.max(this.planLevels[npcId] ?? 1, plan.gardenLevel);
      this.planRequests[npcId] = plan.requestedCrop ?? this.planRequests[npcId] ?? null;
    });
  }

  private loadLocalRequests(): void {
    try {
      const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
      if (raw) {
        this.localRequests = JSON.parse(raw) as Record<string, string | null>;
      }
    } catch {
      this.localRequests = {};
    }
  }

  private saveLocalRequest(npcId: string, cropId: string | null): void {
    try {
      const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
      const all = raw ? (JSON.parse(raw) as Record<string, string | null>) : {};
      all[npcId] = cropId;
      localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(all));
    } catch {
      // Safari private mode and friends — the in-memory value still works
      // for this session.
    }
  }
}

/**
 * NOTE: this is deliberately a small localStorage fallback, not a full
 * CharacterData domain — it holds only "which crop did I last request from
 * each gardener" for offline play, and every other piece of NPC-garden state
 * is either global (Firestore plan) or shared (farm plots). A domain would
 * add a GameState field + save-pipeline + cloud-save schema surface for one
 * JSON blob.
 */

export const npcGardenManager = new NpcGardenManager();