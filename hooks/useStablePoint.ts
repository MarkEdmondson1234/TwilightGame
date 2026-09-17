import { useRef } from 'react';

/**
 * Return the same object for as long as its x/y are unchanged.
 *
 * For values that are recomputed as fresh objects on every render (a room
 * transform derived from the player position, say) but that effects depend on
 * by identity. Without this, an effect keyed on such an object re-runs every
 * frame while the player walks even though the numbers have not moved — which
 * is how the whole PixiJS scene came to be rebuilt per frame
 * (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §3.1).
 *
 * The ref is written during render, not in an effect, so the stable value is
 * available to the same render's effects.
 */
export function useStablePoint<T extends { x: number; y: number } | undefined>(point: T): T {
  const ref = useRef<T>(point);
  const prev = ref.current;
  if (prev !== point && (!prev || !point || prev.x !== point.x || prev.y !== point.y)) {
    ref.current = point;
  }
  return ref.current;
}
