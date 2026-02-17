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
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { getItem } from '../../data/items';
import { decorationManager } from '../../utils/DecorationManager';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SLOT_COUNT = 8;
const MIN_FLOWERS = 4;
const GOLD_COST = 15;

/** Size of the empty slot indicator circle (small — just a click target). */
const SLOT_INDICATOR_SIZE = 40;

/** Base size for flower images before scaling (px). */
const FLOWER_BASE_SIZE = 80;

const DEFAULT_SCALE = 2.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.15;

/** Minimum drag distance (px) before treating as a drag instead of a click. */
const DRAG_THRESHOLD = 4;

/** How far flowers can be dragged from their slot anchor (px). */
const MAX_DRAG_OFFSET = 80;

/** Gallery preview image size. */
const GALLERY_PREVIEW_SIZE = 200;

/** All item IDs that can be used as wreath materials. */
const WREATH_MATERIALS = [
  'moonpetal',
  'addersmeat',
  'frost_flower',
  'sakura_petal',
  'shrinking_violet',
  'wolfsbane',
  'crop_sunflower',
  'crop_strawberry',
  'crop_blackberry',
  'crop_blueberry',
] as const;

/** Visual colour associated with each flower for the slot border. */
const FLOWER_COLOURS: Record<string, string> = {
  moonpetal: '#c4b5fd',
  addersmeat: '#f87171',
  frost_flower: '#a5f3fc',
  sakura_petal: '#fda4af',
  shrinking_violet: '#a78bfa',
  wolfsbane: '#818cf8',
  crop_sunflower: '#fbbf24',
  crop_strawberry: '#f43f5e',
  crop_blackberry: '#7c3aed',
  crop_blueberry: '#3b82f6',
};

/** Shared style for the round zoom/size buttons. */
const ZOOM_BTN: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '1px solid #5a7a4a',
  background: '#2a3a22',
  color: '#e0e8d0',
  cursor: 'pointer',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

// ---------------------------------------------------------------------------
// Per-slot state
// ---------------------------------------------------------------------------

interface SlotData {
  itemId: string;
  /** Horizontal offset from slot anchor (px). */
  offsetX: number;
  /** Vertical offset from slot anchor (px). */
  offsetY: number;
  /** Scale multiplier for the flower image. */
  scale: number;
}

// ---------------------------------------------------------------------------
// Flower image helpers
// ---------------------------------------------------------------------------

function getFlowerImage(itemId: string): string | null {
  const item = getItem(itemId);
  return (item?.image as string) ?? null;
}

/** Small flower sprite for thumbnails — uses circular clip. */
const FlowerThumb: React.FC<{ itemId: string; size: number }> = ({ itemId, size }) => {
  const imageUrl = getFlowerImage(itemId);
  const item = getItem(itemId);

  if (imageUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <img
          src={imageUrl}
          alt={item?.displayName ?? itemId}
          style={{
            width: size * 1.4,
            height: size * 1.4,
            objectFit: 'contain',
            position: 'absolute',
            left: (size - size * 1.4) / 2,
            top: (size - size * 1.4) / 2,
            pointerEvents: 'none',
          }}
          draggable={false}
        />
      </div>
    );
  }

  return <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{item?.icon ?? '🌼'}</span>;
};

/** Large gallery preview — shows the flower image at full size without clipping. */
const GalleryPreview: React.FC<{ itemId: string; size: number }> = ({ itemId, size }) => {
  const imageUrl = getFlowerImage(itemId);
  const item = getItem(itemId);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={item?.displayName ?? itemId}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'block',
        }}
        draggable={false}
      />
    );
  }

  return <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{item?.icon ?? '🌼'}</span>;
};

// ---------------------------------------------------------------------------
// Quality tiers
// ---------------------------------------------------------------------------

interface WreathQuality {
  tier: 'rustic' | 'fine' | 'magnificent';
  itemId: string;
  label: string;
  friendship: number;
}

