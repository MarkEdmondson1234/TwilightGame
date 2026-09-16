/**
 * NPC Gardeners — the villagers who tend the public farming patches.
 *
 * Part of the NPC garden feature: see design_docs/planned/NPC_GARDENS.md.
 * The garden is global shared world state — the plan (garden level + current
 * request per gardener) lives in Firestore, and the layout is computed
 * deterministically from (day seed, map, plan) in utils/NpcGardenManager.ts.
 *
 * This file is the roster: who gardens where, what they love growing, and the
 * flavour lines the rest of the feature quotes back at the player. Dialogue
 * nodes themselves live in each NPC's own definition file (per-NPC SSoT);
 * only the shared text is here.
 *
 * All user-facing text is British English.
 */

import { SHARED_FARM_MAP_IDS, NPC_GARDEN } from '../constants';
import { getCrop } from './crops';
import type { DialogueNode, DialogueResponse } from '../types';

export interface NpcGardener {
  /** Must match the NPC's id in maps/definitions (createXxxNPC('id', …)). */
  npcId: string;
  /** Display name for flavour lines ("Old Woman: 'Lovely, isn't it?'"). */
  name: string;
  /** The public map whose farm tiles this gardener tends. */
  mapId: string;
  /** Crops they plant ~70% of the time on their own tiles. */
  favourites: string[];
  /** Crops the player may request in dialogue (season-filtered at runtime). */
  requestable: string[];
  /** Line shown when admiring one of their plants. */
  admireLine: string;
  /** What they say when the player asks what they could plant. */
  favourPrompt: string;
  /** Gentle turn-down for a stranger (tier below acquaintance). */
  strangerReply: string;
  /** In-voice acceptance when the player requests a crop. */
  requestReply: (cropDisplayName: string) => string;
}

/**
 * Patch claim order within a map follows this array's order per mapId, so the
 * per-season tile shuffle hands out contiguous prefix patches deterministically.
 */
export const NPC_GARDENERS: NpcGardener[] = [
  {
    npcId: 'village_elder',
    name: 'Village Elder',
    mapId: 'village',
    favourites: ['radish', 'pea', 'sunflower'],
    requestable: ['radish', 'pea', 'sunflower', 'tomato', 'potato', 'carrot', 'corn'],
    admireLine:
      "'Ah, thou hast noticed my little beds. Radish and pea — humble crops, but they teach patience.'",
    favourPrompt:
      "'A garden shared is a garden doubled, as the saying goes. My patch is thine to command — within reason. What wouldst thou have me grow?'",
    strangerReply:
      "'In time, young one. Ask me when we know each other better, and I shall gladly sow for thee.'",
    requestReply: (crop) =>
      `'${crop}? A fine choice. I shall sow it in my beds this very day — tend it well, and so shall I.'`,
  },
  {
    npcId: 'village_child',
    name: 'Village Child',
    mapId: 'village',
    favourites: ['strawberry', 'pumpkin'],
    requestable: ['strawberry', 'pumpkin', 'melon', 'radish', 'corn', 'tomato'],
    admireLine:
      "'That's MY strawberry plant! I planted it all by myself. Well… mostly by myself.'",
    favourPrompt:
      "'Ooh, you want ME to plant something? I'm brilliant at planting! What shall we grow?'",
    strangerReply:
      "'Mum says I'm not s'posed to plant things for people I don't know yet. Play with me lots and then I will!'",
    requestReply: (crop) =>
      `'${crop}! YES! I'm going to plant the best one ever. It's going to be HUGE!'`,
  },
  {
    npcId: 'old_woman_knitting',
    name: 'Old Woman',
    mapId: 'farm_area',
    favourites: ['lavender', 'mint', 'thyme'],
    requestable: ['lavender', 'mint', 'thyme', 'salad', 'spinach', 'broccoli', 'onion'],
    admireLine:
      "'Lovely, isn't it? Lavender's been my favourite these sixty years. The bees agree.'",
    favourPrompt:
      "'My hands are never idle, dear — needles or trowel. What shall I plant for you in my patch?'",
    strangerReply:
      "'Bless you, dearie, but I keep my beds for friends. Sit with me a while first.'",
    requestReply: (crop) =>
      `'${crop}? I'll get right on it, love. It'll be coming up before you know it.'`,
  },
  {
    npcId: 'spring_periwinkle',
    name: 'Spring Periwinkle',
    mapId: 'farm_area',
    favourites: ['melon', 'cucumber'],
    requestable: ['melon', 'cucumber', 'strawberry', 'tomato', 'cauliflower', 'carrot'],
    admireLine:
      "'Melons need patience and warm sunshine. I planted those before I hopped away last time!'",
    favourPrompt:
      "'You want me to plant something? How exciting! Tell me what you'd like and I'll hop to it!'",
    strangerReply:
      "'Hmm — I only grow favours for friends, that's the rule. Come back once we've said hello properly!'",
    requestReply: (crop) =>
      `'${crop}, coming right up! I'll plant it before I next hop away — promise!'`,
  },
];

