import { EMOTES } from '../multiplayer/emotes';
import React, { useEffect, useRef, useState } from 'react';
import { Z_TOUCH_CONTROLS, zClass } from '../zIndex';

type Direction = 'up' | 'down' | 'left' | 'right';
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
      document.removeEventListener('visibilitychange', releaseAll);
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
  const positions = {
    up: 'top-0 left-1/2 -translate-x-1/2 rounded-t-xl',
    down: 'bottom-0 left-1/2 -translate-x-1/2 rounded-b-xl',
    left: 'left-0 top-1/2 -translate-y-1/2 rounded-l-xl',
    right: 'right-0 top-1/2 -translate-y-1/2 rounded-r-xl',
  };
  const symbols = { up: '▲', down: '▼', left: '◄', right: '►' };
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
        {(Object.keys(positions) as Direction[]).map((direction) => (
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
            style={{ touchAction: 'none' }}
            className={`pointer-events-auto absolute ${positions[direction]} ${compact ? 'w-12 h-12' : 'w-14 h-14'} ${pressed.includes(direction) ? 'bg-slate-500' : 'bg-slate-700/90'} border-2 border-slate-500 flex items-center justify-center text-white font-bold text-xl shadow-md`}
          >
            {symbols[direction]}
          </button>
        ))}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-800/70 rounded-full border-2 border-slate-600" />
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
