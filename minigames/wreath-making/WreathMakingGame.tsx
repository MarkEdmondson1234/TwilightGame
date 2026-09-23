import { finishTinyWreathLesson } from '../../utils/tinyWreathLesson';
/**
 * Wreath Making mini-game — Mushra's Wreath Workshop
 *
 * Two layouts, chosen by `wreathLayout.ts`: on a desktop, a wide layout with a
 * flower gallery on the left, the wreath in the centre and tools on the right;
 * on phones and tablets, a stacked full-screen layout (`CompactWreathWorkshop`)
 * with the wreath fitted to the width, a flower strip, a bottom tool sheet and a
 * sticky action bar. Both drive the same editor and the same creation below. Flowers are free-floating on the wreath ring — they can
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
 * Cost: the flowers used (consumed on completion).
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

import React, { useState, useCallback, useRef } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { decorationManager } from '../../utils/DecorationManager';
import { EditingToolPanel } from './EditingToolPanel';
import { FloatingFlower } from './FlowerSprites';
import { FlowerGallery } from './FlowerGallery';
import { WreathStage } from './WreathStage';
import { CompactWreathWorkshop } from './CompactWreathWorkshop';
import { useWreathLayout } from './wreathLayout';
import { captureWreathImage } from './wreathCapture';
import { getWreathQuality } from './wreathQuality';
import { useWreathEditor } from './useWreathEditor';
import { MIN_FLOWERS, TARGET_WORKSHOP_WIDTH } from './wreathConstants';
import { debugLog } from '../../utils/debugLog';

export const WreathMakingGame: React.FC<MiniGameComponentProps> = ({
  context,
  onClose,
  onComplete,
}) => {
  const editor = useWreathEditor(context.actions);
  const { placedItems } = editor;

  const [isCreating, setIsCreating] = useState(false);
  const creatingRef = useRef(false);
  const [createError, setCreateError] = useState('');
  const { compact, canvasScale } = useWreathLayout();

  // =========================================================================
  // Create the wreath
  // =========================================================================

  const handleCreate = useCallback(async () => {
    const filled = placedItems;
    if (filled.length < MIN_FLOWERS || creatingRef.current) return;

    creatingRef.current = true;
    setIsCreating(true);
    setCreateError('');
    const fail = (message: string) => {
      setCreateError(message);
      creatingRef.current = false;
      setIsCreating(false);
    };

    // Consume the flowers
    const counts: Record<string, number> = {};
    for (const f of filled) {
      counts[f.itemId] = (counts[f.itemId] || 0) + 1;
    }
    if (Object.entries(counts).some(([id, qty]) => context.actions.getItemQuantity(id) < qty)) {
      fail('Some materials are no longer in your bag. Remove those flowers or return with more.');
      return;
    }
    const consumed: Array<[string, number]> = [];
    const refund = () => consumed.forEach(([id, qty]) => context.actions.addItem(id, qty));
    for (const [itemId, qty] of Object.entries(counts)) {
      if (!context.actions.removeItem(itemId, qty)) {
        refund();
        fail('Your materials changed. Please try again.');
        return;
      }
      consumed.push([itemId, qty]);
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
      debugLog('WreathMaking', `Captured wreath image, decoration ${decorationId}`);
    } catch (err) {
      console.warn('[WreathMaking] Failed to capture wreath image:', err);
    }

    // Add the wreath item to inventory, linking it to its custom decoration image
    const added = decorationId
      ? context.actions.addItemWithDecoration(q.itemId, decorationId)
      : context.actions.addItem(q.itemId, 1); // fallback if image capture failed
    if (!added) {
      refund();
      if (decorationId) decorationManager.deletePainting(decorationId);
      fail(
        'Your wreath could not be put in your bag. Your flowers were returned. Please try again.'
      );
      return;
    }
    finishTinyWreathLesson();

    const result: MiniGameResult = {
      success: true,
      score: new Set(filled.map((f) => f.itemId)).size,
      rewards: [], // Item added directly above
      friendshipRewards: [{ npcId: 'mushra', points: q.friendship }],
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
  }, [placedItems, context.actions, context.storage, onComplete]);

  const closeWorkshop = () => {
    if (!creatingRef.current) onClose();
  };

  if (compact) {
    return (
      <CompactWreathWorkshop
        editor={editor}
        canvasScale={canvasScale}
        isCreating={isCreating}
        createError={createError}
        onClose={closeWorkshop}
        onCreate={handleCreate}
      />
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div
      style={{
        background: '#1a2e1a',
        border: '3px solid #6b8e5a',
        borderRadius: 16,
        padding: 16,
        width: TARGET_WORKSHOP_WIDTH,
        maxWidth: '90vw',
        maxHeight: '90dvh',
        overflow: 'auto',
        boxSizing: 'border-box',
        color: '#e0e8d0',
        userSelect: 'none',
        fontFamily: 'inherit',
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
          aria-label="Close wreath workshop"
          disabled={isCreating}
          onClick={closeWorkshop}
          onTouchEnd={(e) => {
            e.preventDefault();
            closeWorkshop();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#e0e8d0',
            fontSize: 24,
            cursor: 'pointer',
            padding: 4,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          ✕
        </button>
      </div>

      <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 12px', color: '#e0e8d0' }}>
        Select a flower, then click the ring to place it (or drag it there). Arrange at least four,
        then Create Wreath. Only the materials you use are spent; no gold fee.
      </p>
      {createError && (
        <p role="alert" style={{ color: '#ffcda8' }}>
          {createError}
        </p>
      )}
      {/* ================================================================= */}
      {/* Two-column layout: Gallery (left) + Wreath (right)                */}
      {/* ================================================================= */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        {/* ——————————————— LEFT: Flower Gallery ——————————————— */}
        <FlowerGallery
          placedCount={placedItems.length}
          availableFlowers={editor.availableFlowers}
          selectedFlower={editor.selectedFlower}
          previewFlowerId={editor.previewFlowerId}
          onSelectFlower={editor.handleSelectFlower}
          onGalleryDragStart={editor.handleGalleryDragStart}
          onHoverFlower={editor.setGalleryFlower}
        />

        {/* ——————————————— CENTRE: Wreath Canvas + Buttons ——————————————— */}
        <WreathStage
          canvasScale={canvasScale}
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
          onClose={closeWorkshop}
          onClear={editor.handleClear}
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
