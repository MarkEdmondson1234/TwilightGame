import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../GameState', () => ({ gameState: { isQuestStarted: () => false } }));
const state = vi.hoisted(() => ({ active: [] as string[], cooking: false, crops: 1 }));
vi.mock('../utils/CookingManager', () => ({
  cookingManager: {
    isRecipeBookUnlocked: () => state.cooking,
    isCookingCourseComplete: () => false,
    isFireplaceTutorialComplete: () => true,
    getUnlockedRecipes: () => [],
    isRecipeUnlocked: () => false,
  },
}));
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: {
    getInventoryData: () => ({ items: [{ itemId: 'crop_carrot', quantity: state.crops }] }),
    getQuantity: () => 0,
  },
}));
vi.mock('../utils/EventChainManager', () => ({
  eventChainManager: {
    getActiveChains: () => state.active.map((chainId) => ({ chainId })),
    getProgress: () => ({ currentStageId: 'active' }),
  },
}));
vi.mock('../utils/TimeManager', () => ({
  TimeManager: { getCurrentTime: () => ({ season: 'spring' }) },
}));
vi.mock('../data/items', () => ({ getItem: vi.fn() }));
vi.mock('../data/recipes', () => ({ isCookingDomain: () => true }));
vi.mock('../data/questHandlers/gardeningQuestHandler', () => ({
  getCurrentSeasonTask: () => 'spring',
  hasCompletedSeason: () => false,
}));
vi.mock('../data/questHandlers/altheaChoresHandler', () => ({
  getCobwebsRemaining: () => 0,
  isTeaDelivered: () => true,
  areCookiesDelivered: () => false,
  isAltheaChoresDone: () => false,
}));
import { readQuestConversations } from '../utils/readQuestNextSteps';
beforeEach(() => {
  state.active = [];
  state.cooking = false;
  state.crops = 1;
});
describe('quest conversation availability', () => {
  it('never advertises unaccepted or completed chains just because an item is in the bag', () => {
    expect(readQuestConversations().size).toBe(0);
    state.active = ['gardening_quest'];
    expect(readQuestConversations().get('village_elder')?.kind).toBe('delivery');
    state.active = [];
    expect(readQuestConversations().size).toBe(0);
  });
  it('combines parallel quests and keeps only one prompt per NPC', () => {
    state.cooking = true;
    state.active = ['gardening_quest', 'althea_chores', 'ghost_queen'];
    const cues = readQuestConversations();
    expect([...cues.keys()]).toEqual(['mum_kitchen', 'village_elder']);
    expect(cues.get('village_elder')?.kind).toBe('delivery');
  });
});
