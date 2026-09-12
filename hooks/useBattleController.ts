/**
 * BattleController — one player fights, the others watch and cheer.
 *
 * Owns the whole shared-battle lifecycle so App.tsx only has to wire it:
 *  - joins and leaves a map's battle room as the player moves between maps
 *  - publishes our own fight, round by round, from EventBus events the combat
 *    mini-game emits (so the mini-game itself imports no Firebase)
 *  - exposes the battle to spectate, and the cheer action
 *  - applies inbound cheers to our own stamina when we are the one fighting
 *  - applies another player's victory locally, so beating the goblin opens the
 *    passage for everybody standing there — deferred until our own fight with
 *    that enemy closes, if we happen to be in one (see BattleManager)
 *
 * Mirrors useChatController and useNpcSpeechController: room per map, quietly
 * inert when Firebase is missing or the map is private.
 *
 * See design_docs/planned/MULTIPLAYER.md, "Shared battles".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MULTIPLAYER_ENABLED, STAMINA } from '../constants';
import { isSharedMap } from '../multiplayer/sharedMaps';
import { eventBus, GameEvent } from '../utils/EventBus';
import {
  getBattleService,
  getAuthService,
  getPresenceService,
  whenFirebaseSettled,
} from '../firebase/safe';
import { battleManager, shouldActOnCheer, CHEER_STAMINA } from '../multiplayer/battle';
import type { BattleWire } from '../multiplayer/battle';
import { gameState } from '../GameState';
import { debugLog } from '../utils/debugLog';

export interface UseBattleControllerProps {
  /** Map the player is currently on */
  currentMapId: string;
  /** Our display name, for the cheer we send */
  playerName: string;
}

export interface UseBattleControllerReturn {
  /** The fight to show a spectator panel for, or null */
  spectatedBattle: { npcId: string; battle: BattleWire } | null;
  /** Cheer on whoever is fighting */
  cheer: () => void;
}

/** Tell the rest of the game that somebody else's victory applies here too. */
function emitVictory(npcId: string, wire: BattleWire): void {
  eventBus.emit(GameEvent.BATTLE_WON_NEARBY, {
    npcId,
    name: wire.n,
    enemyName: wire.e,
    ...(wire.x !== undefined && wire.y !== undefined
      ? { entrance: { x: wire.x, y: wire.y } }
      : {}),
  });
}

