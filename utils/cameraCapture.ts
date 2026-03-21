/**
 * cameraCapture — Game viewport screenshot utility
 *
 * Captures the PixiJS WebGL canvas and compresses it to a JPEG data URL
 * suitable for storage in localStorage (~15–30 KB per photo).
 *
 * Why canvas-direct capture instead of html-to-image:
 * - The PixiJS canvas renders the complete game world already.
 * - Capturing the canvas excludes HUD chrome, which is desirable for photos.
 * - No extra dependency needed; avoids WebGL cross-origin issues.
 */

import { CAMERA } from '../constants';

/**
 * Capture the PixiJS game canvas and return a compressed JPEG data URL.
 *
 * @param canvas - The HTMLCanvasElement used by PixiJS (canvasRef.current)
 * @returns A base64-encoded JPEG data URL (~15–30 KB)
 */
export async function captureGameViewport(canvas: HTMLCanvasElement): Promise<string> {
  // Calculate target dimensions (maintain aspect ratio)
  const targetWidth = CAMERA.CAPTURE_WIDTH;
  const aspectRatio = canvas.height / canvas.width;
  const targetHeight = Math.round(targetWidth * aspectRatio);

  // Draw onto an offscreen canvas at reduced size
  const offscreen = document.createElement('canvas');
  offscreen.width = targetWidth;
  offscreen.height = targetHeight;

  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('[cameraCapture] Could not get 2D context for offscreen canvas');
  }

  // drawImage handles smooth downscaling
  ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  return offscreen.toDataURL('image/jpeg', CAMERA.JPEG_QUALITY);
}
