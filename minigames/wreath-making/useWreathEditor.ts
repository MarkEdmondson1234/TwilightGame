/**
 * Wreath Making mini-game — arrangement editor state and interactions.
 *
 * Owns everything to do with arranging flowers on the ring: what is placed,
 * what is selected, gallery/canvas dragging, and the per-slot transforms
 * (scale, rotation, mirroring, cropping).
 *
 * The transforms themselves are pure functions in `wreathSlotTransforms.ts`;
 * this hook is the React plumbing around them. The component shell keeps only
 * presentation concerns plus wreath creation.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MiniGameContext } from '../types';
import { getItem } from '../../data/items';
import { getClientPos } from './wreathHelpers';
import { getWreathQuality, type WreathQuality } from './wreathQuality';
import { makeSlot, type AvailableFlower, type SlotData } from './wreathTypes';
import {
  withCropPan,
  withCropReset,
  withCropZoomDelta,
  withFlip,
  withPosition,
  withRotationDelta,
  withRotationReset,
  withScaleDelta,
} from './wreathSlotTransforms';
import {
  DRAG_THRESHOLD,
  MIN_FLOWERS,
  WREATH_CANVAS_SIZE,
  WREATH_MATERIALS,
} from './wreathConstants';

export interface WreathEditor {
  // State
  placedItems: SlotData[];
  selectedFlower: string | null;
  editingSlot: number | null;
  editingSlotData: SlotData | null;
  galleryDragItem: string | null;
  isCropping: boolean;

  // Derived
  availableFlowers: AvailableFlower[];
  filledCount: number;
  uniqueCount: number;
  canCreate: boolean;
  quality: WreathQuality | null;
  previewFlowerId: string | null;

  // Refs
  wreathRef: React.RefObject<HTMLDivElement | null>;
  floatingFlowerRef: React.RefObject<HTMLDivElement | null>;
  galleryDragPosRef: React.RefObject<{ x: number; y: number } | null>;

  // Handlers
  setGalleryFlower: (itemId: string | null) => void;
  handleSelectFlower: (itemId: string) => void;
  handleWreathCanvasClick: (e: React.MouseEvent) => void;
  handleFlowerClick: (e: React.MouseEvent, index: number) => void;
  handleZoom: (delta: number) => void;
  handleCropZoom: (delta: number) => void;
  handleResetCrop: () => void;
  handleRotate: (delta: number) => void;
  handleResetRotation: () => void;
  handleFlip: (axis: 'h' | 'v') => void;
  handleToggleCrop: () => void;
  handleRemoveFromSlot: () => void;
  handleDragStart: (e: React.MouseEvent | React.TouchEvent, index: number) => void;
  handleGalleryDragStart: (e: React.MouseEvent | React.TouchEvent, itemId: string) => void;
  handleAnyMove: (e: React.MouseEvent | React.TouchEvent) => void;
  handleAnyEnd: (e: React.MouseEvent | React.TouchEvent) => void;
}

export function useWreathEditor(actions: MiniGameContext['actions']): WreathEditor {
  const [placedItems, setPlacedItems] = useState<SlotData[]>([]);
  const [selectedFlower, setSelectedFlower] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
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

  /** Apply a pure transform to one slot, leaving state untouched if it's gone. */
  const updateSlot = useCallback((index: number, transform: (slot: SlotData) => SlotData) => {
    setPlacedItems((prev) => {
      const next = [...prev];
      const slot = next[index];
      if (!slot) return prev;
      next[index] = transform(slot);
      return next;
    });
  }, []);

  // Compute available flowers (inventory minus what's placed in slots)
  const availableFlowers = useMemo(() => {
    const result: AvailableFlower[] = [];
    for (const matId of WREATH_MATERIALS) {
      const inInventory = actions.getItemQuantity(matId);
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
  }, [placedItems, actions]);

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

  // =========================================================================
  // Per-slot transforms — all operate on the slot being edited
  // =========================================================================

  const handleZoom = useCallback(
    (delta: number) => {
      if (editingSlot === null) return;
      updateSlot(editingSlot, (slot) => withScaleDelta(slot, delta));
    },
    [editingSlot, updateSlot]
  );

  const handleCropZoom = useCallback(
    (delta: number) => {
      if (editingSlot === null) return;
      updateSlot(editingSlot, (slot) => withCropZoomDelta(slot, delta));
    },
    [editingSlot, updateSlot]
  );

  const handleResetCrop = useCallback(() => {
    if (editingSlot === null) return;
    updateSlot(editingSlot, withCropReset);
  }, [editingSlot, updateSlot]);

  const handleRotate = useCallback(
    (delta: number) => {
      if (editingSlot === null) return;
      updateSlot(editingSlot, (slot) => withRotationDelta(slot, delta));
    },
    [editingSlot, updateSlot]
  );

  const handleResetRotation = useCallback(() => {
    updateSlot(editingSlot!, withRotationReset);
  }, [editingSlot, updateSlot]);

  const handleFlip = useCallback(
    (axis: 'h' | 'v') => {
      if (editingSlot === null) return;
      updateSlot(editingSlot, (slot) => withFlip(slot, axis));
    },
    [editingSlot, updateSlot]
  );

  /** Entering crop mode nudges an uncropped flower to a visible crop zoom. */
  const handleToggleCrop = useCallback(() => {
    if (!isCropping && editingSlot !== null) {
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
  }, [isCropping, editingSlot]);

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
        updateSlot(slotIndex, (slot) => withCropPan(slot, startOffsetX + dx, startOffsetY + dy));
      } else {
        // Freehand reposition
        updateSlot(slotIndex, (slot) => withPosition(slot, startOffsetX + dx, startOffsetY + dy));
      }
    },
    [galleryDragItem, isCropping, updateSlot]
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
          if (x >= 0 && x <= WREATH_CANVAS_SIZE && y >= 0 && y <= WREATH_CANVAS_SIZE) {
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

  const editingSlotData = editingSlot !== null ? (placedItems[editingSlot] ?? null) : null;

  return {
    placedItems,
    selectedFlower,
    editingSlot,
    editingSlotData,
    galleryDragItem,
    isCropping,
    availableFlowers,
    filledCount,
    uniqueCount,
    canCreate,
    quality,
    previewFlowerId,
    wreathRef,
    floatingFlowerRef,
    galleryDragPosRef,
    setGalleryFlower,
    handleSelectFlower,
    handleWreathCanvasClick,
    handleFlowerClick,
    handleZoom,
    handleCropZoom,
    handleResetCrop,
    handleRotate,
    handleResetRotation,
    handleFlip,
    handleToggleCrop,
    handleRemoveFromSlot,
    handleDragStart,
    handleGalleryDragStart,
    handleAnyMove,
    handleAnyEnd,
  };
}
