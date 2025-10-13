import React from 'react';
import { TILE_LEGEND } from '../constants';

const HUD: React.FC = () => {
    return (
        <>
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-black/50 p-3 rounded-lg border border-slate-700">
                    <h1 className="text-xl font-bold text-cyan-300">My Game</h1>
                    <p className="text-sm text-slate-300">Exploration Engine v0.1</p>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-black/50 p-3 rounded-lg border border-slate-700 z-10">
                <h3 className="text-md font-bold text-cyan-300 mb-2">Map Legend</h3>
                <ul className="space-y-1 text-left">
                    {TILE_LEGEND.map(({ color, name }) => (
                        <li key={name} className="flex items-center">
                            <div className={`w-4 h-4 rounded-sm mr-2 border border-black/50 ${color}`}></div>
                            <span className="text-sm text-slate-300">{name}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
};

export default HUD;