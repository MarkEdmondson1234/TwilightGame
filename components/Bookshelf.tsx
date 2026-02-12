import React, { useState } from 'react';
import { uiAssets } from '../assets';
import { Z_HUD, zClass } from '../zIndex';
import { magicManager } from '../utils/MagicManager';

interface BookshelfProps {
  isTouchDevice?: boolean;
  playerPosition?: { x: number; y: number };
  currentMapId?: string;
  nearbyNPCs?: string[];
  onRecipeBookOpen?: () => void;
  onMagicBookOpen?: () => void;
  onJournalOpen?: () => void;
}

/**
 * Book UI component with clickable books arranged like a bookshelf
 * - Magic Recipe Book (front/center): Opens magic recipe book (unlocked after meeting the Witch)
 * - Recipe Book: Opens regular recipe book
 * - Journal: Opens quest journal
 */
const Bookshelf: React.FC<BookshelfProps> = ({
  isTouchDevice,
  playerPosition,
  currentMapId,
  nearbyNPCs,
  onRecipeBookOpen,
  onMagicBookOpen,
  onJournalOpen,
}) => {
  // Check if magic book is unlocked (player talked to Witch)
  const magicBookUnlocked = magicManager.isMagicBookUnlocked();

  // Track which book is expanded (for touch devices - tap to expand, tap again to open)
  const [expandedBook, setExpandedBook] = useState<string | null>(null);

  const handleRecipeBookClick = () => {
    onRecipeBookOpen?.();
  };

  const handleMagicBookClick = () => {
    if (magicBookUnlocked) {
      onMagicBookOpen?.();
    }
  };

  const handleJournalClick = () => {
    onJournalOpen?.();
  };

  // Touch handler for tap-to-expand pattern
  const handleBookTouch = (
    bookId: string,
    onOpen: (() => void) | undefined,
    e: React.TouchEvent
  ) => {
    e.preventDefault();
    if (expandedBook === bookId) {
      // Already expanded - open it
      onOpen?.();
      setExpandedBook(null);
    } else {
      // Expand this book (collapse others)
      setExpandedBook(bookId);
    }
  };

  return (
    <>
      {/* Books Container - no container scaling since individual books handle their own scale */}
      {/* On touch devices, position at top-left to avoid overlapping D-pad controls */}
      <div
        className={`fixed left-2 sm:left-4 ${zClass(Z_HUD)} ${isTouchDevice ? 'origin-top-left' : 'origin-bottom-left'}`}
        style={
          isTouchDevice ? { top: 'calc(80px + env(safe-area-inset-top, 0px))' } : { bottom: '8px' }
        }
      >
        {/* Books - arranged like a bookshelf with magic book in front */}
        <div className="flex gap-0 items-end">
          {/* Magic Recipe Book (front/center) - 108×480 natural ratio */}
          <button
            onClick={handleMagicBookClick}
            onTouchStart={(e) => magicBookUnlocked && handleBookTouch('magic', onMagicBookOpen, e)}
            disabled={!magicBookUnlocked}
            className={`
              relative origin-bottom-left transition-all duration-300 ease-out
              focus:outline-none rounded block hover:z-10
              ${expandedBook === 'magic' ? 'scale-100 z-10' : 'scale-[0.33]'}
              ${
                magicBookUnlocked
                  ? `${!isTouchDevice ? 'hover:scale-100' : ''} active:scale-95 focus:ring-2 focus:ring-purple-400 cursor-pointer`
                  : 'opacity-50 cursor-not-allowed grayscale'
              }
            `}
            style={{
              // Pull next book closer when this one is shrunk (88px * 0.67 = ~59px of empty space)
              marginRight: expandedBook === 'magic' ? '0px' : '-59px',
            }}
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

          {/* Recipe Book - 93×398 natural ratio */}
          <button
            onClick={handleRecipeBookClick}
            onTouchStart={(e) => handleBookTouch('recipe', onRecipeBookOpen, e)}
            className={`
              origin-bottom-left transition-all duration-300 ease-out
              active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-400 rounded block hover:z-10
              ${expandedBook === 'recipe' ? 'scale-100 z-10' : 'scale-[0.33]'}
              ${!isTouchDevice ? 'hover:scale-100' : ''}
            `}
            style={{
              // Pull next book closer when this one is shrunk (73px * 0.67 = ~49px of empty space)
              marginRight: expandedBook === 'recipe' ? '0px' : '-49px',
            }}
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

          {/* Journal - 281×1000 natural ratio, scaled to 112×400 */}
          <button
            onClick={handleJournalClick}
            onTouchStart={(e) => handleBookTouch('journal', onJournalOpen, e)}
            className={`
              relative origin-bottom-left transition-all duration-300 ease-out
              focus:outline-none rounded block hover:z-10
              active:scale-95 focus:ring-2 focus:ring-green-400 cursor-pointer
              ${expandedBook === 'journal' ? 'scale-100 z-10' : 'scale-[0.33]'}
              ${!isTouchDevice ? 'hover:scale-100' : ''}
            `}
            title="Journal"
          >
            <img
              src={uiAssets.book_journal}
              alt="Journal"
              className="drop-shadow-2xl block"
              style={{
                imageRendering: 'auto',
                width: '112px',
                height: '400px',
              }}
            />
          </button>
        </div>
      </div>
    </>
  );
};

export default Bookshelf;
