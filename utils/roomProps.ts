/**
 * Room props — pure geometry and depth for static scenery on a map
 * (MapDefinition.props). Rendered by utils/pixi/RoomPropsLayer.ts.
 *
 * Kept free of PixiJS so the depth rule can be tested directly: a prop sorts
 * against the player on exactly the same scale PlayerSprite, NPCLayer and
 * PlacedItemsLayer use (Z_DEPTH_SORTED_BASE + floor(y * 10)), with its base
 * as the depth line.
 */

import type { MapDefinition, Position, RoomProp } from '../types';
import { Z_DEPTH_SORTED_BASE } from '../zIndex';

export interface RoomPropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Depth-sorted z-index of a prop: its base line, on the player's feet scale. */
export function roomPropZIndex(prop: RoomProp): number {
  return Z_DEPTH_SORTED_BASE + Math.floor(prop.anchor.y * 10);
}

/**
 * Pre-zoom stage rectangle of a prop — the same space as placed items, NPCs and
 * the DOM overlays (tile units × tileSize, plus the room's grid offset).
 */
export function roomPropBox(prop: RoomProp, tileSize: number, gridOffset?: Position): RoomPropBox {
  const width = prop.width * tileSize;
  const height = prop.height * tileSize;
  return {
    x: prop.anchor.x * tileSize - width / 2 + (gridOffset?.x ?? 0),
    y: prop.anchor.y * tileSize - height + (gridOffset?.y ?? 0),
    width,
    height,
  };
}

/** Every image a map's props draw — for the per-map texture prefetch. */
export function getRoomPropImageUrls(map: Pick<MapDefinition, 'props'>): string[] {
  const urls: string[] = [];
  for (const prop of map.props ?? []) {
    for (const part of prop.parts) {
      if (part.kind === 'image') urls.push(part.image);
    }
  }
  return urls;
}

/**
 * Top edge (in tiles) of the prop standing on a tile, if any.
 *
 * A mini-game's floating prompt normally bobs just above its tile, which for a
 * prop taller than a tile — the 2.4-tile easel — lands it across the middle of
 * the prop and across a player standing beside it. Prompts stay above everything
 * (Z_ACTION_PROMPTS, DOM), so they are lifted to the prop's top instead.
 */
export function roomPropTopAt(
  map: Pick<MapDefinition, 'props'> | undefined,
  tileX: number,
  tileY: number
): number | undefined {
  for (const prop of map?.props ?? []) {
    const baseRow = Math.ceil(prop.anchor.y) - 1; // The row the prop stands on
    const coversColumn = Math.abs(prop.anchor.x - (tileX + 0.5)) <= prop.width / 2;
    if (baseRow === tileY && coversColumn) return prop.anchor.y - prop.height;
  }
  return undefined;
}
