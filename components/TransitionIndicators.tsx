import React from 'react';
import { MapDefinition, Position } from '../types';
import { TILE_SIZE } from '../constants';

interface TransitionIndicatorsProps {
    currentMap: MapDefinition;
    playerPos: Position;
    lastTransitionTime: number;
}

/**
 * Visual indicators for map transitions
 * Shows interactive prompts when player is near transition tiles
 */
const TransitionIndicators: React.FC<TransitionIndicatorsProps> = ({
    currentMap,
    playerPos,
    lastTransitionTime,
}) => {
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
                                left: transition.fromPosition.x * TILE_SIZE,
                                top: transition.fromPosition.y * TILE_SIZE,
                                width: TILE_SIZE,
                                height: TILE_SIZE,
                            }}
                        />
                        {/* Label above the tile */}
                        <div
                            className="absolute pointer-events-none"
                            style={{
                                left: (transition.fromPosition.x + 0.5) * TILE_SIZE,
                                top: (transition.fromPosition.y - 0.5) * TILE_SIZE,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <div
                                className={`${
                                    isVeryClose
                                        ? 'bg-green-400 animate-pulse'
                                        : 'bg-yellow-400'
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
