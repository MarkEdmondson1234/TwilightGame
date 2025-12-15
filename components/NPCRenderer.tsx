import React from 'react';
import { Position, Direction } from '../types';
import { TILE_SIZE, PLAYER_SIZE } from '../constants';
import { npcManager } from '../NPCManager';

interface NPCRendererProps {
    playerPos: Position;
    npcUpdateTrigger: number;
    characterScale?: number; // Map-level scale multiplier for all characters
}

/**
 * Renders NPCs with interaction prompts
 * Shows "[E] Talk to {name}" when player is in range
 */
const NPCRenderer: React.FC<NPCRendererProps> = ({ playerPos, npcUpdateTrigger, characterScale = 1.0 }) => {
    return (
        <>
            {npcManager.getCurrentMapNPCs().map((npc) => {
                // Calculate distance from player to NPC
                const dx = Math.abs(playerPos.x - npc.position.x);
                const dy = Math.abs(playerPos.y - npc.position.y);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if player is in interaction range
                const inRange = distance <= (npc.interactionRadius || 1.5);

                // NPC sprite scale (default 4.0x) * map characterScale
                const npcScale = (npc.scale || 4.0) * characterScale;

                // Determine if sprite should be flipped horizontally
                // - Left direction: always flip (walk sprites face right by default)
                // - Up/Down with 2-frame directional animation: flip on odd frames for walking effect
                let shouldFlip = npc.direction === Direction.Left;

                // Check for up/down directional sprite animation (flip on odd frames)
                if ((npc.direction === Direction.Up || npc.direction === Direction.Down) &&
                    npc.animatedStates?.states[npc.animatedStates.currentState]?.directionalSprites) {
                    const currentFrame = npc.animatedStates.currentFrame;
                    // Flip on odd frames to create 2-frame walking animation
                    shouldFlip = currentFrame % 2 === 1;
                }

                // Z-index based on Y position for proper depth sorting with foreground sprites
                // Use floor of Y position * 10 to match ForegroundSprites z-index calculation
                const zIndex = Math.floor(npc.position.y) * 10;

                return (
                    <React.Fragment key={npc.id}>
                        {/* NPC Sprite */}
                        <img
                            src={npc.sprite}
                            alt={npc.name}
                            className="absolute pointer-events-none"
                            style={{
                                left: (npc.position.x - (PLAYER_SIZE * npcScale) / 2) * TILE_SIZE,
                                top: (npc.position.y - (PLAYER_SIZE * npcScale) / 2) * TILE_SIZE,
                                width: PLAYER_SIZE * npcScale * TILE_SIZE,
                                height: PLAYER_SIZE * npcScale * TILE_SIZE,
                                imageRendering: 'pixelated',
                                transform: shouldFlip ? 'scaleX(-1)' : undefined,
                                zIndex,
                            }}
                        />

                        {/* Interaction Prompt (when in range) */}
                        {inRange && (
                            <div
                                className="absolute pointer-events-none"
                                style={{
                                    left: npc.position.x * TILE_SIZE,
                                    top: (npc.position.y - 1) * TILE_SIZE,
                                    transform: 'translateX(-50%)',
                                    zIndex: 1000,
                                }}
                            >
                                <div className="bg-blue-400 animate-pulse px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                                    [E] Talk to {npc.name}
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default NPCRenderer;
