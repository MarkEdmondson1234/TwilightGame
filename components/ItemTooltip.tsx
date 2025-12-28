/**
 * ItemTooltip - Enhanced tooltip component for inventory items
 * Shows larger item image, name, description, and additional info
 */

import React, { useState, useRef, useEffect } from 'react';

export interface TooltipContent {
  name: string;
  description?: string;
  image?: string;
  additionalInfo?: string; // E.g., "Buy: 12g" or "Sell: 4g each"
  quantity?: number;
}

interface ItemTooltipProps {
  content: TooltipContent;
  children: React.ReactNode;
  delay?: number; // Delay before showing tooltip (ms)
}

/**
 * Wraps a component and shows a tooltip on hover
 * Tooltip appears near the cursor with item image and details
 */
const ItemTooltip: React.FC<ItemTooltipProps> = ({
  content,
  children,
  delay = 300,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show tooltip after delay
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition(e);
    }, delay);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isVisible) {
      updatePosition(e);
    }
  };

  const handleMouseLeave = () => {
    // Clear timeout and hide tooltip
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  const updatePosition = (e: React.MouseEvent) => {
    // Position tooltip near cursor with offset
    const offsetX = 20;
    const offsetY = 20;
    const tooltipWidth = 280;
    const tooltipHeight = 250;

    let x = e.clientX + offsetX;
    let y = e.clientY + offsetY;

    // Prevent tooltip from going off-screen (right edge)
    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - offsetX;
    }

    // Prevent tooltip from going off-screen (bottom edge)
    if (y + tooltipHeight > window.innerHeight) {
      y = e.clientY - tooltipHeight - offsetY;
    }

    setPosition({ x, y });
  };

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="contents"
      >
        {children}
      </div>

      {/* Tooltip Portal */}
      {isVisible && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
        >
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-3 border-amber-500 rounded-lg shadow-2xl p-4 min-w-[220px] max-w-[280px]">
            {/* Item Image (larger preview) */}
            {content.image && (
              <div className="flex items-center justify-center bg-slate-950/60 rounded-lg p-4 mb-3 border border-amber-700/50">
                <img
                  src={content.image}
                  alt={content.name}
                  className="w-32 h-32 object-contain pixelated"
                />
              </div>
            )}

            {/* Item Name */}
            <div className="text-amber-200 font-bold text-lg mb-1 text-center">
              {content.name}
              {content.quantity !== undefined && content.quantity > 1 && (
                <span className="text-sm ml-1 text-amber-400">({content.quantity})</span>
              )}
            </div>

            {/* Item Description */}
            {content.description && (
              <div className="text-slate-300 text-xs mb-2 text-center italic">
                {content.description}
              </div>
            )}

            {/* Additional Info (price, etc.) */}
            {content.additionalInfo && (
              <div className="text-amber-400 text-sm font-semibold text-center mt-2 pt-2 border-t border-amber-700/50">
                {content.additionalInfo}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ItemTooltip;
