/**
 * Wreath Making mini-game — left-hand flower gallery column.
 *
 * Thumbnails of everything the player can place (drag or click), plus a large
 * close-up preview celebrating the hand-drawn artwork.
 */

import React from 'react';
import { getItem } from '../../data/items';
import { FlowerThumb, GalleryPreview } from './FlowerSprites';
import { FLOWER_COLOURS, GALLERY_PREVIEW_SIZE } from './wreathConstants';
import type { AvailableFlower } from './wreathTypes';

interface FlowerGalleryProps {
  availableFlowers: AvailableFlower[];
  selectedFlower: string | null;
  previewFlowerId: string | null;
  onSelectFlower: (itemId: string) => void;
  onGalleryDragStart: (e: React.MouseEvent | React.TouchEvent, itemId: string) => void;
  onHoverFlower: (itemId: string | null) => void;
}

export const FlowerGallery: React.FC<FlowerGalleryProps> = ({
  availableFlowers,
  selectedFlower,
  previewFlowerId,
  onSelectFlower,
  onGalleryDragStart,
  onHoverFlower,
}) => {
  const previewItem = previewFlowerId ? getItem(previewFlowerId) : null;

  return (
    <div
      style={{
        flex: '0 0 250px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Flower thumbnails — at top for easy drag to wreath */}
      <div>
        <div
          style={{
            fontSize: 12,
            color: '#6a7a5a',
            marginBottom: 6,
            fontWeight: 'bold',
          }}
        >
          Your Flowers
          {selectedFlower ? (
            <span style={{ fontWeight: 'normal', marginLeft: 6, fontStyle: 'italic' }}>
              — click wreath to place
            </span>
          ) : (
            <span style={{ fontWeight: 'normal', marginLeft: 6, fontStyle: 'italic' }}>
              — drag or click to place
            </span>
          )}
        </div>
        {availableFlowers.length === 0 ? (
          <div style={{ color: '#5a6a4a', fontSize: 12, fontStyle: 'italic' }}>
            You have no flowers. Forage or grow some first!
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {availableFlowers.map((f) => {
              const isActive = selectedFlower === f.itemId;
              const isPreview = previewFlowerId === f.itemId;
              return (
                <button
                  key={f.itemId}
                  onClick={() => onSelectFlower(f.itemId)}
                  onMouseDown={(e) => onGalleryDragStart(e, f.itemId)}
                  onTouchStart={(e) => onGalleryDragStart(e, f.itemId)}
                  onMouseEnter={() => onHoverFlower(f.itemId)}
                  onMouseLeave={() => onHoverFlower(null)}
                  style={{
                    width: 54,
                    padding: '4px 0',
                    background: isActive ? '#4a6a3a' : '#2a3a22',
                    border: isActive
                      ? `2px solid ${FLOWER_COLOURS[f.itemId] ?? '#6b8e5a'}`
                      : isPreview
                        ? `2px solid ${FLOWER_COLOURS[f.itemId] ?? '#6b8e5a'}80`
                        : '2px solid #3a5a2a',
                    borderRadius: 8,
                    color: '#e0e8d0',
                    cursor: 'grab',
                    fontSize: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'border 0.15s ease',
                    touchAction: 'none',
                  }}
                >
                  <FlowerThumb itemId={f.itemId} size={40} />
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: 4,
                      padding: '0 4px',
                      fontSize: 10,
                    }}
                  >
                    x{f.available}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Large preview — below thumbnails */}
      <div
        style={{
          background: 'radial-gradient(ellipse at center, #2a4a28 0%, #1a2e1a 70%)',
          borderRadius: 12,
          border: `2px solid ${previewFlowerId ? (FLOWER_COLOURS[previewFlowerId] ?? '#3a5a2a') : '#3a5a2a'}`,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: GALLERY_PREVIEW_SIZE + 110,
          overflow: 'hidden',
        }}
      >
        {previewFlowerId && previewItem ? (
          <>
            <div
              style={{
                width: GALLERY_PREVIEW_SIZE,
                height: GALLERY_PREVIEW_SIZE,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GalleryPreview itemId={previewFlowerId} size={GALLERY_PREVIEW_SIZE} />
            </div>
            <div style={{ marginTop: 10, textAlign: 'center', overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: FLOWER_COLOURS[previewFlowerId] ?? '#e0e8d0',
                }}
              >
                {previewItem.displayName}
              </div>
              {previewItem.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#8a9a7a',
                    marginTop: 4,
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                    maxHeight: 34,
                    overflow: 'hidden',
                  }}
                >
                  {previewItem.description}
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              height: GALLERY_PREVIEW_SIZE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5a6a4a',
              fontSize: 14,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 20,
            }}
          >
            Forage or grow some flowers to see them here!
          </div>
        )}
      </div>
    </div>
  );
};
