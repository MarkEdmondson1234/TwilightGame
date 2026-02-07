/**
 * Decoration crafting recipes
 *
 * Defines recipes for crafting decorations from foraged/farmed materials:
 * - Paints: forageable + honey/water → paint pot (for framed paintings)
 * - Flower Arrangements: vase + foraged flowers → arrangement
 * - Potted Plants: plant pot + crop → potted plant
 */

// ===== RECIPE TYPES =====

export type DecorationRecipeCategory = 'paint' | 'flower_arrangement' | 'potted_plant' | 'canvas';

export interface DecorationIngredient {
  itemId: string;
  quantity: number;
}

export interface DecorationRecipe {
  id: string;
  displayName: string;
  description: string;
  category: DecorationRecipeCategory;
  ingredients: DecorationIngredient[];
  resultItemId: string;
  resultQuantity: number;
  /** Hex colour for paint recipes (used for frame styling) */
  colour?: string;
  /** Hint shown when ingredients are locked/unavailable */
  hint?: string;
}

// ===== PAINT RECIPES =====
// Each paint is crafted from an existing forageable/crop + a binding agent (honey or water)

export const PAINT_RECIPES: Record<string, DecorationRecipe> = {
  paint_teal: {
    id: 'paint_teal',
    displayName: 'Teal Paint',
    description: 'A vibrant teal made from luminescent toadstools.',
    category: 'paint',
    ingredients: [
      { itemId: 'luminescent_toadstool', quantity: 2 },
      { itemId: 'water', quantity: 1 },
    ],
    resultItemId: 'paint_teal',
    resultQuantity: 1,
    colour: '#1F4B5F',
    hint: 'Forage luminescent toadstools in the forest.',
  },

  paint_yellow: {
    id: 'paint_yellow',
    displayName: 'Mustard Yellow Paint',
    description: 'A warm yellow ground from eye of newt seeds.',
    category: 'paint',
    ingredients: [
      { itemId: 'eye_of_newt', quantity: 2 },
      { itemId: 'water', quantity: 1 },
    ],
    resultItemId: 'paint_yellow',
    resultQuantity: 1,
    colour: '#D4B85B',
    hint: 'Forage eye of newt from wild mustard flowers.',
  },

  paint_violet: {
    id: 'paint_violet',
    displayName: 'Violet Paint',
    description: 'A delicate purple from shrinking violets.',
    category: 'paint',
    ingredients: [
      { itemId: 'shrinking_violet', quantity: 2 },
      { itemId: 'water', quantity: 1 },
    ],
    resultItemId: 'paint_violet',
    resultQuantity: 1,
    colour: '#6B1D5C',
    hint: 'Forage shrinking violets in the forest.',
  },

  paint_silver: {
    id: 'paint_silver',
    displayName: 'Moonlit Silver Paint',
    description: 'A shimmering silver that glows faintly. Made from moonpetals.',
    category: 'paint',
    ingredients: [
      { itemId: 'moonpetal', quantity: 2 },
      { itemId: 'honey', quantity: 1 },
    ],
    resultItemId: 'paint_silver',
    resultQuantity: 1,
    colour: '#C5C6D0',
    hint: 'Forage moonpetals at night during spring or summer.',
  },

  paint_blue: {
    id: 'paint_blue',
    displayName: 'Deep Blue Paint',
    description: 'A rich blue that shimmers like starlight. Made from addersmeat.',
    category: 'paint',
    ingredients: [
      { itemId: 'addersmeat', quantity: 2 },
      { itemId: 'honey', quantity: 1 },
    ],
    resultItemId: 'paint_blue',
    resultQuantity: 1,
    colour: '#3E3F5E',
    hint: 'Forage addersmeat at night during spring or summer.',
  },

  paint_purple: {
    id: 'paint_purple',
    displayName: 'Dark Purple Paint',
    description: 'A deep, mysterious purple from wolfsbane.',
    category: 'paint',
    ingredients: [
      { itemId: 'wolfsbane', quantity: 2 },
      { itemId: 'water', quantity: 1 },
    ],
    resultItemId: 'paint_purple',
    resultQuantity: 1,
    colour: '#5C3D5C',
    hint: 'Forage wolfsbane in the forest.',
  },

  paint_gold: {
    id: 'paint_gold',
    displayName: 'Gilded Gold Paint',
    description: 'A warm, golden paint from phoenix ash. Feels faintly warm.',
    category: 'paint',
    ingredients: [
      { itemId: 'phoenix_ash', quantity: 2 },
      { itemId: 'honey', quantity: 1 },
    ],
    resultItemId: 'paint_gold',
    resultQuantity: 1,
    colour: '#E6A847',
    hint: 'Gather phoenix ash from smouldering embers.',
  },

  paint_ice: {
    id: 'paint_ice',
    displayName: 'Frost Blue Paint',
    description: 'A crystalline ice blue from winter frost flowers.',
    category: 'paint',
    ingredients: [
      { itemId: 'frost_flower', quantity: 2 },
      { itemId: 'water', quantity: 1 },
    ],
    resultItemId: 'paint_ice',
    resultQuantity: 1,
    colour: '#A8D8EA',
    hint: 'Forage frost flowers during winter snowfall.',
  },

  paint_red: {
    id: 'paint_red',
    displayName: 'Strawberry Red Paint',
    description: 'A bright red made from crushed strawberries.',
    category: 'paint',
    ingredients: [
      { itemId: 'crop_strawberry', quantity: 3 },
      { itemId: 'water', quantity: 1 },
    ],
    resultItemId: 'paint_red',
    resultQuantity: 1,
    colour: '#E05D6F',
    hint: 'Grow strawberries in spring or summer.',
  },

  paint_green: {
    id: 'paint_green',
    displayName: 'Spinach Green Paint',
    description: 'A rich earthy green made from fresh spinach.',
    category: 'paint',
    ingredients: [
      { itemId: 'crop_spinach', quantity: 3 },
      { itemId: 'water', quantity: 1 },
    ],
    resultItemId: 'paint_green',
    resultQuantity: 1,
    colour: '#5A7247',
    hint: 'Grow spinach in spring or summer.',
  },
};

