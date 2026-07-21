/**
 * Wreath Making mini-game — centre column.
 *
 * Wraps the placement canvas with the editing hint, the quality/sell-value
 * summary and the cancel/create action buttons.
 */

import React from 'react';
import { WreathCanvas } from './WreathCanvas';
import { MIN_FLOWERS } from './wreathConstants';
import type { SlotData } from './wreathTypes';
import type { WreathQuality } from './wreathQuality';

interface WreathStageProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  placedItems: SlotData[];
  editingSlot: number | null;
  selectedFlower: string | null;
  isCropping: boolean;
  filledCount: number;
  uniqueCount: number;
  canCreate: boolean;
  quality: WreathQuality | null;
  isCreating: boolean;
  onCanvasClick: (e: React.MouseEvent) => void;
  onFlowerClick: (e: React.MouseEvent, index: number) => void;
  onFlowerDragStart: (e: React.MouseEvent | React.TouchEvent, index: number) => void;
  onZoom: (delta: number) => void;
  onCropZoom: (delta: number) => void;
  onClose: () => void;
  onCreate: () => void;
}

export const WreathStage: React.FC<WreathStageProps> = ({
  canvasRef,
  placedItems,
  editingSlot,
  selectedFlower,
  isCropping,
  filledCount,
  uniqueCount,
  canCreate,
  quality,
  isCreating,
  onCanvasClick,
  onFlowerClick,
  onFlowerDragStart,
  onZoom,
  onCropZoom,
  onClose,
  onCreate,
}) => {
  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Wreath area — freehand placement canvas */}
      <WreathCanvas
        canvasRef={canvasRef}
        placedItems={placedItems}
        editingSlot={editingSlot}
        selectedFlower={selectedFlower}
        isCropping={isCropping}
        filledCount={filledCount}
        uniqueCount={uniqueCount}
        canCreate={canCreate}
        quality={quality}
        onCanvasClick={onCanvasClick}
        onFlowerClick={onFlowerClick}
        onFlowerDragStart={onFlowerDragStart}
        onZoom={onZoom}
        onCropZoom={onCropZoom}
      />

      {/* Hint */}
      {editingSlot === null && filledCount > 0 && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#5a6a4a',
            fontStyle: 'italic',
          }}
        >
          Tap a flower to edit, or drag to reposition
        </div>
      )}

      {/* Quality preview & sell value */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: 480,
          fontSize: 13,
          color: '#8a9a7a',
          marginTop: 4,
        }}
      >
        <div>
          {canCreate && quality
            ? `${quality.label} · ${uniqueCount} type${uniqueCount !== 1 ? 's' : ''} · ${filledCount} item${filledCount !== 1 ? 's' : ''}`
            : `Need at least ${MIN_FLOWERS} flowers`}
        </div>
        {canCreate && quality && <div style={{ color: '#86efac' }}>Sell: {quality.sellPrice}g</div>}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          marginTop: 4,
        }}
      >
        <button
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{
            padding: '10px 20px',
            background: '#2a3a22',
            border: '2px solid #3a5a2a',
            borderRadius: 8,
            color: '#8a9a7a',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={onCreate}
          onTouchEnd={(e) => {
            e.preventDefault();
            onCreate();
          }}
          disabled={!canCreate || isCreating}
          style={{
            padding: '10px 20px',
            background: canCreate && !isCreating ? '#4a6a3a' : '#2a3a22',
            border: `2px solid ${canCreate && !isCreating ? '#6b8e5a' : '#3a5a2a'}`,
            borderRadius: 8,
            color: canCreate && !isCreating ? '#e0e8d0' : '#5a6a4a',
            cursor: canCreate && !isCreating ? 'pointer' : 'not-allowed',
            fontSize: 14,
            fontWeight: 'bold',
            opacity: canCreate && !isCreating ? 1 : 0.6,
          }}
        >
          {isCreating ? 'Creating...' : 'Create Wreath'}
        </button>
      </div>
    </div>
  );
};