export function useBattleController(props: UseBattleControllerProps): UseBattleControllerReturn {
  const { currentMapId, playerName } = props;

  const [spectatedBattle, setSpectatedBattle] = useState<{
    npcId: string;
    battle: BattleWire;
  } | null>(null);
  const [authTick, setAuthTick] = useState(0);

  // Read at send time, so a name change mid-session needs no re-subscribe.
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  /** The npc we are fighting right now, so inbound cheers can be matched to it. */
  const fightingNpcIdRef = useRef<string | null>(null);

  /** When we last acted on a cheer, per cheering player. */
  const lastCheerActedRef = useRef(new Map<string, number>());

  /**
   * The newest cheer timestamp we have seen from each player.
   *
   * Cheers arrive through a whole-subtree `onValue`, so every cheer redelivers
   * every other player's cheer alongside it. Without this, one cheer would keep
   * paying out each time somebody else cheered — the per-player cooldown only
   * rate-limits it, it does not make it single-use. The server clock is
   * monotonic within the subtree, so comparing `t` to `t` is safe in a way that
   * comparing it to our own clock would not be.
   */
  const lastCheerSeenRef = useRef(new Map<string, number>());

  // -------------------------------------------------------------------------
  // Outbound: publish our own fight
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    const unsubscribers = [
      // From the moment contact is made, not from the combat screen's first
      // publish: a victory that lands in the render between the two must be
      // deferred, not applied under a screen that is about to open.
      eventBus.on(GameEvent.COMBAT_INITIATED, (payload) => {
        fightingNpcIdRef.current = payload.npcId;
        battleManager.setFighting(payload.npcId);
      }),

      eventBus.on(GameEvent.BATTLE_PROGRESSED, (payload) => {
        if (!isSharedMap(currentMapId)) return;
        fightingNpcIdRef.current = payload.npcId;
        void getBattleService().publishBattle(payload.npcId, {
          n: playerNameRef.current,
          e: payload.enemyName,
          p: payload.phase,
          r: payload.round,
          h: payload.hitsRemaining,
          hm: payload.hitsTotal,
          st: payload.stamina,
          l: payload.line,
          ...(payload.entrance ? { x: payload.entrance.x, y: payload.entrance.y } : {}),
        });
      }),

      eventBus.on(GameEvent.BATTLE_ENDED, (payload) => {
        fightingNpcIdRef.current = null;
        lastCheerActedRef.current.clear();
        lastCheerSeenRef.current.clear();

        // A friend beat this enemy while our screen was open. Apply it now
        // that the screen is closed — whatever happened in our fight, the
        // enemy fell for everyone in the cave. App.tsx already applied our
        // own outcome, and the handler is idempotent about theirs.
        const deferred = battleManager.finishFight(payload.npcId);
        if (deferred) {
          debugLog(
            'Battle',
            `Applying ${deferred.n}'s victory over ${payload.npcId} now that our own fight (${payload.outcome}) has closed`
          );
          emitVictory(payload.npcId, deferred);
        }

        // A win is left on the board on purpose: it is the notice that tells
        // everyone else in the cave the goblin fell and where the passage
        // opened, including anyone who walks in a minute later. It goes when we
        // leave the room. Anything else is cleared now, so nobody is left
        // watching a fight that is over.
        if (payload.outcome === 'won') return;

        // Deliberately not awaited: the modal is closing either way.
        void getBattleService().clearBattle();
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [currentMapId]);

  // -------------------------------------------------------------------------
  // Inbound: other people's fights, and cheers for ours
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let unsubscribeBattle: (() => void) | null = null;
    let unsubscribeCheer: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      const loaded = await whenFirebaseSettled();
      if (cancelled || !loaded) return;

      const service = getBattleService();
      // presenceService.getUid() is the same authService uid, and is already
      // the accessor every other multiplayer surface reads it through.
      const localUid = () => getPresenceService().getUid();

      unsubscribeBattle = service.onBattle((npcId, wire) => {
        battleManager.apply(npcId, wire);

        // Somebody else won. Apply it here too: the goblin is the same goblin,
        // so it should fall for both of us, and the passage it guarded should
        // open at the same tile rather than wherever this client would have
        // put it.
        if (wire.p === 'won' && wire.u !== localUid()) {
          const applyNow = battleManager.noteVictory(npcId, wire);
          if (applyNow) {
            emitVictory(npcId, applyNow);
          } else {
            debugLog(
              'Battle',
              `${wire.n} beat ${npcId} while we are fighting it — holding their victory until our screen closes`
            );
          }
        }

        setSpectatedBattle(battleManager.getSpectatedBattle(localUid()));
      });

      unsubscribeCheer = service.onCheer((npcId, uid, wire) => {
        // Only the fighter acts on a cheer, and only for the fight they are in.
        if (npcId !== fightingNpcIdRef.current) return;
        if (uid === localUid()) return;

        // Already paid out — this is a redelivery, not a new cheer.
        const lastSeen = lastCheerSeenRef.current.get(uid);
        if (lastSeen !== undefined && wire.t <= lastSeen) return;
        lastCheerSeenRef.current.set(uid, wire.t);

        const now = Date.now();
        if (!shouldActOnCheer(lastCheerActedRef.current.get(uid), now)) return;
        lastCheerActedRef.current.set(uid, now);

        const current = gameState.getStamina();
        const restored = Math.min(CHEER_STAMINA, STAMINA.MAX - current);
        if (restored > 0) {
          gameState.setStamina(current + restored);
          eventBus.emit(GameEvent.STAMINA_CHANGED, {
            value: current + restored,
            maxValue: STAMINA.MAX,
          });
        }

        eventBus.emit(GameEvent.BATTLE_CHEERED, {
          npcId,
          name: wire.n,
          stamina: restored,
        });
      });

      // Re-drive the join effect below whenever sign-in state changes: Firebase
      // restores the session after the first map has loaded.
      unsubscribeAuth = getAuthService().onAuthStateChange(() => {
        if (!cancelled) setAuthTick((tick) => tick + 1);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribeBattle?.();
      unsubscribeCheer?.();
      unsubscribeAuth?.();
    };
  }, []);

  // -------------------------------------------------------------------------
  // Room membership follows the current map
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED) return;

    let cancelled = false;

    void (async () => {
      await whenFirebaseSettled();
      const service = getBattleService();

      // Fights do not carry between maps.
      battleManager.setMap(isSharedMap(currentMapId) ? currentMapId : null);
      setSpectatedBattle(null);

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

  // -------------------------------------------------------------------------
  // Expire a fight nobody is updating
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!MULTIPLAYER_ENABLED || !spectatedBattle) return;

    // A fighter who closed the tab mid-fight leaves a record nobody removes.
    // getSpectatedBattle() already refuses a stale one; this is what makes the
    // panel notice, since no further event will arrive to re-evaluate it.
    const timer = window.setInterval(() => {
      const uid = getPresenceService().getUid();
      setSpectatedBattle(battleManager.getSpectatedBattle(uid));
    }, 2000);

    return () => window.clearInterval(timer);
  }, [spectatedBattle]);

  // Leave cleanly on unmount rather than waiting for the next map change.
  useEffect(() => {
    return () => {
      battleManager.clear();
      void getBattleService().leaveRoom();
    };
  }, []);

  const cheer = useCallback(() => {
    const npcId = spectatedBattle?.npcId;
    if (!npcId) return;
    void getBattleService().cheer(npcId, playerNameRef.current);
  }, [spectatedBattle]);

  return { spectatedBattle, cheer };
}
