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
  { id: 'charcoal', colour: '#1a1a1a', displayName: 'Charcoal' },
  { id: 'chalk', colour: '#f5f0e8', displayName: 'Chalk' },
  { id: 'earth', colour: '#6b4423', displayName: 'Earth Brown' },
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
