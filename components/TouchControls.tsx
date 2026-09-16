import { EMOTES } from '../multiplayer/emotes';
import React, { useEffect, useRef, useState } from 'react';
import { Z_TOUCH_CONTROLS, zClass } from '../zIndex';

type Direction = 'up' | 'down' | 'left' | 'right';

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
  compact?: boolean;
}

/** Existing D-pad, with one owning pointer per direction and explicit cancellation. */
const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onEmotePress,
  compact = false,
}) => {
  const held = useRef(new Map<Direction, number>());
  const releaseCallback = useRef(onDirectionRelease);
  releaseCallback.current = onDirectionRelease;
  const [pressed, setPressed] = useState<Direction[]>([]);
  useEffect(() => {
    const pointers = held.current;
    const releaseAll = () => {
      for (const direction of pointers.keys()) releaseCallback.current(direction);
      pointers.clear();
      setPressed([]);
    };
    window.addEventListener('blur', releaseAll);
    window.addEventListener('orientationchange', releaseAll);
    document.addEventListener('visibilitychange', releaseAll);
    return () => {
      window.removeEventListener('blur', releaseAll);
      window.removeEventListener('orientationchange', releaseAll);
      document.addEventListener('visibilitychange', releaseAll);
      for (const direction of pointers.keys()) releaseCallback.current(direction);
      pointers.clear();
    };
  }, []);
  const release = (direction: Direction, pointerId: number) => {
    if (held.current.get(direction) !== pointerId) return;
    held.current.delete(direction);
    releaseCallback.current(direction);
    setPressed([...held.current.keys()]);
  };
  // Only one arrow can be lit at a time — the most recently pressed wins.
  const lit: Direction | null = pressed.length > 0 ? pressed[pressed.length - 1] : null;
  return (
    <div
      data-game-ui
      className={`touch-controls fixed inset-x-0 pointer-events-none ${zClass(Z_TOUCH_CONTROLS)}`}
      style={{
        bottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div aria-label="Movement" className={`relative ${compact ? 'w-36 h-36' : 'w-44 h-44'}`}>
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
              if (e.button !== 0 || held.current.has(direction)) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              held.current.set(direction, e.pointerId);
              onDirectionPress(direction);
              setPressed([...held.current.keys()]);
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
      {onEmotePress && (
        <button
          onClick={onEmotePress}
          aria-label="Emotes"
          className="pointer-events-auto absolute w-12 h-12 bg-amber-700/90 rounded-full border-2 border-amber-400/70 text-xl shadow-md"
          style={{
            right: 'max(24px, env(safe-area-inset-right))',
            bottom: '88px',
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
export default TouchControls;