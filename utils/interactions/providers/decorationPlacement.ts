/**
 * Placing a held decoration or furniture item into the world, including custom-image
 * decorations (paintings, wreaths) that carry their own rendered artwork.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { CollisionType } from '../../../types';
import { ItemCategory, getItem } from '../../../data/items';
import { decorationManager } from '../../DecorationManager';
import { getFrameStyle } from '../../frameStyles';
import { inventoryManager } from '../../inventoryManager';
import { mapManager } from '../../../maps';

export function decorationPlacementProvider(ctx: InteractionContext): AvailableInteraction[] {
  const {
    currentTool,
    onPlaceDecoration,
    onShowToast,
    tileData,
    tilePos,
    placedItems,
    itemAtPosition,
  } = ctx;
  const interactions: AvailableInteraction[] = [];

  // Check for decoration placement (player holding a decoration item, clicking walkable tile on indoor map)
  if (onPlaceDecoration && tileData) {
    const currentMap = mapManager.getCurrentMap();
    const isIndoorMap = currentMap?.colorScheme === 'indoor' || currentMap?.colorScheme === 'shop';
    const isStrictlyIndoor = currentMap?.colorScheme === 'indoor';
    const isWalkable = tileData.collisionType === CollisionType.WALKABLE;
    const heldItem = getItem(currentTool);
    const tileOk = isWalkable || heldItem?.allowAnyTilePlacement;
    const blockedByIndoorOnly = !!(heldItem?.indoorOnly && !isStrictlyIndoor);
    const blockedByOutdoorOnly = !!(heldItem?.outdoorOnly && isIndoorMap);
    const mapOk =
      (isIndoorMap || heldItem?.allowOutdoorPlacement) &&
      !blockedByIndoorOnly &&
      !blockedByOutdoorOnly;
    const canPlaceHere = tileOk && mapOk;

    // Show feedback when an indoor-only item is held but the current map doesn't qualify
    if (!canPlaceHere && blockedByIndoorOnly && tileOk && onShowToast) {
      onShowToast('You cannot place this outside!', 'warning');
    }
    // Show feedback when an outdoor-only item is held but the current map is indoors
    if (!canPlaceHere && blockedByOutdoorOnly && tileOk && onShowToast) {
      onShowToast('This can only be placed outside!', 'warning');
    }

    if (canPlaceHere) {
      const itemDef = heldItem;
      if (
        itemDef &&
        (itemDef.category === ItemCategory.DECORATION ||
          itemDef.category === ItemCategory.FURNITURE)
      ) {
        // Check no existing placed item at this tile (use itemAtPosition which handles scaled bounding boxes)
        if (!itemAtPosition) {
          // Decorations already placed on this map — used to avoid offering the same
          // custom artwork twice.
          const placedPaintingIds = new Set(
            placedItems.filter((i) => i.paintingId).map((i) => i.paintingId!)
          );

          // For paintings, look up the actual painting data (custom image + frame)
          if (itemDef.id === 'framed_painting') {
            const painting = decorationManager.getNextUnplacedPainting(placedPaintingIds);
            if (painting) {
              const frame = getFrameStyle(painting.paintIds);
              interactions.push({
                type: 'place_decoration',
                label: `Place "${painting.name}"`,
                icon: '🖼️',
                color: '#8b5cf6',
                execute: () =>
                  onPlaceDecoration({
                    itemId: itemDef.id,
                    position: tilePos,
                    image: itemDef.image || '',
                    paintingId: painting.id,
                    customImage: painting.imageUrl,
                    frameStyle: {
                      colour: frame.colour,
                      secondaryColour: frame.secondaryColour,
                      borderWidth: frame.borderWidth,
                      pattern: frame.pattern,
                    },
                    customScale: painting.scale,
                  }),
              });
            }
          } else {
            // For custom-image decorations (wreaths, etc.), look up the image.
            // Prefer the decorationId stored on the inventory instance (set when the
            // wreath was crafted) so multiple wreaths always get their own image.
            // Fall back to the old "first unplaced" search for saves made before this fix.
            const instanceDecoId = inventoryManager.getFirstDecorationId(itemDef.id);
            const customDeco = instanceDecoId
              ? decorationManager.getPainting(instanceDecoId)
              : decorationManager.getNextUnplacedDecoration(itemDef.id, placedPaintingIds);
            if (customDeco) {
              interactions.push({
                type: 'place_decoration',
                label: `Place "${customDeco.name}"`,
                icon: '🌿',
                color: '#8b5cf6',
                execute: () =>
                  onPlaceDecoration({
                    itemId: itemDef.id,
                    position: tilePos,
                    image: itemDef.image || '',
                    paintingId: customDeco.id,
                    customImage: customDeco.imageUrl,
                    // customScale omitted — item's placedScale (0.6) determines size
                  }),
              });
            } else {
              interactions.push({
                type: 'place_decoration',
                label: `Place ${itemDef.displayName}`,
                icon: '🏠',
                color: '#8b5cf6',
                execute: () =>
                  onPlaceDecoration({
                    itemId: itemDef.id,
                    position: tilePos,
                    image: itemDef.placedImage || itemDef.image || '',
                  }),
              });
            }
          }
        }
      }
    }
  }

  return interactions;
}
