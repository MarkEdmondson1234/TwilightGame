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

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { getItem } from '../../data/items';
import { decorationManager } from '../../utils/DecorationManager';
import { tileAssets, herbAssets } from '../../assets';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_FLOWERS = 4;

/** Base size for flower images before scaling (px). */
const FLOWER_BASE_SIZE = 80;

const DEFAULT_SCALE = 2.2;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.15;
const ROTATION_STEP = 15;

/** Minimum drag distance (px) before treating as a drag instead of a click. */
const DRAG_THRESHOLD = 4;

/** Default crop zoom (1 = full image, no crop). */
const DEFAULT_CROP_ZOOM = 1;
/** Max crop zoom (higher = more zoomed in / tighter crop). */
const MAX_CROP_ZOOM = 3.0;
const CROP_ZOOM_STEP = 0.2;
/** Max crop pan offset (px, relative to image centre). */
const MAX_CROP_PAN = 60;

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
  'rose_red_crop',
  'rose_crop',
  'feather',
  'crop_chili',
  'crop_onion',
  'vanilla',
  'dragonfly_wings',
  'ghost_lichen',
  'crop_lavender',
  'heather_sprig',
  'straw',
  'red_berries',
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
  rose_red_crop: '#ef4444',
  rose_crop: '#f9a8d4',
  feather: '#e2e8f0',
  crop_chili: '#dc2626',
  crop_onion: '#d97706',
  vanilla: '#d4b896',
  dragonfly_wings: '#22d3ee',
  ghost_lichen: '#94a3b8',
  crop_lavender: '#b19cd9',
  heather_sprig: '#9b6dbd',
  straw: '#d4a843',
  red_berries: '#c0392b',
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
  /** Absolute X position (centre) within the wreath canvas (px). */
  x: number;
  /** Absolute Y position (centre) within the wreath canvas (px). */
  y: number;
  /** Scale multiplier for the flower image. */
  scale: number;
  /** Crop: horizontal pan within image (px from centre). */
  cropX: number;
  /** Crop: vertical pan within image (px from centre). */
  cropY: number;
  /** Crop zoom (1 = full image, >1 = zoomed in / cropped tighter). */
  cropZoom: number;
  /** Rotation in degrees (clockwise). */
  rotation: number;
  /** Mirror horizontally. */
  flipH: boolean;
  /** Mirror vertically. */
  flipV: boolean;
}

