import React, { useState } from 'react';

type Tool = 'hand' | 'hoe' | 'seeds' | 'wateringCan';
type CropType = 'radish' | 'tomato' | 'wheat' | 'corn' | 'pumpkin';

interface TouchControlsProps {
  onDirectionPress: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onDirectionRelease: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onActionPress: () => void;
  onResetPress: () => void;
  currentTool: Tool;
  selectedSeed: CropType | null;
  onToolChange: (tool: Tool) => void;
  onSeedChange: (seed: CropType) => void;
}

const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionPress,
  onDirectionRelease,
  onActionPress,
  onResetPress,
  currentTool,
  selectedSeed,
  onToolChange,
  onSeedChange,
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
        {/* Dev Menu Toggle - Small button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            setShowDevMenu(!showDevMenu);
          }}
          className="w-8 h-8 bg-slate-700/80 hover:bg-slate-600/80 active:bg-slate-500/80 rounded-full border-2 border-slate-500 flex items-center justify-center text-white font-bold text-xs shadow-lg"
        >
          ⋯
        </button>

        {/* Dev Menu - Reset button (R) - Only visible when menu open */}
        {showDevMenu && (
          <button
            onTouchStart={(e) => {
              handleResetTouch(e);
              setShowDevMenu(false);
            }}
            className="w-14 h-14 bg-orange-600/80 hover:bg-orange-500/80 active:bg-orange-400/80 rounded-full border-3 border-orange-400 flex items-center justify-center text-white font-bold text-sm shadow-lg"
          >
            R
          </button>
        )}

        {/* Tool selector */}
        <div className="flex flex-col items-end gap-2">
          {/* Current tool button - tap to toggle tool menu */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              setShowToolMenu(!showToolMenu);
              setShowSeedMenu(false);
            }}
            className={`w-16 h-16 rounded-lg border-3 flex flex-col items-center justify-center text-white font-bold shadow-lg ${
              currentTool === 'hand' ? 'bg-slate-600/80 border-slate-400' :
              currentTool === 'hoe' ? 'bg-amber-700/80 border-amber-500' :
              currentTool === 'seeds' ? 'bg-green-700/80 border-green-500' :
              'bg-blue-600/80 border-blue-400'
            }`}
          >
            <span className="text-2xl">{tools.find(t => t.id === currentTool)?.icon}</span>
            <span className="text-xs">{tools.find(t => t.id === currentTool)?.name}</span>
          </button>

          {/* Tool menu - shows when tool button is tapped */}
          {showToolMenu && (
            <div className="flex flex-col gap-1 bg-black/70 p-2 rounded-lg border border-slate-600">
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
                  className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center text-white text-xs shadow-lg ${
                    currentTool === tool.id
                      ? 'bg-yellow-500/80 border-yellow-300'
                      : 'bg-slate-700/80 border-slate-500'
                  }`}
                >
                  <span className="text-xl">{tool.icon}</span>
                  <span>{tool.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Seed selector - shows when seeds tool is active */}
          {currentTool === 'seeds' && (
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                setShowSeedMenu(!showSeedMenu);
              }}
              className="w-14 h-14 bg-green-800/80 border-2 border-green-600 rounded-lg flex flex-col items-center justify-center text-white shadow-lg"
            >
              <span className="text-xl">{seeds.find(s => s.id === selectedSeed)?.icon || '🌱'}</span>
              <span className="text-xs">{seeds.find(s => s.id === selectedSeed)?.name || 'Pick'}</span>
            </button>
          )}

          {/* Seed menu - shows when seed button is tapped */}
          {showSeedMenu && currentTool === 'seeds' && (
            <div className="flex flex-col gap-1 bg-black/70 p-2 rounded-lg border border-green-600">
              {seeds.map((seed) => (
                <button
                  key={seed.id}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onSeedChange(seed.id);
                    setShowSeedMenu(false);
                  }}
                  className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center text-white text-xs shadow-lg ${
                    selectedSeed === seed.id
                      ? 'bg-green-500/80 border-green-300'
                      : 'bg-slate-700/80 border-slate-500'
                  }`}
                >
                  <span className="text-xl">{seed.icon}</span>
                  <span>{seed.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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
