import React, { useState, useCallback } from 'react';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, DEBUG } from '../constants';
import { getTileData } from '../utils/mapUtils';
import {
  Position,
  Transition,
  isTileSolid,
  CollisionType,
  FarmPlotState,
  CropGrowthStage,
} from '../types';
import DebugInfoPanel from './DebugInfoPanel';
import { Z_DEBUG_TILES, Z_DEBUG_TRANSITIONS, Z_DEBUG_CLICK, zClass } from '../zIndex';
import { mapManager } from '../maps';
import { farmManager } from '../utils/farmManager';
import { CROP_ADULT_SIZES, CROP_SPRITE_CONFIG } from '../utils/pixi/TileLayer';

interface DebugOverlayProps {
  playerPos: Position;
  gridOffset?: { x: number; y: number };
  tileSize?: number;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({
  playerPos,
  gridOffset,
  tileSize = TILE_SIZE,
}) => {
  const gox = gridOffset?.x ?? 0;
  const goy = gridOffset?.y ?? 0;
  // Track clicked tile for coordinate display
  const [clickedTile, setClickedTile] = useState<Position | null>(null);

  // Get current map for transitions
  const currentMap = mapManager.getCurrentMap();
  const transitions = currentMap?.transitions || [];

  // Handle tile click
  const handleTileClick = useCallback((x: number, y: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setClickedTile({ x, y });
    console.log(`[Debug] Clicked tile: (${x}, ${y})`);
  }, []);

  // Clear clicked tile
  const handleClearClick = useCallback(() => {
    setClickedTile(null);
  }, []);

  return (
    <div className={`absolute top-0 left-0 w-full h-full ${zClass(Z_DEBUG_TILES)}`}>
      {/* Tile Data Overlay - Allow pointer events for clicking */}
      {Array.from({ length: MAP_HEIGHT }).map((_, y) =>
        Array.from({ length: MAP_WIDTH }).map((_, x) => {
          const tileData = getTileData(x, y);
          if (!tileData) return null;

          const isClicked = clickedTile?.x === x && clickedTile?.y === y;

          return (
            <div
              key={`${x}-${y}`}
              className="absolute flex items-center justify-center cursor-pointer hover:bg-white/20"
              style={{
                left: x * tileSize + gox,
                top: y * tileSize + goy,
                width: tileSize,
                height: tileSize,
                pointerEvents: 'auto',
              }}
              onClick={(e) => handleTileClick(x, y, e)}
            >
              {/* Collision Type Indicator */}
              {tileData.collisionType === CollisionType.DESK && (
                <div className="w-full h-full bg-purple-500/40 border-2 border-purple-400 pointer-events-none" />
              )}
              {tileData.collisionType === CollisionType.SOLID && (
                <div className="w-full h-full bg-red-500/30 border border-red-500/50 pointer-events-none" />
              )}
              {/* Tile Name Label */}
              <span className="text-white text-[8px] font-mono p-1 bg-black/30 rounded-sm pointer-events-none">
                {tileData.name.split(' ')[0].toUpperCase()}
              </span>
            </div>
          );
        })
      )}

      {/* Transition Markers */}
      <TransitionMarkers
        transitions={transitions}
        tileSize={tileSize}
        gridOffsetX={gox}
        gridOffsetY={goy}
      />

      {/* Farm Plot Debug Overlay */}
      {DEBUG.FARM_OVERLAY && (
        <FarmDebugOverlay
          mapId={mapManager.getCurrentMapId() || ''}
          tileSize={tileSize}
          gridOffsetX={gox}
          gridOffsetY={goy}
        />
      )}

      {/* Clicked Tile Highlight */}
      {clickedTile && (
        <div
          className={`absolute pointer-events-none ${zClass(Z_DEBUG_CLICK)}`}
          style={{
            left: clickedTile.x * tileSize + gox,
            top: clickedTile.y * tileSize + goy,
            width: tileSize,
            height: tileSize,
          }}
        >
          <div className="w-full h-full border-4 border-yellow-400 bg-yellow-400/30 animate-pulse" />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded whitespace-nowrap">
            ({clickedTile.x}, {clickedTile.y})
          </div>
        </div>
      )}

      {/* Debug Info Panel */}
      <DebugInfoPanel
        playerPos={playerPos}
        clickedTile={clickedTile}
        onClearClick={handleClearClick}
      />
    </div>
  );
};

// Farm plot debug overlay component
interface FarmDebugOverlayProps {
  mapId: string;
  tileSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
}

const FarmDebugOverlay: React.FC<FarmDebugOverlayProps> = ({
  mapId,
  tileSize,
  gridOffsetX,
  gridOffsetY,
}) => {
  const plots = farmManager.getPlotsForMap(mapId);

  if (plots.length === 0) return null;

  // State colour mapping for visual differentiation
  const stateColours: Record<FarmPlotState, string> = {
    [FarmPlotState.FALLOW]: 'border-yellow-600/50',
    [FarmPlotState.TILLED]: 'border-amber-500/50',
    [FarmPlotState.PLANTED]: 'border-green-500/50',
    [FarmPlotState.WATERED]: 'border-blue-500/50',
    [FarmPlotState.READY]: 'border-emerald-400/70',
    [FarmPlotState.WILTING]: 'border-orange-500/70',
    [FarmPlotState.DEAD]: 'border-red-500/70',
  };

  const growthStageNames = ['SEEDLING', 'YOUNG', 'ADULT'];

  return (
    <div
      className={`absolute top-0 left-0 w-full h-full pointer-events-none ${zClass(Z_DEBUG_TILES + 1)}`}
    >
      {plots.map((plot) => {
        const growthStage = farmManager.getGrowthStage(plot);
        const cropAdultConfig = plot.cropType ? CROP_ADULT_SIZES[plot.cropType] : null;

        // Get config for current growth stage
        const stageConfig = CROP_SPRITE_CONFIG[growthStage];

        // Use adult-specific config if at ADULT stage and crop has override
        const config =
          growthStage === CropGrowthStage.ADULT && cropAdultConfig ? cropAdultConfig : stageConfig;

        // Calculate sprite bounds
        const spriteX = (plot.position.x + (config?.offsetX || 0)) * tileSize + gridOffsetX;
        const spriteY = (plot.position.y + (config?.offsetY || 0)) * tileSize + gridOffsetY;
        const spriteW = (config?.width || 1) * tileSize;
        const spriteH = (config?.height || 1) * tileSize;

        // Check if this is a growing crop (has sprite beyond soil)
        const hasCropSprite =
          plot.cropType &&
          plot.state !== FarmPlotState.FALLOW &&
          plot.state !== FarmPlotState.TILLED;

        return (
          <div key={`farm-${plot.position.x}-${plot.position.y}`}>
            {/* Soil tile marker (always at plot position) */}
            <div
              className={`absolute border-2 border-dashed ${stateColours[plot.state]}`}
              style={{
                left: plot.position.x * tileSize + gridOffsetX,
                top: plot.position.y * tileSize + gridOffsetY,
                width: tileSize,
                height: tileSize,
              }}
            >
              <span className="text-[8px] font-mono text-white bg-black/60 px-1 rounded-sm">
                {FarmPlotState[plot.state]}
              </span>
            </div>

            {/* Sprite bounds (only for growing crops) */}
            {hasCropSprite && (
              <div
                className="absolute border-2 border-solid border-purple-400/70 bg-purple-500/10"
                style={{
                  left: spriteX,
                  top: spriteY,
                  width: spriteW,
                  height: spriteH,
                }}
              >
                {/* Info label */}
                <div className="absolute -top-14 left-0 bg-slate-900/90 text-[9px] font-mono text-white px-2 py-1 rounded whitespace-nowrap">
                  <div className="text-purple-300 font-bold">{plot.cropType}</div>
                  <div className="text-gray-300">
                    Stage: {growthStageNames[growthStage]} | Size: {config?.width || 1}x
                    {config?.height || 1}
                  </div>
                  <div className="text-gray-400">
                    Offset: ({config?.offsetX || 0}, {config?.offsetY || 0})
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Transition markers component
interface TransitionMarkersProps {
  transitions: Transition[];
  tileSize: number;
  gridOffsetX: number;
  gridOffsetY: number;
}

const TransitionMarkers: React.FC<TransitionMarkersProps> = ({
  transitions,
  tileSize,
  gridOffsetX,
  gridOffsetY,
}) => {
  return (
    <div
      className={`absolute top-0 left-0 w-full h-full pointer-events-none ${zClass(Z_DEBUG_TRANSITIONS)}`}
    >
      {transitions.map((transition, index) => {
        const { fromPosition, toMapId, toPosition, label } = transition;

        // Determine if this is a random map
        const isRandomMap = toMapId.startsWith('RANDOM_');
        const displayMapId = isRandomMap ? toMapId.replace('RANDOM_', '🎲 ') : toMapId;

        return (
          <div
            key={`transition-${index}`}
            className="absolute"
            style={{
              left: fromPosition.x * tileSize + gridOffsetX,
              top: fromPosition.y * tileSize + gridOffsetY,
              width: tileSize,
              height: tileSize,
            }}
          >
            {/* Transition marker */}
            <div className="w-full h-full border-2 border-cyan-400 bg-cyan-400/30 flex items-center justify-center">
              <span className="text-cyan-200 text-lg">🚪</span>
            </div>

            {/* Info label */}
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-400/50 text-white text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap">
              <div className="text-cyan-300 font-bold text-center">{label || 'Transition'}</div>
              <div className="text-gray-300">→ {displayMapId}</div>
              <div className="text-gray-400 text-[8px]">
                spawn: ({toPosition.x}, {toPosition.y})
              </div>
            </div>

            {/* Direction arrow pointing to target map */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-cyan-400 text-sm">
              ⬇
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DebugOverlay;
