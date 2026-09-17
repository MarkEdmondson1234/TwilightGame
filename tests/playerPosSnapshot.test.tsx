/**
 * The player position leaves React state per frame (PERFORMANCE_MOBILE_PLAN.md
 * §6A). While the player walks, `playerPosRef` moves every frame and the
 * PixiJS renderer reads it directly; React only receives a snapshot on a tile
 * change, every TIMING.PLAYER_SNAPSHOT_MS, and once on coming to a stop.
 *
 * Before this, `usePlayerMovement` called setState on every moving frame and
 * the 3,400-line App re-rendered 60 times a second — ~19 ms each on an iPad,
 * a dropped frame per step. If a refactor routes the position back through
 * React per frame, the first test fails.
 */
/** @vitest-environment jsdom */
import React, { useEffect } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { useMovementController, UseMovementControllerReturn } from '../hooks/useMovementController';
import { TIMING } from '../constants';

vi.mock('../utils/AudioManager', () => ({
  audioManager: {
    hasActiveSound: () => false,
    playSfx: () => 'sfx',
    stopSound: () => {},
  },
}));

vi.mock('../maps', () => ({
  mapManager: {
    getCurrentMap: () => ({ id: 'village', width: 60, height: 60 }),
    getCurrentMapId: () => 'village',
  },
}));

const FRAME_MS = 1000 / 60;
const FRAME_S = FRAME_MS / 1000;

interface Harness {
  controller: UseMovementControllerReturn;
  commits: number;
  keys: Record<string, boolean>;
}

function mount(snapshotEveryFrame = false): Harness {
  const harness = { commits: 0, keys: {} as Record<string, boolean> } as Harness;
  const npcsRef = { current: [] };
  function Host() {
    // One effect run per commit — the same way App counts `appRenders`.
    useEffect(() => {
      harness.commits += 1;
    });
    harness.controller = useMovementController({
      currentMapId: 'village',
      checkCollision: () => false,
      keysPressed: harness.keys,
      npcsRef,
      isUIActive: false,
      isCutscenePlaying: false,
      activeNPC: null,
      snapshotEveryFrame,
    });
    return null;
  }
  render(<Host />);
  return harness;
}

/** Run one game-loop frame: movement, then let React flush whatever was set. */
function frame(h: Harness, now: number) {
  act(() => {
    h.controller.updateMovement(FRAME_S, now);
  });
}

afterEach(() => vi.restoreAllMocks());

describe('player position snapshot (§6A)', () => {
  it('moves the ref every frame but commits to React at most ~10 Hz plus tile changes', () => {
    const h = mount();
    const mountCommits = h.commits;
    const startX = h.controller.playerPosRef.current.x;
    h.keys['d'] = true;

    let now = 1_000_000;
    let lastX = startX;
    for (let i = 0; i < 60; i++) {
      now += FRAME_MS;
      frame(h, now);
      const x = h.controller.playerPosRef.current.x;
      expect(x).toBeGreaterThan(lastX); // never rewound by a commit
      lastX = x;
    }

    // One second at PLAYER_SPEED tiles/s.
    expect(lastX - startX).toBeCloseTo(TIMING.PLAYER_SPEED, 1);

    const walkCommits = h.commits - mountCommits;
    const tilesCrossed = Math.floor(lastX) - Math.floor(startX);
    const cadenceCommits = Math.ceil(1000 / TIMING.PLAYER_SNAPSHOT_MS);
    expect(walkCommits).toBeGreaterThan(0); // React does still hear about it
    expect(walkCommits).toBeLessThanOrEqual(cadenceCommits + tilesCrossed);
    expect(walkCommits).toBeLessThan(60 / 2); // and nowhere near per frame
  });

  it('commits the exact resting position when the player stops', () => {
    const h = mount();
    h.keys['d'] = true;
    let now = 1_000_000;
    for (let i = 0; i < 7; i++) {
      now += FRAME_MS;
      frame(h, now);
    }
    h.keys['d'] = false;
    now += FRAME_MS;
    frame(h, now);

    expect(h.controller.playerPos).toEqual(h.controller.playerPosRef.current);
    expect(h.controller.animationFrame).toBe(0);
  });

  it('does not commit at all while standing still', () => {
    const h = mount();
    const before = h.commits;
    let now = 1_000_000;
    for (let i = 0; i < 30; i++) {
      now += FRAME_MS;
      frame(h, now);
    }
    expect(h.commits).toBe(before);
  });

  it('teleporting sets the ref and the snapshot together', () => {
    const h = mount();
    act(() => {
      h.controller.teleportPlayer({ x: 20, y: 21 });
    });
    expect(h.controller.playerPosRef.current).toEqual({ x: 20, y: 21 });
    expect(h.controller.playerPos).toEqual({ x: 20, y: 21 });
  });

  it('commits every frame when asked to (DOM-drawn player)', () => {
    const h = mount(true);
    const before = h.commits;
    h.keys['d'] = true;
    let now = 1_000_000;
    for (let i = 0; i < 20; i++) {
      now += FRAME_MS;
      frame(h, now);
    }
    expect(h.commits - before).toBe(20);
  });
});
