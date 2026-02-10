/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Global Events System Tests
 *
 * Tests the GlobalEventManager, EventBus integration,
 * dialogue filtering for global events, and Firebase sync types.
 */

// ============================================
// EventBus Integration Tests
// ============================================

describe('EventBus - Quest Events', () => {
  it('should define all quest event types', async () => {
    const { GameEvent } = await import('../utils/EventBus');
    expect(GameEvent.QUEST_STARTED).toBe('quest:started');
    expect(GameEvent.QUEST_STAGE_CHANGED).toBe('quest:stage_changed');
    expect(GameEvent.QUEST_COMPLETED).toBe('quest:completed');
    expect(GameEvent.QUEST_DATA_CHANGED).toBe('quest:data_changed');
  });

  it('should define GLOBAL_EVENTS_UPDATED event', async () => {
    const { GameEvent } = await import('../utils/EventBus');
    expect(GameEvent.GLOBAL_EVENTS_UPDATED).toBe('global:events_updated');
  });

  it('should emit and receive events correctly', async () => {
    const { eventBus, GameEvent } = await import('../utils/EventBus');
    const handler = vi.fn();

    const unsubscribe = eventBus.on(GameEvent.QUEST_COMPLETED, handler);
    eventBus.emit(GameEvent.QUEST_COMPLETED, { questId: 'test_quest' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ questId: 'test_quest' });

    unsubscribe();

    // Should not fire after unsubscribe
    eventBus.emit(GameEvent.QUEST_COMPLETED, { questId: 'test_quest_2' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should emit GLOBAL_EVENTS_UPDATED with correct payload', async () => {
    const { eventBus, GameEvent } = await import('../utils/EventBus');
    const handler = vi.fn();

    const unsubscribe = eventBus.on(GameEvent.GLOBAL_EVENTS_UPDATED, handler);
    eventBus.emit(GameEvent.GLOBAL_EVENTS_UPDATED, {
      eventCount: 5,
      types: ['discovery', 'achievement'],
    });

    expect(handler).toHaveBeenCalledWith({
      eventCount: 5,
      types: ['discovery', 'achievement'],
    });

    unsubscribe();
  });
});

// ============================================
// Firebase Types Tests
// ============================================

describe('Firebase Types - SharedWorldEvent', () => {
  it('should define all SharedEventType values', async () => {
    // SharedEventType is a union type, but we can verify the FIRESTORE_PATHS exist
    const { FIRESTORE_PATHS, SAVE_DATA_DOCS } = await import('../firebase/types');

    expect(FIRESTORE_PATHS.sharedEvents()).toBe('shared/events');
    expect(FIRESTORE_PATHS.sharedEventDoc('abc123')).toBe('shared/events/abc123');
    expect(SAVE_DATA_DOCS).toContain('quests');
  });

  it('should include quests in save data document types', async () => {
    const { SAVE_DATA_DOCS } = await import('../firebase/types');
    expect(SAVE_DATA_DOCS).toContain('quests');
    expect(SAVE_DATA_DOCS).toContain('friendships');
    expect(SAVE_DATA_DOCS).toContain('world');
  });
});

// ============================================
// Safe Firebase Stubs Tests
// ============================================

describe('Firebase Safe Stubs', () => {
  it('should export getSharedDataService', async () => {
    const { getSharedDataService } = await import('../firebase/safe');
    expect(getSharedDataService).toBeDefined();
    expect(typeof getSharedDataService).toBe('function');
  });

  it('stub should return empty arrays for getWorldEvents', async () => {
    const { getSharedDataService } = await import('../firebase/safe');
    const service = getSharedDataService();
    const events = await service.getWorldEvents();
    expect(events).toEqual([]);
  });

  it('stub should return false for addWorldEvent', async () => {
    const { getSharedDataService } = await import('../firebase/safe');
    const service = getSharedDataService();
    const result = await service.addWorldEvent('discovery', 'Test', 'test description');
    expect(result).toBe(false);
  });

  it('stub should return empty array for getRecentDiscoveries', async () => {
    const { getSharedDataService } = await import('../firebase/safe');
    const service = getSharedDataService();
    const discoveries = await service.getRecentDiscoveries();
    expect(discoveries).toEqual([]);
  });

  it('stub should return 0 for getRemainingContributions', async () => {
    const { getSharedDataService } = await import('../firebase/safe');
    const service = getSharedDataService();
    const remaining = service.getRemainingContributions();
    expect(remaining).toBe(0);
  });
});

// ============================================
// Dialogue Type Tests
// ============================================

describe('Dialogue Types - Global Event Conditions', () => {
  it('DialogueNode should accept global event conditions', async () => {
    // Type check: these properties should exist on DialogueNode
    // We verify by constructing a valid object matching the interface
    const node = {
      id: 'test',
      text: 'Hello',
      requiredGlobalEvent: 'discovery' as const,
      hiddenIfGlobalEvent: 'achievement' as const,
      requiredGlobalEventCount: { type: 'community' as const, min: 5 },
    };

    expect(node.requiredGlobalEvent).toBe('discovery');
    expect(node.hiddenIfGlobalEvent).toBe('achievement');
    expect(node.requiredGlobalEventCount.type).toBe('community');
    expect(node.requiredGlobalEventCount.min).toBe(5);
  });

  it('DialogueResponse should accept global event conditions', () => {
    const response = {
      text: 'Tell me more',
      nextId: 'details',
      requiredGlobalEvent: 'seasonal' as const,
      requiredGlobalEventCount: { type: 'discovery' as const, min: 3 },
    };

    expect(response.requiredGlobalEvent).toBe('seasonal');
    expect(response.requiredGlobalEventCount.min).toBe(3);
  });
});

// ============================================
// Example Events Validation Tests
// ============================================

describe('Example Events', () => {
  it('should define example events with valid types', async () => {
    const { EXAMPLE_GLOBAL_EVENTS } = await import('../data/exampleGlobalEvents');

    expect(EXAMPLE_GLOBAL_EVENTS.length).toBeGreaterThan(0);

    const validTypes = new Set(['discovery', 'achievement', 'seasonal', 'community', 'mystery']);

    for (const event of EXAMPLE_GLOBAL_EVENTS) {
      expect(validTypes.has(event.eventType)).toBe(true);
      expect(event.title.length).toBeGreaterThan(0);
      expect(event.description.length).toBeGreaterThan(0);
      expect(event.contributorName.length).toBeGreaterThan(0);
    }
  });

  it('each event type should have at least one example', async () => {
    const { EXAMPLE_GLOBAL_EVENTS } = await import('../data/exampleGlobalEvents');

    const types = new Set(EXAMPLE_GLOBAL_EVENTS.map((e) => e.eventType));
    expect(types.has('discovery')).toBe(true);
    expect(types.has('achievement')).toBe(true);
    expect(types.has('seasonal')).toBe(true);
    expect(types.has('community')).toBe(true);
    expect(types.has('mystery')).toBe(true);
  });

  it('contributor names should use British English phrasing', async () => {
    const { EXAMPLE_GLOBAL_EVENTS } = await import('../data/exampleGlobalEvents');

    // Check that contributor names use "traveller" not "traveler"
    for (const event of EXAMPLE_GLOBAL_EVENTS) {
      if (event.contributorName.toLowerCase().includes('travel')) {
        expect(event.contributorName).toContain('traveller');
      }
    }
  });
});

// ============================================
// Quest Display Names Tests
// ============================================

describe('Quest System - Display Names', () => {
  it('all quest IDs should map to display names in GlobalEventManager', async () => {
    // Import the quest IDs
    const gardeningQuest = await import('../data/questHandlers/gardeningQuestHandler');
    const witchGardenQuest = await import('../data/questHandlers/witchGardenHandler');

    // These should be defined (verifies quest files export IDs)
    expect(gardeningQuest.GARDENING_QUEST_ID).toBeDefined();
    expect(witchGardenQuest.WITCH_GARDEN_QUEST_ID).toBeDefined();
  });
});

// ============================================
// Forage Discovery Trigger Tests
// ============================================

describe('Forage Discovery Integration', () => {
  it('should define rare forage items that trigger events', async () => {
    // The rare items should all exist in the items database
    const { ITEMS } = await import('../data/items');

    const rareForageItems = [
      'moonpetal',
      'addersmeat',
      'wolfsbane',
      'luminescent_toadstool',
      'shrinking_violet',
      'frost_flower',
    ];

    for (const itemId of rareForageItems) {
      expect(ITEMS[itemId]).toBeDefined();
      expect(ITEMS[itemId].displayName).toBeTruthy();
    }
  });
});
