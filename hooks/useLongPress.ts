/**
 * useLongPress — touch's stand-in for right-click, as React event props.
 *
 * Right-click is a real game input here (emote wheel, inventory actions, the world
 * context menu). Touch devices have no right-click, so every one of those surfaces needs
 * the same hold gesture. This hook is that gesture, once.
 *
 * The pointer-down handlers are attached per element; `consumeTap` is what the element's
 * own `onClick` must consult first, because the browser still synthesises a click after
 * the hold. See `utils/longPress.ts` for the drift tolerance the tracker applies.
 *
 * Usage:
 *   const longPress = useLongPress((x, y) => openMenu(x, y));
 *   <button {...longPress.handlers} onClick={(e) => { if (longPress.consumeTap()) return; ... }} />
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createLongPressTracker } from '../utils/longPress';

export interface UseLongPressResult {
  /** Spread onto the element that should respond to a hold. */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
  };
  /** Call first in the element's onClick: true means the click was the tail of a hold. */
  consumeTap: () => boolean;
}

export function useLongPress(
  onLongPress: (x: number, y: number) => void,
  enabled: boolean = true
): UseLongPressResult {
  // The callback is read at fire time, so a caller that rebuilds it every render
  // does not restart the tracker mid-hold.
  const callbackRef = useRef(onLongPress);
  callbackRef.current = onLongPress;

  const tracker = useMemo(
    () => createLongPressTracker({ onLongPress: (x, y) => callbackRef.current(x, y) }),
    []
  );

  // A component unmounting mid-hold (a modal closing under the finger) must not fire.
  useEffect(() => tracker.cancel, [tracker]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const touch = e.touches[0];
      if (!touch) return;
      tracker.start(touch.clientX, touch.clientY);
    },
    [enabled, tracker]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      tracker.move(touch.clientX, touch.clientY);
    },
    [tracker]
  );

  const onTouchEnd = useCallback(() => tracker.cancel(), [tracker]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
    },
    consumeTap: tracker.consumeTap,
  };
}
