/**
 * useViewportScale - Calculate scale factor for viewport-relative rendering
 *
 * For background-image rooms, we want the game content to scale to fit the
 * viewport while maintaining aspect ratio. This hook calculates a scale factor
 * based on the current viewport size vs the "reference" viewport size the
 * content was designed for.
 *
 * Example:
 * - Shop was designed for 1920x1080 viewport with 1200x675 image
 * - On a 2560x1440 monitor, viewportScale = 1.33 (1440/1080)
 * - The image becomes 1600x900, filling more of the screen
 *
 * Usage:
 *   const { viewportScale, scaledDimensions } = useViewportScale({
 *     referenceWidth: 1920,
 *     referenceHeight: 1080,
 *     contentWidth: 1200,
 *     contentHeight: 675,
 *   });
 */

import { useState, useEffect, useMemo } from 'react';

export interface ViewportScaleConfig {
  /** Reference viewport width the content was designed for */
  referenceWidth: number;
  /** Reference viewport height the content was designed for */
  referenceHeight: number;
  /** Optional: Content dimensions to scale (e.g., background image) */
  contentWidth?: number;
  contentHeight?: number;
  /** Minimum scale factor (default: 0.5) */
  minScale?: number;
  /** Maximum scale factor (default: 2.0) */
  maxScale?: number;
}

export interface ViewportScaleResult {
  /** Scale factor to apply to all content */
  viewportScale: number;
  /** Current viewport dimensions */
  viewport: { width: number; height: number };
  /** Scaled content dimensions (if contentWidth/Height provided) */
  scaledContent?: { width: number; height: number };
  /** Offset to center content in viewport */
  centerOffset: { x: number; y: number };
}

/**
 * Calculate viewport scale to fit content within viewport while maintaining aspect ratio
 *
 * @param viewportWidth - Current viewport width
 * @param viewportHeight - Current viewport height
 * @param referenceWidth - Reference viewport width content was designed for
 * @param referenceHeight - Reference viewport height content was designed for
 * @param minScale - Minimum allowed scale (default: 0.5)
 * @param maxScale - Maximum allowed scale (default: 2.0)
 * @returns Scale factor to apply
 */
export function calculateViewportScale(
  viewportWidth: number,
  viewportHeight: number,
  referenceWidth: number,
  referenceHeight: number,
  minScale: number = 0.5,
  maxScale: number = 2.0
): number {
  // Calculate scale needed to fit both dimensions
  const scaleX = viewportWidth / referenceWidth;
  const scaleY = viewportHeight / referenceHeight;

  // Use the smaller scale to ensure content fits (contain behavior)
  const scale = Math.min(scaleX, scaleY);

  // Clamp to min/max bounds
  return Math.max(minScale, Math.min(maxScale, scale));
}

/**
 * React hook for viewport-relative scaling
 *
 * Automatically updates when viewport resizes.
 */
export function useViewportScale(config: ViewportScaleConfig): ViewportScaleResult {
  const {
    referenceWidth,
    referenceHeight,
    contentWidth,
    contentHeight,
    minScale = 0.5,
    maxScale = 2.0,
  } = config;

  // Track viewport dimensions
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : referenceWidth,
    height: typeof window !== 'undefined' ? window.innerHeight : referenceHeight,
  });

  // Update on resize
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate scale and derived values
  const result = useMemo((): ViewportScaleResult => {
    const viewportScale = calculateViewportScale(
      viewport.width,
      viewport.height,
      referenceWidth,
      referenceHeight,
      minScale,
      maxScale
    );

    // Calculate scaled content dimensions if provided
    let scaledContent: { width: number; height: number } | undefined;
    if (contentWidth !== undefined && contentHeight !== undefined) {
      scaledContent = {
        width: contentWidth * viewportScale,
        height: contentHeight * viewportScale,
      };
    }

    // Calculate center offset for scaled content
    const scaledWidth = scaledContent?.width ?? referenceWidth * viewportScale;
    const scaledHeight = scaledContent?.height ?? referenceHeight * viewportScale;
    const centerOffset = {
      x: (viewport.width - scaledWidth) / 2,
      y: (viewport.height - scaledHeight) / 2,
    };

    return {
      viewportScale,
      viewport,
      scaledContent,
      centerOffset,
    };
  }, [viewport, referenceWidth, referenceHeight, contentWidth, contentHeight, minScale, maxScale]);

  return result;
}

/**
 * Default reference viewport - a common 1080p display
 * Maps can override this with their own referenceViewport
 */
export const DEFAULT_REFERENCE_VIEWPORT = {
  width: 1920,
  height: 1080,
};
