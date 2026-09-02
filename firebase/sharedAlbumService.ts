/**
 * Shared photo album — Firestore.
 *
 * The album book in Mum's kitchen is a shared object: photos anybody sends to
 * the album appear in it for everyone. That is the whole point of an album in a
 * house two people live in — a private one would just be the inventory again.
 *
 * Photos are ~15–30 KB base64, well inside Firestore's 1 MB document limit, so
 * each one is a document with its image inline. Unlike hung paintings there is
 * no separate image store to hydrate from: the album is a list you open
 * deliberately, not something re-read on every world snapshot.
 *
 * Nothing here throws to callers.
 */

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { reportError } from '../utils/errorReporting';
import type { Photo } from '../types/photography';

const ALBUM_COLLECTION = 'shared/world/albumPhotos';

/** One photo as the album shows it. */
export interface AlbumEntry {
  id: string;
  photoName: string;
  dataUrl: string;
  takenAt: number;
  /** Display name of whoever took it — the album is a shared record of who saw what */
  byName: string;
  byUid: string;
}

function decodeEntry(id: string, raw: unknown): AlbumEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.dataUrl !== 'string' || !d.dataUrl.startsWith('data:')) return null;

  return {
    id,
    photoName: typeof d.photoName === 'string' ? d.photoName : 'Photo',
    dataUrl: d.dataUrl,
    takenAt: typeof d.takenAt === 'number' ? d.takenAt : 0,
    byName: typeof d.byName === 'string' ? d.byName : 'Someone',
    byUid: typeof d.byUid === 'string' ? d.byUid : '',
  };
}

class SharedAlbumService {
  private unsubscribe: Unsubscribe | null = null;
  private entries = new Map<string, AlbumEntry>();
  private listeners = new Set<() => void>();
  private reportedFailure = false;

  isAvailable(): boolean {
    return isFirebaseInitialized() && authService.isAuthenticated();
  }

  /** Notified when the album changes. */
  onChange(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  #emit(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (error) {
        console.warn('[Album] Listener threw:', error);
      }
    }
  }

  /**
   * Start mirroring the album. Called when the book is opened rather than at
   * startup: the album can be megabytes of photographs, and nobody should pay
   * for that until they actually look at it.
   */
  startListening(): boolean {
    if (this.unsubscribe) return true;
    if (!this.isAvailable()) return false;

    try {
      this.unsubscribe = onSnapshot(
        collection(getFirebaseDb(), ALBUM_COLLECTION),
        (snapshot) => {
          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') {
              this.entries.delete(change.doc.id);
              continue;
            }
            const entry = decodeEntry(change.doc.id, change.doc.data());
            if (entry) this.entries.set(entry.id, entry);
          }
          this.#emit();
        },
        (error) => {
          console.warn('[Album] Listener failed:', error);
          reportError(error, 'shared_farm', { feature: 'album' });
        }
      );
      return true;
    } catch (error) {
      console.warn('[Album] Failed to start listening:', error);
      reportError(error, 'shared_farm', { feature: 'album' });
      return false;
    }
  }

  stopListening(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Everything in the album, newest first. */
  getEntries(): AlbumEntry[] {
    return [...this.entries.values()].sort((a, b) => b.takenAt - a.takenAt);
  }

  /** Put a photo in the album for everyone. */
  async publish(photo: Photo, byName: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await setDoc(doc(getFirebaseDb(), ALBUM_COLLECTION, photo.id), {
        photoName: photo.photoName,
        dataUrl: photo.dataUrl,
        takenAt: photo.takenAt,
        byName: byName.trim().slice(0, 20) || 'Someone',
        byUid: authService.getUserId() ?? '',
        addedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      // Visible to the player: they put a photo in the album and it was not
      // there. Report the first one.
      if (!this.reportedFailure) {
        this.reportedFailure = true;
        console.warn('[Album] Publish failed — the photo was not shared:', error);
        reportError(error, 'shared_farm', { feature: 'album', action: 'publish' });
      }
      return false;
    }
  }

  /** Take a photo back out of the album, whoever put it there. */
  async remove(photoId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await deleteDoc(doc(getFirebaseDb(), ALBUM_COLLECTION, photoId));
      return true;
    } catch (error) {
      console.warn('[Album] Remove failed:', error);
      return false;
    }
  }

  destroy(): void {
    this.stopListening();
    this.listeners.clear();
    this.entries.clear();
  }
}

export const sharedAlbumService = new SharedAlbumService();
