/**
 * Why presence is (or is not) running — pure, no Firebase imports.
 *
 * Presence failing is invisible by design: you simply never see anybody, and
 * the game plays exactly as it does single-player. That makes "we are both
 * online and cannot see each other" undebuggable unless every path that
 * switches presence off can say so out loud, in words a player can act on.
 *
 * Kept out of firebase/presenceService.ts so the controller (and anything else
 * that only needs to *explain* the state) can import it without pulling in the
 * Realtime Database SDK — the same reason wire.ts lives here.
 */

export type PresenceUnavailableReason =
  | 'firebase-not-initialised'
  | 'no-database-url'
  | 'database-init-failed'
  | 'signed-out';

export interface PresenceStatus {
  available: boolean;
  reason: PresenceUnavailableReason | null;
  /** Our own uid, when signed in — two players sharing one account share a record */
  uid: string | null;
  /** The presence room currently joined, if any */
  room: string | null;
}

/** Human-readable, actionable explanation for each reason. */
export const PRESENCE_REASON_TEXT: Record<PresenceUnavailableReason, string> = {
  'firebase-not-initialised':
    'Firebase has not finished starting up (or failed to start) in this browser',
  'no-database-url': 'no Realtime Database URL was set in this build',
  'database-init-failed': 'the Realtime Database could not be opened',
  'signed-out': 'you are not signed in — press F1, open Settings and sign in (or play as guest)',
};

/**
 * Traffic counters for the on-device readout (components/SharedWorldStatus).
 * They answer the question the status alone cannot: when a friend is
 * invisible, did their records never arrive, or arrive and get lost after?
 */
export interface PresenceStats {
  /** Inbound records accepted and handed to subscribers */
  received: number;
  /** Inbound records refused (malformed, ghost) */
  dropped: number;
  /** Our own records written */
  published: number;
  /** Our own writes refused */
  publishFailed: number;
  /** Local clock at the last accepted inbound record, 0 if none */
  lastReceivedAt: number;
  /** How many things are listening for inbound records — 0 means nobody would notice one */
  subscribers: number;
}

export const EMPTY_PRESENCE_STATS: PresenceStats = {
  received: 0,
  dropped: 0,
  published: 0,
  publishFailed: 0,
  lastReceivedAt: 0,
  subscribers: 0,
};
