/**
 * Interaction provider registry.
 *
 * ORDER MATTERS. Providers run top to bottom and their interactions are concatenated in
 * that order, which is the order the radial menu presents them to the player. Reordering
 * this list changes the on-screen menu, so only do it deliberately.
 *
 * To add a new interaction: create a provider in ./providers/, then add one line here.
 * See ./README.md.
 */

import type { InteractionProvider } from './types';

import { shopCounterProvider } from './providers/shopCounters';
import { placedItemProvider } from './providers/placedItems';
import { mirrorProvider } from './providers/mirror';
import { npcProvider } from './providers/npc';
import { transitionProvider } from './providers/transition';
import { cookingProvider } from './providers/cooking';
import { waterProvider } from './providers/water';
import { berryProvider } from './providers/berries';
import { leafPileProvider } from './providers/leaves';
import { fruitTreeProvider } from './providers/fruitTrees';
import { farmingProvider } from './providers/farming';
import { forageProvider } from './providers/forage';
import { deskProvider } from './providers/desk';
import { decorationPlacementProvider } from './providers/decorationPlacement';
import { mapLocationProvider } from './providers/mapLocation';
import { snowAngelProvider } from './providers/snowAngel';
import { curtainProvider } from './providers/curtains';

export const INTERACTION_PROVIDERS: InteractionProvider[] = [
  // Exclusive — a shop counter fully owns the click.
  shopCounterProvider,

  // World objects the player clicks directly.
  placedItemProvider,
  mirrorProvider,
  npcProvider,
  transitionProvider,
  mapLocationProvider,

  // Stations and resources.
  cookingProvider,
  waterProvider,

  // Gathering.
  berryProvider,
  leafPileProvider,
  fruitTreeProvider,
  farmingProvider,
  forageProvider,

  // Placement and furnishing.
  deskProvider,
  decorationPlacementProvider,

  // Seasonal play.
  snowAngelProvider,

  curtainProvider,
];
