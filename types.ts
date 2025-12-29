/**
 * Types
 *
 * Re-exports all types from the types/ directory for backward compatibility.
 *
 * Types have been organised into logical groups:
 * - types/core.ts - Base types (TileType, Position, Direction, PlacedItem)
 * - types/tiles.ts - Tile and sprite types (TileData, SpriteMetadata, ColorScheme)
 * - types/maps.ts - Map types (MapDefinition, Transition, BackgroundLayer)
 * - types/npc.ts - NPC types (NPC, DialogueNode, friendship types)
 * - types/animation.ts - Animation types (TileAnimation, MapAnimation)
 * - types/farm.ts - Farming types (FarmPlot, FarmPlotState)
 * - types/cutscene.ts - Cutscene types (CutsceneDefinition, CutsceneScene)
 *
 * For new code, prefer importing from specific files:
 *   import { Position, Direction } from './types/core';
 *   import { NPC, DialogueNode } from './types/npc';
 */

export * from './types/index';
