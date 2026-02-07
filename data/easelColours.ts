/**
 * Easel Drawing Colours
 *
 * Base colours always available for freehand drawing.
 * Unlocked paint colours from DecorationManager are merged at render time.
 */

export interface DrawingColour {
  id: string;
  colour: string;
  displayName: string;
}

/** Always available — represent basic art supplies */
export const BASE_DRAWING_COLOURS: DrawingColour[] = [
  { id: 'charcoal', colour: '#1A1A1A', displayName: 'Charcoal' },
  { id: 'chalk', colour: '#EFE9E1', displayName: 'Chalk' },
  { id: 'earth', colour: '#6B4423', displayName: 'Earth Brown' },
];

/**
 * Merge base colours with unlocked paint colours from the crafting system.
 * The more paints the player crafts, the more drawing colours they unlock.
 */
export function getAvailableDrawingColours(
  unlockedPaints: Array<{ paintId: string; colour: string; displayName: string }>
): DrawingColour[] {
  const paintColours: DrawingColour[] = unlockedPaints.map((p) => ({
    id: p.paintId,
    colour: p.colour,
    displayName: p.displayName,
  }));
  return [...BASE_DRAWING_COLOURS, ...paintColours];
}
