import React, { useState, useCallback } from 'react';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { getTileData } from '../utils/mapUtils';
import { Position, Transition } from '../types';
import DebugInfoPanel from './DebugInfoPanel';
import { Z_DEBUG_TILES, Z_DEBUG_TRANSITIONS, Z_DEBUG_CLICK, zClass } from '../zIndex';
import { mapManager } from '../maps';

interface DebugOverlayProps {
  playerPos: Position;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ playerPos }) => {
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
                left: x * TILE_SIZE,
                top: y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                pointerEvents: 'auto',
              }}
              onClick={(e) => handleTileClick(x, y, e)}
            >
              {/* Solid Tile Indicator */}
              {tileData.isSolid && (
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
      <TransitionMarkers transitions={transitions} />

      {/* Clicked Tile Highlight */}
      {clickedTile && (
        <div
          className={`absolute pointer-events-none ${zClass(Z_DEBUG_CLICK)}`}
          style={{
            left: clickedTile.x * TILE_SIZE,
            top: clickedTile.y * TILE_SIZE,
            width: TILE_SIZE,
            height: TILE_SIZE,
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

// Transition markers component
interface TransitionMarkersProps {
  transitions: Transition[];
}

const TransitionMarkers: React.FC<TransitionMarkersProps> = ({ transitions }) => {
  return (
    <div className={`absolute top-0 left-0 w-full h-full pointer-events-none ${zClass(Z_DEBUG_TRANSITIONS)}`}>
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
              left: fromPosition.x * TILE_SIZE,
              top: fromPosition.y * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
          >
            {/* Transition marker */}
            <div className="w-full h-full border-2 border-cyan-400 bg-cyan-400/30 flex items-center justify-center">
              <span className="text-cyan-200 text-lg">🚪</span>
            </div>

            {/* Info label */}
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-400/50 text-white text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap">
              <div className="text-cyan-300 font-bold text-center">
                {label || 'Transition'}
              </div>
              <div className="text-gray-300">
                → {displayMapId}
              </div>
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