// ===== CANVAS RECIPE =====

export const CANVAS_RECIPE: DecorationRecipe = {
  id: 'blank_canvas',
  displayName: 'Blank Canvas',
  description: 'A stretched canvas ready for painting.',
  category: 'canvas',
  ingredients: [
    { itemId: 'linen', quantity: 1 },
    { itemId: 'wooden_frame', quantity: 1 },
  ],
  resultItemId: 'blank_canvas',
  resultQuantity: 1,
};

// ===== FLOWER ARRANGEMENT RECIPES =====
// Vase + 1-3 foraged flowers → arrangement

export const FLOWER_ARRANGEMENT_RECIPES: Record<string, DecorationRecipe> = {
  arrangement_moonpetal: {
    id: 'arrangement_moonpetal',
    displayName: 'Moonpetal Arrangement',
    description: 'A delicate vase of softly glowing moonpetals.',
    category: 'flower_arrangement',
    ingredients: [
      { itemId: 'ceramic_vase', quantity: 1 },
      { itemId: 'moonpetal', quantity: 3 },
    ],
    resultItemId: 'decoration_arrangement_moonpetal',
    resultQuantity: 1,
    hint: 'Forage moonpetals at night during spring or summer.',
  },

  arrangement_violet: {
    id: 'arrangement_violet',
    displayName: 'Violet Posy',
    description: 'A sweet arrangement of shrinking violets in a ceramic vase.',
    category: 'flower_arrangement',
    ingredients: [
      { itemId: 'ceramic_vase', quantity: 1 },
      { itemId: 'shrinking_violet', quantity: 3 },
    ],
    resultItemId: 'decoration_arrangement_violet',
    resultQuantity: 1,
    hint: 'Forage shrinking violets in the forest.',
  },

  arrangement_frost: {
    id: 'arrangement_frost',
    displayName: 'Winter Frost Display',
    description: 'Frost flowers preserved in a glass vase. They never quite melt.',
    category: 'flower_arrangement',
    ingredients: [
      { itemId: 'ceramic_vase', quantity: 1 },
      { itemId: 'frost_flower', quantity: 3 },
    ],
    resultItemId: 'decoration_arrangement_frost',
    resultQuantity: 1,
    hint: 'Forage frost flowers during winter snowfall.',
  },

  arrangement_mixed: {
    id: 'arrangement_mixed',
    displayName: 'Mixed Wildflower Bouquet',
    description: 'A cheerful mix of wildflowers from the forest.',
    category: 'flower_arrangement',
    ingredients: [
      { itemId: 'ceramic_vase', quantity: 1 },
      { itemId: 'moonpetal', quantity: 1 },
      { itemId: 'shrinking_violet', quantity: 1 },
      { itemId: 'wolfsbane', quantity: 1 },
    ],
    resultItemId: 'decoration_arrangement_mixed',
    resultQuantity: 1,
  },

  arrangement_sunflower: {
    id: 'arrangement_sunflower',
    displayName: 'Sunflower Vase',
    description: 'Bright sunflowers standing tall in a ceramic vase.',
    category: 'flower_arrangement',
    ingredients: [
      { itemId: 'ceramic_vase', quantity: 1 },
      { itemId: 'crop_sunflower', quantity: 3 },
    ],
    resultItemId: 'decoration_arrangement_sunflower',
    resultQuantity: 1,
    hint: 'Grow sunflowers in summer.',
  },
};

