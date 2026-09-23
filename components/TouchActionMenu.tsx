/**
 * TouchActionMenu — the action menu on phones and tablets.
 *
 * A small cluster of round icon buttons beside the tap that opened it, each with
 * a short label underneath, and a small close button. Tapping anywhere else
 * closes it.
 *
 * It replaces a centred 420px parchment sheet with full-width 48px rows, which
 * on a phone in landscape covered most of the screen for a two-option menu
 * ("Talk to Sleepy Cat", "Give Gift") and was still hidden behind the chat
 * button and quick bar (issue #157). Desktop keeps the column in RadialMenu.
 *
 * Only ever opened by the player — a tap on something with several things to
 * do, or a long press. It never opens by itself.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import GameIcon from './GameIcon';
import { useMenuViewport } from '../hooks/useMenuViewport';
import { placeTouchMenu, TOUCH_MENU_MARGIN_PX } from '../utils/touchMenuPlacement';
import type { RadialMenuOption } from './RadialMenu';

/** Round button: Apple's minimum comfortable tap target. */
export const TOUCH_ACTION_BUTTON_PX = 44;
/** Width of one option (button plus its label). Long labels wrap to two lines, then truncate. */
export const TOUCH_ACTION_ITEM_WIDTH_PX = 76;
/** More options than this wrap onto a second row rather than spanning the screen. */
const MAX_OPTIONS_PER_ROW = 5;
const ITEM_GAP_PX = 4;
const ICON_PX = 26;

const COLOURS = {
  button: '#5c4a3d',
  buttonSelected: '#4a6741',
  border: '#e8dcc6',
  borderSelected: '#b7cfae',
  label: 'rgba(44, 33, 25, 0.82)',
  cream: '#f5efe8',
};

interface TouchActionMenuProps {
  position: { x: number; y: number };
  options: RadialMenuOption[];
  onClose: () => void;
  /** Backdrop z-index; the menu sits one above it. */
  zIndex: number;
  /** Screen rectangles the menu must not cover (the fixed touch controls). */
  avoid?: readonly { left: number; top: number; right: number; bottom: number }[];
}

const TouchActionMenu: React.FC<TouchActionMenuProps> = ({
  position,
  options,
  onClose,
  zIndex,
  avoid,
}) => {
  const viewport = useMenuViewport();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Measured, not estimated: the row wraps with the option count and screen width.
  // The first paint is hidden so the menu does not visibly jump into place.
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const next = placeTouchMenu(position, { width, height }, viewport, avoid);
    // Callers may pass fresh arrays each render; only commit a real move.
    setPlaced((prev) =>
      prev && prev.left === next.left && prev.top === next.top ? prev : next
    );
  }, [position, options, viewport, avoid]);

  const select = (option: RadialMenuOption, index: number) => {
    setSelectedIndex(index);
    // Brief highlight so the player sees which one they hit.
    setTimeout(() => {
      option.onSelect();
      if (!option.staysOpen) onClose();
    }, 100);
  };

  const rowWidth =
    MAX_OPTIONS_PER_ROW * TOUCH_ACTION_ITEM_WIDTH_PX + MAX_OPTIONS_PER_ROW * ITEM_GAP_PX;

  return (
    <>
      <div
        data-testid="touch-action-menu-backdrop"
        style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex }}
        onClick={onClose}
      />
      <div
        ref={menuRef}
        data-game-ui
        role="dialog"
        aria-label="Actions"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'fixed',
          left: placed?.left ?? position.x,
          top: placed?.top ?? position.y,
          zIndex: zIndex + 1,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: ITEM_GAP_PX,
          maxWidth: Math.min(rowWidth, viewport.width - 2 * TOUCH_MENU_MARGIN_PX),
          visibility: placed ? 'visible' : 'hidden',
          touchAction: 'manipulation',
        }}
      >
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              key={option.id}
              type="button"
              aria-label={option.label}
              title={option.label}
              onClick={() => select(option, index)}
              style={{
                width: TOUCH_ACTION_ITEM_WIDTH_PX,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: 0,
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: TOUCH_ACTION_BUTTON_PX,
                  height: TOUCH_ACTION_BUTTON_PX,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? COLOURS.buttonSelected : COLOURS.button,
                  border: `2px solid ${isSelected ? COLOURS.borderSelected : COLOURS.border}`,
                  boxShadow: '0 3px 8px rgba(40, 30, 22, 0.45)',
                  color: COLOURS.cream,
                  fontFamily: 'Georgia, serif',
                  fontSize: 18,
                }}
              >
                {option.icon ? (
                  <GameIcon icon={option.icon} size={ICON_PX} />
                ) : (
                  option.label.charAt(0)
                )}
              </span>
              <span
                aria-hidden="true"
                style={{
                  maxWidth: TOUCH_ACTION_ITEM_WIDTH_PX,
                  padding: '1px 5px',
                  borderRadius: 6,
                  backgroundColor: COLOURS.label,
                  color: COLOURS.cream,
                  fontFamily: 'Georgia, serif',
                  fontSize: 11,
                  lineHeight: '13px',
                  textAlign: 'center',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflowWrap: 'anywhere',
                }}
              >
                {option.label}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Close actions"
          onClick={onClose}
          style={{
            width: TOUCH_ACTION_BUTTON_PX,
            height: TOUCH_ACTION_BUTTON_PX,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: COLOURS.label,
              border: `2px solid ${COLOURS.border}`,
              color: COLOURS.cream,
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ✕
          </span>
        </button>
      </div>
    </>
  );
};

export default TouchActionMenu;
