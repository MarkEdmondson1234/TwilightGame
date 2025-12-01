import { TileType, TileData, Direction, SpriteMetadata } from './types';
import { tileAssets, farmingAssets, animationAssets } from './assets';

export const TILE_SIZE = 64;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 30;
export const PLAYER_SIZE = 0.8; // fraction of a tile

// PixiJS Feature Flag - Set to true to use WebGL rendering (10-100x faster)
// Set to false to use DOM rendering (fallback for compatibility)
export const USE_PIXI_RENDERER = true; // Enabled for testing

// Player sprites now point to placeholder URLs. Frame 0 is idle.
export const PLAYER_SPRITES: Record<Direction, string[]> = {
  [Direction.Down]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%930',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%931',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%930',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%932',
  ],
  [Direction.Up]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%910',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%911',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%910',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%912',
  ],
  [Direction.Left]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%900',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%901',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%900',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%902',
  ],
  [Direction.Right]: [
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%920',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%921',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%920',
    'https://placehold.co/32x32/eab308/000000?text=P%E2%86%922',
  ],
};

// Tile images with placeholders - colors will be overridden by map's color scheme
// Now defined as a Record, no ordering requirement!
export const TILE_LEGEND: Record<TileType, Omit<TileData, 'type'>> = {
  // Outdoor tiles
  [TileType.GRASS]: {
    name: 'Grass',
    color: 'bg-palette-sage',  // Base color, overridden by map color scheme
    isSolid: false,
    image: [
      tileAssets.grass_1,
      tileAssets.grass_2,
    ],
    transforms: {
      enableFlip: true,  // Horizontal flipping for variety
      enableScale: true,
      scaleRange: { min: 0.95, max: 1.05 },  // Very subtle size variation (5%)
    },
  },
  [TileType.ROCK]: {
    name: 'Rock',
    color: 'bg-palette-sage',  // Use grass color so rocks blend with ground
    isSolid: true,
    image: [
      tileAssets.rock_1,
      tileAssets.rock_2,
    ],
    transforms: {
      enableFlip: true,
      enableScale: true,
      enableRotation: true,
      enableBrightness: true,
      scaleRange: { min: 0.85, max: 1.15 },
      rotationRange: { min: -5, max: 10 },
    },
  },
  [TileType.WATER]: {
    name: 'Water',
    color: 'bg-palette-sky',  // Base water color
    isSolid: true,
    image: []
  },
  // Lake tiles with directional edges for proper water rendering
  [TileType.WATER_CENTER]: {
    name: 'Water Center',
    color: 'bg-palette-sky',
    isSolid: true,
    image: [tileAssets.water_center]
  },
  [TileType.WATER_LEFT]: {
    name: 'Water Left Edge',
    color: 'bg-palette-sky',
    isSolid: true,
    // All edge variations - will be randomly selected and rotated to face left
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
    transforms: {
      enableRotation: true,
      rotationMode: 'lake_edge_left'  // Custom mode for lake edge rotation
    }
  },
  [TileType.WATER_RIGHT]: {
    name: 'Water Right Edge',
    color: 'bg-palette-sky',
    isSolid: true,
    // All edge variations - will be randomly selected and rotated to face right
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
    transforms: {
      enableRotation: true,
      rotationMode: 'lake_edge_right'  // Custom mode for lake edge rotation
    }
  },
  [TileType.WATER_TOP]: {
    name: 'Water Top Edge',
    color: 'bg-palette-sky',
    isSolid: true,
    // All edge variations - will be randomly selected and rotated to face top
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
    transforms: {
      enableRotation: true,
      rotationMode: 'lake_edge_top'  // Custom mode for lake edge rotation
    }
  },
  [TileType.WATER_BOTTOM]: {
    name: 'Water Bottom Edge',
    color: 'bg-palette-sky',
    isSolid: true,
    // All edge variations - will be randomly selected and rotated to face bottom
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
    transforms: {
      enableRotation: true,
      rotationMode: 'lake_edge_bottom'  // Custom mode for lake edge rotation
    }
  },
  [TileType.PATH]: {
    name: 'Path',
    color: 'bg-palette-sage',  // Fallback color
    isSolid: false,
    baseType: TileType.GRASS,  // Render grass underneath so stepping stones blend with map's grass color
    image: [
      tileAssets.stepping_stones_1,
      tileAssets.stepping_stones_1,
      tileAssets.stepping_stones_1,  // stepping_stones_1: 25%
      tileAssets.stepping_stones_2,
      tileAssets.stepping_stones_2,
      tileAssets.stepping_stones_2,  // stepping_stones_2: 25%
      tileAssets.stepping_stones_3,
      tileAssets.stepping_stones_3,
      tileAssets.stepping_stones_3,  // stepping_stones_3: 25%
      tileAssets.stepping_stones_4,
      tileAssets.stepping_stones_4,
      tileAssets.stepping_stones_4   // stepping_stones_4: 25%
    ],
    transforms: {
      enableFlip: true,
      enableScale: true,
      enableRotation: true,
      rotationMode: 'full360',  // Full 360-degree rotation for variety
      scaleRange: { min: 0.9, max: 1.1 },  // Subtle size variation (was 0.7-1.3, too extreme)
    },
  },

  // Indoor tiles
  [TileType.FLOOR]: {
    name: 'Floor',
    color: 'bg-palette-tan',  // Base floor color
    isSolid: false,
    image: [tileAssets.floor_light]
  },
  [TileType.FLOOR_LIGHT]: {
    name: 'Floor Light',
    color: 'bg-palette-tan',  // Base floor color
    isSolid: false,
    image: [tileAssets.floor_light]
  },
  [TileType.FLOOR_DARK]: {
    name: 'Floor Dark',
    color: 'bg-palette-tan',  // Base floor color
    isSolid: false,
    image: [tileAssets.floor_dark]
  },
  [TileType.MINE_FLOOR]: {
    name: 'Mine Floor',
    color: 'bg-stone-700',  // Rocky mine floor color
    isSolid: false,
    image: [tileAssets.mine_floor]
  },
  [TileType.WALL]: {
    name: 'Wall',
    color: 'bg-palette-brown',  // Base wall color
    isSolid: true,
    image: []
  },
  [TileType.WOODEN_WALL_POOR]: {
    name: 'Wooden Wall (Poor)',
    color: 'bg-palette-brown',  // Base wall color
    isSolid: true,
    image: [tileAssets.wooden_wall_poor]
  },
  [TileType.WOODEN_WALL]: {
    name: 'Wooden Wall',
    color: 'bg-palette-brown',  // Base wall color
    isSolid: true,
    image: [tileAssets.wooden_wall]
  },
  [TileType.WOODEN_WALL_POSH]: {
    name: 'Wooden Wall (Posh)',
    color: 'bg-palette-brown',  // Base wall color
    isSolid: true,
    image: [tileAssets.wooden_wall_posh]
  },
  [TileType.CARPET]: {
    name: 'Carpet',
    color: 'bg-palette-burgundy',  // Base carpet color
    isSolid: false,
    image: []
  },
  [TileType.RUG]: {
    name: 'Rug',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: false,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },

  // Transition tiles
  [TileType.DOOR]: {
    name: 'Door',
    color: 'bg-palette-chocolate',  // Base door color
    isSolid: false,
    image: [tileAssets.door_1]
  },
  [TileType.EXIT_DOOR]: {
    name: 'Exit Door',
    color: 'bg-palette-rust',  // Base special tile color
    isSolid: false,
    image: [tileAssets.door_1]
  },
  [TileType.SHOP_DOOR]: {
    name: 'Shop Door',
    color: 'bg-palette-rust',  // Base special tile color
    isSolid: false,
    image: [tileAssets.door_1]
  },
  [TileType.MINE_ENTRANCE]: {
    name: 'Mine Entrance',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,  // Player cannot walk through the rocks
    image: []  // Uses multi-tile sprite from SPRITE_METADATA
  },

  // Furniture/objects
  [TileType.TABLE]: {
    name: 'Table',
    color: 'bg-palette-khaki',  // Base furniture color
    isSolid: true,  // Solid - can't walk through tables
    image: []
  },
  [TileType.CHAIR]: {
    name: 'Chair',
    color: 'bg-palette-khaki',  // Base furniture color
    isSolid: false,
    image: []
  },
  [TileType.MIRROR]: {
    name: 'Mirror',
    color: 'bg-palette-sky',
    isSolid: false,
    image: []
  },

  // Decorative
  [TileType.MUSHROOM]: {
    name: 'Mushroom',
    color: 'bg-palette-sage',  // Fallback color
    isSolid: false,
    baseType: TileType.GRASS,  // Render grass underneath (uses map's color scheme)
    image: [tileAssets.mushrooms],
    transforms: {
      enableFlip: true,
      enableScale: true,
      enableRotation: true,
      enableBrightness: true,
      scaleRange: { min: 0.85, max: 1.15 },
      rotationRange: { min: -5, max: 10 },
    },
  },
  [TileType.FERN]: {
    name: 'Fern',
    color: 'bg-palette-sage',  // Fallback color
    isSolid: false,
    baseType: TileType.GRASS,  // Render grass underneath (uses map's color scheme)
    image: [tileAssets.forest_fern3, tileAssets.forest_fern3, tileAssets.forest_fern3, tileAssets.forest_fern1, tileAssets.forest_fern2],
    transforms: {
      enableFlip: true,
      enableScale: true,
      enableRotation: true,
      enableBrightness: true,
      scaleRange: { min: 0.6, max: 1.8 },  // More size variation for natural forest floor
      rotationRange: { min: -15, max: 15 },
    },
  },
  [TileType.BUSH]: {
    name: 'Bush',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    image: []  // No image - uses color only so it matches the map's grass color
  },
  [TileType.TREE]: {
    name: 'Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    image: []  // No image - uses color only so it matches the map's grass color
  },
  [TileType.TREE_BIG]: {
    name: 'Big Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    image: [
      tileAssets.grass_1,
      tileAssets.grass_2,
    ]  // Use grass images as background so it matches surrounding grass
  },
  [TileType.CHERRY_TREE]: {
    name: 'Cherry Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the cherry tree sprite
    seasonalImages: {
      spring: [
        tileAssets.tree_cherry_spring,
        tileAssets.tree_cherry_spring,
        tileAssets.tree_cherry_spring,  // Cherry blossoms appear 75% in spring
        tileAssets.tree_2,
      ],
      summer: [
        tileAssets.tree_cherry_summer_fruit,
        tileAssets.tree_cherry_summer_fruit,  // Cherry trees with fruit 50% in summer
        tileAssets.tree_cherry_summer_no_fruit,  // Cherry trees without fruit 25%
        tileAssets.tree_2,  // Regular trees 25%
      ],
      autumn: [
        tileAssets.tree_cherry_autumn,
        tileAssets.tree_cherry_autumn,
        tileAssets.tree_cherry_autumn,  // Cherry trees with pink/red foliage 75% in autumn
        tileAssets.tree_2,  // Regular trees 25%
      ],
      winter: [
        tileAssets.tree_cherry_winter,
        tileAssets.tree_cherry_winter,
        tileAssets.tree_cherry_winter,  // Cherry trees with snow 75% in winter
        tileAssets.tree_2,  // Regular trees 25%
      ],
      default: [tileAssets.tree_1, tileAssets.tree_2],  // Fallback
    }
  },
  [TileType.OAK_TREE]: {
    name: 'Oak Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the oak tree sprite
    seasonalImages: {
      spring: [tileAssets.oak_tree_spring],
      summer: [tileAssets.oak_tree_summer],
      autumn: [tileAssets.oak_tree_autumn],
      winter: [tileAssets.oak_tree_winter],
      default: [tileAssets.oak_tree_summer],
    }
  },
  [TileType.FAIRY_OAK]: {
    name: 'Fairy Oak',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the fairy oak sprite
    seasonalImages: {
      spring: [tileAssets.fairy_oak_spring],
      summer: [tileAssets.fairy_oak_summer],
      autumn: [tileAssets.fairy_oak_autumn],
      winter: [tileAssets.fairy_oak_winter],
      default: [tileAssets.fairy_oak_summer],
    }
  },
  [TileType.FAIRY_OAK_GIANT]: {
    name: 'Giant Fairy Oak',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the fairy oak sprite
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.SPRUCE_TREE]: {
    name: 'Spruce Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the spruce tree sprite
    seasonalImages: {
      spring: [tileAssets.spruce_tree],
      summer: [tileAssets.spruce_tree],
      autumn: [tileAssets.spruce_tree],
      winter: [tileAssets.spruce_tree_winter],
      default: [tileAssets.spruce_tree],
    }
  },

  // Building tiles
  [TileType.WALL_BOUNDARY]: {
    name: 'Wall Boundary',
    color: 'bg-palette-taupe',
    isSolid: true,
    image: []
  },
  [TileType.BUILDING_WALL]: {
    name: 'Building Wall',
    color: 'bg-palette-gray',
    isSolid: true,
    image: [tileAssets.bricks_1]
  },
  [TileType.BUILDING_ROOF]: {
    name: 'Building Roof',
    color: 'bg-palette-maroon',
    isSolid: true,
    image: []
  },
  [TileType.BUILDING_DOOR]: {
    name: 'Building Door',
    color: 'bg-palette-chocolate',
    isSolid: false,
    image: []
  },
  [TileType.BUILDING_WINDOW]: {
    name: 'Building Window',
    color: 'bg-palette-sky',
    isSolid: true,
    image: []
  },
  [TileType.COTTAGE]: {
    name: 'Cottage',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: []
  },
  [TileType.COTTAGE_STONE]: {
    name: 'Cottage Stone',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: []
  },
  [TileType.COTTAGE_FLOWERS]: {
    name: 'Cottage Flowers',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: []
  },
  [TileType.SHOP]: {
    name: 'Shop',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: [],
    seasonalImages: {
      spring: [tileAssets.shop_spring],
      summer: [tileAssets.shop_summer],
      autumn: [tileAssets.shop_autumn],
      winter: [tileAssets.shop_winter],
      default: [tileAssets.shop_spring],  // Default to spring
    }
  },
  [TileType.GARDEN_SHED]: {
    name: 'Garden Shed',
    color: 'bg-palette-sage',  // Base grass color for background
    isSolid: true,
    image: [],
    seasonalImages: {
      spring: [tileAssets.garden_shed_spring],
      summer: [tileAssets.garden_shed_summer],
      autumn: [tileAssets.garden_shed_autumn],
      winter: [tileAssets.garden_shed_winter],
      default: [tileAssets.garden_shed_spring],  // Default to spring
    }
  },

  // Farmland tiles
  [TileType.SOIL_FALLOW]: {
    name: 'Fallow Soil',
    color: 'bg-palette-brown',  // Distinct medium brown - clearly different from grass
    isSolid: false,
    image: [
      farmingAssets.fallow_soil_1,
      farmingAssets.fallow_soil_2,
    ],
    transforms: {
      enableFlip: true,
      enableRotation: true,
      enableBrightness: true,
      rotationMode: 'flip180',  // Only 0 or 180 degrees (horizontal flip only)
    },
  },
  [TileType.SOIL_TILLED]: {
    name: 'Tilled Soil',
    color: 'bg-palette-chocolate',  // Darker rich brown for freshly tilled soil
    isSolid: false,
    image: [farmingAssets.tilled]
  },
  [TileType.SOIL_PLANTED]: {
    name: 'Planted Soil',
    color: 'bg-palette-chocolate', // Rich brown soil as background for plants
    isSolid: false,
    image: [farmingAssets.seedling], // Fallback image (overridden by growth stage in TileRenderer)
    transforms: {
      enableScale: true,
      enableFlip: false, // Disabled - prevents sprites from shifting to adjacent tiles
      scaleRange: { min: 1.3, max: 1.5 }, // Scale 130-150% for overlap effect
    },
  },
  [TileType.SOIL_WATERED]: {
    name: 'Watered Soil',
    color: 'bg-palette-chocolate', // Darker brown for wet soil
    isSolid: false,
    image: [farmingAssets.seedling], // Fallback image (overridden by growth stage in TileRenderer)
    transforms: {
      enableScale: true,
      enableFlip: false, // Disabled - prevents sprites from shifting to adjacent tiles
      scaleRange: { min: 1.3, max: 1.5 }, // Scale 130-150% for overlap effect
    },
  },
  [TileType.SOIL_READY]: {
    name: 'Ready Crop',
    color: 'bg-palette-chocolate', // Darker brown for mature plant's soil
    isSolid: false,
    image: [farmingAssets.plant_pea_adult], // Fallback image (overridden by growth stage in TileRenderer)
    transforms: {
      enableScale: true,
      enableFlip: false, // Disabled - prevents sprites from shifting to adjacent tiles
      scaleRange: { min: 1.4, max: 1.6 }, // Larger scale for mature plants
    },
  },
  [TileType.SOIL_WILTING]: {
    name: 'Wilting Crop',
    color: 'bg-palette-tan', // Lighter dried/dusty soil - tan but distinct from grass
    isSolid: false,
    image: [farmingAssets.wilted_plant], // Fallback image (overridden by growth stage in TileRenderer)
    transforms: {
      enableScale: true,
      enableFlip: false, // Disabled - prevents sprites from shifting to adjacent tiles
      scaleRange: { min: 1.2, max: 1.4 },
    },
  },
  [TileType.SOIL_DEAD]: {
    name: 'Dead Crop',
    color: 'bg-palette-taupe', // Gray-brown for dead/depleted soil
    isSolid: false,
    image: [farmingAssets.wilted_plant], // Fallback image (rotated 90°)
    transforms: {
      enableScale: true,
      enableFlip: true,
      enableRotation: true,
      scaleRange: { min: 1.2, max: 1.4 },
      rotationRange: { min: 90, max: 90 }, // Lay flat on ground
    },
  },

  // Indoor furniture (multi-tile)
  [TileType.BED]: {
    name: 'Bed',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.SOFA]: {
    name: 'Sofa',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.CHIMNEY]: {
    name: 'Chimney',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.STOVE]: {
    name: 'Stove',
    color: 'bg-palette-tan',  // Base floor color (shows through transparent parts)
    isSolid: true,  // Players cannot walk through stoves
    image: []  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
  },
  [TileType.WELL]: {
    name: 'Well',
    color: 'bg-palette-sage',  // Base grass color (shows through transparent parts)
    isSolid: true,  // Players cannot walk through wells
    image: [],  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
    baseType: TileType.GRASS,  // Render grass underneath for natural ground
    seasonalImages: {
      winter: [tileAssets.well_winter],  // Snow-covered well in winter
      default: [tileAssets.well],  // Stone well in other seasons
    }
  },
  [TileType.WITCH_HUT]: {
    name: 'Witch Hut',
    color: 'bg-palette-sage',  // Base grass color (shows through transparent parts)
    isSolid: true,  // Most of the structure is solid (collisions defined in SPRITE_METADATA)
    image: [],  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
    baseType: TileType.GRASS,  // Render grass underneath for natural ground
  },
  [TileType.WITCH_HUT_LOWER]: {
    name: 'Witch Hut (Lower)',
    color: 'bg-palette-sage',
    isSolid: true,  // Has collision box for pond area
    image: [],
    baseType: TileType.GRASS,
    seasonalImages: {
      default: [tileAssets.witch_hut_lower],
      autumn: [tileAssets.witch_hut_autumn_lower],
      // TODO: Add winter variant
    },
  },
  [TileType.WITCH_HUT_UPPER]: {
    name: 'Witch Hut (Upper)',
    color: 'bg-palette-sage',
    isSolid: true,  // Has collision box for tree/building
    image: [],
    baseType: TileType.GRASS,
    seasonalImages: {
      default: [tileAssets.witch_hut_upper],
      autumn: [tileAssets.witch_hut_autumn_upper],
      // TODO: Add winter variant
    },
  },
};

