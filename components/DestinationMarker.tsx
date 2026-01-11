/**
 * Destination Marker for Click-to-Move
 *
 * Displays a soft pulsing indicator at the click-to-move destination.
 * Uses cottage-core styling with gentle animation.
 */

import { Position } from '../types';
import { TILE_SIZE } from '../constants';
import { Z_DESTINATION_MARKER, zStyle } from '../zIndex';

interface DestinationMarkerProps {
  /** Destination position in tile coordinates */
  position: Position;
  /** Camera X offset in pixels */
  cameraX: number;
  /** Camera Y offset in pixels */
  cameraY: number;
  /** Whether this is targeting an NPC (different styling) */
  isNPCTarget?: boolean;
}

export function DestinationMarker({
  position,
  cameraX,
  cameraY,
  isNPCTarget = false,
}: DestinationMarkerProps) {
  // Convert tile position to screen position
  const screenX = position.x * TILE_SIZE - cameraX;
  const screenY = position.y * TILE_SIZE - cameraY;

  // Marker size (slightly smaller than a tile)
  const size = TILE_SIZE * 0.5;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: screenX - size / 2,
        top: screenY - size / 2,
        width: size,
        height: size,
        ...zStyle(Z_DESTINATION_MARKER),
      }}
    >
      {/* Outer ring - gentle pulse */}
      <div
        className={`absolute inset-0 rounded-full animate-destination-pulse ${
          isNPCTarget
            ? 'bg-amber-300/40 border-2 border-amber-400/60'
            : 'bg-emerald-300/40 border-2 border-emerald-400/60'
        }`}
      />
      {/* Inner dot */}
      <div
        className={`absolute rounded-full ${isNPCTarget ? 'bg-amber-400/80' : 'bg-emerald-400/80'}`}
        style={{
          left: '50%',
          top: '50%',
          width: size * 0.3,
          height: size * 0.3,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}
