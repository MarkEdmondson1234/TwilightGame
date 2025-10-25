import { useCallback } from 'react';
import { Position } from '../types';
import { PLAYER_SIZE, SPRITE_METADATA } from '../constants';
import { getTileData } from '../utils/mapUtils';

/**
 * Hook for collision detection logic
 * Checks both regular tile collision and multi-tile sprite collision
 */
export function useCollisionDetection() {
    const checkCollision = useCallback((pos: Position): boolean => {
        const halfSize = PLAYER_SIZE / 2;
        const minTileX = Math.floor(pos.x - halfSize);
        const maxTileX = Math.floor(pos.x + halfSize);
        const minTileY = Math.floor(pos.y - halfSize);
        const maxTileY = Math.floor(pos.y + halfSize);

        // First check regular tile collision
        for (let y = minTileY; y <= maxTileY; y++) {
            for (let x = minTileX; x <= maxTileX; x++) {
                const tileData = getTileData(x, y);
                if (tileData && tileData.isSolid && !SPRITE_METADATA.find(s => s.tileType === tileData.type)) {
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
                const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData?.type);

                if (spriteMetadata && tileData?.isSolid) {
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
                    if (pos.x + halfSize > spriteLeft && pos.x - halfSize < spriteRight &&
                        pos.y + halfSize > spriteTop && pos.y - halfSize < spriteBottom) {
                        return true;
                    }
                }
            }
        }
        return false;
    }, []);

    return { checkCollision };
}
