/**
 * Painting Image Service
 *
 * Handles the full lifecycle of painting images:
 * 1. Client-side validation and processing (resize, compress to WebP base64)
 * 2. localStorage persistence (offline/unauthenticated fallback)
 * 3. Orchestration with Firestore cloud storage (via firebase/paintingStorage)
 *
 * Images are stored as base64 data URLs (~40-110KB each after 512x512 WebP compression).
 */

import { isFirebaseLoaded, getPaintingStorageService } from '../firebase/safe';
import { reportErrorOnce, reportMessageOnce } from './errorReporting';
import { debugLog } from './debugLog';

// ===== Constants =====

const MAX_RAW_FILE_SIZE = 5 * 1024 * 1024; // 5MB raw input limit
const MAX_DIMENSION = 512; // Max width/height after resize
const WEBP_QUALITY = 0.8;
const LOCAL_STORAGE_PREFIX = 'twilight_painting_';
export const LOCAL_PAINTING_LIMIT = 100;

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// ===== Validation =====

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { valid: false, error: 'Please select a PNG, JPEG, or WebP image.' };
  }
  if (file.size > MAX_RAW_FILE_SIZE) {
    return { valid: false, error: 'Image must be under 5MB.' };
  }
  return { valid: true };
}

// ===== Image Processing =====

/**
 * Resize and compress an image file to a base64 data URL.
 * Output: max 512x512, WebP at 80% quality (~30-80KB).
 * Falls back to PNG if WebP is not supported.
 */
export function processImageForStorage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      // Calculate scaled dimensions (preserve aspect ratio)
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP, fall back to PNG
      let dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY);
      if (!dataUrl.startsWith('data:image/webp')) {
        // Browser doesn't support WebP export (old Safari) — use PNG
        dataUrl = canvas.toDataURL('image/png');
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image.'));
    };

    img.src = blobUrl;
  });
}

/** Estimate base64 data URL size in KB */
export function getImageSizeKB(dataUrl: string): number {
  // base64 is ~4/3 the size of raw bytes; data URL prefix adds ~30 chars
  const base64Part = dataUrl.split(',')[1] ?? '';
  return (base64Part.length * 3) / 4 / 1024;
}

// ===== localStorage Backend =====

export function saveImageLocally(paintingId: string, dataUrl: string): boolean {
  if (getLocalPaintingCount() >= LOCAL_PAINTING_LIMIT) {
    console.warn(
      `[PaintingImageService] localStorage limit reached (${LOCAL_PAINTING_LIMIT} paintings)`
    );
    return false;
  }
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${paintingId}`, dataUrl);
    return true;
  } catch (e) {
    console.warn('[PaintingImageService] localStorage write failed:', e);
    return false;
  }
}

export function loadImageLocally(paintingId: string): string | null {
  return localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${paintingId}`);
}

