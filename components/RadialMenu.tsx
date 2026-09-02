/**
 * RadialMenu Component
 * Displays interaction options in a circular menu around the clicked position
 * Cottage-core styled with click-to-select behaviour
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Z_RADIAL_MENU } from '../zIndex';
import GameIcon from './GameIcon';

/** Keep the menu this far from every screen edge. */
const VIEWPORT_MARGIN = 12;

/**
 * How far above the touch point the menu sits on touch devices.
 *
 * A cursor is a few pixels; a fingertip covers roughly a 45px disc, and the hand covers
 * everything below it. Centring the menu on the press point would put the middle option
 * under the finger that just opened it.
 */
const TOUCH_LIFT_PX = 90;

export interface RadialMenuOption {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  onSelect: () => void;
  /** If true, the menu does not close after this option is selected (e.g. for confirmation flows) */
  staysOpen?: boolean;
}

interface RadialMenuProps {
  /** Screen position where menu should appear (in pixels) */
  position: { x: number; y: number };
  /** Available interaction options */
  options: RadialMenuOption[];
  /** Callback when menu is closed without selection */
  onClose: () => void;
  /** Override default z-index (use when rendering inside a modal) */
  zIndex?: number;
  /**
   * The menu was opened by a long press rather than a right-click, so lift it clear of
   * the finger. See TOUCH_LIFT_PX.
   */
  openedByTouch?: boolean;
}

const RadialMenu: React.FC<RadialMenuProps> = ({
  position,
  options,
  onClose,
  zIndex: zIndexOverride,
  openedByTouch = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  /**
   * Clamp the menu inside the viewport.
   *
   * The options are a vertical column centred on the click, which runs off the top and
   * bottom of a phone in landscape as soon as there are more than about three of them,
   * and off the side when the player clicks near an edge. Since the menu can now be
   * opened anywhere in the world (not just on a centre-screen inventory slot), edge
   * presses are the normal case rather than the exception.
   *
   * The size is measured rather than estimated — labels are free text ("Harvest
   * Strawberry", "Dormant until spring"), so any hard-coded width is wrong for some of
   * them. The first paint is hidden to avoid a visible jump from unclamped to clamped.
   */
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [clamped, setClamped] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const { width, height } = el.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const desiredY = position.y - (openedByTouch ? TOUCH_LIFT_PX : 0);

    // Centre on the click, then pull back inside the margins. When the menu is taller
    // than the viewport, max() wins and it pins to the top rather than the bottom, so
    // the first option stays reachable.
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const x = Math.max(
      VIEWPORT_MARGIN + halfWidth,
      Math.min(position.x, viewportWidth - VIEWPORT_MARGIN - halfWidth)
    );
    const y = Math.max(
      VIEWPORT_MARGIN + halfHeight,
      Math.min(desiredY, viewportHeight - VIEWPORT_MARGIN - halfHeight)
    );

    setClamped({ x, y });
  }, [position.x, position.y, options, openedByTouch]);

  const handleOptionHover = (index: number) => {
    setHoveredIndex(index);
  };

  const handleOptionLeave = () => {
    setHoveredIndex(null);
  };

  const handleOptionClick = (option: RadialMenuOption, index: number) => {
    // Immediate selection on click
    setSelectedIndex(index);
    setTimeout(() => {
      option.onSelect();
      if (!option.staysOpen) {
        onClose();
      }
    }, 100);
  };

  return (
    <>
      {/* Invisible backdrop - click to close (no darkening) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
          zIndex: zIndexOverride ?? Z_RADIAL_MENU,
        }}
        onClick={onClose}
      />

      {/* Options arranged vertically with cottage-core styling.
          One column container, so its real size can be measured and clamped as a unit. */}
      <div
        ref={menuRef}
        style={{
          position: 'fixed',
          left: clamped?.x ?? position.x,
          top: clamped?.y ?? position.y,
          transform: 'translate(-50%, -50%)',
          zIndex: (zIndexOverride ?? Z_RADIAL_MENU) + 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          // Hidden for the measuring pass only — otherwise the menu visibly jumps from
          // its unclamped position to its clamped one.
          visibility: clamped ? 'visible' : 'hidden',
        }}
      >
        {options.map((option, index) => {
          const isHovered = hoveredIndex === index;
          const isSelected = selectedIndex === index;

          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option, index)}
              onMouseEnter={() => handleOptionHover(index)}
              onMouseLeave={handleOptionLeave}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '14px 20px',
                minWidth: '160px',
                // Cottage-core warm brown palette
                backgroundColor: isSelected
                  ? '#4a6741' // Sage green when selected
                  : isHovered
                    ? '#6b5344' // Darker warm brown on hover
                    : '#5c4a3d', // Warm brown base
                color: '#f5efe8', // Cream text
                border: `3px solid ${isSelected ? '#7a9970' : isHovered ? '#a08060' : '#8b7355'}`,
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '15px',
                fontFamily: 'Georgia, serif',
                fontWeight: '500',
                boxShadow: isHovered
                  ? '0 6px 20px rgba(92, 74, 61, 0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : '0 4px 12px rgba(92, 74, 61, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                // Parchment texture effect
                backgroundImage: isSelected
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.08) 100%)',
              }}
            >
              {option.icon && (
                <GameIcon icon={option.icon} size={32} alt={option.label} />
              )}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default RadialMenu;