// === COMPILE-TIME VALIDATION ===
// TypeScript compile-time check: TILE_LEGEND must have entries for ALL TileType enum values
// If this fails to compile, you've added a TileType without adding it to TILE_LEGEND (or vice versa)

// Ensure TILE_LEGEND is exhaustive (has all TileType keys)
type _AssertTileLegendExhaustive = Record<TileType, Omit<TileData, 'type'>> extends typeof TILE_LEGEND
  ? typeof TILE_LEGEND extends Record<TileType, Omit<TileData, 'type'>>
    ? true
    : { ERROR: 'TILE_LEGEND has extra keys not in TileType enum' }
  : { ERROR: 'TILE_LEGEND is missing TileType entries' };

// Trigger the type check
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _tileLegendExhaustivenessCheck: _AssertTileLegendExhaustive = true;

// --- Procedural Map Generation ---

const map: TileType[][] = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TileType.GRASS));

// 1. Set borders to ROCK
for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
        if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
            map[y][x] = TileType.ROCK;
        }
    }
}

// 2. Function to generate patches
function generatePatches(tileType: TileType, patchCount: number, minSize: number, maxSize: number) {
    for (let i = 0; i < patchCount; i++) {
        const patchWidth = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        const patchHeight = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
        const startX = Math.floor(Math.random() * (MAP_WIDTH - patchWidth - 2)) + 1;
        const startY = Math.floor(Math.random() * (MAP_HEIGHT - patchHeight - 2)) + 1;

        for (let y = startY; y < startY + patchHeight; y++) {
            for (let x = startX; x < startX + patchWidth; x++) {
                if (map[y] && map[y][x] !== undefined && Math.random() > 0.25) { 
                    map[y][x] = tileType;
                }
            }
        }
    }
}

