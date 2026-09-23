import React, { useEffect, useState } from 'react';
import { Position } from '../types';
import { TILE_SIZE } from '../constants';
import { Z_ACTION_PROMPTS } from '../zIndex';
import { COTTAGE_COLOURS, COTTAGE_FONTS } from '../utils/transitionIcons';
import { useTouchDevice } from '../hooks/useTouchDevice';
import { getMiniGameLocationsForMap } from '../minigames/registry';
import { miniGameManager } from '../minigames/MiniGameManager';
import GameIcon from './GameIcon';
import { cookingManager } from '../utils/CookingManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import { MUMS_KITCHEN_FIREPLACE } from '../utils/kitchenFireplace';
import { mapManager } from '../maps/MapManager';
import { roomPropTopAt } from '../utils/roomProps';

interface MiniGameLocationIndicatorsProps {
  currentMapId: string;
  playerPos: Position;
  gridOffset?: Position; // Offset for background-image rooms with centered layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
}

// Distance thresholds — matches TransitionIndicators
const ICON_VISIBLE_DISTANCE = 3.5;
const TOOLTIP_DISTANCE = 1.5;

/**
 * Floating icon that bobs gently above a mini-game entrance tile.
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
 * Parchment-style tooltip showing the mini-game name and [E] key hint.
 */
const ParchmentTooltip: React.FC<{
  icon: string;
  label: string;
  screenX: number;
  screenY: number;
  showKeyHint: boolean;
}> = ({ icon, label, screenX, screenY, showKeyHint }) => (
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
        background: `linear-gradient(135deg, ${COTTAGE_COLOURS.parchmentLight} 0%, ${COTTAGE_COLOURS.parchmentDark} 100%)`,
        border: `3px solid ${COTTAGE_COLOURS.warmBrownBorder}`,
        borderRadius: 12,
        padding: '10px 16px',
        fontFamily: COTTAGE_FONTS.body,
        fontSize: 14,
        fontWeight: 500,
        color: COTTAGE_COLOURS.darkBrownText,
        boxShadow: `
          0 4px 12px rgba(92, 74, 61, 0.4),
          inset 0 1px 0 rgba(255,255,255,0.3),
          inset 0 -1px 0 rgba(0,0,0,0.05)
        `,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
      }}
    >
      <GameIcon icon={icon} size={18} />
      <span>{label}</span>
      {showKeyHint && (
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
      )}
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
 * While the first tea lesson is pending, a glowing kettle marks the fireplace
 * in Mum's kitchen — the room is one background painting, so nothing else tells
 * a new player that the fire is somewhere they can cook. Unlike the mini-game
 * icons it is shown from anywhere in the room, and it pulses throughout.
 */
export const TeaLessonFireplaceIndicator: React.FC<{
  playerPos: Position;
  tileSize: number;
  offsetX: number;
  offsetY: number;
  showKeyHint: boolean;
}> = ({ playerPos, tileSize, offsetX, offsetY, showKeyHint }) => {
  const [pending, setPending] = useState(() => cookingManager.isTeaLessonPending());
  useEffect(() => {
    const refresh = () => setPending(cookingManager.isTeaLessonPending());
    const offMilestone = eventBus.on(GameEvent.PLAYER_MILESTONE, refresh);
    const offBook = eventBus.on(GameEvent.RECIPE_BOOK_UNLOCKED, refresh);
    return () => {
      offMilestone();
      offBook();
    };
  }, []);
  if (!pending) return null;

  const { x, y } = MUMS_KITCHEN_FIREPLACE;
  const screenX = (x + 0.5) * tileSize + offsetX;
  const screenY = y * tileSize + offsetY;
  const isClose = Math.hypot(playerPos.x - x, playerPos.y - y) <= TOOLTIP_DISTANCE + 1;

  return (
    <>
      <FloatingIcon icon="☕" colour="#92400e" screenX={screenX} screenY={screenY} isClose />
      {isClose && (
        <ParchmentTooltip
          icon="☕"
          label="Make your tea here"
          screenX={screenX}
          screenY={screenY}
          showKeyHint={showKeyHint}
        />
      )}
    </>
  );
};

/**
 * Visual indicators for mini-games triggered by clicking a map location
 * (e.g. the Wizard Trials door) — the same bobbing icon + tooltip affordance
 * TransitionIndicators shows for real map transitions, since these don't
 * appear in currentMap.transitions and would otherwise look unclickable.
 */
const MiniGameLocationIndicators: React.FC<MiniGameLocationIndicatorsProps> = ({
  currentMapId,
  playerPos,
  gridOffset,
  tileSize = TILE_SIZE,
}) => {
  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;
  const isTouchDevice = useTouchDevice();

  const locations = getMiniGameLocationsForMap(currentMapId);
  const map = mapManager.getMap(currentMapId);

  return (
    <>
      {currentMapId === 'mums_kitchen' && (
        <TeaLessonFireplaceIndicator
          playerPos={playerPos}
          tileSize={tileSize}
          offsetX={offsetX}
          offsetY={offsetY}
          showKeyHint={!isTouchDevice}
        />
      )}
      {locations.map(({ def, x, y }) => {
        // Draw and Craft share one physical easel and one visual signpost. The
        // easel itself is a room prop (mumsKitchen.ts) drawn by PixiJS so it
        // depth-sorts with the player; this component only draws the prompts,
        // which float above everything by design.
        if (currentMapId === 'mums_kitchen' && def.id === 'decoration-crafting') return null;
        // Don't advertise a mini-game the player couldn't actually start
        // right now (season/time/friendship/item requirements not met).
        if (!miniGameManager.checkRequirements(def.id).canPlay) return null;

        const dx = Math.abs(playerPos.x - x);
        const dy = Math.abs(playerPos.y - y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > ICON_VISIBLE_DISTANCE) return null;

        const isVeryClose = distance <= TOOLTIP_DISTANCE;

        const screenX = (x + 0.5) * tileSize + offsetX;
        // Float above the scenery on this tile (the easel), not across it
        const topY = Math.min(y, roomPropTopAt(map, x, y) ?? y);
        const screenY = topY * tileSize + offsetY;

        return (
          <React.Fragment key={`minigame-location-${def.id}-${x}-${y}`}>
            <FloatingIcon
              icon={def.icon}
              colour={def.colour}
              screenX={screenX}
              screenY={screenY}
              isClose={isVeryClose}
            />
            {isVeryClose && (
              <ParchmentTooltip
                icon={def.icon}
                label={def.displayName}
                screenX={screenX}
                screenY={screenY}
                showKeyHint={!isTouchDevice}
              />
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

export default React.memo(MiniGameLocationIndicators, (prev, next) => {
  if (prev.currentMapId !== next.currentMapId) return false;
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
