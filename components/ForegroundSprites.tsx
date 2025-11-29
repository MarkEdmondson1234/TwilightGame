import React, { useMemo } from 'react';
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

interface SpriteData {
    x: number;
    y: number;
    spriteImage: string;
    tileData: ReturnType<typeof getTileData>;
    spriteMetadata: (typeof SPRITE_METADATA)[number];
    selectedImageIndex?: number;
}

/**
 * Renders foreground multi-tile sprites (trees, cottages)
 * These render above the player with CSS transforms for variation
 * Sprites are sorted by Y position so trees closer to camera (higher Y) render in front
 */
const ForegroundSprites: React.FC<ForegroundSpritesProps> = ({
    currentMap,
    visibleRange,
    seasonKey,
}) => {
    // Collect all visible sprites and sort by Y position for proper depth ordering
    const sortedSprites = useMemo(() => {
        const sprites: SpriteData[] = [];
        const margin = 8; // Extra margin for large sprites (increased from 5)

        for (let y = 0; y < currentMap.grid.length; y++) {
            const row = currentMap.grid[y];
            for (let x = 0; x < row.length; x++) {
                // Performance: Skip tiles outside viewport (with extra margin for large sprites)
                if (x < visibleRange.minX - margin || x > visibleRange.maxX + margin ||
                    y < visibleRange.minY - margin || y > visibleRange.maxY + margin) {
                    continue;
                }

                const tileData = getTileData(x, y);
                if (!tileData) continue;

                // Find sprite metadata for this tile type
                const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData.type);
                if (!spriteMetadata || !spriteMetadata.isForeground) continue;

                // Determine which image to use (seasonal or default)
                let spriteImage: string;
                let selectedImageIndex: number | undefined;
                if (tileData.seasonalImages) {
                    const seasonalArray = tileData.seasonalImages[seasonKey] || tileData.seasonalImages.default;
                    const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                    const index = Math.floor((imageHash % 1) * seasonalArray.length);
                    spriteImage = seasonalArray[index];
                    selectedImageIndex = index;
                } else if (Array.isArray(spriteMetadata.image)) {
                    const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                    const index = Math.floor((imageHash % 1) * spriteMetadata.image.length);
                    spriteImage = spriteMetadata.image[index];
                    selectedImageIndex = index;
                } else {
                    spriteImage = spriteMetadata.image;
                }

                sprites.push({
                    x,
                    y,
                    spriteImage,
                    tileData,
                    spriteMetadata,
                    selectedImageIndex,
                });
            }
        }

        // Sort by Y position ascending: sprites with lower Y render first (behind),
        // sprites with higher Y render last (in front, closer to camera)
        sprites.sort((a, b) => a.y - b.y);

        return sprites;
    }, [currentMap.grid, visibleRange, seasonKey]);

    return (
        <>
            {sortedSprites.map(({ x, y, spriteImage, tileData, spriteMetadata, selectedImageIndex }) => {
                // Apply CSS transforms based on sprite metadata settings
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
                const useSmoothRendering = spriteMetadata.spriteWidth >= 2 || spriteMetadata.spriteHeight >= 2;

                // Z-index based on Y position for additional CSS-based depth sorting
                const zIndex = y * 10;

                return (
                    <img
                        key={`fg-${x}-${y}`}
                        src={spriteImage}
                        alt={tileData?.name || 'sprite'}
                        className="absolute pointer-events-none"
                        style={{
                            left: (x + spriteMetadata.offsetX + widthDiff) * TILE_SIZE,
                            top: (y + spriteMetadata.offsetY + heightDiff) * TILE_SIZE,
                            width: variedWidth * TILE_SIZE,
                            height: variedHeight * TILE_SIZE,
                            imageRendering: useSmoothRendering ? 'auto' : 'pixelated',
                            transform: `scaleX(${flipScale}) rotate(${rotation}deg)`,
                            filter: `brightness(${brightness})`,
                            zIndex,
                        }}
                    />
                );
            })}
        </>
    );
};

export default ForegroundSprites;
