/**
 * Where the touch action menu opens.
 *
 * The menu is a small cluster of icon buttons that appears beside the tap that
 * opened it (issue #157 — the old full-width "Close actions" sheet covered the
 * middle of a phone screen for a two-option menu). Pure, so the placement rules
 * can be tested without laying anything out.
 */

/** Keep the menu this far from the screen edges and from any control it avoids. */
export const TOUCH_MENU_MARGIN_PX = 8;

/**
 * Space between the tap point and the menu. A fingertip covers roughly a 45px
 * disc and the hand covers everything below it, so the menu opens above the
 * finger, never centred on it.
 */
export const TOUCH_MENU_FINGER_GAP_PX = 28;

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface MenuViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Top-left corner for a menu of `size`, opened by a tap at `anchor`.
 *
 * Above the finger if it fits, otherwise below it; then pulled inside the
 * viewport; then lifted clear of every rectangle in `avoid` (the fixed touch
 * controls, which all hang from the bottom of the screen, so up is always the
 * way out). The top edge wins last: a menu taller than the space left is pinned
 * to the top so its first option stays reachable.
 */
export function placeTouchMenu(
  anchor: { x: number; y: number },
  size: { width: number; height: number },
  viewport: MenuViewport,
  avoid: readonly Rect[] = []
): { left: number; top: number } {
  const m = TOUCH_MENU_MARGIN_PX;
  const minLeft = viewport.left + m;
  const maxLeft = viewport.left + viewport.width - m - size.width;
  const minTop = viewport.top + m;
  const maxTop = viewport.top + viewport.height - m - size.height;

  let left = Math.max(minLeft, Math.min(anchor.x - size.width / 2, maxLeft));

  let top = anchor.y - TOUCH_MENU_FINGER_GAP_PX - size.height;
  if (top < minTop) top = anchor.y + TOUCH_MENU_FINGER_GAP_PX;
  top = Math.max(minTop, Math.min(top, maxTop));

  // Each pass can only move the menu up, so this settles within one pass per rect.
  for (let pass = 0; pass <= avoid.length; pass++) {
    const box = { left, top, right: left + size.width, bottom: top + size.height };
    const hit = avoid.find((r) =>
      overlaps(box, { left: r.left - m, top: r.top - m, right: r.right + m, bottom: r.bottom + m })
    );
    if (!hit) break;
    top = hit.top - m - size.height;
  }

  top = Math.max(minTop, top);
  left = Math.max(minLeft, left);
  return { left, top };
}
