/**
 * Wreath Making mini-game — Mushra's Wreath Workshop
 *
 * Wide two-column layout with a flower gallery on the left and wreath
 * on the right. Flowers are free-floating on the wreath ring — they can
 * overlap, be dragged to reposition, and zoomed to any size. The gallery
 * celebrates the hand-drawn artwork with large close-up previews.
 *
 * Flowers can be dragged directly from the gallery onto the wreath ring.
 *
 * On creation the wreath arrangement is captured as an image (like paintings)
 * and stored via DecorationManager so it appears in inventory and as a
 * placed decoration with the actual arrangement artwork.
 *
 * Using more unique flower types produces a higher-quality wreath
 * (Rustic → Fine → Magnificent).
 *
 * Cost: 15 gold + the flowers used (consumed on completion).
 * Rewards: A wreath decoration item + friendship with Mushra.
 *
 * This file is the component shell — layout plus wreath creation. The rest
 * lives alongside it:
 *   - `useWreathEditor.ts` — arrangement state, dragging, per-slot transforms
 *   - `wreathConstants.ts` — sizing, stepping, materials, palette
 *   - `wreathTypes.ts`     — SlotData and the slot factory
 *   - `wreathQuality.ts`   — quality tiers
 *   - `wreathCapture.ts`   — offscreen image capture
 *   - `wreathHelpers.ts`   — flower image lookup, pointer position
 *   - `FlowerGallery.tsx` / `WreathStage.tsx` / `WreathCanvas.tsx` /
 *     `EditingToolPanel.tsx` / `FlowerSprites.tsx` — UI
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { decorationManager } from '../../utils/DecorationManager';
import { EditingToolPanel } from './EditingToolPanel';
import { FloatingFlower } from './FlowerSprites';
import { FlowerGallery } from './FlowerGallery';
import { WreathStage } from './WreathStage';
import { captureWreathImage } from './wreathCapture';
import { getWreathQuality } from './wreathQuality';
import { useWreathEditor } from './useWreathEditor';
import { MIN_FLOWERS, TARGET_WORKSHOP_WIDTH } from './wreathConstants';

export const WreathMakingGame: React.FC<MiniGameComponentProps> = ({
  context,
  onClose,
  onComplete,
}) => {
  const editor = useWreathEditor(context.actions);
  const { placedItems } = editor;

  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /** Current viewport width — used to scale down the workshop on small screens. */
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

  // Track viewport width for responsive scaling
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // =========================================================================
  // Create the wreath
  // =========================================================================

  const handleCreate = useCallback(async () => {
    const filled = placedItems;
    if (filled.length < MIN_FLOWERS || isCreating) return;

    setIsCreating(true);

    // Consume the flowers
    const counts: Record<string, number> = {};
    for (const f of filled) {
      counts[f.itemId] = (counts[f.itemId] || 0) + 1;
    }
    for (const [itemId, qty] of Object.entries(counts)) {
      context.actions.removeItem(itemId, qty);
    }

    const q = getWreathQuality(placedItems);

    // Capture the wreath arrangement as an image
    let wreathImageUrl = '';
    let decorationId = '';
    try {
      const dataUrl = await captureWreathImage(placedItems);
      decorationId = decorationManager.registerCustomDecoration({
        imageUrl: dataUrl,
        name: `${q.label} Wreath`,
        linkedItemId: q.itemId,
        scale: 1.5,
      });
      wreathImageUrl = dataUrl;
      console.log(`[WreathMaking] Captured wreath image, decoration ${decorationId}`);
    } catch (err) {
      console.warn('[WreathMaking] Failed to capture wreath image:', err);
    }

    // Add the wreath item to inventory, linking it to its custom decoration image
    if (decorationId) {
      context.actions.addItemWithDecoration(q.itemId, decorationId);
    } else {
      context.actions.addItem(q.itemId, 1); // fallback if image capture failed
    }

    const result: MiniGameResult = {
      success: true,
      score: new Set(filled.map((f) => f.itemId)).size,
      rewards: [], // Item added directly above
      friendshipRewards: [{ npcId: 'forest_mushra', points: q.friendship }],
      message:
        q.tier === 'magnificent'
          ? 'What a breathtaking wreath! Mushra is absolutely delighted!'
          : q.tier === 'fine'
            ? 'A lovely wreath! Mushra smiles warmly.'
            : 'A sweet little wreath. Mushra nods approvingly.',
      messageType: 'success',
      progressData: {
        lastTier: q.tier,
        wreathImageUrl,
        totalWreaths: (context.storage.load<{ totalWreaths?: number }>()?.totalWreaths ?? 0) + 1,
      },
    };

    onComplete(result);
  }, [placedItems, context.actions, context.storage, onComplete, isCreating]);

  // Scale the workshop down proportionally when the viewport is too narrow
  const workshopScale = Math.min(1, (windowWidth * 0.95) / TARGET_WORKSHOP_WIDTH);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div
      style={{
        background: '#1a2e1a',
        border: '3px solid #6b8e5a',
        borderRadius: 16,
        padding: 24,
        width: TARGET_WORKSHOP_WIDTH,
        maxWidth: '96vw',
        color: '#e0e8d0',
        userSelect: 'none',
        fontFamily: 'inherit',
        transform: workshopScale < 1 ? `scale(${workshopScale})` : undefined,
        transformOrigin: 'top center',
      }}
      onMouseMove={editor.handleAnyMove}
      onMouseUp={editor.handleAnyEnd}
      onMouseLeave={editor.handleAnyEnd}
      onTouchMove={editor.handleAnyMove}
      onTouchEnd={editor.handleAnyEnd}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Mushra&apos;s Wreath Workshop</h2>
        <button
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault();
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#e0e8d0',
            fontSize: 24,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 12,
            background: '#4a2020',
            borderRadius: 6,
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          {message}
        </div>
      )}

      {/* ================================================================= */}
      {/* Two-column layout: Gallery (left) + Wreath (right)                */}
      {/* ================================================================= */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* ——————————————— LEFT: Flower Gallery ——————————————— */}
        <FlowerGallery
          availableFlowers={editor.availableFlowers}
          selectedFlower={editor.selectedFlower}
          previewFlowerId={editor.previewFlowerId}
          onSelectFlower={editor.handleSelectFlower}
          onGalleryDragStart={editor.handleGalleryDragStart}
          onHoverFlower={editor.setGalleryFlower}
        />

        {/* ——————————————— CENTRE: Wreath Canvas + Buttons ——————————————— */}
        <WreathStage
          canvasRef={editor.wreathRef}
          placedItems={placedItems}
          editingSlot={editor.editingSlot}
          selectedFlower={editor.selectedFlower}
          isCropping={editor.isCropping}
          filledCount={editor.filledCount}
          uniqueCount={editor.uniqueCount}
          canCreate={editor.canCreate}
          quality={editor.quality}
          isCreating={isCreating}
          onCanvasClick={editor.handleWreathCanvasClick}
          onFlowerClick={editor.handleFlowerClick}
          onFlowerDragStart={editor.handleDragStart}
          onZoom={editor.handleZoom}
          onCropZoom={editor.handleCropZoom}
          onClose={onClose}
          onCreate={handleCreate}
        />

        {/* ——————————————— RIGHT: Editing Tool Panel ——————————————— */}
        <EditingToolPanel
          editingSlotData={editor.editingSlotData}
          isCropping={editor.isCropping}
          onZoom={editor.handleZoom}
          onCropZoom={editor.handleCropZoom}
          onResetCrop={editor.handleResetCrop}
          onRotate={editor.handleRotate}
          onResetRotation={editor.handleResetRotation}
          onFlip={editor.handleFlip}
          onToggleCrop={editor.handleToggleCrop}
          onRemove={editor.handleRemoveFromSlot}
        />
      </div>

      {/* Floating flower during gallery drag */}
      {editor.galleryDragItem && (
        <FloatingFlower
          itemId={editor.galleryDragItem}
          initialPos={editor.galleryDragPosRef.current}
          innerRef={editor.floatingFlowerRef}
        />
      )}
    </div>
  );
};
