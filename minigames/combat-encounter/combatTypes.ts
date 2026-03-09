/**
 * Combat Encounter — Type Definitions
 *
 * Rock-Paper-Scissors combat:
 *   Strike > Dodge > Block > Strike
 */

// =============================================================================
// Core Types
// =============================================================================

/** The three combat moves */
export type CombatMove = 'strike' | 'block' | 'dodge';

/** Outcome of a single round */
export type RoundOutcome = 'win' | 'lose' | 'draw';

/** Combat phase state machine */
export type CombatPhase =
  | 'intro'
  | 'standoff'
  | 'telegraph'
  | 'waiting' // timer expired, player didn't choose
  | 'reveal'
  | 'result'
  | 'victory'
  | 'defeat'
  | 'fled';

// =============================================================================
// RPS Resolution
// =============================================================================

/** What each move beats */
const BEATS: Record<CombatMove, CombatMove> = {
  strike: 'dodge', // strike catches someone mid-dodge
  dodge: 'block', // dodge slips around a stationary blocker
  block: 'strike', // block absorbs an incoming strike
};

/** Resolve a round: does the player win, lose, or draw? */
export function resolveRound(playerMove: CombatMove, enemyMove: CombatMove): RoundOutcome {
  if (playerMove === enemyMove) return 'draw';
  if (BEATS[playerMove] === enemyMove) return 'win';
  return 'lose';
}

// =============================================================================
// Antagonist Configuration
// =============================================================================

export interface CombatantConfig {
  /** Internal ID (e.g. 'goblin', 'umbra_wolf') */
  id: string;
  /** Display name */
  name: string;
  /** NPC name to match (for dynamic NPC IDs) */
  npcName: string;
  /** Rounds the player must win to defeat this enemy */
  hitsToDefeat: number;
  /** Stamina drained when the player loses a round */
  staminaCostPerLoss: number;
  /** Stamina cost to flee */
  fleeCost: number;
  /** Weighted probability of each move (need not sum to 1, will be normalised) */
  moveWeights: Record<CombatMove, number>;
  /** Chance of telegraphing the wrong move (0-1) */
  feintRate: number;
  /** Telegraph duration in ms */
  telegraphDurationMs: number;
  /** Portrait sprite URL for the combat UI */
  portraitSprite: string;

  // Flavour text pools (randomly selected each round)
  telegraphText: Record<CombatMove, string[]>;
  feintRevealText: string[];
  playerWinText: string[];
  playerLoseText: string[];
  drawText: string[];
  introText: string;
  victoryText: string;
  defeatText: string;

  // Rewards
  goldReward: { min: number; max: number };
  itemRewards?: Array<{ itemId: string; quantity: number; chance: number }>;
}

// =============================================================================
// Combat State
// =============================================================================

export interface CombatState {
  phase: CombatPhase;
  round: number;
  enemyHitsRemaining: number;
  /** The move the enemy telegraphed (may be a feint) */
  telegraphedMove: CombatMove | null;
  /** The enemy's actual move */
  actualMove: CombatMove | null;
  /** Whether this round was a feint */
  isFeint: boolean;
  /** Player's chosen move for this round */
  playerMove: CombatMove | null;
  /** Result of the current round */
  roundOutcome: RoundOutcome | null;
  /** Current narrative text */
  narrativeText: string;
  /** Timer progress (0-1, 1 = full) */
  timerProgress: number;
}

export const INITIAL_COMBAT_STATE: Omit<CombatState, 'enemyHitsRemaining'> = {
  phase: 'intro',
  round: 0,
  telegraphedMove: null,
  actualMove: null,
  isFeint: false,
  playerMove: null,
  roundOutcome: null,
  narrativeText: '',
  timerProgress: 1,
};
