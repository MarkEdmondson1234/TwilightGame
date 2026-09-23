/** Small, authored leads. These record knowledge, never quest completion. */
export type ActivityLeadId =
  | 'tiny-wreath'
  | 'crate-trail'
  | 'painting'
  | 'skiing'
  | 'pumpkin-carving'
  | 'wreath-making'
  | 'lava-leap'
  | 'cooking'
  | 'brewing'
  | 'gardening';

export interface ActivityLead {
  id: ActivityLeadId;
  title: string;
  itemId?: string;
  invitation: string;
  directions: string;
}

export const ACTIVITY_LEADS: ActivityLead[] = [
  {
    id: 'tiny-wreath',
    title: 'Mushra’s Tiny Wreath',
    itemId: 'crop_lavender',
    invitation:
      'Mum smiles. “Mushra left you a basket of dried flowers, and a little flower workshop upstairs in your room to try!”',
    directions:
      'Ask Mum in the kitchen about making a little wreath for four starter flowers. Go upstairs to your room, tap the crafting table and choose Make a Wreath. Select a flower, tap the ring, and repeat until you have at least four. Create Wreath puts your decoration in your bag and uses the arranged materials. No gold fee; available all year.',
  },
  {
    id: 'crate-trail',
    title: 'The child’s Crate Trail',
    invitation:
      'The village child sketches a delivery path in the dirt. “Oh no! Crates everywhere! Can you help me get through?”',
    directions:
      'Interact with the village child and choose Play Crate Trail. Push crates to reach the golden door. Try Undo, Restart or Hint whenever you like. It costs nothing and is available all year. This is a small practice puzzle; the harder Test of Wits waits in the Wizard Trials deep in the mines.',
  },
  {
    id: 'painting',
    title: 'A Picture for the Kitchen',
    itemId: 'easel',
    invitation:
      'Mum has set out an easel beside the stairs. “This kitchen could use a picture of somewhere you love. Shall we make one?”',
    directions:
      'Ask Mum at home about making a picture. She has one starter canvas for you. Tap the easel beside the kitchen stairs, choose Draw, make a picture, name it and Save. Select Framed Painting in your bag, then tap a clear spot in the kitchen to place it. Tell Mum when it is on display.',
  },
  {
    id: 'cooking',
    title: 'A dish of your own',
    itemId: 'food_tea',
    invitation: 'Mum sets a cup beside the warm kettle. “Shall we make your first tea together?”',
    directions:
      "Talk to Mum at home and ask her to teach you to cook. In Mum's kitchen, open your recipe book, select Tea and Cook, or choose Make Tea at the Fireplace. Mum helps with missing ingredients for your first practice cup after you ask her to teach you. Your tea goes into your bag. Ask Mum to teach you to cook again to choose your next lesson.",
  },
  {
    id: 'gardening',
    title: 'A garden of your own',
    itemId: 'seed_radish',
    invitation: 'Elias can help you get growing.',
    directions:
      'Find Elias in the village and ask about helping with the garden. He offers seasonal seeds and tasks. Winter is a time to plan; return in spring for planting.',
  },
  {
    id: 'brewing',
    title: 'Rumours of bottled magic',
    invitation: 'Someone in the village has learned to brew potions.',
    directions:
      'Follow Elias’s gardening and friendship stories towards the fairies. As your own story unfolds, ask Althea about magic. If you are already an apprentice, visit your teacher and consult your magic recipe book for the next potion and its ingredients.',
  },
  {
    id: 'skiing',
    title: 'Through the winter woods',
    itemId: 'tool_skis',
    invitation:
      'Snow blankets the forest paths. With skis, you could race through the trees, gather firewood and stop to explore deeper in the woods.',
    directions:
      'Mr Fox sells skis in the village shop. Bring them to a forest in winter, open your bag, select the skis and choose Go Skiing. Stop safely to explore; a tumble returns you to the entrance with some of your firewood.',
  },
  {
    id: 'pumpkin-carving',
    title: 'A pumpkin with personality',
    itemId: 'crop_pumpkin',
    invitation:
      'The village child is full of ideas for spooky pumpkin faces. Perhaps you could make one together?',
    directions:
      'In autumn, bring a pumpkin to the village child. Interact with her and choose Carve Pumpkin. Mr Fox sells pumpkin seeds for growing your own. One pumpkin is used when you finish carving; you can come back to make another.',
  },
  {
    id: 'wreath-making',
    title: 'Flowers for your door',
    itemId: 'lavender',
    invitation:
      'Mushra knows how to turn gathered flowers into beautiful wreaths. You could make a decoration of your own.',
    directions:
      'Interact with Mushra in the mushroom forest and choose Make a Wreath, or use a crafting table. Bring flowers and try arranging them. Wreath-making is available all year; the autumn village workshop is a separate project.',
  },
  {
    id: 'lava-leap',
    title: "Cinder's crystal paths",
    invitation:
      'Cinder guards the way deeper. His crystals can make stepping stones, lift you over lava and seal vents. He can teach you to use them.',
    directions:
      'Interact with Cinder the Guide and choose Lava Leap. Learn the crystal powers, then finish one of the three cave passages to open the way deeper. Safe havens help you recover from a slip. Return to Cinder to try another route.',
  },
];

export function canSkiHere(mapId: string, season: string): boolean {
  return (
    season.toLowerCase() === 'winter' && (mapId.startsWith('forest') || mapId === 'deep_forest')
  );
}

export interface DiscoveryContext {
  mapId: string;
  season: string;
  nearbyNpcs: Array<{ id: string; name: string }>;
}

/** Ordered candidates; callers suppress remembered invitations. No remote/unavailable hosts. */
export function getActivityCandidates(
  ctx: DiscoveryContext
): Array<{ id: ActivityLeadId; npcId?: string }> {
  const candidates: Array<{ id: ActivityLeadId; npcId?: string }> = [];
  for (const npc of ctx.nearbyNpcs) {
    if (ctx.mapId === 'mums_kitchen' && npc.id === 'mum_kitchen') {
      candidates.push({ id: 'cooking', npcId: npc.id });
      candidates.push({ id: 'painting', npcId: npc.id });
      candidates.push({ id: 'tiny-wreath', npcId: npc.id });
    }
    if (npc.name === 'Cinder the Guide') candidates.push({ id: 'lava-leap', npcId: npc.id });
    if (npc.id === 'mushra') candidates.push({ id: 'wreath-making', npcId: npc.id });
    if (npc.id === 'child') candidates.push({ id: 'crate-trail', npcId: npc.id });
    if (npc.id === 'child' && ctx.season.toLowerCase() === 'autumn') {
      candidates.push({ id: 'pumpkin-carving', npcId: npc.id });
    }
  }
  if (canSkiHere(ctx.mapId, ctx.season)) candidates.push({ id: 'skiing' });
  return candidates;
}
