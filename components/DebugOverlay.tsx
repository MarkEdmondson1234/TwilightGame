import React from 'react';
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { getTileData } from '../utils/mapUtils';
import { Position } from '../types';
import DebugInfoPanel from './DebugInfoPanel';

interface DebugOverlayProps {
  playerPos: Position;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ playerPos }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
      {/* Tile Data Overlay */}
      {Array.from({ length: MAP_HEIGHT }).map((_, y) =>
        Array.from({ length: MAP_WIDTH }).map((_, x) => {
          const tileData = getTileData(x, y);
          if (!tileData) return null;

          return (
            <div
              key={`${x}-${y}`}
              className="absolute flex items-center justify-center"
              style={{
                left: x * TILE_SIZE,
                top: y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
            >
              {/* Solid Tile Indicator */}
              {tileData.isSolid && (
                <div className="w-full h-full bg-red-500/30 border border-red-500/50" />
              )}
              {/* Tile Name Label */}
              <span className="text-white text-[8px] font-mono p-1 bg-black/30 rounded-sm">
                {tileData.name.split(' ')[0].toUpperCase()}
              </span>
            </div>
          );
        })
      )}
      <DebugInfoPanel playerPos={playerPos} />
    </div>
  );
};

export default DebugOverlay;
