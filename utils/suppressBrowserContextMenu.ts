/**
 * Suppress the browser's own context menu across the whole game.
 *
 * Right-click is a game input here: it opens the emote picker on your own
 * character and the action menu on an inventory item. Those places call
 * preventDefault() themselves, but everywhere else — the gaps between inventory
 * slots, the HUD, the panel background, a stray click while dragging — the
 * browser menu appeared instead, which reads as "right-click is broken" even
 * though the handlers are wired. Players don't aim at handlers, they aim at the
 * inventory.
 *
 * A document-level listener is the only thing that covers all of it: the game's
 * own mouse listener is attached to the canvas container, and the HUD is a
 * sibling overlay it never sees.
 *
 * Shift+right-click still opens the real menu in development, so "inspect
 * element" keeps working while debugging.
 */
export function suppressBrowserContextMenu(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('contextmenu', (event: MouseEvent) => {
    if (import.meta.env.DEV && event.shiftKey) return;
    event.preventDefault();
  });
}
