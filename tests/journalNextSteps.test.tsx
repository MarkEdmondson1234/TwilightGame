import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
const state = vi.hoisted(() => ({ action: 'Grow a crop for Elias', cooking: true }));
vi.mock('../firebase/safe', () => ({
  getAuthService: () => ({ getState: () => ({ user: null }) }),
}));
vi.mock('../utils/activityLeadStorage', () => ({
  getRememberedActivityLeads: () => [],
  rememberActivityLead: vi.fn(),
}));
vi.mock('../services/diaryService', () => ({
  getDiaryEntries: () => [],
  getDiaryEntriesForNPC: () => [],
  syncDiaryFromFirestore: async () => {},
}));
vi.mock('../utils/readQuestNextSteps', () => ({
  readCookingNextStep: () =>
    state.cooking
      ? { action: 'Make your first tea', where: 'Mum’s kitchen', details: ['Cook in the kitchen.'] }
      : undefined,
  readQuestNextStep: (id: string) => ({
    action: id === 'gardening_quest' ? state.action : 'Dust Althea’s cobwebs',
    where: 'Village',
    details: ['Your progress is saved.'],
  }),
}));
vi.mock('../utils/EventChainManager', () => ({
  eventChainManager: {
    getActiveChains: () =>
      ['gardening_quest', 'althea_chores'].map((chainId) => ({
        chainId,
        currentStageId: 'active',
      })),
    getCompletedChains: () => [],
    getChain: (id: string) => ({
      definition: { title: id, stages: [{ id: 'active' }] },
      stageMap: new Map([['active', { text: 'Story so far' }]]),
    }),
  },
}));
import JournalContent from '../components/book/JournalContent';
import { journalTheme } from '../components/book/bookThemes';
import { eventBus, GameEvent } from '../utils/EventBus';

describe('journal quest guidance', () => {
  it('keeps three activities together and refreshes the selected quest after inventory changes', () => {
    render(<JournalContent theme={journalTheme} />);
    expect(screen.getByRole('button', { name: /Cooking with Mum/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /althea_chores/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /gardening_quest/ }));
    expect(screen.getByRole('region', { name: 'Your next step' })).toHaveTextContent('Grow a crop');
    expect(screen.queryByText('Complete')).not.toBeInTheDocument();
    act(() => {
      state.action = 'Deliver 1 crop to Elias';
      eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'update' });
    });
    expect(screen.getByRole('region', { name: 'Your next step' })).toHaveTextContent(
      'Deliver 1 crop'
    );
  });
});
