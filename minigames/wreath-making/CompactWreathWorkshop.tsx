/**
 * Wreath Making mini-game — stacked layout for phones and tablets (issue #157).
 *
 * Full screen, top to bottom:
 *   header · one-line prompt · wreath fitted to the width (scrolls if short)
 *   · flower strip · tool sheet (only while editing) · sticky action bar
 *
 * Tap a flower in the strip, then tap the ring: no dragging is needed anywhere.
 * Dragging a flower already on the ring still repositions it.
 *
 * Rendered `position: fixed` so it escapes MiniGameHost's 90vw/90vh card, which
 * on a phone left the workshop a scrolling box inside a dimmed page.
 */

import React from 'react';
import { getItem } from '../../data/items';
import { WreathCanvas } from './WreathCanvas';
import { FlowerStrip } from './FlowerStrip';
import { CompactToolSheet } from './CompactToolSheet';
import { WreathActionBar } from './WreathActionBar';
import { MIN_FLOWERS, WREATH_CANVAS_SIZE } from './wreathConstants';
import { COMPACT_MAX_COLUMN, MIN_TOUCH_TARGET } from './wreathLayout';
import type { WreathEditor } from './useWreathEditor';

interface CompactWreathWorkshopProps {
  editor: WreathEditor;
  canvasScale: number;
  isCreating: boolean;
  createError: string;
  onClose: () => void;
  onCreate: () => void;
}

function promptFor(editor: WreathEditor): string {
  if (editor.selectedFlower) {
    const name = getItem(editor.selectedFlower)?.displayName ?? 'the flower';
    return `Now tap the ring to place ${name}.`;
  }
  if (editor.editingSlotData) return 'Drag to move it, or use the tools below.';
  if (editor.canCreate) return 'Ready! Add more, or tap Create Wreath.';
  const left = MIN_FLOWERS - editor.filledCount;
  return `Tap a flower below, then tap the ring. ${left} more to go.`;
}

export const CompactWreathWorkshop: React.FC<CompactWreathWorkshopProps> = ({
  editor,
  canvasScale,
  isCreating,
  createError,
  onClose,
  onCreate,
}) => {
  const size = WREATH_CANVAS_SIZE * canvasScale;

  return (
    <div
      data-testid="wreath-workshop-compact"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#1a2e1a',
        color: '#e0e8d0',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        fontFamily: 'inherit',
        paddingTop: 'env(safe-area-inset-top)',
        overscrollBehavior: 'contain',
      }}
      onMouseMove={editor.handleAnyMove}
      onMouseUp={editor.handleAnyEnd}
      onMouseLeave={editor.handleAnyEnd}
      onTouchMove={editor.handleAnyMove}
      onTouchEnd={editor.handleAnyEnd}
    >
      <div
        style={{
          width: '100%',
          maxWidth: COMPACT_MAX_COLUMN,
          margin: '0 auto',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 4px 0 12px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Mushra&apos;s Wreath Workshop</h2>
          <button
            aria-label="Close wreath workshop"
            disabled={isCreating}
            onClick={onClose}
            style={{
              minWidth: MIN_TOUCH_TARGET,
              minHeight: MIN_TOUCH_TARGET,
              background: 'none',
              border: 'none',
              color: '#e0e8d0',
              fontSize: 22,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable middle: prompt, wreath and status */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            padding: '0 12px 6px',
          }}
        >
          <p
            aria-live="polite"
            style={{ margin: 0, fontSize: 14, lineHeight: 1.4, textAlign: 'center' }}
          >
            {promptFor(editor)}
          </p>
          {createError && (
            <p role="alert" style={{ margin: 0, color: '#ffcda8', fontSize: 14 }}>
              {createError}
            </p>
          )}
          <div style={{ width: size, height: size, flexShrink: 0 }}>
            <div
              style={{
                width: WREATH_CANVAS_SIZE,
                height: WREATH_CANVAS_SIZE,
                transform: `scale(${canvasScale})`,
                transformOrigin: 'top left',
              }}
            >
              <WreathCanvas
                canvasRef={editor.wreathRef}
                placedItems={editor.placedItems}
                editingSlot={editor.editingSlot}
                selectedFlower={editor.selectedFlower}
                isCropping={editor.isCropping}
                filledCount={editor.filledCount}
                uniqueCount={editor.uniqueCount}
                canCreate={editor.canCreate}
                quality={editor.quality}
                onCanvasClick={editor.handleWreathCanvasClick}
                onFlowerClick={editor.handleFlowerClick}
                onFlowerDragStart={editor.handleDragStart}
                onZoom={editor.handleZoom}
                onCropZoom={editor.handleCropZoom}
              />
            </div>
          </div>
          <div style={{ fontSize: 13, color: '#a8b89a' }}>
            {editor.canCreate && editor.quality
              ? `${editor.quality.label} · ${editor.filledCount} flowers · sells for ${editor.quality.sellPrice}g`
              : `${editor.filledCount} of ${MIN_FLOWERS} flowers placed · only what you use is spent`}
          </div>
        </div>

        <FlowerStrip
          placedCount={editor.placedItems.length}
          availableFlowers={editor.availableFlowers}
          selectedFlower={editor.selectedFlower}
          onSelectFlower={editor.handleSelectFlower}
        />

        <CompactToolSheet
          editingSlotData={editor.editingSlotData}
          isCropping={editor.isCropping}
          onZoom={editor.handleZoom}
          onCropZoom={editor.handleCropZoom}
          onResetCrop={editor.handleResetCrop}
          onRotate={editor.handleRotate}
          onFlip={editor.handleFlip}
          onToggleCrop={editor.handleToggleCrop}
          onRemove={editor.handleRemoveFromSlot}
          onDone={editor.handleDeselect}
        />
      </div>

      <div style={{ width: '100%', maxWidth: COMPACT_MAX_COLUMN, margin: '0 auto' }}>
        <WreathActionBar
          canCreate={editor.canCreate}
          canClear={editor.filledCount > 0}
          isCreating={isCreating}
          onClear={editor.handleClear}
          onClose={onClose}
          onCreate={onCreate}
        />
      </div>
    </div>
  );
};
