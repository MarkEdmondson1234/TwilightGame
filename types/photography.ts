/**
 * Photography types
 *
 * Types for the camera and photo album feature.
 */

/**
 * A single photograph taken by the player.
 * Stored in inventory until sent to the album.
 */
export interface Photo {
  /** Unique identifier, e.g. 'photo_1714000000000' */
  id: string;
  /** Base64 JPEG data URL (compressed, ~15–30 KB each) */
  dataUrl: string;
  /** Editable display name; default 'Photo #N' */
  photoName: string;
  /** Exposure number (1–24 per roll) */
  exposureNumber: number;
  /** Unix timestamp when the photo was taken */
  takenAt: number;
}
