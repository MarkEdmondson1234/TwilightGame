/**
 * Potions — brewed at the cauldron, plus quest-specific potions.
 *
 * Add here: any brewable potion and its quest variants. Ingredients for these
 * live in `./magicalIngredients.ts`.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import { potionAssets } from '../../assets';
import { ItemCategory, ItemRarity, type ItemDefinition } from './types';

export const POTION_ITEMS: Record<string, ItemDefinition> = {
  // ===== POTIONS =====
  // Level 1: Novice Witch
  potion_friendship: {
    id: 'potion_friendship',
    name: 'potion_friendship',
    displayName: 'Friendship Elixir',
    category: ItemCategory.POTION,
    description:
      'A warm, rose-pink potion that shimmers gently. Give this to someone you want to befriend.',
    stackable: true,
    sellPrice: 50,
    image: potionAssets.friendship_elixir,
  },

  potion_bitter_grudge: {
    id: 'potion_bitter_grudge',
    name: 'potion_bitter_grudge',
    displayName: 'Bitter Grudge',
    category: ItemCategory.POTION,
    description:
      'A murky, dark green potion with a sour smell. Decreases friendship with the target NPC.',
    stackable: true,
    sellPrice: 45,
    image: potionAssets.bitter_grudge,
  },

  potion_glamour: {
    id: 'potion_glamour',
    name: 'potion_glamour',
    displayName: 'Glamour Draught',
    category: ItemCategory.POTION,
    description:
      'A swirling, vibrant purple potion with iridescent sparkles. Temporarily changes your appearance.',
    stackable: true,
    sellPrice: 55,
    image: potionAssets.glamour_draught,
  },

  potion_beastward: {
    id: 'potion_beastward',
    name: 'potion_beastward',
    displayName: 'Beastward Balm',
    category: ItemCategory.POTION,
    description: 'A rich, amber-golden balm with a musky scent. Animals will ignore you for a day.',
    stackable: true,
    sellPrice: 60,
    image: potionAssets.beastward_balm,
  },

  potion_wakefulness: {
    id: 'potion_wakefulness',
    name: 'potion_wakefulness',
    displayName: 'Wakefulness Brew',
    category: ItemCategory.POTION,
    description:
      'A bright, fizzing cyan potion with tiny bubbles. Eliminates tiredness and fatigue.',
    stackable: true,
    sellPrice: 40,
    image: potionAssets.wakefulness_brew,
  },

  potion_revealing: {
    id: 'potion_revealing',
    name: 'potion_revealing',
    displayName: 'Revealing Tonic',
    category: ItemCategory.POTION,
    description: "A clear potion with floating sparkles. Reveals an NPC's favourite gift.",
    stackable: true,
    sellPrice: 35,
    image: potionAssets.revealing_tonic,
  },

  potion_healing: {
    id: 'potion_healing',
    name: 'potion_healing',
    displayName: 'Healing Salve',
    category: ItemCategory.POTION,
    description: 'A soothing green potion. Restores health and energy.',
    stackable: true,
    sellPrice: 45,
    image: potionAssets.healing_salve,
  },

  potion_drink_me: {
    id: 'potion_drink_me',
    name: 'potion_drink_me',
    displayName: 'Drink Me',
    category: ItemCategory.POTION,
    description: 'A tiny bottle with a "DRINK ME" label. Shrinks you to half size!',
    stackable: true,
    sellPrice: 65,
    image: potionAssets.drink_me,
  },

  potion_eat_me: {
    id: 'potion_eat_me',
    name: 'potion_eat_me',
    displayName: 'Eat Me',
    category: ItemCategory.POTION,
    description: 'A small cake-shaped potion with an "EAT ME" label. Makes you grow to 1.5x size!',
    stackable: true,
    sellPrice: 65,
    image: potionAssets.eat_me,
  },

  // Level 2: Journeyman Witch
  potion_raincaller: {
    id: 'potion_raincaller',
    name: 'potion_raincaller',
    displayName: 'Raincaller',
    category: ItemCategory.POTION,
    description: 'A swirling blue potion that smells of petrichor. Summons rain.',
    stackable: true,
    sellPrice: 80,
    image: potionAssets.raincaller,
  },

  potion_sunburst: {
    id: 'potion_sunburst',
    name: 'potion_sunburst',
    displayName: 'Sunburst',
    category: ItemCategory.POTION,
    description: 'A brilliant golden potion. Clears the weather and brings sunshine.',
    stackable: true,
    sellPrice: 85,
    image: potionAssets.sunburst,
  },

  potion_snowglobe: {
    id: 'potion_snowglobe',
    name: 'potion_snowglobe',
    displayName: 'Snowglobe',
    category: ItemCategory.POTION,
    description: 'A cold white potion with swirling flakes. Summons snow anywhere!',
    stackable: true,
    sellPrice: 90,
    image: potionAssets.snowglobe,
  },

  potion_cherry_blossom: {
    id: 'potion_cherry_blossom',
    name: 'potion_cherry_blossom',
    displayName: 'Cherry Blossom Dream',
    category: ItemCategory.POTION,
    description: 'A delicate pink potion. Creates beautiful cherry blossom weather.',
    stackable: true,
    sellPrice: 95,
    image: potionAssets.cherry_blossom,
  },

  potion_mistweaver: {
    id: 'potion_mistweaver',
    name: 'potion_mistweaver',
    displayName: 'Mistweaver',
    category: ItemCategory.POTION,
    description: 'A hazy grey potion. Summons thick, mysterious fog.',
    stackable: true,
    sellPrice: 75,
    image: potionAssets.mistweaver,
  },

  potion_verdant_surge: {
    id: 'potion_verdant_surge',
    name: 'potion_verdant_surge',
    displayName: 'Verdant Surge',
    category: ItemCategory.POTION,
    description: 'A vibrant green potion bursting with life. Replenishes all forage bushes.',
    stackable: true,
    sellPrice: 120,
    image: potionAssets.verdant_surge,
  },

  potion_beast_tongue: {
    id: 'potion_beast_tongue',
    name: 'potion_beast_tongue',
    displayName: 'Beast Tongue',
    category: ItemCategory.POTION,
    description: 'A strange potion that tastes like different animals. Lets you talk to beasts!',
    stackable: true,
    sellPrice: 100,
  },

  // Level 3: Full Witch
  potion_time_skip: {
    id: 'potion_time_skip',
    name: 'potion_time_skip',
    displayName: 'Time Skip',
    category: ItemCategory.POTION,
    description:
      'A shimmering potion that seems to exist in multiple moments at once. Advances one day.',
    stackable: true,
    sellPrice: 200,
    image: potionAssets.time_skip,
  },

  potion_dawns_herald: {
    id: 'potion_dawns_herald',
    name: 'potion_dawns_herald',
    displayName: "Dawn's Herald",
    category: ItemCategory.POTION,
    description: 'A potion the colour of sunrise. Skips time to morning.',
    stackable: true,
    sellPrice: 100,
    image: potionAssets.dawns_herald,
  },

  potion_twilight_call: {
    id: 'potion_twilight_call',
    name: 'potion_twilight_call',
    displayName: 'Twilight Call',
    category: ItemCategory.POTION,
    description: 'A deep purple potion. Skips time to dusk - perfect for fairy hunting.',
    stackable: true,
    sellPrice: 110,
  },

  potion_harvest_moon: {
    id: 'potion_harvest_moon',
    name: 'potion_harvest_moon',
    displayName: 'Harvest Moon',
    category: ItemCategory.POTION,
    description: 'An orange potion glowing like a harvest moon. Instantly grows all crops!',
    stackable: true,
    sellPrice: 250,
    image: potionAssets.harvest_moon,
  },

  potion_dewfall: {
    id: 'potion_dewfall',
    name: 'potion_dewfall',
    displayName: 'Dewfall',
    category: ItemCategory.POTION,
    description: 'A refreshing blue potion. Waters all crops in the area.',
    stackable: true,
    sellPrice: 150,
  },

  potion_quality_blessing: {
    id: 'potion_quality_blessing',
    name: 'potion_quality_blessing',
    displayName: 'Quality Blessing',
    category: ItemCategory.POTION,
    description: 'A sparkling golden potion. Upgrades crop quality to excellent.',
    stackable: true,
    sellPrice: 180,
    image: potionAssets.quality_blessing,
  },

  potion_homeward: {
    id: 'potion_homeward',
    name: 'potion_homeward',
    displayName: 'Homeward',
    category: ItemCategory.POTION,
    description: 'A warm, comforting potion. Teleports you instantly home.',
    stackable: true,
    sellPrice: 120,
    image: potionAssets.homeward,
  },

  potion_root_revival: {
    id: 'potion_root_revival',
    name: 'potion_root_revival',
    displayName: 'Root Revival',
    category: ItemCategory.POTION,
    description: 'A vibrant green potion. Revives wilted or dead crops.',
    stackable: true,
    sellPrice: 160,
  },

  potion_abundant_harvest: {
    id: 'potion_abundant_harvest',
    name: 'potion_abundant_harvest',
    displayName: 'Abundant Harvest',
    category: ItemCategory.POTION,
    description: 'A rich amber potion. Guarantees maximum seed drops on harvest.',
    stackable: true,
    sellPrice: 200,
  },

  // Movement potions
  potion_floating: {
    id: 'potion_floating',
    name: 'potion_floating',
    displayName: 'Floatation Philtre',
    category: ItemCategory.POTION,
    description: 'A misty, pale blue potion. Float over water and low obstacles for 2 hours.',
    stackable: true,
    sellPrice: 75,
  },

  potion_flying: {
    id: 'potion_flying',
    name: 'potion_flying',
    displayName: 'Elixir of Flight',
    category: ItemCategory.POTION,
    description: 'A shimmering potion that defies gravity. Fly over all obstacles for 2 hours.',
    stackable: true,
    sellPrice: 150,
  },

  // ===== QUEST POTIONS =====
  // These are received as gifts from NPCs, not brewed

  potion_fairy_form: {
    id: 'potion_fairy_form',
    name: 'potion_fairy_form',
    displayName: 'Fairy Form Potion',
    category: ItemCategory.POTION,
    description:
      'A shimmering vial of fairy magic. Drinking this transforms you into a tiny fairy, allowing you to visit the Fairy Queen inside the ancient oak.',
    rarity: ItemRarity.VERY_RARE,
    stackable: true,
    // No buyPrice - quest item only
    image: potionAssets.fairy_form_potion,
  },
};
