import { EMOTES } from '../multiplayer/emotes';
import React, { useEffect, useRef, useState } from 'react';
import { Z_TOUCH_CONTROLS, zClass } from '../zIndex';
import { DpadPointerTracker, type DpadDirection } from '../utils/dpadPointers';
import {
  DPAD_TOGGLE_OVERHANG_PX,
  DPAD_TOGGLE_SIZE_PX,
  EMOTE_BUTTON_BOTTOM_PX,
  EMOTE_BUTTON_RIGHT_PX,
  EMOTE_BUTTON_SIZE_PX,
  TOUCH_BOTTOM_GAP_PX,
  TOUCH_SIDE_PADDING_PX,
  type TouchLayoutTier,
} from '../utils/touchLayout';
import { setDpadHidden, useDpadHidden } from '../utils/dpadPreference';

type Direction = DpadDirection;

/**
 * Hand-drawn D-pad artwork: one idle frame (no arrow lit) plus one frame per
 * pressed direction. All five render stacked; only the lit one is visible, so
 * switching frames never waits on a decode.
 */
const DPAD_FRAME_STATES = ['idle', 'up', 'down', 'left', 'right'] as const;
const dpadFrameSrc = (state: (typeof DPAD_FRAME_STATES)[number]) =>
  `${import.meta.env.BASE_URL}assets/ui/dpad_${state}.png`;

/** Transparent hit zones over each arrow arm of the artwork (percentages of the square). */
const HIT_ZONES: Record<Direction, React.CSSProperties> = {
  up: { left: '24%', top: 0, width: '52%', height: '46%' },
  down: { left: '24%', bottom: 0, width: '52%', height: '46%' },
  left: { left: 0, top: '24%', width: '46%', height: '52%' },
  right: { right: 0, top: '24%', width: '46%', height: '52%' },
};

interface TouchControlsProps {
  onDirectionPress: (direction: Direction) => void;
  onDirectionRelease: (direction: Direction) => void;
  onEmotePress?: () => void;
  /** Control size for the screen height — see getTouchLayoutTier in utils/touchLayout.ts. */
  tier?: TouchLayoutTier;
}

/** w-28 / w-36 / w-44 must stay literal for Tailwind; they are DPAD_TINY/COMPACT/_SIZE_PX. */
const DPAD_SIZE_CLASS: Record<TouchLayoutTier, string> = {
  tiny: 'w-28 h-28',
  compact: 'w-36 h-36',
  regular: 'w-44 h-44',
};

/**
 * Existing D-pad, with one owning pointer per direction and explicit cancellation.
 *
 * Every path that can end a touch releases its direction (issue #150 — one
 * missed release on iPad walked the player into the nearest wall with the walk
 * cycle still playing, and nothing short of switching apps stopped it): the
 * owner's own up/cancel/lost-capture, the same pointer ending anywhere on the
 * page, a touch ending with no fingers left on the screen, and the page losing
 * focus or visibility. Ownership rules live in `utils/dpadPointers.ts`.
 */
