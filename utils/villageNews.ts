import type { ActivityLeadId } from './activityDiscovery';

/** Authored, spoiler-light news. Never render arbitrary shared event text as a quest instruction. */
export const NEWS_MILESTONES: Record<
  string,
  { title: string; story: string; lead?: ActivityLeadId; itemId?: string }
> = {
  'tiny-wreath': {
    title: 'A little wreath of their own',
    story:
      'A neighbour has made a starter wreath. Ask Mum about Mushra’s flower basket, then try the crafting table upstairs at home.',
    lead: 'tiny-wreath',
    itemId: 'crop_lavender',
  },
  'crate-trail': {
    title: 'A clear path through the crates',
    story:
      'A neighbour has solved the village child’s Crate Trail. She has a short puzzle for you to try, too, with hints and as many retries as you like.',
    lead: 'crate-trail',
  },
  painting: {
    title: 'A new picture at home',
    story:
      'A neighbour has made and displayed a kitchen picture. Mum has an easel and a starter canvas if you would like to try.',
    lead: 'painting',
    itemId: 'easel',
  },
  cooking: {
    title: 'Something delicious is cooking',
    story: 'A neighbour has cooked a dish. Mum might have a recipe for you to try, too.',
    lead: 'cooking',
    itemId: 'food_tea',
  },
  brewing: {
    title: 'A little bottled magic',
    story:
      'A neighbour has brewed a potion. There are magical lessons to discover through friendship and exploration.',
    lead: 'brewing',
  },
  gardening: {
    title: 'A harvest worth celebrating',
    story:
      'A neighbour has gathered a harvest. Ask Elias about seeds and tending a garden of your own.',
    lead: 'gardening',
    itemId: 'seed_radish',
  },
  skiing: {
    title: 'An adventure in the snow',
    story:
      'A neighbour has discovered skiing. Winter forest trails offer firewood and places to explore.',
    lead: 'skiing',
    itemId: 'tool_skis',
  },
  'pumpkin-carving': {
    title: 'A pumpkin with personality',
    story:
      'A neighbour has discovered pumpkin carving. The village child can show you how in autumn.',
    lead: 'pumpkin-carving',
    itemId: 'crop_pumpkin',
  },
  'wreath-making': {
    title: 'Flowers for a doorway',
    story:
      'A neighbour has discovered wreath-making. Forest Mushra can help you arrange flowers all year round.',
    lead: 'wreath-making',
    itemId: 'lavender',
  },
  'lava-leap': {
    title: 'A rumour from the mines',
    story:
      'A neighbour has discovered a crystal challenge. As you explore the mines, look for Cinder the Guide.',
    lead: 'lava-leap',
  },
};

export interface NewsCursor {
  seconds: number;
  nanoseconds: number;
  id: string;
}
export interface NewsEvent extends NewsCursor {
  contributorId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}
export interface NewsStory {
  key: string;
  title: string;
  story: string;
  lead?: ActivityLeadId;
  itemId?: string;
  neighbours: number;
}
export type VillageNewsResult =
  | { status: 'ready'; events: NewsEvent[]; ownContributorId: string; truncated: boolean }
  | { status: 'unavailable' };

export function compareNews(a: NewsCursor, b: NewsCursor): number {
  return (
    a.seconds - b.seconds ||
    a.nanoseconds - b.nanoseconds ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}
export function isNewsCursor(value: unknown): value is NewsCursor {
  if (!value || typeof value !== 'object') return false;
  const v = value as NewsCursor;
  return (
    Number.isSafeInteger(v.seconds) &&
    Number.isInteger(v.nanoseconds) &&
    v.nanoseconds >= 0 &&
    v.nanoseconds < 1e9 &&
    typeof v.id === 'string'
  );
}

export function summariseNews(events: NewsEvent[], ownId: string, after?: NewsCursor): NewsStory[] {
  const groups = new Map<string, { story: NewsStory; contributors: Set<string> }>();
  for (const event of [...events].sort((a, b) => compareNews(b, a))) {
    if (event.contributorId === ownId || (after && compareNews(event, after) <= 0)) continue;
    const milestone =
      typeof event.metadata?.milestoneId === 'string' ? event.metadata.milestoneId : '';
    const known = Object.hasOwn(NEWS_MILESTONES, milestone)
      ? NEWS_MILESTONES[milestone]
      : undefined;
    const key = known ? milestone : event.eventType;
    // Old story events remain useful news without disclosing endings or unverified destinations.
    const fallback =
      event.eventType === 'discovery'
        ? {
            title: 'Word of a discovery',
            story:
              'A neighbour found something interesting. Chat with villagers and keep an eye out while exploring.',
          }
        : event.eventType === 'seasonal' || event.eventType === 'community'
          ? {
              title: 'Life around the village',
              story:
                'Neighbours have been joining village activities. Ask around to see what is happening this season.',
            }
          : {
              title: 'A new chapter for a neighbour',
              story:
                'A neighbour has made progress on an adventure. Your own story is still yours to discover.',
            };
    let group = groups.get(key);
    if (!group) {
      group = { story: { key, ...(known ?? fallback), neighbours: 0 }, contributors: new Set() };
      groups.set(key, group);
    }
    group.contributors.add(event.contributorId);
    group.story.neighbours = group.contributors.size;
  }
  return [...groups.values()].map((g) => g.story);
}
