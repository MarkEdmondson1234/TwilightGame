/**
 * Combat Encounter — Antagonist Configurations
 *
 * Each antagonist has personality traits that affect move selection,
 * feint frequency, and flavour text. Players can learn these patterns
 * over repeated encounters.
 */

import { COMBAT } from '../../constants';
import { npcAssets } from '../../assets';
import type { CombatantConfig } from './combatTypes';

// =============================================================================
// Goblin — Sneaky mine-dweller, favours striking from the shadows
// =============================================================================

export const GOBLIN_CONFIG: CombatantConfig = {
  id: 'goblin',
  name: 'Goblin',
  npcName: 'Goblin',
  hitsToDefeat: COMBAT.GOBLIN_HITS,
  staminaCostPerLoss: COMBAT.GOBLIN_LOSS_COST,
  fleeCost: COMBAT.FLEE_COST,
  moveWeights: { strike: 0.45, dodge: 0.35, block: 0.2 },
  feintRate: 0.25,
  telegraphDurationMs: COMBAT.TELEGRAPH_MS,
  portraitSprite: npcAssets.goblin_portrait,

  telegraphText: {
    strike: [
      '*The goblin raises its blade with a wicked grin...*',
      '*The goblin lunges forward, claws outstretched...*',
      '*The goblin winds up for a vicious swipe...*',
    ],
    dodge: [
      "*The goblin's eyes dart sideways, feet shifting...*",
      '*The goblin drops low, ready to spring aside...*',
      '*The goblin tenses, weight on its toes...*',
    ],
    block: [
      '*The goblin clutches a rusty shield to its chest...*',
      '*The goblin hunkers down, bracing itself...*',
      '*The goblin crosses its arms defensively...*',
    ],
  },

  feintRevealText: [
    'A trick! The goblin grins wickedly as it shifts its stance!',
    'Clever creature — it was only a ruse!',
    'The goblin cackles. It was feinting all along!',
  ],

  playerWinText: [
    'A direct hit! The goblin yelps and skitters sideways.',
    'Well struck! The goblin staggers, eyes wide.',
    'You read it perfectly! The goblin stumbles back, hissing.',
  ],

  playerLoseText: [
    "The goblin's attack catches you off-guard!",
    "Too slow! The goblin's blow lands squarely.",
    "You flinch as the goblin's strike connects.",
  ],

  drawText: [
    'Your moves clash and cancel out. The goblin snarls.',
    'A stalemate! You circle each other warily.',
    'Neither gains ground. The goblin hisses impatiently.',
  ],

  introText: 'A goblin blocks your path! Its blade glints in the dim light as it sizes you up...',
  victoryText:
    'The goblin shrieks and scurries into the darkness, dropping a few coins in its haste!',
  defeatText: "The goblin's relentless assault overwhelms you... Everything goes dark.",

  goldReward: { min: 15, max: 30 },
  itemRewards: [
    { itemId: 'ghost_lichen', quantity: 1, chance: 0.3 },
    { itemId: 'eye_of_newt', quantity: 1, chance: 0.2 },
  ],
};

// =============================================================================
// Umbra Wolf — Primal forest predator, favours striking
// =============================================================================

export const UMBRA_WOLF_CONFIG: CombatantConfig = {
  id: 'umbra_wolf',
  name: 'Umbra Wolf',
  npcName: 'Umbra Wolf',
  hitsToDefeat: COMBAT.WOLF_HITS,
  staminaCostPerLoss: COMBAT.WOLF_LOSS_COST,
  fleeCost: COMBAT.FLEE_COST,
  moveWeights: { strike: 0.45, dodge: 0.35, block: 0.2 },
  feintRate: 0.15,
  telegraphDurationMs: COMBAT.TELEGRAPH_MS,
  portraitSprite: npcAssets.umbrawolf_portrait,
  actionSprites: {
    strike: npcAssets.umbrawolf_attacking,
    block: npcAssets.umbrawolf_attacking_block,
    dodge: npcAssets.umbrawolf_attacking_duck,
  },

  telegraphText: {
    strike: [
      "*The wolf's hackles rise, paws digging into the earth...*",
      "*A low growl rumbles deep in the wolf's chest...*",
      '*The wolf bares its fangs, coiled to spring...*',
    ],
    dodge: [
      '*The wolf shifts its weight, circling to the side...*',
      '*The wolf lowers its head, ready to dart away...*',
      '*The wolf tenses, paws light on the ground...*',
    ],
    block: [
      '*The wolf stands firm, an ancient resolve in its gaze...*',
      '*A strange stillness settles over the wolf...*',
      '*The wolf plants itself, immovable as stone...*',
    ],
  },

  feintRevealText: [
    "The wolf's ear flicks — it was a feint! It shifts with predatory grace.",
    'Cunning beast! Its true intent was hidden all along.',
    'The wolf pivots mid-stride. You were reading it wrong!',
  ],

  playerWinText: [
    'You read it perfectly! The wolf yelps and leaps back.',
    'A solid hit! The wolf shakes itself, surprised.',
    'Well done! The wolf retreats a pace, respect in its eyes.',
  ],

  playerLoseText: [
    "The wolf's attack hits like a storm! You stagger.",
    "Too slow to react — the wolf's assault lands hard.",
    'The wolf strikes with terrible force.',
  ],

  drawText: [
    'You match the wolf move for move. It snarls, circling.',
    "Neither yields. The wolf's eyes narrow, calculating.",
    'A standoff. The forest holds its breath.',
  ],

  introText:
    'The Umbra Wolf blocks your path, its glowing eyes fixed upon you. There is no going around it...',
  victoryText:
    'The wolf lets out a long howl and bounds into the trees, conceding this encounter. Something glints where it stood...',
  defeatText:
    "The wolf's relentless power proves too much. Your vision blurs as your legs give way...",

  goldReward: { min: 25, max: 50 },
  itemRewards: [
    { itemId: 'wolfsbane', quantity: 1, chance: 0.25 },
    { itemId: 'shadow_essence', quantity: 1, chance: 0.2 },
    { itemId: 'forest_mushroom', quantity: 2, chance: 0.35 },
  ],
};

// =============================================================================
// Lookup by NPC name
// =============================================================================

const ANTAGONISTS: Record<string, CombatantConfig> = {
  Goblin: GOBLIN_CONFIG,
  'Umbra Wolf': UMBRA_WOLF_CONFIG,
};

/** Get the combat config for an NPC by name. Returns undefined if not a combatant. */
export function getCombatantByNPCName(npcName: string): CombatantConfig | undefined {
  return ANTAGONISTS[npcName];
}

/** Lookup by mini-game definition ID (for direct/devtools launches) */
const BY_GAME_ID: Record<string, CombatantConfig> = {
  'combat-encounter-goblin': GOBLIN_CONFIG,
  'combat-encounter-wolf': UMBRA_WOLF_CONFIG,
};

/** Get the combat config by mini-game ID. Fallback for direct triggers without NPC data. */
export function getCombatantByGameId(gameId: string): CombatantConfig | undefined {
  return BY_GAME_ID[gameId];
}
