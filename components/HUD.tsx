import React, { useState, useEffect } from 'react';
import { mapManager } from '../maps';
import { useGameState } from '../hooks/useGameState';
import { TimeManager, GameTime } from '../utils/TimeManager';

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
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-black/50 p-3 rounded-lg border border-slate-700">
                    <h1 className="text-xl font-bold text-cyan-300">My Game</h1>
                    <p className="text-sm text-slate-300">Exploration Engine v0.1</p>
                    <div className="mt-2 text-sm text-yellow-300">
                        Gold: {gold}
                    </div>
                    <div className="mt-2 border-t border-slate-600 pt-2">
                        <p className="text-xs text-slate-400 mb-1">Tool (1-4):</p>
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{toolDisplay[farming.currentTool].icon}</span>
                            <div>
                                <p className="text-sm font-bold text-green-300">{toolDisplay[farming.currentTool].name}</p>
                                <p className="text-xs text-slate-400">{toolDisplay[farming.currentTool].desc}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-black/50 p-3 rounded-lg border border-slate-700">
                    <p className="text-lg font-bold text-yellow-300">{mapName}</p>
                    <div className="mt-2 border-t border-slate-600 pt-2">
                        <p className="text-md font-bold text-cyan-300">{currentTime.season} {currentTime.day}</p>
                        <p className="text-xs text-slate-400">Year {currentTime.year}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">Hour {currentTime.hour}:00</span>
                            <span className={`text-xs font-bold ${currentTime.timeOfDay === 'Day' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                {currentTime.timeOfDay === 'Day' ? '☀️ Day' : '🌙 Night'}
                            </span>
                        </div>
                    </div>
                    {forestDepth > 0 && (
                        <p className="text-sm text-green-300 mt-2">Forest Depth: {forestDepth}</p>
                    )}
                    {caveDepth > 0 && (
                        <p className="text-sm text-purple-300">Cave Depth: {caveDepth}</p>
                    )}
                </div>
            </div>
        </>
    );
};

export default HUD;