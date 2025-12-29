import React from 'react';
import { Position, Direction } from '../types';
import { TILE_SIZE, PLAYER_SIZE, USE_PIXI_RENDERER } from '../constants';
import { npcManager } from '../NPCManager';
import { TimeManager } from '../utils/TimeManager';

interface NPCRendererProps {
    playerPos: Position;
    npcUpdateTrigger: number;
    characterScale?: number; // Map-level scale multiplier for all characters
    gridOffset?: Position;   // Offset for background-image rooms with centered layers
}

/**
 * Renders NPC interaction prompts (and sprites when not using PixiJS)
 *
 * When USE_PIXI_RENDERER is true:
 * - NPC sprites are rendered by NPCLayer in PixiJS for proper z-ordering
 * - This component only renders "[E] Talk to {name}" prompts as DOM overlays
 *
 * When USE_PIXI_RENDERER is false:
 * - This component renders both sprites and interaction prompts as DOM elements
 */
const NPCRenderer: React.FC<NPCRendererProps> = ({ playerPos, npcUpdateTrigger, characterScale = 1.0, gridOffset }) => {
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;
    return (
        <>
            {npcManager.getCurrentMapNPCs().map((npc) => {
                // Check visibility conditions (seasonal, time of day, weather)
                if (npc.visibilityConditions) {
                    const conditions = npc.visibilityConditions;
                    const currentTime = TimeManager.getCurrentTime();

                    // Check season condition
                    if (conditions.season && conditions.season !== currentTime.season.toLowerCase()) {
                        return null; // Hide NPC if season doesn't match
                    }

                    // Check time of day condition
                    if (conditions.timeOfDay && conditions.timeOfDay !== currentTime.timeOfDay.toLowerCase()) {
                        return null; // Hide NPC if time of day doesn't match
                    }

                    // Weather conditions can be added here in the future
                }

                // Calculate distance from player to NPC
                const dx = Math.abs(playerPos.x - npc.position.x);
                const dy = Math.abs(playerPos.y - npc.position.y);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if player is in interaction range
                const inRange = distance <= (npc.interactionRadius || 1.5);

                // NPC sprite scale (default 4.0x) * map characterScale
                const npcScale = (npc.scale || 4.0) * characterScale;

                // Calculate feet position for z-ordering (only used for DOM rendering)
                const feetOffset = 0.3;
                const feetY = npc.position.y + feetOffset;

                // Determine if sprite should be flipped horizontally (only for DOM rendering)
                let shouldFlip = false;
                if (!npc.noFlip) {
                    if (npc.reverseFlip) {
                        shouldFlip = npc.direction === Direction.Right;
                    } else {
                        shouldFlip = npc.direction === Direction.Left;
                    }
                }

                // Check for up/down directional sprite animation (flip on odd frames)
                if ((npc.direction === Direction.Up || npc.direction === Direction.Down) &&
                    npc.animatedStates?.states[npc.animatedStates.currentState]?.directionalSprites) {
                    const currentFrame = npc.animatedStates.currentFrame;
                    shouldFlip = currentFrame % 2 === 1;
                }

                // Z-index for DOM rendering
                const zIndex = npc.zIndexOverride ?? Math.floor(feetY) * 10;

                return (
                    <React.Fragment key={npc.id}>
                        {/* NPC Sprite - Only render as DOM when NOT using PixiJS */}
                        {!USE_PIXI_RENDERER && (
                            <img
                                src={npc.sprite}
                                alt={npc.name}
                                className="absolute pointer-events-none"
                                style={{
                                    left: (npc.position.x - (PLAYER_SIZE * npcScale) / 2) * TILE_SIZE + offsetX,
                                    top: (npc.position.y - (PLAYER_SIZE * npcScale) / 2) * TILE_SIZE + offsetY,
                                    width: PLAYER_SIZE * npcScale * TILE_SIZE,
                                    height: PLAYER_SIZE * npcScale * TILE_SIZE,
                                    imageRendering: 'pixelated',
                                    transform: shouldFlip ? 'scaleX(-1)' : undefined,
                                    zIndex,
                                }}
                            />
                        )}

                        {/* Interaction Prompt (when in range) - Always rendered as DOM */}
                        {inRange && (
                            <div
                                className="absolute pointer-events-none"
                                style={{
                                    left: npc.position.x * TILE_SIZE + offsetX,
                                    top: (npc.position.y - 1) * TILE_SIZE + offsetY,
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
