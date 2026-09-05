/** Input lifecycle matters: a held direction must not survive pause or lost touch. */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MiniGameContext } from '../minigames/types';
import { LavaLeapGame } from '../minigames/lava-leap/LavaLeapGame';

vi.mock('../GameState', () => ({ gameState: { getSelectedCharacter: () => null } }));
vi.mock('../utils/characterSprites', () => ({
  DEFAULT_CHARACTER: {},
  generateCharacterSprites: () => ({ right: ['test.png'], left: ['test.png'] }),
}));

let callback: FrameRequestCallback | undefined;
let now: number;
function advance(frames = 12) {
  act(() => {
    for (let i = 0; i < frames; i++) {
      now += 1000 / 60;
      callback?.(now);
    }
  });
}
function setup(windUnlocked = false, playtest = false) {
  const onClose = vi.fn();
  const onComplete = vi.fn();
  const context = {
    triggerData: { triggerType: 'direct', extra: { playtest } },
    storage: { load: () => ({ windUnlocked }), save: vi.fn() },
    actions: { playSfx: vi.fn() },
  } as unknown as MiniGameContext;
  render(<LavaLeapGame context={context} onClose={onClose} onComplete={onComplete} />);
  return { onClose, onComplete };
}
const playerX = () => parseFloat(document.querySelector<HTMLElement>('.ll-player')!.style.left);

beforeEach(() => {
  now = 0;
  callback = undefined;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    callback = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    callback = undefined;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Lava Leap controls', () => {
  it('starts developer practice with fresh unlocks even when normal play has unlocked Wind', () => {
    setup(true, true);
    expect(screen.getByRole('button', { name: /Wind/ }).hasAttribute('disabled')).toBe(true);
  });
  it('starts safely, restores unlocks and leaves without granting rewards', () => {
    const { onClose, onComplete } = setup(true);
    expect(screen.getByRole('button', { name: /Wind/ }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Jump' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('clears held keyboard movement on focus loss and freezes the simulation while paused', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Enter the cavern' }));
    const start = playerX();
    fireEvent.keyDown(window, { key: 'd' });
    advance();
    expect(playerX()).toBeGreaterThan(start);
    fireEvent.blur(window);
    const stopped = playerX();
    advance();
    expect(playerX()).toBe(stopped);
    fireEvent.click(screen.getByRole('button', { name: 'Keep exploring' }));
    advance();
    expect(playerX()).toBe(stopped);
  });

  it('releases a captured movement touch when the pointer is cancelled', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Enter the cavern' }));
    const right = screen.getByRole('button', { name: 'Move right' });
    right.setPointerCapture = vi.fn();
    const start = playerX();
    fireEvent.pointerDown(right, { pointerId: 1 });
    advance();
    expect(playerX()).toBeGreaterThan(start);
    fireEvent.pointerCancel(right, { pointerId: 1 });
    const stopped = playerX();
    advance();
    expect(playerX()).toBe(stopped);
  });
});
