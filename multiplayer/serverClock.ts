/**
 * Server clock — what time the Realtime Database thinks it is.
 *
 * Presence records carry a *server* timestamp (`t`), and the ghost check
 * compares it with a clock. Comparing it with the local clock is wrong on any
 * device whose time is out: a tablet running five minutes fast sees every
 * record from every other player as a five-minute-old ghost, drops the lot,
 * and its owner stands in an empty village while everyone else can see her.
 * Nothing throws and nothing logs — the game is simply single-player on that
 * one device.
 *
 * The transport (presenceService) learns the offset from RTDB's
 * `.info/serverTimeOffset` and stores it here; everything that needs "now, by
 * the server's clock" asks serverNow(). Pure, no Firebase imports, so the
 * pure managers and their tests can use it.
 */

let serverTimeOffsetMs = 0;
let known = false;

/** Record the server-minus-local difference, in ms (positive = local clock is behind). */
export function setServerTimeOffset(offsetMs: number): void {
  if (!Number.isFinite(offsetMs)) return;
  serverTimeOffsetMs = offsetMs;
  known = true;
}

export function getServerTimeOffset(): number {
  return serverTimeOffsetMs;
}

/** True once the transport has measured the offset — before that serverNow() is the local clock. */
export function isServerTimeOffsetKnown(): boolean {
  return known;
}

/** The local instant `localNow` expressed on the server's clock. */
export function serverNow(localNow: number = Date.now()): number {
  return localNow + serverTimeOffsetMs;
}

/** Tests only. */
export function resetServerClockForTests(): void {
  serverTimeOffsetMs = 0;
  known = false;
}
