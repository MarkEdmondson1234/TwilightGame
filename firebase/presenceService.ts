/**
 * Presence transport — Realtime Database.
 *
 * Responsible only for moving bytes: entering/leaving a room, publishing the
 * local player, and emitting raw presence events. It holds no game state and
 * makes no rendering decisions — that is RemotePlayerManager's job.
 *
 * Rooms are map IDs (`presence/{mapId}/{uid}`), so a client only subscribes to
 * the players it could actually see. Bandwidth therefore scales with
 * *co-located* players rather than total players, which is what makes this
 * affordable.
 *
 * Nothing here throws to callers. A presence failure must never be able to
 * break the game loop, so every path logs and returns false instead.
 */

import {
  ref,
  set,
  remove,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  serverTimestamp,
  type DatabaseReference,
} from 'firebase/database';
import { getRealtimeDb, isRealtimeConfigured } from './realtimeConfig';
import { isFirebaseInitialized } from './config';
import { authService } from './authService';
import { DEBUG, MULTIPLAYER } from '../constants';
import { reportError, reportMessageOnce } from '../utils/errorReporting';
import { encodePresence, decodePresence, isGhostRecord } from '../multiplayer/wire';
import { serverNow, setServerTimeOffset, isServerTimeOffsetKnown } from '../multiplayer/serverClock';
import type { PresenceStatus } from '../multiplayer/presenceStatus';
import type { LocalPresenceState, PresenceEvent } from '../multiplayer/types';

const PRESENCE_ROOT = 'presence';

/** Minimal shape of the snapshots the RTDB child callbacks hand us. */
interface ChildSnapshot {
  key: string | null;
  val: () => unknown;
}

class PresenceService {
  private roomMapId: string | null = null;
  private unsubscribers: Array<() => void> = [];
  private selfRef: DatabaseReference | null = null;
  private listeners = new Set<(event: PresenceEvent) => void>();
  /** Publish runs at 5 Hz — report the first failure only, not 300 a minute. */
  private reportedPublishFailure = false;
  private unsubscribeClock: (() => void) | null = null;

  /** True when presence can actually be published — Firebase up and signed in. */
  isAvailable(): boolean {
    return this.getStatus().available;
  }

  /**
   * The same answer as isAvailable(), plus *why*. Callers surface the reason
   * so a silent multiplayer failure leaves a trace in the console.
   */
  getStatus(): PresenceStatus {
    const uid = this.getUid();
    const base = { uid, room: this.roomMapId };

    if (!isRealtimeConfigured()) return { available: false, reason: 'no-database-url', ...base };
    if (!isFirebaseInitialized()) {
      return { available: false, reason: 'firebase-not-initialised', ...base };
    }
    if (getRealtimeDb() === null) {
      return { available: false, reason: 'database-init-failed', ...base };
    }
    if (!authService.isAuthenticated()) return { available: false, reason: 'signed-out', ...base };

    return { available: true, reason: null, ...base };
  }

  getUid(): string | null {
    return authService.getUserId();
  }

  getCurrentRoom(): string | null {
    return this.roomMapId;
  }

