import React, { useState, useEffect } from 'react';
import { mapManager } from '../maps';
import { useGameState } from '../hooks/useGameState';
import { TimeManager, GameTime } from '../utils/TimeManager';
import { Z_HUD, zClass } from '../zIndex';
import { getItem } from '../data/items';
import { gameState } from '../GameState';
import { WATER_CAN } from '../constants';
import AnalogClock from './AnalogClock';
import SundialClock from './SundialClock';

interface HUDProps {
    /** Currently selected item ID (or null if nothing selected) */
    selectedItemId?: string | null;
    /** Quantity of selected item (for display) */
    selectedItemQuantity?: number;
}

const HUD: React.FC<HUDProps> = ({ selectedItemId, selectedItemQuantity }) => {
    const currentMap = mapManager.getCurrentMap();
    const mapName = currentMap ? currentMap.name : 'Loading...';
    const { gold, forestDepth, caveDepth } = useGameState();
    const [currentTime, setCurrentTime] = useState<GameTime>(TimeManager.getCurrentTime());

    // Update time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(TimeManager.getCurrentTime());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Get the selected item details
    const selectedItemDef = selectedItemId ? getItem(selectedItemId) : null;

    return (
        <>
            {/* Top-left: Wallet + Equipped Item */}
            <div className={`absolute top-2 left-2 ${zClass(Z_HUD)} pointer-events-none flex items-start gap-2`}>
                {/* Floating Wallet - Gold display */}
                <div className="relative">
                    <img
                        src="/TwilightGame/assets-optimized/ui/wallet.png"
                        alt="Gold"
                        className="w-[70px] h-[70px] sm:w-[88px] sm:h-[88px] drop-shadow-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: '5px' }}>
                        <span
                            className="text-lg sm:text-xl font-bold text-yellow-300"
                            style={{
                                textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)'
                            }}
                        >
                            {gold}
                        </span>
                    </div>
                </div>

                {/* Equipped Item Display - only show when item is selected */}
                {selectedItemDef && (
                    <div className="bg-black/60 p-2 rounded-lg border border-slate-700 flex items-center gap-2 self-center">
                        <img
                            src={selectedItemDef.image}
                            alt={selectedItemDef.displayName}
                            className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="flex flex-col">
                            <span
                                className="text-xs sm:text-sm font-bold text-white truncate max-w-[80px]"
                                style={{
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                                }}
                            >
                                {selectedItemDef.displayName}
                            </span>
                            {selectedItemQuantity !== undefined && selectedItemQuantity > 1 && (
                                <span className="text-xs text-slate-300">x{selectedItemQuantity}</span>
                            )}
                            {/* Water level for watering can */}
                            {selectedItemId === 'tool_watering_can' && (
                                <span className="text-xs text-cyan-300">
                                    💧 {gameState.getWaterLevel()}/{WATER_CAN.MAX_CAPACITY}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right HUD Panel - Clock, calendar, and location */}
            <div className={`absolute top-2 right-16 sm:right-20 ${zClass(Z_HUD)} pointer-events-none`}>
                <div className="flex items-start gap-2">
                    {/* Location info to the left of clocks */}
                    <div className="bg-black/60 px-2 py-1 rounded border border-slate-700 mt-4">
                        <p className="text-xs font-bold text-yellow-300 truncate max-w-[70px]">{mapName}</p>
                        {forestDepth > 0 && (
                            <p className="text-[10px] text-green-300">Depth: {forestDepth}</p>
                        )}
                        {caveDepth > 0 && (
                            <p className="text-[10px] text-purple-300">Depth: {caveDepth}</p>
                        )}
                    </div>

                    {/* Analog Clock (hours/minutes with rotating hands) */}
                    <AnalogClock currentTime={currentTime} size={70} />

                    {/* Sundial Calendar (date/season) */}
                    <SundialClock currentTime={currentTime} size={70} />
                </div>
            </div>
        </>
    );
};

export default HUD;