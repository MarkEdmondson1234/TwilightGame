/**
 * Aura Effect
 *
 * Distinct from burst - uses pulsing concentric rings
 * that emanate outward like ripples, not radial particle explosions.
 */

import React, { useEffect, useMemo } from 'react';
import { Z_VFX_EFFECTS } from '../../zIndex';
import { getVFXDefinition } from '../../data/vfxConfig';

interface AuraEffectProps {
  screenX: number;
  screenY: number;
  vfxType: string;
  onComplete: () => void;
}

const AuraEffect: React.FC<AuraEffectProps> = ({ screenX, screenY, vfxType, onComplete }) => {
  const definition = getVFXDefinition(vfxType);
  const { colour, secondaryColour, duration } = definition;

  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  const animId = useMemo(() => `aura-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, []);

  // Different ring configurations based on type
  const isShield = vfxType === 'shield';
  const isDark = vfxType === 'dark_aura';

  // Pulsing rings that expand outward
  const rings = [
    { delay: 0, size: 40 },
    { delay: 150, size: 60 },
    { delay: 300, size: 80 },
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
      {/* Pulsing rings */}
      {rings.map((ring, i) => (
        <div
          key={`ring-${i}`}
          style={{
            position: 'absolute',
            left: -ring.size / 2,
            top: -ring.size / 2,
            width: ring.size,
            height: ring.size,
            borderRadius: isShield ? '10%' : '50%',
            border: `3px solid ${colour}`,
            boxShadow: `0 0 12px 4px ${colour}80, inset 0 0 8px 2px ${colour}40`,
            animation: `${animId}-ring ${duration}ms ease-out forwards`,
            animationDelay: `${ring.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      {/* Inner glow core */}
      <div
        style={{
          position: 'absolute',
          left: -20,
          top: -20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: isDark
            ? `radial-gradient(circle, ${colour}60 0%, ${secondaryColour || colour}30 50%, transparent 70%)`
            : `radial-gradient(circle, ${secondaryColour || colour}80 0%, ${colour}40 50%, transparent 70%)`,
          animation: `${animId}-core ${duration}ms ease-in-out forwards`,
        }}
      />

      {/* Floating energy wisps (only for dark_aura) */}
      {isDark &&
        Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const x = Math.cos(angle) * 35;
          const y = Math.sin(angle) * 35;
          return (
            <div
              key={`wisp-${i}`}
              style={{
                position: 'absolute',
                left: x - 4,
                top: y - 4,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: secondaryColour || colour,
                boxShadow: `0 0 8px 3px ${colour}`,
                animation: `${animId}-wisp ${duration}ms ease-in-out forwards`,
                animationDelay: `${i * 80}ms`,
                opacity: 0,
              }}
            />
          );
        })}

      {/* Shield hexagon pattern (only for shield) */}
      {isShield && (
        <svg
          style={{
            position: 'absolute',
            left: -50,
            top: -50,
            width: 100,
            height: 100,
            animation: `${animId}-shield ${duration}ms ease-out forwards`,
            opacity: 0,
          }}
          viewBox="0 0 100 100"
        >
          <defs>
            <filter id={`${animId}-glow`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Hexagonal grid pattern */}
          <polygon
            points="50,10 85,30 85,70 50,90 15,70 15,30"
            fill="none"
            stroke={colour}
            strokeWidth="2"
            filter={`url(#${animId}-glow)`}
          />
          <polygon
            points="50,20 75,35 75,65 50,80 25,65 25,35"
            fill={`${colour}20`}
            stroke={secondaryColour || colour}
            strokeWidth="1"
          />
        </svg>
      )}

      <style>{`
        @keyframes ${animId}-ring {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes ${animId}-core {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          30% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0;
          }
        }

        @keyframes ${animId}-wisp {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
          }
          30% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(0, -20px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes ${animId}-shield {
          0% {
            transform: scale(0.3) rotate(0deg);
            opacity: 0;
          }
          30% {
            transform: scale(1) rotate(30deg);
            opacity: 1;
          }
          100% {
            transform: scale(1.3) rotate(60deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AuraEffect;
