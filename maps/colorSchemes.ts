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
      grass: 'bg-palette-khaki',
      rock: 'bg-palette-gray',
      water: 'bg-palette-sky',
      path: 'bg-palette-beige',
      floor: 'bg-palette-tan',
      wall: 'bg-palette-brown',
      carpet: 'bg-palette-olive',
      door: 'bg-palette-rust',
      special: 'bg-palette-iris',
      furniture: 'bg-palette-khaki',
      mushroom: 'bg-palette-sage',
      background: 'bg-palette-moss',
    },
  },

  forest: {
    name: 'forest',
    colors: {
      grass: 'bg-palette-moss',
      rock: 'bg-palette-taupe',
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
