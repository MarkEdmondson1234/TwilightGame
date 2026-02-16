/**
 * Cutscene Types
 *
 * Types related to the cutscene system:
 * - CutsceneLayerAnimation (Ken Burns-style animations)
 * - CutsceneBackgroundLayer (layered backgrounds)
 * - CutsceneCharacter (character positioning)
 * - CutsceneDialogue (dialogue during cutscenes)
 * - CutsceneWeatherEffect (weather overlays)
 * - CutsceneScene (individual scenes)
 * - CutsceneTrigger (how cutscenes are triggered)
 * - CutsceneCompletionAction (what happens after)
 * - CutsceneDefinition (complete cutscene definition)
 */

import { Position } from './core';

// ============================================================================
// Cutscene System Types
// ============================================================================

/**
 * Animation style for background image layers
 * Ken Burns-style panning and zooming for cinematic effect
 */
export interface CutsceneLayerAnimation {
  type: 'pan' | 'zoom' | 'pan-and-zoom' | 'static';
  duration: number; // Animation duration in milliseconds
  // Pan direction (for 'pan' or 'pan-and-zoom' types)
  panFrom?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  panTo?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  // Zoom settings (for 'zoom' or 'pan-and-zoom' types)
  zoomFrom?: number; // Starting scale (e.g., 1.0)
  zoomTo?: number; // Ending scale (e.g., 1.2)
  // Easing function
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

/**
 * Background layer for cutscene scenes
 * Multiple layers can be stacked for parallax/depth effect
 */
export interface CutsceneBackgroundLayer {
  image: string; // Path to image in /public/assets/cutscenes/
  zIndex: number; // Layer order (0 = back, higher = front)
  opacity?: number; // Layer opacity (0-1, default 1)
  animation?: CutsceneLayerAnimation; // Optional animation for this layer
  // Position adjustment (percentage-based)
  offsetX?: number; // Horizontal offset (-100 to 100, default 0)
  offsetY?: number; // Vertical offset (-100 to 100, default 0)
}

/**
 * Character or NPC positioned in a cutscene
 * Reuses existing sprite system from the game
 */
export interface CutsceneCharacter {
  characterId: string; // 'player', NPC ID, or special character ID
  spriteUrl?: string; // Optional: override sprite URL (defaults to character's sprite)
  spriteUrls?: string[]; // Multiple sprites to cycle through (animated character)
  spriteAnimationSpeed?: number; // Milliseconds between animation frames (default 800)
  position: {
    x: number; // Horizontal position (0-100, percentage of screen width)
    y: number; // Vertical position (0-100, percentage of screen height)
  };
  scale?: number; // Scale multiplier (default 1.0)
  opacity?: number; // Opacity (0-1, default 1)
  flipHorizontal?: boolean; // Mirror sprite horizontally
  // Animation entrance
  entrance?: {
    type: 'fade' | 'slide' | 'none';
    duration?: number; // Milliseconds (default 500)
    from?: 'left' | 'right' | 'top' | 'bottom'; // For slide entrance
  };
  // Animation exit
  exit?: {
    type: 'fade' | 'slide' | 'none';
    duration?: number; // Milliseconds (default 500)
    to?: 'left' | 'right' | 'top' | 'bottom'; // For slide exit
  };
}

/**
 * Dialogue displayed during a cutscene scene
 * Positioned at bottom of screen (unlike centered in-game dialogue)
 */
export interface CutsceneDialogue {
  speaker?: string; // Character name (optional, appears above dialogue)
  text: string; // Dialogue text
  // Optional seasonal variations
  seasonalText?: {
    spring?: string;
    summer?: string;
    autumn?: string;
    winter?: string;
  };
  // Optional time-of-day variations
  timeOfDayText?: {
    day?: string;
    night?: string;
  };
  // Dialogue choices (for branching cutscenes)
  choices?: {
    text: string;
    nextSceneIndex?: number; // Jump to specific scene index (undefined = next scene)
    triggerCutscene?: string; // Trigger different cutscene
    action?: 'end' | 'continue'; // Special actions (default 'continue')
  }[];
  // Auto-advance settings
  autoAdvance?: {
    delay: number; // Milliseconds before auto-advancing
  };
}

/**
 * Weather effect overlay for cutscene scenes
 */
export interface CutsceneWeatherEffect {
  type: 'rain' | 'snow' | 'cherry_blossoms' | 'fog' | 'mist' | 'falling_leaves' | 'fireflies';
  intensity?: 'light' | 'medium' | 'heavy'; // Density of particles (default: medium)
  opacity?: number; // Overall effect opacity 0-1 (default: 0.7)
}

/**
 * Individual scene within a cutscene
 * A cutscene is made up of multiple scenes that transition between each other
 */
export interface CutsceneScene {
  id: string; // Unique identifier for this scene
  backgroundCss?: string; // Optional CSS background value (gradient, colour) — overrides default black
  backgroundLayers: CutsceneBackgroundLayer[]; // Layered background images
  characters?: CutsceneCharacter[]; // Characters positioned in scene
  dialogue?: CutsceneDialogue; // Dialogue for this scene
  weatherEffect?: CutsceneWeatherEffect; // Optional weather/particle overlay
  soundEffect?: string; // Audio asset ID to play when this scene starts
  duration?: number; // Optional: auto-advance after X milliseconds (overrides dialogue advance)
  // Scene transition
  transitionOut?: {
    type: 'fade' | 'crossfade' | 'wipe' | 'none';
    duration?: number; // Milliseconds (default 500)
  };
}

/**
 * Trigger types for cutscenes
 */
export type CutsceneTrigger =
  | { type: 'manual'; id: string } // Triggered via code (e.g., game start, quest completion)
  | { type: 'position'; mapId: string; position: Position; radius?: number } // Triggered when player enters area
  | { type: 'dialogue'; npcId: string; nodeId: string } // Triggered by dialogue choice
  | { type: 'season_change'; season: 'spring' | 'summer' | 'autumn' | 'winter' } // Season transition
  | { type: 'time'; hour: number; day?: number } // Specific time/day
  | { type: 'event'; eventId: string }; // Custom game event

/**
 * Action to take after cutscene completes
 */
export type CutsceneCompletionAction =
  | { action: 'return' } // Return to where cutscene started
  | { action: 'transition'; mapId: string; position: Position } // Transition to new map
  | { action: 'trigger_cutscene'; cutsceneId: string } // Chain to another cutscene
  | { action: 'none' }; // Do nothing (stay where we are)

/**
 * Complete cutscene definition
 * Contains all scenes, triggers, and metadata
 */
export interface CutsceneDefinition {
  id: string; // Unique cutscene ID
  name: string; // Display name
  scenes: CutsceneScene[]; // Array of scenes in order
  trigger: CutsceneTrigger; // How this cutscene is triggered
  onComplete: CutsceneCompletionAction; // What happens after cutscene
  // Metadata
  canSkip?: boolean; // Allow player to skip (default true)
  canReplay?: boolean; // Allow replay from menu (default false)
  playOnce?: boolean; // Only play once per save (default false)
  // Audio
  audio?: {
    music?: string; // Music track ID to play during cutscene
    ambient?: string; // Ambient sound ID to play during cutscene
    ambientVolume?: number; // Ambient volume override (0-1, default uses asset base volume)
    fadeInMs?: number; // Fade in duration in milliseconds (default 2000)
    fadeOutMs?: number; // Fade out duration in milliseconds (default 2000)
  };
  // Conditions
  requirements?: {
    minGold?: number; // Minimum gold required
    requiredItems?: string[]; // Items player must have
    completedCutscenes?: string[]; // Cutscenes that must be completed first
    flags?: string[]; // Custom game flags
    isFairyForm?: boolean; // Player must be in fairy form
    timeRange?: { fromHour: number; toHour: number }; // Hour range (inclusive from, exclusive to)
  };
}
