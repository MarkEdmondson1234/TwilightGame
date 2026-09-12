import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePinchZoom } from '../hooks/usePinchZoom';

function touch(target: Element, x: number) {
  return { target, clientX: x, clientY: 0 };
}
function gesture(type: string, touches: ReturnType<typeof touch>[]) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: touches });
  act(() => window.dispatchEvent(event));
}
afterEach(() => document.querySelectorAll('[data-game-world]').forEach((node) => node.remove()));

describe('game camera zoom', () => {
  it('retains the chosen outdoor view through a fitted interior', () => {
    const { result, rerender } = renderHook(
      ({ min, max }) => usePinchZoom({ minZoom: min, maxZoom: max }),
      { initialProps: { min: 0.5, max: 2 } }
    );
    act(() => result.current.setZoomLevel(0.75));
    expect(result.current.zoom).toBe(0.75);
    rerender({ min: 1, max: 1 });
    expect(result.current.zoom).toBe(1);
    rerender({ min: 0.5, max: 2 });
    expect(result.current.zoom).toBe(0.75);
  });
  it('pinches the world to 50% and cancels the gesture reliably', () => {
    const world = document.createElement('div');
    world.dataset.gameWorld = '';
    document.body.appendChild(world);
    const { result } = renderHook(() => usePinchZoom());
    gesture('touchstart', [touch(world, 0), touch(world, 200)]);
    gesture('touchmove', [touch(world, 0), touch(world, 100)]);
    expect(result.current.zoom).toBe(0.5);
    gesture('touchcancel', []);
    gesture('touchmove', [touch(world, 0), touch(world, 400)]);
    expect(result.current.zoom).toBe(0.5);
  });
  it('does not mistake a control finger plus a world finger for camera zoom', () => {
    const world = document.createElement('div');
    world.dataset.gameWorld = '';
    const button = document.createElement('button');
    world.appendChild(button);
    document.body.appendChild(world);
    const { result } = renderHook(() => usePinchZoom());
    gesture('touchstart', [touch(button, 0), touch(world, 200)]);
    gesture('touchmove', [touch(button, 0), touch(world, 100)]);
    expect(result.current.zoom).toBe(1);
  });
});
