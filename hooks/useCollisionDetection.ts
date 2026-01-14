import { useCallback, MutableRefObject } from 'react';
import { Position, NPC, isTileSolid } from '../types';
import { PLAYER_SIZE, SPRITE_METADATA } from '../constants';
import { getTileData } from '../utils/mapUtils';
import { MovementMode, isTileBlockingForMode } from '../utils/tileCategories';

/**
 * Hook for collision detection logic
 * Checks regular tile collision, multi-tile sprite collision, and NPC collision
 *
 * @param npcsRef - Reference to array of NPCs for NPC collision detection
 * @param movementMode - Current movement mode: 'normal', 'floating', or 'flying'
 *   - normal: Standard collision rules apply
 *   - floating: Can pass through water and low obstacles (blocked by trees, buildings)
 *   - flying: Can pass through everything (only map bounds apply)
 */
export function useCollisionDetection(
  npcsRef?: MutableRefObject<NPC[]>,
  movementMode: MovementMode = 'normal'
) {
  const checkCollision = useCallback(
    (pos: Position): boolean => {
      // Flying mode bypasses ALL collision (only map bounds enforced separately)
      if (movementMode === 'flying') {
        return false;
      }

      const halfSize = PLAYER_SIZE / 2;
      const minTileX = Math.floor(pos.x - halfSize);
      const maxTileX = Math.floor(pos.x + halfSize);
      const minTileY = Math.floor(pos.y - halfSize);
      const maxTileY = Math.floor(pos.y + halfSize);

      // First check regular tile collision
      for (let y = minTileY; y <= maxTileY; y++) {
        for (let x = minTileX; x <= maxTileX; x++) {
          const tileData = getTileData(x, y);
          if (!tileData) continue;

          // Skip multi-tile sprites (handled separately below)
          if (SPRITE_METADATA.find((s) => s.tileType === tileData.type)) continue;

          // Check if this tile blocks based on movement mode
          const isSolid = isTileSolid(tileData.collisionType);
          if (isTileBlockingForMode(tileData.type, movementMode, isSolid)) {
            return true;
          }
        }
      }

      // Check for multi-tile sprite collision in a wider area
      // Need to check tiles that might have sprites extending into player position
      const searchRadius = 10; // Large enough to catch any sprite
      for (let tileY = minTileY - searchRadius; tileY <= maxTileY + searchRadius; tileY++) {
        for (let tileX = minTileX - searchRadius; tileX <= maxTileX + searchRadius; tileX++) {
          const tileData = getTileData(tileX, tileY);
          const spriteMetadata = SPRITE_METADATA.find((s) => s.tileType === tileData?.type);

          if (spriteMetadata && tileData) {
            const isSolid = isTileSolid(tileData.collisionType);

            // Check if this sprite blocks based on movement mode
            if (!isTileBlockingForMode(tileData.type, movementMode, isSolid)) {
              continue; // This sprite doesn't block in current mode
            }

            // Use collision-specific dimensions if provided, otherwise use sprite dimensions
            const collisionWidth = spriteMetadata.collisionWidth ?? spriteMetadata.spriteWidth;
            const collisionHeight = spriteMetadata.collisionHeight ?? spriteMetadata.spriteHeight;
            const collisionOffsetX = spriteMetadata.collisionOffsetX ?? spriteMetadata.offsetX;
            const collisionOffsetY = spriteMetadata.collisionOffsetY ?? spriteMetadata.offsetY;

            // Calculate collision bounds based on tile position and metadata
            const spriteLeft = tileX + collisionOffsetX;
            const spriteRight = spriteLeft + collisionWidth;
            const spriteTop = tileY + collisionOffsetY;
            const spriteBottom = spriteTop + collisionHeight;

            // Check if player position overlaps with collision bounds
            if (
              pos.x + halfSize > spriteLeft &&
              pos.x - halfSize < spriteRight &&
              pos.y + halfSize > spriteTop &&
              pos.y - halfSize < spriteBottom
            ) {
              return true;
            }
          }
        }
      }

      // Check NPC collision (if NPCs ref provided)
      // Note: Floating mode still collides with NPCs, only flying bypasses
      if (npcsRef?.current) {
        for (const npc of npcsRef.current) {
          // Skip NPCs without collision radius
          if (!npc.collisionRadius || npc.collisionRadius <= 0) continue;

          // Calculate distance between player center and NPC center
          const dx = pos.x - npc.position.x;
          const dy = pos.y - npc.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check if player overlaps with NPC collision circle
          // Player radius (halfSize) + NPC collision radius
          if (distance < halfSize + npc.collisionRadius) {
            return true;
          }
        }
      }

      return false;
    },
    [npcsRef, movementMode]
  );

  return { checkCollision };
}
