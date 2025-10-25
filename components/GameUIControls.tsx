import React from 'react';

interface GameUIControlsProps {
    showHelpBrowser: boolean;
    onToggleHelpBrowser: () => void;
    showCollisionBoxes: boolean;
    onToggleCollisionBoxes: () => void;
    showColorEditor: boolean;
    onToggleColorEditor: () => void;
}

/**
 * Game UI control buttons (Help, Collision, Color Editor)
 * Positioned as overlay elements on the game viewport
 */
const GameUIControls: React.FC<GameUIControlsProps> = ({
    showHelpBrowser,
    onToggleHelpBrowser,
    showCollisionBoxes,
    onToggleCollisionBoxes,
    showColorEditor,
    onToggleColorEditor,
}) => {
    return (
        <>
            {/* Help Button - Top Right */}
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={onToggleHelpBrowser}
                    className={`w-12 h-12 rounded-full border-4 font-bold text-2xl transition-all pointer-events-auto shadow-lg ${
                        showHelpBrowser
                            ? 'bg-amber-500 border-amber-700 text-white hover:bg-amber-600 scale-110'
                            : 'bg-black/70 border-slate-600 text-amber-400 hover:bg-black/90 hover:border-amber-500 hover:scale-105'
                    }`}
                    title="Help [F1]"
                >
                    ?
                </button>
            </div>

            {/* Collision Box and Color Editor Toggle Buttons - Bottom Right */}
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                <button
                    onClick={onToggleCollisionBoxes}
                    className={`px-4 py-2 rounded-lg border font-bold transition-colors pointer-events-auto ${
                        showCollisionBoxes
                            ? 'bg-red-500/80 border-red-700 text-white hover:bg-red-600/80'
                            : 'bg-black/50 border-slate-700 text-slate-400 hover:bg-black/70'
                    }`}
                >
                    {showCollisionBoxes ? '🔴 Hide Collision' : 'Show Collision'}
                </button>
                <button
                    onClick={onToggleColorEditor}
                    className={`px-4 py-2 rounded-lg border font-bold transition-colors pointer-events-auto ${
                        showColorEditor
                            ? 'bg-purple-500/80 border-purple-700 text-white hover:bg-purple-600/80'
                            : 'bg-black/50 border-slate-700 text-slate-400 hover:bg-black/70'
                    }`}
                    title="F4 to toggle"
                >
                    {showColorEditor ? '🎨 Hide Scheme' : '🎨 Edit Scheme'}
                </button>
            </div>
        </>
    );
};

export default GameUIControls;
