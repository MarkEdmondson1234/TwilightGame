import { useEffect } from 'react';

const SHOWN_KEY = 'twilight.tip.homeScreen';

/** Below this height a browser's toolbars cost a real share of the screen. */
const SHORT_SCREEN_PX = 400;

/**
 * Whether to suggest adding the game to the Home Screen: an iPhone or iPad
 * browser tab (not already the installed app) on a short screen. Chrome on iOS
 * cannot go full screen, and its toolbars took a small iPhone's landscape view
 * down to 568x260 in production; installed, the same phone gets 568x320.
 */
export function shouldSuggestHomeScreen(env: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  standalone: boolean;
  viewportHeight: number;
}): boolean {
  const isIOS =
    /iPhone|iPad|iPod/.test(env.userAgent) ||
    (env.platform === 'MacIntel' && env.maxTouchPoints > 1);
  return isIOS && !env.standalone && env.viewportHeight < SHORT_SCREEN_PX;
}

/** Show the tip once per device, the first time the player is in the world. */
export function useHomeScreenTip(isInWorld: boolean, showToast: (message: string) => void): void {
  useEffect(() => {
    if (!isInWorld) return;
    try {
      if (window.localStorage.getItem(SHOWN_KEY)) return;
      const nav = navigator as Navigator & { standalone?: boolean };
      const suggest = shouldSuggestHomeScreen({
        userAgent: nav.userAgent,
        platform: nav.platform,
        maxTouchPoints: nav.maxTouchPoints ?? 0,
        standalone:
          nav.standalone === true ||
          window.matchMedia?.('(display-mode: standalone)').matches === true,
        viewportHeight: window.innerHeight,
      });
      if (!suggest) return;
      window.localStorage.setItem(SHOWN_KEY, '1');
      showToast('Tip: tap Share, then "Add to Home Screen", to play full screen with more room.');
    } catch {
      // Storage blocked: skip the tip rather than repeat it every visit.
    }
  }, [isInWorld, showToast]);
}
