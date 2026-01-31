import React from 'react';
import { BookThemeConfig, bookStyles } from './bookThemes';
import BookPage from './BookPage';
import { BookChapter } from '../../hooks/useBookPagination';

interface BookSpreadProps<ChapterId extends string> {
  theme: BookThemeConfig;
  leftPageContent: React.ReactNode;
  rightPageContent: React.ReactNode;
  leftPageNumber?: number;
  rightPageNumber?: number;
  totalPages?: number;
  className?: string;
  // Navigation props - all rendered inside the same container as the image
  chapters?: BookChapter<ChapterId>[];
  currentChapterId?: ChapterId;
  onChapterSelect?: (chapterId: ChapterId) => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrevPage?: () => void;
  onNextPage?: () => void;
}

/**
 * BookSpread - Two-page book layout with integrated navigation
 *
 * Uses the book image as an <img> element so the container always matches
 * the image dimensions exactly. ALL elements (pages, bookmarks, arrows) are
 * positioned absolutely within the same overlay, ensuring reliable alignment.
 */
function BookSpread<ChapterId extends string>({
  theme,
  leftPageContent,
  rightPageContent,
  leftPageNumber,
  rightPageNumber,
  totalPages,
  className = '',
  chapters,
  currentChapterId,
  onChapterSelect,
  canGoPrev,
  canGoNext,
  onPrevPage,
  onNextPage,
}: BookSpreadProps<ChapterId>) {
  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      {/* Book image - this determines the actual size */}
      <div className="relative max-w-full max-h-full">
        <img
          src={theme.backgroundImage}
          alt="Open book"
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />

        {/* Content overlay - ALL elements positioned here relative to book image */}
        <div className="absolute inset-0">
          {/* Chapter bookmarks - positioned on left book binding */}
          {chapters && onChapterSelect && (
            <div
              className="absolute flex flex-col gap-1"
              style={{
                left: '3%',
                top: '12%',
                zIndex: 10,
              }}
            >
              {chapters.map((chapter) => {
                const isActive = chapter.id === currentChapterId;
                const isLocked = chapter.locked;

                return (
                  <button
                    key={chapter.id}
                    onClick={() => !isLocked && onChapterSelect(chapter.id)}
                    disabled={isLocked}
                    className={`
                      flex items-center gap-1 px-2 py-1 rounded-r-md
                      transition-all duration-200 font-medium shadow-md
                      ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:pl-3'}
                      ${isActive ? 'pl-3' : ''}
                    `}
                    style={{
                      backgroundColor: isActive ? theme.ribbonColour : `${theme.ribbonColour}cc`,
                      color: '#fff',
                      fontFamily: bookStyles.fontFamily.body,
                      fontSize: '10px',
                      lineHeight: '1.2',
                      minWidth: '80px',
                    }}
                    title={isLocked ? 'Locked - master previous recipes to unlock' : chapter.label}
                  >
                    <span className="truncate">{chapter.label}</span>
                    {isLocked && <span className="text-[9px] ml-1">🔒</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Left page */}
          <BookPage side="left" theme={theme} pageNumber={leftPageNumber} totalPages={totalPages}>
            {leftPageContent}
          </BookPage>

          {/* Right page */}
          <BookPage side="right" theme={theme} pageNumber={rightPageNumber} totalPages={totalPages}>
            {rightPageContent}
          </BookPage>

          {/* Previous page arrow - left side of book, vertically centered */}
          {onPrevPage && (
            <button
              onClick={onPrevPage}
              disabled={!canGoPrev}
              className={`
                absolute w-10 h-10 rounded-full
                flex items-center justify-center
                transition-all duration-200
                ${canGoPrev ? 'hover:scale-110 hover:bg-white/20 cursor-pointer' : 'opacity-20 cursor-not-allowed'}
              `}
              style={{
                left: '4%',
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.textPrimary,
                fontSize: '24px',
                backgroundColor: 'rgba(255,255,255,0.5)',
              }}
              title="Previous page"
            >
              ❮
            </button>
          )}

          {/* Next page arrow - right side of book, vertically centered */}
          {onNextPage && (
            <button
              onClick={onNextPage}
              disabled={!canGoNext}
              className={`
                absolute w-10 h-10 rounded-full
                flex items-center justify-center
                transition-all duration-200
                ${canGoNext ? 'hover:scale-110 hover:bg-white/20 cursor-pointer' : 'opacity-20 cursor-not-allowed'}
              `}
              style={{
                right: '4%',
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.textPrimary,
                fontSize: '24px',
                backgroundColor: 'rgba(255,255,255,0.5)',
              }}
              title="Next page"
            >
              ❯
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookSpread;
