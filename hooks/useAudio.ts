/**
 * useAudio - React hook for audio playback
 *
 * Provides access to AudioManager with React-friendly patterns.
 * Handles mobile Safari resume on first interaction.
 *
 * Usage:
 *   const audio = useAudio();
 *   audio.playSfx('footstep_grass');
 *   audio.playMusic('village_day', { fadeIn: 2000 });
 */

import { useCallback, useEffect, useRef } from 'react';
import { audioManager, SoundCategory, SurfaceType, AudioSettings } from '../utils/AudioManager';
import { TileType } from '../types/core';

interface UseAudioOptions {
  autoResume?: boolean; // Auto-resume on first user interaction (default: true)
}

export function useAudio(options: UseAudioOptions = {}) {
  const { autoResume = true } = options;
  const hasResumed = useRef(false);

  // Auto-resume on first user interaction (mobile Safari requirement)
  useEffect(() => {
    if (!autoResume || hasResumed.current) return;

    const handleInteraction = () => {
      if (!hasResumed.current) {
        audioManager.resume();
        hasResumed.current = true;

        // Remove listeners after first interaction
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      }
    };

    document.addEventListener('click', handleInteraction);
    // Use passive: true to avoid blocking touch for 100-300ms on iOS
    document.addEventListener('touchstart', handleInteraction, { passive: true });
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [autoResume]);

  // Memoised functions for stable references

  const playSfx = useCallback((key: string, options?: { volume?: number; pitch?: number }) => {
    return audioManager.playSfx(key, options);
  }, []);

  const playFootstep = useCallback((surface: SurfaceType) => {
    audioManager.playFootstep(surface);
  }, []);

  const playFootstepForTile = useCallback((tileType: TileType) => {
    const surface = audioManager.getSurfaceFromTile(tileType);
    audioManager.playFootstep(surface);
  }, []);

  const playMusic = useCallback(
    (key: string, options?: { fadeIn?: number; crossfade?: boolean }) => {
      audioManager.playMusic(key, options);
    },
    []
  );

  const stopMusic = useCallback((fadeOutMs?: number) => {
    audioManager.stopMusic(fadeOutMs);
  }, []);

  const playAmbient = useCallback((key: string) => {
    return audioManager.playAmbient(key);
  }, []);

  const stopAmbient = useCallback((key: string, fadeOutMs?: number) => {
    audioManager.stopAmbient(key, fadeOutMs);
  }, []);

  const stopAllAmbients = useCallback((fadeOutMs?: number) => {
    audioManager.stopAllAmbients(fadeOutMs);
  }, []);

  const playUI = useCallback((key: string) => {
    audioManager.playUI(key);
  }, []);

  const stopSound = useCallback((id: string, fadeOutMs?: number) => {
    audioManager.stopSound(id, fadeOutMs);
  }, []);

  const stopCategory = useCallback((category: SoundCategory, fadeOutMs?: number) => {
    audioManager.stopCategory(category, fadeOutMs);
  }, []);

  const stopAll = useCallback((fadeOutMs?: number) => {
    audioManager.stopAll(fadeOutMs);
  }, []);

  const setVolume = useCallback((category: SoundCategory, volume: number) => {
    audioManager.setVolume(category, volume);
  }, []);

  const getVolume = useCallback((category: SoundCategory) => {
    return audioManager.getVolume(category);
  }, []);

  const toggleMute = useCallback(() => {
    return audioManager.toggleMute();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    audioManager.setMuted(muted);
  }, []);

  const isMuted = useCallback(() => {
    return audioManager.isMuted();
  }, []);

  const getSettings = useCallback((): Readonly<AudioSettings> => {
    return audioManager.getSettings();
  }, []);

  const hasSound = useCallback((key: string) => {
    return audioManager.hasSound(key);
  }, []);

  const isReady = useCallback(() => {
    return audioManager.isReady();
  }, []);

  return {
    // Sound playback
    playSfx,
    playFootstep,
    playFootstepForTile,
    playMusic,
    stopMusic,
    playAmbient,
    stopAmbient,
    stopAllAmbients,
    playUI,

    // Sound control
    stopSound,
    stopCategory,
    stopAll,

    // Volume control
    setVolume,
    getVolume,
    toggleMute,
    setMuted,
    isMuted,

    // Utilities
    getSettings,
    hasSound,
    isReady,
  };
}
