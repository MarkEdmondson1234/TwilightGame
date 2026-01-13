import React, { useState } from 'react';
import RecipeBook from './RecipeBook';
import MagicRecipeBook from './MagicRecipeBook';
import { uiAssets } from '../assets';
import { Z_HUD, Z_BOOKSHELF_MODAL, zClass } from '../zIndex';
import { magicManager } from '../utils/MagicManager';

interface BookshelfProps {
  isTouchDevice?: boolean;
  playerPosition?: { x: number; y: number };
  currentMapId?: string;
  nearbyNPCs?: string[];
}

/**
 * Book UI component with clickable books for recipe books
 * - Recipe Book (left): Opens regular recipe book
 * - Magic Recipe Book (right): Opens magic recipe book (future feature, currently locked)
 */
const Bookshelf: React.FC<BookshelfProps> = ({
  isTouchDevice,
  playerPosition,
  currentMapId,
  nearbyNPCs,
}) => {
  const [isRecipeBookOpen, setIsRecipeBookOpen] = useState(false);
  const [isMagicBookOpen, setIsMagicBookOpen] = useState(false);

  // Check if magic book is unlocked (player talked to Witch)
  const magicBookUnlocked = magicManager.isMagicBookUnlocked();

  const handleRecipeBookClick = () => {
    setIsRecipeBookOpen(true);
  };

  const handleMagicBookClick = () => {
    if (magicBookUnlocked) {
      setIsMagicBookOpen(true);
    }
  };

  return (
    <>
      {/* Books Container - Responsive scaling */}
      {/* On touch devices, position above touch controls (which are ~140-200px from bottom) */}
      <div
        className={`fixed left-2 sm:left-4 ${zClass(Z_HUD)} scale-50 sm:scale-75 md:scale-100 origin-bottom-left`}
        style={{
          bottom: isTouchDevice ? 'calc(240px + env(safe-area-inset-bottom, 0px))' : '8px',
        }}
      >
        {/* Books - positioned directly at bottom */}
        <div className="flex gap-0 items-end">
          {/* Recipe Book (left book) - clickable - 93×398 natural ratio, scaled down by 20px */}
          <button
            onClick={handleRecipeBookClick}
            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-400 rounded block"
            title="Recipe Book"
          >
            <img
              src={uiAssets.book_recipes}
              alt="Recipe Book"
              className="drop-shadow-2xl block"
              style={{
                imageRendering: 'auto',
                width: '73px',
                height: '378px',
              }}
            />
          </button>

          {/* Magic Recipe Book (right book) - clickable when unlocked - 108×480 natural ratio, scaled down by 20px */}
          <button
            onClick={handleMagicBookClick}
            disabled={!magicBookUnlocked}
            className={`relative transition-transform focus:outline-none rounded -ml-[5px] block ${
              magicBookUnlocked
                ? 'hover:scale-110 active:scale-95 focus:ring-2 focus:ring-purple-400 cursor-pointer'
                : 'opacity-50 cursor-not-allowed grayscale'
            }`}
            title={magicBookUnlocked ? 'Magic Recipe Book' : 'Magic Recipe Book (Locked)'}
          >
            <img
              src={uiAssets.book_magic}
              alt="Magic Recipe Book"
              className="drop-shadow-2xl block"
              style={{
                imageRendering: 'auto',
                width: '88px',
                height: '460px',
              }}
            />
            {!magicBookUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl drop-shadow-md">🔒</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Recipe Book Modal */}
      <RecipeBook
        isOpen={isRecipeBookOpen}
        onClose={() => setIsRecipeBookOpen(false)}
        playerPosition={playerPosition}
        currentMapId={currentMapId}
        nearbyNPCs={nearbyNPCs}
      />

      {/* Magic Recipe Book Modal */}
      <MagicRecipeBook isOpen={isMagicBookOpen} onClose={() => setIsMagicBookOpen(false)} />
    </>
  );
};

export default Bookshelf;
