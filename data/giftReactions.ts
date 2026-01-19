/**
 * Gift Reaction System - NPC responses when receiving gifts
 *
 * This file contains:
 * - Item preferences per NPC (loves, dislikes)
 * - Reaction dialogue per NPC with personality-appropriate text
 * - Non-speaking NPC reactions using descriptive action text
 *
 * Following the centralised data pattern from NPC_FOOD_PREFERENCES.
 */

import { ItemCategory, getItem, ITEMS } from './items';
import { RECIPES, RecipeCategory } from './recipes';

export type GiftReaction = 'loved' | 'liked' | 'neutral' | 'disliked';

export interface NPCGiftPreferences {
  /** Item IDs that trigger 'loved' reaction */
  loves: string[];
  /** Item IDs that trigger 'disliked' reaction */
  dislikes: string[];
  /** If true, NPC loves all home cooked food (category: FOOD) */
  lovesHomeCookedFood?: boolean;
  /** If true, NPC dislikes all home cooked food */
  dislikesHomeCookedFood?: boolean;
  /** If true, NPC loves all items in 'dessert' recipe category */
  lovesHomeMadeDesserts?: boolean;
  /** If true, NPC dislikes all savoury home cooked food */
  dislikesSavouryFood?: boolean;
  /** If true, NPC dislikes grocery store items */
  dislikesGroceryItems?: boolean;
  /** If true, NPC loves savoury home cooked food */
  lovesSavouryHomeCookedFood?: boolean;
}

export interface GiftReactionDialogue {
  text: string;
  expression?: string;
}

// ============================================================================
// NPC Gift Preferences
// ============================================================================

/**
 * NPC-specific gift preferences
 * - loves: Item IDs that trigger 'loved' reaction (+300 points)
 * - dislikes: Item IDs that trigger 'disliked' reaction (-100 points)
 * - Everything else triggers 'neutral' or 'liked' based on existing logic
 */
