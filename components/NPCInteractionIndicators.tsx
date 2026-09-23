import React, { useMemo } from 'react';
import { useQuestGuideRefresh } from '../hooks/useQuestGuideRefresh';
import { readQuestConversations } from '../utils/readQuestNextSteps';
import { npcManager } from '../NPCManager';
import QuestConversationCue from './QuestConversationCue';
import { NPC, Position } from '../types';
import { TILE_SIZE } from '../constants';
import { Z_ACTION_PROMPTS } from '../zIndex';
import { getNPCIcon, COTTAGE_COLOURS, COTTAGE_FONTS } from '../utils/transitionIcons';
import { useTouchDevice } from '../hooks/useTouchDevice';
import GameIcon from './GameIcon';

interface NPCInteractionIndicatorsProps {
  npcs: NPC[];
  blocked?: boolean;
  onTalk?: (npcId: string) => void;
  playerPos: Position;
  gridOffset?: Position; // Offset for background-image rooms with centered layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
}

// NPCs that should show the interaction indicator (special UI interactions)
const NPCS_WITH_INDICATORS = ['shop_counter_fox'];

// Distance thresholds
const ICON_VISIBLE_DISTANCE = 3.0; // Icon visible from further away

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
        boxShadow: '0 4px 12px rgba(92, 74, 61, 0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}
    >
      <GameIcon icon={icon} size={18} />
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
  showKeyHint: boolean;
}> = ({ icon, label, screenX, screenY, showKeyHint }) => (
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
 * Visual indicators for NPC interactions
 * Shows shop affordances and useful conversations for supported personal quests.
 */
const NPCInteractionIndicators: React.FC<NPCInteractionIndicatorsProps> = ({
  npcs,
  blocked = false,
  onTalk,
  playerPos,
  gridOffset,
  tileSize = TILE_SIZE,
}) => {
  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;
  const isTouchDevice = useTouchDevice();
  const revision = useQuestGuideRefresh();
  const conversations = useMemo(
    () => (blocked ? new Map() : readQuestConversations()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates manager reads
    [blocked, revision]
  );
  if (blocked) return null;

  return (
    <>
      {npcs
        .filter(
          (npc) =>
            npcManager.isNPCVisible(npc) &&
            (NPCS_WITH_INDICATORS.includes(npc.id) || (onTalk && conversations.has(npc.id)))
        )
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

          const cue = conversations.get(npc.id);
          if (cue && onTalk)
            return (
              <QuestConversationCue
                key={`quest-cue-${npc.id}`}
                cue={cue}
                screenX={screenX}
                screenY={screenY - 8}
                inRange={isInRange}
                onTalk={() => onTalk(npc.id)}
                compact={isTouchDevice}
                npcName={label}
                icon={icon}
              />
            );

          return (
            <React.Fragment key={`npc-indicator-${npc.id}`}>
              {/* Floating icon above the NPC */}
              <FloatingIcon icon={icon} screenX={screenX} screenY={screenY} isClose={isInRange} />

              {/* Parchment tooltip when in interaction range */}
              {isInRange && (
                <ParchmentTooltip
                  icon={icon}
                  label={label}
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

// Position updates keep the talk button's range exact; quest reads are memoised separately.
export default React.memo(NPCInteractionIndicators, (prev, next) => {
  return (
    prev.npcs === next.npcs &&
    prev.blocked === next.blocked &&
    prev.onTalk === next.onTalk &&
    prev.tileSize === next.tileSize &&
    prev.gridOffset === next.gridOffset &&
    prev.playerPos.x === next.playerPos.x &&
    prev.playerPos.y === next.playerPos.y
  );
});
