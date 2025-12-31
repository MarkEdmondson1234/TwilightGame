/**
 * Tile Legend - Definitions for all tile types
 *
 * Extracted from constants.ts to reduce file size.
 * Re-exported from constants.ts for backward compatibility.
 */

import { TileType, TileData } from '../types';
import { tileAssets, farmingAssets } from '../assets';

export const TILE_LEGEND: Record<TileType, Omit<TileData, 'type'>> = {
  // Outdoor tiles
  [TileType.GRASS]: {
    name: 'Grass',
    color: 'bg-palette-sage',  // Base color, overridden by map color scheme
    isSolid: false,
    seasonalImages: {
      spring: [tileAssets.grass_1, tileAssets.grass_2],
      summer: [tileAssets.grass_1, tileAssets.grass_2],
      autumn: [tileAssets.grass_1, tileAssets.grass_2],
      winter: [tileAssets.grass_2],  // Hide grass_1 in winter (only show grass_2)
      default: [tileAssets.grass_1, tileAssets.grass_2],
    },
    transforms: {
      enableFlip: true,  // Horizontal flipping for variety
      enableScale: true,
      scaleRange: { min: 0.95, max: 1.05 },  // Very subtle size variation (5%)
    },
  },
  [TileType.TUFT]: {
    name: 'Tuft Grass',
    color: 'bg-palette-sage',  // Same background as grass, overridden by map color scheme
    isSolid: false,
    baseType: TileType.GRASS,  // Render grass underneath
    image: [],  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
    seasonalImages: {
      spring: [tileAssets.tuft_spring, tileAssets.tuft_sparse],  // 50% sparse (1/2)
      summer: [tileAssets.tuft_01, tileAssets.tuft_02, tileAssets.tuft_sparse],  // 33% sparse (1/3)
      autumn: [tileAssets.tuft_autumn, tileAssets.tuft_sparse],  // 50% sparse (1/2)
      winter: [tileAssets.tuft_winter, tileAssets.tuft_sparse],  // 50% sparse (1/2)
      default: [tileAssets.tuft_01, tileAssets.tuft_02, tileAssets.tuft_sparse],  // 33% sparse (1/3)
    },
  },
  [TileType.TUFT_SPARSE]: {
    name: 'Village Green',
    color: 'bg-palette-sage',  // Same background as grass, overridden by map color scheme
    isSolid: false,
    baseType: TileType.GRASS,  // Render grass underneath
    image: [tileAssets.village_green],  // Regular 1x1 tile (not multi-tile sprite)
    transforms: {
      enableFlip: true,
      enableRotation: true,
      enableScale: true,
      enableBrightness: true,
      scaleRange: { min: 0.9, max: 1.1 },
      rotationRange: { min: -15, max: 15 },
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
    // Use only the left edge image (no rotation needed)
    image: [tileAssets.water_left],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
  },
  [TileType.WATER_RIGHT]: {
    name: 'Water Right Edge',
    color: 'bg-palette-sky',
    isSolid: true,
    // Use only the right edge image (no rotation needed)
    image: [tileAssets.water_right],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
  },
  [TileType.WATER_TOP]: {
    name: 'Water Top Edge',
    color: 'bg-palette-sky',
    isSolid: true,
    // Use only the top edge image (no rotation needed)
    image: [tileAssets.water_top],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
  },
  [TileType.WATER_BOTTOM]: {
    name: 'Water Bottom Edge',
    color: 'bg-palette-sky',
    isSolid: true,
    // Use only the bottom edge image (no rotation needed)
    image: [tileAssets.water_bottom],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
  },
  [TileType.MAGICAL_LAKE]: {
    name: 'Magical Lake',
    color: 'bg-palette-sky',
    isSolid: true,  // Multi-tile sprite - collision handled by SPRITE_METADATA
    image: [tileAssets.magical_lake],
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
  },
  [TileType.SMALL_LAKE]: {
    name: 'Forest Pond',
    color: 'bg-palette-sky',
    isSolid: true,  // Multi-tile sprite - collision handled by SPRITE_METADATA
    image: [tileAssets.forest_pond_spring_summer],  // Default image
    seasonalImages: {
      spring: [tileAssets.forest_pond_spring_summer],
      summer: [tileAssets.forest_pond_spring_summer],
      autumn: [tileAssets.forest_pond_autumn],
      winter: [tileAssets.forest_pond_winter],
      default: [tileAssets.forest_pond_spring_summer],
    },
    baseType: TileType.GRASS,  // Render grass underneath for natural shoreline
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
    // Multi-tile sprite (2x2) - image and transforms defined in SPRITE_METADATA
  },
  [TileType.BUSH]: {
    name: 'Hawthorn Bush',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the bush sprite
    seasonalImages: {
      spring: [tileAssets.hawthorn_spring],
      summer: [tileAssets.hawthorn_summer],
      autumn: [tileAssets.hawthorn_autumn],
      winter: [tileAssets.hawthorn_winter],
      default: [tileAssets.hawthorn_summer],
    },
    transforms: {
      enableFlip: true,  // Horizontal flipping for variety
      enableScale: true,
      scaleRange: { min: 0.85, max: 1.15 },  // Slight size variation
    },
  },
  [TileType.TREE]: {
    name: 'Birch Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the birch tree sprite
    seasonalImages: {
      spring: [tileAssets.birch_spring],
      summer: [tileAssets.birch_summer],
      autumn: [tileAssets.birch_autumn],
      winter: [tileAssets.birch_winter],
      default: [tileAssets.birch_summer],
    }
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
      spring: [tileAssets.tree_cherry_spring],
      summer: [
        tileAssets.tree_cherry_summer_fruit,
        tileAssets.tree_cherry_summer_fruit,  // Cherry trees with fruit 66%
        tileAssets.tree_cherry_summer_no_fruit,  // Cherry trees without fruit 33%
      ],
      autumn: [tileAssets.tree_cherry_autumn],
      winter: [tileAssets.tree_cherry_winter],
      default: [tileAssets.tree_cherry_summer_no_fruit],
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
  [TileType.WILLOW_TREE]: {
    name: 'Willow Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the willow tree sprite
    seasonalImages: {
      spring: [tileAssets.willow_tree],  // Use summer for spring
      summer: [tileAssets.willow_tree],
      autumn: [tileAssets.willow_tree_autumn],
      winter: [tileAssets.willow_tree_winter],
      default: [tileAssets.willow_tree],
    }
  },
  [TileType.LILAC_TREE]: {
    name: 'Lilac Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,
    baseType: TileType.GRASS,  // Render grass underneath the lilac sprite
    seasonalImages: {
      spring: [tileAssets.lilac_tree_spring],
      summer: [tileAssets.lilac_tree_summer],
      autumn: [tileAssets.lilac_tree_autumn],
      winter: [tileAssets.lilac_tree_winter],
      default: [tileAssets.lilac_tree_summer],
    }
  },
  [TileType.WILD_IRIS]: {
    name: 'Wild Iris',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: false,  // Walkable - decorative flower
    baseType: TileType.GRASS,  // Render grass underneath the iris sprite
    seasonalImages: {
      spring: [tileAssets.wild_iris_spring],
      summer: [tileAssets.wild_iris_summer],
      autumn: [tileAssets.wild_iris_autumn],
      winter: [tileAssets.wild_iris_winter],
      default: [tileAssets.wild_iris_summer],
    },
    transforms: {
      enableFlip: true,  // Horizontal flipping for variety
      enableScale: true,
      scaleRange: { min: 0.8, max: 1.2 },  // Size variation
    },
  },
  [TileType.POND_FLOWERS]: {
    name: 'Pond Flowers',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: false,  // Walkable - decorative water flowers
    baseType: TileType.GRASS,  // Render grass underneath the pond flower sprite
    seasonalImages: {
      spring: [tileAssets.pond_flowers_spring_summer],  // Same sprite for spring and summer
      summer: [tileAssets.pond_flowers_spring_summer],
      autumn: [tileAssets.pond_flowers_autumn],
      winter: [tileAssets.pond_flowers_winter],
      default: [tileAssets.pond_flowers_spring_summer],
    },
    transforms: {
      enableFlip: true,  // Horizontal flipping for variety
      enableScale: true,
      scaleRange: { min: 0.8, max: 1.2 },  // Size variation
    },
  },
  [TileType.BRAMBLES]: {
    name: 'Brambles',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,  // Not walkable - thorny obstacle
    baseType: TileType.GRASS,  // Render grass underneath the brambles sprite
    seasonalImages: {
      spring: [tileAssets.brambles_spring],
      summer: [tileAssets.brambles_summer],
      autumn: [tileAssets.brambles_autumn],
      winter: [tileAssets.brambles_winter],
      default: [tileAssets.brambles_summer],
    },
    // 2x2 multi-tile sprite (see SPRITE_METADATA below)
  },
  [TileType.WILD_STRAWBERRY]: {
    name: 'Wild Strawberry',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: false,  // Walkable - forageable plant
    baseType: TileType.GRASS,  // Render grass underneath the strawberry sprite
    seasonalImages: {
      spring: [tileAssets.wild_strawberry_spring],
      summer: [tileAssets.wild_strawberry_summer],
      autumn: [tileAssets.wild_strawberry_autumn],
      winter: [],  // Dormant in winter - no sprite shown
      default: [tileAssets.wild_strawberry_summer],
    },
    transforms: {
      enableFlip: true,  // Horizontal flipping for variety
      enableScale: true,
      scaleRange: { min: 0.9, max: 1.1 },  // Subtle size variation
    },
  },
  [TileType.VILLAGE_FLOWERS]: {
    name: 'Village Flowers',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: false,  // Walkable - decorative flower
    baseType: TileType.GRASS,  // Render grass underneath the flower sprite
    image: [],  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
    seasonalImages: {
      spring: [tileAssets.village_flowers_spring],
      summer: [tileAssets.village_flowers_summer],
      autumn: [tileAssets.village_flowers_autumn],
      winter: [tileAssets.village_flowers_winter],
      default: [tileAssets.village_flowers_summer],
    },
    // 2x2 multi-tile sprite (see SPRITE_METADATA below)
  },
  [TileType.GIANT_MUSHROOM]: {
    name: 'Giant Mushroom',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,  // Not walkable - tree-like obstacle
    baseType: TileType.GRASS,  // Render grass underneath the mushroom sprite
    seasonalImages: {
      spring: [tileAssets.giant_mushroom],
      summer: [tileAssets.giant_mushroom],
      autumn: [tileAssets.giant_mushroom],
      winter: [tileAssets.giant_mushroom_winter],
      default: [tileAssets.giant_mushroom],
    }
  },
  [TileType.SAMBUCA_BUSH]: {
    name: 'Sambuca Bush',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,  // Not walkable - bush obstacle
    baseType: TileType.GRASS,  // Render grass underneath the bush sprite
    seasonalImages: {
      spring: [tileAssets.sambuca_bush_spring],
      summer: [tileAssets.sambuca_bush_summer],
      autumn: [tileAssets.sambuca_bush_autumn],
      winter: [tileAssets.sambuca_bush_winter],
      default: [tileAssets.sambuca_bush_summer],
    }
  },
  [TileType.DEAD_SPRUCE]: {
    name: 'Dead Spruce',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,  // Not walkable - tree obstacle
    baseType: TileType.GRASS,  // Render grass underneath the tree sprite
    seasonalImages: {
      spring: [tileAssets.dead_spruce],
      summer: [tileAssets.dead_spruce],
      autumn: [tileAssets.dead_spruce],
      winter: [tileAssets.dead_spruce_winter],
      default: [tileAssets.dead_spruce],
    }
  },
  [TileType.FIR_TREE_SMALL]: {
    name: 'Small Fir Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: false,  // Walkable - underbrush decoration
    baseType: TileType.GRASS,  // Render grass underneath the sprite
    seasonalImages: {
      spring: [tileAssets.fir_tree_small],
      summer: [tileAssets.fir_tree_small],
      autumn: [tileAssets.fir_tree_small],
      winter: [tileAssets.fir_tree_small_winter],
      default: [tileAssets.fir_tree_small],
    }
  },
  [TileType.SPRUCE_TREE_SMALL]: {
    name: 'Small Spruce Tree',
    color: 'bg-palette-sage',  // Base grass color for blending
    isSolid: true,  // Not walkable - small tree obstacle
    baseType: TileType.GRASS,  // Render grass underneath the sprite
    seasonalImages: {
      spring: [tileAssets.spruce_tree_small],
      summer: [tileAssets.spruce_tree_small],
      autumn: [tileAssets.spruce_tree_small],
      winter: [tileAssets.spruce_tree_small_winter],
      default: [tileAssets.spruce_tree_small],
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
    color: 'bg-palette-espresso', // Very dark brown for wet soil
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
    color: 'bg-palette-espresso', // Very dark brown for wet soil (watered mature plant)
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
  [TileType.CAMPFIRE]: {
    name: 'Campfire',
    color: 'bg-palette-sage',  // Base grass color (shows through transparent parts)
    isSolid: false,  // Players can walk over campfires (decorative, can use for cooking)
    image: [],  // No single-tile image for now - can add asset later
    baseType: TileType.GRASS,  // Render grass underneath for natural ground
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
  [TileType.CAULDRON]: {
    name: 'Cauldron',
    color: 'bg-palette-sage',  // Base grass color (blends with surroundings)
    isSolid: true,  // Cannot walk through the cauldron
    image: [],  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
    baseType: TileType.GRASS,  // Render grass underneath
    // Animation: Bubbling cauldron effect (9 frames) - defined in SPRITE_METADATA
    animationFrames: [
      tileAssets.cauldron_1,
      tileAssets.cauldron_2,
      tileAssets.cauldron_3,
      tileAssets.cauldron_4,
      tileAssets.cauldron_5,
      tileAssets.cauldron_6,
      tileAssets.cauldron_7,
      tileAssets.cauldron_8,
      tileAssets.cauldron_9,
    ],
    animationSpeed: 80,  // 80ms per frame = 12.5 FPS bubbling effect
  },
  [TileType.TREE_STUMP]: {
    name: 'Tree Stump',
    color: 'bg-palette-sage',  // Base grass color
    isSolid: true,  // Cannot walk through stumps
    image: [],  // No single-tile image - uses multi-tile sprite from SPRITE_METADATA
    baseType: TileType.GRASS,  // Render grass underneath
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
