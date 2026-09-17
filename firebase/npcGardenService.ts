/**
 * NpcGardenService — global plan documents for the NPC garden feature.
 *
 * See design_docs/planned/NPC_GARDENS.md. The public farm patches (village,
 * farm_area) are partly planted by NPC gardeners. The *plan* — how big each
 * gardener's patch is (driven by the highest friendship level any player has
 * reached with her) and what crop she was last asked to plant — is the only
 * genuinely new global state this feature adds. The layout itself is
 * deterministic (every client computes it from the day seed and this plan)
 * and the NPC plants are ordinary shared FarmPlots in shared/farming/plots.
 *
 * One tiny document per gardener, written rarely (friendship level-ups,
 * requests). Like every Firebase integration in this game it degrades
 * silently to local-only operation: callers fall back to the local player's
 * friendship level when Firebase is unavailable.
 *
 * Import via firebase/safe, never directly — the firebase package is
 * optional and this module must not be loaded when it is missing.
 */

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { debugLog } from '../utils/debugLog';

const GARDENS_COLLECTION = 'shared/world/npcGardens';

/** Firestore document shape for one gardener's plan. */
export interface NpcGardenPlanDoc {
  npcId: string;
  /** Highest friendship level (1-9) any player has reached with this NPC. */
  gardenLevel: number;
  /** The crop the player most recently requested (null = none). */
  requestedCrop: string | null;
  /** Auth UID of the last writer (for moderation/debugging). */
  updatedBy: string | null;
  updatedAt: ReturnType<typeof serverTimestamp> | Timestamp;
}

// Minimal structural type so the timestamp field typechecks without
// importing the full Firestore type surface at module level.
type PlanListener = (plans: Map<string, NpcGardenPlanDoc>) => void;

class NpcGardenService {
  private unsubscribe: Unsubscribe | null = null;
  private authUnsubscribe: (() => void) | null = null;
  private listeners: Set<PlanListener> = new Set();
  private remotePlans: Map<string, NpcGardenPlanDoc> = new Map();
  private isListening = false;

  /** Locally cached copies so reads work before/without Firebase. */
  private lastKnownPlans: Map<string, NpcGardenPlanDoc> = new Map();

  /**
   * Start listening to the plan documents. Safe to call repeatedly; also
   * wires an auth listener so the subscription retries when Firebase restores
   * the session after the game has loaded (the auth-retry rule — a listener
   * started before sign-in would otherwise never come back).
   */
  startListening(): void {
    // Retry on sign-in. onSnapshot subscriptions survive re-auth, but a call
    // made before isAuthenticated() is true silently no-ops — so re-run.
    // authService.onAuthStateChange() invokes its callback synchronously
    // with the current state before it returns, so when the caller is
    // already authenticated the callback below calls startListening() again
    // before this.authUnsubscribe has been assigned — the placeholder here
    // makes the guard true for that re-entrant call instead of recursing
    // forever (it shipped as an unguarded `InternalError: too much
    // recursion` crash).
    if (!this.authUnsubscribe) {
      this.authUnsubscribe = () => {};
      this.authUnsubscribe = authService.onAuthStateChange((state) => {
        if (state.isAuthenticated && !this.isListening) {
          this.startListening();
        }
      });
    }

    if (this.isListening) return;
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      debugLog('NpcGarden', 'Firebase not available — running in local-only mode');
      return;
    }

    const db = getFirebaseDb();
    const gardensRef = collection(db, GARDENS_COLLECTION);

