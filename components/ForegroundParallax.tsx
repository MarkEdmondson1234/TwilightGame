/**
 * ForegroundParallax - Decorative tree crowns at the bottom of the screen
 *
 * Creates a "peering over the treetops" effect with tree crowns visible
 * at the bottom of the screen. Trees are fixed in WORLD space - they scroll
 * out of view as the camera moves up the map.
 *
 * Visibility:
 * - Trees fade individually based on horizontal proximity to player
 * - Trees near the player's horizontal position fade out to not obscure gameplay
 * - Trees scroll vertically with the world (fixed to map bottom, not screen)
 */

import React, { useMemo } from 'react';
import { tileAssets } from '../assets';
import { TimeManager } from '../utils/TimeManager';
import { Z_FOREGROUND_PARALLAX, zClass } from '../zIndex';
import { TILE_SIZE } from '../constants';

interface ForegroundParallaxProps {
  cameraX: number;
  cameraY: number;
  mapWidth: number;  // Map width in tiles
  mapHeight: number; // Map height in tiles
  enabled?: boolean;
}

type TreeType = 'oak' | 'cherry' | 'spruce' | 'willow' | 'lilac';

interface TreeConfig {
  id: string;
  // Which type of tree to use
  treeType: TreeType;
  // Horizontal position as percentage (0 = left edge, 100 = right edge)
  horizontalPercent: number;
  // How far up from bottom of screen (positive = higher/more visible)
  bottomOffset: number;
  // Scale multiplier
  scale: number;
  // Parallax speed (higher = more movement relative to camera)
  parallaxSpeed: number;
}

/**
 * Get seasonal tree asset based on tree type
 */
function getSeasonalTree(treeType: TreeType): string {
  const season = TimeManager.getCurrentTime().season.toLowerCase();

  switch (treeType) {
    case 'oak':
      switch (season) {
        case 'spring': return tileAssets.oak_tree_spring;
        case 'summer': return tileAssets.oak_tree_summer;
        case 'autumn': return tileAssets.oak_tree_autumn;
        case 'winter': return tileAssets.oak_tree_winter;
        default: return tileAssets.oak_tree_spring;
      }
    case 'cherry':
      switch (season) {
        case 'spring': return tileAssets.tree_cherry_spring;
        case 'summer': return tileAssets.tree_cherry_summer_no_fruit;
        case 'autumn': return tileAssets.tree_cherry_autumn;
        case 'winter': return tileAssets.tree_cherry_winter;
        default: return tileAssets.tree_cherry_spring;
      }
    case 'spruce':
      return season === 'winter' ? tileAssets.spruce_tree_winter : tileAssets.spruce_tree;
    case 'willow':
      switch (season) {
        case 'autumn': return tileAssets.willow_tree_autumn;
        case 'winter': return tileAssets.willow_tree_winter;
        default: return tileAssets.willow_tree;
      }
    case 'lilac':
      switch (season) {
        case 'spring': return tileAssets.lilac_tree_spring;
        case 'summer': return tileAssets.lilac_tree_summer;
        case 'autumn': return tileAssets.lilac_tree_autumn;
        case 'winter': return tileAssets.lilac_tree_winter;
        default: return tileAssets.lilac_tree_spring;
      }
    default:
      return tileAssets.oak_tree_spring;
  }
}

/**
 * Tree configurations - spread across bottom of screen
 * Trees positioned so only their CROWNS (tops) are visible
 * bottomOffset controls how high the tree crown appears (higher = more visible)
 * Mix of different tree types for visual variety
 */
