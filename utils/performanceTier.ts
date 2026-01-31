/**
 * Performance Tier Detection
 *
 * Detects device capabilities to adjust rendering settings for optimal performance.
 * Old iPads (2011-2014) have extremely limited GPUs and need aggressive optimisation.
 */

export enum PerformanceTier {
  LOW = 'low', // Old iPads, low-end mobile (A5-A7 chips)
  MEDIUM = 'medium', // Mid-range tablets, older desktops
  HIGH = 'high', // Modern devices, desktop with GPU
}

interface PerformanceSettings {
  tier: PerformanceTier;
  resolution: number;
  antialias: boolean;
  glowSteps: number;
  enableGlows: boolean;
  enableShadows: boolean;
}

/**
 * Detect if this is a touch device (tablet/phone)
 */
function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE/Edge specific
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Detect if this is likely an old iPad (2011-2014)
 * These have A5-A7 chips with very limited GPU performance
 */
function isOldIPad(): boolean {
  const ua = navigator.userAgent;

  // Check if it's an iPad
  if (!ua.includes('iPad')) {
    return false;
  }

  // Old iPads have limited CPU cores (1-2)
  // navigator.hardwareConcurrency is 2 on iPad 2/3/4, Mini 1
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) {
    return true;
  }

  // Check device memory if available (Safari doesn't expose this)
  // @ts-expect-error - deviceMemory is not in all browsers
  const memory = navigator.deviceMemory;
  if (memory !== undefined && memory <= 1) {
    return true;
  }

  // Screen size heuristic - old iPads have specific resolutions
  // iPad 2: 1024x768, iPad 3/4: 2048x1536
  // Modern iPads: 2224x1668, 2388x1668, etc.
  const screenWidth = Math.max(window.screen.width, window.screen.height);
  const screenHeight = Math.min(window.screen.width, window.screen.height);

  // Old iPad retina (iPad 3/4) has exactly 2048x1536
  if (screenWidth === 2048 && screenHeight === 1536) {
    return true;
  }

  // Non-retina old iPad has 1024x768
  if (screenWidth === 1024 && screenHeight === 768) {
    return true;
  }

  return false;
}

/**
 * Detect if this is a mobile/tablet device
 */
function isMobileDevice(): boolean {
  const ua = navigator.userAgent;
  return (
    isTouchDevice() &&
    (ua.includes('iPad') ||
      ua.includes('iPhone') ||
      ua.includes('Android') ||
      ua.includes('Mobile'))
  );
}

/**
 * Detect the performance tier of the current device
 */
export function detectPerformanceTier(): PerformanceTier {
  // Old iPads get LOW tier
  if (isOldIPad()) {
    console.log('[PerformanceTier] Detected old iPad - using LOW tier');
    return PerformanceTier.LOW;
  }

  // Mobile devices get MEDIUM tier by default
  if (isMobileDevice()) {
    // Check if it's a powerful mobile device
    const cores = navigator.hardwareConcurrency || 4;
    // @ts-expect-error - deviceMemory is not in all browsers
    const memory = navigator.deviceMemory || 4;

    if (cores >= 6 && memory >= 4) {
      console.log('[PerformanceTier] Detected powerful mobile - using HIGH tier');
      return PerformanceTier.HIGH;
    }

    console.log('[PerformanceTier] Detected mobile device - using MEDIUM tier');
    return PerformanceTier.MEDIUM;
  }

  // Desktop defaults to HIGH
  console.log('[PerformanceTier] Detected desktop - using HIGH tier');
  return PerformanceTier.HIGH;
}

/**
 * Get rendering settings based on performance tier
 */
export function getPerformanceSettings(): PerformanceSettings {
  const tier = detectPerformanceTier();
  const dpr = window.devicePixelRatio || 1;

  switch (tier) {
    case PerformanceTier.LOW:
      return {
        tier,
        resolution: 1, // Never use retina on old devices
        antialias: false, // Disable antialias completely
        glowSteps: 0, // Disable glows entirely
        enableGlows: false,
        enableShadows: false, // Disable shadows too
      };

    case PerformanceTier.MEDIUM:
      return {
        tier,
        resolution: Math.min(dpr, 1.5), // Cap at 1.5x
        antialias: false, // Disable antialias on mobile
        glowSteps: 8, // Reduced glow quality
        enableGlows: true,
        enableShadows: true,
      };

    case PerformanceTier.HIGH:
    default:
      return {
        tier,
        resolution: Math.min(dpr, 2), // Cap at 2x even on high-end
        antialias: true, // Enable antialias on desktop
        glowSteps: 32, // Full glow quality
        enableGlows: true,
        enableShadows: true,
      };
  }
}

// Cache the settings to avoid repeated detection
let cachedSettings: PerformanceSettings | null = null;

/**
 * Get cached performance settings (detected once on first call)
 */
export function getCachedPerformanceSettings(): PerformanceSettings {
  if (!cachedSettings) {
    cachedSettings = getPerformanceSettings();
    console.log('[PerformanceTier] Settings:', cachedSettings);
  }
  return cachedSettings;
}

/**
 * Force re-detection of performance tier (useful for testing)
 */
export function resetPerformanceSettings(): void {
  cachedSettings = null;
}