  /**
   * Subscribe to presence events. Returns an unsubscribe function.
   * Safe to call before any room is entered.
   */
  onPresence(callback: (event: PresenceEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // A true #private method, not a TypeScript `private` one: TS privacy is erased
  // at runtime, and tests/multiplayerSafeStubs.test.ts compares the runtime
  // method surface against the no-Firebase stub. Internal helpers must not
  // appear there or the parity check needs a hand-maintained exclusion list.
  #emit(event: PresenceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.warn('[Presence] Listener threw:', error);
      }
    }
  }

  /**
   * Join a map's presence room: subscribe to its members and arm the
   * disconnect cleanup for our own record.
   */
  async enterRoom(mapId: string): Promise<boolean> {
    if (this.roomMapId === mapId) return true;
    await this.leaveRoom();

    const db = getRealtimeDb();
    const uid = this.getUid();
    if (!db || !uid) return false;

    try {
      this.#watchServerClock(db);
      const roomRef = ref(db, `${PRESENCE_ROOT}/${mapId}`);
      this.selfRef = ref(db, `${PRESENCE_ROOT}/${mapId}/${uid}`);
      this.roomMapId = mapId;

      // Arm before the first write, so a crash between the two cannot leave a
      // ghost behind.
      await onDisconnect(this.selfRef).remove();

      const handle = (type: 'joined' | 'changed') => (snapshot: ChildSnapshot) => {
        const otherUid = snapshot.key;
        if (!otherUid || otherUid === uid) return;
        const raw = snapshot.val();
        const wire = decodePresence(raw);
        if (!wire) {
          // Every dropped record is a player somebody cannot see. Say so once
          // per player, whatever the debug flags: a drop that only logs when
          // asked is what made "she can see me but I can't see her" untraceable.
          const keys = raw && typeof raw === 'object' ? Object.keys(raw).join(',') : typeof raw;
          console.warn(`[Presence] Dropped malformed record from ${otherUid} (fields: ${keys})`);
          reportMessageOnce(
            'Presence record dropped: malformed',
            'presence',
            { room: mapId, uid: otherUid, fields: keys },
            `malformed:${otherUid}`
          );
          return;
        }

        // A record left behind by a client whose onDisconnect never fired.
        // Sweep it rather than only ignoring it: otherwise every player who
        // walks in sees the same ghost for as long as it sits there. The rules
        // allow anyone to delete a demonstrably stale record, and a live player
        // heartbeats every 15 s, so this cannot evict somebody who is present.
        //
        // Judged on the *server's* clock (multiplayer/serverClock.ts): `t` is a
        // server timestamp, and a tablet running minutes fast would otherwise
        // see every live player as a ghost. Both ages go in the report so that
        // case is recognisable — a large raw age with a small corrected one.
        const localNow = Date.now();
        if (isGhostRecord(wire, serverNow(localNow), MULTIPLAYER.GHOST_AFTER_MS)) {
          const ageMs = serverNow(localNow) - wire.t;
          console.warn(
            `[Presence] Sweeping ghost record ${otherUid} (${Math.round(ageMs / 1000)} s old)`
          );
          reportMessageOnce(
            'Presence record dropped as ghost',
            'presence',
            {
              room: mapId,
              uid: otherUid,
              ageMs: Math.round(ageMs),
              rawAgeMs: Math.round(localNow - wire.t),
              serverOffsetKnown: isServerTimeOffsetKnown(),
            },
            `ghost:${otherUid}`
          );
          void this.#sweepGhost(mapId, otherUid);
          return;
        }

        this.#emit({ type, uid: otherUid, wire });
      };

      this.unsubscribers.push(
        onChildAdded(roomRef, handle('joined')),
        onChildChanged(roomRef, handle('changed')),
        onChildRemoved(roomRef, (snapshot) => {
          const otherUid = snapshot.key;
          if (!otherUid || otherUid === uid) return;
          this.#emit({ type: 'left', uid: otherUid });
        })
      );

      if (DEBUG.MULTIPLAYER) console.log(`[Presence] Entered room "${mapId}"`);
      return true;
    } catch (error) {
      console.warn(`[Presence] Failed to enter room "${mapId}":`, error);
      reportError(error, 'presence', { room: mapId });
      this.roomMapId = null;
      this.selfRef = null;
      return false;
    }
  }

  /**
   * Learn how far this device's clock is from the server's. Subscribed once
   * per session; the SDK keeps it current across reconnects. A clock that is
   * well out is reported, because it is the one fault that makes the shared
   * world look broken on a single device — and nobody checks the clock.
   */
  #watchServerClock(db: NonNullable<ReturnType<typeof getRealtimeDb>>): void {
    if (this.unsubscribeClock) return;
    try {
      this.unsubscribeClock = onValue(ref(db, '.info/serverTimeOffset'), (snapshot) => {
        const offset = snapshot.val();
        if (typeof offset !== 'number') return;
        setServerTimeOffset(offset);
        if (Math.abs(offset) > MULTIPLAYER.CLOCK_SKEW_WARN_MS) {
          const seconds = Math.round(offset / 1000);
          console.warn(
            `[Presence] This device's clock is ${Math.abs(seconds)} s ${seconds > 0 ? 'behind' : 'ahead of'} the server.`
          );
          reportMessageOnce(
            'Device clock differs from server',
            'presence',
            { offsetMs: Math.round(offset) },
            'clock-skew'
          );
        } else if (DEBUG.MULTIPLAYER) {
          console.log(`[Presence] Server clock offset ${Math.round(offset)} ms`);
        }
      });
    } catch (error) {
      // Diagnostics only — the ghost check falls back to the local clock.
      if (DEBUG.MULTIPLAYER) console.warn('[Presence] Could not read server clock:', error);
    }
  }

  /**
   * Best-effort removal of a stale record. Failure is fine and unremarkable:
   * another client may have swept it first, or the rules may predate this.
   */
  async #sweepGhost(mapId: string, uid: string): Promise<void> {
    const db = getRealtimeDb();
    if (!db) return;
    try {
      await remove(ref(db, `${PRESENCE_ROOT}/${mapId}/${uid}`));
    } catch (error) {
      if (DEBUG.MULTIPLAYER) console.warn('[Presence] Ghost sweep failed:', error);
    }
  }

  /** Leave the current room, removing our record and detaching listeners. */
  async leaveRoom(): Promise<void> {
    for (const unsubscribe of this.unsubscribers) {
      try {
        unsubscribe();
      } catch {
        /* detaching a dead listener is not worth reporting */
      }
    }
    this.unsubscribers = [];

    const selfRef = this.selfRef;
    this.selfRef = null;
    const leftRoom = this.roomMapId;
    this.roomMapId = null;

    if (selfRef) {
      try {
        // Cancel first: otherwise the old room's disconnect handler stays armed
        // and could delete a record we have since written elsewhere.
        await onDisconnect(selfRef).cancel();
        await remove(selfRef);
      } catch (error) {
        if (DEBUG.MULTIPLAYER) console.warn('[Presence] Cleanup on leave failed:', error);
      }
    }

    if (leftRoom && DEBUG.MULTIPLAYER) console.log(`[Presence] Left room "${leftRoom}"`);
  }

  /**
   * Write the local player's presence. Callers decide *when* via
   * shouldPublish(); this just performs the write.
   */
  async publish(state: LocalPresenceState): Promise<boolean> {
    if (!this.selfRef) return false;

    const wire = { ...encodePresence(state), t: serverTimestamp() };

    try {
      await set(this.selfRef, wire);
      return true;
    } catch (error) {
      // Losing a *single* position update is harmless — the next one is 200 ms
      // away. Losing every one of them is invisible multiplayer, so the first
      // failure is always reported, however quiet the debug flags are: a
      // permission-denied here (rules not deployed) is otherwise undetectable.
      if (!this.reportedPublishFailure) {
        this.reportedPublishFailure = true;
        console.warn('[Presence] Publish failed — other players will not see you:', error);
        reportError(error, 'presence', { room: this.roomMapId });
      } else if (DEBUG.MULTIPLAYER) {
        console.warn('[Presence] Publish failed:', error);
      }
      return false;
    }
  }

  /** Tear down completely (sign-out, unmount). */
  async destroy(): Promise<void> {
    await this.leaveRoom();
    this.listeners.clear();
    this.unsubscribeClock?.();
    this.unsubscribeClock = null;
  }
}

export const presenceService = new PresenceService();
