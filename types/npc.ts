/**
 * NPC Types
 *
 * Types related to NPCs, dialogue, and the friendship system:
 * - NPCBehavior (static, wander, patrol)
 * - Friendship types (NPCFriendship, FriendshipConfig)
 * - DialogueNode (conversation tree nodes)
 * - NPC (complete NPC definition)
 * - AnimatedNPCStates (state machine for animated NPCs)
 */

import { Position, Direction } from './core';
import { AnimationConditions } from './animation';
import type { SharedEventType } from '../firebase/types';

// NPC (Non-Player Character) system
export enum NPCBehavior {
  STATIC, // Stays in one place
  WANDER, // Randomly walks around
  PATROL, // Follows a set path
}

// Friendship system types
export type FriendshipTier = 'stranger' | 'acquaintance' | 'good_friend';

export interface NPCFriendship {
  npcId: string;
  points: number; // 0-900 (100 points per level, levels 1-9)
  lastTalkedDay: number; // Game day of last interaction (for daily talk bonus)
  isSpecialFriend: boolean; // Unlocked through crisis events
  crisisCompleted?: string; // Which crisis event was completed (if any)
  rewardsReceived?: string[]; // Track which tier rewards have been received (e.g., 'village_elder_acquaintance')
}

export interface FriendshipConfig {
  canBefriend: boolean; // Can this NPC be befriended?
  startingPoints: number; // Initial friendship (0 for strangers, 900 for family)
  likedFoodTypes?: string[]; // Food categories they like (for gift system)
  crisisId?: string; // ID of their crisis event (for Special Friend)
}

// Daily resource collection from NPCs (e.g., milk from cow)
export interface DailyResourceConfig {
  itemId: string; // Item to give (e.g., 'milk')
  maxPerDay: number; // Maximum collections per day (e.g., 2)
  collectMessage: string; // Message when collecting (e.g., "You collected fresh milk!")
  emptyMessage: string; // Message when limit reached (e.g., "The cow has no more milk today.")
}

export interface DialogueNode {
  id: string;
  text: string; // Default text (used when no seasonal variant matches)
  seasonalText?: {
    // Optional seasonal variations of the text
    spring?: string;
    summer?: string;
    autumn?: string;
    winter?: string;
  };
  timeOfDayText?: {
    // Optional time-of-day variations
    day?: string;
    night?: string;
  };
  weatherText?: {
    // Optional weather variations of the text
    clear?: string;
    rain?: string;
    snow?: string;
    fog?: string;
    mist?: string;
    storm?: string;
    cherry_blossoms?: string;
  };
  transformationText?: {
    // Optional transformation variations (when player is transformed)
    fairy?: string; // When player is in fairy form
    // Future transformations: ghost, animal, etc.
  };
  responses?: DialogueResponse[]; // For branching dialogue (no nextId = close dialogue)
  // Friendship requirements for this dialogue node
  requiredFriendshipTier?: FriendshipTier; // Only show if friendship >= tier
  requiredSpecialFriend?: boolean; // Only show if special friend
  // Quest requirements for this dialogue node
  requiredQuest?: string; // Only show if this quest is started
  requiredQuestStage?: number; // Only show if quest is at this stage or higher
  hiddenIfQuestStarted?: string; // Hide if this quest is started
  hiddenIfQuestCompleted?: string; // Hide if this quest is completed
  // Transformation requirements for this dialogue node
  requiredTransformation?: string; // Only show if player has this transformation (e.g., 'fairy')
  hiddenIfTransformed?: string; // Hide if player has this transformation
  hiddenIfAnyTransformation?: boolean; // Hide if player has any active transformation
  // Potion effect requirements for this dialogue node (e.g., 'beast_tongue' for animal speech)
  requiredPotionEffect?: string; // Only show if player has this potion effect active
  hiddenWithPotionEffect?: string; // Hide if player has this potion effect active
  // Global event conditions (shared events from all players via Firebase)
  requiredGlobalEvent?: SharedEventType; // Only show if any event of this type exists
  hiddenIfGlobalEvent?: SharedEventType; // Hide if any event of this type exists
  requiredGlobalEventCount?: {
    // Only show if enough events of a type exist
    type: SharedEventType;
    min: number;
  };
  // Expression/emotion for dialogue character sprite (e.g., 'smile', 'happy', 'thinky')
  // If set, uses dialogueExpressions[expression] from NPC, otherwise uses default dialogueSprite
  expression?: string;
}

