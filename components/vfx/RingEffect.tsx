/**
 * Ring Effect
 *
 * Expanding wave rings with sparkles - used for water/sea magic effects.
 * Different visual style from burst (which uses radial particles).
 */

import React, { useEffect, useMemo } from 'react';
import { Z_VFX_EFFECTS } from '../../zIndex';
import { getVFXDefinition } from '../../data/vfxConfig';

interface RingEffectProps {
  screenX: number;
  screenY: number;
  vfxType: string;
  onComplete: () => void;
}

const RingEffect: React.FC<RingEffectProps> = ({ screenX, screenY, vfxType, onComplete }) => {
  const definition = getVFXDefinition(vfxType);
  const { colour, secondaryColour, duration } = definition;

  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const animId = useMemo(() => `ring-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  // Three expanding rings with staggered timing
  const rings = [
    { delay: 0, thickness: 4 },
    { delay: 120, thickness: 3 },
    { delay: 240, thickness: 2 },
  ];

  // Sparkles in a pattern
  const sparkles = [
    { x: 0, y: -18, delay: 0 },
    { x: 15, y: -9, delay: 60 },
    { x: 15, y: 9, delay: 120 },
    { x: 0, y: 18, delay: 180 },
    { x: -15, y: 9, delay: 120 },
    { x: -15, y: -9, delay: 60 },
    { x: 0, y: 0, delay: 90 },
  ];

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
      {/* Expanding rings */}
      {rings.map((ring, i) => (
        <div
          key={`ring-${i}`}
          style={{
            position: 'absolute',
            left: -30,
            top: -30,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: `${ring.thickness}px solid ${colour}`,
            boxShadow: `0 0 8px 2px ${colour}60`,
            animation: `${animId}-expand ${duration}ms ease-out forwards`,
            animationDelay: `${ring.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      {/* Center glow */}
      <div
        style={{
          position: 'absolute',
          left: -15,
          top: -15,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colour}80 0%, ${secondaryColour || colour}40 50%, transparent 70%)`,
          animation: `${animId}-glow ${duration}ms ease-out forwards`,
        }}
      />

      {/* Sparkles */}
      {sparkles.map((sparkle, i) => (
        <div
          key={`sparkle-${i}`}
          style={{
            position: 'absolute',
            left: sparkle.x - 4,
            top: sparkle.y - 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: secondaryColour || colour,
            boxShadow: `0 0 6px 3px ${colour}80`,
            animation: `${animId}-sparkle ${duration}ms ease-out forwards`,
            animationDelay: `${sparkle.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      <style>{`
        @keyframes ${animId}-expand {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        @keyframes ${animId}-glow {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          30% {
            transform: scale(1.5);
            opacity: 1;
          }
          100% {
            transform: scale(0.5);
            opacity: 0;
          }
        }

        @keyframes ${animId}-sparkle {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          30% {
            transform: scale(1.3);
            opacity: 1;
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default RingEffect;
