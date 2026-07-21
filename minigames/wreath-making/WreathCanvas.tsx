/**
 * Wreath Making mini-game — the freehand placement canvas.
 *
 * The ring sprite sits centred inside a larger canvas; flowers are free-floating
 * and fully overlappable, draggable to reposition and scrollable to resize
 * (or to adjust the crop window while in crop mode).
 */

import React from 'react';
import { getItem } from '../../data/items';
import { tileAssets } from '../../assets';
import { getFlowerImage } from './wreathHelpers';
import {
  CROP_ZOOM_STEP,
  FLOWER_BASE_SIZE,
  SCALE_STEP,
  WREATH_CANVAS_SIZE,
  WREATH_RING_OFFSET,
  WREATH_RING_SIZE,
} from './wreathConstants';
import type { SlotData } from './wreathTypes';
import type { WreathQuality } from './wreathQuality';

interface WreathCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  placedItems: SlotData[];
  editingSlot: number | null;
  selectedFlower: string | null;
  isCropping: boolean;
  filledCount: number;
  uniqueCount: number;
  canCreate: boolean;
  quality: WreathQuality | null;
  onCanvasClick: (e: React.MouseEvent) => void;
  onFlowerClick: (e: React.MouseEvent, index: number) => void;
  onFlowerDragStart: (e: React.MouseEvent | React.TouchEvent, index: number) => void;
  onZoom: (delta: number) => void;
  onCropZoom: (delta: number) => void;
}

export const WreathCanvas: React.FC<WreathCanvasProps> = ({
  canvasRef,
  placedItems,
  editingSlot,
  selectedFlower,
  isCropping,
  filledCount,
  uniqueCount,
  canCreate,
  quality,
  onCanvasClick,
  onFlowerClick,
  onFlowerDragStart,
  onZoom,
  onCropZoom,
}) => {
  return (
    <div
      ref={canvasRef}
      onClick={onCanvasClick}
      style={{
        position: 'relative',
        width: WREATH_CANVAS_SIZE,
        height: WREATH_CANVAS_SIZE,
        cursor: selectedFlower ? 'crosshair' : 'default',
        overflow: 'hidden',
        outline: '2px dashed rgba(255, 255, 255, 0.25)',
        outlineOffset: '-2px',
      }}
    >
      {/* Decorative wreath ring */}
      <img
        src={tileAssets.wreath_base}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: WREATH_RING_OFFSET,
          top: WREATH_RING_OFFSET,
          width: WREATH_RING_SIZE,
          height: WREATH_RING_SIZE,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Click-to-place hint overlay when a flower is selected */}
      {selectedFlower && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: WREATH_CANVAS_SIZE,
            height: WREATH_CANVAS_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2,
            background: 'rgba(100, 140, 80, 0.08)',
            borderRadius: '50%',
          }}
        >
          <span style={{ fontSize: 12, color: '#8a9a7a', fontStyle: 'italic' }}>
            Click to place
          </span>
        </div>
      )}

      {/* Centre label (only when nothing is selected) */}
      {!selectedFlower && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: WREATH_CANVAS_SIZE,
            height: WREATH_CANVAS_SIZE,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {filledCount === 0 && (
            <div style={{ fontSize: 12, color: '#5a6a4a', fontStyle: 'italic' }}>
              Drag flowers here
            </div>
          )}
          {canCreate && quality && (
            <div
              style={{
                fontSize: 14,
                fontWeight: 'bold',
                color:
                  quality.tier === 'magnificent'
                    ? '#fbbf24'
                    : quality.tier === 'fine'
                      ? '#93c5fd'
                      : '#a8b89a',
              }}
            >
              {quality.label}
            </div>
          )}
          {filledCount > 0 && (
            <div style={{ fontSize: 11, color: '#6a7a5a', marginTop: 2 }}>
              {filledCount} item{filledCount !== 1 ? 's' : ''} · {uniqueCount} type
              {uniqueCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Placed flowers — freehand, fully overlappable */}
      {placedItems.map((slot, i) => {
        const isEditing = editingSlot === i;
        const flowerSize = FLOWER_BASE_SIZE * slot.scale;
        const cx = slot.x;
        const cy = slot.y;
        const imageUrl = getFlowerImage(slot.itemId);
        const item = getItem(slot.itemId);

        const isCropped = slot.cropZoom > 1;
        const showCropBorder = isEditing && isCropping;

        return (
          <div
            key={`flower-${i}`}
            onClick={(e) => onFlowerClick(e, i)}
            onMouseDown={(e) => onFlowerDragStart(e, i)}
            onTouchStart={(e) => onFlowerDragStart(e, i)}
            onWheel={(e) => {
              if (!isEditing) return;
              e.preventDefault();
              const delta = e.deltaY < 0 ? CROP_ZOOM_STEP : -CROP_ZOOM_STEP;
              if (isCropping) {
                onCropZoom(delta);
              } else {
                onZoom(delta > 0 ? -SCALE_STEP : SCALE_STEP);
              }
            }}
            style={{
              position: 'absolute',
              left: cx - flowerSize / 2,
              top: cy - flowerSize / 2,
              width: flowerSize,
              height: flowerSize,
              cursor: isCropping && isEditing ? 'move' : 'grab',
              zIndex: isEditing ? 10 : 3,
              filter: isEditing ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : undefined,
              touchAction: 'none',
              transition: isEditing ? 'filter 0.15s ease' : undefined,
              // Circular clip when cropped or actively cropping
              borderRadius: isCropped || showCropBorder ? '50%' : undefined,
              overflow: isCropped || showCropBorder ? 'hidden' : undefined,
              // Dashed border when actively cropping
              outline: showCropBorder ? '2px dashed rgba(255,255,255,0.6)' : undefined,
              outlineOffset: showCropBorder ? -1 : undefined,
            }}
            title={
              isCropping && isEditing
                ? 'Drag to pan, scroll to crop'
                : `${item?.displayName ?? slot.itemId} — drag to move, scroll to resize`
            }
          >
            {imageUrl ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  transformOrigin: 'center center',
                  transform:
                    slot.rotation !== 0 || slot.flipH || slot.flipV
                      ? `rotate(${slot.rotation}deg) scale(${slot.flipH ? -1 : 1}, ${slot.flipV ? -1 : 1})`
                      : undefined,
                }}
              >
                <img
                  src={imageUrl}
                  alt={item?.displayName ?? slot.itemId}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    pointerEvents: 'none',
                    transformOrigin: 'center center',
                    transform:
                      isCropped || showCropBorder
                        ? `scale(${slot.cropZoom}) translate(${slot.cropX}px, ${slot.cropY}px)`
                        : undefined,
                  }}
                  draggable={false}
                />
              </div>
            ) : (
              <span
                style={{
                  fontSize: flowerSize * 0.5,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {item?.icon ?? '🌼'}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
