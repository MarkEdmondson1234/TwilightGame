/**
 * Wreath Making mini-game — compact editing tools.
 *
 * The phone/tablet counterpart of `EditingToolPanel`: a small bottom sheet that
 * appears only while a flower on the ring is selected, with one scrollable row
 * of 44px buttons. Same handlers as the desktop panel, so behaviour matches.
 */

import React from 'react';
import { getItem } from '../../data/items';
import { FlowerThumb } from './FlowerSprites';
import { CROP_ZOOM_STEP, ROTATION_STEP, SCALE_STEP } from './wreathConstants';
import { MIN_TOUCH_TARGET } from './wreathLayout';
import type { SlotData } from './wreathTypes';

interface CompactToolSheetProps {
  editingSlotData: SlotData | null;
  isCropping: boolean;
  onZoom: (delta: number) => void;
  onCropZoom: (delta: number) => void;
  onResetCrop: () => void;
  onRotate: (delta: number) => void;
  onFlip: (axis: 'h' | 'v') => void;
  onToggleCrop: () => void;
  onRemove: () => void;
  onDone: () => void;
}

const toolButton = (active = false, tone: 'normal' | 'danger' = 'normal'): React.CSSProperties => ({
  flex: '0 0 auto',
  minWidth: MIN_TOUCH_TARGET,
  minHeight: MIN_TOUCH_TARGET,
  padding: '0 10px',
  borderRadius: 10,
  border: `2px solid ${tone === 'danger' ? '#6a3a3a' : active ? '#6ee7b7' : '#4a6a3a'}`,
  background: tone === 'danger' ? '#3a2222' : active ? '#1a3a2a' : '#2a3a22',
  color: tone === 'danger' ? '#f0b0b0' : active ? '#6ee7b7' : '#e0e8d0',
  fontSize: 16,
  cursor: 'pointer',
  touchAction: 'manipulation',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
});

export const CompactToolSheet: React.FC<CompactToolSheetProps> = ({
  editingSlotData,
  isCropping,
  onZoom,
  onCropZoom,
  onResetCrop,
  onRotate,
  onFlip,
  onToggleCrop,
  onRemove,
  onDone,
}) => {
  if (!editingSlotData) return null;
  const name = getItem(editingSlotData.itemId)?.displayName ?? editingSlotData.itemId;

  return (
    <div
      role="toolbar"
      aria-label={`Edit ${name}`}
      style={{
        borderTop: '2px solid #3a5a2a',
        borderRadius: '14px 14px 0 0',
        background: '#22341f',
        padding: '6px 0 4px',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px 4px',
          fontSize: 13,
          color: '#a0b090',
        }}
      >
        <FlowerThumb itemId={editingSlotData.itemId} size={22} />
        <strong style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </strong>
        <span>
          {isCropping
            ? `Crop ${Math.round(editingSlotData.cropZoom * 100)}% · drag to pan`
            : `${Math.round(editingSlotData.scale * 100)}% · ${editingSlotData.rotation}° · drag to move`}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          padding: '2px 12px',
          touchAction: 'pan-x',
        }}
      >
        {isCropping ? (
          <>
            <button
              aria-label="Less crop"
              style={toolButton()}
              onClick={() => onCropZoom(-CROP_ZOOM_STEP)}
            >
              −
            </button>
            <button
              aria-label="More crop"
              style={toolButton()}
              onClick={() => onCropZoom(CROP_ZOOM_STEP)}
            >
              +
            </button>
            <button style={toolButton()} onClick={onResetCrop}>
              Reset
            </button>
            <button style={toolButton(true)} onClick={onToggleCrop}>
              ✂ Done cropping
            </button>
          </>
        ) : (
          <>
            <button aria-label="Smaller" style={toolButton()} onClick={() => onZoom(-SCALE_STEP)}>
              −
            </button>
            <button aria-label="Bigger" style={toolButton()} onClick={() => onZoom(SCALE_STEP)}>
              +
            </button>
            <button
              aria-label="Rotate anticlockwise"
              style={toolButton()}
              onClick={() => onRotate(-ROTATION_STEP)}
            >
              ↺
            </button>
            <button
              aria-label="Rotate clockwise"
              style={toolButton()}
              onClick={() => onRotate(ROTATION_STEP)}
            >
              ↻
            </button>
            <button
              aria-label="Flip horizontally"
              aria-pressed={editingSlotData.flipH}
              style={toolButton(editingSlotData.flipH)}
              onClick={() => onFlip('h')}
            >
              ⇔
            </button>
            <button
              aria-label="Flip vertically"
              aria-pressed={editingSlotData.flipV}
              style={toolButton(editingSlotData.flipV)}
              onClick={() => onFlip('v')}
            >
              ⇕
            </button>
            <button style={toolButton()} onClick={onToggleCrop}>
              ✂ Crop
            </button>
            <button style={toolButton(false, 'danger')} onClick={onRemove}>
              Remove
            </button>
            <button style={toolButton()} onClick={onDone}>
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
};
