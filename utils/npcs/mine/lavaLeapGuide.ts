import { NPCBehavior, type NPC, type Position } from '../../../types';
import { createLavaFrogWorkerNPC } from './lavaFrogWorker';
import { LAVA_LEAP_QUEST } from '../../../minigames/lava-leap/progression';

export const LAVA_LEAP_GUIDE_NAME = 'Cinder the Guide';

/** A worker guarding the deeper lava passage and teaching the crystal expedition. */
export function createLavaLeapGuide(id: string, position: Position): NPC {
  const worker = createLavaFrogWorkerNPC(id, position, LAVA_LEAP_GUIDE_NAME);
  return {
    ...worker,
    behavior: NPCBehavior.STATIC,
    dialogue: [
      {
        id: 'passage_open',
        requiredQuest: LAVA_LEAP_QUEST,
        requiredQuestStage: 1,
        text: 'Ribbit! You made it through the crystal passages! The way deeper is open for you now. Fancy exploring a different route? Choose Lava Leap when you interact with me.',
        responses: [
          { text: 'Thank you, Cinder!' },
          { text: 'Remind me about the crystals.', nextId: 'lava_leap_crystals' },
        ],
      },
      {
        id: 'greeting',
        hiddenIfQuestAtMinStage: { questId: LAVA_LEAP_QUEST, stage: 1 },
        text: "Ribbit! I'm Cinder, keeper of the deeper passage. Before I let you through, you'll need to learn our crystal magic. Complete Lava Leap and one of its three cave passages, and I'll open the way. There are safe havens throughout, and you can always head back to the mines.",
        responses: [
          { text: 'How do the crystals work?', nextId: 'lava_leap_crystals' },
          { text: 'How do I start?', nextId: 'lava_leap_start' },
          { text: 'Tell me about your work.', nextId: 'about_mining' },
          { text: 'Perhaps later. Thank you!' },
        ],
      },
      {
        id: 'lava_leap_crystals',
        text: "Frost makes stepping stones, Wind lifts you to high ledges, and Earth seals a nearby lava vent for four seconds. At the junction, choose the Crystal Grotto, Mushroom Heights or Old Forge. Finish any one to earn passage. I'll whisk you to a safe haven if you slip.",
        responses: [{ text: 'How do I start?', nextId: 'lava_leap_start' }],
      },
      {
        id: 'lava_leap_start',
        text: "Close our chat, then click or tap me and choose Lava Leap. I'll lend you the first crystal. Keep an eye out for the treasures we dropped on our last shift! You can return here whenever you like.",
      },
      ...worker.dialogue.filter((node) => node.id !== 'greeting'),
    ],
  };
}
