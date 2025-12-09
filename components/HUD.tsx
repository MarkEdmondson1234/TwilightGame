import React, { useState, useEffect } from 'react';
import { mapManager } from '../maps';
import { useGameState } from '../hooks/useGameState';
import { TimeManager, GameTime } from '../utils/TimeManager';
import { inventoryManager } from '../utils/inventoryManager';
import { getSeedItemId } from '../data/items';

const HUD: React.FC = () => {
    const currentMap = mapManager.getCurrentMap();
    const mapName = currentMap ? currentMap.name : 'Loading...';
    const { gold, forestDepth, caveDepth, farming } = useGameState();
    const [currentTime, setCurrentTime] = useState<GameTime>(TimeManager.getCurrentTime());

    // Update time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(TimeManager.getCurrentTime());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Tool display names and icons
    const toolDisplay = {
        hand: { name: 'Hand', icon: '✋', desc: 'Harvest/Clear' },
        hoe: { name: 'Hoe', icon: '⚒️', desc: 'Till soil' },
        seeds: { name: 'Seeds', icon: '🌱', desc: 'Plant crops' },
        wateringCan: { name: 'Watering Can', icon: '💧', desc: 'Water plants' },
    };

    return (
        <>
            {/* Left HUD Panel - Game info and tools */}
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <div className="bg-black/60 p-2 sm:p-3 rounded-lg border border-slate-700 max-w-[160px] sm:max-w-[200px]">
                    <div className="flex items-center justify-between gap-2">
                        <img
                            src="/TwilightGame/assets-optimized/ui/wallet.png"
                            alt="Gold"
                            className="w-5 h-5 sm:w-6 sm:h-6"
                        />
                        <span className="text-sm sm:text-base font-bold text-yellow-300">{gold}</span>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-600">
                        <div className="flex items-center gap-1 sm:gap-2">
                            <span className="text-base sm:text-lg">{toolDisplay[farming.currentTool].icon}</span>
                            <span className="text-xs sm:text-sm font-bold text-green-300">{toolDisplay[farming.currentTool].name}</span>
                        </div>
                        {farming.currentTool === 'seeds' && farming.selectedSeed && (
                            <div className="mt-1 bg-black/30 p-1 sm:p-2 rounded border border-green-700">
                                <p className="text-xs font-bold text-green-400 capitalize">{farming.selectedSeed}</p>
                                <p className="text-xs text-yellow-300">
                                    × {inventoryManager.getQuantity(getSeedItemId(farming.selectedSeed))}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right HUD Panel - Location and time (positioned to avoid help button) */}
            <div className="absolute top-2 right-16 sm:right-20 z-10 pointer-events-none">
                <div className="bg-black/60 p-2 sm:p-3 rounded-lg border border-slate-700">
                    <p className="text-sm sm:text-base font-bold text-yellow-300 truncate max-w-[120px] sm:max-w-[150px]">{mapName}</p>
                    <div className="mt-1 pt-1 border-t border-slate-600">
                        <p className="text-xs sm:text-sm font-bold text-cyan-300">{currentTime.season} {currentTime.day}</p>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <span className="text-xs text-slate-400">{currentTime.hour}:00</span>
                            <span className={`text-xs font-bold ${currentTime.timeOfDay === 'Day' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                {currentTime.timeOfDay === 'Day' ? '☀️' : '🌙'}
                            </span>
                        </div>
                    </div>
                    {forestDepth > 0 && (
                        <p className="text-xs text-green-300 mt-1">Depth: {forestDepth}</p>
                    )}
                    {caveDepth > 0 && (
                        <p className="text-xs text-purple-300">Depth: {caveDepth}</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default HUD;