const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onEmotePress,
  tier = 'regular',
}) => {
  const hidden = useDpadHidden();
  const tracker = useRef(new DpadPointerTracker()).current;
  const releaseCallback = useRef(onDirectionRelease);
  releaseCallback.current = onDirectionRelease;
  const [pressed, setPressed] = useState<Direction[]>([]);
  useEffect(() => {
    let mounted = true;
    const emitReleased = (released: Direction[]) => {
      if (released.length === 0) return;
      for (const direction of released) releaseCallback.current(direction);
      if (mounted) setPressed(tracker.held());
    };
    const releaseAll = () => emitReleased(tracker.releaseAll());
    // A pointer can end off its button (capture refused or lost) — match it by id.
    const releasePointer = (e: PointerEvent) => emitReleased(tracker.releasePointer(e.pointerId));
    // Safety net for a pointerup iOS never delivered: no fingers left, nothing held.
    const releaseIfNoTouches = (e: TouchEvent) => {
      if (e.touches.length === 0) releaseAll();
    };
    window.addEventListener('pointerup', releasePointer, true);
    window.addEventListener('pointercancel', releasePointer, true);
    window.addEventListener('touchend', releaseIfNoTouches, true);
    window.addEventListener('touchcancel', releaseIfNoTouches, true);
    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    window.addEventListener('orientationchange', releaseAll);
    document.addEventListener('visibilitychange', releaseAll);
    return () => {
      mounted = false;
      window.removeEventListener('pointerup', releasePointer, true);
      window.removeEventListener('pointercancel', releasePointer, true);
      window.removeEventListener('touchend', releaseIfNoTouches, true);
      window.removeEventListener('touchcancel', releaseIfNoTouches, true);
      window.removeEventListener('blur', releaseAll);
      window.removeEventListener('pagehide', releaseAll);
      window.removeEventListener('orientationchange', releaseAll);
      document.removeEventListener('visibilitychange', releaseAll);
      releaseAll();
    };
  }, [tracker]);
  const release = (direction: Direction, pointerId: number) => {
    if (!tracker.release(direction, pointerId)) return;
    releaseCallback.current(direction);
    setPressed(tracker.held());
  };
  // Only one arrow can be lit at a time — the most recently pressed wins.
  const lit: Direction | null = pressed.length > 0 ? pressed[pressed.length - 1] : null;
  return (
    <div
      data-game-ui
      className={`touch-controls fixed inset-x-0 pointer-events-none ${zClass(Z_TOUCH_CONTROLS)}`}
      style={{
        bottom: `calc(${TOUCH_BOTTOM_GAP_PX}px + env(safe-area-inset-bottom, 0px))`,
        paddingLeft: `max(${TOUCH_SIDE_PADDING_PX}px, env(safe-area-inset-left))`,
        paddingRight: `max(${TOUCH_SIDE_PADDING_PX}px, env(safe-area-inset-right))`,
      }}
    >
      {!hidden && (
        <div
          aria-label="Movement"
          className={`no-touch-callout relative select-none ${DPAD_SIZE_CLASS[tier]}`}
        >
          {DPAD_FRAME_STATES.map((state) => (
            <img
              key={state}
              data-testid={`dpad-frame-${state}`}
              src={dpadFrameSrc(state)}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 w-full h-full select-none"
              style={{ visibility: state === (lit ?? 'idle') ? 'visible' : 'hidden' }}
            />
          ))}
          {(Object.keys(HIT_ZONES) as Direction[]).map((direction) => (
            <button
              key={direction}
              aria-label={`Move ${direction}`}
              aria-pressed={pressed.includes(direction)}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // Pointer already gone — the window-level listeners still release it.
                }
                // A new finger on a held arm takes it over, so a stuck arrow is
                // unstuck by pressing it again. Pressing is idempotent on keysPressed.
                tracker.press(direction, e.pointerId);
                onDirectionPress(direction);
                setPressed(tracker.held());
              }}
              onPointerUp={(e) => release(direction, e.pointerId)}
              onPointerCancel={(e) => release(direction, e.pointerId)}
              onLostPointerCapture={(e) => release(direction, e.pointerId)}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'none', ...HIT_ZONES[direction] }}
              className="pointer-events-auto absolute"
            />
          ))}
        </div>
      )}
      {/* Tuck the pad away (tapping the ground still walks there) or bring it back.
          It sits in the cross's empty top-left corner — dpadFootprint() reserves the overhang. */}
      <button
        type="button"
        aria-label={hidden ? 'Show the arrows' : 'Hide the arrows'}
        aria-pressed={!hidden}
        onClick={() => {
          for (const direction of tracker.releaseAll()) releaseCallback.current(direction);
          setPressed([]);
          setDpadHidden(!hidden);
        }}
        className="no-touch-callout pointer-events-auto absolute z-10 flex items-center justify-center rounded-full border-2 border-amber-400/70 bg-amber-700/80 text-white shadow-md select-none"
        style={{
          width: DPAD_TOGGLE_SIZE_PX,
          height: DPAD_TOGGLE_SIZE_PX,
          left: `max(${TOUCH_SIDE_PADDING_PX - DPAD_TOGGLE_OVERHANG_PX}px, calc(env(safe-area-inset-left) - ${DPAD_TOGGLE_OVERHANG_PX}px))`,
          ...(hidden
            ? { bottom: 0 }
            : { bottom: `calc(100% - ${DPAD_TOGGLE_SIZE_PX - DPAD_TOGGLE_OVERHANG_PX}px)` }),
          fontSize: 16,
          lineHeight: 1,
          touchAction: 'manipulation',
        }}
      >
        {hidden ? '✥' : '×'}
      </button>
      {onEmotePress && (
        <button
          onClick={onEmotePress}
          aria-label="Emotes"
          className="no-touch-callout pointer-events-auto absolute bg-amber-700/90 rounded-full border-2 border-amber-400/70 text-xl shadow-md"
          style={{
            width: EMOTE_BUTTON_SIZE_PX,
            height: EMOTE_BUTTON_SIZE_PX,
            right: `max(${EMOTE_BUTTON_RIGHT_PX}px, env(safe-area-inset-right))`,
            bottom: EMOTE_BUTTON_BOTTOM_PX,
            touchAction: 'manipulation',
          }}
        >
          <img
            src={EMOTES[0].image}
            alt=""
            className="w-full h-full object-contain"
            draggable={false}
          />
        </button>
      )}
    </div>
  );
};
// Memoised: always mounted, and App commits ~10 times a second while the player walks (PERFORMANCE_MOBILE_PLAN.md §5 M10).
export default React.memo(TouchControls);