// ===== POTTED PLANT RECIPES =====
// Plant pot + crop → potted plant decoration

export const POTTED_PLANT_RECIPES: Record<string, DecorationRecipe> = {
  potted_strawberry: {
    id: 'potted_strawberry',
    displayName: 'Potted Strawberry',
    description: 'A sweet little strawberry plant in a terracotta pot.',
    category: 'potted_plant',
    ingredients: [
      { itemId: 'plant_pot', quantity: 1 },
      { itemId: 'crop_strawberry', quantity: 2 },
    ],
    resultItemId: 'decoration_potted_strawberry',
    resultQuantity: 1,
  },

  potted_herbs: {
    id: 'potted_herbs',
    displayName: 'Potted Herbs',
    description: 'A fragrant pot of fresh herbs for the kitchen windowsill.',
    category: 'potted_plant',
    ingredients: [
      { itemId: 'plant_pot', quantity: 1 },
      { itemId: 'mint', quantity: 2 },
    ],
    resultItemId: 'decoration_potted_herbs',
    resultQuantity: 1,
  },

  potted_sunflower: {
    id: 'potted_sunflower',
    displayName: 'Potted Sunflower',
    description: 'A cheerful sunflower growing in a terracotta pot.',
    category: 'potted_plant',
    ingredients: [
      { itemId: 'plant_pot', quantity: 1 },
      { itemId: 'crop_sunflower', quantity: 1 },
    ],
    resultItemId: 'decoration_potted_sunflower',
    resultQuantity: 1,
  },
};

// ===== ALL RECIPES =====

export const ALL_DECORATION_RECIPES: Record<string, DecorationRecipe> = {
  ...PAINT_RECIPES,
  [CANVAS_RECIPE.id]: CANVAS_RECIPE,
  ...FLOWER_ARRANGEMENT_RECIPES,
  ...POTTED_PLANT_RECIPES,
};

/**
 * Get a decoration recipe by ID
 */
export function getDecorationRecipe(recipeId: string): DecorationRecipe | undefined {
  return ALL_DECORATION_RECIPES[recipeId];
}

/**
 * Get all recipes of a specific category
 */
export function getRecipesByCategory(category: DecorationRecipeCategory): DecorationRecipe[] {
  return Object.values(ALL_DECORATION_RECIPES).filter((r) => r.category === category);
}

/**
 * Get all paint recipes (convenience accessor)
 */
export function getPaintRecipes(): DecorationRecipe[] {
  return Object.values(PAINT_RECIPES);
}

/**
 * Get paint recipe colour map (paintId → hex colour)
 */
export function getPaintColourMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const recipe of Object.values(PAINT_RECIPES)) {
    if (recipe.colour) {
      map[recipe.resultItemId] = recipe.colour;
    }
  }
  return map;
}
