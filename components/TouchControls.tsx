import React, { useState } from 'react';
import { Z_TOUCH_CONTROLS, zClass } from '../zIndex';

interface TouchControlsProps {
  onDirectionPress: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onDirectionRelease: (direction: 'up' | 'down' | 'left' | 'right') => void;
  /** @deprecated No longer used - all interactions via direct tap on game world */
  onActionPress?: () => void;
  onResetPress: () => void;
  onForagePress?: () => void;
  onShowCookingUI?: () => void;
  onShowRecipeBook?: () => void;
  /** Toggle debug overlay (F3 equivalent) */
  onDebugToggle?: () => void;
  /** Current state of debug overlay */
  isDebugOpen?: boolean;
  /** Use smaller controls for small screens (< 600px height) */
  compact?: boolean;
}

/**
 * Touch controls for mobile/tablet devices
 *
 * Features:
 * - D-Pad on left for movement
 * - Specialty buttons on right (forage, cooking, recipe book)
 * - Compact mode for small screens (reduces D-Pad and button sizes)
 * - Safe area insets for notched devices
 *
 * Note: All game interactions (NPCs, transitions, farming, etc.) are handled
 * via direct tap on the game world with click-to-interact system.
 */
const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  // onActionPress is deprecated - all interactions via direct tap
  onResetPress,
  onForagePress,
  onShowCookingUI,
  onShowRecipeBook,
  onDebugToggle,
  isDebugOpen = false,
  compact = false,
}) => {
  const [showDevMenu, setShowDevMenu] = useState(false);

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

  const handleResetTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    onResetPress();
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
      className={`touch-controls fixed left-0 right-0 flex justify-between px-4 sm:px-6 pointer-events-auto ${zClass(Z_TOUCH_CONTROLS)}`}
      style={{
        // Use safe area inset for notched devices
        // Compact mode uses less bottom offset (120px vs 160px)
        bottom: compact
          ? 'calc(100px + env(safe-area-inset-bottom, 0px))'
          : 'calc(140px + env(safe-area-inset-bottom, 0px))',
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
        {/* Cooking and foraging buttons row */}
        <div className="flex items-center gap-2">
          {/* Forage button */}
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

          {/* Recipe Book button */}
          {onShowRecipeBook && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                onShowRecipeBook();
              }}
              className={`${actionButtonSize} bg-teal-700/90 hover:bg-teal-600/90 active:bg-teal-500/90 rounded-xl border-2 border-teal-500 flex items-center justify-center text-white ${actionButtonText} shadow-md`}
              title="Recipe Book"
            >
              📖
            </button>
          )}

          {/* Cooking button */}
          {onShowCookingUI && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                onShowCookingUI();
              }}
              className={`${actionButtonSize} bg-amber-700/90 hover:bg-amber-600/90 active:bg-amber-500/90 rounded-xl border-2 border-amber-500 flex items-center justify-center text-white ${actionButtonText} shadow-md`}
              title="Cook"
            >
              🍳
            </button>
          )}
        </div>

        {/* Action button row */}
        <div className="flex items-center gap-2">
          {/* Dev Menu Toggle */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              setShowDevMenu(!showDevMenu);
            }}
            className={`${compact ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'} bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-full border-2 border-slate-500 flex items-center justify-center text-white font-bold text-sm shadow-md`}
          >
            ⋯
          </button>

          {/* Dev menu buttons - Only visible when dev menu open */}
          {showDevMenu && (
            <>
              {/* Debug overlay toggle (F3 equivalent) */}
              {onDebugToggle && (
                <button
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onDebugToggle();
                  }}
                  className={`${actionButtonSize} ${
                    isDebugOpen
                      ? 'bg-green-600/90 hover:bg-green-500/90 active:bg-green-400/90 border-green-400'
                      : 'bg-blue-600/90 hover:bg-blue-500/90 active:bg-blue-400/90 border-blue-400'
                  } rounded-full border-2 flex items-center justify-center text-white font-bold text-xs shadow-md`}
                  title="Toggle Debug (F3)"
                >
                  F3
                </button>
              )}

              {/* Reset button (R) */}
              <button
                onTouchStart={(e) => {
                  handleResetTouch(e);
                  setShowDevMenu(false);
                }}
                className={`${actionButtonSize} bg-orange-600/90 hover:bg-orange-500/90 active:bg-orange-400/90 rounded-full border-2 border-orange-400 flex items-center justify-center text-white font-bold text-sm shadow-md`}
              >
                R
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TouchControls;
