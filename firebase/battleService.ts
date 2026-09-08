/**
 * Battle transport — Realtime Database.
 *
 * A sibling of presenceService, chatService and npcSpeechService, and ephemeral
 * for the same reason: a fight that ended ten minutes ago is not worth storing,
 * and the cave it happened in is regenerated tomorrow anyway.
 *
 * Two flat rooms, both keyed by map:
 *   `battles/{mapId}/{npcId}`               — the fight, overwritten as it runs
 *   `battlesCheers/{mapId}/{npcId}/{uid}`   — one record per cheering spectator
 *
 * They are siblings rather than parent/child on purpose. The battle record is
 * rewritten several times a round by one client; nesting cheers underneath it
 * would mean either clobbering other players' cheers on every phase change, or
 * reading-modifying-writing a record that is already changing under us.
 *
 * Nothing here throws to callers. A battle-sharing failure must never break the
 * fight the player is actually having.
 */

import {
  ref,
  set,
  remove,
  onValue,
  onChildAdded,
  onChildChanged,
  serverTimestamp,
} from 'firebase/database';
import { getRealtimeDb } from './realtimeConfig';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import { decodeBattle, decodeCheer, trimField, MAX_BATTLE_NAME_CHARS } from '../multiplayer/battle';
import type { BattleWire, CheerWire } from '../multiplayer/battle';

const BATTLE_ROOT = 'battles';
const CHEER_ROOT = 'battlesCheers';

/** Minimal shape of the snapshots the RTDB child callbacks hand us. */
interface ChildSnapshot {
  key: string | null;
  val: () => unknown;
}

type BattleListener = (npcId: string, wire: BattleWire) => void;
type CheerListener = (npcId: string, uid: string, wire: CheerWire) => void;

class BattleService {
  private roomMapId: string | null = null;
  private unsubscribers: Array<() => void> = [];
  private battleListeners = new Set<BattleListener>();
  private cheerListeners = new Set<CheerListener>();
  private reportedSendFailure = false;

  /** The npc we are currently publishing a fight for, so we can clean it up. */
  private publishedNpcId: string | null = null;

  isAvailable(): boolean {
    return getRealtimeDb() !== null && authService.isAuthenticated();
  }

  getCurrentRoom(): string | null {
    return this.roomMapId;
  }

  onBattle(callback: BattleListener): () => void {
    this.battleListeners.add(callback);
    return () => {
      this.battleListeners.delete(callback);
    };
  }

  onCheer(callback: CheerListener): () => void {
    this.cheerListeners.add(callback);
    return () => {
      this.cheerListeners.delete(callback);
    };
  }

