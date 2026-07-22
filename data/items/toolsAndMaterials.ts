/**
 * Tools and raw materials.
 *
 * Add here: usable tools (watering can, hoe, axe) and raw crafting materials
 * such as wood and stone. Tools normally use `maxUses` and are not stackable.
 *
 * Part of the item registry — composed into `ITEMS` by `data/items.ts`.
 * Every item must keep `id`, `name` and its object key identical (SSoT rule).
 */

import { itemAssets } from '../../assets';
import { ItemCategory, type ItemDefinition } from './types';

export const TOOL_AND_MATERIAL_ITEMS: Record<string, ItemDefinition> = {
  // ===== MATERIALS =====
  fertiliser: {
    id: 'fertiliser',
    name: 'fertiliser',
    displayName: 'Fertiliser',
    category: ItemCategory.MATERIAL,
    description: 'Enriches soil for better crop quality. Apply when watering.',
    stackable: true,
    sellPrice: 5,
    buyPrice: 15,
    icon: '💩',
  },

  // ===== TOOLS =====
  tool_hoe: {
    id: 'tool_hoe',
    name: 'tool_hoe',
    displayName: 'Hoe',
    category: ItemCategory.TOOL,
    description: 'Used to till soil for planting.',
    stackable: false,
    buyPrice: 50,
    image: itemAssets.hoe,
  },

  tool_watering_can: {
    id: 'tool_watering_can',
    name: 'tool_watering_can',
    displayName: 'Watering Can',
    category: ItemCategory.TOOL,
    description: 'Waters crops to help them grow faster.',
    stackable: false,
    buyPrice: 75,
    image: itemAssets.watering_can,
  },

  tool_feather_duster: {
    id: 'tool_feather_duster',
    name: 'tool_feather_duster',
    displayName: 'Feather Duster',
    category: ItemCategory.TOOL,
    description: 'A fluffy feather duster for cleaning cobwebs. Given by Althea.',
    stackable: false,
    // No buyPrice - quest reward item, not purchasable
    image: itemAssets.feather_duster,
  },

  // TODO: add to Mushra's shop when implemented
  camera: {
    id: 'camera',
    name: 'camera',
    displayName: 'Camera',
    category: ItemCategory.MISC,
    description: 'A hand-wound film camera. Takes 24 exposures per roll.',
    stackable: false,
    buyPrice: 800,
    image: itemAssets.camera,
  },
};
