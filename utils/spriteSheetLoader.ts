/**
 * Sprite Sheet Loader
 *
 * Handles loading and rendering from optimized sprite sheets.
 * Sprite sheets combine multiple animation frames into a single image,
 * reducing HTTP requests and improving performance on mobile devices.
 */

import { Direction } from '../types';

export interface SpriteSheetFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteSheetMetadata {
  frames: Record<number, SpriteSheetFrame>;
  meta: {
    size: { w: number; h: number };
    frameSize: { w: number; h: number };
  };
}

/**
 * Load sprite sheet metadata from JSON
 */
export async function loadSpriteSheetMetadata(
  metadataUrl: string
): Promise<SpriteSheetMetadata> {
  try {
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`Failed to load metadata: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`[SpriteSheet] Error loading metadata from ${metadataUrl}:`, error);
    throw error;
  }
}

/**
 * Preload sprite sheet image
 */
export function preloadSpriteSheet(imageUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${imageUrl}`));
    img.src = imageUrl;
  });
}

/**
 * Check if optimized sprite sheets are available
 */
export async function hasSpriteSheets(): Promise<boolean> {
  try {
    // Check if at least one sprite sheet exists
    const response = await fetch('/TwilightGame/assets-optimized/character1/down.png', {
      method: 'HEAD'
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get sprite sheet path for a character and direction
 */
export function getSpriteSheetPath(characterId: string, direction: Direction): {
  image: string;
  metadata: string;
} {
  const directionName = ['up', 'down', 'left', 'right'][direction];
  const basePath = `/TwilightGame/assets-optimized/${characterId}`;

  return {
    image: `${basePath}/${directionName}.png`,
    metadata: `${basePath}/${directionName}.json`,
  };
}

/**
 * Render a sprite from a sprite sheet to a canvas
 *
 * This is useful for creating individual sprite URLs from a sprite sheet.
 * Creates a data URL that can be used as an img src.
 */
export function extractSpriteFrame(
  spriteSheet: HTMLImageElement,
  frame: SpriteSheetFrame,
  scale: number = 1
): string {
  const canvas = document.createElement('canvas');
  canvas.width = frame.w * scale;
  canvas.height = frame.h * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Disable image smoothing for pixel art
  ctx.imageSmoothingEnabled = false;

  // Draw the frame from the sprite sheet
  ctx.drawImage(
    spriteSheet,
    frame.x, frame.y, frame.w, frame.h, // Source rectangle
    0, 0, canvas.width, canvas.height    // Destination rectangle
  );

  return canvas.toDataURL('image/png');
}

/**
 * Load all sprite frames for a character direction as individual data URLs
 *
 * This converts a sprite sheet back into individual frame URLs
 * that can be used with the existing sprite rendering system.
 */
export async function loadSpriteSheetAsFrames(
  characterId: string,
  direction: Direction
): Promise<string[]> {
  const paths = getSpriteSheetPath(characterId, direction);

  try {
    // Load metadata and image in parallel
    const [metadata, spriteSheet] = await Promise.all([
      loadSpriteSheetMetadata(paths.metadata),
      preloadSpriteSheet(paths.image),
    ]);

    // Extract each frame as a data URL
    const frames: string[] = [];
    for (let i = 0; i < Object.keys(metadata.frames).length; i++) {
      const frameData = metadata.frames[i];
      if (frameData) {
        const frameUrl = extractSpriteFrame(spriteSheet, frameData);
        frames.push(frameUrl);
      }
    }

    return frames;
  } catch (error) {
    console.error(`[SpriteSheet] Failed to load sprite sheet for ${characterId}/${direction}:`, error);
    throw error;
  }
}
