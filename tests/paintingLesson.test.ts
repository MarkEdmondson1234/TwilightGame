import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  started: false,
  completed: false,
  data: {} as Record<string, unknown>,
  inventory: {} as Record<string, number>,
  placed: [] as { mapId: string; paintingId: string }[],
}));
vi.mock('../GameState', () => ({
  gameState: {
    startQuest: () => {
      state.started = true;
    },
    isQuestStarted: () => state.started,
    isQuestCompleted: () => state.completed,
    completeQuest: () => {
      state.completed = true;
    },
    getQuestData: (_id: string, key: string) => state.data[key],
    setQuestData: (_id: string, key: string, value: unknown) => {
      state.data[key] = value;
    },
    getAllPlacedItems: () => state.placed,
  },
}));
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    addItem: (id: string, count: number) => {
      state.inventory[id] = (state.inventory[id] ?? 0) + count;
      return true;
    },
    hasItem: (id: string) => (state.inventory[id] ?? 0) > 0,
  },
}));
vi.mock('../utils/activityLeadStorage', () => ({ rememberActivityLead: vi.fn() }));
import {
  startPaintingLesson,
  recordLessonPainting,
  readPaintingNextStep,
  finishPaintingLesson,
} from '../utils/paintingLesson';
import { eventBus, GameEvent } from '../utils/EventBus';
beforeEach(() => {
  state.started = false;
  state.completed = false;
  state.data = {};
  state.inventory = {};
  state.placed = [];
});
describe('kitchen painting lesson', () => {
  it('grants one starter canvas across repeated dialogue and restored saves', () => {
    startPaintingLesson();
    state.data = JSON.parse(JSON.stringify(state.data));
    startPaintingLesson();
    expect(state.inventory.blank_canvas).toBe(1);
    expect(readPaintingNextStep()?.action).toContain('Draw');
    expect(finishPaintingLesson()).toBe(false);
  });
  it('requires an accepted lesson, a saved drawing, and its actual kitchen placement', () => {
    recordLessonPainting('before');
    expect(state.data.paintings).toBeUndefined();
    startPaintingLesson();
    recordLessonPainting('mine');
    recordLessonPainting('mine');
    expect(state.data.paintings).toEqual(['mine']);
    state.inventory.framed_painting = 1;
    expect(readPaintingNextStep()?.action).toContain('Display');
    state.placed = [
      { mapId: 'mums_kitchen', paintingId: 'neighbours' },
      { mapId: 'home_upstairs', paintingId: 'mine' },
    ];
    expect(finishPaintingLesson()).toBe(false);
    state.placed.push({ mapId: 'mums_kitchen', paintingId: 'mine' });
    expect(readPaintingNextStep()?.conversation?.npcId).toBe('mum_kitchen');
    const publish = vi.fn();
    const off = eventBus.on(GameEvent.PLAYER_MILESTONE, publish);
    expect(finishPaintingLesson()).toBe(true);
    state.placed = [];
    expect(finishPaintingLesson()).toBe(true);
    expect(publish).toHaveBeenCalledExactlyOnceWith({ milestoneId: 'painting' });
    expect(readPaintingNextStep()).toBeUndefined();
    off();
  });
  it('gives recovery directions after the canvas or picture is lost, without more free supplies', () => {
    startPaintingLesson();
    state.inventory.blank_canvas = 0;
    recordLessonPainting('lost');
    startPaintingLesson();
    expect(state.inventory.blank_canvas).toBe(0);
    expect(readPaintingNextStep()?.details.join(' ')).toContain('craft another');
  });
});
