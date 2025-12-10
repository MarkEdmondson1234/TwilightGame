import { ColorScheme } from '../types';

/**
 * Color schemes for different map themes
 * Using the custom palette defined in index.html
 */

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  indoor: {
    name: 'indoor',
    colors: {
      grass: 'bg-palette-tan',
      rock: 'bg-palette-gray',
      water: 'bg-palette-sky',
      path: 'bg-palette-beige',
      floor: 'bg-palette-tan',
      wall: 'bg-palette-brown',
      carpet: 'bg-palette-burgundy',
      door: 'bg-palette-chocolate',
      special: 'bg-palette-rust',
      furniture: 'bg-palette-khaki',
      mushroom: 'bg-palette-tan',
      background: 'bg-palette-charcoal',
    },
  },

  village: {
    name: 'village',
    colors: {
      grass: 'bg-palette-sage',
      rock: 'bg-palette-gray',
      water: 'bg-palette-sky',
      path: 'bg-palette-sage',  // Match grass background
      floor: 'bg-palette-tan',
      wall: 'bg-palette-brown',
      carpet: 'bg-palette-olive',
      door: 'bg-palette-rust',
      special: 'bg-palette-iris',
      furniture: 'bg-palette-khaki',
      mushroom: 'bg-palette-sage',
      background: 'bg-palette-moss',
    },
    // Optional seasonal modifiers - subtle grass color shifts
    seasonalModifiers: {
      spring: {
        grass: 'bg-palette-sage',  // Default sage green
        path: 'bg-palette-sage',   // Match grass
      },
      summer: {
        grass: 'bg-palette-olive',  // Warmer olive
        path: 'bg-palette-olive',   // Match grass
      },
      autumn: {
        grass: 'bg-palette-olive',  // Olive (same as summer)
        path: 'bg-palette-olive',   // Match grass
      },
      winter: {
        grass: 'bg-palette-snow',  // Snow white
        path: 'bg-palette-snow',   // Match grass
        water: 'bg-palette-periwinkle',  // Frozen water tint
      },
    },
    // Optional time-of-day modifiers - darker colors at night
    timeOfDayModifiers: {
      night: {
        grass: 'bg-palette-moss',      // Darker grass at night (default for spring/summer/autumn)
        path: 'bg-palette-moss',       // Match grass at night
        water: 'bg-palette-teal',      // Darker water at night
        floor: 'bg-palette-khaki',     // Darker floor at night
        wall: 'bg-palette-chocolate',  // Darker wall at night
      },
    },
    // Winter-specific night overrides (time-of-day takes priority over seasonal)
    // Note: Currently, we can't do season-specific time overrides in the color scheme format
    // Winter night will use the regular night modifier (moss) instead of snow
    // This is a limitation we could address later if needed
  },

  forest: {
    name: 'forest',
    colors: {
      grass: 'bg-palette-moss',
      rock: 'bg-palette-moss',  // Same as grass for forest floor consistency
      water: 'bg-palette-teal',
      path: 'bg-palette-khaki',
      floor: 'bg-palette-olive',
      wall: 'bg-palette-brown',
      carpet: 'bg-palette-sage',
      door: 'bg-palette-chocolate',
      special: 'bg-palette-olive',
      furniture: 'bg-palette-rust',
      mushroom: 'bg-palette-moss',  // Same as grass for forest
      background: 'bg-palette-olive',
    },
    // Seasonal modifiers for winter snow
    seasonalModifiers: {
      winter: {
        grass: 'bg-palette-snow',  // Snow white in winter
        path: 'bg-palette-snow',   // Match grass
        water: 'bg-palette-periwinkle',  // Frozen water tint
      },
    },
  },

  cave: {
    name: 'cave',
    colors: {
      grass: 'bg-palette-charcoal',
      rock: 'bg-palette-gray',
      water: 'bg-palette-teal',
      path: 'bg-palette-taupe',
      floor: 'bg-palette-gray',
      wall: 'bg-palette-charcoal',
      carpet: 'bg-palette-slate',
      door: 'bg-palette-taupe',
      special: 'bg-palette-violet',
      furniture: 'bg-palette-slate',
      mushroom: 'bg-palette-gray',  // Same as floor for cave
      background: 'bg-palette-black',
    },
  },

  water_area: {
    name: 'water_area',
    colors: {
      grass: 'bg-palette-sage',
      rock: 'bg-palette-slate',
      water: 'bg-palette-sky',
      path: 'bg-palette-beige',
      floor: 'bg-palette-periwinkle',
      wall: 'bg-palette-teal',
      carpet: 'bg-palette-sky',
      door: 'bg-palette-slate',
      special: 'bg-palette-teal',
      furniture: 'bg-palette-lavender',
      mushroom: 'bg-palette-sage',
      background: 'bg-palette-teal',
    },
    // Seasonal modifiers for winter snow
    seasonalModifiers: {
      winter: {
        grass: 'bg-palette-snow',  // Snow white in winter
        path: 'bg-palette-snow',   // Match grass
        water: 'bg-palette-periwinkle',  // Frozen water tint
      },
    },
  },

  shop: {
    name: 'shop',
    colors: {
      grass: 'bg-palette-tan',
      rock: 'bg-palette-gray',
      water: 'bg-palette-sky',
      path: 'bg-palette-gold',
      floor: 'bg-palette-cream',
      wall: 'bg-palette-rust',
      carpet: 'bg-palette-burgundy',
      door: 'bg-palette-chocolate',
      special: 'bg-palette-magenta',
      furniture: 'bg-palette-mustard',
      mushroom: 'bg-palette-cream',
      background: 'bg-palette-maroon',
    },
  },
};
