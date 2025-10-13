import { MAP_DATA, TILE_LEGEND } from '../constants';
import { TileType, TileData } from '../types';

export function getTileData(tileX: number, tileY: number): TileData | null {
  if (
    tileY < 0 ||
    tileY >= MAP_DATA.length ||
    tileX < 0 ||
    tileX >= MAP_DATA[0].length
  ) {
    return null; // Out of bounds
  }
  const tileType: TileType = MAP_DATA[tileY][tileX];
  const legendEntry = TILE_LEGEND[tileType];
  
  if (!legendEntry) {
      // Fallback for safety, should not happen with correct data
      return TILE_LEGEND[TileType.GRASS] ? { ...TILE_LEGEND[TileType.GRASS], type: TileType.GRASS } : null;
  }

  return { ...legendEntry, type: tileType };
}
