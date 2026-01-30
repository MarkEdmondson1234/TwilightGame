/**
 * EnvironmentController - Domain controller for environment effects
 *
 * Consolidates all environment-related effects into a single controller.
 * This includes weather, time of day, ambient audio, item decay, and movement effects.
 *
 * Note: Weather and timeOfDay state remain in App.tsx due to circular dependency
 * with usePixiRenderer (which needs these values but provides refs we need).
 * This controller manages all the EFFECTS while state is passed as props.
 *
 * Part of Phase 3 App.tsx refactoring - Domain Controllers.
 */

import { useEffect, useCallback, MutableRefObject } from 'react';
import { gameState } from '../GameState';
import { TimeManager } from '../utils/TimeManager';
import { audioManager } from '../utils/AudioManager';
import { isWeatherAllowedOnMap, WeatherType } from '../data/weatherConfig';
import { mapManager } from '../maps/MapManager';
import { TileType } from '../types';
import type { WeatherManager } from '../utils/WeatherManager';
import type { WeatherLayer } from '../utils/pixi/WeatherLayer';

// ============================================================================
// Configuration Interface
// ============================================================================

export interface UseEnvironmentControllerProps {
  /** Current map ID */
  currentMapId: string;

  /** Current weather - passed from App.tsx state */
  currentWeather: WeatherType;

  /** Setter for weather - passed from App.tsx */
  setCurrentWeather: (weather: WeatherType) => void;

  /** Current time of day - passed from App.tsx state */
  timeOfDay: 'day' | 'night';

  /** Setter for time of day - passed from App.tsx */
  setTimeOfDay: (time: 'day' | 'night') => void;

  /** Reference to weather manager for weather updates */
  weatherManagerRef: MutableRefObject<WeatherManager | null>;

  /** Reference to PixiJS weather layer */
  weatherLayerRef: MutableRefObject<WeatherLayer | null>;

  /** Callback to show toast notifications */
  onShowToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

// ============================================================================
// Return Interface
// ============================================================================

export interface UseEnvironmentControllerReturn {
  /** Set weather (updates state, gameState, and PixiJS layer) */
  setWeather: (weather: WeatherType) => void;

  /** Whether weather is visible on current map */
  isWeatherVisible: boolean;

  /** Force time update (for DevTools) */
  forceTimeUpdate: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useEnvironmentController(
  props: UseEnvironmentControllerProps
): UseEnvironmentControllerReturn {
  const {
    currentMapId,
    currentWeather,
    setCurrentWeather,
    timeOfDay,
    setTimeOfDay,
    weatherManagerRef,
    weatherLayerRef,
    onShowToast,
  } = props;

  // -------------------------------------------------------------------------
  // Weather State Management
  // -------------------------------------------------------------------------

  const setWeather = useCallback(
    (weather: WeatherType) => {
      setCurrentWeather(weather);
      gameState.setWeather(weather);

      // Update PixiJS weather layer
      if (weatherLayerRef.current) {
        weatherLayerRef.current.setWeather(weather);
      }
    },
    [setCurrentWeather, weatherLayerRef]
  );

  // Force time update (for DevTools)
  const forceTimeUpdate = useCallback(() => {
    const time = TimeManager.getCurrentTime();
    setTimeOfDay(time.timeOfDay === 'Day' ? 'day' : 'night');
  }, [setTimeOfDay]);

  // Computed: is weather visible on current map
  const isWeatherVisible = isWeatherAllowedOnMap(currentWeather, currentMapId);

  // -------------------------------------------------------------------------
  // Weather State Subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = gameState.subscribe((state) => {
      // Sync weather layer with gameState
      if (weatherLayerRef.current && state.weather !== weatherLayerRef.current.getWeather()) {
        console.log(`[EnvironmentController] Weather changed to: ${state.weather}`);
        weatherLayerRef.current.setWeather(state.weather);

        const showWeather = isWeatherAllowedOnMap(state.weather, currentMapId);
        weatherLayerRef.current.setVisible(showWeather);
      }
      // Update React state for WeatherTintOverlay
      setCurrentWeather(state.weather);
    });

