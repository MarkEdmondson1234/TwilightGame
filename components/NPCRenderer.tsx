import React from 'react';
import { Position, Direction } from '../types';
import { TILE_SIZE, PLAYER_SIZE } from '../constants';
import { npcManager } from '../NPCManager';
import { TimeManager } from '../utils/TimeManager';
import { Z_PLAYER, Z_HUD } from '../zIndex';

interface NPCRendererProps {
  playerPos: Position;
  npcUpdateTrigger: number;
  characterScale?: number; // Map-level scale multiplier for all characters
  gridOffset?: Position; // Offset for background-image rooms with centered layers
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
const NPCRenderer: React.FC<NPCRendererProps> = ({
  playerPos,
  npcUpdateTrigger,
  characterScale = 1.0,
  gridOffset,
}) => {
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
          if (
            conditions.timeOfDay &&
            conditions.timeOfDay !== currentTime.timeOfDay.toLowerCase()
          ) {
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
        if (
          (npc.direction === Direction.Up || npc.direction === Direction.Down) &&
          npc.animatedStates?.states[npc.animatedStates.currentState]?.directionalSprites
        ) {
          const currentFrame = npc.animatedStates.currentFrame;
          shouldFlip = currentFrame % 2 === 1;
        }

        // Z-index for DOM rendering
        const zIndex = npc.zIndexOverride ?? Z_PLAYER + Math.floor(feetY);

        return (
          <React.Fragment key={npc.id}>
            {/* NPC Sprite - Rendered as DOM element
                            App.tsx controls when this component is shown:
                            - When PixiJS is disabled, OR
                            - In background-image rooms (where PixiJS NPCs are cleared)
                        */}
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

            {/* Interaction Prompt (when in range) - Cottage-core styled */}
            {inRange && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: npc.position.x * TILE_SIZE + offsetX,
                  top: (npc.position.y - 1) * TILE_SIZE + offsetY,
                  transform: 'translateX(-50%)',
                  zIndex: Z_HUD,
                }}
              >
                <div
                  className="animate-pulse px-3 py-1.5 rounded-lg text-xs shadow-lg"
                  style={{
                    backgroundColor: 'rgba(92, 74, 61, 0.95)',
                    border: '2px solid #8b7355',
                    color: '#f5efe8',
                    fontFamily: 'Georgia, serif',
                    fontWeight: 500,
                  }}
                >
                  {npc.dailyResource ? `🥛 ${npc.name}` : `💬 ${npc.name}`}
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
