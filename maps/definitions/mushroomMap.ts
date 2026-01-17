import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Mushroom Forest - A damp, shady area filled with fungi
 *
 * A mysterious, moisture-laden forest where giant mushrooms tower
 * among the trees and moonpetals bloom in the perpetual shade.
 * The air is thick with spores and the ground is soft with decay.
 *
 * Features:
 * - Multiple forest ponds creating a swampy atmosphere
 * - Giant mushrooms scattered throughout
 * - Moonpetals thriving in the damp shade
 * - Dead fir trees and mushroom-covered dead trees
 * - Graceful willows near the water
 * - Dense fern and iris ground cover
 *
 * Grid Legend:
 * G = Grass (damp forest floor)
 * L = Wall boundary (dense impenetrable forest)
 * P = Path (muddy forest path)
 * ) = Small lake/forest pond (4x4 water feature - SINGLE ANCHOR)
 * x = Giant mushroom (5x5 towering fungus - SINGLE ANCHOR)
 * 4 = Dead tree with mushrooms (5x5 gnarled tree - SINGLE ANCHOR)
 * 6 = Dead spruce/fir tree (4x7 barren tree - SINGLE ANCHOR)
 * y = Willow tree (8x8 graceful tree - SINGLE ANCHOR)
 * e = Fern (2x2 forest floor plant)
 * i = Wild iris (3x3 waterside flower)
 * a = Moonpetal (3x3 night-blooming flower)
 * u = Mushroom (small walkable mushroom)
 */

// 30x20 damp mushroom forest with ponds and giant fungi
const gridString = `
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
LGGGGGGGGiGGGGGGGGGGGGGGGGGGGL
LGGeGGGGGGGG)GGuGGGGG4GGeGGGGL
LGGGeGGe4GGGGGG7eeGGGeGGGGGGGL
LGGGGuGGeGGGiGGeGGG7GGGGGuG7GL
LGGyGGGGGGGGGGGGGGeGG7PGGGuGGL
LGGGGGGGGaGGGGGGaGGGGPuGG9GGuL
L6GeGGGGGGG7GGGGG-GPPGGaGGeGGL
LGG7GGGGGGuGGeeGuGPPGGGeeGeutL
LGeGGGGGaGGGGxGGGPPaGeeGG7eGGL
L7GGGGyGGG4GGeGPPGeGeeGGeGe7GL
LGGGuGiGGGGGuG4GPGGuGGeGGxGeGL
LGxGuGGiGGaGGGuuaPeGeGG4iGGeeL
LGGGeGGG)GGGGuGGGGPeGxGGGieGtL
LGeGGGGGGGGGGGG7eGGPPeiG)GuGGL
LtGGyGGGGGGyGGGeGGGP7GGeiG4uGL
LGG6GGGiGiuGueGuGPGeeGGeGtGuGL
LGGGeGGPPPPPPPPPPPPPPPPPGGe6uL
LGGGGuGPGuGG7eeGGeGGeGGPGGGtGL
LLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
`;

export const mushroomMap: MapDefinition = {
  id: 'mushroom_forest',
  name: 'Mushroom Forest',
  width: 30,
  height: 20,
  grid: parseGrid(gridString),
  colorScheme: 'forest', // Dark forest colour scheme suits the damp, shady atmosphere
  hasClouds: true, // Outdoor area
  isRandom: false,
  spawnPoint: { x: 15, y: 17 }, // On path near south entrance
  transitions: [
    {
      fromPosition: { x: 6, y: 17 }, // West path exit
      tileType: TileType.PATH,
      toMapId: 'deep_forest',
      toPosition: { x: 25, y: 27 }, // East side of deep forest path
      label: 'To Deep Forest',
    },
    {
      fromPosition: { x: 23, y: 17 }, // East path exit
      tileType: TileType.PATH,
      toMapId: 'village',
      toPosition: { x: 5, y: 16 }, // Near mushroom forest entrance on west side
      label: 'To Village',
    },
  ],
  npcs: [
    // Could add forest spirits or mushroom creatures here later
  ],
};
