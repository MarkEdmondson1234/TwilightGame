import React from 'react';

export enum TileType {
  // Outdoor tiles
  GRASS,
  TUFT,  // Grass with tufts - seasonal variation (replaces 90% of grass)
  ROCK,
  WATER,
  // Lake tiles (directional edges for proper water rendering)
  WATER_CENTER,
  WATER_LEFT,
  WATER_RIGHT,
  WATER_TOP,
  WATER_BOTTOM,
  PATH,
  // Indoor tiles
  FLOOR,
  FLOOR_LIGHT,
  FLOOR_DARK,
  MINE_FLOOR,
  WALL,
  WOODEN_WALL_POOR,
  WOODEN_WALL,
  WOODEN_WALL_POSH,
  CARPET,
  RUG,
  // Transition tiles
  DOOR,
  EXIT_DOOR,
  SHOP_DOOR,
  MINE_ENTRANCE,
  // Furniture/objects
  TABLE,
  CHAIR,
  MIRROR,
  // Decorative (walkable)
  MUSHROOM,
  FERN,
  BUSH,
  TREE,
  TREE_BIG,
  CHERRY_TREE,
  OAK_TREE,
  FAIRY_OAK,
  FAIRY_OAK_GIANT,  // Enormous 10x10 fairy oak for the deep forest
  SPRUCE_TREE,
  WILLOW_TREE,
  WILD_IRIS,  // Flowering plant that grows near water
  BRAMBLES,  // Thorny brambles (seasonal variations, solid obstacle)
  WILD_STRAWBERRY,  // Wild strawberry plants (forageable in forest, seasonal variations)
  // Building tiles (outdoor structures)
  WALL_BOUNDARY,
  BUILDING_WALL,
  BUILDING_ROOF,
  BUILDING_DOOR,
  BUILDING_WINDOW,
  COTTAGE,
  COTTAGE_STONE,
  COTTAGE_FLOWERS,
  SHOP,
  GARDEN_SHED,
  // Farmland tiles
  SOIL_FALLOW,
  SOIL_TILLED,
  SOIL_PLANTED,
  SOIL_WATERED,
  SOIL_READY,
  SOIL_WILTING,
  SOIL_DEAD,
  // Indoor furniture (multi-tile)
  BED,
  SOFA,
  CHIMNEY,
  STOVE,
  // Outdoor structures
  WELL,
  CAMPFIRE,  // Campfire for outdoor cooking (higher failure rate than stove)
  WITCH_HUT,  // Witch's magical house built into a giant tree (16x16 tiles)
  CAULDRON,  // Animated bubbling cauldron (witch's brewing pot)
}

export interface Position {
  x: number;
  y: number;
}

// Placed item (food, decoration, etc.) that appears on the map
export interface PlacedItem {
  id: string;  // Unique ID for this placed item
  itemId: string;  // Item type (e.g., 'food_tea')
  position: Position;  // Grid position
  mapId: string;  // Which map it's on
  image: string;  // Image URL
  timestamp: number;  // When it was placed
}

export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export interface SeasonalImageSet {
  spring?: string[];  // Images to use in spring (higher frequency if defined)
  summer?: string[];  // Images to use in summer
  autumn?: string[];  // Images to use in autumn
  winter?: string[];  // Images to use in winter
  default: string[];  // Default images used in all seasons
}

export interface TileTransformSettings {
    enableFlip?: boolean;      // Enable horizontal flip (default: false)
    enableRotation?: boolean;  // Enable rotation (default: false)
    enableScale?: boolean;     // Enable size variation (default: false)
    enableBrightness?: boolean; // Enable brightness variation (default: false)

    // Fine-tune ranges (only used if corresponding enable* is true)
    scaleRange?: { min: number; max: number };      // Size variation range
    rotationRange?: { min: number; max: number };   // Rotation in degrees
    brightnessRange?: { min: number; max: number }; // Brightness multiplier

    // Special rotation modes for specific tile types
    rotationMode?: 'subtle' | 'full360' | 'flip180' | 'lake_edge_left' | 'lake_edge_right' | 'lake_edge_top' | 'lake_edge_bottom';  // Rotation behavior
}

