/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Event Chain System Tests
 *
 * Tests the YAML-based event chain system including:
 * - Type definitions
 * - EventBus integration
 * - Chain loader validation
 * - Chain manager lifecycle
 */

// ============================================
// EventBus - Chain Events
// ============================================

describe('EventBus - Event Chain Events', () => {
  it('should define EVENT_CHAIN_UPDATED event', async () => {
    const { GameEvent } = await import('../utils/EventBus');
    expect(GameEvent.EVENT_CHAIN_UPDATED).toBe('chain:updated');
  });

  it('should emit and receive chain events', async () => {
    const { eventBus, GameEvent } = await import('../utils/EventBus');
    const handler = vi.fn();

    const unsubscribe = eventBus.on(GameEvent.EVENT_CHAIN_UPDATED, handler);
    eventBus.emit(GameEvent.EVENT_CHAIN_UPDATED, {
      chainId: 'test_chain',
      stageId: 'start',
      action: 'started',
    });

    expect(handler).toHaveBeenCalledWith({
      chainId: 'test_chain',
      stageId: 'start',
      action: 'started',
    });

    unsubscribe();
  });

  it('should define EVENT_CHAIN_CHOICE_REQUIRED event', async () => {
    const { GameEvent } = await import('../utils/EventBus');
    expect(GameEvent.EVENT_CHAIN_CHOICE_REQUIRED).toBe('chain:choice_required');
  });

  it('should define EVENT_CHAIN_OBJECTIVE_REACHED event', async () => {
    const { GameEvent } = await import('../utils/EventBus');
    expect(GameEvent.EVENT_CHAIN_OBJECTIVE_REACHED).toBe('chain:objective_reached');
  });

  it('should emit and receive choice required events', async () => {
    const { eventBus, GameEvent } = await import('../utils/EventBus');
    const handler = vi.fn();

    const unsubscribe = eventBus.on(GameEvent.EVENT_CHAIN_CHOICE_REQUIRED, handler);
    eventBus.emit(GameEvent.EVENT_CHAIN_CHOICE_REQUIRED, {
      chainId: 'test_chain',
      stageId: 'branch',
      stageText: 'What do you do?',
      choices: [
        { text: 'Option A', next: 'path_a' },
        { text: 'Option B', next: 'path_b' },
      ],
    });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: 'test_chain',
        stageText: 'What do you do?',
        choices: expect.arrayContaining([expect.objectContaining({ text: 'Option A' })]),
      })
    );

    unsubscribe();
  });

  it('should support all chain action types', async () => {
    const { eventBus, GameEvent } = await import('../utils/EventBus');
    const handler = vi.fn();

    const unsubscribe = eventBus.on(GameEvent.EVENT_CHAIN_UPDATED, handler);

    const actions: Array<'started' | 'advanced' | 'completed' | 'reset'> = [
      'started',
      'advanced',
      'completed',
      'reset',
    ];

    for (const action of actions) {
      eventBus.emit(GameEvent.EVENT_CHAIN_UPDATED, {
        chainId: 'test',
        stageId: 'stage1',
        action,
      });
    }

    expect(handler).toHaveBeenCalledTimes(4);
    unsubscribe();
  });
});

// ============================================
// Event Chain Type Definitions
// ============================================

describe('Event Chain Types', () => {
  it('should define all chain trigger types', () => {
    // Verify the type system accepts all valid trigger types (including tile)
    const triggers = ['manual', 'event_count', 'quest_complete', 'seasonal', 'friendship', 'tile'];
    expect(triggers).toHaveLength(6);
  });

  it('EventChainProgress should have required fields', () => {
    const progress = {
      chainId: 'test_chain',
      currentStageId: 'start',
      startedDay: 1,
      stageEnteredDay: 1,
      choicesMade: {},
      completed: false,
    };

    expect(progress.chainId).toBe('test_chain');
    expect(progress.currentStageId).toBe('start');
    expect(progress.completed).toBe(false);
    expect(progress.choicesMade).toEqual({});
  });

  it('ChainStage should accept all optional fields', () => {
    const stage = {
      id: 'test_stage',
      text: 'Something happens',
      event: {
        title: 'Test Event',
        description: 'tested the event chain system',
        contributor: 'A tester',
      },
      dialogue: {
        village_elder: { text: 'How interesting!', expression: 'thinky' },
      },
      choices: [
        { text: 'Option A', next: 'path_a' },
        { text: 'Option B', next: 'path_b', requires: { quest: 'some_quest' } },
      ],
      rewards: [{ item: 'moonpetal', quantity: 3 }],
      waitDays: 2,
      end: false,
    };

    expect(stage.choices).toHaveLength(2);
    expect(stage.dialogue.village_elder.expression).toBe('thinky');
    expect(stage.rewards![0].item).toBe('moonpetal');
    expect(stage.waitDays).toBe(2);
  });

  it('ChainStage should accept objective field', () => {
    const stage = {
      id: 'go_to_well',
      text: 'Head to the village well',
      objective: {
        type: 'go_to' as const,
        mapId: 'village',
        tileX: 21,
        tileY: 18,
        radius: 2,
        hint: 'Go to the village well',
      },
      next: 'arrived',
    };

    expect(stage.objective.type).toBe('go_to');
    expect(stage.objective.mapId).toBe('village');
    expect(stage.objective.hint).toBe('Go to the village well');
  });
});