    this.unsubscribe = onSnapshot(
      gardensRef,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const npcId = change.doc.id;
          if (change.type === 'removed') {
            this.remotePlans.delete(npcId);
          } else {
            const plan = change.doc.data() as NpcGardenPlanDoc;
            this.remotePlans.set(npcId, plan);
            this.lastKnownPlans.set(npcId, plan);
          }
        });

        this.listeners.forEach((cb) => cb(this.remotePlans));
        debugLog('NpcGarden', `Synced ${this.remotePlans.size} garden plan(s)`);
      },
      (error) => {
        console.error('[NpcGarden] Snapshot error:', error);
      }
    );

    this.isListening = true;
    debugLog('NpcGarden', 'Started real-time listener');
  }

  stopListening(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isListening = false;
  }

  destroy(): void {
    this.stopListening();
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    this.listeners.clear();
  }

  /** Subscribe to plan changes. Returns an unsubscribe function. */
  onPlansChanged(callback: PlanListener): () => void {
    this.listeners.add(callback);
    if (this.lastKnownPlans.size > 0) {
      callback(this.lastKnownPlans);
    }
    return () => this.listeners.delete(callback);
  }

  /** The remote plan for a gardener, if any has been synced. */
  getPlan(npcId: string): NpcGardenPlanDoc | undefined {
    return this.lastKnownPlans.get(npcId);
  }

  /**
   * Report a friendship level reached with a gardener. gardenLevel merges as
   * a MAX inside a transaction — it can only ever grow, so two players
   * levelling different gardeners never fight and a new player can never
   * wither the garden. Optionally also sets the current request (last
   * writer wins; one crop per gardener at a time).
   */
  async reportGardenProgress(
    npcId: string,
    level: number,
    requestedCrop?: string | null
  ): Promise<boolean> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return false;
    }

    try {
      const db = getFirebaseDb();
      const planRef = doc(db, GARDENS_COLLECTION, npcId);
      const clampedLevel = Math.max(1, Math.min(9, Math.floor(level)));

      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(planRef);
        const existing = snapshot.exists() ? (snapshot.data() as NpcGardenPlanDoc) : null;
        const nextLevel = Math.max(existing?.gardenLevel ?? 1, clampedLevel);

        const next: NpcGardenPlanDoc = {
          npcId,
          gardenLevel: nextLevel,
          requestedCrop:
            requestedCrop !== undefined ? requestedCrop : (existing?.requestedCrop ?? null),
          updatedBy: authService.getUserId(),
          updatedAt: serverTimestamp(),
        };

        if (snapshot.exists()) {
          tx.update(planRef, next as unknown as { [x: string]: unknown });
        } else {
          tx.set(planRef, next as unknown as { [x: string]: unknown });
        }
      });

      // Optimistic local update so our own level-ups take effect without
      // waiting for the snapshot echo.
      const current = this.lastKnownPlans.get(npcId);
      this.lastKnownPlans.set(npcId, {
        npcId,
        gardenLevel: Math.max(current?.gardenLevel ?? 1, clampedLevel),
        requestedCrop:
          requestedCrop !== undefined ? requestedCrop : (current?.requestedCrop ?? null),
        updatedBy: authService.getUserId(),
        updatedAt: serverTimestamp(),
      });
      this.listeners.forEach((cb) => cb(this.lastKnownPlans));

      debugLog('NpcGarden', `Reported ${npcId} garden level ${clampedLevel}`);
      return true;
    } catch (error) {
      console.error('[NpcGarden] Failed to report garden progress:', error);
      return false;
    }
  }

  /**
   * Seed initial plan documents (level 1) for a gardener so the collection
   * exists and reads are predictable. Idempotent — only writes when absent.
   */
  async ensurePlan(npcId: string): Promise<void> {
    if (!isFirebaseInitialized() || !authService.isAuthenticated()) return;
    if (this.lastKnownPlans.has(npcId)) return;

    try {
      const db = getFirebaseDb();
      const planRef = doc(db, GARDENS_COLLECTION, npcId);
      await setDoc(
        planRef,
        {
          npcId,
          gardenLevel: 1,
          requestedCrop: null,
          updatedBy: authService.getUserId(),
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    } catch {
      // A race with another client creating it is fine — Firestore rejects
      // the overwrite of an existing doc only without merge; we use setDoc
      // merge:false deliberately and ignore the failure.
    }
  }
}

export const npcGardenService = new NpcGardenService();
