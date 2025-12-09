import React, { useState } from 'react';
import RecipeBook from './RecipeBook';
import { uiAssets } from '../assets';

interface BookshelfProps {
  playerPosition?: { x: number; y: number };
  currentMapId?: string;
  nearbyNPCs?: string[];
}

/**
 * Bookshelf UI component with clickable books for recipe books
 * - Recipe Book (left): Opens regular recipe book
 * - Magic Recipe Book (right): Opens magic recipe book (future feature, currently locked)
 */
const Bookshelf: React.FC<BookshelfProps> = ({ playerPosition, currentMapId, nearbyNPCs }) => {
  const [isRecipeBookOpen, setIsRecipeBookOpen] = useState(false);
  const [isMagicBookOpen, setIsMagicBookOpen] = useState(false);

  // Magic book is locked for now (future feature)
  const magicBookUnlocked = false;

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
      {/* Bookshelf Container - Responsive scaling */}
      <div className="fixed bottom-2 sm:bottom-4 left-2 sm:left-4 z-40 scale-50 sm:scale-75 md:scale-100 origin-bottom-left">
        {/* Books container - positioned independently */}
        <div className="absolute left-0 bottom-[190px] flex gap-0 items-end">
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
                height: '378px'
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
                height: '460px'
              }}
            />
            {!magicBookUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl drop-shadow-md">🔒</span>
              </div>
            )}
          </button>
        </div>

        {/* Base shelf image - scaled down to 50% */}
        <img
          src={uiAssets.bookshelf_base}
          alt="Bookshelf"
          className="w-[18rem] h-48 drop-shadow-2xl"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Recipe Book Modal */}
      <RecipeBook
        isOpen={isRecipeBookOpen}
        onClose={() => setIsRecipeBookOpen(false)}
        playerPosition={playerPosition}
        currentMapId={currentMapId}
        nearbyNPCs={nearbyNPCs}
      />

      {/* Magic Recipe Book Modal (placeholder for future feature) */}
      {isMagicBookOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-purple-900 to-purple-950 border-4 border-purple-600 rounded-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-purple-200 mb-4 text-center">
              ✨ Magic Recipe Book ✨
            </h2>
            <p className="text-purple-300 text-center mb-6">
              This mystical tome contains recipes for magical potions and enchanted foods.
              Its secrets will be revealed in a future update!
            </p>
            <button
              onClick={() => setIsMagicBookOpen(false)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Bookshelf;
