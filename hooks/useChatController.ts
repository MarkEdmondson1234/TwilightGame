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
import { CHAT_HISTORY_LIMIT, sanitiseMessage } from '../multiplayer/chat';
import type { ChatMessage } from '../multiplayer/chat';

export interface UseChatControllerProps {
  /** Map the player is currently on */
  currentMapId: string;
  /** The local player's display name, for attribution */
  playerName: string;
}

export interface UseChatControllerReturn {
  /** True when chat can actually be sent on this map */
  isChatActive: boolean;
  /** Recent messages, oldest first */
  messages: ChatMessage[];
  /** Send a message. Returns false when there was nothing to send. */
  sendMessage: (text: string) => Promise<boolean>;
}

/** Chat runs exactly where presence does — the maps players are meant to share. */
function isSharedMap(mapId: string): boolean {
  return MULTIPLAYER.SHARED_MAPS.has(mapId);
}

export function useChatController(props: UseChatControllerProps): UseChatControllerReturn {
  const { currentMapId, playerName } = props;

  const [isChatActive, setIsChatActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authTick, setAuthTick] = useState(0);

  // Read at send time, so a name change mid-session does not need a re-subscribe.
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

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
        setMessages((previous) => {
          // RTDB can re-deliver a child on reconnect; keying on id keeps the
          // player from seeing their own sentence twice.
          if (previous.some((existing) => existing.id === message.id)) return previous;
          return [...previous, message].slice(-CHAT_HISTORY_LIMIT);
        });
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

      // Messages are per-map: walking into the orchard should not show what was
      // said in the village.
      setMessages([]);

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

  return { isChatActive, messages, sendMessage };
}
