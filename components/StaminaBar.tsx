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
import { TILE_SIZE, STAMINA, PLAYER_SIZE } from '../constants';
import { gameState } from '../GameState';
import { eventBus, GameEvent } from '../utils/EventBus';
import { Z_HUD } from '../zIndex';
import type { Position } from '../types';

interface StaminaBarProps {
  playerX: number; // Player world X position (in tiles)
  playerY: number; // Player world Y position (in tiles)
  gridOffset?: Position; // Offset for background-image rooms with centred layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
  characterScale?: number; // Map's characterScale multiplier (e.g. 1.8 in home_upstairs) — the
  // player sprite is drawn at PLAYER_SIZE * characterScale, so "above head" must scale with it
  lowThreshold?: number; // Percentage below which bar is always shown (default 25)
  forceShow?: boolean; // Always show the bar regardless of stamina level (e.g. while resting in bed)
}

export function StaminaBar({
  playerX,
  playerY,
  gridOffset,
  tileSize = TILE_SIZE,
  characterScale = 1.0,
  lowThreshold = 25,
  forceShow = false,
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

  // Calculate screen position (centred above player head). playerX/Y are converted with
  // gridOffset/tileSize rather than a camera offset because this renders inside the same
  // "Hybrid Layer" container as the player sprite (see App.tsx) — that container itself
  // applies the camera translate for tiled rooms, so children only need to add the
  // background-image room's gridOffset (undefined/0 for tiled rooms, where tileSize is
  // just TILE_SIZE too).
  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;
  const BAR_WIDTH = 64;
  const BAR_HEIGHT = 8;
  const HALF_PLAYER_PX = Math.round((PLAYER_SIZE * characterScale * tileSize) / 2);
  // Clearance above the sprite's own bounding box before the bar starts. Scales with
  // characterScale like HALF_PLAYER_PX above it — tuned at 105px for home_upstairs's 1.8x
  // characterScale, so the base (exterior, characterScale 1.0) value is 105 / 1.8.
  const HEAD_GAP_BASE = 58;
  const HEAD_GAP = HEAD_GAP_BASE * characterScale;
  const screenX = playerX * tileSize + offsetX - BAR_WIDTH / 2 - 11;   // centred on player
  const screenY = playerY * tileSize + offsetY - HALF_PLAYER_PX - BAR_HEIGHT - HEAD_GAP;

  const shouldShow = isHovered || isLow || forceShow;

  // Create hover area (larger than the bar for easier interaction)
  const hoverAreaStyle: React.CSSProperties = {
    position: 'absolute',
    left: screenX - 8, // Slightly wider than bar
    top: screenY - 10, // Slightly taller than bar
    width: BAR_WIDTH + 16,
    height: BAR_HEIGHT + 16,
    cursor: 'pointer',
    zIndex: Z_HUD, // Above player, below weather
    pointerEvents: 'auto', // Re-enable events: the parent layer sets pointer-events: none
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: screenX,
    top: screenY,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
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
