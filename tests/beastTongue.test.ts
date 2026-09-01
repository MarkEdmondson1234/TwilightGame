/** @vitest-environment node */
import { describe, it, expect, afterEach } from 'vitest';
import { getDialogue } from '../services/dialogueService';
import { gameState } from '../GameState';
import { applyPotionEffect, MagicEffectCallbacks } from '../utils/MagicEffects';
import { POTION_EFFECT_DISPLAY } from '../components/PotionEffectIndicator';
import { TimeManager } from '../utils/TimeManager';
import { createCatNPC } from '../utils/npcs/village/cat';
import { createDogNPC } from '../utils/npcs/village/dog';
import { createDuckNPC } from '../utils/npcs/village/duck';
import { createSparrowNPC } from '../utils/npcs/forest/sparrow';
import { createPossumNPC } from '../utils/npcs/forest/possum';
import { createBunnyflyNPC } from '../utils/npcs/forest/bunnyfly';
import { createUmbraWolfNPC } from '../utils/npcs/forest/umbraWolf';
import { createCowNPC } from '../utils/npcs/farmNPCs';
import { NPC } from '../types';

/**
 * Beast Tongue is the only potion whose whole payoff lives in other files: the potion sets
 * an effect flag, and eight separate animal NPC modules each hand-copy
 * `requiredPotionEffect: 'beast_tongue'` / `hiddenWithPotionEffect: 'beast_tongue'` onto
 * their dialogue nodes. A typo in any one of those strings, or a change to the filtering in
 * dialogueService, silently leaves that animal saying "*purr*" forever with nothing failing.
 *
 * This pins the round trip — drink the potion, the animal talks; let it lapse, it does not.
 */

const ORIGIN = { x: 0, y: 0 };

const ANIMALS: Array<{ label: string; create: () => NPC }> = [
  { label: 'Cat', create: () => createCatNPC('cat_test', ORIGIN) },
  { label: 'Dog', create: () => createDogNPC('dog_test', ORIGIN, 'child_test') },
  { label: 'Duck', create: () => createDuckNPC('duck_test', ORIGIN) },
  { label: 'Sparrow', create: () => createSparrowNPC('sparrow_test', ORIGIN) },
  { label: 'Possum', create: () => createPossumNPC('possum_test', ORIGIN) },
  { label: 'Bunnyfly', create: () => createBunnyflyNPC('bunnyfly_test', ORIGIN) },
  { label: 'Umbra Wolf', create: () => createUmbraWolfNPC('umbrawolf_test', ORIGIN) },
  { label: 'Cow', create: () => createCowNPC('cow_test', ORIGIN) },
];

/** Nodes only readable with the potion active are the ones tagged for it. */
const isBeastNode = (nodeId: string | undefined, npc: NPC) =>
  npc.dialogue.find((n) => n.id === nodeId)?.requiredPotionEffect === 'beast_tongue';

describe('Beast Tongue potion', () => {
  afterEach(() => gameState.clearActivePotionEffect('beast_tongue'));

  it('opens animal speech for every animal, and only while active', async () => {
    const problems: string[] = [];

    for (const { label, create } of ANIMALS) {
      const npc = create();

      gameState.clearActivePotionEffect('beast_tongue');
      const without = await getDialogue(npc, 'greeting');
      if (isBeastNode(without?.id, npc)) {
        problems.push(
          `${label}: shows beast-tongue node "${without?.id}" with no potion active — ` +
            `its ordinary dialogue is missing a hiddenWithPotionEffect guard, or the ` +
            `beast node is missing requiredPotionEffect: 'beast_tongue'.`
        );
      }

      gameState.setActivePotionEffect('beast_tongue', TimeManager.MS_PER_GAME_DAY);
      const withPotion = await getDialogue(npc, 'greeting');
      if (!isBeastNode(withPotion?.id, npc)) {
        problems.push(
          `${label}: still shows "${withPotion?.id}" with Beast Tongue active — ` +
            `check requiredPotionEffect/hiddenWithPotionEffect spelling in its dialogue nodes.`
        );
      }
    }

    expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
  });

  it('lasts a full game day, so it survives the walk to the forest animals', () => {
    const set: Array<[string, number]> = [];
    const callbacks = {
      showToast: () => {},
      getPlayerPosition: () => ORIGIN,
      setActivePotionEffect: (type: string, ms: number) => set.push([type, ms]),
    } as unknown as MagicEffectCallbacks;

    const result = applyPotionEffect('potion_beast_tongue', callbacks);

    expect(result.success).toBe(true);
    expect(set).toEqual([['beast_tongue', TimeManager.MS_PER_GAME_DAY]]);
  });

  it('shows a HUD badge, so a lapsed potion never looks like a broken one', () => {
    expect(POTION_EFFECT_DISPLAY.beast_tongue).toBeDefined();
  });
});
