/**
 * FarmManager - Single Source of Truth for farm plot data
 *
 * Following SSoT principle: this is the ONLY place that manages farm plots.
 * All farm state queries and updates go through this manager.
 *
 * Uses TimeManager for all time calculations (game days/hours, not real time)
 */

import { FarmPlot, FarmPlotState, Position, TileType, CropGrowthStage } from '../types';
import { getCrop, canPlantInSeason, CropQuality, getNextQuality } from '../data/crops';
import { mapManager } from '../maps/MapManager';
import { TimeManager, Season } from './TimeManager';
import { inventoryManager } from './inventoryManager';
import { getSeedItemId, getCropItemId } from '../data/items';
import { getTileCoords } from './mapUtils';
import { GROWTH_THRESHOLDS, SHARED_FARM_MAP_IDS } from '../constants';
import { getWeatherZone, getWeatherForSlot, WEATHER_SLOT_HOURS } from '../data/weatherConfig';
import { eventBus, GameEvent } from './EventBus';
import { findRainWateringTimestamp } from './retroactiveRain';
import { reportMessage } from './errorReporting';
import { debugLog, isDebugLogEnabled } from './debugLog';

/** Interval for batch-flushing dirty shared plots to Firestore */
const SHARED_SYNC_INTERVAL_MS = 10_000;

/** How long to ignore Firestore echoes of our own writes (ms) */
const FLUSH_GRACE_PERIOD_MS = 15_000;

class FarmManager {
  private plots: Map<string, FarmPlot> = new Map(); // key: "mapId:x:y"

  // Shared farm batch sync state
  private dirtySharedPlots: Set<string> = new Set(); // plot keys that need Firestore write
  private recentlyFlushed: Map<string, number> = new Map(); // plot key → flush timestamp
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  // Last-observed growth stage per growing plot, used by checkGrowthStageTransitions()
  // to detect sub-stage crossings (see that method for why this exists).
  private lastKnownGrowthStages: Map<string, CropGrowthStage> = new Map();
  private sharedListenerUnsub: (() => void) | null = null;

  /**
   * Generate a unique key for a plot position
   */
  private getPlotKey(mapId: string, position: Position): string {
    const tile = getTileCoords(position);
    return `${mapId}:${tile.x}:${tile.y}`;
  }

  /**
   * Register a farm plot (or update existing one)
   */
  registerPlot(plot: FarmPlot): void {
    // Validate required fields
    if (!plot.mapId || !plot.position) {
      console.warn('[FarmManager] Invalid plot: missing mapId or position', plot);
      return;
    }

    // Validate state consistency - growing states require plantedAtTimestamp
    const growingStates = [
      FarmPlotState.PLANTED,
      FarmPlotState.WATERED,
      FarmPlotState.WILTING,
      FarmPlotState.READY,
      FarmPlotState.HERB_COOLDOWN,
      FarmPlotState.HERB_DORMANT,
    ];
    if (growingStates.includes(plot.state) && plot.plantedAtTimestamp === null) {
      console.warn('[FarmManager] Invalid plot: growing state without plantedAtTimestamp', plot);
    }

    const key = this.getPlotKey(plot.mapId, plot.position);
    this.plots.set(key, plot);
  }

  /**
   * Get a farm plot at a specific position
   */
  getPlot(mapId: string, position: Position): FarmPlot | undefined {
    const key = this.getPlotKey(mapId, position);
    return this.plots.get(key);
  }

  /**
   * Get all plots for a specific map
   */
  getPlotsForMap(mapId: string): FarmPlot[] {
    return Array.from(this.plots.values()).filter((plot) => plot.mapId === mapId);
  }

  /**
   * Get all plots (for save/load)
   */
  getAllPlots(): FarmPlot[] {
    return Array.from(this.plots.values());
  }

  /**
   * Load plots from saved data
   */
  loadPlots(plots: FarmPlot[]): void {
    this.plots.clear();
    plots.forEach((plot) => this.registerPlot(plot));
  }

  /**
   * Update all farm plots for the current time
   * Called when player enters a map and periodically
   */
  updateAllPlots(): void {
    // Replay rain that fell while the game was closed BEFORE evaluating decay,
    // so a crop the weather actually saved is never marked dead first.
    this.applyRetroactiveRainWatering();

    const currentGameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    const updated: FarmPlot[] = [];
    let diedCount = 0;

    for (const plot of this.plots.values()) {
      const updatedPlot = this.calculatePlotState(
        plot,
        currentGameTime.totalDays,
        currentGameTime.totalHours,
        now
      );
      if (updatedPlot !== plot) {
        if (updatedPlot.state === FarmPlotState.DEAD && plot.state !== FarmPlotState.DEAD) {
          diedCount++;
        }
        this.registerPlot(updatedPlot);
        updated.push(updatedPlot);
      }
    }

    if (updated.length > 0) {
      debugLog('FarmManager', `Updated ${updated.length} plots`);
      // Emit a single event for all crop growth updates
      eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {});
    }

