import React, { useEffect, useCallback } from 'react';
import { Position } from '../../types';
import { Z_RECIPE_BOOK, Z_MAGIC_BOOK, Z_JOURNAL, zClass } from '../../zIndex';
import { BookTheme, getBookTheme } from './bookThemes';
import RecipeContent from './RecipeContent';
import PotionContent from './PotionContent';
import JournalContent from './JournalContent';

interface CottageBookProps {
  isOpen: boolean;
  onClose: () => void;
  theme: BookTheme;
  // Cooking-specific props (only used when theme="cooking")
  playerPosition?: Position;
  currentMapId?: string;
  cookingPosition?: Position | null;
  nearbyNPCs?: string[];
  onItemPlaced?: () => void;
}

/**
 * CottageBook - Unified cottagecore book UI
 *
 * A warm, cozy book interface for viewing recipes and potions.
 * Uses the openbook_ui.png background with page-flipping navigation.
 *
 * Themes:
 * - cooking: Recipe book with warm brown accents
 * - magic: Potion book with mystical purple accents
 */
const CottageBook: React.FC<CottageBookProps> = ({
  isOpen,
  onClose,
  theme,
  playerPosition,
  currentMapId,
  cookingPosition,
  nearbyNPCs = [],
  onItemPlaced,
}) => {
  const themeConfig = getBookTheme(theme);
  const zIndex =
    theme === 'cooking' ? Z_RECIPE_BOOK : theme === 'journal' ? Z_JOURNAL : Z_MAGIC_BOOK;

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Stop propagation to prevent game interactions
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center ${zClass(zIndex)} p-4`}
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      {/* Book container - image inside determines actual size */}
      <div
        className="relative max-w-[90vw] max-h-[85vh]"
        onClick={handleContentClick}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-2xl font-bold transition-all hover:scale-110 z-10"
          style={{ color: themeConfig.textPrimary }}
          title="Close (ESC)"
        >
          ×
        </button>

        {/* Book title badge */}
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full shadow-lg z-10"
          style={{
            backgroundColor: themeConfig.ribbonColour,
            color: '#fff',
            fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
          }}
        >
          <span className="text-lg font-bold">{themeConfig.name}</span>
        </div>

        {/* Book content */}
        <div className="w-full h-full">
          {theme === 'cooking' ? (
            <RecipeContent
              theme={themeConfig}
              playerPosition={playerPosition}
              currentMapId={currentMapId}
              cookingPosition={cookingPosition}
              nearbyNPCs={nearbyNPCs}
              onItemPlaced={onItemPlaced}
            />
          ) : theme === 'journal' ? (
            <JournalContent theme={themeConfig} />
          ) : (
            <PotionContent theme={themeConfig} />
          )}
        </div>

        {/* Help text */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-sm opacity-75"
          style={{ color: '#ccc' }}
        >
          Press ESC to close
        </div>
      </div>
    </div>
  );
};

export default CottageBook;
