import React, { useEffect, useState } from 'react';
import { Z_FARM_ACTIONS } from '../zIndex';
import GameIcon from './GameIcon';

export type FarmActionType = 'till' | 'plant' | 'water' | 'harvest' | 'clear';

interface FarmActionAnimationProps {
  playerX: number;
  playerY: number;
  action: FarmActionType | null;
  onComplete: () => void;
}

/**
 * Displays an animated icon above the player when they perform a farm action
 * Icon floats up and fades away over 1 second
 */
const FarmActionAnimation: React.FC<FarmActionAnimationProps> = ({
  playerX,
  playerY,
  action,
  onComplete,
}) => {
  // Call onComplete after animation finishes (1s)
  useEffect(() => {
    console.log(
      '[FarmActionAnimation] Mounted with action:',
      action,
      'at position:',
      playerX,
      playerY
    );
    const timer = setTimeout(() => {
      console.log('[FarmActionAnimation] Animation complete, calling onComplete');
      onComplete();
    }, 1000);
    return () => {
      console.log('[FarmActionAnimation] Unmounting');
      clearTimeout(timer);
    };
  }, [onComplete]);

  if (!action) return null;

  // Map action types to emoji icons
  const getIcon = (actionType: FarmActionType): string => {
    switch (actionType) {
      case 'till':
        return '⛏️'; // Pickaxe for tilling
      case 'plant':
        return '🌱'; // Seedling for planting
      case 'water':
        return '💧'; // Water droplet for watering
      case 'harvest':
        return '✨'; // Sparkles for harvesting
      case 'clear':
        return '🧹'; // Broom for clearing dead crops
      default:
        return '✓'; // Checkmark fallback
    }
  };

  const icon = getIcon(action);

  return (
    <div
      className="farm-action-animation"
      style={{
        position: 'absolute',
        left: playerX,
        top: playerY - 40, // Start 40px above player
        pointerEvents: 'none',
        zIndex: Z_FARM_ACTIONS,
        animation: 'farmActionFloat 1s ease-out forwards',
        filter: 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5))',
      }}
    >
      <GameIcon icon={icon} size={32} />
    </div>
  );
};

export default FarmActionAnimation;
