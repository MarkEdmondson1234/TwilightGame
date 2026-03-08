/**
 * Mouse Hover Hook
 *
 * Tracks mouse position over the game world and updates the PixiJS
 * HighlightLayer to show which tile is under the cursor. Uses refs
 * for all frequently-changing values (camera, zoom) to avoid
 * re-creating event listeners or triggering React re-renders.
 *
 * The highlight colour changes based on a lightweight tile
 * classification (farm, forage, transition, NPC, cooking, etc.).
 */

import { useEffect, useRef, useState, MutableRefObject } from 'react';
import { Position, TileType } from '../types';
import { INTERACTION } from '../constants';
import { screenToTile } from '../utils/screenToTile';
import { getTileData } from '../utils/mapUtils';
import { mapManager } from '../maps';
import { npcManager } from '../NPCManager';
import { farmManager } from '../utils/farmManager';
import { hasTileTypeNearby } from '../utils/mapUtils';
import { gameState } from '../GameState';
import { HighlightLayer, type HighlightCategory } from '../utils/pixi/HighlightLayer';

export interface UseMouseHoverConfig {
  /** Reference to the game container element */
  containerRef: MutableRefObject<HTMLDivElement | null>;
  /** Current camera position (in pixels) */
  cameraX: number;
  cameraY: number;
  /** Current zoom level */
  zoom: number;
  /** Current map ID */
  currentMapId: string;
  /** Whether the device is touch-only (disables hover) */
  isTouchDevice: boolean;
  /** The PixiJS highlight layer to update */
  highlightLayer: HighlightLayer | null;
  /** Player position ref (for distance check) */
  playerPosRef: MutableRefObject<Position>;
  /** Effective tile size for background-image rooms */
  effectiveTileSize?: number;
  /** Grid offset for background-image rooms */
  gridOffset?: { x: number; y: number };
}

/** Forageable tile types (lightweight check for hover classification) */
const FORAGEABLE_TILES: ReadonlySet<TileType> = new Set([
  TileType.FERN,
  TileType.MUSHROOM,
  TileType.WILD_STRAWBERRY,
  TileType.MOONPETAL,
  TileType.LUMINESCENT_TOADSTOOL,
  TileType.FOREST_MUSHROOM,
  TileType.ADDERSMEAT,
  TileType.WOLFSBANE,
  TileType.MUSTARD_FLOWER,
  TileType.SHRINKING_VIOLET,
  TileType.FROST_FLOWER,
  TileType.GIANT_MUSHROOM,
]);

/** Transition/door tile types */
const TRANSITION_TILES: ReadonlySet<TileType> = new Set([
  TileType.DOOR,
  TileType.EXIT_DOOR,
  TileType.SHOP_DOOR,
  TileType.BUILDING_DOOR,
]);

/** Cooking station tile types */
const COOKING_TILES: ReadonlySet<TileType> = new Set([
  TileType.STOVE,
  TileType.CAMPFIRE,
  TileType.CAULDRON,
]);

/**
 * Lightweight tile classification for hover highlight colour.
 * Much cheaper than getAvailableInteractions — only checks tile data
 * and a few manager lookups, no callback construction.
 */
function classifyTile(tileX: number, tileY: number, mapId: string): HighlightCategory {
  const tileData = getTileData(tileX, tileY);
  if (!tileData) return 'none';

  const tileType = tileData.type;

  // Check transition tiles directly
  if (TRANSITION_TILES.has(tileType)) return 'transition';

  // Check if any map transition is at this tile
  const currentMap = mapManager.getCurrentMap();
  if (currentMap) {
    for (const transition of currentMap.transitions) {
      if (
        Math.floor(transition.fromPosition.x) === tileX &&
        Math.floor(transition.fromPosition.y) === tileY
      ) {
        return 'transition';
      }
    }
  }

  // Check cooking stations
  if (COOKING_TILES.has(tileType)) return 'cooking';

  // Check farm soil / active plots
  if (tileType >= TileType.SOIL_FALLOW && tileType <= TileType.SOIL_DEAD) return 'farm';
  const plot = farmManager.getPlot(mapId, { x: tileX, y: tileY });
  if (plot) return 'farm';

  // Check NPC at position (use tile centre for radius check)
  const npc = npcManager.getNPCAtPosition({ x: tileX + 0.5, y: tileY + 0.5 }, 1.0);
  if (npc) return 'npc';

  // Check placed items
  const placedItems = gameState.getPlacedItems(mapId);
  const hasPlacedItem = placedItems.some(
    (item) => item.position.x === tileX && item.position.y === tileY
  );
  if (hasPlacedItem) return 'pickup';

  // Check forageable tiles
  if (FORAGEABLE_TILES.has(tileType)) return 'forage';

  // Check for nearby forageable multi-tile sprites (beehive, etc.)
  if (
    hasTileTypeNearby(
      tileX,
      tileY,
      [
        TileType.BEE_HIVE,
        TileType.LUMINESCENT_TOADSTOOL,
        TileType.FOREST_MUSHROOM,
        TileType.ROSEBUSH_PINK,
        TileType.ROSEBUSH_RED,
        TileType.SAKURA_TREE,
        TileType.DEAD_SPRUCE,
      ],
      2
    )
  ) {
    return 'forage';
  }

  return 'none';
}

