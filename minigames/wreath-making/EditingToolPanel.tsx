/**
 * Wreath Making mini-game — right-hand editing tool panel.
 *
 * Size, rotation, mirroring, cropping and removal for the currently selected
 * flower. Controls stay visible but dimmed and locked when nothing is selected.
 */

import React from 'react';
import { getItem } from '../../data/items';
import { FlowerThumb } from './FlowerSprites';
import { CROP_ZOOM_STEP, ROTATION_STEP, SCALE_STEP, ZOOM_BTN } from './wreathConstants';
import type { SlotData } from './wreathTypes';

interface EditingToolPanelProps {
  editingSlotData: SlotData | null;
  isCropping: boolean;
  onZoom: (delta: number) => void;
  onCropZoom: (delta: number) => void;
  onResetCrop: () => void;
  onRotate: (delta: number) => void;
  onResetRotation: () => void;
  onFlip: (axis: 'h' | 'v') => void;
  onToggleCrop: () => void;
  onRemove: () => void;
}

export const EditingToolPanel: React.FC<EditingToolPanelProps> = ({
  editingSlotData,
  isCropping,
  onZoom,
  onCropZoom,
  onResetCrop,
  onRotate,
  onResetRotation,
  onFlip,
  onToggleCrop,
  onRemove,
}) => {
  return (
    <div
      style={{
        flex: '0 0 280px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingTop: 8,
      }}
    >
      {/* Header — flower name when selected, hint when not */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 28,
        }}
      >
        {editingSlotData ? (
          <>
            <FlowerThumb itemId={editingSlotData.itemId} size={20} />
            <span style={{ fontSize: 12, color: '#a0b090', fontWeight: 'bold' }}>
              {getItem(editingSlotData.itemId)?.displayName}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 11, color: '#4a5a3a', fontStyle: 'italic' }}>
            Click a flower on the wreath to edit it.
          </span>
        )}
      </div>

      {/* Controls — always visible, dimmed and locked when nothing is selected */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 6,
          width: '100%',
          opacity: editingSlotData ? 1 : 0.35,
          pointerEvents: editingSlotData ? 'auto' : 'none',
          transition: 'opacity 0.15s',
        }}
      >
        {/* Main toolbar row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            padding: '8px 12px',
            background: '#2a3a22',
            borderRadius: 8,
            border: '1px solid #3a5a2a',
            width: '100%',
          }}
        >
          {!isCropping && (
            <>
              <span style={{ fontSize: 11, color: '#6a7a5a' }}>Size:</span>
              <button onClick={() => onZoom(-SCALE_STEP)} style={ZOOM_BTN} title="Smaller">
                −
              </button>
              <div style={{ width: 36, textAlign: 'center', fontSize: 11, color: '#8a9a7a' }}>
                {editingSlotData ? `${Math.round(editingSlotData.scale * 100)}%` : '—'}
              </div>
              <button onClick={() => onZoom(SCALE_STEP)} style={ZOOM_BTN} title="Bigger">
                +
              </button>
            </>
          )}
          {isCropping && (
            <>
              <span style={{ fontSize: 11, color: '#6a7a5a' }}>Crop:</span>
              <button
                onClick={() => onCropZoom(-CROP_ZOOM_STEP)}
                style={ZOOM_BTN}
                title="Less crop"
              >
                −
              </button>
              <div style={{ width: 36, textAlign: 'center', fontSize: 11, color: '#8a9a7a' }}>
                {editingSlotData ? `${Math.round(editingSlotData.cropZoom * 100)}%` : '—'}
              </div>
              <button onClick={() => onCropZoom(CROP_ZOOM_STEP)} style={ZOOM_BTN} title="More crop">
                +
              </button>
              <button
                onClick={onResetCrop}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid #5a7a4a',
                  background: '#2a3a22',
                  color: '#8a9a7a',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
                title="Reset crop"
              >
                Reset
              </button>
            </>
          )}
        </div>

        {/* Rotation row */}
        {!isCropping && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              padding: '6px 12px',
              background: '#2a3a22',
              borderRadius: 8,
              border: '1px solid #3a5a2a',
              width: '100%',
            }}
          >
            <span style={{ fontSize: 11, color: '#6a7a5a' }}>Rotate:</span>
            <button
              onClick={() => onRotate(-ROTATION_STEP)}
              style={ZOOM_BTN}
              title="Rotate anticlockwise 15°"
            >
              ↺
            </button>
            <div style={{ width: 36, textAlign: 'center', fontSize: 11, color: '#8a9a7a' }}>
              {editingSlotData ? `${editingSlotData.rotation}°` : '—'}
            </div>
            <button
              onClick={() => onRotate(ROTATION_STEP)}
              style={ZOOM_BTN}
              title="Rotate clockwise 15°"
            >
              ↻
            </button>
            {editingSlotData && editingSlotData.rotation !== 0 && (
              <button
                onClick={onResetRotation}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid #5a7a4a',
                  background: '#2a3a22',
                  color: '#8a9a7a',
                  cursor: 'pointer',
                  fontSize: 10,
                }}
                title="Reset rotation"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Second row: mirror + crop toggle + remove */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <button
            onClick={() => onFlip('h')}
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              border: editingSlotData?.flipH ? '1px solid #6ee7b7' : '1px solid #5a7a4a',
              background: editingSlotData?.flipH ? '#1a3a2a' : '#2a3a22',
              color: editingSlotData?.flipH ? '#6ee7b7' : '#8a9a7a',
              cursor: 'pointer',
              fontSize: 11,
            }}
            title="Flip horizontally"
          >
            ⇔ Flip
          </button>
          <button
            onClick={() => onFlip('v')}
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              border: editingSlotData?.flipV ? '1px solid #6ee7b7' : '1px solid #5a7a4a',
              background: editingSlotData?.flipV ? '#1a3a2a' : '#2a3a22',
              color: editingSlotData?.flipV ? '#6ee7b7' : '#8a9a7a',
              cursor: 'pointer',
              fontSize: 11,
            }}
            title="Flip vertically"
          >
            ⇕ Flip
          </button>
          <button
            onClick={onToggleCrop}
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              border: isCropping ? '1px solid #c4b5fd' : '1px solid #5a7a4a',
              background: isCropping ? '#3a3a52' : '#2a3a22',
              color: isCropping ? '#c4b5fd' : '#8a9a7a',
              cursor: 'pointer',
              fontSize: 11,
            }}
            title={isCropping ? 'Exit crop mode' : 'Crop the flower image into a circle'}
          >
            {isCropping ? '✂ Done cropping' : '✂ Crop'}
          </button>
          {isCropping && (
            <span style={{ fontSize: 10, color: '#6a7a5a', fontStyle: 'italic' }}>
              Drag to pan, scroll to zoom
            </span>
          )}
          <button
            onClick={onRemove}
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              border: '1px solid #6a3a3a',
              background: '#3a2222',
              color: '#e8a0a0',
              cursor: 'pointer',
              fontSize: 11,
            }}
            title="Remove this flower"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};
