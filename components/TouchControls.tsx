import React, { useState } from 'react';

type Tool = 'hand' | 'hoe' | 'seeds' | 'wateringCan';
type CropType = 'radish' | 'tomato' | 'wheat' | 'corn' | 'pumpkin';

interface TouchControlsProps {
  onDirectionPress: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onDirectionRelease: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onActionPress: () => void;
  onResetPress: () => void;
  onForagePress?: () => void;
  currentTool: Tool;
  selectedSeed: CropType | null;
  onToolChange: (tool: Tool) => void;
  onSeedChange: (seed: CropType) => void;
  onShowCookingUI?: () => void;
  onShowRecipeBook?: () => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onActionPress,
  onResetPress,
  onForagePress,
  currentTool,
  selectedSeed,
  onToolChange,
  onSeedChange,
  onShowCookingUI,
  onShowRecipeBook,
}) => {
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [showSeedMenu, setShowSeedMenu] = useState(false);

  // Tool display data
  const tools: Array<{ id: Tool; icon: string; name: string }> = [
    { id: 'hand', icon: '✋', name: 'Hand' },
    { id: 'hoe', icon: '⚒️', name: 'Hoe' },
    { id: 'seeds', icon: '🌱', name: 'Seeds' },
    { id: 'wateringCan', icon: '💧', name: 'Water' },
  ];

  // Seed display data
  const seeds: Array<{ id: CropType; icon: string; name: string }> = [
    { id: 'radish', icon: '🥕', name: 'Radish' },
    { id: 'tomato', icon: '🍅', name: 'Tomato' },
    { id: 'wheat', icon: '🌾', name: 'Wheat' },
    { id: 'corn', icon: '🌽', name: 'Corn' },
    { id: 'pumpkin', icon: '🎃', name: 'Pumpkin' },
  ];
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
    <div className="fixed bottom-6 left-0 right-0 flex justify-between px-4 sm:px-6 pointer-events-auto z-20">
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
        {/* Tool selector row */}
        <div className="flex items-center gap-2">
          {/* Current tool button - tap to toggle tool menu */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              setShowToolMenu(!showToolMenu);
              setShowSeedMenu(false);
            }}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-3 flex flex-col items-center justify-center text-white font-bold shadow-lg ${
              currentTool === 'hand' ? 'bg-slate-600/90 border-slate-400' :
              currentTool === 'hoe' ? 'bg-amber-700/90 border-amber-500' :
              currentTool === 'seeds' ? 'bg-green-700/90 border-green-500' :
              'bg-blue-600/90 border-blue-400'
            }`}
          >
            <span className="text-xl sm:text-2xl">{tools.find(t => t.id === currentTool)?.icon}</span>
            <span className="text-[10px] sm:text-xs">{tools.find(t => t.id === currentTool)?.name}</span>
          </button>

          {/* Seed selector - shows when seeds tool is active */}
          {currentTool === 'seeds' && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                setShowSeedMenu(!showSeedMenu);
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 bg-green-800/90 border-3 border-green-600 rounded-xl flex flex-col items-center justify-center text-white shadow-lg"
            >
              <span className="text-xl sm:text-2xl">{seeds.find(s => s.id === selectedSeed)?.icon || '🌱'}</span>
              <span className="text-[10px] sm:text-xs">{seeds.find(s => s.id === selectedSeed)?.name || 'Pick'}</span>
            </button>
          )}
        </div>

        {/* Tool menu - shows when tool button is tapped */}
        {showToolMenu && (
          <div className="flex gap-2 bg-black/80 p-2 rounded-xl border border-slate-600">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onTouchStart={(e) => {
                  e.preventDefault();
                  onToolChange(tool.id);
                  setShowToolMenu(false);
                  if (tool.id === 'seeds') {
                    setShowSeedMenu(true);
                  }
                }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 flex flex-col items-center justify-center text-white text-[10px] sm:text-xs shadow-lg ${
                  currentTool === tool.id
                    ? 'bg-yellow-500/90 border-yellow-300'
                    : 'bg-slate-700/90 border-slate-500'
                }`}
              >
                <span className="text-lg sm:text-xl">{tool.icon}</span>
                <span>{tool.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Seed menu - shows when seed button is tapped */}
        {showSeedMenu && currentTool === 'seeds' && (
          <div className="flex flex-wrap gap-2 bg-black/80 p-2 rounded-xl border border-green-600 max-w-[200px]">
            {seeds.map((seed) => (
              <button
                key={seed.id}
                onTouchStart={(e) => {
                  e.preventDefault();
                  onSeedChange(seed.id);
                  setShowSeedMenu(false);
                }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 flex flex-col items-center justify-center text-white text-[10px] sm:text-xs shadow-lg ${
                  selectedSeed === seed.id
                    ? 'bg-green-500/90 border-green-300'
                    : 'bg-slate-700/90 border-slate-500'
                }`}
              >
                <span className="text-lg sm:text-xl">{seed.icon}</span>
                <span>{seed.name}</span>
              </button>
            ))}
          </div>
        )}

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
