/**
 * FarmManager - Single Source of Truth for farm plot data
 *
 * Following SSoT principle: this is the ONLY place that manages farm plots.
 * All farm state queries and updates go through this manager.
 *
 * Uses TimeManager for all time calculations (game days/hours, not real time)
 */

import { FarmPlot, FarmPlotState, Position, TileType } from '../types';
import { getCrop } from '../data/crops';
import { mapManager } from '../maps/MapManager';
import { TimeManager } from './TimeManager';
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
   * Called when player enters a map
   */
  updateAllPlots(): void {
    const currentGameTime = TimeManager.getCurrentTime();
    const updated: FarmPlot[] = [];

    for (const plot of this.plots.values()) {
      const updatedPlot = this.calculatePlotState(plot, currentGameTime.totalDays, currentGameTime.totalHours);
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
   * Calculate what state a plot should be in based on game time
   * This is the core logic - all state transitions happen here
   */
  private calculatePlotState(plot: FarmPlot, currentDay: number, currentHour: number): FarmPlot {
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

    // Calculate time since planted (in game days)
    const daysSincePlanted = plot.plantedAtDay !== null ? currentDay - plot.plantedAtDay : 0;

    // Calculate time since watered (in game hours)
    const hoursSinceWatered = plot.lastWateredDay !== null && plot.lastWateredHour !== null
      ? (currentDay - plot.lastWateredDay) * 24 + (currentHour - plot.lastWateredHour)
      : Infinity;

    // Check if plant should be dead
    if (plot.state === FarmPlotState.WILTING) {
      const hoursSinceStateChange = (currentDay - plot.stateChangedAtDay) * 24 + (currentHour - plot.stateChangedAtHour);
      if (hoursSinceStateChange >= crop.deathGracePeriod) {
        console.log(`[FarmManager] Crop died at ${plot.position.x},${plot.position.y}`);
        return {
          ...plot,
          state: FarmPlotState.DEAD,
          stateChangedAtDay: currentDay,
          stateChangedAtHour: currentHour,
        };
      }
    }

    // Check if plant should be wilting
    if (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED) {
      const needsWater = hoursSinceWatered > crop.waterNeededInterval;
      if (needsWater) {
        const hoursSinceNeeded = hoursSinceWatered - crop.waterNeededInterval;
        if (hoursSinceNeeded >= crop.wiltingGracePeriod) {
          console.log(`[FarmManager] Crop wilting at ${plot.position.x},${plot.position.y}`);
          return {
            ...plot,
            state: FarmPlotState.WILTING,
            stateChangedAtDay: currentDay,
            stateChangedAtHour: currentHour,
          };
        }
      }
    }

    // Check if plant is ready to harvest
    if (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED) {
      const isWatered = hoursSinceWatered < crop.waterNeededInterval;
      const growthTime = isWatered ? crop.growthTimeWatered : crop.growthTime;

      if (daysSincePlanted >= growthTime) {
        console.log(`[FarmManager] Crop ready at ${plot.position.x},${plot.position.y}`);
        return {
          ...plot,
          state: FarmPlotState.READY,
          stateChangedAtDay: currentDay,
          stateChangedAtHour: currentHour,
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
    };

    this.registerPlot(plot);
    console.log(`[FarmManager] Tilled soil at ${position.x},${position.y}`);
    return true;
  }

  /**
   * Plant seeds in tilled soil
   * Requires player to have seeds in inventory (consumes 1 seed)
   */
  plantSeed(mapId: string, position: Position, cropId: string): boolean {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.TILLED) {
      return false;
    }

    const crop = getCrop(cropId);
    if (!crop) {
      console.warn('[FarmManager] Unknown crop:', cropId);
      return false;
    }

    // Check if player has seeds
    const seedItemId = getSeedItemId(cropId);
    if (!inventoryManager.hasItem(seedItemId, 1)) {
      console.warn(`[FarmManager] Not enough seeds for ${cropId}`);
      return false;
    }

    // Consume seed from inventory
    if (!inventoryManager.removeItem(seedItemId, 1)) {
      console.warn(`[FarmManager] Failed to consume seed for ${cropId}`);
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
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
    };

    this.registerPlot(updatedPlot);
    console.log(`[FarmManager] Planted ${cropId} at ${position.x},${position.y} (used 1 seed)`);
    return true;
  }

  /**
   * Water a planted crop
   */
  waterPlot(mapId: string, position: Position): boolean {
    const plot = this.getPlot(mapId, position);
    if (!plot) {
      return false;
    }

    // Can water planted, watered, or wilting crops
    if (
      plot.state !== FarmPlotState.PLANTED &&
      plot.state !== FarmPlotState.WATERED &&
      plot.state !== FarmPlotState.WILTING
    ) {
      return false;
    }

    const gameTime = TimeManager.getCurrentTime();
    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.WATERED,
      lastWateredDay: gameTime.totalDays,
      lastWateredHour: gameTime.hour,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
    };

    this.registerPlot(updatedPlot);
    console.log(`[FarmManager] Watered crop at ${position.x},${position.y}`);
    return true;
  }

  /**
   * Harvest a ready crop
   * Adds harvested crops to inventory
   * Returns the crop ID and yield
   */
  harvestCrop(mapId: string, position: Position): { cropId: string; yield: number } | null {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.READY || !plot.cropType) {
      return null;
    }

    const crop = getCrop(plot.cropType);
    if (!crop) {
      return null;
    }

    // Add harvested crops to inventory
    const cropItemId = getCropItemId(plot.cropType);
    inventoryManager.addItem(cropItemId, crop.harvestYield);

    const gameTime = TimeManager.getCurrentTime();
    // Reset plot to tilled state after harvest
    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.TILLED,
      cropType: null,
      plantedAtDay: null,
      plantedAtHour: null,
      lastWateredDay: null,
      lastWateredHour: null,
      stateChangedAtDay: gameTime.totalDays,
      stateChangedAtHour: gameTime.hour,
    };

    this.registerPlot(updatedPlot);
    console.log(`[FarmManager] Harvested ${crop.harvestYield}x ${crop.displayName} at ${position.x},${position.y}`);

    return {
      cropId: plot.cropType,
      yield: crop.harvestYield,
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
}

// Singleton instance
export const farmManager = new FarmManager();