export interface DialogueResponse {
  text: string;
  nextId?: string;
  // Cooking requirements for this response option
  requiredRecipeUnlocked?: string; // Only show if this recipe is unlocked
  requiredRecipeMastered?: string; // Only show if this recipe is mastered
  hiddenIfRecipeUnlocked?: string; // Hide if this recipe is already unlocked
  hiddenIfRecipeMastered?: string; // Hide if this recipe is already mastered
  // Cooking domain requirements (savoury, dessert, baking)
  requiredDomainMastered?: string; // Only show if this cooking domain is mastered
  requiredDomainStarted?: string; // Only show if this domain has been started (any recipe unlocked)
  hiddenIfDomainStarted?: string; // Hide if any recipe in this domain is unlocked
  hiddenIfDomainMastered?: string; // Hide if this domain is fully mastered
  hiddenIfAnyDomainStarted?: boolean; // Hide if player has started any domain (not mastered yet)
  // Quest requirements for this response option
  requiredQuest?: string; // Only show if this quest is started
  requiredQuestStage?: number; // Only show if quest is at this stage or higher
  maxQuestStage?: number; // Only show if quest is at this stage or lower
  hiddenIfQuestStarted?: string; // Hide if this quest is started
  hiddenIfQuestCompleted?: string; // Hide if this quest is completed
  // Quest actions triggered by selecting this response
  startsQuest?: string; // Start this quest when selected
  advancesQuest?: string; // Advance this quest to next stage when selected
  completesQuest?: string; // Complete this quest when selected
  setsQuestStage?: { questId: string; stage: number }; // Set specific quest stage when selected
  // Transformation requirements for this response option
  requiredTransformation?: string; // Only show if player has this transformation (e.g., 'fairy')
  hiddenIfTransformed?: string; // Hide if player has this transformation
  hiddenIfAnyTransformation?: boolean; // Hide if player has any active transformation
  // Global event conditions (shared events from all players via Firebase)
  requiredGlobalEvent?: SharedEventType; // Only show if any event of this type exists
  hiddenIfGlobalEvent?: SharedEventType; // Hide if any event of this type exists
  requiredGlobalEventCount?: {
    // Only show if enough events of a type exist
    type: SharedEventType;
    min: number;
  };
  // Decoration system requirements
  hiddenIfHasEasel?: boolean; // Hide if player already has the easel
  // Item-giving actions triggered by selecting this response
  givesItems?: Array<{ itemId: string; quantity: number }>; // Give items to player when selected
  grantsEasel?: boolean; // Grant easel via DecorationManager when selected
}

// Seasonal location configuration for NPCs
export interface SeasonalLocation {
  spring?: { mapId: string; position: Position; direction?: Direction };
  summer?: { mapId: string; position: Position; direction?: Direction };
  autumn?: { mapId: string; position: Position; direction?: Direction };
  winter?: { mapId: string; position: Position; direction?: Direction };
}

