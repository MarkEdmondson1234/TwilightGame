import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import type { MiniGameComponentProps } from '../minigames/types';
const state = vi.hoisted(() => ({
  completed: false,
  touch: false,
  start: vi.fn(),
  finish: vi.fn(),
}));
vi.mock('../GameState', () => ({
  gameState: {
    getSelectedCharacter: () => null,
    isQuestCompleted: () => state.completed,
    startQuest: state.start,
    completeQuest: (id: string) => {
      state.finish(id);
      state.completed = true;
    },
  },
}));
vi.mock('../utils/activityLeadStorage', () => ({ rememberActivityLead: vi.fn() }));
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => state.touch }));
vi.mock('../utils/characterSprites', () => ({
  DEFAULT_CHARACTER: {},
  generateCharacterSprites: () => ({}),
}));
import { CrateTrailGame, crateTrailDefinition } from '../minigames/crate-trail/definition';
import { SlidingCratePuzzleGame } from '../minigames/sliding-crate-puzzle/SlidingCratePuzzleGame';
import { eventBus, GameEvent } from '../utils/EventBus';
const solution = ['ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown'];
function walk(keys: string[]) {
  keys.forEach((key) => fireEvent.keyDown(window, { key }));
}
function props(): MiniGameComponentProps {
  return {
    context: {} as MiniGameComponentProps['context'],
    onClose: vi.fn(),
    onComplete: vi.fn(),
  };
}
beforeEach(() => {
  cleanup();
  state.completed = false;
  state.touch = false;
  vi.clearAllMocks();
});

describe('village Crate Trail', () => {
  it('has its own all-season, cost-free NPC entry with no trial cutscene', () => {
    expect(crateTrailDefinition.id).not.toBe('sliding-crate-puzzle');
    expect(crateTrailDefinition.triggers).toEqual({ npcId: 'child' });
    expect(crateTrailDefinition.availability).toBeUndefined();
    expect(crateTrailDefinition.requirements).toBeUndefined();
    expect(crateTrailDefinition.precedingCutsceneId).toBeUndefined();
  });
  it('can be left without completing anything; hints do not solve it', () => {
    const p = props();
    render(<CrateTrailGame {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
    expect(screen.getByText(/Go up twice/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Leave puzzle' }));
    expect(p.onClose).toHaveBeenCalledOnce();
    expect(p.onComplete).not.toHaveBeenCalled();
    expect(state.finish).not.toHaveBeenCalled();
  });
  it('supports undo and restart and records only the independent lesson once', () => {
    const p = props();
    const publish = vi.fn();
    const off = eventBus.on(GameEvent.PLAYER_MILESTONE, publish);
    render(<CrateTrailGame {...p} />);
    expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
    walk(solution.slice(0, 5));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    walk(['ArrowDown']); // wall below the restored position: not the exit
    expect(screen.queryByText('Back to the village')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    walk(solution);
    fireEvent.click(screen.getByRole('button', { name: 'Back to the village' }));
    expect(p.onComplete).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ success: true })
    );
    expect(state.start).toHaveBeenCalledExactlyOnceWith('village_crate_trail');
    expect(state.finish).toHaveBeenCalledExactlyOnceWith('village_crate_trail');
    expect(publish).toHaveBeenCalledExactlyOnceWith({ milestoneId: 'crate-trail' });
    cleanup();
    render(<CrateTrailGame {...props()} />);
    walk(solution);
    fireEvent.click(screen.getByRole('button', { name: 'Back to the village' }));
    expect(publish).toHaveBeenCalledOnce();
    off();
  });
  it('can be solved using labelled touch buttons', () => {
    state.touch = true;
    render(<CrateTrailGame {...props()} />);
    ['up', 'up', 'right', 'right', 'right', 'down'].forEach((direction) =>
      fireEvent.click(screen.getByRole('button', { name: `Move ${direction}` }))
    );
    expect(screen.getByRole('button', { name: 'Back to the village' })).toBeTruthy();
  });
  it('preserves the full Test of Wits board and its immediate completion result', () => {
    const p = props();
    render(<SlidingCratePuzzleGame {...p} />);
    expect(screen.queryByRole('button', { name: 'Hint' })).toBeNull();
    walk([
      'ArrowUp',
      'ArrowUp',
      'ArrowRight',
      'ArrowRight',
      'ArrowUp',
      'ArrowRight',
      'ArrowUp',
      'ArrowUp',
      'ArrowRight',
      'ArrowRight',
      'ArrowUp',
      'ArrowRight',
    ]);
    expect(p.onComplete).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        success: true,
        message: 'Congratulations! You passed the Test of Wits!',
      })
    );
    expect(state.finish).not.toHaveBeenCalled();
  });
});
