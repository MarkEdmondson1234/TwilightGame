/**
 * Hearts Effect
 *
 * Floating heart emojis for friendship/love effects:
 * - Pink hearts float upward
 * - Gentle sine-wave sway
 * - Fade out as they rise
 */

import React, { useEffect, useMemo } from 'react';
import { Z_VFX_EFFECTS } from '../../zIndex';
import { getVFXDefinition } from '../../data/vfxConfig';

interface HeartsEffectProps {
  /** X position on screen */
  screenX: number;
  /** Y position on screen */
  screenY: number;
  /** VFX type for configuration */
  vfxType?: string;
  /** Called when effect completes */
  onComplete: () => void;
}

const HeartsEffect: React.FC<HeartsEffectProps> = ({
  screenX,
  screenY,
  vfxType = 'hearts',
  onComplete,
}) => {
  const definition = getVFXDefinition(vfxType);
  const { duration, particles: particleCount, emoji } = definition;
  const numHearts = particleCount || 8;
  const heartEmoji = emoji || '💕';

  // Generate heart positions
  const hearts = useMemo(() => {
    return Array.from({ length: numHearts }, (_, i) => ({
      x: (Math.random() - 0.5) * 80,
      y: Math.random() * 20,
      delay: i * 120,
      size: 16 + Math.random() * 12,
      swayAmount: 15 + Math.random() * 20,
      swaySpeed: 1 + Math.random() * 0.5,
    }));
  }, [numHearts]);

  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  // Generate unique animation ID
  const animId = useMemo(
    () => `hearts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

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
      {/* Soft glow behind hearts */}
      <div
        style={{
          position: 'absolute',
          left: -30,
          top: -30,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 105, 180, 0.4) 0%, transparent 70%)',
          animation: `${animId}-glow ${duration}ms ease-out forwards`,
        }}
      />

      {/* Floating hearts */}
      {hearts.map((heart, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: heart.x - heart.size / 2,
            top: heart.y - heart.size / 2,
            fontSize: heart.size,
            animation: `${animId}-float-${i} ${duration}ms ease-out forwards`,
            animationDelay: `${heart.delay}ms`,
            opacity: 0,
            filter: 'drop-shadow(0 0 4px rgba(255, 105, 180, 0.8))',
          }}
        >
          {heartEmoji}
        </div>
      ))}

      <style>{`
        @keyframes ${animId}-glow {
          0% { transform: scale(0.5); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }

        ${hearts
          .map(
            (heart, i) => `
          @keyframes ${animId}-float-${i} {
            0% {
              transform: translateY(0) translateX(0) scale(0.5);
              opacity: 0;
            }
            15% {
              opacity: 1;
              transform: translateY(-15px) translateX(${heart.swayAmount * 0.3}px) scale(1);
            }
            50% {
              transform: translateY(-60px) translateX(${-heart.swayAmount * 0.5}px) scale(1.1);
            }
            100% {
              transform: translateY(-120px) translateX(${heart.swayAmount * 0.2}px) scale(0.8);
              opacity: 0;
            }
          }
        `
          )
          .join('\n')}
      `}</style>
    </div>
  );
};

export default HeartsEffect;