export interface TileData {
    type: TileType;
    name: string;
    color: string;
    isSolid: boolean;
    image?: string[];  // Simple array of images (backward compatible)
    seasonalImages?: SeasonalImageSet;  // Seasonal variations (new)
    baseType?: TileType;  // If set, render this tile type underneath (e.g., GRASS under CHERRY_TREE)
    transforms?: TileTransformSettings;  // Transform settings (optional, defaults to no transforms)
    // Animation support (for tiles like cauldrons that cycle through frames)
    animationFrames?: string[];  // Array of image paths to cycle through
    animationSpeed?: number;  // Milliseconds per frame (default: 150)
}

// Multi-tile sprite metadata for foreground rendering
export interface SpriteMetadata {
  tileType: TileType; // Which tile type triggers this sprite
  spriteWidth: number; // Width in tiles (for rendering)
  spriteHeight: number; // Height in tiles (for rendering)
  offsetX: number; // X offset in tiles (0 = centered on tile)
  offsetY: number; // Y offset in tiles (negative = extends upward)
  image: string | string[]; // Path to sprite image, or array for random variations
  isForeground: boolean; // If true, renders after player
  // Optional collision bounds (if different from sprite dimensions)
  collisionWidth?: number; // Width in tiles for collision (defaults to spriteWidth)
  collisionHeight?: number; // Height in tiles for collision (defaults to spriteHeight)
  collisionOffsetX?: number; // X offset for collision box (defaults to offsetX)
  collisionOffsetY?: number; // Y offset for collision box (defaults to offsetY)
  // Optional CSS transform controls (for foreground sprites only)
  enableFlip?: boolean; // Enable horizontal flip variation (default: true for foreground)
  enableRotation?: boolean; // Enable rotation variation (default: true for foreground)
  enableScale?: boolean; // Enable size variation (default: true for foreground)
  enableBrightness?: boolean; // Enable brightness variation (default: true for foreground)
  // Fine-tune transform ranges (only used if corresponding enable* is true)
  scaleRange?: { min: number; max: number }; // Size variation range (default: 0.85-1.15 or 0.98-1.02 for trees)
  rotationRange?: { min: number; max: number }; // Rotation in degrees (default: -2 to 2)
  brightnessRange?: { min: number; max: number }; // Brightness multiplier (default: 0.95-1.05)
  rotationMode?: 'subtle' | 'full360' | 'flip180' | 'lake_edge_left' | 'lake_edge_right' | 'lake_edge_top' | 'lake_edge_bottom'; // Special rotation modes
}

// Color scheme for a map theme
export interface ColorScheme {
  name: string;
  colors: {
    grass: string;
    rock: string;
    water: string;
    path: string;
    floor: string;
    wall: string;
    carpet: string;
    door: string;
    special: string;
    furniture: string;
    mushroom: string;
    background: string;
  };
  // Optional seasonal color overrides (only override colors that change per season)
  seasonalModifiers?: {
    spring?: Partial<ColorScheme['colors']>;
    summer?: Partial<ColorScheme['colors']>;
    autumn?: Partial<ColorScheme['colors']>;
    winter?: Partial<ColorScheme['colors']>;
  };
  // Optional time-of-day color overrides (only override colors that change between day/night)
  timeOfDayModifiers?: {
    day?: Partial<ColorScheme['colors']>;
    night?: Partial<ColorScheme['colors']>;
  };
}

// Map transition/exit definition
export interface Transition {
  fromPosition: Position;
  tileType: TileType;
  toMapId: string; // Target map ID, or "RANDOM_FOREST", "RANDOM_CAVE", etc.
  toPosition: Position;
  label?: string; // Optional description like "To Village"
}

// Map definition
export interface MapDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: TileType[][]; // 2D array of tiles
  colorScheme: string; // References a ColorScheme by name
  isRandom: boolean; // True if procedurally generated
  spawnPoint: Position; // Default spawn position
  transitions: Transition[]; // Exit/entrance definitions
  npcs?: NPC[]; // NPCs in this map (optional)
}

