/**
 * StaminaBar - Visual stamina indicator that appears above the player
 *
 * Shows:
 * - Green bar when stamina is normal
 * - Pulsing red bar when stamina is low (under 25%)
 *
 * Visibility:
 * - Always visible when stamina is low (under 25%)
 * - Visible on hover when stamina is above threshold
 *
 * Subscribes to EventBus STAMINA_CHANGED events for reactivity.
 */

import { useState, useEffect } from 'react';
import { TILE_SIZE, STAMINA } from '../constants';
import { gameState } from '../GameState';
import { eventBus, GameEvent } from '../utils/EventBus';
import { Z_HUD } from '../zIndex';

interface StaminaBarProps {
  playerX: number; // Player world X position (in tiles)
  playerY: number; // Player world Y position (in tiles)
  cameraX: number; // Camera X offset (in pixels)
  cameraY: number; // Camera Y offset (in pixels)
  lowThreshold?: number; // Percentage below which bar is always shown (default 25)
}

export function StaminaBar({
  playerX,
  playerY,
  cameraX,
  cameraY,
  lowThreshold = 25,
}: StaminaBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [current, setCurrent] = useState(() => gameState.getStamina());
  const max = STAMINA.MAX;

  // Subscribe to stamina changes via EventBus
  useEffect(() => {
    return eventBus.on(GameEvent.STAMINA_CHANGED, (payload) => {
      setCurrent(payload.value);
    });
  }, []);

  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isLow = percentage <= lowThreshold;

  // Calculate screen position (centered above player head)
  const screenX = playerX * TILE_SIZE - cameraX;
  const screenY = playerY * TILE_SIZE - cameraY - 20; // 20px above player

  // Only show if: hovered, low stamina, or always (for debugging)
  const shouldShow = isHovered || isLow;

  // Create hover area (larger than the bar for easier interaction)
  const hoverAreaStyle: React.CSSProperties = {
    position: 'absolute',
    left: screenX - 8, // Slightly wider than bar
    top: screenY - 10, // Slightly taller than bar
    width: 80, // 64 + 16 padding
    height: 24, // 8 + 16 padding
    cursor: 'pointer',
    zIndex: Z_HUD, // Above player, below weather
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: screenX,
    top: screenY,
    width: 64, // 1 tile wide
    height: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.8)', // slate-800 with transparency
    borderRadius: 4,
    border: '1px solid rgba(71, 85, 105, 0.8)', // slate-600
    overflow: 'hidden',
    transition: 'opacity 0.2s ease',
    opacity: shouldShow ? 1 : 0,
    pointerEvents: 'none', // Let hover area handle events
    zIndex: Z_HUD,
  };

  const fillStyle: React.CSSProperties = {
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: isLow ? '#ef4444' : '#22c55e', // red-500 or green-500
    borderRadius: 3,
    transition: 'width 0.3s ease, background-color 0.3s ease',
    animation: isLow ? 'pulse 1s ease-in-out infinite' : 'none',
  };

  return (
    <>
      {/* Invisible hover area */}
      <div
        style={hoverAreaStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Visible stamina bar */}
      <div style={containerStyle}>
        <div style={fillStyle} />
      </div>
      {/* Pulse animation styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </>
  );
}
