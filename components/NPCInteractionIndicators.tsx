import React from 'react';
import { NPC, Position } from '../types';
import { TILE_SIZE } from '../constants';
import { Z_ACTION_PROMPTS } from '../zIndex';
import { getNPCIcon, COTTAGE_COLOURS, COTTAGE_FONTS } from '../utils/transitionIcons';

interface NPCInteractionIndicatorsProps {
  npcs: NPC[];
  playerPos: Position;
  gridOffset?: Position; // Offset for background-image rooms with centered layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
}

// NPCs that should show the interaction indicator (special UI interactions)
const NPCS_WITH_INDICATORS = ['shop_counter_fox'];

// Distance thresholds
const ICON_VISIBLE_DISTANCE = 3.0; // Icon visible from further away
const TOOLTIP_DISTANCE = 1.5; // Tooltip only when very close

/**
 * Floating icon that bobs gently above an NPC
 */
const FloatingIcon: React.FC<{
  icon: string;
  screenX: number;
  screenY: number;
  isClose: boolean;
}> = ({ icon, screenX, screenY, isClose }) => (
  <div
    className="absolute pointer-events-none animate-float-gentle"
    style={{
      left: screenX,
      top: screenY,
      transform: 'translateX(-50%)',
      zIndex: Z_ACTION_PROMPTS,
    }}
  >
    <div
      className={isClose ? 'animate-pulse-glow' : ''}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: COTTAGE_COLOURS.warmBrown,
        border: `2px solid ${COTTAGE_COLOURS.warmBrownBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        boxShadow: '0 4px 12px rgba(92, 74, 61, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}
    >
      {icon}
    </div>
  </div>
);

/**
 * Parchment-style tooltip showing NPC name and [E] key hint
 */
const ParchmentTooltip: React.FC<{
  icon: string;
  label: string;
  screenX: number;
  screenY: number;
}> = ({ icon, label, screenX, screenY }) => (
  <div
    className="absolute pointer-events-none animate-tooltip-appear"
    style={{
      left: screenX,
      top: screenY - 50,
      transform: 'translate(-50%, -100%)',
      zIndex: Z_ACTION_PROMPTS + 1,
    }}
  >
    <div
      style={{
        // Parchment background with subtle gradient
        background: `linear-gradient(135deg, ${COTTAGE_COLOURS.parchmentLight} 0%, ${COTTAGE_COLOURS.parchmentDark} 100%)`,
        // Wooden border effect
        border: `3px solid ${COTTAGE_COLOURS.warmBrownBorder}`,
        borderRadius: 12,
        padding: '10px 16px',
        // Text styling
        fontFamily: COTTAGE_FONTS.body,
        fontSize: 14,
        fontWeight: 500,
        color: COTTAGE_COLOURS.darkBrownText,
        // Shadow for depth
        boxShadow: `
          0 4px 12px rgba(92, 74, 61, 0.4),
          inset 0 1px 0 rgba(255,255,255,0.3),
          inset 0 -1px 0 rgba(0,0,0,0.05)
        `,
        // Layout
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{label}</span>
      <span
        style={{
          marginLeft: 4,
          padding: '2px 8px',
          backgroundColor: COTTAGE_COLOURS.sageGreen,
          color: COTTAGE_COLOURS.creamText,
          borderRadius: 4,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.5px',
        }}
      >
        E
      </span>
    </div>
    {/* Triangle pointer */}
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: -8,
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        borderTop: `8px solid ${COTTAGE_COLOURS.warmBrownBorder}`,
      }}
    />
  </div>
);

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

          // Use NPC's interaction radius or default
          const interactionRadius = npc.interactionRadius ?? 1.5;

          // Check visibility thresholds
          const isInRange = distance <= interactionRadius;
          const isNearby = distance <= ICON_VISIBLE_DISTANCE;

          // Only show indicator when player is nearby
          if (!isNearby) return null;

          // Get NPC visual size for positioning
          const npcScale = npc.scale ?? 4.0;

          // Get themed icon
          const icon = getNPCIcon(npc);
          const label = npc.name || 'Talk';

          // Calculate screen position (above NPC)
          const screenX = (npc.position.x + 1) * tileSize + offsetX;
          const screenY = npc.position.y * tileSize + offsetY - npcScale * 8;

          return (
            <React.Fragment key={`npc-indicator-${npc.id}`}>
              {/* Floating icon above the NPC */}
              <FloatingIcon icon={icon} screenX={screenX} screenY={screenY} isClose={isInRange} />

              {/* Parchment tooltip when in interaction range */}
              {isInRange && (
                <ParchmentTooltip icon={icon} label={label} screenX={screenX} screenY={screenY} />
              )}
            </React.Fragment>
          );
        })}
    </>
  );
};

export default NPCInteractionIndicators;
