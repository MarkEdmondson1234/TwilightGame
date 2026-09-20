import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
const state = vi.hoisted(() => ({
  saved: {} as Record<string, unknown>,
  active: ['gardening_quest', 'althea_chores'],
  cooking: true,
  action: 'Grow a crop for Elias',
}));
vi.mock('../GameState', () => ({
  gameState: {
    startQuest: vi.fn(),
    getQuestData: (_quest: string, key: string) => state.saved[key],
    setQuestData: (_quest: string, key: string, value: unknown) => {
      state.saved[key] = value;
      eventBus.emit(GameEvent.QUEST_DATA_CHANGED, { questId: _quest, key, value });
    },
  },
}));
vi.mock('../utils/EventChainManager', () => ({
  eventChainManager: {
    getActiveChains: () => state.active.map((chainId) => ({ chainId })),
    getChain: () => ({ definition: { title: 'Help Elias with the Garden' } }),
  },
}));
vi.mock('../utils/readQuestNextSteps', () => ({
  readCookingNextStep: () =>
    state.cooking ? { action: 'Make tea', where: 'Mum’s kitchen', details: [] } : undefined,
  readQuestNextStep: () => ({ action: state.action, where: 'Village garden', details: [] }),
}));
import { getPinnedQuestId, pinQuest, readPinnedQuest } from '../utils/pinnedQuest';
import PinnedQuest from '../components/PinnedQuest';
import { eventBus, GameEvent } from '../utils/EventBus';

beforeEach(() => {
  state.saved = {};
  state.active = ['gardening_quest', 'althea_chores'];
  state.cooking = true;
  state.action = 'Grow a crop for Elias';
});

describe('personal quest pin', () => {
  it('defaults to no pin and ignores unknown values from old or malformed saves', () => {
    expect(getPinnedQuestId()).toBeNull();
    state.saved.pinnedQuest = 'unknown_quest';
    expect(readPinnedQuest()).toBeUndefined();
    state.saved.pinnedQuest = { id: 'gardening_quest' };
    expect(getPinnedQuestId()).toBeNull();
  });
  it('restores the saved choice, switches quests and clears without modifying other knowledge', () => {
    state.saved.skiing = true;
    pinQuest('gardening_quest');
    const saved = JSON.stringify(state.saved);
    state.saved = JSON.parse(saved);
    expect(readPinnedQuest()?.id).toBe('gardening_quest');
    pinQuest('cooking_lessons');
    expect(readPinnedQuest()?.nextStep.action).toBe('Make tea');
    pinQuest(null);
    expect(readPinnedQuest()).toBeUndefined();
    expect(state.saved.skiing).toBe(true);
  });
  it('never shows completed, unavailable or unaccepted quests from a stale pin', () => {
    pinQuest('gardening_quest');
    state.active = [];
    expect(readPinnedQuest()).toBeUndefined();
    pinQuest('cooking_lessons');
    state.cooking = false;
    expect(readPinnedQuest()).toBeUndefined();
  });
  it('refreshes on inventory and cloud changes, yields to overlays and opens the journal', () => {
    pinQuest('gardening_quest');
    const onJournal = vi.fn();
    const view = render(<PinnedQuest blocked={false} onJournal={onJournal} />);
    expect(screen.getByRole('complementary', { name: 'Pinned quest' })).toHaveTextContent(
      'Grow a crop'
    );
    act(() => {
      state.action = 'Deliver 1 crop to Elias';
      eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'update' });
    });
    expect(screen.getByRole('complementary')).toHaveTextContent('Deliver 1 crop');
    fireEvent.click(screen.getByRole('button', { name: /Open Help Elias/ }));
    expect(onJournal).toHaveBeenCalledOnce();
    view.rerender(<PinnedQuest blocked onJournal={onJournal} />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    view.rerender(<PinnedQuest blocked={false} onJournal={onJournal} />);
    act(() => {
      state.saved = {};
      eventBus.emit(GameEvent.CLOUD_SYNC_COMPLETED, { success: true });
    });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    act(() => pinQuest('gardening_quest'));
    fireEvent.click(screen.getByRole('button', { name: 'Unpin quest' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(getPinnedQuestId()).toBeNull();
  });
});