export const NPC_GIFT_PREFERENCES: Record<string, NPCGiftPreferences> = {
  // Chill Bear - loves honey and berries, dislikes spices
  bear: {
    loves: [
      'honey',
      'crop_blueberry',
      'strawberry_jam',
      'crop_blackberry',
      'crop_hazelnut',
    ],
    dislikes: ['allspice', 'curry_powder', 'cinnamon'],
    lovesHomeCookedFood: true,
  },

  // Old Woman - loves sweets, dislikes spinach
  old_woman: {
    loves: ['food_cookies', 'food_chocolate_cake'],
    dislikes: ['crop_spinach'],
  },

  // Village Elder (Old Man) - loves roast dinner
  village_elder: {
    loves: ['food_roast_dinner'],
    dislikes: [],
  },

  // Mum - loves crepes, flowers, and tea
  mum_home: {
    loves: ['food_crepes', 'crop_sunflower', 'food_tea', 'tea_leaves'],
    dislikes: [],
  },

  // Witch - loves sweets, dislikes potions (doesn't want her own work back!)
  witch: {
    loves: ['food_cookies', 'food_chocolate_cake'],
    dislikes: [
      'potion_friendship',
      'potion_bitter_grudge',
      'potion_glamour',
      'potion_beastward',
      'potion_wakefulness',
      'potion_revealing',
      'potion_healing',
      'potion_drink_me',
      'potion_eat_me',
      'potion_raincaller',
      'potion_sunburst',
      'potion_snowglobe',
      'potion_cherry_blossom',
      'potion_mistweaver',
      'potion_verdant_surge',
      'potion_beast_tongue',
      'potion_time_skip',
      'potion_dawns_herald',
      'potion_twilight_call',
      'potion_harvest_moon',
      'potion_dewfall',
      'potion_quality_blessing',
      'potion_homeward',
      'potion_root_revival',
      'potion_abundant_harvest',
      'potion_floating',
      'potion_flying',
    ],
  },

  // Mushra - loves mushrooms, books, flowers, home cooked food; dislikes broccoli
  mushra: {
    loves: [
      'mushroom',
      'luminescent_toadstool',
      'giant_mushroom_cap',
      'crop_sunflower',
    ],
    dislikes: ['crop_broccoli'],
    lovesHomeCookedFood: true,
  },

  // Morgan (Fairy) - loves fairy bluebell seeds and chocolate, dislikes home cooked
  morgan: {
    loves: ['seed_fairy_bluebell', 'chocolate'],
    dislikes: [],
    dislikesHomeCookedFood: true,
  },

  // Stella (Fairy) - loves fairy bluebell seeds and cookies, dislikes home cooked
  stella: {
    loves: ['seed_fairy_bluebell', 'food_cookies'],
    dislikes: [],
    dislikesHomeCookedFood: true,
  },

  // Cat - loves tuna, dislikes citrus
  cat: {
    loves: ['tuna'],
    dislikes: [], // Note: lemon and orange not in items yet
  },

  // Dog - loves raw meat, dislikes chocolate (toxic to dogs!)
  dog: {
    loves: ['meat', 'minced_meat'],
    dislikes: ['chocolate', 'food_chocolate_cake', 'food_marzipan_chocolates'],
  },

  // Cow - loves salad
  cow: {
    loves: ['crop_salad'],
    dislikes: [],
  },

  // Deer - loves spinach and salad, dislikes meat
  deer: {
    loves: ['crop_spinach', 'crop_salad'],
    dislikes: ['meat', 'minced_meat'],
  },

  // Mother Sea - loves addersmeat, dislikes water (she IS the sea!)
  mother_sea: {
    loves: ['addersmeat'],
    dislikes: ['water'],
  },

  // Professor Birdimen - loves books (no book item yet, use misc)
  professor_birdimen: {
    loves: [], // Books not in items yet
    dislikes: ['meat', 'minced_meat'],
  },

  // Puffle - loves home made desserts, dislikes savoury
  puffle: {
    loves: [],
    dislikes: [],
    lovesHomeMadeDesserts: true,
    dislikesSavouryFood: true,
  },

  // Suffle - loves home made desserts, dislikes savoury
  suffle: {
    loves: [],
    dislikes: [],
    lovesHomeMadeDesserts: true,
    dislikesSavouryFood: true,
  },

  // Mr Fox - loves savoury home cooked food, dislikes grocery items
  mr_fox: {
    loves: [],
    dislikes: [],
    lovesSavouryHomeCookedFood: true,
    dislikesGroceryItems: true,
  },

  // Umbra Wolf - loves bones and raw meat, dislikes vegetables
  umbra_wolf: {
    loves: ['meat', 'minced_meat'], // Note: 'bone' item not in items yet
    dislikes: [
      'crop_spinach',
      'crop_broccoli',
      'crop_salad',
      'crop_carrot',
      'crop_radish',
      'crop_pea',
      'crop_cauliflower',
    ],
  },
};

// ============================================================================
// Gift Reaction Dialogue
// ============================================================================

/**
 * Default reactions for NPCs without specific dialogue
 */
export const DEFAULT_GIFT_REACTIONS: Record<GiftReaction, GiftReactionDialogue> = {
  loved: {
    text: 'Oh my! This is wonderful! Thank you so much, I absolutely love it!',
    expression: 'happy',
  },
  liked: {
    text: 'How thoughtful of you! I appreciate the gift.',
    expression: 'smile',
  },
  neutral: {
    text: 'Thank you for thinking of me.',
    expression: 'default',
  },
  disliked: {
    text: "Oh... well, it's the thought that counts, I suppose.",
    expression: 'thinky',
  },
};

/**
 * NPC-specific gift reaction dialogue
 * Speaking NPCs have dialogue text, non-speaking NPCs have descriptive actions in italics
 */
export const NPC_GIFT_REACTIONS: Record<
  string,
  Record<GiftReaction, GiftReactionDialogue>
