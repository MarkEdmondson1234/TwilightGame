/** @vitest-environment node */
import { describe, it, expect, beforeEach } from 'vitest';
import { getCanvasScale, toCanvasCoords } from '../minigames/wreath-making/wreathHelpers';
import { ringDrawRect, CAPTURE_SIZE } from '../minigames/wreath-making/wreathCapture';
import {
  WREATH_CANVAS_SIZE,
  WREATH_RING_SIZE,
  WREATH_RING_OFFSET,
} from '../minigames/wreath-making/wreathConstants';
import { inventoryManager } from '../utils/inventoryManager';

/**
 * Regression tests for three wreath workshop bugs.
 *
 * All three were invisible in normal desktop play, which is why they survived:
 * - the saved wreath image drew its ring full-bleed while flowers used canvas-space
 *   coordinates, so every wreath crafted after the canvas was enlarged came out with its
 *   flowers floating inside an oversized ring;
 * - pointer maths ignored the workshop's responsive `transform: scale()`, so placement and
 *   dragging drifted on any viewport narrow enough to trigger it (i.e. always on iPad);
 * - the decoration lookup and the inventory removal disagreed about WHICH wreath instance
 *   was being placed, so one wreath's image could be placed while a different one was
 *   consumed.
 */

// ---------------------------------------------------------------------------
// Capture geometry
// ---------------------------------------------------------------------------

describe('wreath capture geometry', () => {
  const scale = CAPTURE_SIZE / WREATH_CANVAS_SIZE;

  it('draws the ring in the centred ring box, not across the whole canvas', () => {
    const ring = ringDrawRect(scale);

    // The bug: ring drawn at (0,0) spanning the full capture canvas.
    expect(ring.x).toBeGreaterThan(0);
    expect(ring.y).toBeGreaterThan(0);
    expect(ring.width).toBeLessThan(CAPTURE_SIZE);
    expect(ring.height).toBeLessThan(CAPTURE_SIZE);
  });

  it('keeps the ring square and centred', () => {
    const ring = ringDrawRect(scale);
    expect(ring.width).toBeCloseTo(ring.height, 6);
    expect(ring.x).toBeCloseTo(ring.y, 6);
    // Equal margin on both sides.
    expect(CAPTURE_SIZE - (ring.x + ring.width)).toBeCloseTo(ring.x, 6);
  });

  it('matches the ring-to-canvas ratio the player sees on screen', () => {
    const ring = ringDrawRect(scale);
    expect(ring.width / CAPTURE_SIZE).toBeCloseTo(WREATH_RING_SIZE / WREATH_CANVAS_SIZE, 6);
    expect(ring.x / CAPTURE_SIZE).toBeCloseTo(WREATH_RING_OFFSET / WREATH_CANVAS_SIZE, 6);
  });
});

// ---------------------------------------------------------------------------
// Pointer maths under transform: scale()
// ---------------------------------------------------------------------------

/** Minimal DOMRect stand-in — only the fields the helpers read. */
function rectAt(left: number, top: number, renderedSize: number): DOMRect {
  return { left, top, width: renderedSize, height: renderedSize } as DOMRect;
}

