/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cutsceneManager } from '../utils/CutsceneManager';
import { inventoryManager } from '../utils/inventoryManager';
import type { CutsceneDefinition } from '../types';

/**
 * checkRequirements() gates whether startCutscene() actually plays a cutscene.
 * requiredItems and flags used to be no-ops (a console.warn and nothing else),
 * so a cutscene author who set either would find the cutscene fires regardless
 * of whether the condition holds. These tests lock in the fixed behaviour.
 */

const ITEM = 'crop_pumpkin';
const CUTSCENE_ID = 'test_cutscene_requirements';

function makeCutscene(requirements: CutsceneDefinition['requirements']): CutsceneDefinition {
  return {
    id: CUTSCENE_ID,
    name: 'Test Cutscene',
    scenes: [{ id: 'scene1', backgroundLayers: [] }],
    trigger: { type: 'manual', id: CUTSCENE_ID },
    onComplete: { action: 'none' },
    requirements,
  };
}

describe('CutsceneManager requirement gating', () => {
  beforeEach(() => {
    while (inventoryManager.hasItem(ITEM, 1)) {
      inventoryManager.removeItem(ITEM, 1);
    }
  });

  afterEach(() => {
    cutsceneManager.endCutscene();
  });

  it('blocks a cutscene whose required item the player does not hold', () => {
    cutsceneManager.registerCutscene(makeCutscene({ requiredItems: [ITEM] }));
    expect(cutsceneManager.startCutscene(CUTSCENE_ID)).toBe(false);
  });

  it('allows it once the player holds every required item', () => {
    inventoryManager.addItem(ITEM, 1);
    cutsceneManager.registerCutscene(makeCutscene({ requiredItems: [ITEM] }));
    expect(cutsceneManager.startCutscene(CUTSCENE_ID)).toBe(true);
  });

  it('blocks a cutscene with flag requirements, since no flag system exists yet', () => {
    cutsceneManager.registerCutscene(makeCutscene({ flags: ['some_flag'] }));
    expect(cutsceneManager.startCutscene(CUTSCENE_ID)).toBe(false);
  });
});
