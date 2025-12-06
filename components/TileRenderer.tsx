import React from 'react';
import { MapDefinition, TileType, FarmPlotState } from '../types';
import { getTileData } from '../utils/mapUtils';
import { TILE_SIZE, SPRITE_METADATA } from '../constants';
import { calculateTileTransforms } from '../utils/tileRenderUtils';
import { farmManager } from '../utils/farmManager';
import { farmingAssets } from '../assets';
import { ColorResolver } from '../utils/ColorResolver';

interface TileRendererProps {
    currentMap: MapDefinition;
    currentMapId: string | null;
    visibleRange: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
    seasonKey: 'spring' | 'summer' | 'autumn' | 'winter';
    farmUpdateTrigger: number;
    colorSchemeVersion?: number;  // Cache-busting prop to force re-render when colors change
}

/**
 * Renders the base map tiles with support for:
 * - Farm plot overrides (tilled soil, planted crops, growth stages)
 * - Seasonal images
 * - Deterministic tile variation
 * - Viewport culling for performance
 */
const TileRenderer: React.FC<TileRendererProps> = ({
    currentMap,
    currentMapId,
    visibleRange,
    seasonKey,
    farmUpdateTrigger,
    colorSchemeVersion, // Unused - just for cache busting
}) => {
    return (
        <>
            {currentMap.grid.map((row, y) =>
                row.map((_, x) => {
                    // Performance: Skip tiles outside viewport
                    if (x < visibleRange.minX || x > visibleRange.maxX || y < visibleRange.minY || y > visibleRange.maxY) {
                        return null;
                    }

                    // Check if this tile has a farm plot override
                    // (farmUpdateTrigger forces re-render when farm plots change)
                    let tileData = getTileData(x, y);
                    if (!tileData) return null;

                    // Override tile appearance if there's an active farm plot here
                    let growthStage: number | null = null;
                    let cropType: string | null = null;
                    if (currentMapId && farmUpdateTrigger >= 0) { // Include farmUpdateTrigger to force re-evaluation
                        const plot = farmManager.getPlot(currentMapId, { x, y });
                        if (plot) {
                            // Get the tile type for this plot's state
                            const plotTileType = farmManager.getTileTypeForPlot(plot);
                            // Get the visual data for this tile type
                            const plotTileData = getTileData(x, y, plotTileType);
                            if (plotTileData) {
                                tileData = plotTileData;
                            }
                            // Get growth stage for all growing crops (planted, watered, ready, wilting)
                            if (plot.state === FarmPlotState.PLANTED ||
                                plot.state === FarmPlotState.WATERED ||
                                plot.state === FarmPlotState.READY ||
                                plot.state === FarmPlotState.WILTING) {
                                growthStage = farmManager.getGrowthStage(plot);
                                cropType = plot.cropType;
                            }
                        }
                    }

                    // Select image variant using deterministic hash
                    let selectedImage: string | null = null;
                    let selectedImageIndex: number | undefined = undefined;

                    // Determine which image array to use (seasonal or regular)
                    let imageArray: string[] | undefined = undefined;

                    if (tileData.seasonalImages) {
                        // Use seasonal images if available (season cached above for performance)
                        imageArray = tileData.seasonalImages[seasonKey] || tileData.seasonalImages.default;

                    } else if (tileData.image) {
                        // Fall back to regular images
                        imageArray = tileData.image;
                    }

                    // Check if this tile has a foreground sprite (if so, don't render its own background image)
                    const hasForegroundSprite = SPRITE_METADATA.some(s =>
                        s.tileType === tileData.type && s.isForeground
                    );

                    // If this tile has a baseType (like cherry trees on grass), use base tile's visuals
                    let renderTileData = tileData;
                    if (hasForegroundSprite && tileData.baseType !== undefined) {
                        const baseTileData = getTileData(x, y, tileData.baseType);
                        if (baseTileData) {
                            renderTileData = baseTileData;
                            // Re-determine image array for base tile (season cached above)
                            if (renderTileData.seasonalImages) {
                                imageArray = renderTileData.seasonalImages[seasonKey] || renderTileData.seasonalImages.default;
                            } else if (renderTileData.image) {
                                imageArray = renderTileData.image;
                            }
                        }
                    }

                    // All tiles with images use random selection now (including paths)
                    if (imageArray && imageArray.length > 0 && (!hasForegroundSprite || tileData.baseType !== undefined)) {
                        const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453);
                        const hashValue = hash % 1;

                        // For grass tiles (and tiles with grass backgrounds), only show image on 30% of tiles (sparse)
                        // For other tiles, always show image
                        // Use renderTileData since we might be rendering base tile (e.g., grass under cherry tree)
                        const isGrassTile = renderTileData.type === TileType.GRASS ||
                                            renderTileData.type === TileType.TREE ||
                                            renderTileData.type === TileType.TREE_BIG;
                        const showImage = isGrassTile ? hashValue < 0.3 : true;

                        if (showImage) {
                            // For farm plots with growth stages, select sprite based on stage and crop type
                            if (growthStage !== null && cropType && (
                                tileData.type === TileType.SOIL_PLANTED ||
                                tileData.type === TileType.SOIL_WATERED ||
                                tileData.type === TileType.SOIL_READY ||
                                tileData.type === TileType.SOIL_WILTING
                            )) {
                                // Override with growth-stage-specific sprite based on crop type
                                if (growthStage === 0) { // SEEDLING
                                    selectedImage = farmingAssets.seedling;
                                } else if (growthStage === 1) { // YOUNG
                                    // Use crop-specific young sprite if available, otherwise use generic
                                    selectedImage = (farmingAssets as any)[`plant_${cropType}_young`] || farmingAssets.seedling;
                                } else { // ADULT
                                    // Use crop-specific adult sprite if available, otherwise use generic
                                    selectedImage = (farmingAssets as any)[`plant_${cropType}_adult`] || farmingAssets.seedling;
                                }
                            } else {
                                // Use a separate hash for image selection to avoid bias
                                const imageHash = Math.abs(Math.sin(x * 99.123 + y * 45.678) * 12345.6789);
                                const index = Math.floor((imageHash % 1) * imageArray.length);
                                selectedImage = imageArray[index];
                                selectedImageIndex = index; // Store for lake edge rotation
                            }
                        }
                    }

                    // Calculate transforms using centralized utility (respects tile's transform settings)
                    const { transform, filter } = selectedImage
                        ? calculateTileTransforms(tileData, x, y, selectedImageIndex)
                        : { transform: 'none', filter: 'none' };

                    // Use ColorResolver to get correct color from color scheme (not TILE_LEGEND fallback)
                    // ColorResolver handles season/time-of-day modifiers automatically
                    const tileColor = ColorResolver.getTileColor(renderTileData.type);

                    return (
                        <div
                            key={`${x}-${y}`}
                            className={`absolute ${tileColor}`}
                            style={{
                                left: x * TILE_SIZE,
                                top: y * TILE_SIZE,
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                            }}
                        >
                            {selectedImage && (
                                <img
                                    src={selectedImage}
                                    alt={renderTileData.name}
                                    className="absolute"
                                    style={{
                                        left: 0,
                                        top: 0,
                                        width: TILE_SIZE,
                                        height: TILE_SIZE,
                                        imageRendering: 'pixelated',
                                        transform: transform,
                                        filter: filter,
                                        transformOrigin: 'center center',
                                    }}
                                />
                            )}
                        </div>
                    );
                })
            )}
        </>
    );
};

export default TileRenderer;
