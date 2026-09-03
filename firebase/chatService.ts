/**
 * Chat transport — Realtime Database.
 *
 * Deliberately a sibling of presenceService rather than part of it. Presence is
 * a single record per player that is overwritten five times a second; chat is an
 * append-only list that must survive being read a minute later. Putting them in
 * one record would mean either losing messages to the next position update or
 * republishing every message at 5 Hz.
 *
 * Rooms are map ids (`chat/{mapId}/{pushId}`), matching presence: you hear the
 * people you could actually see.
 *
 * Nothing here throws to callers. A chat failure must never break the game loop.
 */

import {
  ref,
  push,
  set,
  query,
  limitToLast,
  onChildAdded,
  serverTimestamp,
} from 'firebase/database';
import { getRealtimeDb } from './realtimeConfig';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import {
  sanitiseMessage,
  decodeChatMessage,
  CHAT_HISTORY_LIMIT,
  CHAT_MAX_AGE_MS,
} from '../multiplayer/chat';
import type { ChatMessage } from '../multiplayer/chat';

const CHAT_ROOT = 'chat';

/** Minimal shape of the snapshots the RTDB child callbacks hand us. */
interface ChildSnapshot {
  key: string | null;
  val: () => unknown;
}

class ChatService {
  private roomMapId: string | null = null;
  private unsubscribers: Array<() => void> = [];
  private listeners = new Set<(message: ChatMessage) => void>();
  private reportedSendFailure = false;

  /** True when chat can be sent — Firebase up and signed in. */
  isAvailable(): boolean {
    return getRealtimeDb() !== null && authService.isAuthenticated();
  }

  getCurrentRoom(): string | null {
    return this.roomMapId;
  }

  /** Subscribe to inbound messages. Returns an unsubscribe function. */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // A true #private method for the same reason as presenceService's: the stub
  // parity test compares the runtime method surface, and internal helpers must
  // not appear there.
  #emit(message: ChatMessage): void {
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch (error) {
        console.warn('[Chat] Listener threw:', error);
      }
    }
  }

  /** Join a map's chat room and start receiving its recent messages. */
  async enterRoom(mapId: string): Promise<boolean> {
    if (this.roomMapId === mapId) return true;
    await this.leaveRoom();

    const db = getRealtimeDb();
    const uid = authService.getUserId();
    if (!db || !uid) return false;

    try {
      // limitToLast keeps the join cheap: a room that has been busy all day
      // still costs one screenful of messages to walk into.
      const recent = query(ref(db, `${CHAT_ROOT}/${mapId}`), limitToLast(CHAT_HISTORY_LIMIT));
      this.roomMapId = mapId;

      const joinedAt = Date.now();
      this.unsubscribers.push(
        onChildAdded(recent, (snapshot: ChildSnapshot) => {
          const message = decodeChatMessage(snapshot.key ?? '', snapshot.val(), uid);
          if (!message) return;
          // Backlog older than the cutoff is history, not conversation. `t` is
          // the server clock and `joinedAt` is ours, so this is approximate on
          // purpose — it only has to keep last week's messages off the screen.
          if (message.sentAt > 0 && joinedAt - message.sentAt > CHAT_MAX_AGE_MS) return;
          this.#emit(message);
        })
      );

      if (DEBUG.MULTIPLAYER) console.log(`[Chat] Entered room "${mapId}"`);
      return true;
    } catch (error) {
      console.warn(`[Chat] Failed to enter room "${mapId}":`, error);
      reportError(error, 'presence', { room: mapId, transport: 'chat' });
      this.roomMapId = null;
      return false;
    }
  }

  /** Leave the current room and detach listeners. Messages are left in place. */
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

  /**
   * Send a message to the current room. Returns false when there was nothing
   * worth sending or the write failed — callers keep the player's text either
   * way, so a dropped message is retryable rather than lost.
   */
  async send(text: string, name: string): Promise<boolean> {
    const db = getRealtimeDb();
    const uid = authService.getUserId();
    const mapId = this.roomMapId;
    if (!db || !uid || !mapId) return false;

    const body = sanitiseMessage(text);
    if (!body) return false;

    try {
      const messageRef = push(ref(db, `${CHAT_ROOT}/${mapId}`));
      await set(messageRef, {
        u: uid,
        n: name.trim().slice(0, 20) || 'Traveller',
        m: body,
        t: serverTimestamp(),
      });
      return true;
    } catch (error) {
      // Unlike a position update, a lost message is visible to the player: they
      // typed it and it never appeared. Report the first one.
      if (!this.reportedSendFailure) {
        this.reportedSendFailure = true;
        console.warn('[Chat] Send failed — the message was not delivered:', error);
        reportError(error, 'presence', { room: mapId, transport: 'chat', action: 'send' });
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

export const chatService = new ChatService();
