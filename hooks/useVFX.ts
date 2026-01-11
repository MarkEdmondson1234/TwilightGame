/**
 * VFX Hook
 *
 * Manages visual effect state for potions and magic.
 * Provides triggerVFX callback for MagicEffects system.
 */

import { useState, useCallback, useRef } from 'react';
import { Position } from '../types';
import { getVFXDefinition } from '../data/vfxConfig';

export interface ActiveVFX {
  id: string;
  vfxType: string;
  position: Position;
  startTime: number;
  duration: number;
}

export interface UseVFXReturn {
  activeEffects: ActiveVFX[];
  triggerVFX: (vfxType: string, position?: Position) => void;
  removeEffect: (id: string) => void;
  clearAllEffects: () => void;
}

/**
 * Hook for managing VFX state
 *
 * @param defaultPosition - Default position for effects (usually player position)
 */
export function useVFX(defaultPosition?: Position): UseVFXReturn {
  const [activeEffects, setActiveEffects] = useState<ActiveVFX[]>([]);
  const effectIdCounter = useRef(0);

  /**
   * Trigger a visual effect at a position
   */
  const triggerVFX = useCallback(
    (vfxType: string, position?: Position) => {
      const definition = getVFXDefinition(vfxType);

      const effectId = `vfx-${vfxType}-${Date.now()}-${effectIdCounter.current++}`;

      const effect: ActiveVFX = {
        id: effectId,
        vfxType,
        position: position || defaultPosition || { x: 0, y: 0 },
        startTime: Date.now(),
        duration: definition.duration,
      };

      console.log(`[VFX] Triggering ${vfxType} at`, effect.position);
      setActiveEffects((prev) => [...prev, effect]);

      // Auto-remove after duration (with small buffer for fade-out)
      setTimeout(() => {
        setActiveEffects((prev) => prev.filter((e) => e.id !== effectId));
      }, definition.duration + 100);
    },
    [defaultPosition]
  );

  /**
   * Manually remove an effect by ID
   */
  const removeEffect = useCallback((id: string) => {
    setActiveEffects((prev) => prev.filter((e) => e.id !== id));
  }, []);

  /**
   * Clear all active effects
   */
  const clearAllEffects = useCallback(() => {
    setActiveEffects([]);
  }, []);

  return {
    activeEffects,
    triggerVFX,
    removeEffect,
    clearAllEffects,
  };
}
