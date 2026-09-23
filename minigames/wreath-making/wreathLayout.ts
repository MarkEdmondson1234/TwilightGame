/**
 * Wreath Making mini-game — which layout to use, and how big the canvas is.
 *
 * The desktop workshop is three columns (gallery · wreath · tools) about 1100px
 * wide. On a phone those wrapped into one long column with the Create button
 * and the editing tools scrolled far below the wreath, and 26px buttons (issue
 * #157). Narrow or touch screens get a stacked layout instead: the wreath fitted
 * to the width, a scrollable strip of flowers, a bottom sheet of tools and a
 * sticky bar of actions (`CompactWreathWorkshop.tsx`).
 *
 * Pure so the breakpoints can be tested without a browser.
 */

import { useEffect, useState } from 'react';
import { WREATH_CANVAS_SIZE } from './wreathConstants';

/** Below this width the three desktop columns no longer fit side by side. */
export const COMPACT_MAX_WIDTH = 900;
/** Touch screens up to this width (an iPad in landscape) also get the compact layout. */
export const COMPACT_TOUCH_MAX_WIDTH = 1366;
/** Apple/WCAG minimum comfortable touch target. */
export const MIN_TOUCH_TARGET = 44;
/** Side gutter around the compact canvas. */
export const COMPACT_GUTTER = 12;
/** Widest the compact column grows (tablets), so the strip and bar stay in reach. */
export const COMPACT_MAX_COLUMN = 640;
/**
 * Vertical space the compact layout reserves for everything but the canvas:
 * header, one-line hint, status line, flower strip, tool sheet and action bar.
 * Fixed rather than measured so the wreath does not jump in size when the tool
 * sheet opens.
 */
export const COMPACT_CHROME_HEIGHT = 330;
/** Never shrink the canvas below this, even in a short landscape phone. */
export const COMPACT_MIN_CANVAS = 220;

export interface WreathLayoutInput {
  width: number;
  height: number;
  /** `(pointer: coarse)` — a finger rather than a mouse is the primary pointer. */
  coarsePointer: boolean;
}

export interface WreathLayout {
  compact: boolean;
  /** On-screen scale applied to the 480px wreath canvas. */
  canvasScale: number;
}

export function getWreathLayout({ width, height, coarsePointer }: WreathLayoutInput): WreathLayout {
  const compact = width < COMPACT_MAX_WIDTH || (coarsePointer && width <= COMPACT_TOUCH_MAX_WIDTH);

  if (!compact) {
    // Unchanged desktop sizing
    return {
      compact,
      canvasScale: Math.min(
        1,
        Math.max(0.4, Math.min(width * 0.9 - 40, height * 0.9 - 100) / WREATH_CANVAS_SIZE)
      ),
    };
  }

  const fitWidth = Math.min(width, COMPACT_MAX_COLUMN) - COMPACT_GUTTER * 2;
  const fitHeight = Math.max(COMPACT_MIN_CANVAS, height - COMPACT_CHROME_HEIGHT);
  const size = Math.max(0, Math.min(fitWidth, fitHeight));
  return { compact, canvasScale: Math.min(1, size / WREATH_CANVAS_SIZE) };
}

function readInput(): WreathLayoutInput {
  let coarsePointer = false;
  try {
    coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  } catch {
    // Older WebViews without matchMedia — width alone decides.
  }
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    coarsePointer,
  };
}

/** Live layout for the current viewport; follows rotation and window resizes. */
export function useWreathLayout(): WreathLayout {
  const [input, setInput] = useState(readInput);
  useEffect(() => {
    const update = () => setInput(readInput());
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);
  return getWreathLayout(input);
}
