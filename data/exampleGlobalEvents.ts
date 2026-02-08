/**
 * Example Global Events
 *
 * Cosy collaborative events that serve as templates for future
 * AI-generated events. Each event type has multiple examples
 * showing the tone, format, and level of detail expected.
 *
 * These are used by the DevTools Events section to test the
 * global event system and as reference for creating new events.
 */

import type { SharedEventType } from '../firebase/types';

export interface ExampleGlobalEvent {
  eventType: SharedEventType;
  title: string;
  description: string;
  contributorName: string;
  location?: { mapId: string; mapName: string };
  metadata?: Record<string, unknown>;
}

// ============================================
// Discovery Events
// ============================================

const DISCOVERY_EVENTS: ExampleGlobalEvent[] = [
  {
    eventType: 'discovery',
    title: 'Rare mushroom spotted',
    description: 'discovered a luminescent toadstool glowing softly beneath the old oak',
    contributorName: 'A curious traveller',
    location: { mapId: 'forest_clearing', mapName: 'Forest Clearing' },
  },
  {
    eventType: 'discovery',
    title: 'Hidden path found',
    description: 'stumbled upon a mossy path leading deeper into the ancient woods',
    contributorName: 'An adventurous villager',
    location: { mapId: 'deep_forest', mapName: 'Deep Forest' },
  },
  {
    eventType: 'discovery',
    title: 'Moonpetals in bloom',
    description: 'found moonpetals blooming under the starlight by the stream',
    contributorName: 'A night-wandering traveller',
    location: { mapId: 'forest_stream', mapName: 'Forest Stream' },
  },
  {
    eventType: 'discovery',
    title: 'Frost flowers appeared',
    description: 'noticed delicate frost flowers forming on the cave entrance rocks',
    contributorName: 'A keen-eyed herbalist',
    location: { mapId: 'cave_entrance', mapName: 'Cave Entrance' },
  },
  {
    eventType: 'discovery',
    title: 'Ancient recipe fragment',
    description: 'found a tattered page with an old recipe tucked inside a hollow tree',
    contributorName: 'A wandering scholar',
    location: { mapId: 'forest_clearing', mapName: 'Forest Clearing' },
  },
];

// ============================================
// Achievement Events
// ============================================

const ACHIEVEMENT_EVENTS: ExampleGlobalEvent[] = [
  {
    eventType: 'achievement',
    title: "Witch's garden mastered",
    description: "completed the witch's garden challenge and grew three rare crops",
    contributorName: 'A budding apprentice',
  },
  {
    eventType: 'achievement',
    title: 'Master chef crowned',
    description: 'mastered all savoury recipes and earned praise from Mum',
    contributorName: 'A dedicated cook',
  },
  {
    eventType: 'achievement',
    title: 'Fairy form achieved',
    description: 'drank the Fairy Form Potion and visited the Fairy Queen',
    contributorName: 'A brave traveller',
  },
  {
    eventType: 'achievement',
    title: 'Full harvest gathered',
    description: 'harvested every crop type in a single season for the first time',
    contributorName: 'A patient farmer',
  },
  {
    eventType: 'achievement',
    title: 'Village friendships blooming',
    description: 'became good friends with every villager in the community',
    contributorName: 'A kind soul',
  },
];

// ============================================
// Seasonal Events
// ============================================

const SEASONAL_EVENTS: ExampleGlobalEvent[] = [
  {
    eventType: 'seasonal',
    title: 'Cherry blossoms have arrived',
    description: 'noticed the first cherry blossoms drifting through the village square',
    contributorName: 'An early riser',
    location: { mapId: 'village', mapName: 'Village' },
    metadata: { season: 'spring' },
  },
  {
    eventType: 'seasonal',
    title: 'Summer fireflies dancing',
    description: 'spotted the first fireflies of summer twinkling near the pond',
    contributorName: 'A twilight wanderer',
    location: { mapId: 'village', mapName: 'Village' },
    metadata: { season: 'summer' },
  },
  {
    eventType: 'seasonal',
    title: 'Autumn leaves falling',
    description: 'watched the first golden leaves spiral down from the village tree',
    contributorName: 'A thoughtful villager',
    location: { mapId: 'village', mapName: 'Village' },
    metadata: { season: 'autumn' },
  },
  {
    eventType: 'seasonal',
    title: 'First snowfall of winter',
    description: 'caught the first snowflakes settling softly on the cottage rooftops',
    contributorName: 'A warmly-wrapped traveller',
    location: { mapId: 'village', mapName: 'Village' },
    metadata: { season: 'winter' },
  },
  {
    eventType: 'seasonal',
    title: 'Wild strawberries ripening',
    description: 'found the first ripe wild strawberries growing beside the forest path',
    contributorName: 'A forager',
    location: { mapId: 'forest_clearing', mapName: 'Forest Clearing' },
    metadata: { season: 'summer' },
  },
];

