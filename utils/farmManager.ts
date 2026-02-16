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
import { GROWTH_THRESHOLDS, DEBUG, SHARED_FARM_MAP_IDS } from '../constants';
import { getWeatherZone } from '../data/weatherConfig';
import { eventBus, GameEvent } from './EventBus';

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
    const currentGameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    const updated: FarmPlot[] = [];

    for (const plot of this.plots.values()) {
      const updatedPlot = this.calculatePlotState(
        plot,
        currentGameTime.totalDays,
        currentGameTime.totalHours,
        now
      );
      if (updatedPlot !== plot) {
        this.registerPlot(updatedPlot);
        updated.push(updatedPlot);
      }
    }

    if (updated.length > 0) {
      if (DEBUG.FARM) {
        console.log(`[FarmManager] Updated ${updated.length} plots`);
      }
      // Emit a single event for all crop growth updates
      eventBus.emit(GameEvent.FARM_PLOT_CHANGED, {});
    }
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
        if (DEBUG.FARM)
          console.log(`[FarmManager] Crop died at ${plot.position.x},${plot.position.y}`);
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
          if (DEBUG.FARM)
            console.log(`[FarmManager] Crop wilting at ${plot.position.x},${plot.position.y}`);
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
        if (DEBUG.FARM)
          console.log(`[FarmManager] Crop ready at ${plot.position.x},${plot.position.y}`);
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

    if (DEBUG.FARM)
      console.log(
        `[FarmManager] tillSoil called: mapId=${mapId}, position=(${position.x},${position.y}), existing=${existing ? `state=${FarmPlotState[existing.state]}` : 'none'}`
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
    if (DEBUG.FARM) console.log(`[FarmManager] Tilled soil at ${position.x},${position.y}`);
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
    if (DEBUG.FARM)
      console.log(
        `[FarmManager] Planted ${cropId} at ${position.x},${position.y} in ${gameTime.season} (used 1 seed)`
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
    if (DEBUG.FARM) console.log(`[FarmManager] Watered crop at ${position.x},${position.y}`);
    eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { position: plot.position, action: 'water' });
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
    if (DEBUG.FARM)
      console.log(
        `[FarmManager] Applied fertiliser at ${position.x},${position.y}, quality now ${newQuality}`
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
    const seedItemId = getSeedItemId(plot.cropType);
    inventoryManager.addItem(seedItemId, seedsDropped);

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    // Reset plot to fallow state after harvest (needs tilling again)
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
    if (DEBUG.FARM) {
      const qualityStr = quality !== 'normal' ? ` (${quality} quality)` : '';
      console.log(
        `[FarmManager] Harvested ${crop.harvestYield}x ${crop.displayName}${qualityStr} + ${seedsDropped}x seeds at ${position.x},${position.y}`
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
      yield: crop.harvestYield,
      seedsDropped,
      quality,
    };
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
    if (DEBUG.FARM) {
      const qualityStr = quality !== 'normal' ? ` (${quality} quality)` : '';
      console.log(
        `[FarmManager] Dual-harvest (${mode}): ${cropYield}x ${crop.displayName} + ${seedsDropped}x seeds${qualityStr} at ${position.x},${position.y}`
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
    if (DEBUG.FARM) console.log(`[FarmManager] Cleared dead crop at ${position.x},${position.y}`);
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

    // If ready, wilting, or dead - show as adult
    if (
      plot.state === FarmPlotState.READY ||
      plot.state === FarmPlotState.WILTING ||
      plot.state === FarmPlotState.DEAD
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

    if (affectedCount > 0 && DEBUG.FARM) {
      console.log(`[FarmManager] Set ${affectedCount} crops to ${quality} quality`);
    }

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

    if (affectedCount > 0 && DEBUG.FARM) {
      console.log(`[FarmManager] Applied abundant harvest blessing to ${affectedCount} crops`);
    }

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
        // Wilting crops recover to watered state
        const newState = plot.state === FarmPlotState.WILTING ? FarmPlotState.WATERED : plot.state;

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

    if (wateredCount > 0 && DEBUG.FARM) {
      console.log(`[FarmManager] Rain watered ${wateredCount} outdoor plots`);
    }

    return wateredCount;
  }

  // ============================================
  // Shared Farm Plot Sync (Village + Farm Area)
  // ============================================

  /**
   * Mark a shared farm plot as dirty for the next batch flush.
   * No-op if the plot's map is not in SHARED_FARM_MAP_IDS.
   */
  private syncSharedPlot(mapId: string, position: Position): void {
    if (!SHARED_FARM_MAP_IDS.has(mapId)) return;
    const key = this.getPlotKey(mapId, position);
    this.dirtySharedPlots.add(key);
    if (DEBUG.FARM) console.log(`[SharedFarm] Marked dirty: ${key}`);
  }

  /**
   * Start periodic batch sync for shared farm plots.
   * Call when entering a shared map (village, farm_area).
   * - Starts a 10s interval to flush dirty plots to Firestore
   * - Begins listening for remote changes from other players
   */
  async startSharedSync(): Promise<void> {
    if (this.flushInterval) return; // Already running

    // Start the flush interval
    this.flushInterval = setInterval(() => this.flushDirtyPlots(), SHARED_SYNC_INTERVAL_MS);
    console.log(`[SharedFarm] Started batch sync (${SHARED_SYNC_INTERVAL_MS / 1000}s interval)`);

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
        for (const [plotId, doc] of remotePlots) {
          const farmPlot = service.docToFarmPlot(doc as any);
          if (!farmPlot) continue;

          // Skip plots we're about to flush (still dirty)
          if (this.dirtySharedPlots.has(plotId)) continue;

          // Skip echoes of our own recent writes (grace period)
          if (this.recentlyFlushed.has(plotId)) continue;

          this.plots.set(plotId, farmPlot);
          applied++;
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
          console.log(`[SharedFarm] Applied ${applied} remote updates from other players`);
          eventBus.emit(GameEvent.FARM_PLOT_CHANGED, { action: 'water' });
        }
      });
    } catch {
      console.log('[SharedFarm] Firebase not available — local-only mode');
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

    console.log('[SharedFarm] Stopped batch sync');
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

      let written = 0;
      let cleared = 0;
      const now = Date.now();
      for (const plotKey of toFlush) {
        const plot = this.plots.get(plotKey);
        if (!plot || plot.state === FarmPlotState.FALLOW) {
          await service.clearPlot(plotKey);
          cleared++;
        } else {
          const ok = await service.writePlot(plotKey, plot);
          if (ok) written++;
          else console.warn(`[SharedFarm] Failed to write plot ${plotKey}`);
        }
        // Track as recently flushed so we ignore Firestore echoes
        this.recentlyFlushed.set(plotKey, now);
      }

      // NOW clear only the keys we actually flushed (new dirty entries added during writes are preserved)
      for (const plotKey of toFlush) {
        this.dirtySharedPlots.delete(plotKey);
      }

      if (written > 0 || cleared > 0) {
        console.log(`[SharedFarm] Flushed ${written} writes, ${cleared} clears to Firestore`);
      }
    } catch {
      console.log('[SharedFarm] Flush failed — Firebase not available');
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
   * DEBUG: Advance time for all farm plots by specified milliseconds
   * This rewinds timestamps to simulate time passing
   */
  debugAdvanceTime(milliseconds: number): void {
    console.log(`[FarmManager DEBUG] Advancing time by ${milliseconds}ms`);

    for (const plot of this.plots.values()) {
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
    console.log(`[FarmManager DEBUG] Time advanced, plots updated`);
  }
}

// Singleton instance
export const farmManager = new FarmManager();
