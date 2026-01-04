import React from 'react';
import { NPC, Position } from '../types';
import { TILE_SIZE } from '../constants';

interface NPCInteractionIndicatorsProps {
  npcs: NPC[];
  playerPos: Position;
  gridOffset?: Position; // Offset for background-image rooms with centered layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
}

// NPCs that should show the interaction indicator (special UI interactions)
const NPCS_WITH_INDICATORS = ['shop_counter_fox'];

/**
 * Visual indicators for NPC interactions
 * Only shows for NPCs with special UI actions (like shop counter)
 * Regular dialogue NPCs don't need indicators
 */
const NPCInteractionIndicators: React.FC<NPCInteractionIndicatorsProps> = ({
  npcs,
  playerPos,
  gridOffset,
  tileSize = TILE_SIZE,
}) => {
  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;

  return (
    <>
      {npcs
        .filter((npc) => NPCS_WITH_INDICATORS.includes(npc.id))
        .map((npc) => {
          // Calculate distance to NPC
          const dx = Math.abs(playerPos.x - npc.position.x);
          const dy = Math.abs(playerPos.y - npc.position.y);
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Use NPC's interaction radius or default to 1.5
          const interactionRadius = npc.interactionRadius ?? 1.5;

          // Show indicator when within interaction range (or slightly outside for preview)
          const isInRange = distance <= interactionRadius;
          const isNearby = distance <= interactionRadius + 1.5;

          // Only show indicator when player is nearby
          if (!isNearby) return null;

          // Get NPC visual size (scale affects how large the indicator should be)
          const npcScale = npc.scale ?? 4.0;
          const indicatorSize = tileSize * Math.min(npcScale / 2, 2);

          return (
            <React.Fragment key={`npc-indicator-${npc.id}`}>
              {/* Visual marker around the NPC */}
              <div
                className={`absolute pointer-events-none rounded-lg border-4 ${
                  isInRange
                    ? 'border-green-400 bg-green-400/20 animate-pulse'
                    : 'border-yellow-400/50 bg-yellow-400/10'
                }`}
                style={{
                  left: npc.position.x * tileSize + offsetX - indicatorSize / 4 + tileSize,
                  top: npc.position.y * tileSize + offsetY - indicatorSize / 2,
                  width: indicatorSize,
                  height: indicatorSize,
                  zIndex: 500, // Above foreground layers (65) but below UI (1000)
                }}
              />
              {/* Label above the NPC */}
              {isInRange && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: npc.position.x * tileSize + offsetX + tileSize / 2 + tileSize,
                    top: npc.position.y * tileSize + offsetY - indicatorSize / 2 - 20,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 500,
                  }}
                >
                  <div className="bg-green-400 animate-pulse px-3 py-1 rounded-full text-xs font-bold text-black whitespace-nowrap shadow-lg">
                    [E] {npc.name || 'Talk'}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
    </>
  );
};

export default NPCInteractionIndicators;
