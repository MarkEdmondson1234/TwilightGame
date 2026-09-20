import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
const state = vi.hoisted(() => ({ complete: false, count: 0, ack: false }));
vi.mock('../utils/CookingManager', () => ({
  cookingManager: {
    isFireplaceTutorialComplete: () => state.complete,
    getProgress: () => ({ timesCooked: state.count }),
    isCookingCourseComplete: () => false,
    getMasteredDomainCount: () => 0,
    getUnlockedRecipes: () => [],
    getRecipesByCategory: () => [],
    isDomainMastered: () => false,
  },
}));
vi.mock('../GameState', () => ({
  gameState: {
    getQuestData: () => state.ack,
    startQuest: vi.fn(),
    setQuestData: () => {
      state.ack = true;
    },
  },
}));
import ScriptedControls from '../components/dialogue/ScriptedControls';
import { createMumNPC } from '../utils/npcs/homeNPCs';
import { getMumTeaAcknowledgement } from '../utils/mumTeaAcknowledgement';
beforeEach(() => {
  cleanup();
  state.complete = false;
  state.count = 0;
  state.ack = false;
});
describe('Mum recognises the tea lesson', () => {
  it('replaces the first-cup prompt with three next-lesson choices after a successful cup', () => {
    const dialogue = createMumNPC('mum_kitchen', { x: 7, y: 5 }).dialogue!.find(
      (n) => n.id === 'teach_cooking'
    )!;
    const props = { dialogue, canUseAI: false, onResponse: vi.fn(), onClose: vi.fn() };
    const view = render(<ScriptedControls {...props} />);
    expect(
      screen.getByRole('button', { name: 'That sounds wonderful! Where do I start?' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tell me about baking.' })).toBeNull();
    state.complete = true;
    state.count = 1;
    view.rerender(<ScriptedControls {...props} />);
    expect(
      screen.queryByRole('button', { name: 'That sounds wonderful! Where do I start?' })
    ).toBeNull();
    expect(screen.getByRole('button', { name: 'Tell me about baking.' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'I want to learn about desserts.' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Can you teach me some savoury dishes?' })
    ).toBeTruthy();
  });
  it('acknowledges a saved successful tea once, without requiring the cup in inventory', () => {
    expect(getMumTeaAcknowledgement('greeting')).toBeUndefined();
    state.complete = true; // Old saves may have unlocked the lesson without making tea.
    expect(getMumTeaAcknowledgement('greeting')).toBeUndefined();
    state.count = 1;
    expect(getMumTeaAcknowledgement('greeting')).toBe('tea_success');
    expect(getMumTeaAcknowledgement('teach_cooking')).toBeUndefined();
  });
});
