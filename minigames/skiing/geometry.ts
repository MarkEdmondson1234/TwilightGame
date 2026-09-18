/** Projection shared by drawing, danger prediction and contact detection. */
export const CAMERA_FOV = 112;
export const CAMERA_ALTITUDE = 150;
export const HORIZON_RATIO = 0.48;
export const COLLISION_FUDGE = 0.55;
const PLAYER_GROUND_PAD_RATIO = 0.271;

export function computeGap(width: number): number {
  return width / (2 * Math.tan((CAMERA_FOV * Math.PI) / 360));
}
export function capDrawWidth(base: number, gap: number, depth: number, width: number): number {
  return Math.min((base * gap) / depth, width * 0.46);
}
/** Keep the skier readable on phones and clear of the bottom touch controls. */
export function playerDrawWidth(width: number, height: number): number {
  return Math.min(width * 0.45, height * 0.42);
}
export function playerBottomMargin(width: number, height: number): number {
  return Math.max(height * 0.03, 110 - playerDrawWidth(width, height) * PLAYER_GROUND_PAD_RATIO);
}
export function getPlayerCollisionAnchorY(width: number, height: number): number {
  return (
    height -
    playerBottomMargin(width, height) -
    playerDrawWidth(width, height) * PLAYER_GROUND_PAD_RATIO
  );
}
export function getPlayerCollisionWidth(width: number, height: number): number {
  return playerDrawWidth(width, height) * 0.2;
}
export function spriteGroundY(
  width: number,
  height: number,
  depth: number,
  base: number,
  aspect: number,
  padding: number
): number {
  const gap = computeGap(width);
  return (
    height * HORIZON_RATIO +
    (gap * CAMERA_ALTITUDE) / depth -
    (capDrawWidth(base, gap, depth, width) / aspect) * padding
  );
}
export function contactForSprite(
  width: number,
  height: number,
  base: number,
  aspect: number,
  padding: number,
  widthScale: number,
  pickup: boolean
) {
  const anchor = getPlayerCollisionAnchorY(width, height);
  let low = 1,
    high = 4000;
  for (let i = 0; i < 24; i++) {
    const depth = (low + high) / 2;
    if (spriteGroundY(width, height, depth, base, aspect, padding) > anchor) low = depth;
    else high = depth;
  }
  const z = (low + high) / 2;
  const gap = computeGap(width);
  const pixels =
    ((capDrawWidth(base, gap, z, width) * widthScale + getPlayerCollisionWidth(width, height)) *
      COLLISION_FUDGE) /
    2;
  return { z, halfWidth: ((pixels * z) / gap) * (pickup ? 1.35 : 1) };
}
