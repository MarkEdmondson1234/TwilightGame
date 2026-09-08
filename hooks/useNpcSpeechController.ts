/**
 * NpcSpeechController — what the NPCs are saying, shared.
 *
 * Talking to an NPC used to be entirely private: the other player saw you
 * standing still in front of Mushra with no idea what it was about. Now a
 * snippet floats above the NPC's head for anyone near enough, so a conversation
 * is something you can notice and wander over to join.
 *
 * Mirrors useChatController: room per map, proximity-gated, and quietly inert
 * when Firebase is missing or the map is private.
 */

import { useEffect, useState } from 'react';
import { MULTIPLAYER, MULTIPLAYER_ENABLED } from '../constants';
import { isSharedMap } from '../multiplayer/sharedMaps';
import { eventBus, GameEvent } from '../utils/EventBus';
import { getNpcSpeechService, getAuthService, whenFirebaseSettled } from '../firebase/safe';
import { npcSpeechManager } from '../multiplayer/npcSpeech';
import { npcManager } from '../NPCManager';
import type { Position } from '../types';

export interface UseNpcSpeechControllerProps {
  /** Map the player is currently on */
  currentMapId: string;
  /** Where we are standing, read from a ref at the moment a line arrives */
  getLocalPosition: () => Position;
}

export function useNpcSpeechController(props: UseNpcSpeechControllerProps): void {
  const { currentMapId, getLocalPosition } = props;

  /**
   * Bumped on every auth state change, exactly as presence does.
   *
   * Without it the room join below runs once per map change, and Firebase
   * restores the signed-in session *after* the game has loaded its first map —
   * so a player who resumes standing in the village found `isAvailable()` false,
   * left the room, and never retried. NPC conversations then stayed invisible
   * for the whole session unless they happened to walk out of the village and
   * back in. Presence carried its own retry and worked, which is what made this
   * look like "NPC speech is broken" rather than "the room was never joined".
   */
  const [authTick, setAuthTick] = useState(0);

  // Outbound: publish what an NPC says to us.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    return eventBus.on(GameEvent.NPC_SPOKE, ({ npcId, text }) => {
      if (!isSharedMap(currentMapId)) return;
      void getNpcSpeechService().publish(npcId, text);
    });
  }, [currentMapId]);

  // Inbound: show it above the NPC, if we are close enough to be listening in.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let unsubscribe: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      const loaded = await whenFirebaseSettled();
      if (cancelled || !loaded) return;

      unsubscribe = getNpcSpeechService().onSpeech((npcId, wire) => {
        // Same rule as player chat: you hear what is being said near you. The
        // NPC's own position is what counts — they are the one talking, and the
        // player they are talking to may be standing anywhere around them.
        const npc = npcManager.getNPCById(npcId);
        if (!npc) return;

        const here = getLocalPosition();
        const distance = Math.hypot(npc.position.x - here.x, npc.position.y - here.y);
        if (distance > MULTIPLAYER.CHAT_HEARING_RADIUS_TILES) return;

        npcSpeechManager.apply(npcId, wire);
      });

      // Re-drive the join effect below whenever sign-in state changes.
      unsubscribeAuth = getAuthService().onAuthStateChange(() => {
        if (!cancelled) setAuthTick((tick) => tick + 1);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      unsubscribeAuth?.();
    };
    // getLocalPosition is a stable arrow reading a ref; re-subscribing on every
    // step would drop lines mid-conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Room membership follows the current map.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let cancelled = false;

    void (async () => {
      await whenFirebaseSettled();
      const service = getNpcSpeechService();

      // Conversations do not carry between maps.
      npcSpeechManager.setMap(isSharedMap(currentMapId) ? currentMapId : null);

      if (!isSharedMap(currentMapId) || !service.isAvailable()) {
        await service.leaveRoom();
        return;
      }

      if (!cancelled) await service.enterRoom(currentMapId);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentMapId, authTick]);

  // Leave cleanly on unmount rather than waiting for the next map change.
  useEffect(() => {
    return () => {
      npcSpeechManager.clear();
      void getNpcSpeechService().leaveRoom();
    };
  }, []);
}
