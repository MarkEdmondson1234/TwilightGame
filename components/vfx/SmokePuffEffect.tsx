/**
 * Smoke Puff Effect
 *
 * Magical smoke puff with:
 * - Multiple overlapping smoke circles
 * - Expand and rise animation
 * - Sparkle overlay
 * - Customisable colour
 */

import React, { useEffect, useMemo } from 'react';
import { Z_VFX_EFFECTS } from '../../zIndex';
import { getVFXDefinition } from '../../data/vfxConfig';

interface SmokePuffEffectProps {
  /** X position on screen */
  screenX: number;
  /** Y position on screen */
  screenY: number;
  /** VFX type for colour (defaults to smoke_puff) */
  vfxType?: string;
  /** Called when effect completes */
  onComplete: () => void;
}

const DURATION = 1000;

const SmokePuffEffect: React.FC<SmokePuffEffectProps> = ({
  screenX,
  screenY,
  vfxType = 'smoke_puff',
  onComplete,
}) => {
  const definition = getVFXDefinition(vfxType);
  const colour = definition.colour;
  const secondaryColour = definition.secondaryColour || colour;

  // Generate smoke puff positions
  const puffs = useMemo(
    () => [
      { x: 0, y: 0, size: 70, delay: 0 },
      { x: -25, y: -10, size: 50, delay: 80 },
      { x: 25, y: -15, size: 55, delay: 120 },
      { x: -15, y: 15, size: 45, delay: 160 },
      { x: 20, y: 10, size: 48, delay: 200 },
    ],
    []
  );

  // Generate sparkle positions
  const sparkles = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
        delay: Math.random() * 300,
        size: 3 + Math.random() * 4,
      })),
    []
  );

  useEffect(() => {
    const timer = setTimeout(onComplete, DURATION);
    return () => clearTimeout(timer);
  }, [onComplete]);

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
      {/* Smoke puffs */}
      {puffs.map((puff, i) => (
        <div
          key={`puff-${i}`}
          style={{
            position: 'absolute',
            left: puff.x - puff.size / 2,
            top: puff.y - puff.size / 2,
            width: puff.size,
            height: puff.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colour}90 0%, ${secondaryColour}40 50%, transparent 70%)`,
            animation: `smokePuff ${DURATION}ms ease-out forwards`,
            animationDelay: `${puff.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      {/* Magic sparkles */}
      {sparkles.map((sparkle, i) => (
        <div
          key={`sparkle-${i}`}
          style={{
            position: 'absolute',
            left: sparkle.x - sparkle.size / 2,
            top: sparkle.y - sparkle.size / 2,
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: secondaryColour,
            borderRadius: '50%',
            boxShadow: `0 0 8px 3px ${colour}80`,
            animation: `magicSparkle ${DURATION}ms ease-out forwards`,
            animationDelay: `${sparkle.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      <style>{`
        @keyframes smokePuff {
          0% {
            transform: scale(0.2) translateY(0);
            opacity: 0;
          }
          20% {
            opacity: 0.9;
          }
          100% {
            transform: scale(2.5) translateY(-50px);
            opacity: 0;
          }
        }

        @keyframes magicSparkle {
          0% {
            transform: scale(0) translateY(0);
            opacity: 0;
          }
          15% {
            transform: scale(1.5);
            opacity: 1;
          }
          100% {
            transform: scale(0) translateY(-80px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SmokePuffEffect;
