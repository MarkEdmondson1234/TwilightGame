import React, { useState } from 'react';

interface TouchControlsProps {
  onDirectionPress: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onDirectionRelease: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onActionPress: () => void;
  onResetPress: () => void;
  onForagePress?: () => void;
  onShowCookingUI?: () => void;
  onShowRecipeBook?: () => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onActionPress,
  onResetPress,
  onForagePress,
  onShowCookingUI,
  onShowRecipeBook,
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

  const handleActionTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    onActionPress();
  };

  const handleResetTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    onResetPress();
  };

  return (
    <div className="fixed bottom-48 sm:bottom-52 left-0 right-0 flex justify-between px-4 sm:px-6 pointer-events-auto z-[1000]">
      {/* D-Pad on the left - larger touch targets */}
      <div className="relative w-44 h-44 sm:w-48 sm:h-48">
        {/* Up */}
        <button
          onTouchStart={handleTouchStart('up')}
          onTouchEnd={handleTouchEnd('up')}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-14 sm:w-16 sm:h-16 bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-t-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg"
        >
          ▲
        </button>

        {/* Down */}
        <button
          onTouchStart={handleTouchStart('down')}
          onTouchEnd={handleTouchEnd('down')}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-14 sm:w-16 sm:h-16 bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-b-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg"
        >
          ▼
        </button>

        {/* Left */}
        <button
          onTouchStart={handleTouchStart('left')}
          onTouchEnd={handleTouchEnd('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-l-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg"
        >
          ◄
        </button>

        {/* Right */}
        <button
          onTouchStart={handleTouchStart('right')}
          onTouchEnd={handleTouchEnd('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-r-xl border-2 border-slate-500 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg"
        >
          ►
        </button>

        {/* Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 bg-slate-800/70 rounded-full border-2 border-slate-600"></div>
      </div>

      {/* Action buttons on the right */}
      <div className="flex flex-col items-end gap-3">
        {/* Cooking and foraging buttons row */}
        <div className="flex items-center gap-2">
          {/* Forage button */}
          {onForagePress && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                onForagePress();
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-700/90 hover:bg-emerald-600/90 active:bg-emerald-500/90 rounded-xl border-2 border-emerald-500 flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg"
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
              className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-700/90 hover:bg-teal-600/90 active:bg-teal-500/90 rounded-xl border-2 border-teal-500 flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg"
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
              className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-700/90 hover:bg-amber-600/90 active:bg-amber-500/90 rounded-xl border-2 border-amber-500 flex items-center justify-center text-white text-xl sm:text-2xl shadow-lg"
              title="Cook"
            >
              🍳
            </button>
          )}
        </div>

        {/* Action button row */}
        <div className="flex items-center gap-3">
          {/* Dev Menu Toggle */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              setShowDevMenu(!showDevMenu);
            }}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-700/90 hover:bg-slate-600/90 active:bg-slate-500/90 rounded-full border-2 border-slate-500 flex items-center justify-center text-white font-bold text-sm shadow-lg"
          >
            ⋯
          </button>

          {/* Reset button (R) - Only visible when dev menu open */}
          {showDevMenu && (
            <button
              onTouchStart={(e) => {
                handleResetTouch(e);
                setShowDevMenu(false);
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-600/90 hover:bg-orange-500/90 active:bg-orange-400/90 rounded-full border-3 border-orange-400 flex items-center justify-center text-white font-bold text-sm shadow-lg"
            >
              R
            </button>
          )}

          {/* Main Action button (E) - large for easy tapping */}
          <button
            onTouchStart={handleActionTouch}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-green-600/90 hover:bg-green-500/90 active:bg-green-400/90 rounded-full border-4 border-green-400 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shadow-xl"
          >
            E
          </button>
        </div>
      </div>
    </div>
  );
};

export default TouchControls;