/** Create a new SlotData with defaults. */
function makeSlot(itemId: string, x: number, y: number, overrides?: Partial<SlotData>): SlotData {
  return {
    itemId,
    x,
    y,
    scale: DEFAULT_SCALE,
    cropX: 0,
    cropY: 0,
    cropZoom: DEFAULT_CROP_ZOOM,
    rotation: 0,
    flipH: false,
    flipV: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Flower image helpers
// ---------------------------------------------------------------------------

/** Per-item image overrides for the wreath mini-game (used when the default item image doesn't suit the small slot). */
const WREATH_IMAGE_OVERRIDES: Record<string, string> = {
  crop_lavender: herbAssets.lavender_sprig,
};

function getFlowerImage(itemId: string): string | null {
  if (WREATH_IMAGE_OVERRIDES[itemId]) return WREATH_IMAGE_OVERRIDES[itemId];
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
  sellPrice: number;
}

/**
 * Score = uniqueTypes × 3 + totalItems.
 * Quantity and diversity both contribute, so a straw-only wreath can still
 * reach higher tiers by sheer volume, while a diverse wreath gets there faster.
 */
function getWreathQuality(slots: SlotData[]): WreathQuality {
  const uniqueTypes = new Set(slots.map((s) => s.itemId)).size;
  const score = uniqueTypes * 3 + slots.length;

  if (score >= 19) {
    return {
      tier: 'magnificent',
      itemId: 'decoration_wreath_magnificent',
      label: 'Magnificent',
      friendship: 5,
      sellPrice: 180,
    };
  }
  if (score >= 8) {
    return {
      tier: 'fine',
      itemId: 'decoration_wreath_fine',
      label: 'Fine',
      friendship: 3,
      sellPrice: 80,
    };
  }
  return {
    tier: 'rustic',
    itemId: 'decoration_wreath_rustic',
    label: 'Rustic',
    friendship: 2,
    sellPrice: 35,
  };
}

// ---------------------------------------------------------------------------
// Wreath canvas dimensions
// ---------------------------------------------------------------------------

const WREATH_CENTRE = 140;

// ---------------------------------------------------------------------------
// Wreath image capture (offscreen canvas → base64)
// ---------------------------------------------------------------------------

/** Size of the capture canvas (px). */
const CAPTURE_SIZE = 512;

/**
 * Render the wreath to an offscreen canvas and return a base64 PNG data URL.
 * Draws the ring + all placed flowers at their scaled positions.
 */
async function captureWreathImage(slots: SlotData[]): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CAPTURE_SIZE;
  canvas.height = CAPTURE_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Scale factor from wreath-area coords → capture canvas
  const scale = CAPTURE_SIZE / (WREATH_CENTRE * 2);

  // Load all flower images first
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  // Draw the wreath base sprite
  try {
    const baseImg = await loadImage(tileAssets.wreath_base);
    ctx.drawImage(baseImg, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
  } catch {
    // Fallback: draw a plain ring if the sprite fails to load
    ctx.beginPath();
    ctx.arc(WREATH_CENTRE * scale, WREATH_CENTRE * scale, (WREATH_CENTRE * 0.7) * scale, 0, Math.PI * 2);
    ctx.lineWidth = 14 * scale;
    ctx.strokeStyle = '#3a5a2a';
    ctx.stroke();
  }

  // Draw each placed flower
  for (const slot of slots) {
    const imageUrl = getFlowerImage(slot.itemId);
    if (!imageUrl) continue;

    try {
      const img = await loadImage(imageUrl);
      const flowerSize = FLOWER_BASE_SIZE * slot.scale;
      const cx = slot.x * scale;
      const cy = slot.y * scale;
      const size = flowerSize * scale;
      ctx.save();
      // Apply rotation + flip transforms around the flower centre
      ctx.translate(cx, cy);
      ctx.rotate((slot.rotation * Math.PI) / 180);
      ctx.scale(slot.flipH ? -1 : 1, slot.flipV ? -1 : 1);
      ctx.translate(-cx, -cy);

      if (slot.cropZoom > 1) {
        // Draw with circular clip — mirrors the CSS transform approach:
        // scale(cropZoom) translate(cropX, cropY) from image centre
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.clip();
        const cropScale = slot.cropZoom;
        const drawSize = size * cropScale;
        const drawX = cx - drawSize / 2 + slot.cropX * cropScale * scale;
        const drawY = cy - drawSize / 2 + slot.cropY * cropScale * scale;
        ctx.drawImage(img, drawX, drawY, drawSize, drawSize);
        ctx.restore();
      } else {
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      }

      ctx.restore();
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
  const [placedItems, setPlacedItems] = useState<SlotData[]>([]);
  const [selectedFlower, setSelectedFlower] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  /** Flower currently shown in the gallery preview. */
  const [galleryFlower, setGalleryFlower] = useState<string | null>(null);
  /** Item ID being dragged from the gallery. */
  const [galleryDragItem, setGalleryDragItem] = useState<string | null>(null);
  /** Whether the user is in crop mode for the currently editing slot. */
  const [isCropping, setIsCropping] = useState(false);

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
      const usedInSlots = placedItems.filter((s) => s.itemId === matId).length;
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
  }, [placedItems, context.actions]);

  const filledCount = placedItems.length;
  const uniqueCount = new Set(placedItems.map((s) => s.itemId)).size;
  const canCreate = filledCount >= MIN_FLOWERS;
  const quality = canCreate ? getWreathQuality(placedItems) : null;

  // Determine which flower to show in the gallery preview
  const previewFlowerId =
    galleryDragItem ??
    galleryFlower ??
    (editingSlot !== null ? (placedItems[editingSlot]?.itemId ?? null) : null) ??
    selectedFlower ??
    (availableFlowers.length > 0 ? availableFlowers[0].itemId : null);

  const previewItem = previewFlowerId ? getItem(previewFlowerId) : null;

  // =========================================================================
  // Handlers — flower selection & slot interaction
  // =========================================================================

  const handleSelectFlower = useCallback((itemId: string) => {
    setSelectedFlower((prev) => (prev === itemId ? null : itemId));
    setEditingSlot(null);
    setIsCropping(false);
    setGalleryFlower(itemId);
  }, []);

  /** Click empty canvas space to place the currently selected flower there. */
  const handleWreathCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedFlower) return;
      if (e.target !== e.currentTarget) return; // a placed flower was clicked
      const avail = availableFlowers.find((f) => f.itemId === selectedFlower);
      if (!avail || avail.available <= 0) return;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newIndex = placedItems.length;
      setPlacedItems((prev) => [...prev, makeSlot(selectedFlower, x, y)]);
      setEditingSlot(newIndex);
      setGalleryFlower(selectedFlower);
      setSelectedFlower(null);
      setIsCropping(false);
    },
    [placedItems, selectedFlower, availableFlowers]
  );

  /** Click a placed flower to select it for editing. */
  const handleFlowerClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if (wasDragRef.current) {
        wasDragRef.current = false;
        return;
      }
      if (editingSlot !== index) setIsCropping(false);
      setEditingSlot(index);
      setSelectedFlower(null);
      setGalleryFlower(placedItems[index].itemId);
    },
    [placedItems, editingSlot]
  );

  // Zoom controls
  const handleZoom = useCallback(
    (delta: number) => {
      if (editingSlot === null) return;
      setPlacedItems((prev) => {
        const next = [...prev];
        const slot = next[editingSlot];
        if (!slot) return prev;
        next[editingSlot] = { ...slot, scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, slot.scale + delta)) };
        return next;
      });
    },
    [editingSlot]
  );

  const handleRemoveFromSlot = useCallback(() => {
    if (editingSlot === null) return;
    setPlacedItems((prev) => prev.filter((_, i) => i !== editingSlot));
    setEditingSlot(null);
    setIsCropping(false);
  }, [editingSlot]);

  // Delete/Backspace removes the selected flower
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (editingSlot === null) return;
      e.preventDefault();
      setPlacedItems((prev) => prev.filter((_, i) => i !== editingSlot));
      setEditingSlot(null);
      setIsCropping(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingSlot]);

  // Crop zoom control
  const handleCropZoom = useCallback(
    (delta: number) => {
      if (editingSlot === null) return;
      setPlacedItems((prev) => {
        const next = [...prev];
        const slot = next[editingSlot];
        if (!slot) return prev;
        next[editingSlot] = { ...slot, cropZoom: Math.max(DEFAULT_CROP_ZOOM, Math.min(MAX_CROP_ZOOM, slot.cropZoom + delta)) };
        return next;
      });
    },
    [editingSlot]
  );

  const handleResetCrop = useCallback(() => {
    if (editingSlot === null) return;
    setPlacedItems((prev) => {
      const next = [...prev];
      const slot = next[editingSlot];
      if (!slot) return prev;
      next[editingSlot] = { ...slot, cropX: 0, cropY: 0, cropZoom: DEFAULT_CROP_ZOOM };
      return next;
    });
  }, [editingSlot]);

  const handleRotate = useCallback(
    (delta: number) => {
      if (editingSlot === null) return;
      setPlacedItems((prev) => {
        const next = [...prev];
        const slot = next[editingSlot];
        if (!slot) return prev;
        next[editingSlot] = { ...slot, rotation: ((slot.rotation + delta) % 360 + 360) % 360 };
        return next;
      });
    },
    [editingSlot]
  );

  const handleFlip = useCallback(
    (axis: 'h' | 'v') => {
      if (editingSlot === null) return;
      setPlacedItems((prev) => {
        const next = [...prev];
        const slot = next[editingSlot];
        if (!slot) return prev;
        next[editingSlot] =
          axis === 'h' ? { ...slot, flipH: !slot.flipH } : { ...slot, flipV: !slot.flipV };
        return next;
      });
    },
    [editingSlot]
  );

  // =========================================================================
  // Drag handlers — repositioning flowers on the wreath
  // =========================================================================

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, index: number) => {
      const slot = placedItems[index];
      if (!slot) return;
      const pos = getClientPos(e as React.MouseEvent);
      if (!pos) return;
      if ('touches' in e) e.preventDefault();
      dragRef.current = {
        slotIndex: index,
        startX: pos.x,
        startY: pos.y,
        startOffsetX: isCropping ? slot.cropX : slot.x,
        startOffsetY: isCropping ? slot.cropY : slot.y,
        didDrag: false,
      };
      wasDragRef.current = false;
      setEditingSlot(index);
      setSelectedFlower(null);
    },
    [placedItems, isCropping]
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

      if (isCropping) {
        // Pan the crop window within the image
        const newCX = Math.max(-MAX_CROP_PAN, Math.min(MAX_CROP_PAN, startOffsetX + dx));
        const newCY = Math.max(-MAX_CROP_PAN, Math.min(MAX_CROP_PAN, startOffsetY + dy));
        setPlacedItems((prev) => {
          const next = [...prev];
          const slot = next[slotIndex];
          if (!slot) return prev;
          next[slotIndex] = { ...slot, cropX: newCX, cropY: newCY };
          return next;
        });
      } else {
        // Freehand reposition
        setPlacedItems((prev) => {
          const next = [...prev];
          const slot = next[slotIndex];
          if (!slot) return prev;
          next[slotIndex] = { ...slot, x: startOffsetX + dx, y: startOffsetY + dy };
          return next;
        });
      }
    },
    [galleryDragItem, isCropping]
  );

  const handleAnyEnd = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Gallery drag end — place at exact drop position
      if (galleryDragItem) {
        const pos = getClientPos(e as React.MouseEvent) ?? galleryDragPosRef.current;
        if (pos && wreathRef.current) {
          const rect = wreathRef.current.getBoundingClientRect();
          const x = pos.x - rect.left;
          const y = pos.y - rect.top;
          // Only place if dropped within the canvas bounds
          if (x >= 0 && x <= WREATH_CENTRE * 2 && y >= 0 && y <= WREATH_CENTRE * 2) {
            const newIndex = placedItems.length;
            setPlacedItems((prev) => [...prev, makeSlot(galleryDragItem, x, y)]);
            setEditingSlot(newIndex);
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
    [galleryDragItem, placedItems]
  );

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
    try {
      const dataUrl = await captureWreathImage(placedItems);
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
  }, [placedItems, context.actions, context.storage, onComplete, isCreating]);

  const editingSlotData = editingSlot !== null ? (placedItems[editingSlot] ?? null) : null;

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
          {/* Wreath area — freehand placement canvas */}
          <div
            ref={wreathRef}
            onClick={handleWreathCanvasClick}
            style={{
              position: 'relative',
              width: WREATH_CENTRE * 2,
              height: WREATH_CENTRE * 2,
              cursor: selectedFlower ? 'crosshair' : 'default',
            }}
          >
            {/* Decorative wreath ring */}
            <img
              src={tileAssets.wreath_base}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: WREATH_CENTRE * 2,
                height: WREATH_CENTRE * 2,
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
                  width: WREATH_CENTRE * 2,
                  height: WREATH_CENTRE * 2,
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
                    {filledCount} item{filledCount !== 1 ? 's' : ''} · {uniqueCount} type{uniqueCount !== 1 ? 's' : ''}
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
                  onClick={(e) => handleFlowerClick(e, i)}
                  onMouseDown={(e) => handleDragStart(e, i)}
                  onTouchStart={(e) => handleDragStart(e, i)}
                  onWheel={(e) => {
                    if (!isEditing) return;
                    e.preventDefault();
                    const delta = e.deltaY < 0 ? CROP_ZOOM_STEP : -CROP_ZOOM_STEP;
                    if (isCropping) {
                      handleCropZoom(delta);
                    } else {
                      handleZoom(delta > 0 ? -SCALE_STEP : SCALE_STEP);
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

          {/* Editing controls for the selected flower */}
          {editingSlotData && editingSlot !== null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                maxWidth: 340,
              }}
            >
              {/* Main toolbar row */}
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
                }}
              >
                <FlowerThumb itemId={editingSlotData.itemId} size={24} />
                <span style={{ fontSize: 11, color: '#8a9a7a', minWidth: 0 }}>
                  {getItem(editingSlotData.itemId)?.displayName}
                </span>
                {!isCropping && (
                  <>
                    <span style={{ fontSize: 11, color: '#6a7a5a' }}>Size:</span>
                    <button
                      onClick={() => handleZoom(-SCALE_STEP)}
                      style={ZOOM_BTN}
                      title="Smaller"
                    >
                      −
                    </button>
                    <div style={{ width: 36, textAlign: 'center', fontSize: 11, color: '#8a9a7a' }}>
                      {Math.round(editingSlotData.scale * 100)}%
                    </div>
                    <button onClick={() => handleZoom(SCALE_STEP)} style={ZOOM_BTN} title="Bigger">
                      +
                    </button>
                  </>
                )}
                {isCropping && (
                  <>
                    <span style={{ fontSize: 11, color: '#6a7a5a' }}>Crop:</span>
                    <button
                      onClick={() => handleCropZoom(-CROP_ZOOM_STEP)}
                      style={ZOOM_BTN}
                      title="Less crop"
                    >
                      −
                    </button>
                    <div style={{ width: 36, textAlign: 'center', fontSize: 11, color: '#8a9a7a' }}>
                      {Math.round(editingSlotData.cropZoom * 100)}%
                    </div>
                    <button
                      onClick={() => handleCropZoom(CROP_ZOOM_STEP)}
                      style={ZOOM_BTN}
                      title="More crop"
                    >
                      +
                    </button>
                    <button
                      onClick={handleResetCrop}
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
                    justifyContent: 'center',
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
                    onClick={() => handleRotate(-ROTATION_STEP)}
                    style={ZOOM_BTN}
                    title="Rotate anticlockwise 15°"
                  >
                    ↺
                  </button>
                  <div style={{ width: 36, textAlign: 'center', fontSize: 11, color: '#8a9a7a' }}>
                    {editingSlotData.rotation}°
                  </div>
                  <button
                    onClick={() => handleRotate(ROTATION_STEP)}
                    style={ZOOM_BTN}
                    title="Rotate clockwise 15°"
                  >
                    ↻
                  </button>
                  {editingSlotData.rotation !== 0 && (
                    <button
                      onClick={() =>
                        setPlacedItems((prev) => {
                          const next = [...prev];
                          const slot = next[editingSlot!];
                          if (!slot) return prev;
                          next[editingSlot!] = { ...slot, rotation: 0 };
                          return next;
                        })
                      }
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
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <button
                  onClick={() => handleFlip('h')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: editingSlotData.flipH ? '1px solid #6ee7b7' : '1px solid #5a7a4a',
                    background: editingSlotData.flipH ? '#1a3a2a' : '#2a3a22',
                    color: editingSlotData.flipH ? '#6ee7b7' : '#8a9a7a',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                  title="Flip horizontally"
                >
                  ⇔ Flip
                </button>
                <button
                  onClick={() => handleFlip('v')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: editingSlotData.flipV ? '1px solid #6ee7b7' : '1px solid #5a7a4a',
                    background: editingSlotData.flipV ? '#1a3a2a' : '#2a3a22',
                    color: editingSlotData.flipV ? '#6ee7b7' : '#8a9a7a',
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                  title="Flip vertically"
                >
                  ⇕ Flip
                </button>
                <button
                  onClick={() => {
                    if (!isCropping && editingSlot !== null) {
                      // Entering crop mode — auto-zoom to 1.4 if currently uncropped
                      setPlacedItems((prev) => {
                        const next = [...prev];
                        const slot = next[editingSlot];
                        if (slot && slot.cropZoom <= 1) {
                          next[editingSlot] = { ...slot, cropZoom: 1.4 };
                        }
                        return next;
                      });
                    }
                    setIsCropping((prev) => !prev);
                  }}
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
                  onClick={handleRemoveFromSlot}
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
              maxWidth: 300,
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
            {canCreate && quality && (
              <div style={{ color: '#86efac' }}>Sell: {quality.sellPrice}g</div>
            )}
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
