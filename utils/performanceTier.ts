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
  /**
   * Whether this is a phone/tablet, tracked separately from `tier`.
   *
   * A modern iPhone lands on HIGH (6+ cores, and Safari doesn't expose
   * navigator.deviceMemory so it defaults to 4) — which is the right call for
   * *render* quality but the wrong one for *memory*. iOS caps the entire web
   * content process well below a desktop's VRAM and kills the tab when it is
   * exceeded, with no JS error and nothing reportable to Sentry. So the texture
   * policy below keys on this flag, never on the tier.
   */
  isMobile: boolean;
  resolution: number;
  antialias: boolean;
  glowSteps: number;
  enableGlows: boolean;
  enableShadows: boolean;

  // ---- Texture memory policy (see isMobile) ----
  /**
   * Mipmaps cost an extra ~33% of every texture's memory for smoother
   * downscaling. Worth it on desktop, not worth a tab kill on mobile.
   */
  generateMipmaps: boolean;
  /**
   * Soft ceiling on resident decoded texture memory, in MB, above which
   * TextureManager frees anything the current map does not need.
   *
   * This is an *eviction trigger*, so it sits deliberately above the largest
   * single map's working set (~300MB, asserted by tests/mapTextureBudget.test.ts)
   * — otherwise every map change would evict textures the very next one needs
   * and thrash. It fires when more than roughly one map's worth has piled up.
   */
  textureBudgetMB: number;
  /**
   * How many textures may be fetched at once. The startup batch used to fire
   * every request simultaneously; on mobile that storm is what produced the
   * uncaught "TypeError: Load failed" rejections.
   */
  maxConcurrentTextureLoads: number;
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
  const isMobile = isMobileDevice() || isOldIPad();

  // Texture policy is chosen by form factor, not by tier. A fast phone still
  // has a phone's memory ceiling — see the isMobile doc comment above.
  const texturePolicy = isMobile
    ? {
        generateMipmaps: false,
        textureBudgetMB: tier === PerformanceTier.LOW ? 256 : 384,
        maxConcurrentTextureLoads: tier === PerformanceTier.LOW ? 4 : 6,
      }
    : {
        generateMipmaps: true,
        textureBudgetMB: 1536,
        maxConcurrentTextureLoads: 16,
      };

  switch (tier) {
    case PerformanceTier.LOW:
      return {
        tier,
        isMobile,
        ...texturePolicy,
        resolution: 1, // Never use retina on old devices
        antialias: false, // Disable antialias completely
        glowSteps: 0, // Disable glows entirely
        enableGlows: false,
        enableShadows: false, // Disable shadows too
      };

    case PerformanceTier.MEDIUM:
      return {
        tier,
        isMobile,
        ...texturePolicy,
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
        isMobile,
        ...texturePolicy,
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
