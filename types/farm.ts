/**
 * Farm Types
 *
 * Types related to the farming system:
 * - FarmPlotState (fallow, tilled, planted, etc.)
 * - CropGrowthStage (seedling, young, adult)
 * - FarmPlot (complete farm plot definition)
 */

import { Position } from './core';

// Farm system types
export enum FarmPlotState {
  FALLOW, // Untilled ground
  TILLED, // Tilled, ready for seeds
  PLANTED, // Seeds planted, growing
  WATERED, // Watered, grows faster
  READY, // Crop ready to harvest
  WILTING, // Needs water soon
  DEAD, // Plant died from lack of water
}

export enum CropGrowthStage {
  SEEDLING = 0, // 0-33% growth
  YOUNG = 1, // 33-66% growth
  ADULT = 2, // 66-100% growth (ready to harvest)
}

export interface FarmPlot {
  mapId: string; // Which map this plot is on
  position: Position; // Tile position
  state: FarmPlotState; // Current state
  cropType: string | null; // Crop ID (e.g., 'tomato', 'wheat')
  plantedAtDay: number | null; // Game day when planted (totalDays from TimeManager)
  plantedAtHour: number | null; // Game hour when planted (0-23)
  lastWateredDay: number | null; // Game day when last watered
  lastWateredHour: number | null; // Game hour when last watered
  stateChangedAtDay: number; // Game day of last state change
  stateChangedAtHour: number; // Game hour of last state change
  // Real timestamps for crop growth (milliseconds since epoch)
  plantedAtTimestamp: number | null; // Real time when planted (Date.now())
  lastWateredTimestamp: number | null; // Real time when last watered
  stateChangedAtTimestamp: number; // Real time of last state change
  // Quality system (always initialised with defaults)
  quality: 'normal' | 'good' | 'excellent'; // Crop quality level
  fertiliserApplied: boolean; // Whether fertiliser was used
  // Magic effects
  abundantHarvest?: boolean; // Guarantees max seed drops (from potion)
}
