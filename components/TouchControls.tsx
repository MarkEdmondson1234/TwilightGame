import React from 'react';
import { Z_TOUCH_CONTROLS, zClass } from '../zIndex';

interface TouchControlsProps {
  onDirectionPress: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onDirectionRelease: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onResetPress: () => void;
  onForagePress?: () => void;
  /** Use smaller controls for small screens (< 600px height) */
  compact?: boolean;
}

/**
 * Touch controls for mobile/tablet devices
 *
 * Features:
 * - D-Pad on left for movement
 * - Forage button on right (contextual, only when callback provided)
 * - Reset button on right (small, for getting unstuck)
 * - Compact mode for small screens (reduces D-Pad and button sizes)
 * - Safe area insets for notched devices
 *
 * Note: All game interactions (NPCs, transitions, farming, cooking, etc.)
 * are handled via direct tap on the game world.
 */
const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onResetPress,
  onForagePress,
  compact = false,
}) => {
  const handleTouchStart = (direction: 'up' | 'down' | 'left' | 'right') => {
    return (e: React.TouchEvent) => {
      e.preventDefault();
      onDirectionPress(direction);
    };
  };

  const handleTouchEnd = (direction: 'up' | 'down' | 'left' | 'right') => {
    return (e: React.TouchEvent) => {
      e.preventDefault();
      onDirectionRelease(direction);
    };
  };

  // Responsive sizes based on compact mode
  const dpadSize = compact ? 'w-32 h-32' : 'w-40 h-40 sm:w-44 sm:h-44';
  const dpadButtonSize = compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14';
  const dpadButtonText = compact ? 'text-lg' : 'text-xl sm:text-2xl';
  const dpadCenterSize = compact ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12';

  const actionButtonSize = compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14';
  const actionButtonText = compact ? 'text-lg' : 'text-xl sm:text-2xl';

  return (
    <div
      className={`touch-controls fixed left-0 right-0 flex justify-between items-end px-4 sm:px-6 pointer-events-auto ${zClass(Z_TOUCH_CONTROLS)}`}
      style={{
        bottom: compact
          ? 'calc(40px + env(safe-area-inset-bottom, 0px))'
          : 'calc(60px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* D-Pad on the left */}
      <div className={`relative ${dpadSize}`}>
        {/* Up */}
        <button
          onTouchStart={handleTouchStart('up')}
          onTouchEnd={handleTouchEnd('up')}
          className={`absolute top-0 left-1/2 -translate-x-1/2 ${dpadButtonSize} bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-t-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold ${dpadButtonText} shadow-md`}
        >
          ▲
        </button>

        {/* Down */}
        <button
          onTouchStart={handleTouchStart('down')}
          onTouchEnd={handleTouchEnd('down')}
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${dpadButtonSize} bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-b-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold ${dpadButtonText} shadow-md`}
        >
          ▼
        </button>

        {/* Left */}
        <button
          onTouchStart={handleTouchStart('left')}
          onTouchEnd={handleTouchEnd('left')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 ${dpadButtonSize} bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-l-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold ${dpadButtonText} shadow-md`}
        >
          ◄
        </button>

        {/* Right */}
        <button
          onTouchStart={handleTouchStart('right')}
          onTouchEnd={handleTouchEnd('right')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 ${dpadButtonSize} bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-r-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold ${dpadButtonText} shadow-md`}
        >
          ►
        </button>

        {/* Center */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${dpadCenterSize} bg-slate-800/70 rounded-full border-2 border-slate-600`}
        ></div>
      </div>

      {/* Action buttons on the right */}
      <div className={`flex flex-col items-end ${compact ? 'gap-2' : 'gap-3'}`}>
        {/* Forage button - only shown when callback provided */}
        {onForagePress && (
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onForagePress();
            }}
            className={`${actionButtonSize} bg-emerald-700/90 hover:bg-emerald-600/90 active:bg-emerald-500/90 rounded-xl border-2 border-emerald-500 flex items-center justify-center text-white ${actionButtonText} shadow-md`}
            title="Forage"
          >
            🌿
          </button>
        )}

        {/* Reset button - small, for getting unstuck */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onResetPress();
          }}
          className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-slate-600/70 hover:bg-slate-500/70 active:bg-slate-400/70 rounded-full border border-slate-400/50 flex items-center justify-center text-white/70 text-xs shadow-sm`}
          title="Reset position"
        >
          ↺
        </button>
      </div>
    </div>
  );
};

export default TouchControls;
