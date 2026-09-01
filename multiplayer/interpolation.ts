/**
 * Remote player interpolation — pure functions, no Firebase, no globals.
 *
 * Presence arrives at ~5 Hz. Rendering at that rate looks like a slideshow, and
 * extrapolating forward makes players rubber-band when they stop. Instead we
 * render every remote player `INTERPOLATION_DELAY_MS` in the *past*, which
 * guarantees we almost always have a sample on both sides of the render time
 * and can simply lerp between them. 120 ms of deliberate lag is imperceptible
 * on somebody else's character.
 *
 * Everything here is deliberately dependency-free so it can be unit-tested
 * without a network, a clock, or a Pixi context — see
 * tests/remotePlayerInterpolation.test.ts.
 */

import type { Position, Direction } from '../types';
import type { PresenceSample } from './types';

export interface InterpolationConfig {
  /** Beyond this gap between two samples, snap rather than lerp */
  snapDistanceTiles: number;
  /** Max samples to retain per player */
  bufferSize: number;
}

export interface InterpolationResult {
  position: Position;
  direction: Direction;
  /** Tiles per second between the bracketing samples; 0 when holding or snapping */
  speed: number;
  /** True when the render time fell between two real samples */
  interpolated: boolean;
}

/**
 * Append a sample, keeping the buffer sorted by receipt time and bounded.
 * Returns a new array — callers hold the result, so buffers are never aliased.
 *
 * Out-of-order arrivals are inserted in place rather than dropped: RTDB
 * delivers in order in practice, but a reordered pair would otherwise make a
 * player jump backwards for one frame.
 */
export function pushSample(
  buffer: readonly PresenceSample[],
  sample: PresenceSample,
  bufferSize: number
): PresenceSample[] {
  const next = [...buffer];
  let i = next.length;
  while (i > 0 && next[i - 1].receivedAt > sample.receivedAt) i--;
  next.splice(i, 0, sample);
  return next.length > bufferSize ? next.slice(next.length - bufferSize) : next;
}

function distance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Resolve a remote player's position at `renderTimeMs` (a local clock value,
 * normally `Date.now() - INTERPOLATION_DELAY_MS`).
 *
 * Returns null only for an empty buffer — a player we have heard nothing from
 * yet, who should not be rendered.
 */
export function interpolateAt(
  buffer: readonly PresenceSample[],
  renderTimeMs: number,
  config: InterpolationConfig
): InterpolationResult | null {
  if (buffer.length === 0) return null;

  const first = buffer[0];
  const last = buffer[buffer.length - 1];

  // Render time is older than anything we have (just joined): hold the oldest.
  if (renderTimeMs <= first.receivedAt) {
    return { position: first.position, direction: first.direction, speed: 0, interpolated: false };
  }

  // Render time has run past the newest sample: they stopped sending, either
  // because they stopped moving or because they are gone. Hold, don't guess.
  if (renderTimeMs >= last.receivedAt) {
    return { position: last.position, direction: last.direction, speed: 0, interpolated: false };
  }

  // Find the bracketing pair.
  let a = first;
  let b = last;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i].receivedAt <= renderTimeMs && renderTimeMs <= buffer[i + 1].receivedAt) {
      a = buffer[i];
      b = buffer[i + 1];
      break;
    }
  }

  const gap = distance(a.position, b.position);

  // A jump this large is a teleport or a map transition, not walking. Snap to
  // the destination rather than sliding the character across the map.
  if (gap > config.snapDistanceTiles) {
    return { position: b.position, direction: b.direction, speed: 0, interpolated: false };
  }

  const span = b.receivedAt - a.receivedAt;
  if (span <= 0) {
    return { position: b.position, direction: b.direction, speed: 0, interpolated: false };
  }

  const t = (renderTimeMs - a.receivedAt) / span;
  return {
    position: {
      x: a.position.x + (b.position.x - a.position.x) * t,
      y: a.position.y + (b.position.y - a.position.y) * t,
    },
    // The newer sample carries the player's current intent.
    direction: b.direction,
    speed: gap / (span / 1000),
    interpolated: true,
  };
}
