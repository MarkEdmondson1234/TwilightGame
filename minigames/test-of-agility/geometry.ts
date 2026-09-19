import { computeGap, CAMERA_ALTITUDE, HORIZON_RATIO } from '../skiing/geometry';
import type { ObstacleKind } from './rules';
export { computeGap, CAMERA_ALTITUDE, HORIZON_RATIO };
// Alpha bounds measured from the actual cart, crystal, cave-rock and mine-creature artwork.
export const CART_ASPECT = 529 / 935;
export const CART_PADDING = 0.034224598930481284;
export const OBSTACLES: Record<
  ObstacleKind,
  { base: number; aspect: number; padding: number; width: number }
> = {
  crystal: { base: 170, aspect: 602 / 678, padding: 0.022123893805309734, width: 0.65 },
  rock: { base: 310, aspect: 1, padding: 0.28125, width: 0.6 },
  goblin: { base: 310, aspect: 1, padding: 0.166015625, width: 0.4 },
};
export function cartWidth(w: number, h: number) {
  return Math.min(w * 0.32, h * 0.34 * CART_ASPECT);
}
export function cartBottom(w: number, h: number) {
  return Math.max(h * 0.03, 100 - (cartWidth(w, h) / CART_ASPECT) * CART_PADDING);
}
export function cartAnchor(w: number, h: number) {
  return h - cartBottom(w, h) - (cartWidth(w, h) / CART_ASPECT) * CART_PADDING;
}
export function obstacleWidth(kind: ObstacleKind, w: number, z: number, h = w * 0.625) {
  return Math.min(
    (OBSTACLES[kind].base * computeGap(w)) / z,
    Math.min(w * 0.28, cartWidth(w, h) * (kind === 'crystal' ? 1.15 : kind === 'rock' ? 1.6 : 2))
  );
}
export function obstacleGround(kind: ObstacleKind, w: number, h: number, z: number) {
  const o = OBSTACLES[kind];
  return (
    h * HORIZON_RATIO +
    (computeGap(w) * CAMERA_ALTITUDE) / z -
    (obstacleWidth(kind, w, z, h) / o.aspect) * o.padding
  );
}
export function cartContact(kind: ObstacleKind, w: number, h: number) {
  let low = 1,
    high = 4000;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (obstacleGround(kind, w, h, mid) > cartAnchor(w, h)) low = mid;
    else high = mid;
  }
  const z = (low + high) / 2;
  const pixels =
    ((obstacleWidth(kind, w, z, h) * OBSTACLES[kind].width + cartWidth(w, h) * 0.75) * 0.55) / 2;
  return { z, halfWidth: (pixels * z) / computeGap(w) };
}
