import { NPCBehavior, type NPC, type Position } from '../../../types';
import { createLavaFrogWorkerNPC } from './lavaFrogWorker';

export const LAVA_LEAP_GUIDE_NAME = 'Cinder the Guide';

/** A familiar worker on safe ground, offering a voluntary crystal expedition. */
export function createLavaLeapGuide(id: string, position: Position): NPC {
  const worker = createLavaFrogWorkerNPC(id, position, LAVA_LEAP_GUIDE_NAME);
  return {
    ...worker,
    behavior: NPCBehavior.STATIC,
    dialogue: [
      {
        id: 'greeting',
        text: "Ribbit! Welcome to the warm bits! I'm Cinder. We workers have a favourite shortcut across the lava rivers, but visitors need a little crystal magic. Fancy trying Lava Leap? I've left safe havens along the way, just in case your boots get adventurous.",
        responses: [
          { text: 'How do the crystals work?', nextId: 'lava_leap_crystals' },
          { text: 'How do I start?', nextId: 'lava_leap_start' },
          { text: 'Tell me about your work.', nextId: 'about_mining' },
          { text: 'Perhaps later. Thank you!' },
        ],
      },
      {
        id: 'lava_leap_crystals',
        text: "Frost cools a little patch of lava into a stepping stone. Further along, you'll find Wind, which lifts you over the rocky ridges. Choose the crystal that suits the crossing! Watch the chutes: an amber glow means an eruption is coming. There's no rush, and I'll whisk you to a safe haven if you slip.",
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
