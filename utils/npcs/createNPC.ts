/**
 * Base NPC Factory - Reduces duplication in NPC creation
 *
 * Provides a standardised way to create NPCs with common patterns:
 * - Animated state setup
 * - Default configuration
 * - Consistent structure
 *
 * Usage:
 *   const npc = createNPC({
 *     id: 'village_elder',
 *     name: 'Village Elder',
 *     position: { x: 5, y: 10 },
 *     sprites: { idle: [sprite1, sprite2] },
 *     dialogue: [...],
 *   });
 */

import {
  NPC,
  NPCBehavior,
  Direction,
  Position,
  AnimatedNPCStates,
  FriendshipConfig,
  DailyResourceConfig,
  DialogueNode,
  AnimationConditions,
  SeasonalLocation,
} from '../../types';
import { TIMING } from '../../constants';

// Type for a single animated state (extracted from AnimatedNPCStates)
type AnimatedNPCState = AnimatedNPCStates['states'][string];

/**
 * Configuration for an animated state
 */
export interface StateConfig {
  sprites: string[];
  /** Animation speed in ms (default: TIMING.NPC_FRAME_MS = 280) */
  animationSpeed?: number;
  /** How long to stay in this state in ms (optional) */
  duration?: number;
  /** Next state to transition to (optional) */
  nextState?: string;
  /** Event-based state transitions (e.g., { interact: 'angry' }) */
  transitionsTo?: { [eventName: string]: string };
  /** Direction-specific sprites (optional) */
  directionalSprites?: {
    up?: string[];
    down?: string[];
    left?: string[];
    right?: string[];
  };
}

/**
 * Configuration for creating an NPC
 */
export interface NPCConfig {
  // Required
  id: string;
  name: string;
  position: Position;
  sprite: string;
  dialogue: DialogueNode[];

  // Optional with defaults
  direction?: Direction;
  behavior?: NPCBehavior;
  portraitSprite?: string;
  scale?: number;
  interactionRadius?: number;
  collisionRadius?: number; // Collision radius in tiles (0 = no collision)

  // Animation states (optional)
  states?: Record<string, StateConfig>;
  initialState?: string;

  // Friendship (optional)
  friendshipConfig?: FriendshipConfig;

  // Daily resource collection (optional, e.g., milk from cow)
  dailyResource?: DailyResourceConfig;

  // Additional optional properties
  dialogueSprite?: string;
  dialogueExpressions?: Record<string, string>;
  followTarget?: string;
  noFlip?: boolean;
  reverseFlip?: boolean;
  zIndexOverride?: number;
  visibilityConditions?: AnimationConditions;
  seasonalLocations?: SeasonalLocation;
  glow?: {
    color: number;
    radius: number;
    intensity?: number;
    dayIntensity?: number;
    nightIntensity?: number;
    pulseSpeed?: number;
    steps?: number;
  };
}

/**
 * Default values for NPC configuration
 */
const DEFAULTS = {
  direction: Direction.Down,
  behavior: NPCBehavior.STATIC,
  scale: 3.0,
  interactionRadius: 1.5,
  animationSpeed: TIMING.NPC_FRAME_MS,
};

/**
 * Create animated states from a states configuration
 */
function createAnimatedStates(
  states: Record<string, StateConfig>,
  initialState: string
): AnimatedNPCStates {
  const now = Date.now();

  const processedStates: Record<string, AnimatedNPCState> = {};

  for (const [stateName, config] of Object.entries(states)) {
    processedStates[stateName] = {
      sprites: config.sprites,
      animationSpeed: config.animationSpeed ?? DEFAULTS.animationSpeed,
      duration: config.duration,
      nextState: config.nextState,
      transitionsTo: config.transitionsTo,
      directionalSprites: config.directionalSprites,
    };
  }

  return {
    currentState: initialState,
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: processedStates,
  };
}

/**
 * Create an NPC with the given configuration
 *
 * @example
 * const elder = createNPC({
 *   id: 'village_elder',
 *   name: 'Village Elder',
 *   position: { x: 10, y: 5 },
 *   sprite: npcAssets.elderly_01,
 *   portraitSprite: npcAssets.elderly_portrait,
 *   states: {
 *     idle: { sprites: [npcAssets.elderly_01, npcAssets.elderly_02], animationSpeed: 800 }
 *   },
 *   dialogue: [{ id: 'greeting', text: 'Hello, traveller!' }],
 * });
 */
export function createNPC(config: NPCConfig): NPC {
  const {
    id,
    name,
    position,
    sprite,
    dialogue,
    direction = DEFAULTS.direction,
    behavior = DEFAULTS.behavior,
    portraitSprite,
    scale = DEFAULTS.scale,
    interactionRadius = DEFAULTS.interactionRadius,
    collisionRadius,
    states,
    initialState = 'idle',
    friendshipConfig,
    dailyResource,
    // Additional optional properties
    dialogueSprite,
    dialogueExpressions,
    followTarget,
    noFlip,
    reverseFlip,
    zIndexOverride,
    visibilityConditions,
    seasonalLocations,
    glow,
  } = config;

  // Create animated states if provided
  const animatedStates = states
    ? createAnimatedStates(states, initialState)
    : undefined;

  const npc: NPC = {
    id,
    name,
    position,
    direction,
    behavior,
    sprite,
    dialogue,
    scale,
    interactionRadius,
  };

  // Add optional properties (only if defined)
  if (portraitSprite) npc.portraitSprite = portraitSprite;
  if (animatedStates) npc.animatedStates = animatedStates;
  if (friendshipConfig) npc.friendshipConfig = friendshipConfig;
  if (dailyResource) npc.dailyResource = dailyResource;
  if (dialogueSprite) npc.dialogueSprite = dialogueSprite;
  if (dialogueExpressions) npc.dialogueExpressions = dialogueExpressions;
  if (followTarget) npc.followTarget = followTarget;
  if (noFlip !== undefined) npc.noFlip = noFlip;
  if (reverseFlip !== undefined) npc.reverseFlip = reverseFlip;
  if (zIndexOverride !== undefined) npc.zIndexOverride = zIndexOverride;
  if (visibilityConditions) npc.visibilityConditions = visibilityConditions;
  if (seasonalLocations) npc.seasonalLocations = seasonalLocations;
  if (glow) npc.glow = glow;
  if (collisionRadius !== undefined) npc.collisionRadius = collisionRadius;

  return npc;
}

/**
 * Quick factory for static NPCs (no movement, simple idle animation)
 */
export function createStaticNPC(config: Omit<NPCConfig, 'behavior'>): NPC {
  return createNPC({
    ...config,
    behavior: NPCBehavior.STATIC,
  });
}

/**
 * Quick factory for wandering NPCs
 */
export function createWanderingNPC(config: Omit<NPCConfig, 'behavior'>): NPC {
  return createNPC({
    ...config,
    behavior: NPCBehavior.WANDER,
  });
}
