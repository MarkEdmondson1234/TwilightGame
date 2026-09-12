/**
 * Yule celebration gift-claim transport — Firestore.
 *
 * One document per year at `shared/world/yuleCelebration/{year}`, holding the
 * NPC celebrationIds any player has already gifted this year. Additive only
 * (arrayUnion, never deleted mid-year) — see
 * multiplayer/yuleCelebrationClaims.ts for why this needs to survive an NPC's
 * wish thought-bubble disappearing once gifted.
 *
 * Nothing here throws to callers.
 */

import { doc, setDoc, onSnapshot, arrayUnion, Unsubscribe } from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { DEBUG } from '../constants';
import { reportError } from '../utils/errorReporting';
import { decodeClaims } from '../multiplayer/yuleCelebrationClaims';

const YULE_CELEBRATION_COLLECTION = 'shared/world/yuleCelebration';

class YuleCelebrationService {
  private unsubscribe: Unsubscribe | null = null;
  private listeningYear: number | null = null;
  private reportedWriteFailure = false;

  /** True when claims can be sent/received — Firebase up and signed in. */
  isAvailable(): boolean {
    return isFirebaseInitialized() && authService.isAuthenticated();
  }

  /**
   * Subscribe to one year's claim record. Returns an unsubscribe.
   * Replaces any existing subscription (only one year is ever relevant at once).
   */
  subscribe(year: number, onChange: (npcIds: string[]) => void): () => void {
    if (!this.isAvailable()) return () => {};

    try {
      const db = getFirebaseDb();
      this.unsubscribe?.();
      this.listeningYear = year;

      this.unsubscribe = onSnapshot(
        doc(db, YULE_CELEBRATION_COLLECTION, String(year)),
        (snapshot) => {
          onChange(decodeClaims(snapshot.data()));
        },
        (error) => {
          console.warn('[YuleCelebration] Listener failed:', error);
          reportError(error, 'shared_world', { feature: 'yule_celebration', action: 'listen' });
        }
      );

      if (DEBUG.MULTIPLAYER) console.log(`[YuleCelebration] Watching claims for ${year}`);
      return () => {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.listeningYear = null;
      };
    } catch (error) {
      console.warn('[YuleCelebration] Failed to start listening:', error);
      reportError(error, 'shared_world', { feature: 'yule_celebration', action: 'listen' });
      return () => {};
    }
  }

  getListeningYear(): number | null {
    return this.listeningYear;
  }

  /**
   * Record one NPC's gift claim for the year. Firestore's arrayUnion dedupes
   * server-side, so no read-before-write race.
   */
  async claimGift(year: number, npcId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const db = getFirebaseDb();
      await setDoc(
        doc(db, YULE_CELEBRATION_COLLECTION, String(year)),
        { g: arrayUnion(npcId) },
        { merge: true }
      );
      return true;
    } catch (error) {
      if (!this.reportedWriteFailure) {
        this.reportedWriteFailure = true;
        console.warn('[YuleCelebration] Claim failed to sync:', error);
        reportError(error, 'shared_world', { feature: 'yule_celebration', action: 'claim' });
      } else if (DEBUG.MULTIPLAYER) {
        console.warn('[YuleCelebration] Claim failed to sync:', error);
      }
      return false;
    }
  }

  /** Tear down completely (sign-out, unmount). */
  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeningYear = null;
  }
}

export const yuleCelebrationService = new YuleCelebrationService();
