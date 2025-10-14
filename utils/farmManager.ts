/**
 * FarmManager - Single Source of Truth for farm plot data
 *
 * Following SSoT principle: this is the ONLY place that manages farm plots.
 * All farm state queries and updates go through this manager.
 */

import { FarmPlot, FarmPlotState, Position, TileType } from '../types';
import { getCrop } from '../data/crops';
import { mapManager } from '../maps/MapManager';

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
  updateAllPlots(currentTime: number): void {
    const updated: FarmPlot[] = [];

    for (const plot of this.plots.values()) {
      const updatedPlot = this.calculatePlotState(plot, currentTime);
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
   * Calculate what state a plot should be in based on timestamps
   * This is the core logic - all state transitions happen here
   */
  private calculatePlotState(plot: FarmPlot, currentTime: number): FarmPlot {
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

    const timeSincePlanted = plot.plantedAt ? currentTime - plot.plantedAt : 0;
    const timeSinceWatered = plot.lastWatered ? currentTime - plot.lastWatered : Infinity;

    // Check if plant should be dead
    if (plot.state === FarmPlotState.WILTING) {
      const timeSinceStateChange = currentTime - plot.stateChangedAt;
      if (timeSinceStateChange >= crop.deathGracePeriod) {
        console.log(`[FarmManager] Crop died at ${plot.position.x},${plot.position.y}`);
        return {
          ...plot,
          state: FarmPlotState.DEAD,
          stateChangedAt: currentTime,
        };
      }
    }

    // Check if plant should be wilting
    if (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED) {
      const needsWater = timeSinceWatered > crop.waterNeededInterval;
      if (needsWater) {
        const timeSinceNeeded = timeSinceWatered - crop.waterNeededInterval;
        if (timeSinceNeeded >= crop.wiltingGracePeriod) {
          console.log(`[FarmManager] Crop wilting at ${plot.position.x},${plot.position.y}`);
          return {
            ...plot,
            state: FarmPlotState.WILTING,
            stateChangedAt: currentTime,
          };
        }
      }
    }

    // Check if plant is ready to harvest
    if (plot.state === FarmPlotState.PLANTED || plot.state === FarmPlotState.WATERED) {
      const isWatered = timeSinceWatered < crop.waterNeededInterval;
      const growthTime = isWatered ? crop.growthTimeWatered : crop.growthTime;

      if (timeSincePlanted >= growthTime) {
        console.log(`[FarmManager] Crop ready at ${plot.position.x},${plot.position.y}`);
        return {
          ...plot,
          state: FarmPlotState.READY,
          stateChangedAt: currentTime,
        };
      }
    }

    return plot;
  }

  /**
   * Till a fallow soil tile
   */
  tillSoil(mapId: string, position: Position, currentTime: number): boolean {
    const key = this.getPlotKey(mapId, position);
    const existing = this.plots.get(key);

    // Can only till fallow soil or create new plots
    if (existing && existing.state !== FarmPlotState.FALLOW) {
      return false;
    }

    const plot: FarmPlot = {
      mapId,
      position: { x: Math.floor(position.x), y: Math.floor(position.y) },
      state: FarmPlotState.TILLED,
      cropType: null,
      plantedAt: null,
      lastWatered: null,
      stateChangedAt: currentTime,
    };

    this.registerPlot(plot);
    console.log(`[FarmManager] Tilled soil at ${position.x},${position.y}`);
    return true;
  }

  /**
   * Plant seeds in tilled soil
   */
  plantSeed(mapId: string, position: Position, cropId: string, currentTime: number): boolean {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.TILLED) {
      return false;
    }

    const crop = getCrop(cropId);
    if (!crop) {
      console.warn('[FarmManager] Unknown crop:', cropId);
      return false;
    }

    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.PLANTED,
      cropType: cropId,
      plantedAt: currentTime,
      lastWatered: currentTime, // Planting counts as initial watering
      stateChangedAt: currentTime,
    };

    this.registerPlot(updatedPlot);
    console.log(`[FarmManager] Planted ${cropId} at ${position.x},${position.y}`);
    return true;
  }

  /**
   * Water a planted crop
   */
  waterPlot(mapId: string, position: Position, currentTime: number): boolean {
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

    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.WATERED,
      lastWatered: currentTime,
      stateChangedAt: currentTime,
    };

    this.registerPlot(updatedPlot);
    console.log(`[FarmManager] Watered crop at ${position.x},${position.y}`);
    return true;
  }

  /**
   * Harvest a ready crop
   * Returns the crop ID and yield
   */
  harvestCrop(mapId: string, position: Position, currentTime: number): { cropId: string; yield: number } | null {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.READY || !plot.cropType) {
      return null;
    }

    const crop = getCrop(plot.cropType);
    if (!crop) {
      return null;
    }

    // Reset plot to tilled state after harvest
    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.TILLED,
      cropType: null,
      plantedAt: null,
      lastWatered: null,
      stateChangedAt: currentTime,
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
  clearDeadCrop(mapId: string, position: Position, currentTime: number): boolean {
    const plot = this.getPlot(mapId, position);
    if (!plot || plot.state !== FarmPlotState.DEAD) {
      return false;
    }

    const updatedPlot: FarmPlot = {
      ...plot,
      state: FarmPlotState.FALLOW,
      cropType: null,
      plantedAt: null,
      lastWatered: null,
      stateChangedAt: currentTime,
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
  getPlotInfo(mapId: string, position: Position, currentTime: number): string | null {
    const plot = this.getPlot(mapId, position);
    if (!plot) {
      return null;
    }

    const crop = plot.cropType ? getCrop(plot.cropType) : null;
    const lines = [
      `State: ${FarmPlotState[plot.state]}`,
    ];

    if (crop) {
      lines.push(`Crop: ${crop.displayName}`);
      if (plot.plantedAt) {
        const elapsed = currentTime - plot.plantedAt;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        lines.push(`Age: ${minutes}m ${seconds}s`);
      }
      if (plot.lastWatered) {
        const timeSince = currentTime - plot.lastWatered;
        const minutes = Math.floor(timeSince / 60000);
        const seconds = Math.floor((timeSince % 60000) / 1000);
        lines.push(`Last watered: ${minutes}m ${seconds}s ago`);
      }
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const farmManager = new FarmManager();
