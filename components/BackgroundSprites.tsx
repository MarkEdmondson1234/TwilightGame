import React from 'react';
import { MapDefinition } from '../types';
import { getTileData } from '../utils/mapUtils';
import { SPRITE_METADATA, TILE_SIZE } from '../constants';

interface BackgroundSpritesProps {
    currentMap: MapDefinition;
}

/**
 * Renders background multi-tile sprites (like rugs, sofas, beds)
 * These render in a separate layer without CSS transforms
 */
const BackgroundSprites: React.FC<BackgroundSpritesProps> = ({ currentMap }) => {
    return (
        <>
            {SPRITE_METADATA.filter(s => !s.isForeground).map((spriteMetadata) =>
                currentMap.grid.map((row, y) =>
                    row.map((_, x) => {
                        const tileData = getTileData(x, y);
                        if (!tileData || tileData.type !== spriteMetadata.tileType) return null;

                        // Use smooth rendering for multi-tile sprites (they look better scaled up)
                        const useSmoothRendering = spriteMetadata.spriteWidth >= 2 || spriteMetadata.spriteHeight >= 2;

                        // Select sprite image (handle both string and array)
                        let spriteImage: string;
                        if (Array.isArray(spriteMetadata.image)) {
                            // Select image using deterministic hash based on position
                            const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                            const index = Math.floor((imageHash % 1) * spriteMetadata.image.length);
                            spriteImage = spriteMetadata.image[index];
                        } else {
                            spriteImage = spriteMetadata.image;
                        }

                        // Render the multi-tile sprite (no transformations)
                        return (
                            <img
                                key={`bg-sprite-${spriteMetadata.tileType}-${x}-${y}`}
                                src={spriteImage}
                                alt={tileData.name}
                                className="absolute pointer-events-none"
                                style={{
                                    left: (x + spriteMetadata.offsetX) * TILE_SIZE,
                                    top: (y + spriteMetadata.offsetY) * TILE_SIZE,
                                    width: spriteMetadata.spriteWidth * TILE_SIZE,
                                    height: spriteMetadata.spriteHeight * TILE_SIZE,
                                    imageRendering: useSmoothRendering ? 'auto' : 'pixelated',
                                }}
                            />
                        );
                    })
                )
            )}
        </>
    );
};

export default BackgroundSprites;