// 3. Generate features
generatePatches(TileType.WATER, 5, 4, 8); // 5 patches of water, size 4-8
generatePatches(TileType.PATH, 8, 3, 6);  // 8 patches of path, size 3-6
generatePatches(TileType.ROCK, 20, 1, 3); // 20 small clusters of rock

// 4. Place specific interactable objects (can overwrite generated tiles)
map[10][10] = TileType.SHOP_DOOR;
map[20][40] = TileType.MINE_ENTRANCE;

// 5. Ensure player spawn area is clear (3x3 area around spawn point)
export const PLAYER_SPAWN_X = 5;
export const PLAYER_SPAWN_Y = 5;
for (let y = PLAYER_SPAWN_Y - 1; y <= PLAYER_SPAWN_Y + 1; y++) {
    for (let x = PLAYER_SPAWN_X - 1; x <= PLAYER_SPAWN_X + 1; x++) {
        if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
            map[y][x] = TileType.GRASS; // Clear spawn area
        }
    }
}

export const MAP_DATA: TileType[][] = map;

// Multi-tile sprite definitions for foreground rendering
export const SPRITE_METADATA: SpriteMetadata[] = [
  {
    tileType: TileType.RUG,
    spriteWidth: 3,  // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -0.5,   // Center horizontally (extend 0.5 tiles left)
    offsetY: -0.5,   // Center vertically (extend 0.5 tiles up)
    image: tileAssets.rug_cottagecore,
    isForeground: false,  // Render under player (it's a floor decoration)
    // No collision - rugs are walkable
    collisionWidth: 0,
    collisionHeight: 0,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.BED,
    spriteWidth: 3,  // 3 tiles wide (square bed)
    spriteHeight: 3, // 3 tiles tall (square aspect ratio)
    offsetX: -1,     // Center horizontally (extend 1 tile left)
    offsetY: -1,     // Center vertically (extend 1 tile up)
    image: tileAssets.cottage_bed,
    isForeground: true,  // Render over player (it's furniture)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision: 2x2 centered on the mattress area
    collisionWidth: 1.5,
    collisionHeight: 2,
    collisionOffsetX: -0.2,  // Centered
    collisionOffsetY: 0,  // Centered
  },
  {
    tileType: TileType.BUSH,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.bush_1,
    isForeground: true,
    // Collision only at the base (1x1)
    collisionWidth: 1,
    collisionHeight: 1,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling only, no rotation/brightness for bushes
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.TREE,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 3, // 3 tiles tall
    offsetX: -0.5,   // Center horizontally on tile
    offsetY: -1,     // Extends 2 tiles upward
    image: tileAssets.tree_2,
    isForeground: true,
    // Collision only at the base (1x1)
    collisionWidth: 0.2,
    collisionHeight: 0.2,
    collisionOffsetX: 0.3,
    collisionOffsetY: 1,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,  // No rotation for trees
    enableScale: true,
    enableBrightness: false,  // No brightness variation for trees
    scaleRange: { min: 0.98, max: 1.02 },  // Very subtle: 98% to 102%
  },
  {
    tileType: TileType.TREE_BIG,
    spriteWidth: 3,  // 3 tiles wide
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1,     // Center horizontally on tile
    offsetY: -3,     // Extends 3 tiles upward
    image: tileAssets.tree_big_1,
    isForeground: true,
    // Collision only at the base (1x1)
    collisionWidth: 0.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.5,
    collisionOffsetY: 0,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.COTTAGE,
    spriteWidth: 6,  // 6 tiles wide (actual cottage width)
    spriteHeight: 5, // 5 tiles tall (actual cottage height)
    offsetX: -3,     // Offset to center cottage
    offsetY: -4,     // Extends upward from K tile
    image: tileAssets.cottage_wooden,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.0,
    collisionHeight: 1.5,
    collisionOffsetX: -1.7,
    collisionOffsetY: -1.2,  // Just the bottom 2 rows (player can walk behind roof/chimney)
  },

  {
    tileType: TileType.CHERRY_TREE,
    spriteWidth: 4,  // 4 tiles wide (larger than regular tree)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5,   // Center horizontally on tile
    offsetY: -3,     // Extends 3 tiles upward
    image: tileAssets.tree_cherry_autumn,  // Default image (will be overridden by seasonal logic)
    isForeground: true,
    // Collision only at the base trunk (1x1)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: subtle scaling only, no rotation/brightness for trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },

  // Lake edge tiles - need to be foreground sprites so baseType (grass) renders underneath
  {
    tileType: TileType.WATER_LEFT,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_left',
  },
  {
    tileType: TileType.WATER_RIGHT,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_right',
  },
  {
    tileType: TileType.WATER_TOP,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_top',
  },
  {
    tileType: TileType.WATER_BOTTOM,
    spriteWidth: 1,
    spriteHeight: 1,
    offsetX: 0,
    offsetY: 0,
    image: [tileAssets.water_left, tileAssets.water_right, tileAssets.water_top, tileAssets.water_bottom],
    isForeground: true,
    collisionWidth: 1.0,
    collisionHeight: 1.0,
    enableRotation: true,
    rotationMode: 'lake_edge_bottom',
  },
  {
    tileType: TileType.SOFA,
    spriteWidth: 3,  // 3 tiles wide
    spriteHeight: 3, // 3 tiles tall (matching bed size)
    offsetX: -0.4,      // Start at anchor tile
    offsetY: -1,     // Extends 2 tiles upward
    image: [
      tileAssets.sofa_01,
      tileAssets.sofa_02,
    ],
    isForeground: true,  // Render OVER player (allows walking behind)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision covers the sofa seating area (front edge)
    collisionWidth: 2.4,
    collisionHeight: 1.1,
    collisionOffsetX: -0.1,
    collisionOffsetY: 0.4,
  },
  {
    tileType: TileType.TABLE,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (square coffee table)
    offsetX: 0,      // Start at anchor tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.sofa_table,
    isForeground: false,  // Render UNDER player (floor furniture)
    // Collision covers the table surface
    collisionWidth: 1.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.3,
    collisionOffsetY: -0.4,
  },
  {
    tileType: TileType.CHIMNEY,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall
    offsetX: -1,      // Start at anchor tile
    offsetY: -1,     // Extends 1 tile upward
    image: tileAssets.chimney,
    isForeground: false,  // Render UNDER player (background wall decoration)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - chimney blocks movement
    collisionWidth: 2,
    collisionHeight: 2,
    collisionOffsetX: 0,
    collisionOffsetY: -1,
  },
  {
    tileType: TileType.STOVE,
    spriteWidth: 3,  // 2 tiles wide
    spriteHeight: 3, // 3 tiles tall (includes chimney pipe on top)
    offsetX: -0.8,      // Start at anchor tile
    offsetY: -2,     // Extends 2 tiles upward
    image: tileAssets.stove,
    isForeground: true,  // Render OVER player (tall furniture)
    // Disable all CSS transforms for clean furniture rendering
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - stove blocks movement (full footprint)
    collisionWidth: 1.6,
    collisionHeight: 3,  // Only block the base, allow walking behind
    collisionOffsetX: 0,
    collisionOffsetY: -2,
  },
  {
    tileType: TileType.COTTAGE_STONE,
    spriteWidth: 6,  // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -1.2,     // Offset to center cottage
    offsetY: -3,     // Extends upward from K tile
    image: tileAssets.cottage_stone,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.2,
    collisionHeight: 3,
    collisionOffsetX: 0,
    collisionOffsetY: 0,  // Just the bottom 2 rows (player can walk behind roof/chimney)
  },
  {
    tileType: TileType.COTTAGE_FLOWERS,
    spriteWidth: 6,  // 6 tiles wide (actual cottage width)
    spriteHeight: 6, // 5 tiles tall (actual cottage height)
    offsetX: -1,     // Offset to center cottage
    offsetY: -4,     // Extends upward from K tile
    image: tileAssets.cottage_w_flowers,
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front wall (full width, but only bottom 2 rows)
    collisionWidth: 3.6,
    collisionHeight: 3.4,
    collisionOffsetX: 0,
    collisionOffsetY: -1.4,  // Just the bottom 2 rows (player can walk behind roof/chimney)
  },
  {
    tileType: TileType.SHOP,
    spriteWidth: 6,  // 6 tiles wide (shop building width)
    spriteHeight: 6, // 6 tiles tall (shop building height)
    offsetX: -1,     // Offset to center shop
    offsetY: -4,     // Extends upward from anchor tile
    image: tileAssets.shop_spring,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front of the shop (player cannot walk through building)
    collisionWidth: 4.8,
    collisionHeight: 4.4,
    collisionOffsetX: -0.3,
    collisionOffsetY: -2.2,  // Just the bottom area (player can walk behind roof)
  },
  {
    tileType: TileType.MINE_ENTRANCE,
    spriteWidth: 4,  // 4 tiles wide (mine entrance with rocks)
    spriteHeight: 4, // 4 tiles tall
    offsetX: -1.5,   // Center the sprite on the anchor tile
    offsetY: -1.5,     // Extends 3 tiles upward from anchor
    image: tileAssets.mine_entrance,
    isForeground: false,  // Render in background layer
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision only at the entrance opening (center area at bottom)
    collisionWidth: 2,
    collisionHeight: 1,
    collisionOffsetX: -0.5,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.GARDEN_SHED,
    spriteWidth: 6,  // 6 tiles wide (garden shed on stilts with stairs)
    spriteHeight: 6, // 6 tiles tall
    offsetX: -2.5,   // Position sprite relative to anchor
    offsetY: -4,     // Extends upward from anchor
    image: tileAssets.garden_shed_spring,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision at the front of the shed (player cannot walk through building or stairs)
    collisionWidth: 3,
    collisionHeight: 1,
    collisionOffsetX: -1,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.WELL,
    spriteWidth: 2,  // 2 tiles wide
    spriteHeight: 2, // 2 tiles tall (stone well with dark opening)
    offsetX: -0.6,      // Start at anchor tile
    offsetY: -0.7,     // Extends 1 tile upward
    image: tileAssets.well,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,  // Render over player (it's a structure)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
    // Collision - well blocks movement (full 2x2 footprint)
    collisionWidth: 1,
    collisionHeight: 1.2,
    collisionOffsetX: 0,
    collisionOffsetY: 0,
  },
  {
    tileType: TileType.FAIRY_OAK,
    spriteWidth: 5,  // 5 tiles wide (magical large tree)
    spriteHeight: 5, // 5 tiles tall
    offsetX: -2,     // Center horizontally on tile
    offsetY: -4,     // Extends 4 tiles upward
    image: tileAssets.fairy_oak_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.5,
    collisionHeight: 0.5,
    collisionOffsetX: 0.25,
    collisionOffsetY: 0.25,
    // Transform controls: subtle scaling only, no rotation for magical trees
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.98, max: 1.02 },
  },
  {
    tileType: TileType.OAK_TREE,
    spriteWidth: 5,  // 5 tiles wide (large deciduous tree)
    spriteHeight: 6, // 6 tiles tall (proper forest oak)
    offsetX: -2,     // Center horizontally on tile
    offsetY: -5,     // Extends 5 tiles upward
    image: tileAssets.oak_tree_summer,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.3,
    collisionHeight: 0.3,
    collisionOffsetX: 0.35,
    collisionOffsetY: 0.35,
    // Transform controls: more variation for natural forest feel
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 },  // More size variation
  },
  {
    tileType: TileType.SPRUCE_TREE,
    spriteWidth: 6,    // 4 tiles wide (towering forest conifer)
    spriteHeight: 8,   // 8 tiles tall (proper forest tree)
    offsetX: -3,     // Center horizontally on tile
    offsetY: -7,       // Extends 7 tiles upward
    image: tileAssets.spruce_tree,  // Default image (overridden by seasonalImages in TILE_LEGEND)
    isForeground: true,
    // Collision only at the base trunk (small area)
    collisionWidth: 0.4,
    collisionHeight: 0.3,
    collisionOffsetX: -0.3,
    collisionOffsetY: -1,
    // Transform controls: more variation for natural forest feel
    enableFlip: true,
    enableRotation: false,
    enableScale: true,
    enableBrightness: false,
    scaleRange: { min: 0.85, max: 1.15 },  // More size variation for natural look
  },
  {
    tileType: TileType.FAIRY_OAK_GIANT,
    spriteWidth: 10,   // 10 tiles wide (enormous ancient fairy oak)
    spriteHeight: 10,  // 10 tiles tall
    offsetX: -5,       // Center horizontally on tile
    offsetY: -9,       // Extends 9 tiles upward
    image: tileAssets.fairy_oak_summer,  // Uses same seasonal images as regular fairy oak
    isForeground: true,
    // Collision at the massive trunk base (large central area)
    collisionWidth: 2,
    collisionHeight: 2,
    collisionOffsetX: -0.5,
    collisionOffsetY: -0.5,
    // No transforms - this is a unique, sacred tree
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
  {
    tileType: TileType.WITCH_HUT,
    spriteWidth: 16,   // 16 tiles wide (upscaled from 896px image for better visibility)
    spriteHeight: 16,  // 16 tiles tall
    offsetX: -8,       // Center horizontally on anchor tile
    offsetY: -5,       // Positions door at anchor point (shifted down from -15)
    image: tileAssets.witch_hut,
    isForeground: true,
    // DEPRECATED: Use WITCH_HUT_LOWER + WITCH_HUT_UPPER for proper layering
    collisionWidth: 4,     // Slim to cover just the tree trunk/roof center
    collisionHeight: 6,    // Upper portion only (roof and upper structure)
    collisionOffsetX: -2,  // Center the collision on the building (adjusted for 4-tile width)
    collisionOffsetY: -2,  // Position at roof level (moved down 3 tiles from -5)
    // No transforms - this is a unique magical structure
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
  {
    tileType: TileType.WITCH_HUT_LOWER,
    spriteWidth: 16,   // 16 tiles wide
    spriteHeight: 8,   // 8 tiles tall (lower half)
    offsetX: -8,       // Center horizontally on anchor tile
    offsetY: 3,        // Position lower half below the upper half
    image: tileAssets.witch_hut_lower,
    isForeground: false,  // Player appears in front of lower structure
    // Collision on lower layer - pond only (left of stairs)
    collisionWidth: 3,
    collisionHeight: 2,
    collisionOffsetX: -5,
    collisionOffsetY: 3,  // Moved up 2 tiles (from 5 to 3)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
  {
    tileType: TileType.WITCH_HUT_UPPER,
    spriteWidth: 16,   // 16 tiles wide
    spriteHeight: 8,   // 8 tiles tall (upper half)
    offsetX: -9,       // Shift left by 1 tile to align with lower half
    offsetY: -5,       // Position upper half at same level as original
    image: tileAssets.witch_hut_upper,
    isForeground: true,  // Player appears behind tree canopy
    // Collision on upper layer - tree trunk/canopy (smaller by 2 tiles)
    collisionWidth: 4,
    collisionHeight: 4,  // Reduced from 6 to 4
    collisionOffsetX: -2,
    collisionOffsetY: -1,  // Moved down 1 tile (from -2 to -1)
    enableFlip: false,
    enableRotation: false,
    enableScale: false,
    enableBrightness: false,
  },
];

/**
 * TILE_ANIMATIONS - Environmental effects that appear near specific tile types
 *
 * These animations automatically render near matching tiles when conditions are met.
 * Useful for: falling petals, fireflies, smoke, sparkles, etc.
 */
export const TILE_ANIMATIONS: import('./types').TileAnimation[] = [
  // Falling cherry petals (single animation per tree)
  // Note: Optimized GIF is 512x512px, scale values adjusted for tile size (64px)
  {
    id: 'cherry_petals_spring',
    image: animationAssets.cherry_spring_petals,
    tileType: TileType.CHERRY_TREE,
    offsetX: -0.75, // Moved left from tree center
    offsetY: -1.5, // Just above the tree canopy
    radius: 1, // Only right at the tree
    layer: 'foreground',
    loop: true,
    opacity: 0.85, // Medium opacity
    scale: 0.35, // ~180px (2.8 tiles wide) - nice balance between small and large
    conditions: {
      season: 'spring',
    },
  },
  // Future examples:
  // {
  //   id: 'chimney_smoke',
  //   image: animationAssets.chimney_smoke,
  //   tileType: TileType.CHIMNEY,
  //   offsetX: 0,
  //   offsetY: -3,
  //   radius: 1,
  //   layer: 'foreground',
  //   loop: true,
  //   conditions: { timeOfDay: 'day' },
  // },
];

/**
 * WEATHER_ANIMATIONS - Fullscreen environmental effects based on weather state
 *
 * These animations render across the entire visible viewport when the weather matches.
 * Use DevTools (F4) to change weather and test these effects.
 */
export const WEATHER_ANIMATIONS: import('./types').WeatherAnimation[] = [
  {
    id: 'cherry_blossoms_weather',
    image: animationAssets.cherry_spring_petals,
    weather: 'cherry_blossoms',
    layer: 'foreground',
    loop: true,
    opacity: 0.6,
    scale: 0.8, // ~410px (6.4 tiles wide) - large atmospheric effect (512px optimized)
  },
  // Future weather effects:
  // {
  //   id: 'rain_weather',
  //   image: animationAssets.rain,
  //   weather: 'rain',
  //   layer: 'foreground',
  //   loop: true,
  //   opacity: 0.7,
  //   scale: 1.0,
  // },
  // {
  //   id: 'snow_weather',
  //   image: animationAssets.snow,
  //   weather: 'snow',
  //   layer: 'foreground',
  //   loop: true,
  //   opacity: 0.8,
  //   scale: 1.2,
  // },
];