function getWreathQuality(slots: (SlotData | null)[]): WreathQuality {
  const filled = slots.filter(Boolean) as SlotData[];
  const uniqueTypes = new Set(filled.map((s) => s.itemId)).size;

  if (uniqueTypes >= 5) {
    return {
      tier: 'magnificent',
      itemId: 'decoration_wreath_magnificent',
      label: 'Magnificent',
      friendship: 5,
    };
  }
  if (uniqueTypes >= 3) {
    return {
      tier: 'fine',
      itemId: 'decoration_wreath_fine',
      label: 'Fine',
      friendship: 3,
    };
  }
  return {
    tier: 'rustic',
    itemId: 'decoration_wreath_rustic',
    label: 'Rustic',
    friendship: 2,
  };
}

// ---------------------------------------------------------------------------
// Slot positions (arranged in a circle)
// ---------------------------------------------------------------------------

const WREATH_RADIUS = 100;
const WREATH_CENTRE = 140;

function getSlotPosition(index: number): { x: number; y: number } {
  const angle = ((index * 360) / SLOT_COUNT - 90) * (Math.PI / 180);
  return {
    x: WREATH_CENTRE + WREATH_RADIUS * Math.cos(angle),
    y: WREATH_CENTRE + WREATH_RADIUS * Math.sin(angle),
  };
}

// ---------------------------------------------------------------------------
// Wreath image capture (offscreen canvas → base64)
// ---------------------------------------------------------------------------

/** Size of the capture canvas (px). */
const CAPTURE_SIZE = 512;

/**
 * Render the wreath to an offscreen canvas and return a base64 PNG data URL.
 * Draws the ring + all placed flowers at their scaled positions.
 */
async function captureWreathImage(slots: (SlotData | null)[]): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CAPTURE_SIZE;
  canvas.height = CAPTURE_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Scale factor from wreath-area coords → capture canvas
  const scale = CAPTURE_SIZE / (WREATH_CENTRE * 2);

  // Draw the wreath ring
  ctx.beginPath();
  ctx.arc(WREATH_CENTRE * scale, WREATH_CENTRE * scale, WREATH_RADIUS * scale, 0, Math.PI * 2);
  ctx.lineWidth = 14 * scale;
  ctx.strokeStyle = '#3a5a2a';
  ctx.stroke();

  // Load all flower images first
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  // Draw each placed flower
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = slots[i];
    if (!slot) continue;

    const imageUrl = getFlowerImage(slot.itemId);
    if (!imageUrl) continue;

    try {
      const img = await loadImage(imageUrl);
      const anchor = getSlotPosition(i);
      const flowerSize = FLOWER_BASE_SIZE * slot.scale;
      const cx = (anchor.x + slot.offsetX) * scale;
      const cy = (anchor.y + slot.offsetY) * scale;
      const size = flowerSize * scale;

      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    } catch {
      // Skip flowers that fail to load
    }
  }

  return canvas.toDataURL('image/webp', 0.85);
}

// ---------------------------------------------------------------------------
// Client-position helper
// ---------------------------------------------------------------------------