// ============================================
// Community Events
// ============================================

const COMMUNITY_EVENTS: ExampleGlobalEvent[] = [
  {
    eventType: 'community',
    title: 'Village crops milestone',
    description: 'helped the village reach 100 crops grown together this season',
    contributorName: 'The farming community',
    metadata: { milestone: 'crops_100', count: 100 },
  },
  {
    eventType: 'community',
    title: 'Mushroom collectors unite',
    description: 'contributed to the community mushroom collection reaching 50 specimens',
    contributorName: 'The foraging guild',
    metadata: { milestone: 'mushrooms_50', count: 50 },
  },
  {
    eventType: 'community',
    title: 'Friendship blossoms',
    description: 'helped bring the total village friendship hearts to a new record',
    contributorName: 'A warm-hearted neighbour',
    metadata: { milestone: 'friendship_hearts', count: 200 },
  },
  {
    eventType: 'community',
    title: 'Recipes shared far and wide',
    description: 'helped the village recipe book grow to include 25 mastered dishes',
    contributorName: 'The cooking circle',
    metadata: { milestone: 'recipes_25', count: 25 },
  },
  {
    eventType: 'community',
    title: 'Paintings adorning the village',
    description: 'helped fill the village gallery with 10 beautiful paintings',
    contributorName: 'The art collective',
    metadata: { milestone: 'paintings_10', count: 10 },
  },
];

// ============================================
// Mystery Events
// ============================================

const MYSTERY_EVENTS: ExampleGlobalEvent[] = [
  {
    eventType: 'mystery',
    title: 'Strange lights in the forest',
    description: 'saw peculiar twinkling lights deep in the forest after midnight',
    contributorName: 'A sleepless wanderer',
    location: { mapId: 'deep_forest', mapName: 'Deep Forest' },
  },
  {
    eventType: 'mystery',
    title: 'Whispers on the wind',
    description: 'heard faint whispers carried on the autumn breeze near the old well',
    contributorName: 'A quiet observer',
    location: { mapId: 'village', mapName: 'Village' },
  },
  {
    eventType: 'mystery',
    title: 'Footprints in the snow',
    description: 'found tiny, mysterious footprints in the fresh snow leading nowhere',
    contributorName: 'An early morning walker',
    location: { mapId: 'village', mapName: 'Village' },
    metadata: { season: 'winter' },
  },
  {
    eventType: 'mystery',
    title: 'The singing cave',
    description: 'heard a gentle melody echoing from deep within the cave at dusk',
    contributorName: 'A curious explorer',
    location: { mapId: 'cave_entrance', mapName: 'Cave Entrance' },
  },
  {
    eventType: 'mystery',
    title: 'Flowers blooming at midnight',
    description: 'discovered a circle of flowers that only bloom under the full moon',
    contributorName: 'A moonlight gardener',
    location: { mapId: 'forest_clearing', mapName: 'Forest Clearing' },
  },
];

// ============================================
// Combined Export
// ============================================

/** All example events, sorted by type */
export const EXAMPLE_GLOBAL_EVENTS: ExampleGlobalEvent[] = [
  ...DISCOVERY_EVENTS,
  ...ACHIEVEMENT_EVENTS,
  ...SEASONAL_EVENTS,
  ...COMMUNITY_EVENTS,
  ...MYSTERY_EVENTS,
];

/** Get example events by type */
export function getExampleEventsByType(type: SharedEventType): ExampleGlobalEvent[] {
  return EXAMPLE_GLOBAL_EVENTS.filter((e) => e.eventType === type);
}

/** Get a random example event */
export function getRandomExampleEvent(): ExampleGlobalEvent {
  return EXAMPLE_GLOBAL_EVENTS[Math.floor(Math.random() * EXAMPLE_GLOBAL_EVENTS.length)];
}

/** Get a random example event of a specific type */
export function getRandomExampleEventByType(type: SharedEventType): ExampleGlobalEvent {
  const events = getExampleEventsByType(type);
  return events[Math.floor(Math.random() * events.length)];
}
