import React, { useEffect } from 'react';
import { TILE_SIZE } from '../constants';

interface WaterSparkleEffectProps {
  /** Tile X position (in tile units) */
  tileX: number;
  /** Tile Y position (in tile units) */
  tileY: number;
  /** Camera X offset */
  cameraX: number;
  /** Camera Y offset */
  cameraY: number;
  /** Called when animation completes */
  onComplete: () => void;
}

/**
 * Water sparkle effect that appears on the soil tile when watering
 * Shows multiple small sparkle dots that fade in and out
 */
const WaterSparkleEffect: React.FC<WaterSparkleEffectProps> = ({
  tileX,
  tileY,
  cameraX,
  cameraY,
  onComplete,
}) => {
  // Animation duration in ms
  const DURATION = 600;

  // Call onComplete after animation finishes
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, DURATION);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Calculate screen position (center of tile)
  const screenX = tileX * TILE_SIZE - cameraX + TILE_SIZE / 2;
  const screenY = tileY * TILE_SIZE - cameraY + TILE_SIZE / 2;

  // Generate sparkle positions (6 sparkles in a circle pattern)
  const sparkles = [
    { x: 0, y: -12, delay: 0 },
    { x: 10, y: -6, delay: 50 },
    { x: 10, y: 6, delay: 100 },
    { x: 0, y: 12, delay: 150 },
    { x: -10, y: 6, delay: 100 },
    { x: -10, y: -6, delay: 50 },
    { x: 0, y: 0, delay: 75 }, // Center sparkle
  ];

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        pointerEvents: 'none',
        zIndex: 150, // Above tiles, below player
      }}
    >
      {sparkles.map((sparkle, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: sparkle.x,
            top: sparkle.y,
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: '#87CEEB', // Light blue
            boxShadow: '0 0 4px 2px rgba(135, 206, 235, 0.8)',
            animation: `waterSparkle ${DURATION}ms ease-out forwards`,
            animationDelay: `${sparkle.delay}ms`,
            opacity: 0,
          }}
        />
      ))}
      <style>{`
        @keyframes waterSparkle {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(0.3);
          }
        }
      `}</style>
    </div>
  );
};

export default WaterSparkleEffect;
