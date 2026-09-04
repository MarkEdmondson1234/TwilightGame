/**
 * Declarative table of tile/anchor-based forage sources.
 *
 * ORDER MATTERS. This array replaces the pre-refactor if-chain in
 * handleForageAction: sources are walked top to bottom and the first one whose
 * anchor is near the player owns the forage. Reordering changes which message
 * a player sees when standing near two forageables at once.
 *
 * Behaviour notes preserved from the original chain:
 *  - Sources whose tiles appear in EARLY_COOLDOWN_TILES (forageHandlers.ts)
 *    rely on that scan for their cooldown and declare no cooldownMessage.
 *  - ghost_lichen, giant_mushroom_cap and sakura_petal sources have NO
 *    cooldown check anywhere in the original chain — no cooldownMessage here
 *    keeps that (pre-existing) behaviour; stamina is the only limiter.
 */

import { TileType } from '../../types';
import { getLavaLakeAnchor } from '../mapUtils';
import { Season } from '../TimeManager';
import {
  nightGate,
  rollMoonpetalQuantity,
  seasonGate,
  weatherGate,
} from './helpers';
import type { ForageSource } from './types';

export const FORAGE_SOURCES: ForageSource[] = [
  // ── Moonpetal (deep forest sacred grove) — spring/summer, night only ──
  {
    label: 'moonpetal',
    tileTypes: [TileType.MOONPETAL],
    itemId: 'moonpetal',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate([Season.SPRING, Season.SUMMER], 'The moonpetal is dormant. It only blooms in spring and summer.'),
      nightGate('The moonpetal flowers are closed. They only bloom at night.'),
    ],
    failureMessage: 'You search amongst the moonpetals, but find none suitable for harvesting.',
    rollQuantity: rollMoonpetalQuantity,
  },

  // ── Addersmeat — night-blooming, spring/summer only ──
  {
    label: 'addersmeat',
    tileTypes: [TileType.ADDERSMEAT],
    itemId: 'addersmeat',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate(
        [Season.SPRING, Season.SUMMER],
        'The addersmeat is dormant underground. It only emerges in spring and summer.'
      ),
      nightGate('The addersmeat flowers are closed. They only bloom under the moonlight.'),
    ],
    failureMessage: 'You search amongst the addersmeat, but find none suitable for harvesting.',
  },

  // ── Phoenix ash (lava lakes in lava caverns) — any season ──
  {
    label: 'lava lake',
    tileTypes: [TileType.LAVA_LAKE_SM, TileType.LAVA_LAKE_MD, TileType.LAVA_LAKE_LG],
    itemId: 'phoenix_ash',
    fallbackSuccessRate: 0.6,
    // Player must be standing WITHIN the lake's visual footprint, not merely adjacent.
    findAnchor: (x, y) => getLavaLakeAnchor(x, y),
    failureMessage: 'You sift through the smouldering ash, but find nothing of value.',
  },

  // ── Wolfsbane (2×2 forageable plant) — dormant in winter ──
  {
    label: 'wolfsbane',
    tileTypes: [TileType.WOLFSBANE],
    itemId: 'wolfsbane',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate(
        [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        'The wolfsbane is dormant underground. It only emerges in spring, summer, and autumn.'
      ),
    ],
    failureMessage: 'You search the wolfsbane, but find none suitable for harvesting.',
  },

  // ── Heather (forest) — autumn only ──
  {
    label: 'heather',
    tileTypes: [TileType.HEATHER],
    itemId: 'heather_sprig',
    fallbackSuccessRate: 0.75,
    gates: [
      seasonGate([Season.AUTUMN], (season) =>
        season === Season.WINTER
          ? 'The heather is buried under the frost. It blooms in autumn.'
          : "The heather isn't in bloom yet. Come back in autumn."
      ),
    ],
    cooldownMessage: "You've already gathered from this heather today.",
    failureMessage: 'You search the heather, but find no sprigs worth taking.',
  },

  // ── Pink rosebush (village) — dormant in winter ──
  {
    label: 'rosebush',
    tileTypes: [TileType.ROSEBUSH_PINK],
    itemId: 'rose_crop',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate(
        [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        'The rosebush is bare in winter. Come back when it blooms.'
      ),
    ],
    failureMessage: 'You search the rosebush carefully, but the blooms are not ready for picking.',
  },

  // ── Red rosebush (village) — dormant in winter ──
  {
    label: 'red rosebush',
    tileTypes: [TileType.ROSEBUSH_RED],
    itemId: 'rose_red_crop',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate(
        [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        'The rosebush is bare in winter. Come back when it blooms.'
      ),
    ],
    failureMessage: 'You search the rosebush carefully, but the blooms are not ready for picking.',
  },

  // ── Luminescent toadstool (mushroom forest exclusive) — any season, any time ──
  {
    label: 'luminescent toadstool',
    tileTypes: [TileType.LUMINESCENT_TOADSTOOL],
    itemId: 'luminescent_toadstool',
    fallbackSuccessRate: 0.5,
    failureMessage:
      'You search amongst the glowing toadstools, but find none suitable for harvesting.',
  },

  // ── Forest mushroom (procedural forest) — autumn only ──
  {
    label: 'forest mushroom',
    tileTypes: [TileType.FOREST_MUSHROOM],
    itemId: 'forest_mushroom',
    fallbackSuccessRate: 0.5,
    gates: [seasonGate([Season.AUTUMN], 'These mushrooms only appear in autumn. Come back then!')],
    failureMessage:
      'You search through the mushrooms, but none of them are quite right for picking.',
  },

  // ── Meadow grass (straw) — autumn only ──
  {
    label: 'meadow grass',
    tileTypes: [TileType.MEADOW_GRASS],
    itemId: 'straw',
    fallbackSuccessRate: 0.9,
    gates: [
      seasonGate([Season.AUTUMN], (season) =>
        season === Season.WINTER
          ? 'The meadow grass is buried under frost. Come back in autumn when it has dried.'
          : 'The meadow grass is too green and lush to gather. Come back in autumn when it has dried.'
      ),
    ],
    failureMessage:
      'You pull at the dried grass, but it crumbles before you can gather it properly.',
  },

  // ── Dead spruce (ghost lichen) — any season, any time of day ──
  {
    label: 'dead spruce',
    tileTypes: [TileType.DEAD_SPRUCE],
    itemId: 'ghost_lichen',
    fallbackSuccessRate: 0.5,
    failureMessage: 'You scrape at the dead spruce bark, but find no lichen worth collecting.',
  },

  // ── Spruce trees (spruce sprig) — winter ONLY ──
  {
    label: 'spruce tree',
    tileTypes: [TileType.SPRUCE_TREE, TileType.SPRUCE_TREE_SMALL],
    itemId: 'spruce_sprig',
    fallbackSuccessRate: 0.75,
    gates: [
      seasonGate(
        [Season.WINTER],
        'The spruce tree holds its branches tight. In winter, fallen sprigs can be gathered from beneath.'
      ),
    ],
    cooldownMessage: "You've already gathered from this tree today.",
    failureMessage: 'You search beneath the spruce, but find no suitable sprigs.',
    successMessage: (displayName, quantity) => `Gathered ${quantity} ${displayName}!`,
  },

  // ── Giant mushroom — any season, any time of day ──
  {
    label: 'giant mushroom',
    tileTypes: [TileType.GIANT_MUSHROOM],
    itemId: 'giant_mushroom_cap',
    fallbackSuccessRate: 0.5,
    failureMessage: "You search the giant mushroom, but can't find a piece worth taking.",
  },

  // ── Cherry tree (sakura petals) — spring only ──
  {
    label: 'cherry tree',
    tileTypes: [TileType.SAKURA_TREE],
    itemId: 'sakura_petal',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate(
        [Season.SPRING],
        'The cherry tree has no blossoms to collect petals from right now.'
      ),
    ],
    failureMessage: 'You reach for the falling petals, but they slip through your fingers.',
  },

  // ── Bee hive (honey) — spring/summer/autumn ──
  {
    label: 'bee hive',
    tileTypes: [TileType.BEE_HIVE],
    itemId: 'honey',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate(
        [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        'The bees are dormant in winter. Come back in spring!'
      ),
    ],
    cooldownMessage: "You've already collected honey from this hive. Come back tomorrow!",
    failureMessage: 'The bees buzz angrily. Better luck next time!',
  },

  // ── Mustard flower (Eye of Newt) — spring/summer only ──
  {
    label: 'mustard flower',
    tileTypes: [TileType.MUSTARD_FLOWER],
    itemId: 'eye_of_newt',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate(
        [Season.SPRING, Season.SUMMER],
        'The mustard flowers are dormant. Come back in spring or summer!'
      ),
    ],
    cooldownMessage: "You've already searched this mustard flower. Come back tomorrow!",
    failureMessage: 'You search the mustard flowers, but find no seeds ready for harvesting.',
  },

  // ── Shrinking violet — spring only ──
  {
    label: 'shrinking violet',
    tileTypes: [TileType.SHRINKING_VIOLET],
    itemId: 'shrinking_violet',
    fallbackSuccessRate: 0.5,
    gates: [
      seasonGate([Season.SPRING], 'The shrinking violets only bloom in spring. Come back next year!'),
    ],
    cooldownMessage: "You've already searched this shrinking violet. Come back tomorrow!",
    failureMessage: 'You search the shrinking violets, but find none ready for harvesting.',
  },

  // ── Frost flower — weather-conditional (only during snowfall) ──
  {
    label: 'frost flower',
    tileTypes: [TileType.FROST_FLOWER],
    itemId: 'frost_flower',
    fallbackSuccessRate: 0.7,
    gates: [
      weatherGate('snow', 'Frost flowers only appear during snowfall. Wait for the snow to fall!'),
    ],
    cooldownMessage: "You've already harvested this frost flower. Come back tomorrow!",
    failureMessage: 'You search the frost flowers, but find none ready for harvesting.',
  },
];