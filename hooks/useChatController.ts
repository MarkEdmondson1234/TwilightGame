/**
 * ChatController — domain controller for player-to-player chat.
 *
 * Mirrors useMultiplayerController: it owns the room lifecycle so App.tsx only
 * has to wire it, and it never lets a chat failure reach the game loop. If
 * Firebase is missing, the player is signed out, or the map is private, this
 * hook quietly does nothing.
 *
 * Messages *do* go through React state, unlike remote player positions. A
 * message arrives a few times a minute at most and changes what is on screen,
 * which is exactly what React state is for.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MULTIPLAYER, MULTIPLAYER_ENABLED } from '../constants';
import { getChatService, getAuthService, whenFirebaseSettled } from '../firebase/safe';
import { sanitiseMessage } from '../multiplayer/chat';
import type { ChatMessage } from '../multiplayer/chat';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { setLocalChatBubble, clearLocalChatBubble } from '../multiplayer/localChat';
import { recordChatMessage } from '../multiplayer/chatHistory';
import type { Position } from '../types';

export interface UseChatControllerProps {
  /** Map the player is currently on */
  currentMapId: string;
  /** The local player's display name, for attribution */
  playerName: string;
  /**
   * Where we are standing. Read at message-arrival time, so it must be cheap
   * and must come from a ref rather than React state.
   */
  getLocalPosition: () => Position;
}

export interface UseChatControllerReturn {
  /** True when chat can actually be sent on this map */
  isChatActive: boolean;
  /** Send a message. Returns false when there was nothing to send. */
  sendMessage: (text: string) => Promise<boolean>;
}

/**
 * Could we hear this from where we are standing?
 *
 * Chat is proximity-based: a message carries no position of its own, so the
 * speaker's presence record — the same one that draws them on screen — is what
 * decides. Somebody who is not in the room at all cannot be heard, which also
 * neatly drops messages from players who have walked off the map.
 */
function canHear(message: ChatMessage, localPosition: Position): boolean {
  if (message.isLocal) return true;

  const speaker = remotePlayerManager
    .getRemotePlayers()
    .find((player) => player.uid === message.uid);
  if (!speaker) return false;

  const dx = speaker.position.x - localPosition.x;
  const dy = speaker.position.y - localPosition.y;
  return Math.hypot(dx, dy) <= MULTIPLAYER.CHAT_HEARING_RADIUS_TILES;
}

/** Chat runs exactly where presence does — the maps players are meant to share. */
function isSharedMap(mapId: string): boolean {
  return MULTIPLAYER.SHARED_MAPS.has(mapId);
}

export function useChatController(props: UseChatControllerProps): UseChatControllerReturn {
  const { currentMapId, playerName, getLocalPosition } = props;

  const [isChatActive, setIsChatActive] = useState(false);
  const [authTick, setAuthTick] = useState(0);

  // Read at send time, so a name change mid-session does not need a re-subscribe.
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  const getLocalPositionRef = useRef(getLocalPosition);
  getLocalPositionRef.current = getLocalPosition;

  // Inbound messages → React state.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let unsubscribeChat: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      // Subscribing before the module has settled would attach to the stub.
      const loaded = await whenFirebaseSettled();
      if (cancelled || !loaded) return;

      unsubscribeChat = getChatService().onMessage((message) => {
        if (!canHear(message, getLocalPositionRef.current())) return;

        // The bubble is the message. Our own goes above our own head; everyone
        // else's goes above theirs, via the presence record that already knows
        // where they are standing.
        if (message.isLocal) setLocalChatBubble(message.text);
        else remotePlayerManager.setChat(message.uid, message.text);

        // Only what was heard is remembered — the proximity rule would be worth
        // nothing if the transcript in Settings ignored it.
        recordChatMessage(message);
      });

      unsubscribeAuth = getAuthService().onAuthStateChange(() => {
        if (!cancelled) setAuthTick((tick) => tick + 1);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeChat?.();
      unsubscribeAuth?.();
    };
  }, []);

  // Room membership follows the current map.
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let cancelled = false;

    void (async () => {
      await whenFirebaseSettled();
      const chat = getChatService();

      // Bubbles are per-map: walking into the orchard should not still show
      // what somebody said in the village.
      clearLocalChatBubble();

      if (!isSharedMap(currentMapId) || !chat.isAvailable()) {
        await chat.leaveRoom();
        if (!cancelled) setIsChatActive(false);
        return;
      }

      const joined = await chat.enterRoom(currentMapId);
      if (!cancelled) setIsChatActive(joined);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentMapId, authTick]);

  // Leave cleanly on unmount rather than relying on the next room change.
  useEffect(() => {
    return () => {
      void getChatService().leaveRoom();
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!sanitiseMessage(text)) return false;
    // Fire through the service; our own message comes back via onChildAdded
    // like everyone else's, so there is one code path that puts text on screen.
    return getChatService().send(text, playerNameRef.current);
  }, []);

  return { isChatActive, sendMessage };
}
