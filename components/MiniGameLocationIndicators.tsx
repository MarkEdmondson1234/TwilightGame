import React from 'react';
import { Position } from '../types';
import { TILE_SIZE } from '../constants';
import { Z_ACTION_PROMPTS } from '../zIndex';
import { COTTAGE_COLOURS, COTTAGE_FONTS } from '../utils/transitionIcons';
import { useTouchDevice } from '../hooks/useTouchDevice';
import { getMiniGameLocationsForMap } from '../minigames/registry';
import { miniGameManager } from '../minigames/MiniGameManager';
import GameIcon from './GameIcon';

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

  return (
    <>
      {currentMapId === 'mums_kitchen' && (
        <div
          className="absolute pointer-events-none"
          role="img"
          aria-label="Kitchen easel with a blank canvas"
          style={{
            left: 10.5 * tileSize + offsetX,
            top: 6 * tileSize + offsetY,
            width: tileSize * 2.4,
            height: tileSize * 2.4,
            transform: 'translate(-50%, -100%)',
            zIndex: 99,
          }}
        >
          <img
            src="/TwilightGame/assets-optimized/items/mushras_shop/easel.png"
            alt="Kitchen easel"
            draggable={false}
            style={{ width: '100%', height: '100%' }}
          />
          <img
            src="/TwilightGame/assets-optimized/items/quest/picnic_basket.png"
            alt="Mushra's flower basket"
            draggable={false}
            style={{ position: 'absolute', left: '4%', bottom: 0, width: '35%' }}
          />
          <img
            src="/TwilightGame/assets-optimized/herbs/lavender_bunch.png"
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: '10%',
              bottom: '8%',
              width: '23%',
              transform: 'rotate(-20deg)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '35%',
              top: '21%',
              width: '31%',
              height: '34%',
              background: '#fff8df',
              border: '2px solid #c4a47b',
              boxShadow: '1px 2px 2px #46322166',
            }}
          />
        </div>
      )}
      {locations.map(({ def, x, y }) => {
        // Draw and Craft share one physical easel and one visual signpost.
        if (
          currentMapId === 'mums_kitchen' &&
          (def.id === 'decoration-crafting' || def.id === 'wreath-making')
        )
          return null;
        // Don't advertise a mini-game the player couldn't actually start
        // right now (season/time/friendship/item requirements not met).
        if (!miniGameManager.checkRequirements(def.id).canPlay) return null;

        const dx = Math.abs(playerPos.x - x);
        const dy = Math.abs(playerPos.y - y);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > ICON_VISIBLE_DISTANCE) return null;

        const isVeryClose = distance <= TOOLTIP_DISTANCE;

        const screenX = (x + 0.5) * tileSize + offsetX;
        const screenY = y * tileSize + offsetY;

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
