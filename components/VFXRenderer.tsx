/**
 * VFX Renderer
 *
 * Orchestrates all visual effects based on active VFX state.
 * Routes VFX types to appropriate effect components.
 */

import React from 'react';
import { TILE_SIZE } from '../constants';
import { getVFXDefinition } from '../data/vfxConfig';
import { ActiveVFX } from '../hooks/useVFX';
import LightningBoltEffect from './vfx/LightningBoltEffect';
import SmokePuffEffect from './vfx/SmokePuffEffect';
import MagicBurstEffect from './vfx/MagicBurstEffect';
import HeartsEffect from './vfx/HeartsEffect';
import AuraEffect from './vfx/AuraEffect';
import RingEffect from './vfx/RingEffect';

interface VFXRendererProps {
  /** Array of active effects to render */
  activeEffects: ActiveVFX[];
  /** Camera X position for world-to-screen conversion */
  cameraX: number;
  /** Camera Y position for world-to-screen conversion */
  cameraY: number;
  /** Callback when an effect completes */
  onEffectComplete: (id: string) => void;
}

/**
 * Convert world position to screen position
 */
function worldToScreen(
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number
): { screenX: number; screenY: number } {
  return {
    screenX: worldX * TILE_SIZE - cameraX + TILE_SIZE / 2,
    screenY: worldY * TILE_SIZE - cameraY + TILE_SIZE / 2,
  };
}

const VFXRenderer: React.FC<VFXRendererProps> = ({
  activeEffects,
  cameraX,
  cameraY,
  onEffectComplete,
}) => {
  if (activeEffects.length === 0) return null;

  return (
    <>
      {activeEffects.map((effect) => {
        const { screenX, screenY } = worldToScreen(
          effect.position.x,
          effect.position.y,
          cameraX,
          cameraY
        );

        const definition = getVFXDefinition(effect.vfxType);
        const handleComplete = () => onEffectComplete(effect.id);

        // Route to appropriate component based on category
        switch (definition.category) {
          case 'lightning':
            return (
              <LightningBoltEffect
                key={effect.id}
                strikeX={screenX}
                strikeY={screenY}
                onComplete={handleComplete}
              />
            );

          case 'float':
            return (
              <HeartsEffect
                key={effect.id}
                screenX={screenX}
                screenY={screenY}
                vfxType={effect.vfxType}
                onComplete={handleComplete}
              />
            );

          case 'overlay':
            // Smoke puff and overlay effects
            return (
              <SmokePuffEffect
                key={effect.id}
                screenX={screenX}
                screenY={screenY}
                vfxType={effect.vfxType}
                onComplete={handleComplete}
              />
            );

          case 'aura':
            // Aura effects - pulsing rings and glows
            return (
              <AuraEffect
                key={effect.id}
                screenX={screenX}
                screenY={screenY}
                vfxType={effect.vfxType}
                onComplete={handleComplete}
              />
            );

          case 'ring':
            // Ring effects - expanding waves (water/sea magic)
            return (
              <RingEffect
                key={effect.id}
                screenX={screenX}
                screenY={screenY}
                vfxType={effect.vfxType}
                onComplete={handleComplete}
              />
            );

          case 'burst':
          default:
            // Default to burst effect
            return (
              <MagicBurstEffect
                key={effect.id}
                screenX={screenX}
                screenY={screenY}
                vfxType={effect.vfxType}
                onComplete={handleComplete}
              />
            );
        }
      })}
    </>
  );
};

export default VFXRenderer;
