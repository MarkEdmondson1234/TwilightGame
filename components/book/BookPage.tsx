import React from 'react';
import { BookThemeConfig, bookStyles } from './bookThemes';

interface BookPageProps {
  side: 'left' | 'right';
  theme: BookThemeConfig;
  children: React.ReactNode;
  pageNumber?: number;
  totalPages?: number;
  className?: string;
}

/**
 * BookPage - A single page container within the book spread
 *
 * Positioned to align with the actual page areas in the openbook_ui.png image.
 * Uses absolute positioning calibrated to the book background.
 */
const BookPage: React.FC<BookPageProps> = ({
  side,
  theme,
  children,
  pageNumber,
  totalPages,
  className = '',
}) => {
  const pageConfig = bookStyles.page[side];

  return (
    <div
      className={`absolute flex flex-col overflow-hidden ${className}`}
      style={{
        left: pageConfig.left,
        right: pageConfig.right,
        top: pageConfig.top,
        bottom: pageConfig.bottom,
        padding: bookStyles.page.padding,
        fontFamily: bookStyles.fontFamily.body,
        color: theme.textPrimary,
      }}
    >
      {/* Page content - scrollable within the page bounds */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">{children}</div>

      {/* Page number (optional) - fixed at bottom */}
      {pageNumber !== undefined && totalPages !== undefined && (
        <div
          className="text-center text-xs mt-1 select-none flex-shrink-0"
          style={{
            color: theme.textMuted,
            fontFamily: bookStyles.fontFamily.body,
            fontStyle: 'italic',
          }}
        >
          {pageNumber} of {totalPages}
        </div>
      )}
    </div>
  );
};

export default BookPage;
