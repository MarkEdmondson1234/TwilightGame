/**
 * Making a snow angel — winter, snowing, and a clear 2x2 patch of ground.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import { CollisionType, isTileSolid, type Position } from '../../../types';
import type { AvailableInteraction, InteractionContext, PlacedItem } from '../types';
import { getTileData } from '../../mapUtils';
import { metadataCache } from '../../MetadataCache';
import { Season, TimeManager } from '../../TimeManager';
import { gameState } from '../../../GameState';
import { SNOW_ANGEL_IMAGE } from '../../SnowAngelManager';

/**
 * Checks whether a 2x2 block (given its top-left tile) is clear ground for a snow angel:
 * every tile walkable, no existing placed item on it, and no nearby solid multi-tile
 * sprite's collision box overlapping it (mirrors the two-pass check in useCollisionDetection.ts).
 */
function isSnowAngelBlockClear(topLeft: Position, placedItems: PlacedItem[]): boolean {
  const blockTiles = [
    { x: topLeft.x, y: topLeft.y },
    { x: topLeft.x + 1, y: topLeft.y },
    { x: topLeft.x, y: topLeft.y + 1 },
    { x: topLeft.x + 1, y: topLeft.y + 1 },
  ];

  for (const tile of blockTiles) {
    const tileData = getTileData(tile.x, tile.y);
    if (!tileData) return false;
    if (metadataCache.isMultiTileSprite(tileData.type)) continue; // validated by the AABB scan below
    if (tileData.collisionType !== CollisionType.WALKABLE) return false;
  }

  const blockedByItem = placedItems.some((item) =>
    blockTiles.some(
      (tile) => tile.x === Math.floor(item.position.x) && tile.y === Math.floor(item.position.y)
    )
  );
  if (blockedByItem) return false;

  const blockLeft = topLeft.x;
  const blockRight = topLeft.x + 2;
  const blockTop = topLeft.y;
  const blockBottom = topLeft.y + 2;
  const searchRadius = 10; // large enough to catch any sprite anchored outside the block

  for (let ty = blockTop - searchRadius; ty <= blockBottom + searchRadius; ty++) {
    for (let tx = blockLeft - searchRadius; tx <= blockRight + searchRadius; tx++) {
      const tileData = getTileData(tx, ty);
      const spriteMetadata = tileData ? metadataCache.getMetadata(tileData.type) : undefined;
      if (!tileData || !spriteMetadata) continue;
      if (!isTileSolid(tileData.collisionType)) continue;

      const collisionWidth = spriteMetadata.collisionWidth ?? spriteMetadata.spriteWidth;
      const collisionHeight = spriteMetadata.collisionHeight ?? spriteMetadata.spriteHeight;
      const collisionOffsetX = spriteMetadata.collisionOffsetX ?? spriteMetadata.offsetX;
      const collisionOffsetY = spriteMetadata.collisionOffsetY ?? spriteMetadata.offsetY;

      const spriteLeft = tx + collisionOffsetX;
      const spriteRight = spriteLeft + collisionWidth;
      const spriteTop = ty + collisionOffsetY;
      const spriteBottom = spriteTop + collisionHeight;

      if (
        blockRight > spriteLeft &&
        blockLeft < spriteRight &&
        blockBottom > spriteTop &&
        blockTop < spriteBottom
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Finds a clear 2x2 patch of ground for a snow angel near the clicked tile.
 * Tries all 4 candidate blocks that include the clicked tile as a corner (best-fit),
 * so the player doesn't need to click one specific corner of the open space.
 * Returns the top-left tile of the first fully clear block, or null if none qualify.
 */
function findClearSnowAngelBlock(
  clickTileX: number,
  clickTileY: number,
  placedItems: PlacedItem[]
): Position | null {
  const candidates: Position[] = [
    { x: clickTileX, y: clickTileY }, // clicked tile = top-left
    { x: clickTileX - 1, y: clickTileY }, // clicked tile = top-right
    { x: clickTileX, y: clickTileY - 1 }, // clicked tile = bottom-left
    { x: clickTileX - 1, y: clickTileY - 1 }, // clicked tile = bottom-right
  ];

  for (const topLeft of candidates) {
    if (isSnowAngelBlockClear(topLeft, placedItems)) {
      return topLeft;
    }
  }
  return null;
}

export function snowAngelProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { tileX, tileY, placedItems, onMakeSnowAngel } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Snow angel — winter + snowing + a clear 2x2 patch of ground near the click
  if (
    onMakeSnowAngel &&
    TimeManager.isCurrentSeason(Season.WINTER) &&
    gameState.getWeather() === 'snow'
  ) {
    const snowAngelBlock = findClearSnowAngelBlock(tileX, tileY, placedItems);
    if (snowAngelBlock) {
      interactions.push({
        type: 'make_snow_angel',
        label: 'Make Snow Angel',
        icon: SNOW_ANGEL_IMAGE,
        color: '#93c5fd',
        requireConfirmation: true,
        execute: () => onMakeSnowAngel(snowAngelBlock),
      });
    }
  }

  return interactions;
}
