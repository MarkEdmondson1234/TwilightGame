/**
 * useViewFrame — the camera / room transform, at two rates.
 *
 * The game loop calls `syncViewFrame()` every frame with the live player
 * position (a ref). It computes where the world sits on screen, stores it in
 * `viewFrameRef` for the PixiJS renderer and the pointer maths, and writes the
 * DOM world layer's CSS transform directly so GIF overlays and indicators keep
 * pace with the canvas.
 *
 * React gets the same computation from its throttled player-position snapshot
 * (`view`), for the overlays that only need ~10 Hz. Both come from one pure
 * function (utils/viewFrame.ts), so they cannot disagree about the maths, only
 * about how fresh the position is.
 *
 * This is the §6A change (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md):
 * before it, scrolling the world meant re-rendering App on every moving frame.
 */

import { useCallback, useMemo, useRef, MutableRefObject } from 'react';
import { Position } from '../types';
import { computeViewFrame, isSameViewFrame, ViewFrame, ViewFrameInputs } from '../utils/viewFrame';

export interface UseViewFrameReturn {
  /** The live frame, written by the loop. Read it per frame; never render from it. */
  viewFrameRef: MutableRefObject<ViewFrame>;
  /** The DOM world layer whose transform the loop drives. */
  worldLayerRef: MutableRefObject<HTMLDivElement | null>;
  /** Call once per frame after movement; returns the frame it applied. */
  syncViewFrame: () => ViewFrame;
  /** React's view, from the snapshot position. */
  view: ViewFrame;
}

export function useViewFrame(
  inputs: ViewFrameInputs,
  snapshotPos: Position,
  playerPosRef: MutableRefObject<Position>
): UseViewFrameReturn {
  // Mirrored during render so the loop reads this render's zoom/map/viewport
  // without syncViewFrame being rebuilt on them.
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;

  const view = useMemo(() => computeViewFrame(inputs, snapshotPos), [inputs, snapshotPos]);

  const viewFrameRef = useRef<ViewFrame>(view);
  const worldLayerRef = useRef<HTMLDivElement | null>(null);
  const appliedTransformRef = useRef<{ el: HTMLDivElement | null; transform: string }>({
    el: null,
    transform: '',
  });

  const syncViewFrame = useCallback((): ViewFrame => {
    const next = computeViewFrame(inputsRef.current, playerPosRef.current);
    const prev = viewFrameRef.current;
    // Keep the object when nothing moved: consumers compare it by value, but a
    // stable identity lets them skip even that.
    const frame = isSameViewFrame(prev, next) ? prev : next;
    viewFrameRef.current = frame;

    // Tiled maps scroll the DOM world with the camera; background rooms keep
    // it fixed (their overlays carry the pan inside gridOffset) and only zoom.
    const { zoom } = inputsRef.current;
    const transform = frame.backgroundRoom
      ? `scale(${zoom})`
      : `scale(${zoom}) translate(${-frame.cameraX}px, ${-frame.cameraY}px)`;
    const el = worldLayerRef.current;
    const applied = appliedTransformRef.current;
    // The element is part of the key: React remounts the layer around the
    // loading screen, and a fresh div starts with no transform at all.
    if (el && (el !== applied.el || transform !== applied.transform)) {
      applied.el = el;
      applied.transform = transform;
      el.style.transform = transform;
    }
    return frame;
  }, [playerPosRef]);

  return { viewFrameRef, worldLayerRef, syncViewFrame, view };
}
