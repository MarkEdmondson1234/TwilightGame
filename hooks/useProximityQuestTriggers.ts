/**
 * useProximityQuestTriggers
 *
 * Monitors player proximity to NPCs and auto-opens dialogue for quest offers
 * when all trigger conditions are met.
 *
 * Currently handles:
 *   - Mr Fox's Picnic: auto-triggers when player is near Mr Fox in spring/summer
 *     while Spring Periwinkle is in town and the quest hasn't been started/declined.
 *   - Ghost Queen: auto-triggers when player enters house1 before the quest starts.
 */

import { useEffect, useRef } from 'react';
import { Position } from '../types';
import { npcManager } from '../NPCManager';
import { eventChainManager } from '../utils/EventChainManager';
import { TimeManager, Season } from '../utils/TimeManager';
import { getTileDistance } from '../utils/mapUtils';
import {
  QUEST_ID as MFP_QUEST_ID,
  hasDeclinedPicnicOffer,
  setProximityOfferPending,
} from '../data/questHandlers/mrFoxPicnicHandler';
import {
  GHOST_QUEEN_QUEST_ID,
  setGhostOfferPending,
} from '../data/questHandlers/ghostQueenHandler';

/** IDs for the NPCs involved in the Mr Fox proximity trigger. */
const MR_FOX_NPC_ID = 'shopkeeper';
const SPRING_PERIWINKLE_NPC_ID = 'spring_periwinkle';

/** Proximity trigger fires when player is within this many tiles of Mr Fox. */
const MR_FOX_TRIGGER_RADIUS = 5;

/** Ghost trigger fires when player is anywhere in house1 (small room). */
const GHOST_QUEEN_NPC_ID = 'ghost_queen';
const GHOST_TRIGGER_RADIUS = 15;

interface ProximityQuestTriggersConfig {
  playerPosition: Position;
  currentMapId: string;
  activeNPC: string | null;
  isCutscenePlaying: boolean;
  setActiveNPC: (id: string) => void;
}

/**
 * Hook that fires side-effect proximity quest triggers.
 * Call once in App.tsx; no return value needed.
 */
export function useProximityQuestTriggers({
  playerPosition,
  currentMapId,
  activeNPC,
  isCutscenePlaying,
  setActiveNPC,
}: ProximityQuestTriggersConfig): void {
  // Cooldown refs so each trigger fires at most once per close approach
  const hasTriggeredRef = useRef(false);
  const ghostTriggeredRef = useRef(false);

  useEffect(() => {
    // ── Mr Fox's Picnic ──────────────────────────────────────────────────────
    // Must be on the village map with no dialogue/cutscene active
    if (currentMapId === 'village') {
      if (!activeNPC && !isCutscenePlaying) {
        // Quest must not already be started or permanently declined
        if (!eventChainManager.isChainStarted(MFP_QUEST_ID) && !hasDeclinedPicnicOffer()) {
          // Only in spring or summer
          const season = TimeManager.getCurrentTime().season;
          if (season === Season.SPRING || season === Season.SUMMER) {
            // Spring Periwinkle must be visible in the village
            const periwinkle = npcManager.getNPCById(SPRING_PERIWINKLE_NPC_ID);
            if (periwinkle && npcManager.isNPCVisible(periwinkle)) {
              // Player must be within trigger radius of Mr Fox
              const mrFox = npcManager.getNPCById(MR_FOX_NPC_ID);
              if (mrFox) {
                const distance = getTileDistance(playerPosition, mrFox.position);
                if (distance > MR_FOX_TRIGGER_RADIUS) {
                  hasTriggeredRef.current = false;
                } else if (!hasTriggeredRef.current) {
                  hasTriggeredRef.current = true;
                  setProximityOfferPending();
                  setActiveNPC(MR_FOX_NPC_ID);
                }
              }
            }
          }
        }
      }
    } else {
      hasTriggeredRef.current = false;
    }

    // ── Ghost Queen ──────────────────────────────────────────────────────────
    // Fires when player enters house1, before quest is started.
    if (currentMapId === 'house1') {
      if (!activeNPC && !isCutscenePlaying && !eventChainManager.isChainStarted(GHOST_QUEEN_QUEST_ID)) {
        const ghost = npcManager.getNPCById(GHOST_QUEEN_NPC_ID);
        if (ghost && getTileDistance(playerPosition, ghost.position) <= GHOST_TRIGGER_RADIUS) {
          if (!ghostTriggeredRef.current) {
            ghostTriggeredRef.current = true;
            setGhostOfferPending();
            setActiveNPC(GHOST_QUEEN_NPC_ID);
          }
        } else {
          ghostTriggeredRef.current = false;
        }
      }
    } else if (currentMapId !== 'house1') {
      ghostTriggeredRef.current = false;
    }
  }, [playerPosition, currentMapId, activeNPC, isCutscenePlaying, setActiveNPC]);
}