function getClientPos(
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
): { x: number; y: number } | null {
  if ('touches' in e) {
    const touch = e.touches[0] ?? (e as TouchEvent).changedTouches?.[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const WreathMakingGame: React.FC<MiniGameComponentProps> = ({
  context,
  onClose,
  onComplete,
}) => {
  const [wreathSlots, setWreathSlots] = useState<(SlotData | null)[]>(Array(SLOT_COUNT).fill(null));
  const [selectedFlower, setSelectedFlower] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /** Flower currently shown in the gallery preview. */
  const [galleryFlower, setGalleryFlower] = useState<string | null>(null);
  /** Item ID being dragged from the gallery. */
  const [galleryDragItem, setGalleryDragItem] = useState<string | null>(null);

  // Refs
  const wreathRef = useRef<HTMLDivElement>(null);

  /** Drag state for repositioning flowers already on the wreath. */
  const dragRef = useRef<{
    slotIndex: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    didDrag: boolean;
  } | null>(null);

  /** Track whether the last interaction was a drag (survives into click handler). */
  const wasDragRef = useRef(false);

  /** Current cursor/touch position while dragging from gallery. */
  const galleryDragPosRef = useRef<{ x: number; y: number } | null>(null);

  /** DOM ref for the floating flower while gallery-dragging. */
  const floatingFlowerRef = useRef<HTMLDivElement>(null);

  // Compute available flowers (inventory minus what's placed in slots)
  const availableFlowers = useMemo(() => {
    const result: { itemId: string; displayName: string; available: number }[] = [];
    for (const matId of WREATH_MATERIALS) {
      const inInventory = context.actions.getItemQuantity(matId);
      if (inInventory <= 0) continue;
      const usedInSlots = wreathSlots.filter((s) => s?.itemId === matId).length;
      const available = inInventory - usedInSlots;
      if (available > 0) {
        const item = getItem(matId);
        result.push({
          itemId: matId,
          displayName: item?.displayName ?? matId,
          available,
        });
      }
    }
    return result;
  }, [wreathSlots, context.actions]);

  const filledCount = wreathSlots.filter(Boolean).length;
  const uniqueCount = new Set(wreathSlots.filter(Boolean).map((s) => (s as SlotData).itemId)).size;
  const canCreate = filledCount >= MIN_FLOWERS;
  const quality = canCreate ? getWreathQuality(wreathSlots) : null;

  // Determine which flower to show in the gallery preview
  const previewFlowerId =
    galleryDragItem ??
    galleryFlower ??
    (editingSlot !== null ? (wreathSlots[editingSlot]?.itemId ?? null) : null) ??
    selectedFlower ??
    (availableFlowers.length > 0 ? availableFlowers[0].itemId : null);

  const previewItem = previewFlowerId ? getItem(previewFlowerId) : null;

  // =========================================================================
  // Handlers — flower selection & slot interaction
  // =========================================================================

  const handleSelectFlower = useCallback((itemId: string) => {
    setSelectedFlower((prev) => (prev === itemId ? null : itemId));
    setEditingSlot(null);
    setGalleryFlower(itemId);
  }, []);

  /** Click an empty slot to place the currently selected flower. */
  const handleEmptySlotClick = useCallback(
    (index: number) => {
      if (!selectedFlower) return;
      const avail = availableFlowers.find((f) => f.itemId === selectedFlower);
      if (!avail || avail.available <= 0) return;
      const newSlots = [...wreathSlots];
      newSlots[index] = {
        itemId: selectedFlower,
        offsetX: 0,
        offsetY: 0,
        scale: DEFAULT_SCALE,
      };
      setWreathSlots(newSlots);
      setEditingSlot(index);
      setGalleryFlower(selectedFlower);
      setSelectedFlower(null);
    },
    [wreathSlots, selectedFlower, availableFlowers]
  );

  /** Click a placed flower to select it for editing. */
  const handleFlowerClick = useCallback(
    (index: number) => {
      if (wasDragRef.current) {
        wasDragRef.current = false;
        return;
      }
      setEditingSlot(index);
      setSelectedFlower(null);
      const slot = wreathSlots[index];
      if (slot) setGalleryFlower(slot.itemId);
    },
    [wreathSlots]
  );

  // Zoom controls
  const handleZoom = useCallback(
    (delta: number) => {
      if (editingSlot === null) return;
      setWreathSlots((prev) => {
        const newSlots = [...prev];
        const slot = newSlots[editingSlot];
        if (!slot) return prev;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, slot.scale + delta));
        newSlots[editingSlot] = { ...slot, scale: newScale };
        return newSlots;
      });
    },
    [editingSlot]
  );

  const handleRemoveFromSlot = useCallback(() => {
    if (editingSlot === null) return;
    const newSlots = [...wreathSlots];
    newSlots[editingSlot] = null;
    setWreathSlots(newSlots);
    setEditingSlot(null);
  }, [editingSlot, wreathSlots]);

  // =========================================================================
  // Drag handlers — repositioning flowers on the wreath
  // =========================================================================

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number) => {
      const slot = wreathSlots[index];
      if (!slot) return;
      const pos = getClientPos(e as React.MouseEvent);
      if (!pos) return;
      if ('touches' in e) e.preventDefault();
      dragRef.current = {
        slotIndex: index,
        startX: pos.x,
        startY: pos.y,
        startOffsetX: slot.offsetX,
        startOffsetY: slot.offsetY,
        didDrag: false,
      };
      wasDragRef.current = false;
      setEditingSlot(index);
      setSelectedFlower(null);
    },
    [wreathSlots]
  );

  // =========================================================================
  // Gallery drag — drag flowers from the gallery onto the wreath
  // =========================================================================

  const handleGalleryDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, itemId: string) => {
      const avail = availableFlowers.find((f) => f.itemId === itemId);
      if (!avail || avail.available <= 0) return;
      const pos = getClientPos(e as React.MouseEvent);
      if (!pos) return;
      if ('touches' in e) e.preventDefault();
      setGalleryDragItem(itemId);
      galleryDragPosRef.current = pos;
      // Position the floating flower immediately
      if (floatingFlowerRef.current) {
        floatingFlowerRef.current.style.left = `${pos.x}px`;
        floatingFlowerRef.current.style.top = `${pos.y}px`;
      }
    },
    [availableFlowers]
  );

  // =========================================================================
  // Combined move/end handlers (wreath drag + gallery drag)
  // =========================================================================

  const handleAnyMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const pos = getClientPos(e as React.MouseEvent);
      if (!pos) return;

      // Gallery drag — move the floating flower
      if (galleryDragItem) {
        if ('touches' in e) e.preventDefault();
        galleryDragPosRef.current = pos;
        if (floatingFlowerRef.current) {
          floatingFlowerRef.current.style.left = `${pos.x}px`;
          floatingFlowerRef.current.style.top = `${pos.y}px`;
        }
        return;
      }

      // Wreath flower drag
      if (!dragRef.current) return;
      if ('touches' in e) e.preventDefault();
      const { slotIndex, startX, startY, startOffsetX, startOffsetY } = dragRef.current;
      const dx = pos.x - startX;
      const dy = pos.y - startY;

      if (!dragRef.current.didDrag) {
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          dragRef.current.didDrag = true;
        } else {
          return;
        }
      }

      const newOffsetX = Math.max(-MAX_DRAG_OFFSET, Math.min(MAX_DRAG_OFFSET, startOffsetX + dx));
      const newOffsetY = Math.max(-MAX_DRAG_OFFSET, Math.min(MAX_DRAG_OFFSET, startOffsetY + dy));

      setWreathSlots((prev) => {
        const newSlots = [...prev];
        const slot = newSlots[slotIndex];
        if (!slot) return prev;
        newSlots[slotIndex] = { ...slot, offsetX: newOffsetX, offsetY: newOffsetY };
        return newSlots;
      });
    },
    [galleryDragItem]
  );

  const handleAnyEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Gallery drag end — find nearest empty slot and place
      if (galleryDragItem) {
        const pos = getClientPos(e as React.MouseEvent) ?? galleryDragPosRef.current;
        if (pos && wreathRef.current) {
          const rect = wreathRef.current.getBoundingClientRect();
          const relX = pos.x - rect.left;
          const relY = pos.y - rect.top;

          // Find the nearest empty slot
          let bestSlot = -1;
          let bestDist = Infinity;
          for (let i = 0; i < SLOT_COUNT; i++) {
            if (wreathSlots[i] !== null) continue;
            const sp = getSlotPosition(i);
            const dist = Math.hypot(relX - sp.x, relY - sp.y);
            if (dist < bestDist) {
              bestDist = dist;
              bestSlot = i;
            }
          }

          // Place if dropped reasonably close (within the wreath area)
          if (bestSlot >= 0 && bestDist < WREATH_RADIUS * 1.5) {
            setWreathSlots((prev) => {
              const newSlots = [...prev];
              newSlots[bestSlot] = {
                itemId: galleryDragItem,
                offsetX: 0,
                offsetY: 0,
                scale: DEFAULT_SCALE,
              };
              return newSlots;
            });
            setEditingSlot(bestSlot);
          }
        }

        setGalleryDragItem(null);
        galleryDragPosRef.current = null;
        return;
      }

      // Wreath flower drag end
      if (dragRef.current?.didDrag) {
        wasDragRef.current = true;
      }
      dragRef.current = null;
    },
    [galleryDragItem, wreathSlots]
  );

  // =========================================================================
  // Create the wreath
  // =========================================================================

  const handleCreate = useCallback(async () => {
    const filled = wreathSlots.filter(Boolean) as SlotData[];
    if (filled.length < MIN_FLOWERS || isCreating) return;

    if (!context.actions.spendGold(GOLD_COST)) {
      setMessage("You haven't got enough gold!");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsCreating(true);

    // Consume the flowers
    const counts: Record<string, number> = {};
    for (const f of filled) {
      counts[f.itemId] = (counts[f.itemId] || 0) + 1;
    }
    for (const [itemId, qty] of Object.entries(counts)) {
      context.actions.removeItem(itemId, qty);
    }

    const q = getWreathQuality(wreathSlots);

    // Capture the wreath arrangement as an image
    let wreathImageUrl = '';
    try {
      const dataUrl = await captureWreathImage(wreathSlots);
      const decorationId = decorationManager.registerCustomDecoration({
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

    // Add the wreath item to inventory directly (not via rewards, to avoid double-add)
    context.actions.addItem(q.itemId, 1);

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
  }, [wreathSlots, context.actions, context.storage, onComplete, isCreating]);

  const editingSlotData = editingSlot !== null ? wreathSlots[editingSlot] : null;

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
        width: 720,
        maxWidth: '94vw',
        color: '#e0e8d0',
        userSelect: 'none',
        fontFamily: 'inherit',
      }}
      onMouseMove={handleAnyMove}
      onMouseUp={handleAnyEnd}
      onMouseLeave={handleAnyEnd}
      onTouchMove={handleAnyMove}
      onTouchEnd={handleAnyEnd}
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
        <div
          style={{
            flex: '0 0 280px',
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
                  — tap an empty slot to place
                </span>
              ) : (
                <span style={{ fontWeight: 'normal', marginLeft: 6, fontStyle: 'italic' }}>
                  — drag onto wreath
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
                      onClick={() => handleSelectFlower(f.itemId)}
                      onMouseDown={(e) => handleGalleryDragStart(e, f.itemId)}
                      onTouchStart={(e) => handleGalleryDragStart(e, f.itemId)}
                      onMouseEnter={() => setGalleryFlower(f.itemId)}
                      onMouseLeave={() => setGalleryFlower(null)}
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
              minHeight: GALLERY_PREVIEW_SIZE + 60,
            }}
          >
            {previewFlowerId && previewItem ? (
              <>
                <GalleryPreview itemId={previewFlowerId} size={GALLERY_PREVIEW_SIZE} />
                <div style={{ marginTop: 10, textAlign: 'center' }}>
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

        {/* ——————————————— RIGHT: Wreath + Controls ——————————————— */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Wreath area — flowers are free-floating and can overlap */}
          <div
            ref={wreathRef}
            style={{
              position: 'relative',
              width: WREATH_CENTRE * 2,
              height: WREATH_CENTRE * 2,
            }}
          >
            {/* Decorative wreath ring */}
            <div
              style={{
                position: 'absolute',
                left: WREATH_CENTRE - WREATH_RADIUS - 10,
                top: WREATH_CENTRE - WREATH_RADIUS - 10,
                width: (WREATH_RADIUS + 10) * 2,
                height: (WREATH_RADIUS + 10) * 2,
                borderRadius: '50%',
                border: '14px solid #3a5a2a',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3), 0 0 10px rgba(0,0,0,0.2)',
                zIndex: 0,
              }}
            />

            {/* Empty slot indicators — small dashed circles as placement targets */}
            {Array.from({ length: SLOT_COUNT }).map((_, i) => {
              const pos = getSlotPosition(i);
              const slot = wreathSlots[i];
              if (slot) return null; // Don't show indicator for filled slots
              const isTarget = selectedFlower !== null || galleryDragItem !== null;
              const half = SLOT_INDICATOR_SIZE / 2;

              return (
                <div
                  key={`empty-${i}`}
                  onClick={() => handleEmptySlotClick(i)}
                  style={{
                    position: 'absolute',
                    left: pos.x - half,
                    top: pos.y - half,
                    width: SLOT_INDICATOR_SIZE,
                    height: SLOT_INDICATOR_SIZE,
                    borderRadius: '50%',
                    border: isTarget ? '2px dashed #8a9a7a' : '2px dashed #3a5a2a',
                    background: isTarget ? 'rgba(100, 140, 80, 0.15)' : 'rgba(0,0,0,0.15)',
                    cursor: isTarget ? 'pointer' : 'default',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isTarget && <span style={{ fontSize: 16, color: '#6a7a5a' }}>+</span>}
                </div>
              );
            })}

            {/* Centre label */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: WREATH_CENTRE * 2,
                height: WREATH_CENTRE * 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              <div style={{ fontSize: 13, color: '#8a9a7a' }}>
                {filledCount}/{SLOT_COUNT} slots
              </div>
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
                    marginTop: 4,
                  }}
                >
                  {quality.label}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#6a7a5a', marginTop: 2 }}>
                {uniqueCount} type{uniqueCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Placed flowers — free-floating, can overlap! */}
            {Array.from({ length: SLOT_COUNT }).map((_, i) => {
              const slot = wreathSlots[i];
              if (!slot) return null;
              const anchor = getSlotPosition(i);
              const isEditing = editingSlot === i;
              const flowerSize = FLOWER_BASE_SIZE * slot.scale;
              const cx = anchor.x + slot.offsetX;
              const cy = anchor.y + slot.offsetY;
              const imageUrl = getFlowerImage(slot.itemId);
              const item = getItem(slot.itemId);

              return (
                <div
                  key={`flower-${i}`}
                  onClick={() => handleFlowerClick(i)}
                  onMouseDown={(e) => handleDragStart(e, i)}
                  onTouchStart={(e) => handleDragStart(e, i)}
                  style={{
                    position: 'absolute',
                    left: cx - flowerSize / 2,
                    top: cy - flowerSize / 2,
                    width: flowerSize,
                    height: flowerSize,
                    cursor: 'grab',
                    zIndex: isEditing ? 10 : 3,
                    filter: isEditing ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : undefined,
                    touchAction: 'none',
                    transition: isEditing ? 'filter 0.15s ease' : undefined,
                  }}
                  title={`${item?.displayName ?? slot.itemId} — drag to move`}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item?.displayName ?? slot.itemId}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none',
                      }}
                      draggable={false}
                    />
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

          {/* Editing controls for the selected flower */}
          {editingSlotData && editingSlot !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '8px 12px',
                background: '#2a3a22',
                borderRadius: 8,
                border: '1px solid #3a5a2a',
                width: '100%',
                maxWidth: 320,
              }}
            >
              <FlowerThumb itemId={editingSlotData.itemId} size={24} />
              <span style={{ fontSize: 11, color: '#8a9a7a', minWidth: 0 }}>
                {getItem(editingSlotData.itemId)?.displayName}
              </span>
              <span style={{ fontSize: 11, color: '#6a7a5a' }}>Size:</span>
              <button onClick={() => handleZoom(-SCALE_STEP)} style={ZOOM_BTN} title="Smaller">
                −
              </button>
              <div
                style={{
                  width: 36,
                  textAlign: 'center',
                  fontSize: 11,
                  color: '#8a9a7a',
                }}
              >
                {Math.round(editingSlotData.scale * 100)}%
              </div>
              <button onClick={() => handleZoom(SCALE_STEP)} style={ZOOM_BTN} title="Bigger">
                +
              </button>
              <button
                onClick={handleRemoveFromSlot}
                style={{
                  marginLeft: 4,
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
          )}

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
              Tap a flower to resize, or drag to reposition
            </div>
          )}

          {/* Quality preview & cost */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              maxWidth: 300,
              fontSize: 13,
              color: '#8a9a7a',
              marginTop: 4,
            }}
          >
            <div>
              {canCreate && quality
                ? `Quality: ${quality.label} (${uniqueCount} types)`
                : `Need at least ${MIN_FLOWERS} flowers`}
            </div>
            <div>Cost: {GOLD_COST}g</div>
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
              onClick={handleCreate}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleCreate();
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
      </div>

      {/* Floating flower during gallery drag */}
      {galleryDragItem && (
        <div
          ref={floatingFlowerRef}
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: 9999,
            width: 60,
            height: 60,
            transform: 'translate(-50%, -50%)',
            opacity: 0.85,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
            left: galleryDragPosRef.current?.x ?? 0,
            top: galleryDragPosRef.current?.y ?? 0,
          }}
        >
          {(() => {
            const imgUrl = getFlowerImage(galleryDragItem);
            if (imgUrl) {
              return (
                <img
                  src={imgUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  draggable={false}
                />
              );
            }
            const itm = getItem(galleryDragItem);
            return <span style={{ fontSize: 30 }}>{itm?.icon ?? '🌼'}</span>;
          })()}
        </div>
      )}
    </div>
  );
};
