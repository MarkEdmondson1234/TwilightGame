/**
 * Painting Storage Service (Firestore)
 *
 * Stores painting image data as base64 data URLs in Firestore.
 * One document per painting at: users/{userId}/paintings/{paintingId}
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

// Firestore path: users/{userId}/paintings/{paintingId}
function paintingsCollection(userId: string): string {
  return `users/${userId}/paintings`;
}

function paintingDoc(userId: string, paintingId: string): string {
  return `users/${userId}/paintings/${paintingId}`;
}

class PaintingStorageService {
  /**
   * Save a painting image to Firestore.
   * Returns true on success, false on failure.
   */
  async saveImage(paintingId: string, dataUrl: string, name: string): Promise<boolean> {
    const userId = this.getUserId();
    if (!userId) return false;

    try {
      const db = getFirebaseDb();
      const ref = doc(db, paintingDoc(userId, paintingId));
      await setDoc(ref, {
        imageData: dataUrl,
        name,
        createdAt: serverTimestamp(),
      });
      console.log(`[PaintingStorage] Saved painting "${name}" to Firestore`);
      return true;
    } catch (e) {
      console.warn('[PaintingStorage] Save failed:', e);
      return false;
    }
  }

  /**
   * Load a single painting image from Firestore.
   */
  async loadImage(paintingId: string): Promise<string | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    try {
      const db = getFirebaseDb();
      const ref = doc(db, paintingDoc(userId, paintingId));
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return (snap.data().imageData as string) ?? null;
    } catch (e) {
      console.warn('[PaintingStorage] Load failed:', e);
      return null;
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
      const ref = doc(db, paintingDoc(userId, paintingId));
      await deleteDoc(ref);
      console.log(`[PaintingStorage] Deleted painting ${paintingId} from Firestore`);
    } catch (e) {
      console.warn('[PaintingStorage] Delete failed:', e);
    }
  }

  /**
   * Load all painting images for the current user.
   * Returns a Map of paintingId → base64 data URL.
   */
  async loadAllImages(): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const userId = this.getUserId();
    if (!userId) return result;

    try {
      const db = getFirebaseDb();
      const collRef = collection(db, paintingsCollection(userId));
      const snapshot = await getDocs(collRef);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.imageData) {
          result.set(docSnap.id, data.imageData as string);
        }
      }
      console.log(`[PaintingStorage] Loaded ${result.size} painting(s) from Firestore`);
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
