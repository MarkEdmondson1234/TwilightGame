import React from 'react';

interface TouchControlsProps {
  onDirectionPress: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onDirectionRelease: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onActionPress: () => void;
  onResetPress: () => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onActionPress,
  onResetPress,
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

  const handleActionTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    onActionPress();
  };

  const handleResetTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    onResetPress();
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-between px-4 pointer-events-auto z-20">
      {/* D-Pad on the left */}
      <div className="relative w-40 h-40">
        {/* Up */}
        <button
          onTouchStart={handleTouchStart('up')}
          onTouchEnd={handleTouchEnd('up')}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-700/80 hover:bg-slate-600/80 active:bg-slate-500/80 rounded-t-lg border-2 border-slate-500 flex items-center justify-center text-white font-bold"
        >
          ▲
        </button>

        {/* Down */}
        <button
          onTouchStart={handleTouchStart('down')}
          onTouchEnd={handleTouchEnd('down')}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-slate-700/80 hover:bg-slate-600/80 active:bg-slate-500/80 rounded-b-lg border-2 border-slate-500 flex items-center justify-center text-white font-bold"
        >
          ▼
        </button>

        {/* Left */}
        <button
          onTouchStart={handleTouchStart('left')}
          onTouchEnd={handleTouchEnd('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-slate-700/80 hover:bg-slate-600/80 active:bg-slate-500/80 rounded-l-lg border-2 border-slate-500 flex items-center justify-center text-white font-bold"
        >
          ◄
        </button>

        {/* Right */}
        <button
          onTouchStart={handleTouchStart('right')}
          onTouchEnd={handleTouchEnd('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-slate-700/80 hover:bg-slate-600/80 active:bg-slate-500/80 rounded-r-lg border-2 border-slate-500 flex items-center justify-center text-white font-bold"
        >
          ►
        </button>

        {/* Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-slate-800/60 rounded-full border-2 border-slate-600"></div>
      </div>

      {/* Action buttons on the right */}
      <div className="flex flex-col items-end gap-2">
        {/* Reset button (R) */}
        <button
          onTouchStart={handleResetTouch}
          className="w-14 h-14 bg-orange-600/80 hover:bg-orange-500/80 active:bg-orange-400/80 rounded-full border-3 border-orange-400 flex items-center justify-center text-white font-bold text-sm shadow-lg"
        >
          R
        </button>
        {/* Action button (E) */}
        <button
          onTouchStart={handleActionTouch}
          className="w-20 h-20 bg-green-600/80 hover:bg-green-500/80 active:bg-green-400/80 rounded-full border-4 border-green-400 flex items-center justify-center text-white font-bold text-xl shadow-lg"
        >
          E
        </button>
      </div>
    </div>
  );
};

export default TouchControls;