> = {
  // === SPEAKING NPCs ===

  bear: {
    loved: {
      text: 'Ohhh, this is wonderful! You really know how to make a bear happy. Thank you, friend.',
      expression: 'happy',
    },
    liked: {
      text: 'Mmm, this is nice. Thank you for thinking of me.',
      expression: 'smile',
    },
    neutral: {
      text: "*yawn* That's kind of you. I appreciate the gesture.",
      expression: 'default',
    },
    disliked: {
      text: "*sniffs and wrinkles nose* Ugh, too spicy for my taste. Bears prefer simple flavours, you know.",
      expression: 'thinky',
    },
  },

  old_woman: {
    loved: {
      text: 'Oh my dear, how lovely! These are simply delightful. You remind me of my grandchildren.',
      expression: 'happy',
    },
    liked: {
      text: "That's very kind of you, dear. How thoughtful.",
      expression: 'smile',
    },
    neutral: {
      text: 'Thank you, love. I shall find a use for this.',
      expression: 'default',
    },
    disliked: {
      text: "Oh... spinach. I never did care for the stuff, dear. But thank you for thinking of me.",
      expression: 'thinky',
    },
  },

  village_elder: {
    loved: {
      text: "By the old tree! A proper roast dinner! 'Tis a gift fit for a king. My thanks to thee, young traveller.",
      expression: 'happy',
    },
    liked: {
      text: 'Aye, this be a fine gift indeed. Many thanks, traveller.',
      expression: 'smile',
    },
    neutral: {
      text: "'Tis kind of thee to think of this old man. I thank thee.",
      expression: 'default',
    },
    disliked: {
      text: "Ah... well, 'tis the thought that matters, child. Mayhaps next time...",
      expression: 'thinky',
    },
  },

  mum_home: {
    loved: {
      text: "Oh sweetheart, you didn't have to! But I absolutely love it, thank you so much!",
      expression: 'happy',
    },
    liked: {
      text: 'How lovely, dear! Thank you so much.',
      expression: 'smile',
    },
    neutral: {
      text: "That's very sweet of you, love.",
      expression: 'default',
    },
    disliked: {
      text: "Oh... well, never mind, love. It's the thought that counts.",
      expression: 'concerned',
    },
  },

  witch: {
    loved: {
      text: 'Ooh, delicious! *cackles* You know the way to a witch\'s heart. Not literally, mind you - that requires a different ritual entirely.',
      expression: 'happy',
    },
    liked: {
      text: "Hmm, useful. I shall add this to my collection. You have my thanks.",
      expression: 'smile',
    },
    neutral: {
      text: '*examines the gift* Interesting. I accept your offering.',
      expression: 'default',
    },
    disliked: {
      text: "A potion? I MAKE these, child! What need have I for my own work? *huffs* Though I suppose it shows you pay attention...",
      expression: 'thinky',
    },
  },

  mushra: {
    loved: {
      text: '*eyes light up* Ohhh, how wonderful! This speaks to my very soul. Thank you, friend!',
      expression: 'happy',
    },
    liked: {
      text: 'How kind of you! I appreciate your thoughtfulness.',
      expression: 'smile',
    },
    neutral: {
      text: 'Thank you for the gift. Every kindness is noted.',
      expression: 'default',
    },
    disliked: {
      text: '*wrinkles nose* Broccoli? I... appreciate the gesture, but we mushroom folk have certain... preferences.',
      expression: 'thinky',
    },
  },

  morgan: {
    loved: {
      text: '*wings flutter excitedly* Oh! Oh! This is perfect! You truly understand fairy magic!',
      expression: 'happy',
    },
    liked: {
      text: '*giggles* How sweet of you! Thank you, mortal friend.',
      expression: 'smile',
    },
    neutral: {
      text: '*tilts head* A gift? How... mortal of you. But thank you.',
      expression: 'default',
    },
    disliked: {
      text: '*sniffs disdainfully* Human cooking? We fairies prefer things more... magical. But I suppose mortals mean well.',
      expression: 'thinky',
    },
  },

  stella: {
    loved: {
      text: '*sparkles with delight* Ohhh! This is wonderful! You have such a kind heart!',
      expression: 'happy',
    },
    liked: {
      text: '*smiles warmly* How lovely! Thank you so much!',
      expression: 'smile',
    },
    neutral: {
      text: '*nods graciously* Thank you for thinking of me.',
      expression: 'default',
    },
    disliked: {
      text: '*wings droop slightly* Oh... human food? We fairies have delicate palates, you see...',
      expression: 'thinky',
    },
  },

  mother_sea: {
    loved: {
      text: '*waves ripple with pleasure* Ah, the Addersmeat... You understand the old ways. The sea remembers your kindness.',
      expression: 'happy',
    },
    liked: {
      text: '*gentle waves lap approvingly* A thoughtful offering. The tides thank you.',
      expression: 'smile',
    },
    neutral: {
      text: '*water swirls calmly* Your gift is received by the eternal waters.',
      expression: 'default',
    },
    disliked: {
      text: '*waves churn with amusement* Water? Child, I AM the water. But your intention... is noted.',
      expression: 'thinky',
    },
  },

  professor_birdimen: {
    loved: {
      text: '*adjusts spectacles excitedly* Fascinating! This will be invaluable for my research! You have a scholarly mind!',
      expression: 'happy',
    },
    liked: {
      text: '*nods approvingly* Quite thoughtful of you. This will find good use.',
      expression: 'smile',
    },
    neutral: {
      text: '*peers over spectacles* Ah, a gift. How... cordial. Thank you.',
      expression: 'default',
    },
    disliked: {
      text: "*ruffles feathers in distaste* Meat? I'm an academic, not a carnivore! Well... mostly. Thank you anyway.",
      expression: 'thinky',
    },
  },

  puffle: {
    loved: {
      text: '*bounces excitedly* Oooh, something sweet! You know just what I like! Thank you, thank you!',
      expression: 'happy',
    },
    liked: {
      text: '*flutters happily* How nice! Thank you!',
      expression: 'smile',
    },
    neutral: {
      text: '*tilts curiously* Oh, a gift? Thank you!',
      expression: 'default',
    },
    disliked: {
      text: "*puffs up slightly* Savoury? Bleh! I prefer sweet things... but thank you for trying.",
      expression: 'thinky',
    },
  },

  suffle: {
    loved: {
      text: '*ears perk up with joy* Sweet treats! My absolute favourite! You are too kind!',
      expression: 'happy',
    },
    liked: {
      text: '*shuffles happily* How thoughtful! Thank you!',
      expression: 'smile',
    },
    neutral: {
      text: '*blinks* A gift for me? Thank you.',
      expression: 'default',
    },
    disliked: {
      text: "*wrinkles nose* Too savoury for my taste... I prefer desserts. But thank you.",
      expression: 'thinky',
    },
  },

  mr_fox: {
    loved: {
      text: '*licks lips* Ah, proper home cooking! You know the way to a fox\'s heart. Most generous!',
      expression: 'happy',
    },
    liked: {
      text: '*tail wags slightly* Quite acceptable. You have my thanks.',
      expression: 'smile',
    },
    neutral: {
      text: '*considers the gift* Hmm. I accept your offering.',
      expression: 'default',
    },
    disliked: {
      text: '*sniffs dismissively* Shop-bought? A fox of my standing prefers the personal touch. But... I suppose you meant well.',
      expression: 'thinky',
    },
  },

  umbra_wolf: {
    loved: {
      text: '*eyes gleam with approval* A worthy offering. You understand what pleases the shadows.',
      expression: 'happy',
    },
    liked: {
      text: '*nods slowly* Acceptable. The shadow pack acknowledges your gift.',
      expression: 'smile',
    },
    neutral: {
      text: '*regards you silently for a moment* ...Your tribute is noted.',
      expression: 'default',
    },
    disliked: {
      text: '*growls softly* Vegetables? The shadow wolves do not graze. ...But your courage in approaching is noted.',
      expression: 'thinky',
    },
  },

  shopkeeper: {
    loved: {
      text: "Well now, aren't you a thoughtful one! This is just lovely, thank you kindly!",
      expression: 'happy',
    },
    liked: {
      text: 'How kind of you! Business partners should look after each other, I always say.',
      expression: 'smile',
    },
    neutral: {
      text: "Ah, a gift? That's... nice of you. Thank you.",
      expression: 'default',
    },
    disliked: {
      text: "Oh... well, I appreciate the thought. Perhaps you'd like to see what I have in stock instead?",
      expression: 'thinky',
    },
  },

  // === NON-SPEAKING NPCs (descriptive actions in italics) ===

  cat: {
    loved: {
      text: "*The cat's eyes widen with delight. It purrs loudly and rubs against your legs, clearly pleased with the offering.*",
      expression: 'happy',
    },
    liked: {
      text: '*The cat sniffs the gift with interest, then meows approvingly. It seems satisfied.*',
      expression: 'smile',
    },
    neutral: {
      text: '*The cat regards the gift with feline indifference, then yawns. It neither accepts nor rejects your offering.*',
      expression: 'default',
    },
    disliked: {
      text: '*The cat recoils from the scent, wrinkling its nose in disgust. It turns away with tail held high, clearly unimpressed.*',
      expression: 'thinky',
    },
  },

  dog: {
    loved: {
      text: "*The dog's tail wags furiously! It gobbles up the treat and looks at you with pure adoration, tongue lolling happily.*",
      expression: 'happy',
    },
    liked: {
      text: '*The dog accepts the gift eagerly, tail wagging. It gives your hand a grateful lick.*',
      expression: 'smile',
    },
    neutral: {
      text: '*The dog sniffs the gift curiously, then looks up at you with gentle eyes. A polite tail wag follows.*',
      expression: 'default',
    },
    disliked: {
      text: '*The dog backs away from the gift, whimpering softly. Something about it seems to upset it. Best not to offer this again.*',
      expression: 'thinky',
    },
  },

  cow: {
    loved: {
      text: "*The cow's eyes light up! It munches the salad contentedly, letting out a happy 'moo' between bites.*",
      expression: 'happy',
    },
    liked: {
      text: "*The cow accepts your offering and chews thoughtfully, regarding you with warm, gentle eyes.*",
      expression: 'smile',
    },
    neutral: {
      text: '*The cow looks at the gift, then back at you. It chews its cud contemplatively, neither excited nor displeased.*',
      expression: 'default',
    },
    disliked: {
      text: '*The cow sniffs the gift and turns its head away with a soft snort. Not to its taste, apparently.*',
      expression: 'thinky',
    },
  },

  deer: {
    loved: {
      text: "*The deer's ears perk up with delight! It nibbles the greens daintily, then nuzzles your hand in gratitude.*",
      expression: 'happy',
    },
    liked: {
      text: '*The deer accepts the gift gracefully, its large eyes shimmering with quiet appreciation.*',
      expression: 'smile',
    },
    neutral: {
      text: '*The deer regards the offering with gentle curiosity, then bows its head in a gesture of acknowledgement.*',
      expression: 'default',
    },
    disliked: {
      text: '*The deer recoils, eyes wide with alarm at the scent of meat. It backs away nervously, hooves clicking on the ground.*',
      expression: 'thinky',
    },
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize NPC ID to base type for gift preference lookup
 * Handles dynamic IDs like 'chill_bear_12345' → 'bear', 'village_cat' → 'cat'
 */
function normalizeNpcId(npcId: string): string {
  // Map of patterns to base types
  const npcPatterns: Array<[RegExp | string, string]> = [
    // Animals with location prefixes
    [/^(village_|debug_|farm_)?cat(_\d+)?$/, 'cat'],
    [/^(village_|debug_)?dog(_\d+)?$/, 'dog'],
    [/^(farm_)?cow(_\d+)?$/, 'cow'],
    [/^(debug_)?deer(_\d+)?$/, 'deer'],
    // Characters with location/seed prefixes
    [/^(chill_)?bear(_\d+)?$/, 'bear'],
    [/^(debug_)?chill_bear(_\d+)?$/, 'bear'],
    [/^(mum_home|mum_kitchen|debug_mum)$/, 'mum_home'],
    [/^(village_elder|debug_elder)$/, 'village_elder'],
    [/^(debug_)?mushra(_\d+)?$/, 'mushra'],
    [/^(debug_)?morgan(_\d+)?$/, 'morgan'],
    [/^(debug_)?stella(_\d+)?$/, 'stella'],
    [/^umbra_wolf(_\d+)?$/, 'umbra_wolf'],
    [/^(debug_)?puffle(_\d+)?$/, 'puffle'],
    [/^(debug_)?suffle(_\d+)?$/, 'suffle'],
  ];

  for (const [pattern, baseType] of npcPatterns) {
    if (typeof pattern === 'string') {
      if (npcId === pattern) return baseType;
    } else {
      if (pattern.test(npcId)) return baseType;
    }
  }

  // Return original ID if no pattern matched
  return npcId;
}

/**
 * Check if a food item is a home made dessert (recipe category: dessert)
 */
function isHomeMadeDessert(itemId: string): boolean {
  const recipe = Object.values(RECIPES).find((r) => r.resultItemId === itemId);
  return recipe?.category === 'dessert';
}

/**
 * Check if a food item is savoury (recipe category: savoury or starter)
 */
function isSavouryFood(itemId: string): boolean {
  const recipe = Object.values(RECIPES).find((r) => r.resultItemId === itemId);
  return recipe?.category === 'savoury' || recipe?.category === 'starter';
}

/**
 * Check if an item is a grocery/shop item
 */
function isGroceryItem(itemId: string): boolean {
  const item = getItem(itemId);
  return item?.category === ItemCategory.INGREDIENT;
}

/**
 * Determine the gift reaction for an NPC based on item given
 *
 * Priority:
 * 1. Check specific loved items
 * 2. Check specific disliked items
 * 3. Check category preferences (home cooked, desserts, etc.)
 * 4. Default to 'neutral' or 'liked' for food
 */
export function getGiftReaction(npcId: string, itemId: string): GiftReaction {
  const normalizedId = normalizeNpcId(npcId);
  const prefs = NPC_GIFT_PREFERENCES[normalizedId];
  const item = getItem(itemId);

  if (!item) {
    return 'neutral';
  }

  // Check specific loved items first
  if (prefs?.loves.includes(itemId)) {
    return 'loved';
  }

  // Check specific disliked items
  if (prefs?.dislikes.includes(itemId)) {
    return 'disliked';
  }

  // Check category-based preferences
  if (prefs) {
    // Check if NPC loves home cooked food
    if (prefs.lovesHomeCookedFood && item.category === ItemCategory.FOOD) {
      return 'loved';
    }

    // Check if NPC dislikes home cooked food
    if (prefs.dislikesHomeCookedFood && item.category === ItemCategory.FOOD) {
      return 'disliked';
    }

    // Check if NPC loves home made desserts
    if (prefs.lovesHomeMadeDesserts && isHomeMadeDessert(itemId)) {
      return 'loved';
    }

    // Check if NPC dislikes savoury food
    if (prefs.dislikesSavouryFood && isSavouryFood(itemId)) {
      return 'disliked';
    }

    // Check if NPC loves savoury home cooked food
    if (prefs.lovesSavouryHomeCookedFood && isSavouryFood(itemId)) {
      return 'loved';
    }

    // Check if NPC dislikes grocery items
    if (prefs.dislikesGroceryItems && isGroceryItem(itemId)) {
      return 'disliked';
    }
  }

  // Default: Food items get 'liked', everything else 'neutral'
  if (item.category === ItemCategory.FOOD) {
    return 'liked';
  }

  return 'neutral';
}

/**
 * Get the dialogue text for a gift reaction
 * Falls back to default reactions if NPC doesn't have specific dialogue
 */
export function getGiftReactionDialogue(
  npcId: string,
  reaction: GiftReaction
): GiftReactionDialogue {
  // Normalize NPC ID for lookup
  const normalizedId = normalizeNpcId(npcId);

  // Check for NPC-specific reactions first
  const npcReactions = NPC_GIFT_REACTIONS[normalizedId];
  if (npcReactions && npcReactions[reaction]) {
    return npcReactions[reaction];
  }

  // Fall back to defaults
  return DEFAULT_GIFT_REACTIONS[reaction];
}

/**
 * Check if an NPC has custom gift reaction dialogue
 */
export function hasCustomGiftReactions(npcId: string): boolean {
  return npcId in NPC_GIFT_REACTIONS;
}
