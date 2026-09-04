/**
 * Realtime Database configuration — ephemeral presence only.
 *
 * Why a second database when the project already has Firestore: Firestore bills
 * per document write, and a player publishing position at 5 Hz for a two-hour
 * session is ~36,000 writes — more than the entire daily free tier, for data
 * with a 200 ms shelf life. Realtime Database bills bandwidth instead, and —
 * decisively — supports `onDisconnect()`, which lets the *server* delete a
 * player's presence when their socket drops. Without that, every crashed tab
 * leaves a ghost standing in the village forever.
 *
 * Durable shared state (the community garden, world events, cloud saves) stays
 * on Firestore. See design_docs/planned/MULTIPLAYER.md §4.
 */

import { getDatabase, Database } from 'firebase/database';
import { getFirebaseApp, isFirebaseInitialized } from './config';
import { debugLog } from '../utils/debugLog';

let rtdb: Database | null = null;
let initAttempted = false;
let loggedUnconfigured = false;

/**
 * True when a database URL is configured. Presence is optional: the game is
 * fully playable without it, so a missing URL is a log line, not an error.
 */
export function isRealtimeConfigured(): boolean {
  return !!import.meta.env.VITE_FIREBASE_DATABASE_URL;
}

/**
 * Get the Realtime Database instance, or null when unavailable.
 * Safe to call repeatedly; initialisation happens once.
 *
 * The "not initialised yet" case must NOT be cached. getRealtimeDb() is first
 * called the moment the player steps onto a shared map, which can easily be
 * before initializeFirebase() has resolved — and latching a null then killed
 * presence for the rest of the session, with no log to say why. Only a real
 * getDatabase() attempt is allowed to be final.
 */
export function getRealtimeDb(): Database | null {
  if (rtdb) return rtdb;

  if (!isRealtimeConfigured()) {
    if (!loggedUnconfigured) {
      loggedUnconfigured = true;
      debugLog('Presence', 'Realtime Database not configured - multiplayer disabled');
    }
    return null;
  }

  // Firebase itself is still starting up. Transient: try again next call.
  if (!isFirebaseInitialized()) return null;

  if (initAttempted) return null;
  initAttempted = true;

  try {
    rtdb = getDatabase(getFirebaseApp(), import.meta.env.VITE_FIREBASE_DATABASE_URL);
    debugLog('Presence', 'Realtime Database ready');
    return rtdb;
  } catch (error) {
    console.warn('[Presence] Realtime Database init failed - multiplayer disabled', error);
    return null;
  }
}

/** Reset cached state. Test seam only. */
export function resetRealtimeDbForTests(): void {
  rtdb = null;
  initAttempted = false;
  loggedUnconfigured = false;
}