// Simple character-based grid for child-friendly map editing
export type GridString = string; // Multi-line string with character codes

// NPC (Non-Player Character) system
export enum NPCBehavior {
  STATIC,   // Stays in one place
  WANDER,   // Randomly walks around
  PATROL,   // Follows a set path
}

// Friendship system types
export type FriendshipTier = 'stranger' | 'acquaintance' | 'good_friend';

export interface NPCFriendship {
  npcId: string;
  points: number;              // 0-900 (100 points per level, levels 1-9)
  lastTalkedDay: number;       // Game day of last interaction (for daily talk bonus)
  isSpecialFriend: boolean;    // Unlocked through crisis events
  crisisCompleted?: string;    // Which crisis event was completed (if any)
  rewardsReceived?: string[];  // Track which tier rewards have been received (e.g., 'village_elder_acquaintance')
}

export interface FriendshipConfig {
  canBefriend: boolean;        // Can this NPC be befriended?
  startingPoints: number;      // Initial friendship (0 for strangers, 900 for family)
  likedFoodTypes?: string[];   // Food categories they like (for gift system)
  crisisId?: string;           // ID of their crisis event (for Special Friend)
}

export interface DialogueNode {
  id: string;
  text: string; // Default text (used when no seasonal variant matches)
  seasonalText?: { // Optional seasonal variations of the text
    spring?: string;
    summer?: string;
    autumn?: string;
    winter?: string;
  };
  timeOfDayText?: { // Optional time-of-day variations
    day?: string;
    night?: string;
  };
  weatherText?: { // Optional weather variations of the text
    clear?: string;
    rain?: string;
    snow?: string;
    fog?: string;
    mist?: string;
    storm?: string;
    cherry_blossoms?: string;
  };
  responses?: { text: string; nextId?: string }[]; // For branching dialogue (no nextId = close dialogue)
  // Friendship requirements for this dialogue node
  requiredFriendshipTier?: FriendshipTier;  // Only show if friendship >= tier
  requiredSpecialFriend?: boolean;           // Only show if special friend
}

export interface NPC {
  id: string;
  name: string;
  position: Position;
  direction: Direction;
  behavior: NPCBehavior;
  sprite: string; // Path to sprite image, or array for animated (optimized for in-game use)
  portraitSprite?: string; // Optional high-res sprite for dialogue portraits
  dialogue: DialogueNode[]; // Conversation tree
  interactionRadius?: number; // How close player must be (default 1.5 tiles)
  animatedStates?: AnimatedNPCStates; // Optional: for NPCs with state-based animations
  scale?: number; // Optional: sprite scale multiplier (default 4.0)
  followTarget?: string; // Optional: ID of NPC to follow (for companion NPCs like dogs)
  friendshipConfig?: FriendshipConfig; // Optional: friendship system configuration
}

// Animated NPC state machine (for NPCs like the cat with multiple behavioral states)
export interface AnimatedNPCStates {
  currentState: string; // Current state name (e.g., 'sleeping', 'angry', 'standing')
  states: {
    [stateName: string]: {
      sprites: string[]; // Array of sprite paths for animation frames (default/fallback)
      animationSpeed: number; // Milliseconds per frame
      transitionsTo?: { // Optional state transitions
        [eventName: string]: string; // Event name -> target state
      };
      duration?: number; // Optional: auto-transition after X milliseconds
      nextState?: string; // Optional: state to transition to after duration
      // Optional: direction-specific sprites (overrides 'sprites' when NPC faces that direction)
      directionalSprites?: {
        up?: string[];    // Sprites for facing up (back view)
        down?: string[];  // Sprites for facing down (front view)
        left?: string[];  // Sprites for facing left (side view, will be flipped)
        right?: string[]; // Sprites for facing right (side view)
      };
    };
  };
  lastStateChange: number; // Timestamp of last state change
  lastFrameChange: number; // Timestamp of last animation frame change
  currentFrame: number; // Current animation frame index
}

