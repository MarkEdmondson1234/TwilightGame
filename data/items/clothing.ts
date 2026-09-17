/**
 * Clothing — wearable items.
 *
 * A clothing item unlocks a costume (a full sprite set, see
 * `utils/characterOutfits.ts`): buying it from a shop adds it to the
 * inventory, and right-clicking it offers "Wear" / "Take Off". Wearing never
 * consumes the item — it stays in the bag as the token of ownership, and the
 * character-creator outfit chips only appear for outfits the player owns.
 *
 * The link between the item and the outfit it grants is `outfitId`, which must
 * match a costume id in the OUTFITS registry —
 * `tests/clothingActions.test.ts` walks the pairing.
 */

import { ItemCategory, ItemDefinition } from './types';
import { itemAssets } from '../../assets';

export const CLOTHING_ITEMS: Record<string, ItemDefinition> = {
  clothing_polka_dress: {
    id: 'clothing_polka_dress',
    name: 'clothing_polka_dress',
    displayName: 'Polka-Dot Dress',
    category: ItemCategory.CLOTHING,
    description:
      'A hand-sewn red dress with cream polka dots. Mushra made it herself.',
    stackable: false,
    buyPrice: 120,
    // Mushra does not buy back bespoke tailoring — the dress is yours.
    sellPrice: 0,
    image: itemAssets.polka_dress,
    outfitId: 'polka_dress',
  },
};