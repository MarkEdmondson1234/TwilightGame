import React from 'react';
import { MapDefinition, Position } from '../types';
import { getTileData } from '../utils/mapUtils';
import { SPRITE_METADATA, TILE_SIZE } from '../constants';

interface DebugCollisionBoxesProps {
    visible: boolean;
    currentMap: MapDefinition;
    gridOffset?: Position; // Offset for background-image rooms with centered layers
}

/**
 * Debug visualization for collision boxes and walkmesh
 * Shows:
 * - Multi-tile sprite collision boxes (red)
 * - Walkmesh grid for background-image rooms (red = solid, green = walkable)
 */
const DebugCollisionBoxes: React.FC<DebugCollisionBoxesProps> = ({ visible, currentMap, gridOffset }) => {
    if (!visible) return null;

    const isBackgroundImageRoom = currentMap.renderMode === 'background-image';
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;

    return (
        <>
            {/* Walkmesh Grid Overlay for background-image rooms */}
            {isBackgroundImageRoom && currentMap.grid.map((row, y) =>
                row.map((_, x) => {
                    const tileData = getTileData(x, y);
                    if (!tileData) return null;

                    return (
                        <div
                            key={`walkmesh-${x}-${y}`}
                            className="absolute pointer-events-none border border-white/30"
                            style={{
                                left: x * TILE_SIZE + offsetX,
                                top: y * TILE_SIZE + offsetY,
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                                zIndex: 500, // Above foreground layers (65), below modals (1000+)
                                backgroundColor: tileData.isSolid
                                    ? 'rgba(255, 0, 0, 0.4)'  // Red = solid/blocked
                                    : 'rgba(0, 255, 0, 0.2)', // Green = walkable
                            }}
                        >
                            {/* Show coordinates on hover-sized tiles */}
                            <span className="text-[6px] text-white font-mono opacity-70">
                                {x},{y}
                            </span>
                        </div>
                    );
                })
            )}

            {/* Multi-tile sprite collision boxes (for tiled rooms) */}
            {!isBackgroundImageRoom && currentMap.grid.map((row, y) =>
                row.map((_, x) => {
                    const tileData = getTileData(x, y);
                    const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData?.type);

                    if (!spriteMetadata || !tileData?.isSolid) return null;

                    // Use collision-specific dimensions if provided, otherwise use sprite dimensions
                    const collisionWidth = spriteMetadata.collisionWidth ?? spriteMetadata.spriteWidth;
                    const collisionHeight = spriteMetadata.collisionHeight ?? spriteMetadata.spriteHeight;
                    const collisionOffsetX = spriteMetadata.collisionOffsetX ?? spriteMetadata.offsetX;
                    const collisionOffsetY = spriteMetadata.collisionOffsetY ?? spriteMetadata.offsetY;

                    // Calculate collision bounds
                    const collisionLeft = x + collisionOffsetX;
                    const collisionTop = y + collisionOffsetY;

                    return (
                        <React.Fragment key={`collision-${x}-${y}`}>
                            {/* Collision Box */}
                            <div
                                className="absolute pointer-events-none border-4 border-red-500"
                                style={{
                                    left: collisionLeft * TILE_SIZE,
                                    top: collisionTop * TILE_SIZE,
                                    width: collisionWidth * TILE_SIZE,
                                    height: collisionHeight * TILE_SIZE,
                                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                                    zIndex: 500, // Above foreground layers (65), below modals (1000+)
                                }}
                            >
                                <div className="text-red-500 font-bold text-xs bg-white px-1">
                                    Collision Box ({x},{y})
                                </div>
                            </div>
                            {/* Anchor Point Marker (0,0) - shows tile position */}
                            <div
                                className="absolute pointer-events-none"
                                style={{
                                    left: x * TILE_SIZE,
                                    top: y * TILE_SIZE,
                                    width: 16,
                                    height: 16,
                                    zIndex: 501, // Above collision boxes
                                }}
                            >
                                {/* Crosshair for anchor point */}
                                <div className="absolute w-full h-0.5 bg-blue-500 top-1/2" />
                                <div className="absolute w-0.5 h-full bg-blue-500 left-1/2" />
                                {/* Center dot */}
                                <div className="absolute w-2 h-2 bg-blue-500 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                {/* Label */}
                                <div className="absolute top-4 left-4 text-blue-500 font-bold text-xs bg-white px-1 whitespace-nowrap">
                                    Anchor (0,0)
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })
            )}
        </>
    );
};

export default DebugCollisionBoxes;
