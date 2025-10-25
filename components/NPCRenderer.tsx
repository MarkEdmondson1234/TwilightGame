import React from 'react';
import { Position } from '../types';
import { TILE_SIZE, PLAYER_SIZE } from '../constants';
import { npcManager } from '../NPCManager';

interface NPCRendererProps {
    playerPos: Position;
    npcUpdateTrigger: number;
}

/**
 * Renders NPCs with interaction prompts
 * Shows "[E] Talk to {name}" when player is in range
 */
const NPCRenderer: React.FC<NPCRendererProps> = ({ playerPos, npcUpdateTrigger }) => {
    return (
        <>
            {npcManager.getCurrentMapNPCs().map((npc) => {
                // Calculate distance from player to NPC
                const dx = Math.abs(playerPos.x - npc.position.x);
                const dy = Math.abs(playerPos.y - npc.position.y);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if player is in interaction range
                const inRange = distance <= (npc.interactionRadius || 1.5);

                // NPC sprite scale (default 4.0x)
                const npcScale = npc.scale || 4.0;

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