const TREE_CONFIGS: TreeConfig[] = [
  // Far left - oak
  {
    id: 'tree-1',
    treeType: 'oak',
    horizontalPercent: -5,
    bottomOffset: 280,
    scale: 1.3,
    parallaxSpeed: 0.35,
  },
  // Left - willow
  {
    id: 'tree-2',
    treeType: 'willow',
    horizontalPercent: 15,
    bottomOffset: 250,
    scale: 1.2,
    parallaxSpeed: 0.28,
  },
  // Left-center - spruce (evergreen)
  {
    id: 'tree-3',
    treeType: 'spruce',
    horizontalPercent: 35,
    bottomOffset: 300,
    scale: 1.4,
    parallaxSpeed: 0.4,
  },
  // Center - willow (graceful draping)
  {
    id: 'tree-4',
    treeType: 'willow',
    horizontalPercent: 55,
    bottomOffset: 230,
    scale: 1.0,
    parallaxSpeed: 0.32,
  },
  // Right-center - lilac (flowering)
  {
    id: 'tree-5',
    treeType: 'lilac',
    horizontalPercent: 72,
    bottomOffset: 270,
    scale: 1.3,
    parallaxSpeed: 0.38,
  },
  // Right - oak
  {
    id: 'tree-6',
    treeType: 'oak',
    horizontalPercent: 90,
    bottomOffset: 260,
    scale: 1.4,
    parallaxSpeed: 0.42,
  },
  // Far right - spruce
  {
    id: 'tree-7',
    treeType: 'spruce',
    horizontalPercent: 108,
    bottomOffset: 245,
    scale: 1.2,
    parallaxSpeed: 0.45,
  },
];

// Horizontal fade: trees fade when player is within this distance (in pixels)
const FADE_DISTANCE = 650; // Start fading when player is this close horizontally
const FULL_FADE_DISTANCE = 250; // Fully faded when player is this close

const ForegroundParallax: React.FC<ForegroundParallaxProps> = ({
  cameraX,
  cameraY,
  mapWidth,
  mapHeight,
  enabled = true,
}) => {
  // Get current season for tree asset selection
  const season = TimeManager.getCurrentTime().season.toLowerCase();

  // Cache tree assets based on season (memoized to avoid recalculating every frame)
  const treeAssets = useMemo(() => {
    const assets: Record<string, string> = {};
    for (const tree of TREE_CONFIGS) {
      assets[tree.id] = getSeasonalTree(tree.treeType);
    }
    return assets;
  }, [season]);

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Trees are positioned at the bottom of the map (world Y position in pixels)
  const treesWorldY = (mapHeight - 2) * TILE_SIZE;

  // Trees are fixed in world space - calculate their screen position
  // When camera moves up (cameraY decreases), trees move down on screen
  const treesScreenY = treesWorldY - cameraY;

  // If trees are below the viewport, don't render
  if (treesScreenY > viewportHeight + 200) {
    return null;
  }

  if (!enabled) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden ${zClass(Z_FOREGROUND_PARALLAX)}`}
    >
      {TREE_CONFIGS.map(tree => {
        // Calculate tree's horizontal position on screen
        // Base position from percentage + parallax offset
        const parallaxX = -cameraX * tree.parallaxSpeed;
        const treeScreenX = (tree.horizontalPercent / 100) * viewportWidth + parallaxX;

        // Calculate horizontal distance from player to this tree (in screen space)
        const playerScreenX = viewportWidth / 2; // Player is always centered on screen
        const distanceFromPlayer = Math.abs(treeScreenX - playerScreenX);

        // Calculate opacity based on horizontal distance
        // Trees far from player = fully visible
        // Trees near player = fade out completely
        let treeOpacity = 1;
        if (distanceFromPlayer < FULL_FADE_DISTANCE) {
          treeOpacity = 0; // Invisible when very close
        } else if (distanceFromPlayer < FADE_DISTANCE) {
          // Linear fade
          treeOpacity = (distanceFromPlayer - FULL_FADE_DISTANCE) / (FADE_DISTANCE - FULL_FADE_DISTANCE);
        }

        // Calculate vertical position - trees are fixed in world space
        // bottomOffset moves them up from the base position
        const treeY = treesScreenY - tree.bottomOffset;

        return (
          <img
            key={tree.id}
            src={treeAssets[tree.id]}
            alt=""
            className="absolute"
            style={{
              left: `${tree.horizontalPercent}%`,
              bottom: 'auto',
              top: `${treeY}px`,
              transform: `translateX(-50%) translateX(${parallaxX}px) scale(${tree.scale})`,
              opacity: treeOpacity,
              transition: 'opacity 0.2s ease-out',
              imageRendering: 'pixelated',
              width: 'auto',
              height: '800px', // Fixed height for tree image
              transformOrigin: 'top center',
            }}
          />
        );
      })}
    </div>
  );
};

export default ForegroundParallax;
