/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;

  // Firebase Configuration
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_ENABLED?: string;

  // Multiplayer (Realtime Database presence)
  readonly VITE_FIREBASE_DATABASE_URL?: string;
  readonly VITE_MULTIPLAYER_ENABLED?: string;

  // Firebase Emulators (development only)
  readonly VITE_USE_FIREBASE_EMULATORS?: string;

  // Testing mode
  readonly VITE_TESTING_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Debug/test globals attached to `window` by utils/gameInitializer.ts (and
 * utils/PerformanceMonitor.ts for the monitor). All optional: they only exist
 * after game init, and scripts/perf-test.js probes them with `typeof` checks
 * before use — so nothing may assume they are present.
 */
interface Window {
  gameState?: typeof import('./GameState').gameState;
  mapManager?: typeof import('./maps').mapManager;
  inventoryManager?: typeof import('./utils/inventoryManager').inventoryManager;
  cookingManager?: typeof import('./utils/CookingManager').cookingManager;
  magicManager?: typeof import('./utils/MagicManager').magicManager;
  __PERF_MONITOR__?: typeof import('./utils/PerformanceMonitor').performanceMonitor;
  audioManager?: typeof import('./utils/AudioManager').audioManager;
  textureManager?: typeof import('./utils/TextureManager').textureManager;
  /** Used by scripts/perf-test.js to skip the title screen and season cutscenes */
  cutsceneManager?: typeof import('./utils/CutsceneManager').cutsceneManager;
  TimeManager?: typeof import('./utils/TimeManager').TimeManager;
  Season?: typeof import('./utils/TimeManager').Season;
  ColorResolver?: typeof import('./utils/ColorResolver').ColorResolver;
}
