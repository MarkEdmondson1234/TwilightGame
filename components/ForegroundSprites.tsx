import React from 'react';
import { MapDefinition } from '../types';
import { getTileData } from '../utils/mapUtils';
import { SPRITE_METADATA, TILE_SIZE } from '../constants';
import { calculateSpriteTransforms } from '../utils/tileRenderUtils';

interface ForegroundSpritesProps {
    currentMap: MapDefinition;
    visibleRange: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter';
}

/**
 * Renders foreground multi-tile sprites (trees, cottages)
 * These render above the player with CSS transforms for variation
 */
const ForegroundSprites: React.FC<ForegroundSpritesProps> = ({
    currentMap,
    visibleRange,
    seasonKey,
}) => {
    return (
        <>
            {currentMap.grid.map((row, y) =>
                row.map((_, x) => {
                    // Performance: Skip tiles outside viewport (with extra margin for large sprites)
                    const margin = 5; // Extra margin for multi-tile sprites
                    if (x < visibleRange.minX - margin || x > visibleRange.maxX + margin ||
                        y < visibleRange.minY - margin || y > visibleRange.maxY + margin) {
                        return null;
                    }

                    const tileData = getTileData(x, y);
                    if (!tileData) return null;

                    // Find sprite metadata for this tile type
                    const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData.type);
                    if (!spriteMetadata || !spriteMetadata.isForeground) return null;

                    // Determine which image to use (seasonal or default) - season cached above
                    let spriteImage: string;
                    let selectedImageIndex: number | undefined;
                    if (tileData.seasonalImages) {
                        const seasonalArray = tileData.seasonalImages[seasonKey] || tileData.seasonalImages.default;

                        // Select seasonal image using the same hash method as regular tiles
                        const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                        const index = Math.floor((imageHash % 1) * seasonalArray.length);
                        spriteImage = seasonalArray[index];
                        selectedImageIndex = index;
                    } else if (Array.isArray(spriteMetadata.image)) {
                        // Select image from array using deterministic hash
                        const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                        const index = Math.floor((imageHash % 1) * spriteMetadata.image.length);
                        spriteImage = spriteMetadata.image[index];
                        selectedImageIndex = index;
                    } else {
                        spriteImage = spriteMetadata.image;
                    }

                    // Apply CSS transforms based on sprite metadata settings (using centralized utility)
                    // Pass selectedImageIndex for lake edge rotation logic
                    const spriteTransforms = calculateSpriteTransforms(
                        spriteMetadata,
                        x,
                        y,
                        spriteMetadata.spriteWidth,
                        spriteMetadata.spriteHeight,
                        selectedImageIndex
                    );

                    const { flipScale, rotation, brightness, variedWidth, variedHeight, widthDiff, heightDiff } = spriteTransforms;

                    // Use smooth rendering for large decorative sprites (trees, cottages)
                    // They look better with anti-aliasing when scaled up
                    const useSmoothRendering = spriteMetadata.spriteWidth >= 2 || spriteMetadata.spriteHeight >= 2;

                    return (
                        <img
                            key={`fg-${x}-${y}`}
                            src={spriteImage}
                            alt={tileData.name}
                            className="absolute pointer-events-none"
                            style={{
                                left: (x + spriteMetadata.offsetX + widthDiff) * TILE_SIZE,
                                top: (y + spriteMetadata.offsetY + heightDiff) * TILE_SIZE,
                                width: variedWidth * TILE_SIZE,
                                height: variedHeight * TILE_SIZE,
                                imageRendering: useSmoothRendering ? 'auto' : 'pixelated',
                                transform: `scaleX(${flipScale}) rotate(${rotation}deg)`,
                                filter: `brightness(${brightness})`,
                            }}
                        />
                    );
                })
            )}
        </>
    );
};

export default ForegroundSprites;
