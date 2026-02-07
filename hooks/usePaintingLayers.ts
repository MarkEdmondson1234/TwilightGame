/**
 * usePaintingLayers - Multi-layer painting system
 *
 * Manages a stack of drawing/image layers, each with its own canvas.
 * Drawing layers get their own Atrament instance for freehand input.
 * Image layers are static canvases with imported photos/sketches.
 *
 * On save, all visible layers are flattened to a single 512x512 image.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import Atrament, { type AtramentMode } from 'atrament';
import type { ExtendedStroke } from './useAtrament';

const MAX_LAYERS = 4;
const BG_COLOUR = '#f5f0e8';

// ─── Types ───────────────────────────────────────────────────────────

export interface PaintingLayer {
  id: string;
  name: string;
  type: 'drawing' | 'image';
  visible: boolean;
  opacity: number; // 0-1, applied via CSS on the <canvas> element
}

/** Internal bookkeeping for a drawing layer */
interface DrawingLayerState {
  atrament: Atrament | null;
  strokes: ExtendedStroke[];
  canvas: HTMLCanvasElement | null;
}

/** Internal bookkeeping for an image layer */
interface ImageLayerState {
  canvas: HTMLCanvasElement | null;
  dataUrl: string;
}

export interface UsePaintingLayersConfig {
  width: number;
  height: number;
}

export interface UsePaintingLayersReturn {
  layers: PaintingLayer[];
  activeLayerId: string;

  // Layer management
  addDrawingLayer: () => string | null;
  addImageLayer: (dataUrl: string) => Promise<string | null>;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerVisible: (id: string, visible: boolean) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;

  // Drawing (delegates to active layer's Atrament)
  setColour: (colour: string) => void;
  setWeight: (weight: number) => void;
  setMode: (mode: 'draw' | 'erase') => void;
  setBrushOpacity: (opacity: number) => void;
  undo: () => void;
  clearActiveLayer: () => void;

  // Canvas registration (called by the UI when canvases mount)
  registerCanvas: (layerId: string, canvas: HTMLCanvasElement | null) => void;

  // Export
  flattenToDataURL: (options?: {
    type?: string;
    quality?: number;
    transparent?: boolean;
  }) => string | null;
  isDirty: boolean;