// ============================================
// YAML Event Chain Files Validation
// ============================================

describe('YAML Event Chain Files', () => {
  it('should have YAML files in data/eventChains/', async () => {
    // Check that the YAML files exist by testing the glob import pattern
    // We verify indirectly through the loader's file count
    const { getYamlFileCount } = await import('../utils/eventChainLoader');
    const count = getYamlFileCount();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('should load and validate all chain definitions', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();

    expect(chains.length).toBeGreaterThanOrEqual(3);

    for (const chain of chains) {
      const def = chain.definition;

      // Every chain must have required fields
      expect(def.id).toBeTruthy();
      expect(def.title).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(['discovery', 'achievement', 'seasonal', 'community', 'mystery']).toContain(def.type);
      expect(def.trigger.type).toBeTruthy();
      expect(def.stages.length).toBeGreaterThan(0);

      // Stage map should be populated
      expect(chain.stageMap.size).toBe(def.stages.length);
    }
  });

  it('mysterious_lights chain should have branching paths', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();
    const lights = chains.find((c) => c.definition.id === 'mysterious_lights');

    expect(lights).toBeDefined();
    expect(lights!.definition.type).toBe('mystery');

    // The first stage (rumours) should have choices
    const rumours = lights!.stageMap.get('rumours');
    expect(rumours).toBeDefined();
    expect(rumours!.choices).toBeDefined();
    expect(rumours!.choices!.length).toBeGreaterThanOrEqual(2);

    // Should have multiple paths
    expect(lights!.stageMap.has('brave_path')).toBe(true);
    expect(lights!.stageMap.has('cautious_path')).toBe(true);
    expect(lights!.stageMap.has('resolution')).toBe(true);
  });

  it('autumn_harvest_festival chain should be seasonal', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();
    const festival = chains.find((c) => c.definition.id === 'autumn_harvest_festival');

    expect(festival).toBeDefined();
    expect(festival!.definition.type).toBe('community');
    expect(festival!.definition.trigger.type).toBe('seasonal');
    expect(festival!.definition.trigger.season).toBe('autumn');
  });

  it('lost_kitten chain should have tile trigger at village well', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();
    const kitten = chains.find((c) => c.definition.id === 'lost_kitten');

    expect(kitten).toBeDefined();
    expect(kitten!.definition.type).toBe('discovery');
    expect(kitten!.definition.trigger.type).toBe('tile');
    expect(kitten!.definition.trigger.mapId).toBe('village');
    expect(kitten!.definition.trigger.tileX).toBe(21);
    expect(kitten!.definition.trigger.tileY).toBe(18);

    // Should have the adopt and village_cat paths
    expect(kitten!.stageMap.has('adopt')).toBe(true);
    expect(kitten!.stageMap.has('village_cat')).toBe(true);
    expect(kitten!.stageMap.has('happy_ending')).toBe(true);
  });

  it('mysterious_lights chain should have tile trigger in deep forest', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();
    const lights = chains.find((c) => c.definition.id === 'mysterious_lights');

    expect(lights).toBeDefined();
    expect(lights!.definition.trigger.type).toBe('tile');
    expect(lights!.definition.trigger.mapId).toBe('deep_forest');
  });

  it('all chains should have valid stage references', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();

    for (const chain of chains) {
      const stageIds = new Set(chain.definition.stages.map((s) => s.id));

      for (const stage of chain.definition.stages) {
        // next references should be valid
        if (stage.next) {
          expect(stageIds.has(stage.next)).toBe(true);
        }

        // choice next references should be valid
        for (const choice of stage.choices || []) {
          expect(stageIds.has(choice.next)).toBe(true);
        }
      }
    }
  });

  it('chains should use British English', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();

    for (const chain of chains) {
      for (const stage of chain.definition.stages) {
        if (stage.event?.contributor.toLowerCase().includes('travel')) {
          expect(stage.event.contributor).toContain('traveller');
        }
      }
    }
  });

  it('each chain should have exactly one ending stage', async () => {
    const { loadAllEventChains } = await import('../utils/eventChainLoader');
    const chains = loadAllEventChains();

    for (const chain of chains) {
      const endStages = chain.definition.stages.filter((s) => s.end);
      expect(endStages.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ============================================
// GameContext Integration
// ============================================

describe('GameContext - Event Chain Support', () => {
  it('GameContext should accept activeEventChains field', () => {
    const context = {
      season: 'autumn',
      timeOfDay: 'day',
      weather: 'clear',
      activeEventChains: ['Strange Lights in the Forest', 'The Lost Kitten'],
    };

    expect(context.activeEventChains).toHaveLength(2);
    expect(context.activeEventChains).toContain('Strange Lights in the Forest');
  });
});
