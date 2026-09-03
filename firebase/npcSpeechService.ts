/**
 * NPC speech transport — Realtime Database.
 *
 * A sibling of presenceService and chatService, and ephemeral for the same
 * reason: what Mushra said forty minutes ago is not worth storing, and a room
 * full of stale lines would be worse than none.
 *
 * One record per NPC (`npcSpeech/{mapId}/{npcId}`), overwritten rather than
 * appended. An NPC only says one thing at a time, and the last line is the only
 * one worth showing — so there is no history to page through and nothing to
 * clean up.
 *
 * Nothing here throws to callers.
 */

import { ref, set, onChildAdded, onChildChanged, serverTimestamp } from 'firebase/database';
import { getRealtimeDb } from './realtimeConfig';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import { decodeNpcSpeech, truncateNpcSpeech } from '../multiplayer/npcSpeech';
import type { NpcSpeechWire } from '../multiplayer/npcSpeech';

const NPC_SPEECH_ROOT = 'npcSpeech';

/** Minimal shape of the snapshots the RTDB child callbacks hand us. */
interface ChildSnapshot {
  key: string | null;
  val: () => unknown;
}

class NpcSpeechService {
  private roomMapId: string | null = null;
  private unsubscribers: Array<() => void> = [];
  private listeners = new Set<(npcId: string, wire: NpcSpeechWire) => void>();
  private reportedSendFailure = false;

  isAvailable(): boolean {
    return getRealtimeDb() !== null && authService.isAuthenticated();
  }

  getCurrentRoom(): string | null {
    return this.roomMapId;
  }

  onSpeech(callback: (npcId: string, wire: NpcSpeechWire) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  #emit(npcId: string, wire: NpcSpeechWire): void {
    for (const listener of this.listeners) {
      try {
        listener(npcId, wire);
      } catch (error) {
        console.warn('[NpcSpeech] Listener threw:', error);
      }
    }
  }

  /** Listen to what NPCs on this map are saying. */
  async enterRoom(mapId: string): Promise<boolean> {
    if (this.roomMapId === mapId) return true;
    await this.leaveRoom();

    const db = getRealtimeDb();
    if (!db || !authService.isAuthenticated()) return false;

    try {
      const roomRef = ref(db, `${NPC_SPEECH_ROOT}/${mapId}`);
      this.roomMapId = mapId;

      const handle = (snapshot: ChildSnapshot) => {
        const npcId = snapshot.key;
        if (!npcId) return;
        const wire = decodeNpcSpeech(snapshot.val());
        if (!wire) return;
        this.#emit(npcId, wire);
      };

      // Both events matter: the first line from an NPC arrives as an add, every
      // line after it as a change to the same record.
      this.unsubscribers.push(onChildAdded(roomRef, handle), onChildChanged(roomRef, handle));

      if (DEBUG.MULTIPLAYER) console.log(`[NpcSpeech] Listening on "${mapId}"`);
      return true;
    } catch (error) {
      console.warn(`[NpcSpeech] Failed to listen on "${mapId}":`, error);
      reportError(error, 'presence', { room: mapId, transport: 'npc_speech' });
      this.roomMapId = null;
      return false;
    }
  }

  async leaveRoom(): Promise<void> {
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

  /** Publish what an NPC just said. */
  async publish(npcId: string, text: string): Promise<boolean> {
    const db = getRealtimeDb();
    const uid = authService.getUserId();
    const mapId = this.roomMapId;
    if (!db || !uid || !mapId) return false;

    const body = truncateNpcSpeech(text);
    if (!body) return false;

    try {
      await set(ref(db, `${NPC_SPEECH_ROOT}/${mapId}/${npcId}`), {
        m: body,
        t: serverTimestamp(),
        u: uid,
      });
      return true;
    } catch (error) {
      // Losing one line is survivable — the next one is a click away — but a
      // failure that repeats means nobody ever sees a conversation, so say so
      // once.
      if (!this.reportedSendFailure) {
        this.reportedSendFailure = true;
        console.warn('[NpcSpeech] Publish failed — others will not see this conversation:', error);
        reportError(error, 'presence', { room: mapId, transport: 'npc_speech', npcId });
      }
      return false;
    }
  }

  async destroy(): Promise<void> {
    await this.leaveRoom();
    this.listeners.clear();
  }
}

export const npcSpeechService = new NpcSpeechService();
