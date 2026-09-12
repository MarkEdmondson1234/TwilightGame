import React, { useState } from 'react';
import { uiAssets } from '../assets';
import { Z_HUD, zClass } from '../zIndex';

interface GameUIControlsProps {
  showHelpBrowser: boolean;
  onToggleHelpBrowser: () => void;
  onOpenAccount?: () => void;
  onOpenBooks?: () => void;
  showCollisionBoxes: boolean;
  onToggleCollisionBoxes: () => void;
  onToggleInventory: () => void;
  isTouchDevice: boolean;
}

/**
 * Game UI control buttons (Help, Collision, Inventory)
 * Positioned as overlay elements on the game viewport
 *
 * Touch devices:
 * - Satchel stays at 80px and opens with a normal tap
 * - Satchel occupies the lower-right corner
 * - Dev buttons hidden (desktop only)
 */
const GameUIControls: React.FC<GameUIControlsProps> = ({
  showHelpBrowser,
  onToggleHelpBrowser,
  onOpenAccount,
  onOpenBooks,
  showCollisionBoxes,
  onToggleCollisionBoxes,
  onToggleInventory,
  isTouchDevice,
}) => {
  const [satchelExpanded, setSatchelExpanded] = useState(false);

  return (
    <>
      {/* Help Button - Top Right (cottagecore styled) */}
      <div
        data-game-ui
        className={`absolute right-2 flex items-center gap-2 ${zClass(Z_HUD)}`}
        style={{
          top: 'calc(8px + env(safe-area-inset-top, 0px))',
          right: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        {isTouchDevice && onOpenBooks && (
          <button
            onClick={onOpenBooks}
            className="min-h-12 px-3 rounded font-serif font-semibold border-2 border-[#8b7355] bg-[#f5f0e1] text-[#5a4636]"
          >
            Books
          </button>
        )}
        {onOpenAccount && (
          <button
            onClick={onOpenAccount}
            className="min-h-12 px-3 rounded font-serif font-semibold border-2 border-[#8b7355] bg-[#f5f0e1] text-[#5a4636] pointer-events-auto"
          >
            Account
          </button>
        )}
        <button
          onClick={onToggleHelpBrowser}
          aria-label="Help and settings"
          className="w-12 h-12 rounded-full font-serif font-bold text-xl sm:text-2xl transition-all pointer-events-auto"
          style={{
            background: showHelpBrowser
              ? 'linear-gradient(to bottom, #d4a84b, #c99a3e)'
              : 'linear-gradient(to bottom, #f5f0e1, #e8dcc8)',
            border: showHelpBrowser ? '3px solid #8b6914' : '3px solid #8b7355',
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

      {/* Inventory Satchel - Responsive sizing and positioning */}
      <div
        data-game-ui
        className={`absolute right-2 ${zClass(Z_HUD)} transition-all duration-200`}
        style={{
          // Reserve the lower-right corner for the satchel.
          // Add safe area inset for notched devices
          bottom: isTouchDevice ? 'calc(8px + env(safe-area-inset-bottom, 0px))' : '64px',
          right: 'max(8px, env(safe-area-inset-right))',
          touchAction: 'manipulation',
        }}
      >
        <button
          onClick={onToggleInventory}
          onMouseEnter={() => !isTouchDevice && setSatchelExpanded(true)}
          onMouseLeave={() => setSatchelExpanded(false)}
          className="transition-transform focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg pointer-events-auto"
          title="Inventory [I]"
        >
          <img
            src={uiAssets.satchel}
            alt="Inventory"
            className="drop-shadow-2xl block transition-all duration-200"
            style={{
              imageRendering: 'auto',
              // Responsive sizing:
              // - Touch: stable 80px target; no growth under a held finger.
              // - Desktop: 85px default (33% of 256), 256px expanded
              width: isTouchDevice ? '80px' : satchelExpanded ? '256px' : '85px',
              height: isTouchDevice ? '80px' : satchelExpanded ? '256px' : '85px',
            }}
          />
        </button>
      </div>

      {/* Dev Toggle Buttons - Desktop only (hidden on touch devices) */}
      {!isTouchDevice && (
        <div
          className={`absolute bottom-2 right-2 ${zClass(Z_HUD)} flex flex-col sm:flex-row gap-1 sm:gap-2`}
        >
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
      )}
    </>
  );
};

export default GameUIControls;