    // Death is otherwise silent — bare soil gives no hint anything was there.
    // One batched event per pass (e.g. everything that died while away), not
    // one per plot.
    if (diedCount > 0) {
      eventBus.emit(GameEvent.FARM_CROPS_DIED, { count: diedCount });
    }
  }

  /**
   * Water plots that rain reached while the game was closed.
   *
   * Game time and weather are deterministic and keep running while the game is
   * shut, but the live rain-watering only runs while the game is open — so
   * crops could die overnight despite pouring rain. This replays completed
   * weather slots from each plot's last watering (see utils/retroactiveRain.ts)
   * and applies the same watering the live manager would have. Timestamp-based
   * so all players agree on shared farm plots.
   *
   * @param isWetSlot injectable for tests; defaults to the real deterministic
   *        weather (rain and storm water crops, snow does not).
   */
  applyRetroactiveRainWatering(
    isWetSlot: (slotIndex: number, season: Season) => boolean = (slot, season) => {
      const weather = getWeatherForSlot(slot, season);
      return weather === 'rain' || weather === 'storm';
    }
  ): number {
    const gameTime = TimeManager.getCurrentTime();
    const currentSlotIndex = Math.floor(gameTime.totalHours / WEATHER_SLOT_HOURS);
    const msPerSlot = WEATHER_SLOT_HOURS * TimeManager.MS_PER_GAME_HOUR;
    let wateredCount = 0;

    for (const plot of this.plots.values()) {
      // Only growing crops benefit from rain; indoor/cave maps never see it.
      if (
        plot.state !== FarmPlotState.PLANTED &&
        plot.state !== FarmPlotState.WATERED &&
        plot.state !== FarmPlotState.WILTING
      ) {
        continue;
      }
      if (getWeatherZone(plot.mapId) === 'indoor' || getWeatherZone(plot.mapId) === 'cave') {
        continue;
      }
      const crop = plot.cropType ? getCrop(plot.cropType) : null;
      if (!crop || plot.lastWateredTimestamp === null) {
        continue;
      }

      const result = findRainWateringTimestamp({
        lastWateredMs: plot.lastWateredTimestamp,
        deathWindowMs: crop.waterNeededInterval + crop.wiltingGracePeriod + crop.deathGracePeriod,
        currentSlotIndex,
        msPerSlot,
        gameStartMs: TimeManager.GAME_START_DATE,
        seasonForSlot: (slot) => TimeManager.seasonAtTotalHours(slot * WEATHER_SLOT_HOURS),
        isWetSlot,
      });
      if (!result) {
        continue;
      }

      // Rain revives wilting crops back to WATERED, matching waterAllOutdoorPlots.
      const slotTime = TimeManager.getTimeForTimestamp(result.wateredAtMs);
      this.registerPlot({
        ...plot,
        state: FarmPlotState.WATERED,
        lastWateredDay: slotTime.totalDays,
        lastWateredHour: slotTime.hour,
        lastWateredTimestamp: result.wateredAtMs,
      });
      wateredCount++;
    }

    if (wateredCount > 0) {
      debugLog('FarmManager', `Retroactive rain watered ${wateredCount} plots`);
      eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { action: 'water' });
    }
    return wateredCount;
  }

  /**
   * Calculate what state a plot should be in based on real time
   * This is the core logic - all state transitions happen here
   */
  private calculatePlotState(
    plot: FarmPlot,
    currentDay: number,
    currentHour: number,
    now: number
  ): FarmPlot {
    // States that don't auto-transition
    if (plot.state === FarmPlotState.FALLOW || plot.state === FarmPlotState.TILLED) {
      return plot;
    }

    // Herb dormancy/cooldown transitions (handled before crop data lookup)
    if (
      plot.state === FarmPlotState.HERB_COOLDOWN ||
      plot.state === FarmPlotState.HERB_DORMANT ||
      plot.state === FarmPlotState.READY
    ) {
      const herbCrop = plot.cropType ? getCrop(plot.cropType) : null;
      if (herbCrop?.isHerb) {
        const isWinter = TimeManager.getCurrentTime().season === Season.WINTER;

        // READY herb → dormant when winter begins
        if (plot.state === FarmPlotState.READY && isWinter) {
          return {
            ...plot,
            state: FarmPlotState.HERB_DORMANT,
            stateChangedAtDay: currentDay,
            stateChangedAtHour: currentHour,
            stateChangedAtTimestamp: now,
          };
        }

        // HERB_DORMANT → READY when winter ends
        if (plot.state === FarmPlotState.HERB_DORMANT && !isWinter) {
          return {
            ...plot,
            state: FarmPlotState.READY,
            stateChangedAtDay: currentDay,
            stateChangedAtHour: currentHour,
            stateChangedAtTimestamp: now,
          };
        }

        // HERB_COOLDOWN → READY (or DORMANT if winter) when cooldown expires
        if (plot.state === FarmPlotState.HERB_COOLDOWN) {
          const cooldownMs = (herbCrop.harvestCooldownDays ?? 1) * TimeManager.MS_PER_GAME_DAY;
          // Treat missing timestamp as already expired (handles old save data)
          const elapsed =
            plot.harvestedAtTimestamp != null ? now - plot.harvestedAtTimestamp : cooldownMs;
          if (elapsed >= cooldownMs) {
            return {
              ...plot,
              state: isWinter ? FarmPlotState.HERB_DORMANT : FarmPlotState.READY,
              stateChangedAtDay: currentDay,
              stateChangedAtHour: currentHour,
              stateChangedAtTimestamp: now,
            };
          }
          return plot;
        }

        // READY non-winter herb: no further transitions needed
        if (plot.state === FarmPlotState.READY) {
          return plot;
        }
      }
    }

    // States that need crop data
    if (!plot.cropType) {
      console.warn('[FarmManager] Plot has no crop type but is in growing state', plot);
      return plot;
    }

    const crop = getCrop(plot.cropType);
    if (!crop) {
      console.warn('[FarmManager] Unknown crop type:', plot.cropType);
      return plot;
    }

    // Calculate time since planted (in milliseconds, using real timestamps)
    const msSincePlanted = plot.plantedAtTimestamp !== null ? now - plot.plantedAtTimestamp : 0;

    // Calculate time since watered (in milliseconds)
    const msSinceWatered =
      plot.lastWateredTimestamp !== null ? now - plot.lastWateredTimestamp : Infinity;

    // Check if plant should be dead
    if (plot.state === FarmPlotState.WILTING) {
      const msSinceStateChange = now - plot.stateChangedAtTimestamp;
      if (msSinceStateChange >= crop.deathGracePeriod) {
        debugLog('FarmManager', `Crop died at ${plot.position.x},${plot.position.y}`);
        return {
          ...plot,
          state: FarmPlotState.DEAD,
          stateChangedAtDay: currentDay,
          stateChangedAtHour: currentHour,
          stateChangedAtTimestamp: now,
        };
      }
    }

    // Check if plant should be wilting
    if (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED) {
      const needsWater = msSinceWatered > crop.waterNeededInterval;
      if (needsWater) {
        const msSinceNeeded = msSinceWatered - crop.waterNeededInterval;
        if (msSinceNeeded >= crop.wiltingGracePeriod) {
          debugLog('FarmManager', `Crop wilting at ${plot.position.x},${plot.position.y}`);
          return {
            ...plot,
            state: FarmPlotState.WILTING,
            stateChangedAtDay: currentDay,
            stateChangedAtHour: currentHour,
            stateChangedAtTimestamp: now,
          };
        }
      }
    }

    // Check if plant is ready to harvest
    // DESIGN NOTE: Wilting crops CAN still mature and become harvestable. This is
    // intentional forgiving gameplay - players can salvage neglected crops if they
    // mature before the deathGracePeriod expires. The crop still dies if not
    // harvested in time, but this gives a window of opportunity.
    if (
      plot.state === FarmPlotState.PLANTED ||
      plot.state === FarmPlotState.WATERED ||
      plot.state === FarmPlotState.WILTING
    ) {
      const isWatered = msSinceWatered < crop.waterNeededInterval;
      const growthTime = isWatered ? crop.growthTimeWatered : crop.growthTime;

      if (msSincePlanted >= growthTime) {
        debugLog('FarmManager', `Crop ready at ${plot.position.x},${plot.position.y}`);
        return {
          ...plot,
          state: FarmPlotState.READY,
          stateChangedAtDay: currentDay,
          stateChangedAtHour: currentHour,
          stateChangedAtTimestamp: now,
        };
      }
    }

    return plot;
  }

  /**
   * Till a fallow soil tile
   */
  tillSoil(mapId: string, position: Position): boolean {
    const key = this.getPlotKey(mapId, position);
    const existing = this.plots.get(key);

    debugLog(
      'FarmManager',
      `tillSoil called: mapId=${mapId}, position=(${position.x},${position.y}), existing=${existing ? `state=${FarmPlotState[existing.state]}` : 'none'}`
    );

    // Can only till fallow soil or create new plots
    if (existing && existing.state !== FarmPlotState.FALLOW) {
      console.warn(
        `[FarmManager] Cannot till: plot already exists with state ${FarmPlotState[existing.state]}`
      );
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    const tile = getTileCoords(position);
    const plot: FarmPlot = {
      mapId,
      position: tile,
      state: FarmPlotState.TILLED,
      cropType: null,
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
      plantedAtTimestamp: null,
      lastWateredTimestamp: null,
      stateChangedAtTimestamp: now,
      quality: 'normal',
      fertiliserApplied: false,
    };

    this.registerPlot(plot);
    debugLog('FarmManager', `Tilled soil at ${position.x},${position.y}`);
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: tile, action: 'till' });
    this.syncSharedPlot(mapId, position);
    return true;
  }

  /**
   * Plant seeds in tilled soil
   * Requires player to have seeds in inventory (consumes 1 seed)
   * Enforces seasonal planting restrictions
   */
  plantSeed(
    mapId: string,
    position: Position,
    cropId: string,
    seedItemId: string
  ): { success: boolean; reason?: string } {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.TILLED) {
      return { success: false, reason: 'Soil must be tilled first' };
    }

    const crop = getCrop(cropId);
    if (!crop) {
      console.warn('[FarmManager] Unknown crop:', cropId);
      return { success: false, reason: 'Unknown crop type' };
    }

    // Check seasonal restrictions
    const gameTime = TimeManager.getCurrentTime();
    if (!canPlantInSeason(cropId, gameTime.season)) {
      const seasonNames = crop.plantSeasons.map((s) => s).join(', ');
      console.warn(
        `[FarmManager] Cannot plant ${cropId} in ${gameTime.season} (only: ${seasonNames})`
      );
      return {
        success: false,
        reason: `${crop.displayName} can only be planted in ${seasonNames}`,
      };
    }

    // Check if player has the specific seed item
    if (!inventoryManager.hasItem(seedItemId, 1)) {
      console.warn(`[FarmManager] Not enough seeds: ${seedItemId} for crop ${cropId}`);
      return { success: false, reason: 'No seeds available' };
    }

    // Consume seed from inventory
    if (!inventoryManager.removeItem(seedItemId, 1)) {
      console.warn(`[FarmManager] Failed to consume seed: ${seedItemId}`);
      return { success: false, reason: 'Failed to use seed' };
    }

    const now = Date.now();
    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.PLANTED,
      cropType: cropId,
      plantedAtDay: gameTime.totalDays,
      plantedAtHour: gameTime.hour,
      lastWateredDay: gameTime.totalDays, // Planting counts as initial watering
      lastWateredHour: gameTime.hour,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
      plantedAtTimestamp: now,
      lastWateredTimestamp: now, // Planting counts as initial watering
      stateChangedAtTimestamp: now,
      quality: 'normal', // Default quality
      fertiliserApplied: false,
    };

    this.registerPlot(updatedPlot);
    debugLog(
      'FarmManager',
      `Planted ${cropId} at ${position.x},${position.y} in ${gameTime.season} (used 1 seed)`
    );
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'plant' });
    this.syncSharedPlot(mapId, position);
    return { success: true };
  }

  /**
   * Check if a crop can be planted in the current season
   */
  canPlantCropNow(cropId: string): boolean {
    const gameTime = TimeManager.getCurrentTime();
    return canPlantInSeason(cropId, gameTime.season);
  }

  /**
   * Get the current season
   */
  getCurrentSeason(): Season {
    return TimeManager.getCurrentTime().season;
  }

  /**
   * Water a planted crop
   */
  waterPlot(mapId: string, position: Position): boolean {
    const plot = this.getPlot(mapId, position);
    if (!plot) {
      return false;
    }

    // Can water tilled soil (pre-moisten), planted, watered, wilting, or ready crops
    // (watering tilled/ready doesn't change state, but updates water timer)
    if (
      plot.state !== FarmPlotState.TILLED &&
      plot.state !== FarmPlotState.PLANTED &&
      plot.state !== FarmPlotState.WATERED &&
      plot.state !== FarmPlotState.WILTING &&
      plot.state !== FarmPlotState.READY
    ) {
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();

    // Tilled and ready soil keep their state, planted/wilting become watered
    const newState =
      plot.state === FarmPlotState.TILLED || plot.state === FarmPlotState.READY
        ? plot.state
        : FarmPlotState.WATERED;

    const updatedPlot: FarmPlot = {
      ...plot,
      state: newState,
      lastWateredDay: gameTime.totalDays,
      lastWateredHour: gameTime.hour,
      stateChangedAtDay: plot.state === newState ? plot.stateChangedAtDay : gameTime.totalDays,
      stateChangedAtHour: plot.state === newState ? plot.stateChangedAtHour : gameTime.hour,
      lastWateredTimestamp: now,
      stateChangedAtTimestamp: plot.state === newState ? plot.stateChangedAtTimestamp : now,
    };

    this.registerPlot(updatedPlot);
    debugLog('FarmManager', `Watered crop at ${position.x},${position.y}`);
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'water' });
    this.syncSharedPlot(mapId, position);
    return true;
  }

  /**
   * Revive a wilting or dead crop back to a healthy, watered state.
   * Unlike waterPlot(), this also handles DEAD plots — a dead crop's cropType and
   * plantedAtTimestamp are still intact (only its state changed), so reviving it
   * just needs to clear the death and treat it as freshly watered.
   */
  reviveCrop(mapId: string, position: Position): boolean {
    const plot = this.getPlot(mapId, position);
    if (!plot || (plot.state !== FarmPlotState.WILTING && plot.state !== FarmPlotState.DEAD)) {
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();

    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.WATERED,
      lastWateredDay: gameTime.totalDays,
      lastWateredHour: gameTime.hour,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
      lastWateredTimestamp: now,
      stateChangedAtTimestamp: now,
    };

    this.registerPlot(updatedPlot);
    debugLog('FarmManager', `Revived crop at ${position.x},${position.y}`);
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'revive' });
    this.syncSharedPlot(mapId, position);
    return true;
  }

  /**
   * Apply fertiliser to a growing crop
   * Requires player to have fertiliser in inventory (consumes 1)
   * Improves final crop quality when harvested
   */
  applyFertiliser(mapId: string, position: Position): { success: boolean; reason?: string } {
    const plot = this.getPlot(mapId, position);
    if (!plot) {
      return { success: false, reason: 'No plot here' };
    }

    // Can only fertilise planted/watered/wilting crops (not ready/dead/fallow/tilled)
    if (
      plot.state !== FarmPlotState.PLANTED &&
      plot.state !== FarmPlotState.WATERED &&
      plot.state !== FarmPlotState.WILTING
    ) {
      return { success: false, reason: 'Can only fertilise growing crops' };
    }

    // Check if already fertilised
    if (plot.fertiliserApplied) {
      return { success: false, reason: 'Already fertilised' };
    }

    // Check if player has fertiliser
    if (!inventoryManager.hasItem('fertiliser', 1)) {
      return { success: false, reason: 'No fertiliser available' };
    }

    // Consume fertiliser from inventory
    if (!inventoryManager.removeItem('fertiliser', 1)) {
      return { success: false, reason: 'Failed to use fertiliser' };
    }

    // Determine new quality using progression helper
    const newQuality = getNextQuality(plot.quality as CropQuality);

    const updatedPlot: FarmPlot = {
      ...plot,
      fertiliserApplied: true,
      quality: newQuality,
    };

    this.registerPlot(updatedPlot);
    debugLog(
      'FarmManager',
      `Applied fertiliser at ${position.x},${position.y}, quality now ${newQuality}`
    );
    return { success: true };
  }

  /**
   * Get the quality of a plot's crop
   */
  getPlotQuality(mapId: string, position: Position): 'normal' | 'good' | 'excellent' | null {
    const plot = this.getPlot(mapId, position);
    if (!plot || !plot.cropType) return null;
    return plot.quality;
  }

  /**
   * Harvest a ready crop
   * Adds harvested crops to inventory
   * Also gives 1-3 random seeds back
   * Quality affects sell value (tracked in inventory as item metadata)
   * Returns the crop ID, yield, quality, and seeds dropped
   */
  harvestCrop(
    mapId: string,
    position: Position
  ): {
    cropId: string;
    yield: number;
    seedsDropped: number;
    quality: 'normal' | 'good' | 'excellent';
  } | null {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.READY || !plot.cropType) {
      return null;
    }

    const crop = getCrop(plot.cropType);
    if (!crop) {
      return null;
    }

    // Get quality before reset
    const quality = plot.quality;

    // Add harvested crops to inventory
    const cropItemId = getCropItemId(plot.cropType);
    inventoryManager.addItem(cropItemId, crop.harvestYield);

    // Add seed drops (max if abundantHarvest blessing active, otherwise random)
    const seedsDropped = plot.abundantHarvest
      ? crop.seedDropMax
      : Math.floor(Math.random() * (crop.seedDropMax - crop.seedDropMin + 1)) + crop.seedDropMin;
    if (seedsDropped > 0) {
      const seedItemId = getSeedItemId(plot.cropType);
      inventoryManager.addItem(seedItemId, seedsDropped);
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();

    let updatedPlot: FarmPlot;
    if (crop.isHerb) {
      // Herbs persist after harvest — enter cooldown, plot stays occupied.
      // Unlike annual crops, herbs never pass back through till()/plantSeed() (the only
      // other places these boosts get cleared), so they must be reset here or a single
      // fertiliser/blessing application would compound into a permanent bonus on every
      // future harvest of the same plant.
      updatedPlot = {
        ...plot,
        state: FarmPlotState.HERB_COOLDOWN,
        stateChangedAtDay: gameTime.totalDays,
        stateChangedAtHour: gameTime.hour,
        stateChangedAtTimestamp: now,
        harvestedAtTimestamp: now,
        quality: 'normal',
        fertiliserApplied: false,
        abundantHarvest: false,
      };
    } else {
      // Normal crops reset to fallow
      updatedPlot = {
        ...plot,
        state: FarmPlotState.FALLOW,
        cropType: null,
        plantedAtDay: null,
        plantedAtHour: null,
        lastWateredDay: null,
        lastWateredHour: null,
        stateChangedAtDay: gameTime.totalDays,
        stateChangedAtHour: gameTime.hour,
        plantedAtTimestamp: null,
        lastWateredTimestamp: null,
        stateChangedAtTimestamp: now,
        quality: 'normal', // Reset quality
        fertiliserApplied: false, // Reset fertiliser
      };
    }

    this.registerPlot(updatedPlot);
    if (isDebugLogEnabled('FarmManager')) {
      const qualityStr = quality !== 'normal' ? ` (${quality} quality)` : '';
      const seedsInfo = seedsDropped > 0 ? ` + ${seedsDropped}x seeds` : '';
      const herbInfo = crop.isHerb ? ' (herb — plot persists, in cooldown)' : '';
      debugLog(
        'FarmManager',
        `Harvested ${crop.harvestYield}x ${crop.displayName}${qualityStr}${seedsInfo}${herbInfo} at ${position.x},${position.y}`
      );
    }
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'harvest' });
    eventBus.emit(GameEvent.FARM_CROP_HARVESTED, {
      mapId,
      cropId: plot.cropType,
      position: plot.position,
    });

    // On the shared farm, settle the race with the other players who might have
    // clicked this same ripe crop. The grant above is deliberately optimistic —
    // blocking on a round-trip would put a visible stall on every harvest in a
    // game whose whole appeal is unhurried — so the cost falls entirely on the
    // rare collision, which is rolled back below.
    this.claimSharedHarvest(mapId, position, plot, updatedPlot, {
      cropItemId,
      cropYield: crop.harvestYield,
      seedItemId: seedsDropped > 0 ? getSeedItemId(plot.cropType) : null,
      seedsDropped,
      cropDisplayName: crop.displayName,
    });

    return {
      cropId: plot.cropType,
      yield: crop.harvestYield,
      seedsDropped,
      quality,
    };
  }

  /**
   * Settle a contested harvest on the shared farm.
   *
   * Fire-and-forget: the caller has already granted the crop and moved on. If
   * the claim transaction proves another player got there first, this puts
   * everything back — items removed, plot restored — and emits
   * FARM_HARVEST_CONTESTED so the UI can say so.
   */
  private claimSharedHarvest(
    mapId: string,
    position: Position,
    plotBefore: FarmPlot,
    plotAfter: FarmPlot,
    granted: {
      cropItemId: string;
      cropYield: number;
      seedItemId: string | null;
      seedsDropped: number;
      cropDisplayName: string;
    }
  ): void {
    if (!SHARED_FARM_MAP_IDS.has(mapId)) return;

    const plotId = this.getPlotKey(mapId, position);

    void (async () => {
      try {
        const { getCommunityGardenService } = await import('../firebase/safe');
        const service = getCommunityGardenService();
        // The claim is settled on the planting, not on the stored state: a crop
        // that ripened since its last flush still reads WATERED remotely, and
        // comparing states made every such harvest look like a lost race.
        const won = await service.claimPlot(
          plotId,
          {
            cropType: plotBefore.cropType,
            plantedAtTimestamp: plotBefore.plantedAtTimestamp,
            knownRemote: service.getRemotePlots().has(plotId),
          },
          plotAfter
        );

        if (won) {
          // Our write went out inside the transaction; mark it flushed so the
          // snapshot echo does not overwrite the plot we just harvested.
          this.recentlyFlushed.set(plotId, Date.now());
          return;
        }

        // Lost the race — take the crop back and restore the plot.
        inventoryManager.removeItem(granted.cropItemId, granted.cropYield);
        if (granted.seedItemId && granted.seedsDropped > 0) {
          inventoryManager.removeItem(granted.seedItemId, granted.seedsDropped);
        }
        this.registerPlot({ ...plotBefore });
        this.dirtySharedPlots.delete(plotId);

        debugLog('SharedFarm', `Lost the race for ${plotId} — harvest rolled back`);
        eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position, action: 'harvest' });
        eventBus.emit(GameEvent.FARM_HARVEST_CONTESTED, {
          mapId,
          position,
          cropDisplayName: granted.cropDisplayName,
        });
      } catch (error) {
        // A failure here means we could not prove a loss, so the player keeps
        // the crop. Falling back to the batch flush keeps the plot converging.
        console.warn(`[SharedFarm] Claim failed for ${plotId} — keeping harvest:`, error);
        this.syncSharedPlot(mapId, position);
      }
    })();
  }

  /**
   * Remove a herb plot, clearing it back to fallow.
   * Available for READY, HERB_COOLDOWN, and HERB_DORMANT states.
   */
  removeHerb(mapId: string, position: Position): boolean {
    const plot = this.getPlot(mapId, position);
    if (
      !plot ||
      (plot.state !== FarmPlotState.READY &&
        plot.state !== FarmPlotState.HERB_COOLDOWN &&
        plot.state !== FarmPlotState.HERB_DORMANT)
    ) {
      return false;
    }

    const crop = plot.cropType ? getCrop(plot.cropType) : null;
    if (!crop?.isHerb) {
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.FALLOW,
      cropType: null,
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
      plantedAtTimestamp: null,
      lastWateredTimestamp: null,
      stateChangedAtTimestamp: now,
      harvestedAtTimestamp: null,
      quality: 'normal',
      fertiliserApplied: false,
    };

    this.registerPlot(updatedPlot);
    debugLog('FarmManager', `Removed herb at ${position.x},${position.y}`);
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'clear' });
    this.syncSharedPlot(mapId, position);
    return true;
  }

  /**
   * Harvest a dual-harvest crop in a specific mode (flowers or seeds).
   * Used for crops like sunflowers that offer a choice between picking flowers or harvesting seeds.
   */
  harvestCropWithMode(
    mapId: string,
    position: Position,
    mode: 'flowers' | 'seeds'
  ): {
    cropId: string;
    yield: number;
    seedsDropped: number;
    quality: 'normal' | 'good' | 'excellent';
  } | null {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.READY || !plot.cropType) {
      return null;
    }

    const crop = getCrop(plot.cropType);
    if (!crop || !crop.dualHarvest) {
      return null;
    }

    const quality = plot.quality;
    const dh = crop.dualHarvest;

    let cropYield = 0;
    let seedsDropped = 0;

    if (mode === 'flowers') {
      cropYield = dh.flowerOption.cropYield;
      seedsDropped = dh.flowerOption.seedYield;
    } else {
      cropYield = dh.seedOption.cropYield;
      // Respect abundantHarvest potion: give max seeds if active
      seedsDropped = plot.abundantHarvest
        ? Math.max(dh.seedOption.seedYield, crop.seedDropMax)
        : dh.seedOption.seedYield;
    }

    // Add items to inventory
    if (cropYield > 0) {
      // Use flowerItemId if specified (e.g. decoration_sunflower_bouquet), otherwise default crop item
      const cropItemId =
        mode === 'flowers' && dh.flowerOption.flowerItemId
          ? dh.flowerOption.flowerItemId
          : getCropItemId(plot.cropType);
      inventoryManager.addItem(cropItemId, cropYield);
    }
    if (seedsDropped > 0) {
      const seedItemId = getSeedItemId(plot.cropType);
      inventoryManager.addItem(seedItemId, seedsDropped);
    }

    // Reset plot to fallow
    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.FALLOW,
      cropType: null,
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
      plantedAtTimestamp: null,
      lastWateredTimestamp: null,
      stateChangedAtTimestamp: now,
      quality: 'normal',
      fertiliserApplied: false,
    };

    this.registerPlot(updatedPlot);
    if (isDebugLogEnabled('FarmManager')) {
      const qualityStr = quality !== 'normal' ? ` (${quality} quality)` : '';
      debugLog(
        'FarmManager',
        `Dual-harvest (${mode}): ${cropYield}x ${crop.displayName} + ${seedsDropped}x seeds${qualityStr} at ${position.x},${position.y}`
      );
    }
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'harvest' });
    eventBus.emit(GameEvent.FARM_CROP_HARVESTED, {
      mapId,
      cropId: plot.cropType,
      position: plot.position,
    });
    this.syncSharedPlot(mapId, position);

    return {
      cropId: plot.cropType,
      yield: cropYield,
      seedsDropped,
      quality,
    };
  }

  /**
   * Clear a dead crop (returns plot to fallow state)
   */
  clearDeadCrop(mapId: string, position: Position): boolean {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.DEAD) {
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.FALLOW,
      cropType: null,
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
      plantedAtTimestamp: null,
      lastWateredTimestamp: null,
      stateChangedAtTimestamp: now,
      quality: 'normal', // Reset quality
      fertiliserApplied: false, // Reset fertiliser
    };

    this.registerPlot(updatedPlot);
    debugLog('FarmManager', `Cleared dead crop at ${position.x},${position.y}`);
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'clear' });
    this.syncSharedPlot(mapId, position);
    return true;
  }

  /**
   * Get the appropriate tile type for a farm plot's current state
   */
  getTileTypeForPlot(plot: FarmPlot): TileType {
    switch (plot.state) {
      case FarmPlotState.FALLOW:
        return TileType.SOIL_FALLOW;
      case FarmPlotState.TILLED:
        return TileType.SOIL_TILLED;
      case FarmPlotState.PLANTED:
        return TileType.SOIL_PLANTED;
      case FarmPlotState.WATERED:
        return TileType.SOIL_WATERED;
      case FarmPlotState.READY:
        return TileType.SOIL_READY;
      case FarmPlotState.WILTING:
        return TileType.SOIL_WILTING;
      case FarmPlotState.DEAD:
        return TileType.SOIL_DEAD;
      case FarmPlotState.HERB_COOLDOWN:
      case FarmPlotState.HERB_DORMANT:
        return TileType.SOIL_PLANTED; // Show plant on soil; sprite overridden by growth stage
      default:
        return TileType.SOIL_FALLOW;
    }
  }

  /**
   * Check if a tile position has a farm plot
   */
  hasPlot(mapId: string, position: Position): boolean {
    return this.getPlot(mapId, position) !== undefined;
  }

  /**
   * Calculate growth stage based on time elapsed
   * Returns SEEDLING (0-33%), YOUNG (33-66%), or ADULT (66-100%)
   */
  getGrowthStage(plot: FarmPlot): CropGrowthStage {
    if (!plot.cropType || plot.plantedAtTimestamp === null) {
      return CropGrowthStage.SEEDLING;
    }

    // If ready, wilting, dead, or herb post-harvest — show as adult
    if (
      plot.state === FarmPlotState.READY ||
      plot.state === FarmPlotState.WILTING ||
      plot.state === FarmPlotState.DEAD ||
      plot.state === FarmPlotState.HERB_COOLDOWN ||
      plot.state === FarmPlotState.HERB_DORMANT
    ) {
      return CropGrowthStage.ADULT;
    }

    const crop = getCrop(plot.cropType);
    if (!crop) {
      return CropGrowthStage.SEEDLING;
    }

    const now = Date.now();
    const elapsed = now - plot.plantedAtTimestamp;

    // Check if watered recently
    const isWatered =
      plot.lastWateredTimestamp !== null &&
      now - plot.lastWateredTimestamp < crop.waterNeededInterval;
    const totalGrowthTime = isWatered ? crop.growthTimeWatered : crop.growthTime;

    // Calculate growth progress (0 to 1)
    const progress = Math.min(1, elapsed / totalGrowthTime);

    // Herbs skip the young stage — go directly from seedling to adult
    if (crop.isHerb && progress >= GROWTH_THRESHOLDS.SEEDLING_TO_YOUNG) {
      return CropGrowthStage.ADULT;
    }

    // Return stage based on progress thresholds
    if (progress < GROWTH_THRESHOLDS.SEEDLING_TO_YOUNG) {
      return CropGrowthStage.SEEDLING;
    } else if (progress < GROWTH_THRESHOLDS.YOUNG_TO_ADULT) {
      return CropGrowthStage.YOUNG;
    } else {
      return CropGrowthStage.ADULT;
    }
  }

  /**
   * Detect growth-stage sub-boundary crossings (seedling→young→adult) for every
   * growing plot and emit FARM_CROP_GREW for each one that changed since the
   * last check.
   *
   * getGrowthStage() computes stage live from elapsed time, but crossing a
   * sub-stage boundary is NOT a plot state transition (PLANTED/WATERED/READY —
   * the only things that emit FARM_PLOT_CHANGED and trigger a tile re-render).
   * For a fast-growing crop the seedling window can be as short as ~30 real
   * seconds; if nothing else happens to trigger a re-render during that window,
   * the seedling sprite is skipped entirely and the plot appears to jump
   * straight from bare soil to young/adult (issue #16). Call this periodically
   * (see useEnvironmentController.ts) to guarantee one eventually fires.
   */
  checkGrowthStageTransitions(): void {
    const growingStates = new Set([FarmPlotState.PLANTED, FarmPlotState.WATERED]);

    for (const plot of this.plots.values()) {
      if (!growingStates.has(plot.state) || !plot.cropType) continue;

      const key = this.getPlotKey(plot.mapId, plot.position);
      const stage = this.getGrowthStage(plot);
      const previous = this.lastKnownGrowthStages.get(key);
      this.lastKnownGrowthStages.set(key, stage);

      if (previous !== undefined && previous !== stage) {
        eventBus.emit(GameEvent.FARM_CROP_GREW, { position: plot.position, stage });
      }
    }
  }

  /**
   * Get plot info for debugging
   */
  getPlotInfo(mapId: string, position: Position): string | null {
    const plot = this.getPlot(mapId, position);
    if (!plot) {
      return null;
    }

    const gameTime = TimeManager.getCurrentTime();
    const crop = plot.cropType ? getCrop(plot.cropType) : null;
    const lines = [`State: ${FarmPlotState[plot.state]}`];

    if (crop) {
      lines.push(`Crop: ${crop.displayName}`);
      if (plot.plantedAtDay !== null) {
        const daysSincePlanted = gameTime.totalDays - plot.plantedAtDay;
        const hoursSincePlanted =
          (gameTime.totalDays - plot.plantedAtDay) * 24 +
          (gameTime.hour - (plot.plantedAtHour || 0));
        lines.push(`Age: ${daysSincePlanted}d ${hoursSincePlanted % 24}h`);
      }
      if (plot.lastWateredDay !== null && plot.lastWateredHour !== null) {
        const hoursSinceWatered =
          (gameTime.totalDays - plot.lastWateredDay) * 24 + (gameTime.hour - plot.lastWateredHour);
        const daysSince = Math.floor(hoursSinceWatered / 24);
        const hoursRemaining = hoursSinceWatered % 24;
        lines.push(`Last watered: ${daysSince}d ${hoursRemaining}h ago`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Set quality of all growing crops on a map (for Quality Blessing potion)
   * @param mapId Map to affect (or undefined for all maps)
   * @param quality Target quality level
   * @returns Number of crops affected
   */
  setAllCropsQuality(mapId: string | undefined, quality: 'normal' | 'good' | 'excellent'): number {
    let affectedCount = 0;

    for (const plot of this.plots.values()) {
      // Skip if filtering by map and this plot isn't on it
      if (mapId && plot.mapId !== mapId) continue;

      // Only affect plots with growing crops (not fallow, tilled, or dead)
      if (
        plot.cropType &&
        (plot.state === FarmPlotState.PLANTED ||
          plot.state === FarmPlotState.WATERED ||
          plot.state === FarmPlotState.WILTING ||
          plot.state === FarmPlotState.READY)
      ) {
        const updatedPlot: FarmPlot = {
          ...plot,
          quality,
        };
        this.registerPlot(updatedPlot);
        affectedCount++;
      }
    }

    debugLog('FarmManager', `Set ${affectedCount} crops to ${quality} quality`);

    return affectedCount;
  }

  /**
   * Apply abundant harvest blessing to all growing crops on a map (for potion)
   * Guarantees maximum seed drops on harvest
   * @param mapId Map to affect (or undefined for all maps)
   * @returns Number of crops affected
   */
  applyAbundantHarvest(mapId: string | undefined): number {
    let affectedCount = 0;

    for (const plot of this.plots.values()) {
      // Skip if filtering by map and this plot isn't on it
      if (mapId && plot.mapId !== mapId) continue;

      // Only affect plots with growing crops
      if (
        plot.cropType &&
        (plot.state === FarmPlotState.PLANTED ||
          plot.state === FarmPlotState.WATERED ||
          plot.state === FarmPlotState.WILTING ||
          plot.state === FarmPlotState.READY)
      ) {
        const updatedPlot: FarmPlot = {
          ...plot,
          abundantHarvest: true,
        };
        this.registerPlot(updatedPlot);
        affectedCount++;
      }
    }

    debugLog('FarmManager', `Applied abundant harvest blessing to ${affectedCount} crops`);

    return affectedCount;
  }

  /**
   * Water all plots on outdoor maps (called when it's raining)
   * Only affects plots that can be watered (planted, watered, wilting states)
   * Indoor maps (seed shed, houses, etc.) are not affected
   * @returns Number of plots watered
   */
  waterAllOutdoorPlots(): number {
    let wateredCount = 0;
    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();

    for (const plot of this.plots.values()) {
      // Check if this plot's map is outdoor
      const zone = getWeatherZone(plot.mapId);
      if (zone === 'indoor' || zone === 'cave') {
        // Skip indoor and cave maps - rain doesn't reach them
        continue;
      }

      // Can water planted, watered (refresh timer), or wilting crops
      if (
        plot.state === FarmPlotState.PLANTED ||
        plot.state === FarmPlotState.WATERED ||
        plot.state === FarmPlotState.WILTING
      ) {
        // Planted and wilting crops transition to watered state
        const newState =
          plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WILTING
            ? FarmPlotState.WATERED
            : plot.state;

        const updatedPlot: FarmPlot = {
          ...plot,
          state: newState,
          lastWateredDay: gameTime.totalDays,
          lastWateredHour: gameTime.hour,
          lastWateredTimestamp: now,
          stateChangedAtDay: plot.state === newState ? plot.stateChangedAtDay : gameTime.totalDays,
          stateChangedAtHour: plot.state === newState ? plot.stateChangedAtHour : gameTime.hour,
          stateChangedAtTimestamp: plot.state === newState ? plot.stateChangedAtTimestamp : now,
        };

        this.registerPlot(updatedPlot);
        wateredCount++;
      }
    }

    if (wateredCount > 0) {
      debugLog('FarmManager', `Rain watered ${wateredCount} outdoor plots`);
      eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { action: 'water' });
    }

    return wateredCount;
  }

  // ============================================
  // Shared Farm Plot Sync (Village + Farm Area)
  // ============================================

  /**
   * Purge local plots at positions that are no longer SOIL_FALLOW in the map definition.
   * Marks orphaned plots dirty so they get cleared from Firestore on the next flush.
   * Called at sync start to clean up stale data after map edits.
   */
  private purgeOrphanedSharedPlots(mapId: string): void {
    const mapDef = mapManager.getMap(mapId);
    if (!mapDef) return;

    let purgedCount = 0;
    const now = Date.now();
    for (const [key, plot] of this.plots) {
      if (plot.mapId !== mapId) continue;
      if (plot.state === FarmPlotState.FALLOW) continue;

      const { x: tileX, y: tileY } = getTileCoords(plot.position);
      const baseTile = mapDef.grid[tileY]?.[tileX];

      if (baseTile !== TileType.SOIL_FALLOW) {
        // Position is no longer a farm tile — reset locally and queue Firestore deletion
        const fallenPlot: FarmPlot = {
          ...plot,
          state: FarmPlotState.FALLOW,
          cropType: null,
          plantedAtTimestamp: null,
          lastWateredTimestamp: null,
          stateChangedAtTimestamp: now,
        };
        this.plots.set(key, fallenPlot);
        this.dirtySharedPlots.add(key);
        purgedCount++;
        debugLog('SharedFarm', `Orphaned local plot queued for deletion: ${key}`);
      }
    }

    if (purgedCount > 0) {
      debugLog('SharedFarm', `Purged ${purgedCount} orphaned local plots from ${mapId}`);
      eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {});
    }
  }

  /**
   * Mark a shared farm plot as dirty for the next batch flush.
   * No-op if the plot's map is not in SHARED_FARM_MAP_IDS.
   */
  private syncSharedPlot(mapId: string, position: Position): void {
    if (!SHARED_FARM_MAP_IDS.has(mapId)) return;
    const key = this.getPlotKey(mapId, position);
    this.dirtySharedPlots.add(key);
    debugLog('SharedFarm', `Marked dirty: ${key}`);
  }

  /**
   * Start periodic batch sync for shared farm plots.
   * Call when entering a shared map (village, farm_area).
   * - Starts a 10s interval to flush dirty plots to Firestore
   * - Begins listening for remote changes from other players
   */
  async startSharedSync(): Promise<void> {
    if (this.flushInterval) return; // Already running

    // Purge any locally-loaded plots at positions that are no longer farm tiles
    // (handles stale data from locally-saved state after map edits)
    for (const sharedMapId of SHARED_FARM_MAP_IDS) {
      this.purgeOrphanedSharedPlots(sharedMapId);
    }

    // Start the flush interval
    this.flushInterval = setInterval(() => this.flushDirtyPlots(), SHARED_SYNC_INTERVAL_MS);
    debugLog('SharedFarm', `Started batch sync (${SHARED_SYNC_INTERVAL_MS / 1000}s interval)`);

    // Start real-time listener for remote changes
    try {
      const { getCommunityGardenService } = await import('../firebase/safe');
      const service = getCommunityGardenService();
      service.startListening();

      this.sharedListenerUnsub = service.onPlotsChanged((remotePlots) => {
        const now = Date.now();

        // Clean up expired entries from recentlyFlushed
        for (const [key, ts] of this.recentlyFlushed) {
          if (now - ts > FLUSH_GRACE_PERIOD_MS) this.recentlyFlushed.delete(key);
        }

        let applied = 0;
        let purged = 0;
        for (const [plotId, doc] of remotePlots) {
          const farmPlot = service.docToFarmPlot(doc);
          if (!farmPlot) continue;

          // Validate that this position is still a valid farm tile in the map definition.
          // If the map was edited to remove farm tiles here, delete the stale Firestore record.
          const mapDef = mapManager.getMap(farmPlot.mapId);
          if (mapDef) {
            const { x: tileX, y: tileY } = getTileCoords(farmPlot.position);
            const baseTile = mapDef.grid[tileY]?.[tileX];
            if (baseTile !== TileType.SOIL_FALLOW) {
              this.dirtySharedPlots.add(plotId);
              purged++;
              debugLog('SharedFarm', `Rejecting orphaned remote plot: ${plotId}`);
              continue;
            }
          }

          // Skip plots we're about to flush (still dirty)
          if (this.dirtySharedPlots.has(plotId)) continue;

          // Skip echoes of our own recent writes (grace period)
          if (this.recentlyFlushed.has(plotId)) continue;

          this.plots.set(plotId, farmPlot);
          applied++;
        }

        if (purged > 0) {
          debugLog(
            'SharedFarm',
            `Rejected ${purged} orphaned remote plots — queued for Firestore deletion`
          );
        }

        // Check for locally-known shared plots that were removed remotely
        for (const [key, plot] of this.plots) {
          if (!SHARED_FARM_MAP_IDS.has(plot.mapId)) continue;
          if (plot.state === FarmPlotState.FALLOW) continue;
          if (
            !remotePlots.has(key) &&
            !this.dirtySharedPlots.has(key) &&
            !this.recentlyFlushed.has(key)
          ) {
            plot.state = FarmPlotState.FALLOW;
            plot.cropType = null;
            plot.plantedAtTimestamp = null;
            plot.lastWateredTimestamp = null;
            plot.stateChangedAtTimestamp = Date.now();
            applied++;
          }
        }

        if (applied > 0) {
          debugLog('SharedFarm', `Applied ${applied} remote updates from other players`);
          eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { action: 'water' });
        }
      });
    } catch {
      debugLog('SharedFarm', 'Firebase not available — local-only mode');
    }
  }

  /**
   * Stop periodic batch sync. Flushes remaining dirty plots before stopping.
   * Call when leaving shared maps.
   */
  async stopSharedSync(): Promise<void> {
    if (!this.flushInterval) return; // Not running

    // Flush any remaining dirty plots
    await this.flushDirtyPlots();

    // Stop the interval
    clearInterval(this.flushInterval);
    this.flushInterval = null;

    // Stop the real-time listener
    if (this.sharedListenerUnsub) {
      this.sharedListenerUnsub();
      this.sharedListenerUnsub = null;
    }

    try {
      const { getCommunityGardenService } = await import('../firebase/safe');
      getCommunityGardenService().stopListening();
    } catch {
      // Firebase not available
    }

    debugLog('SharedFarm', 'Stopped batch sync');
  }

  /**
   * Flush all dirty shared plots to Firestore in a batch.
   */
  private async flushDirtyPlots(): Promise<void> {
    if (this.dirtySharedPlots.size === 0) return;

    try {
      const { getCommunityGardenService } = await import('../firebase/safe');
      const service = getCommunityGardenService();

      // Snapshot the dirty set but DON'T clear yet — keeps protection active during async writes
      const toFlush = new Set(this.dirtySharedPlots);
      const succeeded = new Set<string>();

      let written = 0;
      let cleared = 0;
      let failed = 0;
      const now = Date.now();
      for (const plotKey of toFlush) {
        const plot = this.plots.get(plotKey);
        if (!plot || plot.state === FarmPlotState.FALLOW) {
          const ok = await service.clearPlot(plotKey);
          if (ok) {
            cleared++;
            succeeded.add(plotKey);
          } else {
            failed++;
            console.warn(`[SharedFarm] Failed to clear plot ${plotKey} — will retry next flush`);
          }
        } else {
          const ok = await service.writePlot(plotKey, plot);
          if (ok) {
            written++;
            succeeded.add(plotKey);
          } else {
            failed++;
            console.warn(`[SharedFarm] Failed to write plot ${plotKey} — will retry next flush`);
          }
        }
        // Only suppress Firestore echoes for changes that actually reached the server —
        // a failed write stays dirty and must still be applied when it eventually lands.
        if (succeeded.has(plotKey)) {
          this.recentlyFlushed.set(plotKey, now);
        }
      }

      // Only clear the keys that actually succeeded — a failed write/clear stays in
      // dirtySharedPlots so the next flush retries it, instead of being silently dropped
      // (new dirty entries added during writes are unaffected either way).
      for (const plotKey of succeeded) {
        this.dirtySharedPlots.delete(plotKey);
      }

      if (written > 0 || cleared > 0) {
        debugLog('SharedFarm', `Flushed ${written} writes, ${cleared} clears to Firestore`);
      }
      if (failed > 0) {
        console.warn(`[SharedFarm] ${failed} plot write(s) failed and will be retried`);
        // Aggregate, not per-plot — a bad connection can fail many plots in
        // one flush cycle and this runs every 10s, so per-plot reporting
        // would spam the error budget for what's really one outage.
        reportMessage(`Shared farm flush: ${failed} plot write(s) failed`, 'shared_farm', {
          failed,
          written,
          cleared,
        });
      }
    } catch {
      debugLog('SharedFarm', 'Flush failed — Firebase not available');
    }
  }

  /**
   * Check if a map uses shared (global) farming.
   */
  isSharedFarmMap(mapId: string): boolean {
    return SHARED_FARM_MAP_IDS.has(mapId);
  }

  /**
   * Apply remote shared plot state to local plots.
   * Called when onSnapshot delivers updates from other players.
   */
  applySharedUpdate(mapId: string, remotePlot: FarmPlot): void {
    const key = `${mapId}:${remotePlot.position.x}:${remotePlot.position.y}`;
    this.plots.set(key, remotePlot);
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {
      position: remotePlot.position,
      action: 'water', // Generic action to trigger re-render
    });
  }

  /**
   * Remove a shared plot (remote player cleared/harvested it).
   */
  removeSharedPlot(mapId: string, x: number, y: number): void {
    const key = `${mapId}:${x}:${y}`;
    const existing = this.plots.get(key);
    if (existing) {
      existing.state = FarmPlotState.FALLOW;
      existing.cropType = null;
      existing.plantedAtTimestamp = null;
      existing.lastWateredTimestamp = null;
      existing.stateChangedAtTimestamp = Date.now();
      eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {
        position: { x, y },
        action: 'clear',
      });
    }
  }

  /**
   * Get only personal (non-shared) plots for saving to cloud.
   * Excludes plots on maps in SHARED_FARM_MAP_IDS.
   */
  getPersonalPlots(): FarmPlot[] {
    return Array.from(this.plots.values()).filter((plot) => !SHARED_FARM_MAP_IDS.has(plot.mapId));
  }

  /**
   * DEBUG: Advance time for farm plots by specified milliseconds
   * This rewinds timestamps to simulate time passing.
   * Pass mapId to scope the advance to a single map (e.g. a magic effect that should
   * only affect the player's current field) — omit it to affect every plot on every
   * map, as debug tooling intends.
   */
  debugAdvanceTime(milliseconds: number, mapId?: string): void {
    debugLog(
      'FarmManager',
      `Advancing time by ${milliseconds}ms${mapId ? ` (map: ${mapId})` : ''}`
    );

    for (const plot of this.plots.values()) {
      if (mapId !== undefined && plot.mapId !== mapId) continue;
      const updatedPlot = { ...plot };

      // Rewind timestamps (subtract time to make them "older")
      if (updatedPlot.plantedAtTimestamp !== null) {
        updatedPlot.plantedAtTimestamp -= milliseconds;
      }
      if (updatedPlot.lastWateredTimestamp !== null) {
        updatedPlot.lastWateredTimestamp -= milliseconds;
      }
      if (updatedPlot.stateChangedAtTimestamp) {
        updatedPlot.stateChangedAtTimestamp -= milliseconds;
      }

      this.registerPlot(updatedPlot);
    }

    // Trigger update to recalculate states
    this.updateAllPlots();
    debugLog('FarmManager', `Time advanced, plots updated`);
  }
}

// Singleton instance
export const farmManager = new FarmManager();