    return () => unsubscribe();
  }, [currentMapId, weatherLayerRef, setCurrentWeather]);

  // -------------------------------------------------------------------------
  // Weather Visibility on Map Change
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!weatherLayerRef.current) return;

    const currentWeatherType = gameState.getWeather();
    const showWeather = isWeatherAllowedOnMap(currentWeatherType, currentMapId);
    weatherLayerRef.current.setVisible(showWeather);
  }, [currentMapId, weatherLayerRef]);

  // -------------------------------------------------------------------------
  // Weather Layer Sync
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (weatherLayerRef.current && currentWeather !== weatherLayerRef.current.getWeather()) {
      console.log(`[EnvironmentController] Syncing weather layer to: ${currentWeather}`);
      weatherLayerRef.current.setWeather(currentWeather);
    }
  }, [currentWeather, weatherLayerRef]);

  // -------------------------------------------------------------------------
  // Weather Ambient Audio
  // -------------------------------------------------------------------------

  useEffect(() => {
    const isOutdoors = isWeatherAllowedOnMap(currentWeather, currentMapId);

    // Map weather types to their ambient audio
    const weatherAudioMap: Record<string, string | null> = {
      rain: 'ambient_rain_light',
      storm: 'ambient_thunderstorm',
      snow: 'ambient_blizzard',
      clear: null, // No ambient for clear weather
    };

    // Stop all weather ambient sounds first
    audioManager.stopAmbient('ambient_rain_light', 1000);
    audioManager.stopAmbient('ambient_rain_thunder', 1000);
    audioManager.stopAmbient('ambient_thunderstorm', 1000);
    audioManager.stopAmbient('ambient_blizzard', 1000);
    audioManager.stopAmbient('ambient_birds', 1000);
    audioManager.stopAmbient('ambient_running_stream', 1000);

    // Play new weather ambient if outdoors and audio exists
    if (isOutdoors) {
      const audioKey = weatherAudioMap[currentWeather];
      if (audioKey && audioManager.hasSound(audioKey)) {
        audioManager.playAmbient(audioKey);
      }
    }
  }, [currentWeather, currentMapId]);

  // -------------------------------------------------------------------------
  // Forest Ambient Birds
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Check if we're in a procedural forest
    const isProceduralForest =
      currentMapId.startsWith('RANDOM_FOREST_') || currentMapId.startsWith('deep_forest_');

    // Weather conditions that silence the birds
    const badWeatherForBirds = ['rain', 'storm', 'snow'].includes(currentWeather);

    if (isProceduralForest && !badWeatherForBirds) {
      // Play bird ambience in forests (only if not already playing)
      if (audioManager.hasSound('ambient_birds')) {
        // playAmbient handles not re-triggering if already playing
        audioManager.playAmbient('ambient_birds');
      }
    } else {
      // Stop bird ambience when leaving forest or in bad weather
      audioManager.stopAmbient('ambient_birds', 1000);
    }

    return () => {
      audioManager.stopAmbient('ambient_birds', 500);
    };
  }, [currentMapId, currentWeather]);

  // -------------------------------------------------------------------------
  // Stream / Water Ambient
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Check if the current map has stream or water features
    const currentMap = mapManager.getCurrentMap();
    const hasStream =
      currentMapId === 'magical_lake' ||
      (currentMap?.grid?.some((row) => row.includes(TileType.STREAM)) ?? false);

    // Weather conditions that drown out stream sounds
    const badWeatherForStream = ['storm'].includes(currentWeather);

    if (hasStream && !badWeatherForStream) {
      if (audioManager.hasSound('ambient_running_stream')) {
        audioManager.playAmbient('ambient_running_stream');
      }
    } else {
      audioManager.stopAmbient('ambient_running_stream', 1000);
    }

    return () => {
      audioManager.stopAmbient('ambient_running_stream', 500);
    };
  }, [currentMapId, currentWeather]);

  // -------------------------------------------------------------------------
  // Ambient Music System
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Track if music is currently playing
    let isMusicPlaying = false;
    let musicTimeout: ReturnType<typeof setTimeout> | null = null;

    // Get appropriate music track for current map
    const getMusicForMap = (mapId: string): string | null => {
      if (mapId.includes('forest') || mapId.includes('deep_forest')) {
        return 'music_forest';
      }
      if (mapId.includes('village') || mapId.includes('home') || mapId.includes('mum')) {
        return 'music_village';
      }
      // Default to village music for other areas
      return 'music_village';
    };

    // Random interval between music plays (8-20 minutes)
    const getRandomInterval = () => Math.floor(Math.random() * 720000) + 480000;

    // Random duration for music play (30-90 seconds)
    const getRandomDuration = () => Math.floor(Math.random() * 60000) + 30000;

    const playRandomMusic = () => {
      if (isMusicPlaying) return;

      const musicKey = getMusicForMap(currentMapId);
      if (!musicKey || !audioManager.hasSound(musicKey)) {
        // Schedule next attempt
        musicTimeout = setTimeout(playRandomMusic, getRandomInterval());
        return;
      }

      // Play music with fade in
      isMusicPlaying = true;
      audioManager.playMusic(musicKey, { fadeIn: 3000 });

      // Schedule fade out
      const duration = getRandomDuration();
      musicTimeout = setTimeout(() => {
        audioManager.stopMusic(3000); // 3 second fade out
        isMusicPlaying = false;

        // Schedule next music play
        musicTimeout = setTimeout(playRandomMusic, getRandomInterval());
      }, duration);
    };

    // Start first music after a longer delay (2-5 minutes)
    const initialDelay = Math.floor(Math.random() * 180000) + 120000;
    musicTimeout = setTimeout(playRandomMusic, initialDelay);

    return () => {
      if (musicTimeout) {
        clearTimeout(musicTimeout);
      }
      audioManager.stopMusic(1000);
    };
  }, [currentMapId]);

  // -------------------------------------------------------------------------
  // Time of Day Polling
  // -------------------------------------------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      const time = TimeManager.getCurrentTime();
      const newTimeOfDay: 'day' | 'night' = time.timeOfDay === 'Day' ? 'day' : 'night';

      if (newTimeOfDay !== timeOfDay) {
        console.log(`[EnvironmentController] Time of day changed: ${timeOfDay} → ${newTimeOfDay}`);
        setTimeOfDay(newTimeOfDay);
      }

      // Check for automatic weather updates
      if (weatherManagerRef.current) {
        weatherManagerRef.current.checkWeatherUpdate();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [timeOfDay, setTimeOfDay, weatherManagerRef]);

  // -------------------------------------------------------------------------
  // Item Decay Cleanup
  // -------------------------------------------------------------------------

  useEffect(() => {
    const decayInterval = setInterval(() => {
      const removedCount = gameState.removeDecayedItems();
      if (removedCount > 0) {
        console.log(`[EnvironmentController] Removed ${removedCount} decayed item(s)`);
        // Re-render now handled by EventBus (PLACED_ITEMS_CHANGED)
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(decayInterval);
  }, []);

  // -------------------------------------------------------------------------
  // Movement Effect Expiration
  // -------------------------------------------------------------------------

  useEffect(() => {
    const movementEffectInterval = setInterval(() => {
      if (gameState.isMovementEffectActive()) {
        const remaining = gameState.getMovementEffectRemainingMs();
        if (remaining <= 0) {
          const effect = gameState.getMovementEffect();
          const modeName = effect?.mode === 'floating' ? 'floating' : 'flying';
          gameState.clearMovementEffect();
          onShowToast(`Your ${modeName} effect has worn off.`, 'info');
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(movementEffectInterval);
  }, [onShowToast]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    setWeather,
    isWeatherVisible,
    forceTimeUpdate,
  };
}
