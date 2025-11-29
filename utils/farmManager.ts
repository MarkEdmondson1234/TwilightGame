/**
 * FarmManager - Single Source of Truth for farm plot data
 *
 * Following SSoT principle: this is the ONLY place that manages farm plots.
 * All farm state queries and updates go through this manager.
 *
 * Uses TimeManager for all time calculations (game days/hours, not real time)
 */

import { FarmPlot, FarmPlotState, Position, TileType, CropGrowthStage } from '../types';
import { getCrop, canPlantInSeason, QUALITY_MULTIPLIERS, CropQuality, TESTING_MODE } from '../data/crops';
import { mapManager } from '../maps/MapManager';
import { TimeManager, Season } from './TimeManager';
import { inventoryManager } from './inventoryManager';
import { getSeedItemId, getCropItemId } from '../data/items';

class FarmManager {
  private plots: Map<string, FarmPlot> = new Map(); // key: "mapId:x:y"

  /**
   * Generate a unique key for a plot position
   */
  private getPlotKey(mapId: string, position: Position): string {
    return `${mapId}:${Math.floor(position.x)}:${Math.floor(position.y)}`;
  }

  /**
   * Register a farm plot (or update existing one)
   */
  registerPlot(plot: FarmPlot): void {
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
    return Array.from(this.plots.values()).filter(plot => plot.mapId === mapId);
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
    plots.forEach(plot => this.registerPlot(plot));
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
      const updatedPlot = this.calculatePlotState(plot, currentGameTime.totalDays, currentGameTime.totalHours, now);
      if (updatedPlot !== plot) {
        this.registerPlot(updatedPlot);
        updated.push(updatedPlot);
      }
    }

