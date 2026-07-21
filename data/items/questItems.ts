/**
 * Quest items and keepsakes — one-off story objects.
 *
 * Add here: items tied to a specific quest or unique collectibles (photos,
 * mementos). Keepsakes are not stackable and not tradeable.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import {
  itemAssets,
  magicalAssets,
} from '../../assets';
import { ItemCategory, type ItemDefinition } from './types';

export const QUEST_ITEMS: Record<string, ItemDefinition> = {
  // ===== KEEPSAKES =====
  photo: {
    id: 'photo',
    name: 'photo',
    displayName: 'Photo',
    category: ItemCategory.KEEPSAKE,
    description: 'A photograph taken with your camera.',
    stackable: false,
    // Not buyable or sellable — a personal keepsake
    icon: '🖼️',
  },

  key_letter_from_althea: {
    id: 'key_letter_from_althea',
    name: 'key_letter_from_althea',
    displayName: "Althea's Letter",
    category: ItemCategory.KEEPSAKE,
    description: "A handwritten letter from Althea to her sister Juniper, sealed with a pressed violet. It feels important.",
    stackable: false,
    // Not buyable or sellable — a quest keepsake
    icon: itemAssets.letter_from_althea,
  },

  // ===== THE INVISIBLE GHOST QUEST ITEMS =====

  history_book: {
    id: 'history_book',
    name: 'history_book',
    displayName: 'History Book',
    category: ItemCategory.KEEPSAKE,
    description: 'A dusty tome covering the medieval kingdoms of this region. One entry in particular catches your eye.',
    stackable: false,
    // Not buyable or sellable — a quest keepsake
    image: magicalAssets.history_book,
  },

  // ===== MR FOX'S PICNIC QUEST ITEMS =====

  quest_picnic_blanket: {
    id: 'quest_picnic_blanket',
    name: 'quest_picnic_blanket',
    displayName: 'Picnic Blanket',
    category: ItemCategory.DECORATION,
    description: 'A cosy folded picnic blanket. Perfect for a sunny afternoon.',
    stackable: false,
    placedScale: 3.0,
    image: itemAssets.picnic_blanket_folded,
    placedImage: itemAssets.picnic_blanket,
    allowOutdoorPlacement: true,
    placesBelowCharacters: true,
    icon: '🧺',
  },

  quest_picnic_basket: {
    id: 'quest_picnic_basket',
    name: 'quest_picnic_basket',
    displayName: 'Picnic Basket',
    category: ItemCategory.MISC,
    description: 'A wicker basket. Fill it with three different meals for Mr Fox.',
    stackable: false,
    image: itemAssets.picnic_basket,
    icon: '🧺',
  },
};
