import { TileType, TileData } from './types';

export const TILE_SIZE = 32;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 30;

export const TILE_LEGEND: Omit<TileData, 'type'>[] = [
  { name: 'Grass', color: 'bg-green-600', isSolid: false }, // GRASS
  { name: 'Rock', color: 'bg-gray-600', isSolid: true }, // ROCK
  { name: 'Water', color: 'bg-blue-500', isSolid: true }, // WATER
  { name: 'Path', color: 'bg-amber-700', isSolid: false }, // PATH
  { name: 'Shop Door', color: 'bg-purple-600', isSolid: false }, // SHOP_DOOR
  { name: 'Mine Entrance', color: 'bg-stone-800', isSolid: false }, // MINE_ENTRANCE
];

// A simple procedural map
export const MAP_DATA: TileType[][] = Array.from({ length: MAP_HEIGHT }, (_, y) =>
  Array.from({ length: MAP_WIDTH }, (_, x) => {
    // Border
    if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
      return TileType.ROCK;
    }

    // A patch of water
    if (x > 20 && x < 28 && y > 12 && y < 18) {
      return TileType.WATER;
    }
    
    // Shop
    if (x === 10 && y === 10) {
      return TileType.SHOP_DOOR;
    }

    // Mine
    if (x === 40 && y === 20) {
      return TileType.MINE_ENTRANCE;
    }

    // Some random rocks
    if (Math.random() < 0.05) {
      return TileType.ROCK;
    }

    return TileType.GRASS;
  })
);

// Add a path to the shop
for (let i = 5; i <= 10; i++) {
    if (MAP_DATA[10]?.[i] !== undefined) {
        MAP_DATA[10][i] = TileType.PATH;
    }
}
for (let i = 5; i <= 10; i++) {
    if (MAP_DATA[i]?.[5] !== undefined) {
        MAP_DATA[i][5] = TileType.PATH;
    }
}
