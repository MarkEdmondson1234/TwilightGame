import React from 'react';
import { MapDefinition, Position, Transition } from '../types';
import { TILE_SIZE } from '../constants';
import { Z_ACTION_PROMPTS } from '../zIndex';
import { getTransitionIcon, COTTAGE_COLOURS, COTTAGE_FONTS } from '../utils/transitionIcons';
import GameIcon from './GameIcon';

interface TransitionIndicatorsProps {
  currentMap: MapDefinition;
  playerPos: Position;
  lastTransitionTime: number;
  gridOffset?: Position; // Offset for background-image rooms with centered layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
}

// Distance thresholds
const ICON_VISIBLE_DISTANCE = 3.5; // Icon visible from further away
const TOOLTIP_DISTANCE = 1.5; // Tooltip only when very close

/**
 * Floating icon that bobs gently above a transition tile
 */
const FloatingIcon: React.FC<{
  icon: string;
  colour: string;
  screenX: number;
  screenY: number;
  isClose: boolean;
}> = ({ icon, colour, screenX, screenY, isClose }) => (
  <div
    className="absolute pointer-events-none animate-float-gentle"
    style={{
      left: screenX,
      top: screenY - 20,
      zIndex: Z_ACTION_PROMPTS,
    }}
  >
    <div
      className={isClose ? 'animate-pulse-glow' : ''}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: colour,
        border: `2px solid ${COTTAGE_COLOURS.warmBrownBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(92, 74, 61, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}
    >
      <GameIcon icon={icon} size={18} />
    </div>
  </div>
);

/**
 * Parchment-style tooltip showing destination name and [E] key hint
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
      top: screenY - 65,
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
      <GameIcon icon={icon} size={18} />
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
 * Gets the display label for a transition
 */
function getTransitionLabel(transition: Transition): string {
  // Use explicit label if provided
  if (transition.label) {
    return transition.label;
  }

  // Format the map ID nicely
  const mapId = transition.toMapId;

  // Handle random maps
  if (mapId.startsWith('RANDOM_')) {
    const type = mapId.replace('RANDOM_', '').toLowerCase();
    return `Explore ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }

  // Convert snake_case to Title Case
  return mapId.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Visual indicators for map transitions
 * Shows cottage-core styled floating icons and parchment tooltips when player is nearby
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
        // Calculate distance to transition
        const dx = Math.abs(playerPos.x - transition.fromPosition.x);
        const dy = Math.abs(playerPos.y - transition.fromPosition.y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only show when player is within icon visible distance
        if (distance > ICON_VISIBLE_DISTANCE) return null;

        const isVeryClose = distance <= TOOLTIP_DISTANCE;

        // Get themed icon and colour
        const { icon, colour } = getTransitionIcon(transition);
        const label = getTransitionLabel(transition);

        // Calculate screen position (centre of tile)
        const screenX = (transition.fromPosition.x + 0.5) * tileSize + offsetX;
        const screenY = transition.fromPosition.y * tileSize + offsetY;

        return (
          <React.Fragment key={`transition-${idx}`}>
            {/* Floating icon above the tile */}
            <FloatingIcon
              icon={icon}
              colour={colour}
              screenX={screenX}
              screenY={screenY}
              isClose={isVeryClose}
            />

            {/* Parchment tooltip when very close */}
            {isVeryClose && (
              <ParchmentTooltip icon={icon} label={label} screenX={screenX} screenY={screenY} />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

// Skip re-render when player has moved less than 0.5 tiles —
// indicator visibility only changes at interaction radii of 1.5+ tiles
const POS_THRESHOLD = 0.5;

export default React.memo(TransitionIndicators, (prev, next) => {
  if (prev.currentMap !== next.currentMap) return false;
  if (prev.lastTransitionTime !== next.lastTransitionTime) return false;
  if (prev.tileSize !== next.tileSize) return false;
  if (prev.gridOffset !== next.gridOffset) return false;
  if (
    Math.abs(prev.playerPos.x - next.playerPos.x) >= POS_THRESHOLD ||
    Math.abs(prev.playerPos.y - next.playerPos.y) >= POS_THRESHOLD
  ) {
    return false;
  }
  return true;
});
