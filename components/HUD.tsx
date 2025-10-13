import React, { useState } from 'react';
import { TILE_LEGEND } from '../constants';
import { mapManager } from '../maps';
import { useGameState } from '../hooks/useGameState';

const HUD: React.FC = () => {
    const currentMap = mapManager.getCurrentMap();
    const mapName = currentMap ? currentMap.name : 'Loading...';
    const { gold, forestDepth, caveDepth } = useGameState();
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    return (
        <>
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-black/50 p-3 rounded-lg border border-slate-700">
                    <h1 className="text-xl font-bold text-cyan-300">My Game</h1>
                    <p className="text-sm text-slate-300">Exploration Engine v0.1</p>
                    <div className="mt-2 text-sm text-yellow-300">
                        Gold: {gold}
                    </div>
                </div>
                <div className="bg-black/50 p-3 rounded-lg border border-slate-700">
                    <p className="text-lg font-bold text-yellow-300">{mapName}</p>
                    {forestDepth > 0 && (
                        <p className="text-sm text-green-300">Forest Depth: {forestDepth}</p>
                    )}
                    {caveDepth > 0 && (
                        <p className="text-sm text-purple-300">Cave Depth: {caveDepth}</p>
                    )}
                </div>
            </div>

            {/* Legend (collapsible) */}
            <div className="absolute bottom-4 left-4 z-10">
                {!isLegendOpen ? (
                    <button
                        onClick={() => setIsLegendOpen(true)}
                        className="bg-black/50 px-3 py-2 rounded-lg border border-slate-700 text-cyan-300 font-bold hover:bg-black/70 pointer-events-auto"
                    >
                        Legend
                    </button>
                ) : (
                    <div className="bg-black/50 p-3 rounded-lg border border-slate-700 pointer-events-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-md font-bold text-cyan-300">Map Legend</h3>
                            <button
                                onClick={() => setIsLegendOpen(false)}
                                className="text-slate-400 hover:text-white font-bold"
                            >
                                ✕
                            </button>
                        </div>
                        <ul className="space-y-1 text-left">
                            {TILE_LEGEND.map(({ color, name }) => (
                                <li key={name} className="flex items-center">
                                    <div className={`w-4 h-4 rounded-sm mr-2 border border-black/50 ${color}`}></div>
                                    <span className="text-sm text-slate-300">{name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
};

export default HUD;