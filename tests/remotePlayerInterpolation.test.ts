/**
 * @vitest-environment node
 *
 * Remote players are rendered 120ms in the past and lerped between the two
 * presence samples that bracket that time. Getting this wrong is the difference
 * between other players gliding and other players teleporting once a second, so
 * the maths lives in a pure module and is pinned here.
 */
import { describe, it, expect } from 'vitest';
import { interpolateAt, pushSample } from '../multiplayer/interpolation';
import type { PresenceSample } from '../multiplayer/types';
import { Direction } from '../types';

const CONFIG = { snapDistanceTiles: 3, bufferSize: 4 };

function sample(x: number, y: number, receivedAt: number, direction = Direction.Down) {
  return { position: { x, y }, direction, receivedAt } satisfies PresenceSample;
}

describe('pushSample', () => {
  it('keeps the buffer bounded to bufferSize, dropping the oldest', () => {
    let buffer: PresenceSample[] = [];
    for (let i = 0; i < 10; i++) {
      buffer = pushSample(buffer, sample(i, 0, i * 100), 4);
    }
    expect(buffer).toHaveLength(4);
    expect(buffer[0].position.x).toBe(6);
    expect(buffer[3].position.x).toBe(9);
  });

  it('inserts an out-of-order arrival in time order rather than appending it', () => {
    // Appending a reordered packet would make the player jump backwards for a
    // frame, because interpolateAt assumes the buffer is sorted.
    let buffer: PresenceSample[] = [];
    buffer = pushSample(buffer, sample(0, 0, 1000), 4);
    buffer = pushSample(buffer, sample(2, 0, 3000), 4);
    buffer = pushSample(buffer, sample(1, 0, 2000), 4);

    expect(buffer.map((s) => s.receivedAt)).toEqual([1000, 2000, 3000]);
  });

  it('does not mutate the buffer it was given', () => {
    const original = [sample(0, 0, 1000)];
    const next = pushSample(original, sample(1, 0, 2000), 4);
    expect(original).toHaveLength(1);
    expect(next).toHaveLength(2);
  });
});

describe('interpolateAt', () => {
  it('returns null for a player we have heard nothing from', () => {
    expect(interpolateAt([], 1000, CONFIG)).toBeNull();
  });

  it('lerps midway between two bracketing samples', () => {
    // A realistic step: the player walks at 5 tiles/sec and publishes at 5Hz,
    // so consecutive samples are about a tile apart.
    const buffer = [sample(0, 0, 1000), sample(2, 1, 2000)];
    const result = interpolateAt(buffer, 1500, CONFIG);

    expect(result).not.toBeNull();
    expect(result!.position.x).toBeCloseTo(1);
    expect(result!.position.y).toBeCloseTo(0.5);
    expect(result!.interpolated).toBe(true);
  });

  it('reports speed in tiles per second', () => {
    // 3 tiles across in 1000ms.
    const buffer = [sample(0, 0, 1000), sample(3, 0, 2000)];
    const result = interpolateAt(buffer, 1500, CONFIG);
    expect(result!.speed).toBeCloseTo(3);
  });

  it('takes direction from the newer sample, which carries current intent', () => {
    const buffer = [sample(0, 0, 1000, Direction.Left), sample(1, 0, 2000, Direction.Up)];
    expect(interpolateAt(buffer, 1500, CONFIG)!.direction).toBe(Direction.Up);
  });

  it('holds at the newest sample once render time runs past it', () => {
    // They stopped sending: either standing still or gone. Extrapolating here is
    // what makes players rubber-band when they stop walking.
    const buffer = [sample(0, 0, 1000), sample(4, 0, 2000)];
    const result = interpolateAt(buffer, 9000, CONFIG);

    expect(result!.position).toEqual({ x: 4, y: 0 });
    expect(result!.speed).toBe(0);
    expect(result!.interpolated).toBe(false);
  });

  it('holds at the oldest sample when render time predates the buffer', () => {
    const buffer = [sample(7, 7, 5000)];
    const result = interpolateAt(buffer, 1000, CONFIG);
    expect(result!.position).toEqual({ x: 7, y: 7 });
  });

  it('snaps rather than sliding across the map on a teleport', () => {
    // A map transition or a teleport, not a walk. Sliding would drag the
    // character visibly through walls.
    const buffer = [sample(0, 0, 1000), sample(40, 40, 2000)];
    const result = interpolateAt(buffer, 1500, CONFIG);

    expect(result!.position).toEqual({ x: 40, y: 40 });
    expect(result!.interpolated).toBe(false);
    expect(result!.speed).toBe(0);
  });

  it('survives two samples sharing a timestamp without dividing by zero', () => {
    const buffer = [sample(0, 0, 1000), sample(1, 0, 1000), sample(2, 0, 2000)];
    const result = interpolateAt(buffer, 1000, CONFIG);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!.position.x)).toBe(true);
  });
});
