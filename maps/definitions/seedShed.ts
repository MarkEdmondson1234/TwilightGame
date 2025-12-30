import { MapDefinition, TileType, NPCBehavior, Direction } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Seed Shed - Free seed distribution center
 *
 * A small shed where players can pick up free seeds for farming.
 * Eventually this will be replaced with a shop system, but for now
 * seeds are unlimited and free to support testing and early gameplay.
 *
 * Grid Legend:
 * 1 = Wooden Wall (Poor)
 * F = Floor
 * T = Table (seed displays)
 * D = Door (exit)
 */

const gridString = `
11111111111
1TTTTTTTTT1
1FFFFFFFFF1
1FFFFFFFFF1
1FFFFFFFFF1
11111D11111
`;

export const seedShed: MapDefinition = {
  id: 'seed_shed',
  name: 'Seed Shed',
  width: 11,
  height: 6,
  grid: parseGrid(gridString),
  colorScheme: 'shop',
  isRandom: false,
  spawnPoint: { x: 5, y: 4 }, // Start near door
  transitions: [
    {
      fromPosition: { x: 5, y: 5 }, // Door at bottom
      tileType: TileType.DOOR,
      toMapId: 'farm_area',
      toPosition: { x: 8, y: 22 }, // Exit to farm area, on grass south of building
      label: 'Exit to Farm',
    },
  ],
  npcs: [
    {
      id: 'seed_keeper_radish',
      name: 'Radish Seeds',
      position: { x: 2, y: 1 },
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/seed_bag.svg', // Will use placeholder if missing
      dialogue: [
        {
          id: 'pickup',
          text: 'Take some Radish Seeds! (Free while in testing)',
          responses: [
            {
              text: 'Take 10 Radish Seeds',
              nextId: 'take_radish',
            },
            {
              text: 'No thanks',
            },
          ],
        },
        {
          id: 'take_radish',
          text: 'You received 10 Radish Seeds!',
        },
      ],
    },
    {
      id: 'seed_keeper_tomato',
      name: 'Tomato Seeds',
      position: { x: 4, y: 1 },
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/seed_bag.svg',
      dialogue: [
        {
          id: 'pickup',
          text: 'Take some Tomato Seeds! (Free while in testing)',
          responses: [
            {
              text: 'Take 10 Tomato Seeds',
              nextId: 'take_tomato',
            },
            {
              text: 'No thanks',
            },
          ],
        },
        {
          id: 'take_tomato',
          text: 'You received 10 Tomato Seeds!',
        },
      ],
    },
    {
      id: 'seed_keeper_salad',
      name: 'Salad Seeds',
      position: { x: 6, y: 1 },
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/seed_bag.svg',
      dialogue: [
        {
          id: 'pickup',
          text: 'Take some Salad Seeds! (Free while in testing)',
          responses: [
            {
              text: 'Take 5 Salad Seeds',
              nextId: 'take_salad',
            },
            {
              text: 'No thanks',
            },
          ],
        },
        {
          id: 'take_salad',
          text: 'You received 5 Salad Seeds!',
        },
      ],
    },
    {
      id: 'seed_keeper_corn',
      name: 'Corn Seeds',
      position: { x: 8, y: 1 },
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/seed_bag.svg',
      dialogue: [
        {
          id: 'pickup',
          text: 'Take some Corn Seeds! (Free while in testing)',
          responses: [
            {
              text: 'Take 3 Corn Seeds',
              nextId: 'take_corn',
            },
            {
              text: 'No thanks',
            },
          ],
        },
        {
          id: 'take_corn',
          text: 'You received 3 Corn Seeds!',
        },
      ],
    },
  ],
};
