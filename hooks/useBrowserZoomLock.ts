import { useEffect } from 'react';

/**
 * Always-on hook that prevents the browser from changing its zoom level.
 *
 * On Windows Chrome, Ctrl+Scroll or trackpad pinch changes browser zoom,
 * which persists per-site and breaks the game layout. This hook intercepts
 * those events at the window level and prevents the default browser zoom.
 *
 * Separate from usePinchZoom (which controls the game's own zoom) so that
 * browser zoom prevention is NEVER disabled, even when overlays are open.
 */
export function useBrowserZoomLock(): void {
  useEffect(() => {
    // Prevent Ctrl+Scroll (desktop) and trackpad pinch (fires as ctrlKey wheel on Chrome)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // Prevent Ctrl+Plus/Minus/0 keyboard zoom shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0') {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
