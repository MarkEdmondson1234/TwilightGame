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
  return event;
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

it('keeps interior and exterior preferences separate and cancels a pinch on room-group changes', () => {
  const world = document.createElement('div');
  world.dataset.gameWorld = '';
  document.body.appendChild(world);
  const { result, rerender } = renderHook(
    ({ key, min }: { key: 'world' | 'interior'; min: number }) =>
      usePinchZoom({ preferenceKey: key, minZoom: min }),
    { initialProps: { key: 'world', min: 0.5 } }
  );
  act(() => result.current.setZoomLevel(0.5));
  gesture('touchstart', [touch(world, 0), touch(world, 200)]);
  rerender({ key: 'interior', min: 0.6 });
  expect(result.current.zoom).toBe(0.75);
  gesture('touchmove', [touch(world, 0), touch(world, 400)]);
  expect(result.current.zoom).toBe(0.75);
  act(() => result.current.setZoomLevel(1.2));
  rerender({ key: 'world', min: 0.5 });
  expect(result.current.zoom).toBe(0.5);
  rerender({ key: 'interior', min: 1.3 });
  expect(result.current.zoom).toBe(1.3);
  rerender({ key: 'interior', min: 0.6 });
  expect(result.current.zoom).toBe(1.2);
});

it('starts mobile outdoors wide, fits interiors after reload, and can pinch again after interruption', () => {
  const world = document.createElement('div');
  world.dataset.gameWorld = '';
  document.body.appendChild(world);
  const { result, rerender, unmount } = renderHook(
    ({ indoor }) =>
      usePinchZoom({
        preferenceKey: indoor ? 'interior' : 'world',
        defaultZoom: indoor ? 0.59 : 0.5,
        minZoom: indoor ? 0.59 : 0.5,
        maxZoom: indoor ? 0.68 : 2,
      }),
    { initialProps: { indoor: false } }
  );
  expect(result.current.zoom).toBe(0.5);
  rerender({ indoor: true });
  expect(result.current.zoom).toBe(0.59);
  gesture('touchstart', [touch(world, 0), touch(world, 100)]);
  gesture('touchmove', [touch(world, 0), touch(world, 110)]);
  expect(result.current.zoom).toBeCloseTo(0.649);
  act(() => window.dispatchEvent(new Event('blur')));
  gesture('touchmove', [touch(world, 0), touch(world, 200)]);
  expect(result.current.zoom).toBeCloseTo(0.649);
  gesture('touchstart', [touch(world, 0), touch(world, 100)]);
  gesture('touchmove', [touch(world, 0), touch(world, 90)]);
  expect(result.current.zoom).toBe(0.59);
  act(() => result.current.setZoomLevel(0.64));
  expect(result.current.zoom).toBe(0.64);
  unmount();
  const reloaded = renderHook(() =>
    usePinchZoom({ preferenceKey: 'interior', defaultZoom: 0.59, minZoom: 0.59, maxZoom: 0.68 })
  );
  expect(reloaded.result.current.zoom).toBe(0.59);
});

it('claims only a valid two-finger world start from native browser gestures', () => {
  const world = document.createElement('div');
  world.dataset.gameWorld = '';
  document.body.appendChild(world);
  const menu = document.createElement('button');
  world.appendChild(menu);
  renderHook(() => usePinchZoom());
  expect(gesture('touchstart', [touch(menu, 0), touch(world, 100)]).defaultPrevented).toBe(false);
  expect(gesture('touchstart', [touch(world, 0), touch(world, 100)]).defaultPrevented).toBe(true);
});