// Farm system types
export enum FarmPlotState {
  FALLOW,      // Untilled ground
  TILLED,      // Tilled, ready for seeds
  PLANTED,     // Seeds planted, growing
  WATERED,     // Watered, grows faster
  READY,       // Crop ready to harvest
  WILTING,     // Needs water soon
  DEAD,        // Plant died from lack of water
}

export enum CropGrowthStage {
  SEEDLING = 0,    // 0-33% growth
  YOUNG = 1,       // 33-66% growth
  ADULT = 2,       // 66-100% growth (ready to harvest)
}

export interface FarmPlot {
  mapId: string;           // Which map this plot is on
  position: Position;      // Tile position
  state: FarmPlotState;    // Current state
  cropType: string | null; // Crop ID (e.g., 'tomato', 'wheat')
  plantedAtDay: number | null;    // Game day when planted (totalDays from TimeManager)
  plantedAtHour: number | null;   // Game hour when planted (0-23)
  lastWateredDay: number | null;  // Game day when last watered
  lastWateredHour: number | null; // Game hour when last watered
  stateChangedAtDay: number;      // Game day of last state change
  stateChangedAtHour: number;     // Game hour of last state change
  // Real timestamps for crop growth (milliseconds since epoch)
  plantedAtTimestamp: number | null;    // Real time when planted (Date.now())
  lastWateredTimestamp: number | null;  // Real time when last watered
  stateChangedAtTimestamp: number;      // Real time of last state change
  // Quality system (optional for backward compatibility)
  quality?: 'normal' | 'good' | 'excellent';  // Crop quality level
  fertiliserApplied?: boolean;                 // Whether fertiliser was used
}

// Animation system types
export interface AnimationConditions {
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay?: 'day' | 'night';
  weather?: 'rain' | 'snow' | 'clear'; // For future weather system
}

export interface AnimationEffect {
  id: string;
  image: string; // Path to GIF or animated image
  layer: 'background' | 'midground' | 'foreground';
  loop: boolean; // Whether animation loops infinitely
  conditions?: AnimationConditions; // Optional display conditions
  opacity?: number; // Optional opacity (0-1, default 1)
  scale?: number; // Optional scale multiplier (default 1)
}

// Tile-based animations (appear near specific tile types)
export interface TileAnimation extends AnimationEffect {
  tileType: TileType; // Which tile type triggers this animation
  offsetX: number; // Position offset from tile center (in tiles)
  offsetY: number; // Position offset from tile center (in tiles)
  radius: number; // Show animation within N tiles of trigger tile
}

// Map-based animations (fixed positions on specific maps)
export interface MapAnimation extends AnimationEffect {
  mapId: string; // Which map this animation appears on
  position: Position; // Fixed position on the map (in tile coordinates)
}

// Weather-based animations (fullscreen effects triggered by weather state)
export interface WeatherAnimation extends AnimationEffect {
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  // Weather animations render fullscreen, so no position needed
}

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
 * Individual scene within a cutscene
 * A cutscene is made up of multiple scenes that transition between each other
 */
/**
 * Weather effect overlay for cutscene scenes
 */
export interface CutsceneWeatherEffect {
  type: 'rain' | 'snow' | 'cherry_blossoms' | 'fog' | 'mist' | 'falling_leaves' | 'fireflies';
  intensity?: 'light' | 'medium' | 'heavy'; // Density of particles (default: medium)
  opacity?: number; // Overall effect opacity 0-1 (default: 0.7)
}

export interface CutsceneScene {
  id: string; // Unique identifier for this scene
  backgroundLayers: CutsceneBackgroundLayer[]; // Layered background images
  characters?: CutsceneCharacter[]; // Characters positioned in scene
  dialogue?: CutsceneDialogue; // Dialogue for this scene
  weatherEffect?: CutsceneWeatherEffect; // Optional weather/particle overlay
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
  // Conditions
  requirements?: {
    minGold?: number; // Minimum gold required
    requiredItems?: string[]; // Items player must have
    completedCutscenes?: string[]; // Cutscenes that must be completed first
    flags?: string[]; // Custom game flags
  };
}