    if (updated.length > 0) {
      console.log(`[FarmManager] Updated ${updated.length} plots`);
    }
  }

  /**
   * Calculate what state a plot should be in based on real time
   * This is the core logic - all state transitions happen here
   */
  private calculatePlotState(plot: FarmPlot, currentDay: number, currentHour: number, now: number): FarmPlot {
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
    const msSinceWatered = plot.lastWateredTimestamp !== null
      ? now - plot.lastWateredTimestamp
      : Infinity;

    // Check if plant should be dead
    if (plot.state === FarmPlotState.WILTING) {
      const msSinceStateChange = now - plot.stateChangedAtTimestamp;
      if (msSinceStateChange >= crop.deathGracePeriod) {
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
    // Can become ready from PLANTED, WATERED, or WILTING states
    if (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED || plot.state === FarmPlotState.WILTING) {
      const isWatered = msSinceWatered < crop.waterNeededInterval;
      const growthTime = isWatered ? crop.growthTimeWatered : crop.growthTime;

      if (msSincePlanted >= growthTime) {
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

    console.log(`[FarmManager] tillSoil called: mapId=${mapId}, position=(${position.x},${position.y}), existing=${existing ? `state=${FarmPlotState[existing.state]}` : 'none'}`);

    // Can only till fallow soil or create new plots
    if (existing && existing.state !== FarmPlotState.FALLOW) {
      console.warn(`[FarmManager] Cannot till: plot already exists with state ${FarmPlotState[existing.state]}`);
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();
    const plot: FarmPlot = {
      mapId,
      position: { x: Math.floor(position.x), y: Math.floor(position.y) },
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
    };

    this.registerPlot(plot);
    console.log(`[FarmManager] Tilled soil at ${position.x},${position.y}`);
    return true;
  }

  /**
   * Plant seeds in tilled soil
   * Requires player to have seeds in inventory (consumes 1 seed)
   * Enforces seasonal planting restrictions
   */
  plantSeed(mapId: string, position: Position, cropId: string): { success: boolean; reason?: string } {
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
      const seasonNames = crop.plantSeasons.map(s => s).join(', ');
      console.warn(`[FarmManager] Cannot plant ${cropId} in ${gameTime.season} (only: ${seasonNames})`);
      return { success: false, reason: `${crop.displayName} can only be planted in ${seasonNames}` };
    }

    // Check if player has seeds
    const seedItemId = getSeedItemId(cropId);
    if (!inventoryManager.hasItem(seedItemId, 1)) {
      console.warn(`[FarmManager] Not enough seeds for ${cropId}`);
      return { success: false, reason: 'No seeds available' };
    }

    // Consume seed from inventory
    if (!inventoryManager.removeItem(seedItemId, 1)) {
      console.warn(`[FarmManager] Failed to consume seed for ${cropId}`);
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
    console.log(`[FarmManager] Planted ${cropId} at ${position.x},${position.y} in ${gameTime.season} (used 1 seed)`);
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

    // Can water planted, watered, wilting, or ready crops
    // (watering ready crops doesn't change state, but updates water timer)
    if (
      plot.state !== FarmPlotState.PLANTED &&
      plot.state !== FarmPlotState.WATERED &&
      plot.state !== FarmPlotState.WILTING &&
      plot.state !== FarmPlotState.READY
    ) {
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const now = Date.now();

    // If crop is ready, don't change state back to watered - just update water timestamp
    const newState = plot.state === FarmPlotState.READY ? FarmPlotState.READY : FarmPlotState.WATERED;

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
    console.log(`[FarmManager] Watered crop at ${position.x},${position.y}`);
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

    // Determine new quality - fertiliser improves quality by one tier
    // normal -> good, good -> excellent
    let newQuality: 'normal' | 'good' | 'excellent' = 'good';
    if (plot.quality === 'good') {
      newQuality = 'excellent';
    }

    const updatedPlot: FarmPlot = {
      ...plot,
      fertiliserApplied: true,
      quality: newQuality,
    };

    this.registerPlot(updatedPlot);
    console.log(`[FarmManager] Applied fertiliser at ${position.x},${position.y}, quality now ${newQuality}`);
    return { success: true };
  }

  /**
   * Get the quality of a plot's crop
   */
  getPlotQuality(mapId: string, position: Position): 'normal' | 'good' | 'excellent' | null {
    const plot = this.getPlot(mapId, position);
    if (!plot || !plot.cropType) return null;
    return plot.quality ?? 'normal';
  }

  /**
   * Harvest a ready crop
   * Adds harvested crops to inventory
   * Also gives 1-3 random seeds back
   * Quality affects sell value (tracked in inventory as item metadata)
   * Returns the crop ID, yield, quality, and seeds dropped
   */
  harvestCrop(mapId: string, position: Position): { cropId: string; yield: number; seedsDropped: number; quality: 'normal' | 'good' | 'excellent' } | null {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.READY || !plot.cropType) {
      return null;
    }

    const crop = getCrop(plot.cropType);
    if (!crop) {
      return null;
    }

    // Get quality before reset
    const quality = plot.quality ?? 'normal';

    // Add harvested crops to inventory
    const cropItemId = getCropItemId(plot.cropType);
    inventoryManager.addItem(cropItemId, crop.harvestYield);

    // Add random seed drops (1-3 seeds)
    const seedsDropped = Math.floor(Math.random() * (crop.seedDropMax - crop.seedDropMin + 1)) + crop.seedDropMin;
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
      quality: undefined,      // Reset quality
      fertiliserApplied: undefined, // Reset fertiliser
    };

    this.registerPlot(updatedPlot);
    const qualityStr = quality !== 'normal' ? ` (${quality} quality)` : '';
    console.log(`[FarmManager] Harvested ${crop.harvestYield}x ${crop.displayName}${qualityStr} + ${seedsDropped}x seeds at ${position.x},${position.y}`);

    return {
      cropId: plot.cropType,
      yield: crop.harvestYield,
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
    };

    this.registerPlot(updatedPlot);
    console.log(`[FarmManager] Cleared dead crop at ${position.x},${position.y}`);
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
    if (plot.state === FarmPlotState.READY || plot.state === FarmPlotState.WILTING || plot.state === FarmPlotState.DEAD) {
      return CropGrowthStage.ADULT;
    }

    const crop = getCrop(plot.cropType);
    if (!crop) {
      return CropGrowthStage.SEEDLING;
    }

    const now = Date.now();
    const elapsed = now - plot.plantedAtTimestamp;

    // Check if watered recently
    const isWatered = plot.lastWateredTimestamp !== null && (now - plot.lastWateredTimestamp) < crop.waterNeededInterval;
    const totalGrowthTime = isWatered ? crop.growthTimeWatered : crop.growthTime;

    // Calculate growth progress (0 to 1)
    const progress = Math.min(1, elapsed / totalGrowthTime);

    // Return stage based on progress
    if (progress < 0.33) {
      return CropGrowthStage.SEEDLING;
    } else if (progress < 0.66) {
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
    const lines = [
      `State: ${FarmPlotState[plot.state]}`,
    ];

    if (crop) {
      lines.push(`Crop: ${crop.displayName}`);
      if (plot.plantedAtDay !== null) {
        const daysSincePlanted = gameTime.totalDays - plot.plantedAtDay;
        const hoursSincePlanted = (gameTime.totalDays - plot.plantedAtDay) * 24 + (gameTime.hour - (plot.plantedAtHour || 0));
        lines.push(`Age: ${daysSincePlanted}d ${hoursSincePlanted % 24}h`);
      }
      if (plot.lastWateredDay !== null && plot.lastWateredHour !== null) {
        const hoursSinceWatered = (gameTime.totalDays - plot.lastWateredDay) * 24 + (gameTime.hour - plot.lastWateredHour);
        const daysSince = Math.floor(hoursSinceWatered / 24);
        const hoursRemaining = hoursSinceWatered % 24;
        lines.push(`Last watered: ${daysSince}d ${hoursRemaining}h ago`);
      }
    }

    return lines.join('\n');
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
