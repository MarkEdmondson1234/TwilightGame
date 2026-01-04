import React from 'react';
import { MapDefinition, Position } from '../types';
import { TILE_SIZE } from '../constants';

interface TransitionIndicatorsProps {
  currentMap: MapDefinition;
  playerPos: Position;
  lastTransitionTime: number;
  gridOffset?: Position; // Offset for background-image rooms with centered layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
}

/**
 * Visual indicators for map transitions
 * Shows interactive prompts when player is near transition tiles
 */
const TransitionIndicators: React.FC<TransitionIndicatorsProps> = ({
  currentMap,
  playerPos,
  lastTransitionTime,
  gridOffset,
  tileSize = TILE_SIZE,
}) => {
  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;
  return (
    <>
      {currentMap.transitions.map((transition, idx) => {
        // Check if player is within 2 tiles
        const dx = Math.abs(playerPos.x - transition.fromPosition.x);
        const dy = Math.abs(playerPos.y - transition.fromPosition.y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isNearby = distance <= 2;
        const isVeryClose = dx < 1.5 && dy < 1.5;

        // Only show transition indicators when player is within 2 tiles
        if (!isNearby) return null;

        return (
          <React.Fragment key={`transition-${idx}`}>
            {/* Visual marker on the transition tile */}
            <div
              className={`absolute pointer-events-none border-4 ${
                isVeryClose
                  ? 'border-green-400 bg-green-400/30'
                  : 'border-yellow-400 bg-yellow-400/20'
              }`}
              style={{
                left: transition.fromPosition.x * tileSize + offsetX,
                top: transition.fromPosition.y * tileSize + offsetY,
                width: tileSize,
                height: tileSize,
                zIndex: 500, // Above foreground layers (65) but below UI (1000)
              }}
            />
            {/* Label above the tile */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: (transition.fromPosition.x + 0.5) * tileSize + offsetX,
                top: (transition.fromPosition.y - 0.5) * tileSize + offsetY,
                transform: 'translate(-50%, -50%)',
                zIndex: 500, // Above foreground layers (65) but below UI (1000)
              }}
            >
              <div
                className={`${
                  isVeryClose ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                } px-3 py-1 rounded-full text-xs font-bold text-black whitespace-nowrap shadow-lg`}
              >
                [E] {transition.label || transition.toMapId}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default TransitionIndicators;
