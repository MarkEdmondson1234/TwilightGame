/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ bookUnlocked: false, milestones: new Set<string>() }));

vi.mock('../utils/MagicManager', () => ({
  magicManager: { isMagicBookUnlocked: () => state.bookUnlocked },
}));
vi.mock('../utils/FriendshipManager', () => ({
  friendshipManager: {
    hasNpcMilestone: (npcId: string, key: string) => state.milestones.has(`${npcId}_${key}`),
    markNpcMilestone: (npcId: string, key: string) => state.milestones.add(`${npcId}_${key}`),
  },
}));

import { ITEMS } from '../data/items';
import { createGoddessOfEyesNPC, GODDESS_OF_EYES_ID } from '../utils/npcs/goddessOfEyes';
import {
  handleGoddessOfEyesActions,
  isGoddessOfEyesNpc,
} from '../data/questHandlers/goddessOfEyesHandler';

const dialogue = createGoddessOfEyesNPC(GODDESS_OF_EYES_ID, { x: 0, y: 0 }).dialogue;
const nodeIds = new Set(dialogue.map((node) => node.id));

beforeEach(() => {
  state.bookUnlocked = false;
  state.milestones.clear();
});

describe('Goddess of Eyes dialogue', () => {
  it('has no responses leading to a missing node', () => {
    const broken = dialogue.flatMap((node) =>
      (node.responses ?? [])
        .filter((r) => r.nextId && !nodeIds.has(r.nextId))
        .map((r) => `${node.id} → ${r.nextId}`)
    );
    expect(broken, 'Add these nodes to utils/npcs/goddessOfEyes.ts').toEqual([]);
  });

  it('greets a first visitor according to whether their magic book is unlocked', () => {
    expect(handleGoddessOfEyesActions('greeting')).toBe('goe_first_locked');
    state.bookUnlocked = true;
    expect(handleGoddessOfEyesActions('greeting')).toBe('goe_first_unlocked');
  });

  it('only counts as met once the first conversation is finished', () => {
    // Leaving halfway must replay the introduction (and its seeds) next time.
    handleGoddessOfEyesActions('goe_first_locked_wares');
    expect(handleGoddessOfEyesActions('greeting')).toBe('goe_first_locked');

    handleGoddessOfEyesActions('goe_first_locked_fairies');
    expect(handleGoddessOfEyesActions('greeting')).toBe('goe_return');
  });

  it('every redirect target exists', () => {
    for (const unlocked of [false, true]) {
      state.bookUnlocked = unlocked;
      expect(nodeIds).toContain(handleGoddessOfEyesActions('greeting'));
    }
    state.milestones.add(`${GODDESS_OF_EYES_ID}_met`);
    expect(nodeIds).toContain(handleGoddessOfEyesActions('greeting'));
  });

  it('gives fairy bluebell seeds that exist, on the locked first visit', () => {
    const gifts = dialogue
      .find((n) => n.id === 'goe_first_locked_wares')
      ?.responses?.flatMap((r) => r.givesItems ?? []);
    expect(gifts?.map((g) => g.itemId)).toEqual(['seed_fairy_bluebell']);
    expect(ITEMS.seed_fairy_bluebell).toBeDefined();
  });

  it('recognises both the shop and the debug-map Goddess', () => {
    expect(isGoddessOfEyesNpc(GODDESS_OF_EYES_ID)).toBe(true);
    expect(isGoddessOfEyesNpc('debug_goddess_of_eyes')).toBe(true);
    expect(isGoddessOfEyesNpc('mushra')).toBe(false);
  });
});
