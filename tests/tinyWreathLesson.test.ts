import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  started: false,
  done: false,
  data: {} as Record<string, unknown>,
  items: {} as Record<string, number>,
}));
vi.mock('../GameState', () => ({
  gameState: {
    startQuest: () => {
      state.started = true;
    },
    isQuestStarted: () => state.started,
    isQuestCompleted: () => state.done,
    completeQuest: () => {
      state.done = true;
    },
    getQuestData: (_q: string, key: string) => state.data[key],
    setQuestData: (_q: string, key: string, value: unknown) => {
      state.data[key] = value;
    },
  },
}));
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    addItem: (id: string, n: number) => {
      state.items[id] = (state.items[id] ?? 0) + n;
      return true;
    },
    getQuantity: (id: string) => state.items[id] ?? 0,
  },
}));
vi.mock('../utils/activityLeadStorage', () => ({ rememberActivityLead: vi.fn() }));
import {
  startTinyWreathLesson,
  finishTinyWreathLesson,
  readTinyWreathNextStep,
} from '../utils/tinyWreathLesson';
import { eventBus, GameEvent } from '../utils/EventBus';
beforeEach(() => {
  state.started = false;
  state.done = false;
  state.data = {};
  state.items = {};
});
describe('tiny wreath starter lesson', () => {
  it('supplies exactly four valid materials once, including after save restoration', () => {
    startTinyWreathLesson();
    state.data = JSON.parse(JSON.stringify(state.data));
    startTinyWreathLesson();
    expect(state.items).toEqual({ crop_lavender: 2, heather_sprig: 2 });
    expect(readTinyWreathNextStep()?.action).toContain('Arrange');
    state.items = {};
    startTinyWreathLesson();
    expect(state.items).toEqual({});
    expect(readTinyWreathNextStep()?.action).toContain('Gather');
  });
  it('accepts replacement materials and completion never depends on another quest', () => {
    expect(readTinyWreathNextStep()).toBeUndefined();
    startTinyWreathLesson();
    state.items = { straw: 4 };
    expect(readTinyWreathNextStep()?.action).toContain('Arrange');
    const publish = vi.fn();
    const off = eventBus.on(GameEvent.PLAYER_MILESTONE, publish);
    finishTinyWreathLesson();
    finishTinyWreathLesson();
    expect(publish).toHaveBeenCalledExactlyOnceWith({ milestoneId: 'tiny-wreath' });
    expect(readTinyWreathNextStep()).toBeUndefined();
    off();
  });
  it('cannot complete a lesson that was never accepted', () => {
    finishTinyWreathLesson();
    expect(state.done).toBe(false);
  });
});
