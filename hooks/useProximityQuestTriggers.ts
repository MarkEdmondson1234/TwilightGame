/**
 * useProximityQuestTriggers
 *
 * Monitors player proximity to NPCs and auto-opens dialogue for quest offers
 * when all trigger conditions are met.
 *
 * Currently handles:
 *   - Mr Fox's Picnic: auto-triggers when player is near Mr Fox in spring/summer
 *     while Spring Periwinkle is in town and the quest hasn't been started/declined.
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

/** IDs for the NPCs involved in the Mr Fox proximity trigger. */
const MR_FOX_NPC_ID = 'shopkeeper';
const SPRING_PERIWINKLE_NPC_ID = 'spring_periwinkle';

/** Proximity trigger fires when player is within this many tiles of Mr Fox. */
const MR_FOX_TRIGGER_RADIUS = 5;

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
  // Cooldown ref so the trigger fires at most once per close approach
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // Must be on the village map with no dialogue/cutscene active
    if (currentMapId !== 'village') {
      hasTriggeredRef.current = false;
      return;
    }
    if (activeNPC || isCutscenePlaying) return;

    // Quest must not already be started or permanently declined
    if (eventChainManager.isChainStarted(MFP_QUEST_ID)) return;
    if (hasDeclinedPicnicOffer()) return;

    // Only in spring or summer
    const season = TimeManager.getCurrentTime().season;
    if (season !== Season.SPRING && season !== Season.SUMMER) return;

    // Spring Periwinkle must be visible in the village
    const periwinkle = npcManager.getNPCById(SPRING_PERIWINKLE_NPC_ID);
    if (!periwinkle || !npcManager.isNPCVisible(periwinkle)) return;

    // Player must be within trigger radius of Mr Fox
    const mrFox = npcManager.getNPCById(MR_FOX_NPC_ID);
    if (!mrFox) return;
    const distance = getTileDistance(playerPosition, mrFox.position);
    if (distance > MR_FOX_TRIGGER_RADIUS) {
      // Reset cooldown when player moves away so re-entry can re-trigger
      hasTriggeredRef.current = false;
      return;
    }

    // Don't fire again until player moves away and back
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    // Set the pending flag so dialogueHandlers redirects greeting → mfp_offer
    setProximityOfferPending();
    setActiveNPC(MR_FOX_NPC_ID);
  }, [playerPosition, currentMapId, activeNPC, isCutscenePlaying, setActiveNPC]);
}
