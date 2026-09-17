/**
 * Painting Storage Service (Firestore)
 *
 * Stores painting image data as base64 data URLs in Firestore.
 * One document per painting at: shared/world/paintings/{paintingId}
 *
 * Paintings are *shared*, not private. A painting hung on a wall in a shared map
 * is a placed item that carries only its paintingId — the image itself has to be
 * loadable by whoever is looking at the wall, or the other player sees an empty
 * frame. Sharing the collection is also the point: a picture you painted being
 * seen by somebody else is most of why you painted it.
 *
 * Reads fall back to the old private path (users/{userId}/paintings) so
 * paintings made before this change still load for the person who made them.
 * Nothing is migrated eagerly; a painting moves to the shared collection the
 * next time it is saved.
 *
 * Images are pre-compressed to 512x512 WebP (~40-110KB as base64),
 * well within Firestore's 1MB document size limit.
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { debugLog } from '../utils/debugLog';

/**
 * Why a save or load did not produce a picture. Every outcome is named, because
 * each one has led to "she can see the wreath and I can't" and the old
 * `false`/`null` returns made them indistinguishable from each other and from
 * an offline game — see utils/paintingImageService.ts for who reports what.
 */
export type PaintingSaveResult =
  | { status: 'saved' }
  /** Firebase is up but nobody is signed in: the picture stays local only. */
  | { status: 'signed-out' }
  | { status: 'error'; error: unknown };

export type PaintingLoadResult =
  | { status: 'found'; dataUrl: string; source: 'shared' | 'legacy' }
  /** Neither the shared nor the legacy document exists — never uploaded. */
  | { status: 'missing' }
  | { status: 'signed-out' }
  | { status: 'error'; error: unknown };

// Firestore path: shared/world/paintings/{paintingId}
const SHARED_PAINTINGS_COLLECTION = 'shared/world/paintings';

function sharedPaintingDoc(paintingId: string): string {
  return `${SHARED_PAINTINGS_COLLECTION}/${paintingId}`;
}

// Legacy private path, still read so older paintings are not lost.
function legacyPaintingsCollection(userId: string): string {
  return `users/${userId}/paintings`;
}

function legacyPaintingDoc(userId: string, paintingId: string): string {
  return `users/${userId}/paintings/${paintingId}`;
}

class PaintingStorageService {
  /** Save a painting image to Firestore. Never throws; the result says why not. */
  async saveImage(paintingId: string, dataUrl: string, name: string): Promise<PaintingSaveResult> {
    const userId = this.getUserId();
    if (!userId) return { status: 'signed-out' };

    try {
      const db = getFirebaseDb();
      const ref = doc(db, sharedPaintingDoc(paintingId));
      await setDoc(ref, {
        imageData: dataUrl,
        name,
        paintedByUid: userId,
        createdAt: serverTimestamp(),
      });
      debugLog('PaintingStorage', `Saved painting "${name}" to Firestore`);
      return { status: 'saved' };
    } catch (e) {
      console.warn('[PaintingStorage] Save failed:', e);
      return { status: 'error', error: e };
    }
  }

  /** Load a single painting image from Firestore. Never throws; the result says why not. */
  async loadImage(paintingId: string): Promise<PaintingLoadResult> {
    const userId = this.getUserId();
    if (!userId) return { status: 'signed-out' };

    try {
      const db = getFirebaseDb();
      const shared = await getDoc(doc(db, sharedPaintingDoc(paintingId)));
      const sharedData = shared.exists() ? (shared.data().imageData as string | undefined) : null;
      if (sharedData) return { status: 'found', dataUrl: sharedData, source: 'shared' };

      // Painted before paintings were shared — still ours to load.
      const legacy = await getDoc(doc(db, legacyPaintingDoc(userId, paintingId)));
      const legacyData = legacy.exists() ? (legacy.data().imageData as string | undefined) : null;
      if (legacyData) return { status: 'found', dataUrl: legacyData, source: 'legacy' };

      return { status: 'missing' };
    } catch (e) {
      console.warn('[PaintingStorage] Load failed:', e);
      return { status: 'error', error: e };
    }
  }

  /**
   * Delete a painting image from Firestore.
   */
  async deleteImage(paintingId: string): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    try {
      const db = getFirebaseDb();
      // Delete from both, so a painting made before the move does not come back
      // from the legacy path the next time it is loaded.
      await deleteDoc(doc(db, sharedPaintingDoc(paintingId)));
      await deleteDoc(doc(db, legacyPaintingDoc(userId, paintingId)));
      debugLog('PaintingStorage', `Deleted painting ${paintingId} from Firestore`);
    } catch (e) {
      console.warn('[PaintingStorage] Delete failed:', e);
    }
  }

  /**
   * Load every painting image anyone has made, plus any of ours still on the
   * legacy private path. Returns a Map of paintingId → base64 data URL.
   */
  async loadAllImages(): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const userId = this.getUserId();
    if (!userId) return result;

    try {
      const db = getFirebaseDb();
      const collections = [
        collection(db, SHARED_PAINTINGS_COLLECTION),
        collection(db, legacyPaintingsCollection(userId)),
      ];

      for (const collRef of collections) {
        const snapshot = await getDocs(collRef);
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          // Shared wins: a painting that has been re-saved exists in both, and
          // the shared copy is the newer one.
          if (data.imageData && !result.has(docSnap.id)) {
            result.set(docSnap.id, data.imageData as string);
          }
        }
      }
      debugLog('PaintingStorage', `Loaded ${result.size} painting(s) from Firestore`);
    } catch (e) {
      console.warn('[PaintingStorage] Load all failed:', e);
    }

    return result;
  }

  /**
   * Get the current authenticated user ID, or null if not available.
   */
  private getUserId(): string | null {
    if (!isFirebaseInitialized()) return null;
    if (!authService.isAuthenticated()) return null;
    return authService.getUserId();
  }
}

export const paintingStorageService = new PaintingStorageService();
