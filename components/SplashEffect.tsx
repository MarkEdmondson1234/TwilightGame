import React, { useEffect } from 'react';
import { TILE_SIZE } from '../constants';

interface SplashEffectProps {
  /** Player screen X position */
  screenX: number;
  /** Player screen Y position */
  screenY: number;
  /** Called when animation completes */
  onComplete: () => void;
}

/**
 * Water splash effect that appears when refilling the watering can
 * Shows expanding water rings and droplets around the player
 */
const SplashEffect: React.FC<SplashEffectProps> = ({
  screenX,
  screenY,
  onComplete,
}) => {
  // Animation duration in ms
  const DURATION = 500;

  // Call onComplete after animation finishes
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, DURATION);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Center position (offset to center on player's feet area)
  const centerX = screenX + TILE_SIZE / 2;
  const centerY = screenY + TILE_SIZE * 0.7;

  // Water droplets in a circular pattern
  const droplets = [
    { x: 0, y: -20, delay: 0 },
    { x: 17, y: -10, delay: 50 },
    { x: 17, y: 10, delay: 100 },
    { x: 0, y: 20, delay: 150 },
    { x: -17, y: 10, delay: 100 },
    { x: -17, y: -10, delay: 50 },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        left: centerX,
        top: centerY,
        pointerEvents: 'none',
        zIndex: 150,
      }}
    >
      {/* Expanding ring */}
      <div
        style={{
          position: 'absolute',
          left: -25,
          top: -25,
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '3px solid rgba(56, 189, 248, 0.8)',
          animation: `splashRing ${DURATION}ms ease-out forwards`,
        }}
      />

      {/* Second ring with delay */}
      <div
        style={{
          position: 'absolute',
          left: -25,
          top: -25,
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '2px solid rgba(56, 189, 248, 0.6)',
          animation: `splashRing ${DURATION}ms ease-out 100ms forwards`,
          opacity: 0,
        }}
      />

      {/* Water droplets */}
      {droplets.map((droplet, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: droplet.x,
            top: droplet.y,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#38bdf8',
            boxShadow: '0 0 6px 2px rgba(56, 189, 248, 0.6)',
            animation: `splashDroplet ${DURATION}ms ease-out forwards`,
            animationDelay: `${droplet.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      <style>{`
        @keyframes splashRing {
          0% {
            transform: scale(0.3);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes splashDroplet {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(0);
          }
          30% {
            opacity: 1;
            transform: scale(1.2) translateY(-8px);
          }
          100% {
            opacity: 0;
            transform: scale(0.3) translateY(5px);
          }
        }
      `}</style>
    </div>
  );
};

export default SplashEffect;
