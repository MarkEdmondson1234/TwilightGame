import type { ActivityLeadId } from './activityDiscovery';
import { ITEMS } from '../data/items';
import { RECIPES } from '../data/recipes';
import { POTION_RECIPES } from '../data/potionRecipes';

interface NewsMilestone {
  title: string;
  story: string;
  /** Bullet text read after "A neighbour" / "3 neighbours" — keep it to a few words. */
  headline: string;
  lead?: ActivityLeadId;
  itemId?: string;
}

/** Authored, spoiler-light news. Never render arbitrary shared event text as a quest instruction. */
export const NEWS_MILESTONES: Record<string, NewsMilestone> = {
  'tiny-wreath': {
    title: 'A little wreath of their own',
    headline: 'made a little wreath',
    story:
      'A neighbour has made a starter wreath. Ask Mum about Mushra’s flower basket, then try the crafting table upstairs at home.',
    lead: 'tiny-wreath',
    itemId: 'crop_lavender',
  },
  'crate-trail': {
    title: 'A clear path through the crates',
    headline: 'solved the Crate Trail',
    story:
      'A neighbour has solved the village child’s Crate Trail. She has a short puzzle for you to try, too, with hints and as many retries as you like.',
    lead: 'crate-trail',
  },
  painting: {
    title: 'A new picture at home',
    headline: 'painted a picture',
    story:
      'A neighbour has made and displayed a kitchen picture. Mum has a starter canvas and an easel for you, upstairs at home.',
    lead: 'painting',
    itemId: 'easel',
  },
  cooking: {
    title: 'Something delicious is cooking',
    headline: 'cooked something tasty',
    story: 'A neighbour has cooked a dish. Mum might have a recipe for you to try, too.',
    lead: 'cooking',
    itemId: 'food_tea',
  },
  brewing: {
    title: 'A little bottled magic',
    headline: 'brewed a potion',
    story:
      'A neighbour has brewed a potion. There are magical lessons to discover through friendship and exploration.',
    lead: 'brewing',
  },
  gardening: {
    title: 'A harvest worth celebrating',
    headline: 'gathered a harvest',
    story:
      'A neighbour has gathered a harvest. Ask Elias about seeds and tending a garden of your own.',
    lead: 'gardening',
    itemId: 'seed_radish',
  },
  skiing: {
    title: 'An adventure in the snow',
    headline: 'went skiing',
    story:
      'A neighbour has discovered skiing. Winter forest trails offer firewood and places to explore.',
    lead: 'skiing',
    itemId: 'tool_skis',
  },
  'pumpkin-carving': {
    title: 'A pumpkin with personality',
    headline: 'carved a pumpkin',
    story:
      'A neighbour has discovered pumpkin carving. The village child can show you how in autumn.',
    lead: 'pumpkin-carving',
    itemId: 'crop_pumpkin',
  },
  'wreath-making': {
    title: 'Flowers for a doorway',
    headline: 'made a wreath',
    story:
      'A neighbour has discovered wreath-making. Forest Mushra can help you arrange flowers all year round.',
    lead: 'wreath-making',
    itemId: 'lavender',
  },
  'lava-leap': {
    title: 'A rumour from the mines',
    headline: 'found a crystal challenge in the mines',
    story:
      'A neighbour has discovered a crystal challenge. As you explore the mines, look for Cinder the Guide.',
    lead: 'lava-leap',
  },
};

/**
 * Milestones that can name what was made, as `<kind>:<id>` — "learned to cook Tea" inspires
 * far more than "cooked a dish". The id is only ever looked up in our own data: the name a
 * reader sees comes from the local catalogue, never from text another player wrote.
 */
const DETAILED_MILESTONES: Record<
  string,
  (id: string) => { headline: string; itemId?: string } | undefined
> = {
  cooking: (id) => {
    const recipe = Object.hasOwn(RECIPES, id) ? RECIPES[id] : undefined;
    return (
      recipe && { headline: `learned to cook ${recipe.displayName}`, itemId: recipe.resultItemId }
    );
  },
  brewing: (id) => {
    const recipe = Object.hasOwn(POTION_RECIPES, id) ? POTION_RECIPES[id] : undefined;
    return (
      recipe && { headline: `learned to brew ${recipe.displayName}`, itemId: recipe.resultItemId }
    );
  },
  gardening: (id) => {
    const crop = Object.hasOwn(ITEMS, id) ? ITEMS[id] : undefined;
    return crop && { headline: `grew their first ${crop.displayName}`, itemId: id };
  },
};

/** True for kinds whose news should name the recipe or crop rather than be published bare. */
export function isDetailedMilestoneKind(kind: string): boolean {
  return Object.hasOwn(DETAILED_MILESTONES, kind);
}

/** The authored milestone for an id (`skiing`, or `cooking:tea`), or undefined if unknown. */
export function resolveMilestone(milestoneId: string): NewsMilestone | undefined {
  const [kind, detail, ...rest] = milestoneId.split(':');
  if (rest.length || !Object.hasOwn(NEWS_MILESTONES, kind)) return undefined;
  const base = NEWS_MILESTONES[kind];
  if (detail === undefined) return base;
  if (!isDetailedMilestoneKind(kind)) return undefined;
  const specific = DETAILED_MILESTONES[kind](detail);
  return specific && { ...base, ...specific, itemId: specific.itemId ?? base.itemId };
}

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
  headline: string;
  lead?: ActivityLeadId;
  itemId?: string;
  neighbours: number;
}
export type VillageNewsResult =
  | { status: 'ready'; events: NewsEvent[]; ownContributorId: string; truncated: boolean }
  | { status: 'unavailable' };

/** One bullet: "A neighbour made a wreath!" / "3 neighbours made a wreath!" */
export function newsBullet(story: Pick<NewsStory, 'headline' | 'neighbours'>): string {
  const who = story.neighbours > 1 ? `${story.neighbours} neighbours` : 'A neighbour';
  return `${who} ${story.headline}!`;
}

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

/**
 * Only authored milestones become news. Quest progress, discoveries and other shared events
 * are deliberately dropped: "a neighbour made progress on an adventure" tells a reader nothing
 * they could go and try.
 */
export function summariseNews(events: NewsEvent[], ownId: string, after?: NewsCursor): NewsStory[] {
  const groups = new Map<string, { story: NewsStory; contributors: Set<string> }>();
  for (const event of [...events].sort((a, b) => compareNews(b, a))) {
    if (event.contributorId === ownId || (after && compareNews(event, after) <= 0)) continue;
    const key = typeof event.metadata?.milestoneId === 'string' ? event.metadata.milestoneId : '';
    const known = resolveMilestone(key);
    if (!known) continue;
    let group = groups.get(key);
    if (!group) {
      group = { story: { key, ...known, neighbours: 0 }, contributors: new Set() };
      groups.set(key, group);
    }
    group.contributors.add(event.contributorId);
    group.story.neighbours = group.contributors.size;
  }
  return [...groups.values()].map((g) => g.story);
}