describe('wreath pointer maths', () => {
  it('reports scale 1 when the workshop is not shrunk', () => {
    expect(getCanvasScale(rectAt(0, 0, WREATH_CANVAS_SIZE))).toBeCloseTo(1, 6);
  });

  it('derives the scale from the rendered width', () => {
    expect(getCanvasScale(rectAt(0, 0, WREATH_CANVAS_SIZE * 0.8))).toBeCloseTo(0.8, 6);
  });

  it('falls back to 1 for a zero-width rect rather than dividing by zero', () => {
    expect(getCanvasScale(rectAt(0, 0, 0))).toBe(1);
  });

  it('maps a click at the visual centre to the canvas centre at any scale', () => {
    const centre = WREATH_CANVAS_SIZE / 2;

    for (const scale of [1, 0.8, 0.5]) {
      const rendered = WREATH_CANVAS_SIZE * scale;
      const rect = rectAt(100, 50, rendered);
      // Click the middle of the element as it appears on screen.
      const { x, y } = toCanvasCoords(100 + rendered / 2, 50 + rendered / 2, rect);
      expect(x).toBeCloseTo(centre, 6);
      expect(y).toBeCloseTo(centre, 6);
    }
  });

  it('maps the far corner to the canvas extent, not a fraction of it', () => {
    const scale = 0.5;
    const rendered = WREATH_CANVAS_SIZE * scale;
    const rect = rectAt(0, 0, rendered);
    const { x, y } = toCanvasCoords(rendered, rendered, rect);
    // The bug: undivided offsets gave WREATH_CANVAS_SIZE * scale here.
    expect(x).toBeCloseTo(WREATH_CANVAS_SIZE, 6);
    expect(y).toBeCloseTo(WREATH_CANVAS_SIZE, 6);
  });
});

// ---------------------------------------------------------------------------
// Decoration instance matching
// ---------------------------------------------------------------------------

// A real, non-stackable wreath item — addItemWithDecoration silently no-ops on unknown ids,
// which would make these tests pass vacuously.
const WREATH_ITEM = 'decoration_wreath_rustic';

describe('wreath decoration instance matching', () => {
  beforeEach(() => {
    while (inventoryManager.hasItem(WREATH_ITEM, 1)) {
      inventoryManager.removeItem(WREATH_ITEM, 1);
    }
  });

  it('consumes the instance whose artwork was placed, not merely the first one', () => {
    // The bug scenario: a legacy wreath (no decorationId, e.g. from an older save) sits
    // ahead of a newly crafted one in the queue.
    inventoryManager.addItem(WREATH_ITEM, 1);
    inventoryManager.addItemWithDecoration(WREATH_ITEM, 'deco_placed');

    // Placement offers the only artwork available...
    const placed = inventoryManager.getFirstDecorationId(WREATH_ITEM);
    expect(placed).toBe('deco_placed');

    // ...so placing it must consume THAT instance. Plain removeItem would have eaten the
    // legacy one, leaving 'deco_placed' still in the inventory AND in the world.
    inventoryManager.removeItemInstanceByDecorationId(WREATH_ITEM, placed!);

    expect(inventoryManager.getFirstDecorationId(WREATH_ITEM)).toBeUndefined();
    expect(inventoryManager.hasItem(WREATH_ITEM, 1)).toBe(true); // the legacy one remains
  });

  it('removes the named instance from the middle of the queue', () => {
    inventoryManager.addItemWithDecoration(WREATH_ITEM, 'deco_a');
    inventoryManager.addItemWithDecoration(WREATH_ITEM, 'deco_b');
    inventoryManager.addItemWithDecoration(WREATH_ITEM, 'deco_c');

    inventoryManager.removeItemInstanceByDecorationId(WREATH_ITEM, 'deco_b');

    expect(inventoryManager.getFirstDecorationId(WREATH_ITEM)).toBe('deco_a');
    inventoryManager.removeItemInstanceByDecorationId(WREATH_ITEM, 'deco_a');
    expect(inventoryManager.getFirstDecorationId(WREATH_ITEM)).toBe('deco_c');
  });

  it('falls back to normal removal when no instance carries that id', () => {
    inventoryManager.addItem(WREATH_ITEM, 1);
    expect(inventoryManager.removeItemInstanceByDecorationId(WREATH_ITEM, 'deco_absent')).toBe(
      true
    );
    expect(inventoryManager.hasItem(WREATH_ITEM, 1)).toBe(false);
  });

  it('returns undefined when the player holds none', () => {
    expect(inventoryManager.getFirstDecorationId(WREATH_ITEM)).toBeUndefined();
  });
});
