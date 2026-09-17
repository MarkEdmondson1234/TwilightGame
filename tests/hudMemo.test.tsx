/**
 * App commits ~10 times a second while the player walks (the position
 * snapshot, PERFORMANCE_MOBILE_PLAN.md §6A), and every one of those used to
 * re-render the whole HUD — the two SVG clocks alone were ~110 ms/s of main
 * thread at 4× throttle, more than the App component itself (§5 M10).
 *
 * The invariants: the always-mounted HUD does not re-render when its parent
 * does with the same props; a game-state commit that leaves the selected
 * fields alone (a stamina tick, a save) does not re-render it either; and
 * the clocks redraw only when a hand would move.
 */
/** @vitest-environment jsdom */
import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import HUD from '../components/HUD';
import { areAnalogClockPropsEqual } from '../components/AnalogClock';
import SundialClock, { areSundialClockPropsEqual } from '../components/SundialClock';
import { useGameState } from '../hooks/useGameState';
import { gameState } from '../GameState';
import { TimeManager, GameTime } from '../utils/TimeManager';

vi.mock('../utils/AudioManager', () => ({
  audioManager: { hasActiveSound: () => false, playSfx: () => 'sfx', stopSound: () => {} },
}));

// A leaf the HUD renders exactly once per render of its own: counting its
// calls counts HUD renders. (React's <Profiler> cannot do this — it fires
// whenever its own node re-renders, whether or not the memoised child bailed.)
const clockRenders = vi.fn((_props: unknown) => null);
vi.mock('../components/AnalogClock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/AnalogClock')>();
  return { ...actual, default: (props: unknown) => clockRenders(props) };
});

describe('useGameState with a selector', () => {
  it('re-renders only when the selected value changes', () => {
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useGameState((s) => s.gold);
    });
    const before = renders;
    const gold = result.current;

    // A commit that touches something else entirely.
    act(() => gameState.refillWaterCan());
    expect(renders).toBe(before);

    act(() => gameState.addGold(5));
    expect(result.current).toBe(gold + 5);
    expect(renders).toBe(before + 1);
  });
});

describe('HUD memoisation (§5 M10)', () => {
  it('does not re-render when its parent re-renders with the same props', () => {
    let bump: () => void = () => {};
    function Parent() {
      const [, setTick] = useState(0);
      bump = () => setTick((t) => t + 1);
      return <HUD mapName="Village" compact={false} selectedItemId={null} />;
    }
    clockRenders.mockClear();
    render(<Parent />);
    const mounted = clockRenders.mock.calls.length;
    expect(mounted).toBeGreaterThan(0);

    act(() => bump());
    act(() => bump());
    expect(clockRenders.mock.calls.length).toBe(mounted);
  });

  it('does not re-render on a game-state commit that changes nothing it shows', () => {
    clockRenders.mockClear();
    render(<HUD mapName="Village" compact={false} selectedItemId={null} />);
    const mounted = clockRenders.mock.calls.length;
    // Stamina commits and saves go through the same notify() as gold does.
    act(() => gameState.setStamina(50));
    act(() => gameState.setStamina(49));
    expect(clockRenders.mock.calls.length).toBe(mounted);

    act(() => gameState.addGold(1));
    expect(clockRenders.mock.calls.length).toBe(mounted + 1);
  });
});

describe('clock memoisation', () => {
  const base: GameTime = TimeManager.getCurrentTime();
  const at = (patch: Partial<GameTime>): GameTime => ({ ...base, ...patch });

  it('the memo is wired to the exported compare', async () => {
    // React.memo keeps its compare on the element type. AnalogClock's default
    // export is mocked above, so read the real module for it.
    const analog = await vi.importActual<typeof import('../components/AnalogClock')>(
      '../components/AnalogClock'
    );
    expect((analog.default as unknown as { compare: unknown }).compare).toBe(analog.areAnalogClockPropsEqual);
    expect((SundialClock as unknown as { compare: unknown }).compare).toBe(areSundialClockPropsEqual);
  });

  it('the analog clock redraws only when a hand would move', () => {
    const same = { currentTime: at({ hour: 10, minute: 5 }), size: 70 };
    // A fresh GameTime object with the same hands: the HUD makes one every second.
    expect(areAnalogClockPropsEqual(same, { ...same, currentTime: at({ hour: 10, minute: 5 }) })).toBe(true);
    expect(areAnalogClockPropsEqual(same, { ...same, currentTime: at({ hour: 10, minute: 6 }) })).toBe(false);
    expect(areAnalogClockPropsEqual(same, { ...same, currentTime: at({ hour: 11, minute: 5 }) })).toBe(false);
    expect(areAnalogClockPropsEqual(same, { ...same, size: 36 })).toBe(false);
  });

  it('the sundial redraws on the date and the light, not the minute', () => {
    const same = { currentTime: at({ hour: 10, minute: 5, day: 3 }), size: 70 };
    expect(areSundialClockPropsEqual(same, { ...same, currentTime: at({ hour: 10, minute: 6, day: 3 }) })).toBe(true);
    expect(areSundialClockPropsEqual(same, { ...same, currentTime: at({ hour: 10, minute: 5, day: 4 }) })).toBe(false);
    expect(areSundialClockPropsEqual(same, { ...same, currentTime: at({ hour: 11, minute: 5, day: 3 }) })).toBe(false);
  });
});
