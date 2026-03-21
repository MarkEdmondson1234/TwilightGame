/**
 * PhotoAlbumManager — Single Source of Truth for album photos
 *
 * Manages photos that have been sent to the album (permanently saved).
 * In-inventory photos are tracked by InventoryManager; only photos sent
 * to the album are persisted here.
 *
 * Follows the same singleton + characterData pattern as DecorationManager.
 */

import { Photo } from '../types';
import { characterData } from './CharacterData';
import { eventBus, GameEvent } from './EventBus';

class PhotoAlbumManagerClass {
  private photos: Map<string, Photo> = new Map();
  private initialised = false;

  // ============================================================
  // Initialisation
  // ============================================================

  initialise(): void {
    if (this.initialised) return;

    const saved = characterData.loadPhotos();
    saved.forEach((photo) => this.photos.set(photo.id, photo));

    this.initialised = true;
    console.log(`[PhotoAlbumManager] Initialised with ${this.photos.size} album photo(s)`);
  }

  // ============================================================
  // Album operations
  // ============================================================

  /**
   * Add a photo to the album and persist.
   * Called when the player clicks "Send to Album" in the PhotoViewer.
   */
  addToAlbum(photo: Photo): void {
    this.photos.set(photo.id, { ...photo });
    this.save();

    eventBus.emit(GameEvent.PHOTO_SENT_TO_ALBUM, {
      photo,
      albumSize: this.photos.size,
    });

    console.log(`[PhotoAlbumManager] Added photo "${photo.photoName}" (album size: ${this.photos.size})`);
  }

  /**
   * Update the display name of an album photo.
   */
  updatePhotoName(photoId: string, newName: string): void {
    const photo = this.photos.get(photoId);
    if (!photo) {
      console.warn(`[PhotoAlbumManager] Photo not found: ${photoId}`);
      return;
    }
    this.photos.set(photoId, { ...photo, photoName: newName });
    this.save();
  }

  /**
   * Remove a photo from the album (not currently exposed in UI but available for future use).
   */
  removeFromAlbum(photoId: string): boolean {
    if (!this.photos.has(photoId)) return false;
    this.photos.delete(photoId);
    this.save();
    console.log(`[PhotoAlbumManager] Removed photo ${photoId}`);
    return true;
  }

  // ============================================================
  // Queries
  // ============================================================

  /** All album photos sorted by date taken (oldest first). */
  getAlbumPhotos(): Photo[] {
    return Array.from(this.photos.values()).sort((a, b) => a.takenAt - b.takenAt);
  }

  getAlbumSize(): number {
    return this.photos.size;
  }

  getPhoto(photoId: string): Photo | undefined {
    return this.photos.get(photoId);
  }

  // ============================================================
  // Persistence
  // ============================================================

  private save(): void {
    characterData.savePhotos(this.getAlbumPhotos());
  }

  // ============================================================
  // Reset (new game)
  // ============================================================

  reset(): void {
    this.photos.clear();
    this.initialised = false;
    this.save();
    console.log('[PhotoAlbumManager] Reset');
  }
}

export const photoAlbumManager = new PhotoAlbumManagerClass();
