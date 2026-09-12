import footprints from '../data/playerSpriteFootprints.json';

/** Visible alpha bounds, measured offline so mobile never reads back GPU textures. */
export function getPlayerFootprint(url: string): { top: number; bottom: number } {
  const key = url.match(/character\d+\/(?:base|fairy)\/[^/?]+/)?.[0];
  return (
    (key && (footprints as Record<string, { top: number; bottom: number }>)[key]) || {
      top: 0,
      bottom: 1,
    }
  );
}

export function playerGroundingOffset(url: string, renderedSize: number): number {
  return (getPlayerFootprint(url).bottom - 0.5) * renderedSize;
}

/** A stable camera envelope across walk frames avoids camera bobbing with animation. */
export function getPlayerBodyFraction(url: string): number {
  const family = url.match(/character\d+\/(?:base|fairy)\//)?.[0];
  if (!family) return 1;
  return Math.max(
    ...Object.entries(footprints)
      .filter(([key]) => key.startsWith(family))
      .map(([, bounds]) => bounds.bottom - bounds.top)
  );
}

/**
 * Shop floor registration in the authored 1200×675 painting (before its 1.2× scale).
 * The old centre-anchored walkmesh includes counter/basket pixels. Keep the shared
 * tile coordinates, but constrain mobile feet to the visible floor silhouette.
 */
export function shopFloorY(x: number): number {
  const pixelX = x * 64;
  if (pixelX < 285 || (pixelX >= 300 && pixelX < 465) || pixelX >= 860) return 655 / 64;
  if (pixelX >= 465 && pixelX < 555) return 635 / 64;
  return 600 / 64;
}

export function isOutsideMobileShopFloor(position: { x: number; y: number }): boolean {
  return position.y < shopFloorY(position.x) || position.y > 668 / 64;
}