export function useMouseHover(config: UseMouseHoverConfig): void {
  const {
    containerRef,
    cameraX,
    cameraY,
    zoom,
    currentMapId,
    isTouchDevice,
    highlightLayer,
    playerPosRef,
    effectiveTileSize,
    gridOffset,
  } = config;

  // Track when the container DOM element becomes available (after loading screen)
  const [containerReady, setContainerReady] = useState(!!containerRef.current);
  if (!containerReady && containerRef.current) {
    setContainerReady(true);
  }

  // Store frequently-changing values in refs
  const cameraXRef = useRef(cameraX);
  const cameraYRef = useRef(cameraY);
  const zoomRef = useRef(zoom);
  const currentMapIdRef = useRef(currentMapId);
  const highlightLayerRef = useRef(highlightLayer);
  const effectiveTileSizeRef = useRef(effectiveTileSize);
  const gridOffsetRef = useRef(gridOffset);

  // Update refs on every render
  cameraXRef.current = cameraX;
  cameraYRef.current = cameraY;
  zoomRef.current = zoom;
  currentMapIdRef.current = currentMapId;
  highlightLayerRef.current = highlightLayer;
  effectiveTileSizeRef.current = effectiveTileSize;
  gridOffsetRef.current = gridOffset;

  useEffect(() => {
    // No hover on touch devices
    if (isTouchDevice) {
      console.log('[MouseHover] Disabled — touch device');
      return;
    }

    const container = containerRef.current;
    if (!container) {
      console.log('[MouseHover] No container ref');
      return;
    }

    console.log('[MouseHover] Attaching mousemove listener');

    // Track last tile for efficient re-checks
    let lastTileX = -999;
    let lastTileY = -999;
    // Cached values for the current tile (avoids re-classifying on distance recheck)
    let lastCategory: HighlightCategory = 'none';
    let lastWorldX = 0;
    let lastWorldY = 0;
    let lastTooFar = false;
    let mouseInside = false;
    let loggedOnce = false;

    /** Compute tooFar from cached world position — just arithmetic, no lookups */
    const computeTooFar = (
      category: HighlightCategory,
      worldX: number,
      worldY: number
    ): boolean => {
      if (category === 'none') return false;
      const isBackgroundImageRoom = mapManager.getCurrentMap()?.renderMode === 'background-image';
      if (isBackgroundImageRoom) return false;
      const pp = playerPosRef.current;
      const dx = worldX - pp.x;
      const dy = worldY - pp.y;
      return dx * dx + dy * dy > INTERACTION.RANGE * INTERACTION.RANGE;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseInside = true;
      const layer = highlightLayerRef.current;
      if (!layer) {
        if (!loggedOnce) {
          console.log('[MouseHover] No highlight layer available yet');
          loggedOnce = true;
        }
        return;
      }

      const rect = container.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const result = screenToTile(
        screenX,
        screenY,
        zoomRef.current,
        cameraXRef.current,
        cameraYRef.current,
        gridOffsetRef.current,
        effectiveTileSizeRef.current
      );

      // Only reclassify when tile changes (the expensive part)
      if (result.tileX !== lastTileX || result.tileY !== lastTileY) {
        lastTileX = result.tileX;
        lastTileY = result.tileY;
        lastCategory = classifyTile(result.tileX, result.tileY, currentMapIdRef.current);
      }

      lastWorldX = result.worldX;
      lastWorldY = result.worldY;
      lastTooFar = computeTooFar(lastCategory, lastWorldX, lastWorldY);
      layer.update(result.tileX, result.tileY, lastCategory, lastTooFar);
    };

    const handleMouseLeave = () => {
      const layer = highlightLayerRef.current;
      if (layer) layer.hide();
      lastTileX = -999;
      lastTileY = -999;
      mouseInside = false;
    };

    // Re-check distance periodically so highlight updates as player walks
    // (even if mouse doesn't move). Only recomputes tooFar — no tile
    // classification or screen-to-tile conversion, just cheap arithmetic.
    let rafId = 0;
    let lastCheckTime = 0;
    const RECHECK_INTERVAL = 200;
    const tick = (time: number) => {
      if (mouseInside && lastTileX !== -999 && time - lastCheckTime > RECHECK_INTERVAL) {
        lastCheckTime = time;
        const tooFar = computeTooFar(lastCategory, lastWorldX, lastWorldY);
        if (tooFar !== lastTooFar) {
          lastTooFar = tooFar;
          const layer = highlightLayerRef.current;
          if (layer) layer.update(lastTileX, lastTileY, lastCategory, tooFar);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
    // Only depend on stable values — everything else read from refs
    // containerReady triggers re-run when the game container mounts after loading
  }, [containerRef, isTouchDevice, containerReady]);
}
