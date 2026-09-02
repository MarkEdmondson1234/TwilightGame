/**
 * Recent chat, kept for the history panel in Settings.
 *
 * A module-level ring buffer rather than React state, because the history
 * outlives the panel that shows it: the player opens Settings *after* the
 * conversation, and a component that mounts then would otherwise start empty.
 *
 * Only messages the player could actually hear are recorded. If you were too
 * far away for the bubble, you do not get to read it later either — the
 * proximity rule would be worth nothing if the transcript ignored it.
 */

import { CHAT_HISTORY_LIMIT } from './chat';
import type { ChatMessage } from './chat';

let history: ChatMessage[] = [];
const listeners = new Set<() => void>();

/** Record a message that was heard. */
export function recordChatMessage(message: ChatMessage): void {
  if (history.some((existing) => existing.id === message.id)) return;
  history = [...history, message].slice(-CHAT_HISTORY_LIMIT);
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn('[ChatHistory] Listener threw:', error);
    }
  }
}

/** Everything heard this session, oldest first. */
export function getChatHistory(): ChatMessage[] {
  return history;
}

/** Subscribe to new messages. Returns an unsubscribe function. */
export function onChatHistoryChange(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** Clear (sign-out, or a fresh session). */
export function clearChatHistory(): void {
  history = [];
}
