import { useState, useEffect } from 'react';

/**
 * Hook to detect if the user is on a touch device (mobile/tablet)
 */
export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      // Check for touch capability
      const hasTouch = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );

      // Check for mobile/tablet user agent
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      setIsTouchDevice(hasTouch || isMobileUA);
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
}