  #emitBattle(npcId: string, wire: BattleWire): void {
    for (const listener of this.battleListeners) {
      try {
        listener(npcId, wire);
      } catch (error) {
        console.warn('[Battle] Listener threw:', error);
      }
    }
  }

  #emitCheer(npcId: string, uid: string, wire: CheerWire): void {
    for (const listener of this.cheerListeners) {
      try {
        listener(npcId, uid, wire);
      } catch (error) {
        console.warn('[Battle] Cheer listener threw:', error);
      }
    }
  }

  /** Watch the fights happening on this map. */
  async enterRoom(mapId: string): Promise<boolean> {
    if (this.roomMapId === mapId) return true;
    await this.leaveRoom();

    const db = getRealtimeDb();
    if (!db || !authService.isAuthenticated()) return false;

    try {
      this.roomMapId = mapId;

      const battleRef = ref(db, `${BATTLE_ROOT}/${mapId}`);
      const handleBattle = (snapshot: ChildSnapshot) => {
        const npcId = snapshot.key;
        if (!npcId) return;
        const wire = decodeBattle(snapshot.val());
        if (!wire) return;
        this.#emitBattle(npcId, wire);
      };

      // Both events matter: the first publish of a fight arrives as an add,
      // every round after it as a change to the same record.
      this.unsubscribers.push(
        onChildAdded(battleRef, handleBattle),
        onChildChanged(battleRef, handleBattle)
      );

      // Cheers are two levels deep (npcId → uid), so watch the whole subtree and
      // fan out. It is a handful of tiny records; a per-npc listener would have
      // to be attached and detached as fights start and stop.
      const cheerRef = ref(db, `${CHEER_ROOT}/${mapId}`);
      this.unsubscribers.push(
        onValue(cheerRef, (snapshot) => {
          const byNpc = snapshot.val();
          if (!byNpc || typeof byNpc !== 'object') return;
          for (const [npcId, byUid] of Object.entries(byNpc as Record<string, unknown>)) {
            if (!byUid || typeof byUid !== 'object') continue;
            for (const [uid, raw] of Object.entries(byUid as Record<string, unknown>)) {
              const wire = decodeCheer(raw);
              if (wire) this.#emitCheer(npcId, uid, wire);
            }
          }
        })
      );

      if (DEBUG.MULTIPLAYER) console.log(`[Battle] Watching fights on "${mapId}"`);
      return true;
    } catch (error) {
      console.warn(`[Battle] Failed to watch "${mapId}":`, error);
      reportError(error, 'presence', { room: mapId, transport: 'battle' });
      this.roomMapId = null;
      return false;
    }
  }

  async leaveRoom(): Promise<void> {
    await this.clearBattle();
    for (const unsubscribe of this.unsubscribers) {
      try {
        unsubscribe();
      } catch {
        /* detaching a dead listener is not worth reporting */
      }
    }
    this.unsubscribers = [];
    this.roomMapId = null;
  }

  /** Publish the state of the fight we are having. */
  async publishBattle(npcId: string, battle: Omit<BattleWire, 'u' | 't'>): Promise<boolean> {
    const db = getRealtimeDb();
    const uid = authService.getUserId();
    const mapId = this.roomMapId;
    if (!db || !uid || !mapId) return false;

    this.publishedNpcId = npcId;

    const payload: Record<string, unknown> = {
      u: uid,
      n: trimField(battle.n, MAX_BATTLE_NAME_CHARS),
      e: trimField(battle.e, MAX_BATTLE_NAME_CHARS),
      p: battle.p,
      r: battle.r,
      h: battle.h,
      hm: battle.hm,
      st: battle.st,
      l: battle.l,
      t: serverTimestamp(),
    };
    if (battle.p === 'won' && battle.x !== undefined && battle.y !== undefined) {
      payload.x = battle.x;
      payload.y = battle.y;
    }

    try {
      await set(ref(db, `${BATTLE_ROOT}/${mapId}/${npcId}`), payload);
      return true;
    } catch (error) {
      // Losing one update is survivable — the next round republishes — but a
      // failure that repeats means nobody ever sees a fight, so say so once.
      if (!this.reportedSendFailure) {
        this.reportedSendFailure = true;
        console.warn('[Battle] Publish failed — others will not see this fight:', error);
        reportError(error, 'presence', { room: mapId, transport: 'battle', npcId });
      }
      return false;
    }
  }

  /**
   * Take our fight off the board.
   *
   * Called when the modal closes and when we leave the map. Without it a
   * finished fight would sit in the room until its timestamp went stale, and a
   * spectator arriving in between would see a battle that is already over.
   */
  async clearBattle(): Promise<void> {
    const db = getRealtimeDb();
    const mapId = this.roomMapId;
    const npcId = this.publishedNpcId;
    if (!db || !mapId || !npcId) return;

    this.publishedNpcId = null;
    try {
      // Cheers first: the rule that lets us clear other players' cheer records
      // checks that *we* are the fighter, and it reads that from the battle
      // record. Deleting the battle first would take the proof with it.
      await remove(ref(db, `${CHEER_ROOT}/${mapId}/${npcId}`));
      await remove(ref(db, `${BATTLE_ROOT}/${mapId}/${npcId}`));
    } catch {
      /* a leftover record goes stale on its own */
    }
  }

  /** Cheer on whoever is fighting this enemy. */
  async cheer(npcId: string, name: string): Promise<boolean> {
    const db = getRealtimeDb();
    const uid = authService.getUserId();
    const mapId = this.roomMapId;
    if (!db || !uid || !mapId) return false;

    try {
      await set(ref(db, `${CHEER_ROOT}/${mapId}/${npcId}/${uid}`), {
        n: trimField(name, MAX_BATTLE_NAME_CHARS),
        t: serverTimestamp(),
      });
      return true;
    } catch (error) {
      // A dropped cheer is genuinely nothing. Not worth a Sentry event.
      if (DEBUG.MULTIPLAYER) console.warn('[Battle] Cheer failed:', error);
      return false;
    }
  }

  async destroy(): Promise<void> {
    await this.leaveRoom();
    this.battleListeners.clear();
    this.cheerListeners.clear();
  }
}

export const battleService = new BattleService();
