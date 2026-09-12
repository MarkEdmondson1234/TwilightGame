import { useEffect } from 'react';

/** Keep world zoom separate from browser magnification; menus opt out. */
export function useBrowserZoomLock(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);
}
