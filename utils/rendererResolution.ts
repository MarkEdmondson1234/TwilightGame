/** Keep browser zoom-out from multiplying framebuffer allocation beyond the display budget. */
export function getRendererResolution(
  width: number,
  height: number,
  screenWidth: number,
  screenHeight: number,
  preferred: number
): number {
  if (
    ![width, height, screenWidth, screenHeight, preferred].every(
      (value) => Number.isFinite(value) && value > 0
    )
  )
    return preferred;
  return Math.min(
    preferred,
    preferred * Math.sqrt((screenWidth * screenHeight) / (width * height))
  );
}
