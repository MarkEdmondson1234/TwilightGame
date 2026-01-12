/**
 * Magic Burst Effect
 *
 * Versatile particle burst effect for:
 * - Sparkles (gold particles radiating outward)
 * - Heal (green particles rising)
 * - Shrink/Grow (spiral particles)
 * - Teleport (purple swirl)
 * - And more...
 *
 * Configurable via VFX definitions.
 */

import React, { useEffect, useMemo } from 'react';
import { Z_VFX_EFFECTS } from '../../zIndex';
import { getVFXDefinition } from '../../data/vfxConfig';

interface MagicBurstEffectProps {
  /** X position on screen */
  screenX: number;
  /** Y position on screen */
  screenY: number;
  /** VFX type for configuration */
  vfxType: string;
  /** Called when effect completes */
  onComplete: () => void;
}

type BurstPattern = 'radial' | 'spiral_in' | 'spiral_out' | 'rise' | 'swirl';

/**
 * Determine burst pattern based on VFX type
 */
function getBurstPattern(vfxType: string): BurstPattern {
  switch (vfxType) {
    case 'shrink':
      return 'spiral_in';
    case 'grow':
      return 'spiral_out';
    case 'heal':
    case 'life_burst':
      return 'rise';
    case 'teleport':
      return 'swirl';
    default:
      return 'radial';
  }
}

const MagicBurstEffect: React.FC<MagicBurstEffectProps> = ({
  screenX,
  screenY,
  vfxType,
  onComplete,
}) => {
  const definition = getVFXDefinition(vfxType);
  const { colour, secondaryColour, duration, particles: particleCount } = definition;
  const pattern = getBurstPattern(vfxType);
  const numParticles = particleCount || 12;

  // Generate particles based on pattern
  const particles = useMemo(() => {
    return Array.from({ length: numParticles }, (_, i) => {
      const angle = (i / numParticles) * Math.PI * 2;
      const delay = (i / numParticles) * 150;

      // Calculate end position based on pattern
      let endX: number, endY: number;
      const distance = 60 + Math.random() * 40;

      switch (pattern) {
        case 'spiral_in':
          // Start far, spiral inward
          endX = 0;
          endY = 0;
          break;
        case 'spiral_out':
          // Start center, spiral outward
          endX = Math.cos(angle + Math.PI) * distance * 1.5;
          endY = Math.sin(angle + Math.PI) * distance * 1.5;
          break;
        case 'rise':
          // Rise upward with slight spread
          endX = (Math.random() - 0.5) * 60;
          endY = -80 - Math.random() * 40;
          break;
        case 'swirl':
          // Circular swirl pattern
          endX = Math.cos(angle + Math.PI * 2) * distance;
          endY = Math.sin(angle + Math.PI * 2) * distance - 30;
          break;
        default:
          // Radial burst
          endX = Math.cos(angle) * distance;
          endY = Math.sin(angle) * distance;
      }

      return {
        angle,
        delay,
        endX,
        endY,
        startX: pattern === 'spiral_in' ? Math.cos(angle) * distance : 0,
        startY: pattern === 'spiral_in' ? Math.sin(angle) * distance : 0,
        size: 6 + Math.random() * 4,
      };
    });
  }, [numParticles, pattern]);

  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  // Generate unique animation name to avoid conflicts
  const animId = useMemo(() => `burst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div
      style={{
        position: 'fixed',
        left: screenX,
        top: screenY,
        pointerEvents: 'none',
        zIndex: Z_VFX_EFFECTS,
      }}
    >
      {/* Central glow */}
      <div
        style={{
          position: 'absolute',
          left: -40,
          top: -40,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colour}80 0%, ${colour}40 40%, transparent 70%)`,
          animation: `${animId}-pulse ${duration}ms ease-out forwards`,
        }}
      />

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.startX - p.size / 2,
            top: p.startY - p.size / 2,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            backgroundColor: i % 2 === 0 ? colour : secondaryColour || colour,
            boxShadow: `0 0 ${p.size * 2}px ${p.size / 2}px ${colour}`,
            animation: `${animId}-particle-${i} ${duration}ms ease-out forwards`,
            animationDelay: `${p.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      {/* Trail particles for swirl effect */}
      {pattern === 'swirl' &&
        particles.slice(0, 6).map((p, i) => (
          <div
            key={`trail-${i}`}
            style={{
              position: 'absolute',
              left: -2,
              top: -2,
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: secondaryColour || colour,
              boxShadow: `0 0 6px 2px ${colour}`,
              animation: `${animId}-trail-${i} ${duration}ms ease-out forwards`,
              animationDelay: `${p.delay + 50}ms`,
              opacity: 0,
            }}
          />
        ))}

      <style>{`
        @keyframes ${animId}-pulse {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        ${particles
          .map(
            (p, i) => `
          @keyframes ${animId}-particle-${i} {
            0% {
              transform: translate(0, 0) scale(1);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            100% {
              transform: translate(${p.endX}px, ${p.endY}px) scale(0.3);
              opacity: 0;
            }
          }
        `
          )
          .join('\n')}

        ${
          pattern === 'swirl'
            ? particles
                .slice(0, 6)
                .map(
                  (p, i) => `
          @keyframes ${animId}-trail-${i} {
            0% {
              transform: translate(0, 0) rotate(0deg) scale(1);
              opacity: 0;
            }
            20% {
              opacity: 0.8;
            }
            100% {
              transform: translate(${p.endX * 0.7}px, ${p.endY * 0.7}px) rotate(360deg) scale(0);
              opacity: 0;
            }
          }
        `
                )
                .join('\n')
            : ''
        }
      `}</style>
    </div>
  );
};

export default MagicBurstEffect;
