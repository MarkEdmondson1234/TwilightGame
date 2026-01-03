import React from 'react';
import { uiAssets } from '../assets';
import { Z_HUD, zClass } from '../zIndex';

interface GameUIControlsProps {
    showHelpBrowser: boolean;
    onToggleHelpBrowser: () => void;
    showCollisionBoxes: boolean;
    onToggleCollisionBoxes: () => void;
    onToggleInventory: () => void;
}

/**
 * Game UI control buttons (Help, Collision, Inventory)
 * Positioned as overlay elements on the game viewport
 */
const GameUIControls: React.FC<GameUIControlsProps> = ({
    showHelpBrowser,
    onToggleHelpBrowser,
    showCollisionBoxes,
    onToggleCollisionBoxes,
    onToggleInventory,
}) => {
    return (
        <>
            {/* Help Button - Top Right (cottagecore styled) */}
            <div className={`absolute top-2 right-2 ${zClass(Z_HUD)}`}>
                <button
                    onClick={onToggleHelpBrowser}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full font-serif font-bold text-xl sm:text-2xl transition-all pointer-events-auto"
                    style={{
                        background: showHelpBrowser
                            ? 'linear-gradient(to bottom, #d4a84b, #c99a3e)'
                            : 'linear-gradient(to bottom, #f5f0e1, #e8dcc8)',
                        border: showHelpBrowser
                            ? '3px solid #8b6914'
                            : '3px solid #8b7355',
                        color: showHelpBrowser ? '#fff' : '#5a4636',
                        boxShadow: showHelpBrowser
                            ? '0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                            : '0 4px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
                        transform: showHelpBrowser ? 'scale(1.1)' : 'scale(1)',
                    }}
                    title="Help [F1]"
                >
                    ?
                </button>
            </div>

            {/* Inventory Button - Bottom Right above dev buttons */}
            <div className={`absolute bottom-16 sm:bottom-14 right-2 ${zClass(Z_HUD)}`}>
                <button
                    onClick={onToggleInventory}
                    className="transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg pointer-events-auto"
                    title="Inventory"
                >
                    <img
                        src={uiAssets.satchel}
                        alt="Inventory"
                        className="drop-shadow-2xl block"
                        style={{
                            imageRendering: 'auto',
                            width: '256px',
                            height: '256px'
                        }}
                    />
                </button>
            </div>

            {/* Dev Toggle Buttons - Bottom Right (moved to avoid bookshelf) */}
            <div className={`absolute bottom-2 right-2 ${zClass(Z_HUD)} flex flex-col sm:flex-row gap-1 sm:gap-2`}>
                <button
                    onClick={onToggleCollisionBoxes}
                    className={`px-2 sm:px-3 py-1 sm:py-2 rounded-lg border text-xs sm:text-sm font-bold transition-colors pointer-events-auto ${
                        showCollisionBoxes
                            ? 'bg-red-500/80 border-red-700 text-white hover:bg-red-600/80'
                            : 'bg-black/50 border-slate-700 text-slate-400 hover:bg-black/70'
                    }`}
                    title="F3 for debug overlay"
                >
                    {showCollisionBoxes ? '🔴' : '⬜'} Collision
                </button>
            </div>
        </>
    );
};

export default GameUIControls;