export interface NPC {
  id: string;
  name: string;
  position: Position;
  direction: Direction;
  behavior: NPCBehavior;
  sprite: string; // Path to sprite image, or array for animated (optimized for in-game use)
  portraitSprite?: string; // Optional high-res sprite for dialogue portraits (zoomed crop)
  dialogueSprite?: string; // Optional special dialogue artwork (full character, shown large behind dialogue window)
  // Expression-based dialogue sprites (maps expression name to image URL)
  // Use with DialogueNode.expression to show different emotions/poses during dialogue
  // e.g., { smile: '/assets/mum_smile.png', happy: '/assets/mum_happy.png' }
  dialogueExpressions?: Record<string, string>;
  dialogue: DialogueNode[]; // Conversation tree
  interactionRadius?: number; // How close player must be (default 1.5 tiles)
  collisionRadius?: number; // Optional: collision radius in tiles (default 0 = no collision, 0.3-0.5 typical)
  allowedDirections?: Direction[]; // Optional: restrict WANDER to specific directions (e.g., [Left, Right] for deer)
  animatedStates?: AnimatedNPCStates; // Optional: for NPCs with state-based animations
  scale?: number; // Optional: sprite scale multiplier (default 4.0)
  followTarget?: string; // Optional: ID of NPC to follow (for companion NPCs like dogs)
  friendshipConfig?: FriendshipConfig; // Optional: friendship system configuration
  dailyResource?: DailyResourceConfig; // Optional: daily collectible resource (e.g., milk from cow)
  noFlip?: boolean; // Optional: disable horizontal flipping entirely
  reverseFlip?: boolean; // Optional: flip when facing right instead of left (for sprites that naturally face left)
  zIndexOverride?: number; // Optional: override z-index for layered rooms (e.g., 50 to appear behind counter at 200)
  visibilityConditions?: AnimationConditions; // Optional: conditions for when NPC should be visible (e.g., seasonal creatures)
  seasonalLocations?: SeasonalLocation; // Optional: different positions/maps per season (if not set, uses base position/current map)
  glow?: {
    // Optional: mystical glow effect behind NPC
    color: number; // Hex colour (e.g., 0x88CCFF for soft blue)
    radius: number; // Radius in tiles
    intensity?: number; // Opacity 0-1 (default 0.6) - used if day/night not specified
    dayIntensity?: number; // Daytime intensity (overrides intensity during day)
    nightIntensity?: number; // Nighttime intensity (overrides intensity at night)
    pulseSpeed?: number; // Pulse animation in ms (default: no pulse)
    steps?: number; // Gradient smoothness (default 32, higher = smoother)
  };
}

// NPC gift-giving configuration (what NPCs give to players when friendship is high)
export interface NPCGiftConfig {
  giftItems: Array<{
    itemId: string; // Item the NPC can give
    chance: number; // 0-1 probability to give this item
    minTier: FriendshipTier; // Minimum friendship tier required
  }>;
  dailyGiftLimit: number; // Max gifts per day (0 = only tier rewards)
}

// NPC favour configuration (special actions NPCs can perform for good friends)
export type FavourType = 'water_plants' | 'harvest_crops' | 'gift_seeds' | 'cook_meal';

export interface NPCFavourConfig {
  favourType: FavourType;
  minTier: FriendshipTier;
  cooldownDays: number;
  description: string; // Message when offering the favour
}

// Proximity trigger configuration for NPCs that react to player distance
export interface ProximityTrigger {
  radius: number; // Distance in tiles that triggers state change
  triggerState: string; // State to transition to when player is within radius
  recoveryRadius?: number; // Distance player must be to recover (default: radius + 1.5)
  recoveryState?: string; // State to return to when player leaves (default: previous state)
  recoveryDelay?: number; // Delay in ms before recovering (default: 0)
}

// Animated NPC state machine (for NPCs like the cat with multiple behavioral states)
export interface AnimatedNPCStates {
  currentState: string; // Current state name (e.g., 'sleeping', 'angry', 'standing')
  states: {
    [stateName: string]: {
      sprites: string[]; // Array of sprite paths for animation frames (default/fallback)
      animationSpeed: number; // Milliseconds per frame
      transitionsTo?: {
        // Optional state transitions
        [eventName: string]: string; // Event name -> target state
      };
      duration?: number; // Optional: auto-transition after X milliseconds
      nextState?: string; // Optional: state to transition to after duration
      // Optional: direction-specific sprites (overrides 'sprites' when NPC faces that direction)
      directionalSprites?: {
        up?: string[]; // Sprites for facing up (back view)
        down?: string[]; // Sprites for facing down (front view)
        left?: string[]; // Sprites for facing left (side view, will be flipped)
        right?: string[]; // Sprites for facing right (side view)
      };
      // Optional: proximity-triggered state change (e.g., possum plays dead when player approaches)
      proximityTrigger?: ProximityTrigger;
    };
  };
  lastStateChange: number; // Timestamp of last state change
  lastFrameChange: number; // Timestamp of last animation frame change
  currentFrame: number; // Current animation frame index
  // Track previous state for proximity recovery
  previousState?: string;
  // Track when player left the proximity zone for recovery delay
  recoveryStartTime?: number;
}
