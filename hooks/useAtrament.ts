/**
 * useAtrament - React hook wrapping the Atrament drawing library
 *
 * Manages the Atrament instance lifecycle, syncs React props to the
 * imperative API, and provides undo via stroke recording + replay.
 */

import { useEffect, useRef, useCallback, useState, type RefObject } from 'react';
import Atrament, { type AtramentStroke, type AtramentMode } from 'atrament';

export interface UseAtramentConfig {
  /** Ref to the <canvas> element */
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Canvas buffer width in pixels */
  width: number;
  /** Canvas buffer height in pixels */
  height: number;
  /** Current brush colour (CSS colour string) */
  colour: string;
  /** Current brush weight (line thickness) */
  weight: number;
  /** Current drawing mode */
  mode: 'draw' | 'erase';
}

export interface UseAtramentReturn {
  /** Whether the Atrament instance is initialised */
  isReady: boolean;
  /** Whether the canvas has been drawn on */
  isDirty: boolean;
  /** Clear the entire canvas */
  clear: () => void;
  /** Undo the last stroke */
  undo: () => void;
  /** Export canvas as a data URL */
  toDataURL: (type?: string, quality?: number) => string | null;
}

/**
 * Replay a recorded stroke onto an Atrament instance.
 * Temporarily sets the stroke's properties, draws each segment,
 * then restores the previous properties.
 */
function replayStroke(atr: Atrament, stroke: AtramentStroke): void {
  if (stroke.segments.length === 0) return;

  // Save current properties
  const prevColor = atr.color;
  const prevWeight = atr.weight;
  const prevMode = atr.mode;
  const prevSmoothing = atr.smoothing;
  const prevAdaptive = atr.adaptiveStroke;

  // Apply stroke properties
  atr.color = stroke.color;
  atr.weight = stroke.weight;
  atr.mode = stroke.mode as AtramentMode;
  atr.smoothing = stroke.smoothing;
  atr.adaptiveStroke = stroke.adaptiveStroke;

  const first = stroke.segments[0];
  atr.beginStroke(first.point.x, first.point.y);

  let prev = first;
  for (let i = 1; i < stroke.segments.length; i++) {
    const seg = stroke.segments[i];
    atr.draw(seg.point.x, seg.point.y, prev.point.x, prev.point.y, seg.pressure);
    prev = seg;
  }

  atr.endStroke(prev.point.x, prev.point.y);

  // Restore previous properties
  atr.color = prevColor;
  atr.weight = prevWeight;
  atr.mode = prevMode;
  atr.smoothing = prevSmoothing;
  atr.adaptiveStroke = prevAdaptive;
}

export function useAtrament(config: UseAtramentConfig): UseAtramentReturn {
  const { canvasRef, width, height, colour, weight, mode } = config;

  const atrRef = useRef<Atrament | null>(null);
  const strokesRef = useRef<AtramentStroke[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Initialise Atrament when canvas is available
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const atr = new Atrament(canvas, {
      width,
      height,
      color: colour,
      weight,
      mode,
      adaptiveStroke: true,
      smoothing: 0.85,
    });

    atr.recordStrokes = true;

    // Record strokes for undo
    atr.addEventListener('strokerecorded', ({ stroke }) => {
      strokesRef.current.push(stroke);
      setIsDirty(true);
    });

    atrRef.current = atr;
    setIsReady(true);

    return () => {
      atr.destroy();
      atrRef.current = null;
      setIsReady(false);
    };
    // Only re-create on mount/unmount — width/height are fixed at 512
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef]);

  // Sync colour
  useEffect(() => {
    if (atrRef.current) atrRef.current.color = colour;
  }, [colour]);

  // Sync weight
  useEffect(() => {
    if (atrRef.current) atrRef.current.weight = weight;
  }, [weight]);

  // Sync mode
  useEffect(() => {
    if (atrRef.current) atrRef.current.mode = mode;
  }, [mode]);

  const clear = useCallback(() => {
    if (!atrRef.current) return;
    atrRef.current.clear();
    strokesRef.current = [];
    setIsDirty(false);
  }, []);

  const undo = useCallback(() => {
    const atr = atrRef.current;
    if (!atr || strokesRef.current.length === 0) return;

    // Remove last stroke
    strokesRef.current.pop();

    // Temporarily disable recording to avoid re-recording replayed strokes
    atr.recordStrokes = false;
    atr.clear();

    // Replay all remaining strokes
    for (const stroke of strokesRef.current) {
      replayStroke(atr, stroke);
    }

    atr.recordStrokes = true;
    setIsDirty(strokesRef.current.length > 0);
  }, []);

  const toDataURL = useCallback(
    (type = 'image/webp', quality = 0.8): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      let dataUrl = canvas.toDataURL(type, quality);
      // Fall back to PNG if WebP not supported
      if (type === 'image/webp' && !dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/png');
      }
      return dataUrl;
    },
    [canvasRef]
  );

  return { isReady, isDirty, clear, undo, toDataURL };
}
