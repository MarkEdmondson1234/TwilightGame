import { useSyncExternalStore } from 'react';
import { TOUCH_TINY_MAX_HEIGHT_PX } from '../utils/touchLayout';

/** The same threshold as getTouchLayoutTier's 'tiny', as a media query. */
export const TINY_SCREEN_QUERY = `(max-height: ${TOUCH_TINY_MAX_HEIGHT_PX - 1}px) and (pointer: coarse)`;

function query(): MediaQueryList | null {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(TINY_SCREEN_QUERY)
      : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  const list = query();
  list?.addEventListener?.('change', onChange);
  return () => list?.removeEventListener?.('change', onChange);
}

/**
 * True on a touch screen too short for the regular card and control sizes —
 * a small phone in landscape with the browser's toolbars showing (568x260 in
 * production). See getTouchLayoutTier in utils/touchLayout.ts.
 */
export function useIsTinyTouchScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false
  );
}