/** Patch size for a gardener at a given friendship level (1-9). Monotonic. */
export function getPatchSizeForLevel(npcId: string, level: number): number {
  const bounds = NPC_GARDEN.PATCH_MIN_MAX[npcId];
  if (!bounds) return 0;
  const clamped = Math.max(1, Math.min(9, level));
  return bounds.min + Math.round(((bounds.max - bounds.min) * (clamped - 1)) / 8);
}

/** Share of the patch given to the requested crop at this level (tile count). */
export function getRequestTileCount(npcId: string, patchSize: number, level: number): number {
  const clamped = Math.max(1, Math.min(9, level));
  const share = Math.min(
    NPC_GARDEN.REQUEST_SHARE_MAX,
    NPC_GARDEN.REQUEST_SHARE_BASE + NPC_GARDEN.REQUEST_SHARE_PER_LEVEL * clamped
  );
  return Math.min(patchSize, Math.ceil(patchSize * share));
}

/** Get a gardener by npcId. */
export function getGardener(npcId: string): NpcGardener | undefined {
  return NPC_GARDENERS.find((g) => g.npcId === npcId);
}

/** All gardeners tending a given public map, in patch claim order. */
export function getGardenersForMap(mapId: string): NpcGardener[] {
  return NPC_GARDENERS.filter((g) => g.mapId === mapId);
}

/** Guard so SHARED_FARM_MAP_IDS stays the single source of truth for "public". */
export function isPublicFarmMap(mapId: string): boolean {
  return SHARED_FARM_MAP_IDS.has(mapId);
}

// ---------------------------------------------------------------------------
// Dialogue generation.
//
// The request flow is one hub node (garden_favour), one stranger turn-down
// (garden_favour_stranger) and one confirmation node per requestable crop
// (garden_favour_<cropId>). These are generated from the roster above so the
// offering can never drift from the crop catalogue's seasons — the same
// philosophy as the item SSoT tests. NPC files spread the result into their
// dialogue arrays; utils/dialogueHandlers.ts intercepts the node ids.
// ---------------------------------------------------------------------------

/** The response options on the garden_favour hub: one per crop per season. */
export function gardenFavourResponses(npcId: string): DialogueResponse[] {
  const gardener = getGardener(npcId);
  if (!gardener) return [];

  const responses: DialogueResponse[] = [];
  for (const cropId of gardener.requestable) {
    const crop = getCrop(cropId);
    if (!crop) continue;
    for (const season of crop.plantSeasons) {
      responses.push({
        text: `Could you plant ${crop.displayName.toLowerCase()}?`,
        nextId: `garden_favour_${cropId}`,
        requiredSeason: season.toLowerCase() as DialogueResponse['requiredSeason'],
      });
    }
  }
  responses.push({ text: 'Actually, never mind.' });
  return responses;
}

/**
 * All dialogue nodes the request flow needs, generated for one gardener.
 * Spread these into the NPC's dialogue array; add the greeting response
 * pointing at 'garden_favour' (see the gardener definition files).
 */
export function gardenRequestNodes(npcId: string): DialogueNode[] {
  const gardener = getGardener(npcId);
  if (!gardener) return [];

  const nodes: DialogueNode[] = [
    {
      id: 'garden_favour',
      text: gardener.favourPrompt,
      responses: gardenFavourResponses(npcId),
    },
    {
      id: 'garden_favour_stranger',
      text: gardener.strangerReply,
      responses: [],
    },
  ];

  for (const cropId of gardener.requestable) {
    const crop = getCrop(cropId);
    if (!crop) continue;
    nodes.push({
      id: `garden_favour_${cropId}`,
      text: gardener.requestReply(crop.displayName),
      responses: [],
    });
  }

  return nodes;
}