import React from 'react';
import { TILE_LEGEND } from '../constants';

interface HUDProps {
    onOpenShop: () => void;
    onOpenCrafting: () => void;
}

const HUD: React.FC<HUDProps> = ({ onOpenShop, onOpenCrafting }) => {
    return (
        <>
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
                <div className="bg-black/50 p-3 rounded-lg border border-slate-700">
                    <h1 className="text-xl font-bold text-cyan-300">My Game</h1>
                    <p className="text-sm text-slate-300">Exploration Engine v0.1</p>
                </div>

                <div className="flex flex-col space-y-2 pointer-events-auto">
                    <button onClick={onOpenShop} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                        Shop
                    </button>
                    <button onClick={onOpenCrafting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105">
                        Crafting
                    </button>
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