  // Eyedropper
  sampleColour: (x: number, y: number) => string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

let layerCounter = 0;
function nextLayerId(): string {
  return `layer_${++layerCounter}`;
}

function replayStroke(atr: Atrament, stroke: ExtendedStroke): void {
  if (stroke.segments.length === 0) return;
  const ctx = atr.canvas.getContext('2d');
  const prevColor = atr.color;
  const prevWeight = atr.weight;
  const prevMode = atr.mode;
  const prevSmoothing = atr.smoothing;
  const prevAdaptive = atr.adaptiveStroke;
  const prevAlpha = ctx?.globalAlpha ?? 1;

  atr.color = stroke.color;
  atr.weight = stroke.weight;
  atr.mode = stroke.mode as AtramentMode;
  atr.smoothing = stroke.smoothing;
  atr.adaptiveStroke = stroke.adaptiveStroke;
  if (ctx) ctx.globalAlpha = stroke.opacity;

  const first = stroke.segments[0];
  atr.beginStroke(first.point.x, first.point.y);
  let prev = first;
  for (let i = 1; i < stroke.segments.length; i++) {
    const seg = stroke.segments[i];
    atr.draw(seg.point.x, seg.point.y, prev.point.x, prev.point.y, seg.pressure);
    prev = seg;
  }
  atr.endStroke(prev.point.x, prev.point.y);

  atr.color = prevColor;
  atr.weight = prevWeight;
  atr.mode = prevMode;
  atr.smoothing = prevSmoothing;
  atr.adaptiveStroke = prevAdaptive;
  if (ctx) ctx.globalAlpha = prevAlpha;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function usePaintingLayers(config: UsePaintingLayersConfig): UsePaintingLayersReturn {
  const { width, height } = config;

  // React state for layer metadata (drives UI re-renders)
  const firstId = useRef(nextLayerId());
  const [layers, setLayers] = useState<PaintingLayer[]>([
    { id: firstId.current, name: 'Layer 1', type: 'drawing', visible: true, opacity: 1 },
  ]);
  const [activeLayerId, setActiveLayerId] = useState(firstId.current);
  const [isDirty, setIsDirty] = useState(false);

  // Imperative state (not in React state to avoid re-render cascades)
  const drawingStates = useRef<Map<string, DrawingLayerState>>(new Map());
  const imageStates = useRef<Map<string, ImageLayerState>>(new Map());

  // Current brush settings (refs so Atrament event callbacks don't go stale)
  const colourRef = useRef('#1a1a1a');
  const weightRef = useRef(6);
  const modeRef = useRef<'draw' | 'erase'>('draw');
  const brushOpacityRef = useRef(1);

  // Ensure the first drawing layer has an entry
  if (!drawingStates.current.has(firstId.current)) {
    drawingStates.current.set(firstId.current, { atrament: null, strokes: [], canvas: null });
  }

  // ─── Canvas Registration ─────────────────────────────────────────

  const initAtrament = useCallback(
    (layerId: string, canvas: HTMLCanvasElement) => {
      const existing = drawingStates.current.get(layerId);
      if (existing?.atrament) {
        existing.atrament.destroy();
      }

      const atr = new Atrament(canvas, {
        width,
        height,
        color: colourRef.current,
        weight: weightRef.current,
        mode: modeRef.current,
        adaptiveStroke: true,
        smoothing: 0.85,
      });
      atr.recordStrokes = true;

      atr.addEventListener('strokerecorded', ({ stroke }) => {
        const ds = drawingStates.current.get(layerId);
        if (!ds) return;
        const extended: ExtendedStroke = { ...stroke, opacity: brushOpacityRef.current };
        ds.strokes.push(extended);
        setIsDirty(true);
      });

      // Apply current brush opacity
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.globalAlpha = brushOpacityRef.current;

      const ds = drawingStates.current.get(layerId);
      if (ds) {
        ds.atrament = atr;
        ds.canvas = canvas;
      }
    },
    [width, height]
  );

  const registerCanvas = useCallback(
    (layerId: string, canvas: HTMLCanvasElement | null) => {
      // Drawing layer
      const ds = drawingStates.current.get(layerId);
      if (ds) {
        if (canvas) {
          // Skip re-init if the same canvas element is already registered
          if (ds.canvas === canvas && ds.atrament) return;
          ds.canvas = canvas;
          initAtrament(layerId, canvas);
        }
        // When canvas is null, do NOT destroy Atrament — React cycles inline
        // ref callbacks (old→null, new→element) on every re-render. Actual
        // cleanup happens in removeLayer() and the unmount useEffect.
        return;
      }
      // Image layer
      const is = imageStates.current.get(layerId);
      if (is) {
        if (!canvas || is.canvas === canvas) return;
        is.canvas = canvas;
        if (is.dataUrl) {
          drawImageOnCanvas(canvas, is.dataUrl, width, height);
        }
      }
    },
    [initAtrament, width, height]
  );

  // ─── Layer Management ────────────────────────────────────────────

  const addDrawingLayer = useCallback((): string | null => {
    let newId: string | null = null;
    setLayers((prev) => {
      if (prev.length >= MAX_LAYERS) return prev;
      const id = nextLayerId();
      newId = id;
      const drawingCount = prev.filter((l) => l.type === 'drawing').length;
      drawingStates.current.set(id, { atrament: null, strokes: [], canvas: null });
      return [
        ...prev,
        { id, name: `Layer ${drawingCount + 1}`, type: 'drawing', visible: true, opacity: 1 },
      ];
    });
    if (newId) setActiveLayerId(newId);
    return newId;
  }, []);

  const addImageLayer = useCallback(async (dataUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setLayers((prev) => {
        if (prev.length >= MAX_LAYERS) {
          resolve(null);
          return prev;
        }
        const id = nextLayerId();
        imageStates.current.set(id, { canvas: null, dataUrl });
        resolve(id);
        return [...prev, { id, name: 'Image', type: 'image', visible: true, opacity: 1 }];
      });
    });
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => {
      if (prev.length <= 1) return prev; // Can't delete the last layer
      const ds = drawingStates.current.get(id);
      if (ds) {
        ds.atrament?.destroy();
        drawingStates.current.delete(id);
      }
      imageStates.current.delete(id);
      const next = prev.filter((l) => l.id !== id);
      return next;
    });
    // If we deleted the active layer, switch to the top layer
    setActiveLayerId((prev) => {
      setLayers((ls) => {
        if (!ls.find((l) => l.id === prev)) {
          const topDrawing = [...ls].reverse().find((l) => l.type === 'drawing');
          if (topDrawing) {
            // Use setTimeout to avoid setState-in-setState
            setTimeout(() => setActiveLayerId(topDrawing.id), 0);
          }
        }
        return ls;
      });
      return prev;
    });
  }, []);

  const setLayerVisible = useCallback((id: string, visible: boolean) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
  }, []);

  const setLayerOpacity = useCallback((id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l))
    );
  }, []);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }, []);

  // ─── Drawing Controls ────────────────────────────────────────────

  const setColour = useCallback((colour: string) => {
    colourRef.current = colour;
    for (const [, ds] of drawingStates.current) {
      if (ds.atrament) ds.atrament.color = colour;
    }
  }, []);

  const setWeight = useCallback((w: number) => {
    weightRef.current = w;
    for (const [, ds] of drawingStates.current) {
      if (ds.atrament) ds.atrament.weight = w;
    }
  }, []);

  const setMode = useCallback((m: 'draw' | 'erase') => {
    modeRef.current = m;
    for (const [, ds] of drawingStates.current) {
      if (ds.atrament) ds.atrament.mode = m;
    }
  }, []);

  const setBrushOpacity = useCallback((op: number) => {
    brushOpacityRef.current = op;
    for (const [, ds] of drawingStates.current) {
      if (ds.canvas) {
        const ctx = ds.canvas.getContext('2d');
        if (ctx) ctx.globalAlpha = op;
      }
    }
  }, []);

  const undo = useCallback(() => {
    const ds = drawingStates.current.get(activeLayerId);
    if (!ds?.atrament || ds.strokes.length === 0) return;

    ds.strokes.pop();
    ds.atrament.recordStrokes = false;
    ds.atrament.clear();

    for (const stroke of ds.strokes) {
      replayStroke(ds.atrament, stroke);
    }

    // Restore current brush opacity
    const ctx = ds.canvas?.getContext('2d');
    if (ctx) ctx.globalAlpha = brushOpacityRef.current;

    ds.atrament.recordStrokes = true;

    // Check if any layer has strokes
    let anyDirty = false;
    for (const [, s] of drawingStates.current) {
      if (s.strokes.length > 0) {
        anyDirty = true;
        break;
      }
    }
    if (imageStates.current.size > 0) anyDirty = true;
    setIsDirty(anyDirty);
  }, [activeLayerId]);

  const clearActiveLayer = useCallback(() => {
    const ds = drawingStates.current.get(activeLayerId);
    if (!ds?.atrament) return;
    ds.atrament.clear();
    ds.strokes = [];

    // Restore current brush opacity after clear
    const ctx = ds.canvas?.getContext('2d');
    if (ctx) ctx.globalAlpha = brushOpacityRef.current;

    let anyDirty = false;
    for (const [, s] of drawingStates.current) {
      if (s.strokes.length > 0) {
        anyDirty = true;
        break;
      }
    }
    if (imageStates.current.size > 0) anyDirty = true;
    setIsDirty(anyDirty);
  }, [activeLayerId]);

  // ─── Export ──────────────────────────────────────────────────────

  const flattenToDataURL = useCallback(
    (options?: { type?: string; quality?: number; transparent?: boolean }): string | null => {
      const { type = 'image/webp', quality = 0.8, transparent = false } = options ?? {};

      const temp = document.createElement('canvas');
      temp.width = width;
      temp.height = height;
      const ctx = temp.getContext('2d');
      if (!ctx) return null;

      // Draw background (unless transparent mode — e.g. for objects without a frame)
      if (!transparent) {
        ctx.fillStyle = BG_COLOUR;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw each visible layer in order (bottom to top)
      for (const layer of layers) {
        if (!layer.visible) continue;

        let srcCanvas: HTMLCanvasElement | null = null;
        const ds = drawingStates.current.get(layer.id);
        if (ds?.canvas) srcCanvas = ds.canvas;
        const is = imageStates.current.get(layer.id);
        if (is?.canvas) srcCanvas = is.canvas;

        if (srcCanvas) {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(srcCanvas, 0, 0);
        }
      }
      ctx.globalAlpha = 1;

      // Transparent images must use PNG (WebP alpha support is inconsistent)
      const outputType = transparent ? 'image/png' : type;
      let dataUrl = temp.toDataURL(outputType, quality);
      if (outputType === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
        dataUrl = temp.toDataURL('image/png');
      }
      return dataUrl;
    },
    [layers, width, height]
  );

  // ─── Eyedropper ──────────────────────────────────────────────────

  const sampleColour = useCallback(
    (x: number, y: number): string | null => {
      const temp = document.createElement('canvas');
      temp.width = width;
      temp.height = height;
      const ctx = temp.getContext('2d');
      if (!ctx) return null;

      ctx.fillStyle = BG_COLOUR;
      ctx.fillRect(0, 0, width, height);

      for (const layer of layers) {
        if (!layer.visible) continue;
        let srcCanvas: HTMLCanvasElement | null = null;
        const ds = drawingStates.current.get(layer.id);
        if (ds?.canvas) srcCanvas = ds.canvas;
        const is = imageStates.current.get(layer.id);
        if (is?.canvas) srcCanvas = is.canvas;

        if (srcCanvas) {
          ctx.globalAlpha = layer.opacity;
          ctx.drawImage(srcCanvas, 0, 0);
        }
      }
      ctx.globalAlpha = 1;

      const px = Math.max(0, Math.min(width - 1, Math.round(x)));
      const py = Math.max(0, Math.min(height - 1, Math.round(y)));
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      return `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
    },
    [layers, width, height]
  );

  // ─── Cleanup on unmount ──────────────────────────────────────────

  useEffect(() => {
    return () => {
      for (const [, ds] of drawingStates.current) {
        ds.atrament?.destroy();
      }
      drawingStates.current.clear();
      imageStates.current.clear();
    };
  }, []);

  return {
    layers,
    activeLayerId,
    addDrawingLayer,
    addImageLayer,
    removeLayer,
    setActiveLayer: setActiveLayerId,
    setLayerVisible,
    setLayerOpacity,
    moveLayer,
    setColour,
    setWeight,
    setMode,
    setBrushOpacity,
    undo,
    clearActiveLayer,
    registerCanvas,
    flattenToDataURL,
    isDirty,
    sampleColour,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────

function drawImageOnCanvas(
  canvas: HTMLCanvasElement,
  dataUrl: string,
  width: number,
  height: number
): void {
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
  };
  img.src = dataUrl;
}
