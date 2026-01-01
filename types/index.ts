/**
 * Types Index
 *
 * Re-exports all types from individual files for backward compatibility.
 * Import from 'types' or 'types/index' to get all types.
 * Import from specific files (e.g., 'types/core') for more focused imports.
 */

// Core types (base types used everywhere)
// Enums are values, so use regular export
export { TileType, Direction } from './core';
// Interfaces are types, so use export type
export type { Position, PlacedItem } from './core';

// Tile and sprite types
export type {
  SeasonalImageSet,
  TileTransformSettings,
  TileData,
  SpriteMetadata,
  ColorScheme,
} from './tiles';

// Map types
export type {
  Transition,
  MapRenderMode,
  ImageRoomLayer,
  NPCRoomLayer,
  RoomLayer,
  WindowView,
  MapDefinition,
  GridString,
} from './maps';

// NPC types
// Enums are values
export { NPCBehavior } from './npc';
// Types and interfaces
export type {
  FriendshipTier,
  NPCFriendship,
  FriendshipConfig,
  DailyResourceConfig,
  DialogueNode,
  DialogueResponse,
  NPC,
  AnimatedNPCStates,
} from './npc';

// Animation types
export type {
  AnimationConditions,
  AnimationEffect,
  TileAnimation,
  MapAnimation,
  WeatherAnimation,
} from './animation';

// Farm types
// Enums are values
export { FarmPlotState, CropGrowthStage } from './farm';
// Types and interfaces
export type { FarmPlot } from './farm';

// Cutscene types
export type {
  CutsceneLayerAnimation,
  CutsceneBackgroundLayer,
  CutsceneCharacter,
  CutsceneDialogue,
  CutsceneWeatherEffect,
  CutsceneScene,
  CutsceneTrigger,
  CutsceneCompletionAction,
  CutsceneDefinition,
} from './cutscene';
