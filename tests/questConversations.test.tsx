import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { cookingNextStep, gardeningNextStep, altheaNextStep } from '../utils/questNextSteps';
import type { NPC } from '../types';
const state = vi.hoisted(() => ({
  cue: undefined as unknown,
  visible: true,
}));
vi.mock('../utils/readQuestNextSteps', () => ({
  readQuestConversations: () => new Map(state.cue ? [['village_elder', state.cue]] : []),
}));
vi.mock('../NPCManager', () => ({ npcManager: { isNPCVisible: () => state.visible } }));
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));
import NPCInteractionIndicators from '../components/NPCInteractionIndicators';
import { eventBus, GameEvent } from '../utils/EventBus';
const garden = {
  offered: false,
  season: 'spring',
  task: 'spring' as const,
  completed: [],
  cropCount: 0,
  honeyCount: 0,
};
const chores = {
  done: false,
  cobwebsRemaining: 5,
  teaDelivered: false,
  cookiesDelivered: false,
  teaCount: 0,
  cookiesCount: 0,
  cookiesUnlocked: false,
};
const npc = { id: 'village_elder', name: 'Elias', position: { x: 5, y: 5 }, scale: 1 } as NPC;
beforeEach(() => {
  state.visible = true;
  state.cue = undefined;
});

describe('useful quest conversations', () => {
  it('offers Mum a cue only when it is time to ask for another lesson', () => {
    expect(cookingNextStep({ teaComplete: false, recipes: [] }).conversation).toBeUndefined();
    expect(cookingNextStep({ teaComplete: true, recipes: [] }).conversation?.npcId).toBe(
      'mum_kitchen'
    );
    expect(
      cookingNextStep({
        teaComplete: true,
        recipes: [{ name: 'Bread', mastered: false, timesCooked: 1, missing: [] }],
      }).conversation
    ).toBeUndefined();
  });
  it('marks actual garden hand-ins and seasonal conversations, but never winter waiting', () => {
    expect(gardeningNextStep(garden).conversation).toBeUndefined();
    expect(gardeningNextStep({ ...garden, cropCount: 1 }).conversation?.kind).toBe('delivery');
    expect(
      gardeningNextStep({ ...garden, season: 'winter', cropCount: 1 }).conversation?.kind
    ).toBe('delivery');
    expect(
      gardeningNextStep({ ...garden, season: 'winter', task: null }).conversation
    ).toBeUndefined();
    expect(
      gardeningNextStep({ ...garden, task: null, completed: ['spring'] }).conversation
    ).toBeUndefined();
    expect(gardeningNextStep({ ...garden, task: null }).conversation?.kind).toBe('talk');
    expect(gardeningNextStep({ ...garden, task: 'autumn', cropCount: 10 }).conversation?.kind).toBe(
      'talk'
    );
    expect(gardeningNextStep({ ...garden, task: 'autumn', honeyCount: 1 }).conversation?.kind).toBe(
      'delivery'
    );
  });
  it('keeps Althea’s independent chores distinct and never requests an item already delivered', () => {
    expect(altheaNextStep(chores).conversation).toBeUndefined();
    expect(altheaNextStep({ ...chores, teaCount: 1 }).conversation?.label).toContain('tea');
    expect(
      altheaNextStep({ ...chores, teaCount: 1, teaDelivered: true }).conversation
    ).toBeUndefined();
    expect(
      altheaNextStep({ ...chores, teaDelivered: true, cookiesCount: 1 }).conversation?.label
    ).toContain('cookies');
    expect(altheaNextStep({ ...chores, done: true }).conversation?.kind).toBe('talk');
  });
  it('shows a small cue nearby, enables dialogue only in range and refreshes without movement', () => {
    const onTalk = vi.fn();
    const view = render(
      <NPCInteractionIndicators npcs={[npc]} playerPos={{ x: 3, y: 5 }} onTalk={onTalk} />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    act(() => {
      state.cue = gardeningNextStep({ ...garden, cropCount: 1 }).conversation;
      eventBus.emit(GameEvent.INVENTORY_CHANGED, { action: 'update' });
    });
    expect(screen.getByRole('img', { name: 'Bring Elias 1 crop' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    view.rerender(
      <NPCInteractionIndicators npcs={[npc]} playerPos={{ x: 4, y: 5 }} onTalk={onTalk} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Talk: Bring Elias 1 crop' }));
    expect(onTalk).toHaveBeenCalledWith('village_elder');
    act(() => {
      state.cue = undefined;
      eventBus.emit(GameEvent.QUEST_DATA_CHANGED, {
        questId: 'gardening_quest',
        key: 'completed',
        value: true,
      });
    });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('hides behind overlays and never points to invisible or distant NPCs', () => {
    state.cue = gardeningNextStep({ ...garden, cropCount: 1 }).conversation;
    const props = { npcs: [npc], playerPos: { x: 5, y: 5 }, onTalk: vi.fn() };
    const view = render(<NPCInteractionIndicators {...props} blocked />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    view.rerender(<NPCInteractionIndicators {...props} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    state.visible = false;
    act(() => eventBus.emit(GameEvent.TIME_CHANGED, { season: 'winter' } as never));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    state.visible = true;
    view.rerender(<NPCInteractionIndicators {...props} playerPos={{ x: 20, y: 20 }} />);
    expect(screen.queryByRole('img', { name: /Bring Elias/ })).not.toBeInTheDocument();
  });
  it('preserves the existing shop indicator', () => {
    render(
      <NPCInteractionIndicators
        npcs={[{ ...npc, id: 'shop_counter_fox', name: 'Shop' }]}
        playerPos={{ x: 5, y: 5 }}
      />
    );
    expect(screen.getByText('Shop')).toBeInTheDocument();
  });
});
