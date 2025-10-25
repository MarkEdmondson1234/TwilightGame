/**
 * Tile Rendering Utilities
 * Centralized logic for calculating tile transforms (flip, rotate, scale, brightness)
 */

import { TileData, TileTransformSettings } from '../types';

export interface TileTransformResult {
    transform: string;
    filter: string;
    sizeScale: number;
}

/**
 * Generate deterministic hash values for tile position
 * Used to ensure tiles always have the same random variations
 */
function generateTileHashes(x: number, y: number) {
    return {
        flipHash: Math.abs(Math.sin(x * 87.654 + y * 21.987) * 67890.1234),
        sizeHash: Math.abs(Math.sin(x * 93.9898 + y * 47.233) * 28473.5453),
        rotHash: Math.abs(Math.sin(x * 51.1234 + y * 31.567) * 19283.1234),
        brightHash: Math.abs(Math.sin(x * 73.4567 + y * 89.123) * 37492.8765),
    };
}

/**
 * Calculate CSS transforms for a tile based on its transform settings
 * @param tileData - The tile data (includes transforms config)
 * @param x - Tile X position (for deterministic randomness)
 * @param y - Tile Y position (for deterministic randomness)
 * @returns Transform styles to apply to the tile
 */
export function calculateTileTransforms(
    tileData: TileData,
    x: number,
    y: number
): TileTransformResult {
    // Default: no transforms
    if (!tileData.transforms) {
        return {
            transform: 'none',
            filter: 'none',
            sizeScale: 1.0,
        };
    }

    const transforms = tileData.transforms;
    const hashes = generateTileHashes(x, y);

    let flipScaleX = 1;
    let sizeScale = 1.0;
    let rotation = 0;
    let brightness = 1.0;

    // Horizontal flip
    if (transforms.enableFlip) {
        const shouldFlip = (hashes.flipHash % 1) > 0.5;
        flipScaleX = shouldFlip ? -1 : 1;
    }

    // Size variation
    if (transforms.enableScale) {
        const scaleRange = transforms.scaleRange || { min: 0.85, max: 1.15 };
        sizeScale = scaleRange.min + (hashes.sizeHash % 1) * (scaleRange.max - scaleRange.min);
    }

    // Rotation variation
    if (transforms.enableRotation) {
        if (transforms.rotationMode === 'full360') {
            // Full 360-degree rotation (e.g., stepping stones)
            rotation = (hashes.rotHash % 1) * 360;
        } else if (transforms.rotationMode === 'flip180') {
            // Only 0 or 180 degrees (e.g., fallow soil)
            rotation = (hashes.rotHash % 1) > 0.5 ? 180 : 0;
        } else {
            // Subtle rotation (default)
            const rotationRange = transforms.rotationRange || { min: -5, max: 10 };
            rotation = rotationRange.min + (hashes.rotHash % 1) * (rotationRange.max - rotationRange.min);
        }
    }

    // Brightness variation
    if (transforms.enableBrightness) {
        const brightnessRange = transforms.brightnessRange || { min: 0.95, max: 1.05 };
        brightness = brightnessRange.min + (hashes.brightHash % 1) * (brightnessRange.max - brightnessRange.min);
    }

    // Combine transforms
    const transform = `scaleX(${flipScaleX}) rotate(${rotation}deg)`;
    const filter = transforms.enableBrightness ? `brightness(${brightness})` : 'none';

    return {
        transform,
        filter,
        sizeScale,
    };
}

/**
 * Calculate transforms for multi-tile sprites based on sprite metadata
 * @param transforms - Transform settings from sprite metadata
 * @param x - Tile X position
 * @param y - Tile Y position
 * @returns Transform result with additional dimensional variations
 */
export function calculateSpriteTransforms(
    transforms: TileTransformSettings,
    x: number,
    y: number,
    spriteWidth: number,
    spriteHeight: number
): {
    flipScale: number;
    sizeVariation: number;
    rotation: number;
    brightness: number;
    variedWidth: number;
    variedHeight: number;
    widthDiff: number;
    heightDiff: number;
} {
    const hashes = generateTileHashes(x, y);

    let flipScale = 1;
    let sizeVariation = 1;
    let rotation = 0;
    let brightness = 1;

    // Horizontal flip (defaults to disabled)
    if (transforms.enableFlip === true) {
        const shouldFlip = (hashes.flipHash % 1) > 0.5;
        flipScale = shouldFlip ? -1 : 1;
    }

    // Size variation (defaults to disabled)
    if (transforms.enableScale === true) {
        const scaleRange = transforms.scaleRange || { min: 0.85, max: 1.15 };
        sizeVariation = scaleRange.min + (hashes.sizeHash % 1) * (scaleRange.max - scaleRange.min);
    }

    // Rotation variation (defaults to disabled)
    if (transforms.enableRotation === true) {
        const rotationRange = transforms.rotationRange || { min: -8, max: 8 };
        rotation = rotationRange.min + (hashes.rotHash % 1) * (rotationRange.max - rotationRange.min);
    }

    // Brightness variation (defaults to disabled)
    if (transforms.enableBrightness === true) {
        const brightnessRange = transforms.brightnessRange || { min: 0.9, max: 1.1 };
        brightness = brightnessRange.min + (hashes.brightHash % 1) * (brightnessRange.max - brightnessRange.min);
    }

    // Calculate dimensions with size variation
    const variedWidth = spriteWidth * sizeVariation;
    const variedHeight = spriteHeight * sizeVariation;

    // Adjust position to keep sprite centered at original position
    const widthDiff = (spriteWidth - variedWidth) / 2;
    const heightDiff = (spriteHeight - variedHeight) / 2;

    return {
        flipScale,
        sizeVariation,
        rotation,
        brightness,
        variedWidth,
        variedHeight,
        widthDiff,
        heightDiff,
    };
}
