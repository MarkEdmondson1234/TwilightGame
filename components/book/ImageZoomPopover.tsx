import React, { useState, useRef, useCallback } from 'react';

interface ImageZoomPopoverProps {
  src: string;
  alt: string;
  className?: string;
  zoomSize?: number; // Size of zoomed image in pixels
  children?: React.ReactNode; // Optional custom trigger element
}

/**
 * ImageZoomPopover - Shows a zoomed view of an image on hover
 *
 * Wrap an image or provide a custom trigger element. On hover,
 * displays a larger version of the image in a popover.
 */
const ImageZoomPopover: React.FC<ImageZoomPopoverProps> = ({
  src,
  alt,
  className = '',
  zoomSize = 180,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Position popover to the right of the element by default
      let x = rect.right + 10;
      let y = rect.top + rect.height / 2 - zoomSize / 2;

      // If would go off right edge, position to the left
      if (x + zoomSize > viewportWidth - 20) {
        x = rect.left - zoomSize - 10;
      }

      // Keep within vertical bounds
      if (y < 10) y = 10;
      if (y + zoomSize > viewportHeight - 10) {
        y = viewportHeight - zoomSize - 10;
      }

      setPopoverPosition({ x, y });
      setIsHovered(true);
    },
    [zoomSize]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={`relative group ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children || <img src={src} alt={alt} className="w-full h-full object-contain" />}
        {/* Cottagecore hover indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <span
            className="text-lg drop-shadow-md"
            style={{ textShadow: '0 0 8px rgba(255,255,255,0.9)' }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* Zoom popover - rendered at document level via fixed positioning */}
      {isHovered && (
        <div
          className="fixed pointer-events-none z-[9999] rounded-lg shadow-2xl border-2 border-white/50 bg-white/95 p-2 animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: popoverPosition.x,
            top: popoverPosition.y,
            width: zoomSize,
            height: zoomSize,
          }}
        >
          <img src={src} alt={alt} className="w-full h-full object-contain" />
          <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] text-gray-500 truncate px-1">
            {alt}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageZoomPopover;
