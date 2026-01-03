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

// Daily resource collection from NPCs (e.g., milk from cow)
export interface DailyResourceConfig {
  itemId: string;              // Item to give (e.g., 'milk')
  maxPerDay: number;           // Maximum collections per day (e.g., 2)
  collectMessage: string;      // Message when collecting (e.g., "You collected fresh milk!")
  emptyMessage: string;        // Message when limit reached (e.g., "The cow has no more milk today.")
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
  responses?: DialogueResponse[]; // For branching dialogue (no nextId = close dialogue)
  // Friendship requirements for this dialogue node
  requiredFriendshipTier?: FriendshipTier;  // Only show if friendship >= tier
  requiredSpecialFriend?: boolean;           // Only show if special friend
  // Expression/emotion for dialogue character sprite (e.g., 'smile', 'happy', 'thinky')
  // If set, uses dialogueExpressions[expression] from NPC, otherwise uses default dialogueSprite
  expression?: string;
}

export interface DialogueResponse {
  text: string;
  nextId?: string;
  // Cooking requirements for this response option
  requiredRecipeUnlocked?: string;  // Only show if this recipe is unlocked
  requiredRecipeMastered?: string;  // Only show if this recipe is mastered
  hiddenIfRecipeUnlocked?: string;  // Hide if this recipe is already unlocked
  hiddenIfRecipeMastered?: string;  // Hide if this recipe is already mastered
  // Cooking domain requirements (savoury, dessert, baking)
  requiredDomainMastered?: string;  // Only show if this cooking domain is mastered
  requiredDomainStarted?: string;   // Only show if this domain has been started (any recipe unlocked)
  hiddenIfDomainStarted?: string;   // Hide if any recipe in this domain is unlocked
  hiddenIfDomainMastered?: string;  // Hide if this domain is fully mastered
  hiddenIfAnyDomainStarted?: boolean; // Hide if player has started any domain (not mastered yet)
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
  animatedStates?: AnimatedNPCStates; // Optional: for NPCs with state-based animations
  scale?: number; // Optional: sprite scale multiplier (default 4.0)
  followTarget?: string; // Optional: ID of NPC to follow (for companion NPCs like dogs)
  friendshipConfig?: FriendshipConfig; // Optional: friendship system configuration
  dailyResource?: DailyResourceConfig; // Optional: daily collectible resource (e.g., milk from cow)
  noFlip?: boolean; // Optional: disable horizontal flipping entirely
  reverseFlip?: boolean; // Optional: flip when facing right instead of left (for sprites that naturally face left)
  zIndexOverride?: number; // Optional: override z-index for layered rooms (e.g., 50 to appear behind counter at 200)
  visibilityConditions?: AnimationConditions; // Optional: conditions for when NPC should be visible (e.g., seasonal creatures)
  glow?: { // Optional: mystical glow effect behind NPC
    color: number;       // Hex colour (e.g., 0x88CCFF for soft blue)
    radius: number;      // Radius in tiles
    intensity?: number;  // Opacity 0-1 (default 0.6) - used if day/night not specified
    dayIntensity?: number;   // Daytime intensity (overrides intensity during day)
    nightIntensity?: number; // Nighttime intensity (overrides intensity at night)
    pulseSpeed?: number; // Pulse animation in ms (default: no pulse)
    steps?: number;      // Gradient smoothness (default 32, higher = smoother)
  };
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
