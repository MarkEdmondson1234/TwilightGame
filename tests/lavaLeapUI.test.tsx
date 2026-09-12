/** Input lifecycle matters: a held direction must not survive pause or lost touch. */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MiniGameContext } from '../minigames/types';
import { LavaLeapGame } from '../minigames/lava-leap/LavaLeapGame';
import { LavaLeapPlayer } from '../minigames/lava-leap/LavaLeapPlayer';
import { PLAYER } from '../minigames/lava-leap/engine';
import type { LeapRun, LeapPeer } from '../minigames/lava-leap/multiplayer';

const online = vi.hoisted(() => ({
  update: null as ((run: LeapRun, peers: LeapPeer[]) => void) | null,
  close: vi.fn(),
  publish: vi.fn(),
}));
vi.mock('../firebase/safe', () => ({ whenFirebaseSettled: async () => true }));
vi.mock('../firebase/lavaLeapService', () => ({
  connectLavaLeap: async (
    _map: string,
    _mode: string,
    _name: string,
    _character: string,
    update: (run: LeapRun, peers: LeapPeer[]) => void
  ) => {
    online.update = update;
    update(
      {
        id: 'test',
        host: 'alice',
        guest: '',
        mode: 'race',
        startsAt: 0,
        courseAt: 0,
        updatedAt: 100000,
        course: 'lava',
        gems: 0,
        checkpoint: 0,
        wind: false,
        earth: false,
        won: false,
        banked: 0,
        winner: '',
      },
      []
    );
    return {
      uid: 'alice',
      now: () => 100000,
      close: online.close,
      publish: async (...args: unknown[]) => {
        online.publish(...args);
      },
      branch: async () => {},
    };
  },
}));

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
  online.update = null;
  online.close.mockClear();
  online.publish.mockClear();
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
  it('waits for the shared start, displays both race views, and disconnects on leaving', async () => {
    setup();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Race a friend · split screen' }));
      await vi.dynamicImportSettled();
    });
    expect(screen.getByText('Waiting for your friend')).toBeTruthy();
    const start = playerX();
    fireEvent.keyDown(window, { key: 'd' });
    advance();
    expect(playerX()).toBe(start);
    expect(screen.getByRole('button', { name: /Wind/ }).hasAttribute('disabled')).toBe(false);
    act(() =>
      online.update!(
        {
          id: 'test',
          host: 'alice',
          guest: 'bob',
          mode: 'race',
          startsAt: 99000,
          courseAt: 99000,
          updatedAt: 100000,
          course: 'lava',
          gems: 0,
          checkpoint: 0,
          wind: false,
          earth: false,
          won: false,
          banked: 0,
          winner: '',
        },
        []
      )
    );
    expect(document.querySelectorAll('.ll-view')).toHaveLength(2);
    fireEvent.keyDown(window, { key: 'd' });
    advance();
    expect(playerX()).toBeGreaterThan(start);
    cleanup();
    expect(online.close).toHaveBeenCalled();
  });
  it('anchors the visible artwork to the same ground as the physics', () => {
    render(
      <LavaLeapPlayer
        x={80}
        y={410 - PLAYER.h}
        sprite="/TwilightGame/assets-optimized/character1/base/right_0.png"
        rescued={false}
        gliding={false}
      />
    );
    const player = document.querySelector<HTMLElement>('.ll-player')!;
    expect(parseFloat(player.style.top) + parseFloat(player.style.height)).toBe(410);
    expect(parseFloat(player.style.height)).toBeGreaterThanOrEqual(72);
    expect(screen.getByRole('img', { name: 'Your character' }).getAttribute('viewBox')).toBe(
      '349 122 323 598'
    );
  });
  it('keeps the activation keys visible on the action buttons', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Jump' }).textContent).toContain('W');
    expect(screen.getByRole('button', { name: 'Use Frost crystal' }).textContent).toContain(
      'Space'
    );
  });
  it('jumps with W and uses Space for powers without jumping', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Enter the cavern' }));
    advance();
    const playerY = () => parseFloat(document.querySelector<HTMLElement>('.ll-player')!.style.top);
    const ground = playerY();
    fireEvent.keyDown(window, { key: ' ' });
    advance();
    expect(document.querySelector('.ll-ice')).not.toBeNull();
    expect(playerY()).toBe(ground);
    fireEvent.keyUp(window, { key: ' ' });
    fireEvent.keyDown(window, { key: 'w' });
    advance();
    expect(playerY()).toBeLessThan(ground);
  });
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

  it('keeps moving when a second finger jumps and is lifted', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Enter the cavern' }));
    const right = screen.getByRole('button', { name: 'Move right' });
    const jump = screen.getByRole('button', { name: 'Jump' });
    right.setPointerCapture = vi.fn();
    jump.setPointerCapture = vi.fn();
    const pointer = (target: HTMLElement, type: string, pointerId: number) =>
      fireEvent(target, Object.assign(new Event(type, { bubbles: true }), { pointerId }));
    const initialTop = document.querySelector<HTMLElement>('.ll-player')!.style.top;
    pointer(right, 'pointerdown', 11);
    pointer(jump, 'pointerdown', 22);
    advance();
    expect(parseFloat(document.querySelector<HTMLElement>('.ll-player')!.style.top)).toBeLessThan(
      parseFloat(initialTop)
    );
    pointer(jump, 'pointerup', 22);
    const x = playerX();
    advance();
    expect(playerX()).toBeGreaterThan(x);
    pointer(right, 'pointerup', 11);
    // Physics runs at 120 Hz, display at 30 Hz: flush the last pending paint.
    advance(3);
    const stopped = playerX();
    advance();
    expect(playerX()).toBe(stopped);
  });
});
