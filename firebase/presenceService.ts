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
  serverTimestamp,
  type DatabaseReference,
} from 'firebase/database';
import { getRealtimeDb, isRealtimeConfigured } from './realtimeConfig';
import { isFirebaseInitialized } from './config';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import { encodePresence, decodePresence } from '../multiplayer/wire';
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
      const roomRef = ref(db, `${PRESENCE_ROOT}/${mapId}`);
      this.selfRef = ref(db, `${PRESENCE_ROOT}/${mapId}/${uid}`);
      this.roomMapId = mapId;

      // Arm before the first write, so a crash between the two cannot leave a
      // ghost behind.
      await onDisconnect(this.selfRef).remove();

      const handle = (type: 'joined' | 'changed') => (snapshot: ChildSnapshot) => {
        const otherUid = snapshot.key;
        if (!otherUid || otherUid === uid) return;
        const wire = decodePresence(snapshot.val());
        if (!wire) {
          if (DEBUG.MULTIPLAYER) {
            console.warn(`[Presence] Dropped malformed record from ${otherUid}`);
          }
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
  }
}

export const presenceService = new PresenceService();
