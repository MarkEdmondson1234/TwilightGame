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
        fontFamily: theme.fontBody,
        color: theme.textPrimary,
      }}
    >
      {/* Page content - scrollable within the page bounds, with subtle background for readability */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-sm"
        style={{
          backgroundColor: 'rgba(245, 238, 228, 0.45)',
          padding: '4%',
          textShadow: '0 0 6px rgba(245, 238, 228, 0.8)',
        }}
      >
        {children}
      </div>

      {/* Page number (optional) - fixed at bottom */}
      {pageNumber !== undefined && totalPages !== undefined && (
        <div
          className="text-center text-base mt-1 select-none flex-shrink-0"
          style={{
            color: theme.textMuted,
            fontFamily: theme.fontBody,
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