export function deleteImageLocally(paintingId: string): void {
  localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${paintingId}`);
}

export function getLocalPaintingCount(): number {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LOCAL_STORAGE_PREFIX)) count++;
  }
  return count;
}

// ===== Orchestration (local + cloud) =====

/** The encoding a data URL carries — `image/webp` normally, `image/png` where
 * the browser could not encode WebP. Reported with failures because a PNG is
 * several times the size and is what pushes a picture past the Firestore cap. */
function dataUrlFormat(dataUrl: string): string {
  const match = /^data:([^;,]+)/.exec(dataUrl);
  return match?.[1] ?? 'unknown';
}

/**
 * Save a painting image to localStorage and (if authenticated) Firestore.
 * Returns the data URL string.
 *
 * A picture that stays local is invisible to every other player, and the
 * failure used to be silent: `saveImage()` returned false when nobody was
 * signed in (which is the case for the first seconds of every session, while
 * Firebase restores the account) and the game carried on. So every outcome
 * that leaves the cloud without the picture is said out loud and reported.
 */
export async function savePaintingImage(
  paintingId: string,
  dataUrl: string,
  name: string
): Promise<string> {
  // Always save locally first (fast, works offline)
  const localOk = saveImageLocally(paintingId, dataUrl);
  if (!localOk) {
    console.warn('[PaintingImageService] Could not save locally — localStorage full');
  }

  const sizeKB = Math.round(getImageSizeKB(dataUrl));
  const details = { paintingId, name, sizeKB, format: dataUrlFormat(dataUrl) };

  if (!isFirebaseLoaded()) {
    // Either no Firebase at all (a legitimately offline game) or the dynamic
    // import has not settled yet. Not reported: without Firebase there is no
    // Sentry either, and the loaded-but-signed-out case below is the one that
    // actually happens to players.
    debugLog('PaintingImageService', `"${name}" kept local only: Firebase not loaded`);
    return dataUrl;
  }

  const storage = getPaintingStorageService();
  const result = await storage.saveImage(paintingId, dataUrl, name);
  if (result.status === 'signed-out') {
    console.warn(
      `[PaintingImageService] "${name}" was not uploaded: not signed in. Other players will not see it.`
    );
    reportMessageOnce('Painting image not uploaded: not signed in', 'persistence', details);
  } else if (result.status === 'error') {
    console.warn(
      `[PaintingImageService] "${name}" was not uploaded (${sizeKB} KB). Other players will not see it.`
    );
    reportErrorOnce(result.error, 'persistence', details);
  }

  return dataUrl;
}

/** Where a picture came from, or why it did not. */
export type PaintingLoadReason =
  | 'local'
  | 'shared'
  | 'legacy'
  | 'missing'
  | 'signed-out'
  | 'firebase-not-loaded'
  | 'error';

export interface PaintingLoadOutcome {
  dataUrl: string | null;
  reason: PaintingLoadReason;
}

/**
 * Load a painting image and say where it came from. Tries localStorage first,
 * then Firestore. The reason is what turns "I can't see her wreath" into a
 * diagnosis: `missing` means the picture was never uploaded by whoever made it,
 * `signed-out` means *we* could not ask for it yet.
 */
export async function loadPaintingImageDetailed(paintingId: string): Promise<PaintingLoadOutcome> {
  const local = loadImageLocally(paintingId);
  if (local) return { dataUrl: local, reason: 'local' };

  if (!isFirebaseLoaded()) return { dataUrl: null, reason: 'firebase-not-loaded' };

  const storage = getPaintingStorageService();
  const result = await storage.loadImage(paintingId);
  if (result.status === 'found') {
    // Cache locally for next time
    saveImageLocally(paintingId, result.dataUrl);
    return { dataUrl: result.dataUrl, reason: result.source };
  }
  if (result.status === 'error') {
    reportErrorOnce(result.error, 'persistence', { paintingId, action: 'load' });
  }
  return { dataUrl: null, reason: result.status };
}

/**
 * Load a painting image. Tries localStorage first, then Firestore.
 */
export async function loadPaintingImage(paintingId: string): Promise<string | null> {
  return (await loadPaintingImageDetailed(paintingId)).dataUrl;
}

/**
 * Delete a painting image from both localStorage and Firestore.
 */
export async function deletePaintingImage(paintingId: string): Promise<void> {
  deleteImageLocally(paintingId);

  if (isFirebaseLoaded()) {
    try {
      const storage = getPaintingStorageService();
      await storage.deleteImage(paintingId);
    } catch (e) {
      console.warn('[PaintingImageService] Cloud delete failed:', e);
    }
  }
}

/**
 * Sync painting images from Firestore to localStorage.
 * Called during game init to ensure cross-device availability.
 */
export async function syncPaintingsFromCloud(): Promise<void> {
  if (!isFirebaseLoaded()) return;

  try {
    const storage = getPaintingStorageService();
    const cloudImages = await storage.loadAllImages();

    let synced = 0;
    for (const [paintingId, dataUrl] of cloudImages.entries()) {
      // Only cache locally if not already present
      if (!loadImageLocally(paintingId)) {
        saveImageLocally(paintingId, dataUrl);
        synced++;
      }
    }

    if (synced > 0) {
      debugLog('PaintingImageService', `Synced ${synced} painting(s) from cloud`);
    }
  } catch (e) {
    console.warn('[PaintingImageService] Cloud sync failed:', e);
    // A failed sync quietly strands paintings on one device; once per session.
    reportErrorOnce(e, 'persistence', { service: 'paintings' }, 'paintings:sync');
  }
}
