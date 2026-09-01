/**
 * MultiplayerController — domain controller for shared-world presence.
 *
 * Owns the whole multiplayer lifecycle so App.tsx only has to wire it:
 *  - joins and leaves a map's presence room as the player moves between maps
 *  - feeds inbound presence into RemotePlayerManager
 *  - publishes the local player at a throttled rate from the game loop
 *  - exposes the emote action and the "who else is here" count for the HUD
 *
 * Nothing here is allowed to break the game loop. Presence is a garnish: if
 * Firebase is missing, the database URL is unset, the player is signed out, or
 * the current map is private, this hook quietly does nothing and the game is
 * exactly the single-player game.
 *
 * See design_docs/planned/MULTIPLAYER.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MULTIPLAYER, MULTIPLAYER_ENABLED, DEBUG } from '../constants';
import { eventBus, GameEvent } from '../utils/EventBus';
import { getPresenceService } from '../firebase/safe';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { shouldPublish } from '../multiplayer/publishPolicy';
import { getLocalEmote, setLocalEmote, clearLocalEmote } from '../multiplayer/localEmote';
import type { EmoteId } from '../multiplayer/emotes';
import type { LocalPresenceState } from '../multiplayer/types';

export interface UseMultiplayerControllerProps {
  /** Map the player is currently on */
  currentMapId: string;

  /**
   * Read the local player's publishable state. Called from the game loop, so it
   * must be cheap and must read from refs rather than React state.
   * Return null to suppress publishing (e.g. before the character exists).
   */
  getLocalPresence: () => LocalPresenceState | null;
}

export interface UseMultiplayerControllerReturn {
  /** True when presence is actually running on this map */
  isActive: boolean;

  /** How many other players are on this map */
  remotePlayerCount: number;

  /** Their display names, for the HUD */
  remotePlayerNames: string[];

  /** Call once per frame from the game loop */
  tickMultiplayer: (now: number) => void;

  /** Play an emote — publishes it and shows it above the local player */
  sendEmote: (emote: EmoteId) => void;
}

/** Presence only runs on maps players are meant to share. */
function isSharedMap(mapId: string): boolean {
  return MULTIPLAYER.SHARED_MAPS.has(mapId);
}

/**
 * Resolve the presence transport through firebase/safe, so a build without the
 * `firebase` package gets the no-op stub rather than a module-resolution crash.
 * Matches how farmManager reaches communityGardenService.
 */
type PresenceTransport = ReturnType<typeof getPresenceService>;

async function loadPresenceService(): Promise<PresenceTransport | null> {
  try {
    const { getPresenceService: get } = await import('../firebase/safe');
    return get();
  } catch {
    return null;
  }
}

export function useMultiplayerController(
  props: UseMultiplayerControllerProps
): UseMultiplayerControllerReturn {
  const { currentMapId, getLocalPresence } = props;

  const [isActive, setIsActive] = useState(false);
  const [remotePlayerCount, setRemotePlayerCount] = useState(0);
  const [remotePlayerNames, setRemotePlayerNames] = useState<string[]>([]);

  // Always-fresh mirror, so the game-loop callback below never goes stale.
  const getLocalPresenceRef = useRef(getLocalPresence);
  getLocalPresenceRef.current = getLocalPresence;

  const lastPublishedRef = useRef<LocalPresenceState | null>(null);
  const lastPublishAtRef = useRef(0);
  const activeRef = useRef(false);
  // Resolved once, then read synchronously from the game loop.
  const presenceRef = useRef<PresenceTransport | null>(null);

  // -------------------------------------------------------------------------
  // Inbound presence → RemotePlayerManager
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    void loadPresenceService().then((service) => {
      if (!service || cancelled) return;
      presenceRef.current = service;
      unsubscribe = service.onPresence((event) => {
        if (event.type === 'left') {
          remotePlayerManager.remove(event.uid);
        } else {
          remotePlayerManager.apply(event.uid, event.wire);
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Room membership follows the current map
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let cancelled = false;

    const join = async () => {
      const presence = presenceRef.current ?? (await loadPresenceService());
      if (!presence) return;
      presenceRef.current = presence;

      // A private map (home, personal garden, any RANDOM_* forest) or an
      // unavailable backend both mean the same thing: nobody to see here.
      if (!isSharedMap(currentMapId) || !presence.isAvailable()) {
        await presence.leaveRoom();
        remotePlayerManager.setMap(null);
        if (!cancelled) {
          activeRef.current = false;
          setIsActive(false);
          setRemotePlayerCount(0);
          setRemotePlayerNames([]);
        }
        return;
      }

      remotePlayerManager.setMap(currentMapId);
      // Force a publish on arrival, so we appear immediately rather than after
      // the first movement threshold is crossed.
      lastPublishedRef.current = null;
      lastPublishAtRef.current = 0;

      const joined = await presence.enterRoom(currentMapId);
      if (cancelled) return;

      activeRef.current = joined;
      setIsActive(joined);
      if (joined && DEBUG.MULTIPLAYER) {
        console.log(`[Multiplayer] Presence active on "${currentMapId}"`);
      }
    };

    void join();

    return () => {
      cancelled = true;
    };
  }, [currentMapId]);

  // Leave cleanly on unmount so we do not rely solely on onDisconnect().
  useEffect(() => {
    return () => {
      clearLocalEmote();
      remotePlayerManager.clear();
      void presenceRef.current?.leaveRoom();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Join/leave → HUD state (positions never come through here)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const refresh = () => {
      setRemotePlayerCount(remotePlayerManager.getCount());
      setRemotePlayerNames(remotePlayerManager.getNames());
    };
    const unsubscribers = [
      eventBus.on(GameEvent.REMOTE_PLAYER_JOINED, refresh),
      eventBus.on(GameEvent.REMOTE_PLAYER_LEFT, refresh),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  // -------------------------------------------------------------------------
  // Game loop tick: interpolate remote players, publish ourselves
  // -------------------------------------------------------------------------
  const tickMultiplayer = useCallback((now: number) => {
    if (!MULTIPLAYER_ENABLED) return;

    try {
      // Interpolation must keep running even when we are not publishing, so
      // remote players glide rather than freeze while a modal is open.
      remotePlayerManager.tick(now);

      if (!activeRef.current) return;

      const base = getLocalPresenceRef.current();
      if (!base) return;

      const next: LocalPresenceState = { ...base, emote: getLocalEmote(now) };
      const reason = shouldPublish(lastPublishedRef.current, next, now, lastPublishAtRef.current, {
        publishHz: MULTIPLAYER.PUBLISH_HZ,
        moveThresholdTiles: MULTIPLAYER.MOVE_THRESHOLD_TILES,
        heartbeatMs: MULTIPLAYER.HEARTBEAT_MS,
      });
      if (!reason) return;

      lastPublishedRef.current = next;
      lastPublishAtRef.current = now;
      if (DEBUG.MULTIPLAYER) console.log(`[Multiplayer] Publishing (${reason})`);
      // Fire and forget: a dropped position update is replaced 200 ms later,
      // and awaiting here would stall the frame.
      void presenceRef.current?.publish(next);
    } catch (error) {
      // A presence bug must never be able to stop the game loop.
      console.warn('[Multiplayer] Tick failed:', error);
    }
  }, []);

  const sendEmote = useCallback((emote: EmoteId) => {
    setLocalEmote(emote);
    // Emotes bypass the movement throttle in shouldPublish() via the
    // state-change branch, so the next tick sends this immediately.
  }, []);

  return { isActive, remotePlayerCount, remotePlayerNames, tickMultiplayer, sendEmote };
}
