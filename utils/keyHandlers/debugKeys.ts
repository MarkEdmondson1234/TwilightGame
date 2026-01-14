/**
 * Debug Key Handlers
 *
 * Handles F-key debug shortcuts:
 * - F1: Help Browser
 * - F3: Debug Overlay
 * - F4: DevTools Panel
 * - F6: Farm time advance
 * - F7: Teleport to debug map
 * - F8: Sprite Editor
 * - F9: Give debug magical ingredients
 * - F10: VFX Test Panel
 */

import { farmManager } from '../farmManager';
import { characterData } from '../CharacterData';
import { transitionToMap } from '../../maps';
import { Position } from '../../types';
import { inventoryManager } from '../inventoryManager';

export interface DebugKeyHandlers {
  onSetShowHelpBrowser: (show: boolean) => void;
  onSetDebugOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onSetShowDevTools: (show: boolean | ((prev: boolean) => boolean)) => void;
  onSetShowSpriteEditor: (show: boolean | ((prev: boolean) => boolean)) => void;
  onSetShowVFXTestPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  onFarmUpdate: () => void;
  onMapTransition: (mapId: string, spawnPos: Position) => void;
  showHelpBrowser: boolean;
}

/**
 * Handle F1 key - Toggle Help Browser
 */
export function handleF1(
  handlers: Pick<DebugKeyHandlers, 'onSetShowHelpBrowser' | 'showHelpBrowser'>
): void {
  handlers.onSetShowHelpBrowser(!handlers.showHelpBrowser);
}

/**
 * Handle F3 key - Toggle Debug Overlay
 */
export function handleF3(handlers: Pick<DebugKeyHandlers, 'onSetDebugOpen'>): void {
  handlers.onSetDebugOpen((prev) => !prev);
}

/**
 * Handle F4 key - Toggle DevTools Panel
 */
export function handleF4(handlers: Pick<DebugKeyHandlers, 'onSetShowDevTools'>): void {
  handlers.onSetShowDevTools((prev) => !prev);
}

/**
 * Handle F6 key - Advance farm time by 1 minute
 */
export function handleF6(handlers: Pick<DebugKeyHandlers, 'onFarmUpdate'>): void {
  farmManager.debugAdvanceTime(60 * 1000);
  characterData.saveFarmPlots(farmManager.getAllPlots());
  handlers.onFarmUpdate();
  console.log('[Debug] Advanced farm time by 1 minute');
}

/**
 * Handle F7 key - Teleport to debug NPC map
 */
export function handleF7(handlers: Pick<DebugKeyHandlers, 'onMapTransition'>): void {
  console.log('[Debug] Teleporting to NPC debug showcase...');
  try {
    const { map, spawn } = transitionToMap('debug_npcs', { x: 15, y: 25 });
    handlers.onMapTransition(map.id, spawn);
    console.log(`[Debug] Loaded debug map: ${map.name}`);
  } catch (error) {
    console.error('[Debug] Failed to load debug map:', error);
  }
}

/**
 * Handle F8 key - Toggle Sprite Editor
 */
export function handleF8(handlers: Pick<DebugKeyHandlers, 'onSetShowSpriteEditor'>): void {
  handlers.onSetShowSpriteEditor((prev) => !prev);
}

/**
 * Handle F10 key - Toggle VFX Test Panel
 */
export function handleF10(handlers: Pick<DebugKeyHandlers, 'onSetShowVFXTestPanel'>): void {
  handlers.onSetShowVFXTestPanel((prev) => !prev);
}

/**
 * Handle F9 key - Give debug magical ingredients and potions
 * Useful for testing the potion brewing system
 */
export function handleF9(): void {
  console.log('[Debug] Giving magical ingredients for testing...');

  // Magical ingredients (5 of each)
  const magicalIngredients = [
    'moonpetal',
    'addersmeat',
    'dragonfly_wings',
    'frost_crystal',
    'sakura_petal',
    'dawn_dew',
    'morning_dew',
    'shadow_essence',
    'luminescent_toadstool',
    'ghost_lichen',
    'mushroom',
    'shrinking_violet',
    'giant_mushroom_cap',
    'eye_of_newt',
    'wolfsbane',
    'phoenix_ash',
    'temporal_dust',
    'feather',
    'vinegar',
    'mint',
    'hearthstone',
    'golden_apple',
  ];

  // Add 5 of each magical ingredient
  magicalIngredients.forEach((itemId) => {
    inventoryManager.addItem(itemId, 5);
  });

  // Also add some cooking ingredients that potions use
  const cookingIngredients = [
    'honey',
    'milk',
    'cream',
    'thyme',
    'tea_leaves',
    'sugar',
    'water',
    'vanilla',
    'bread',
    'salt',
    'egg',
    'fertiliser',
  ];

  cookingIngredients.forEach((itemId) => {
    inventoryManager.addItem(itemId, 5);
  });

  // Add some crops that potions use
  const crops = [
    'crop_onion',
    'crop_chili',
    'crop_blackberry',
    'crop_blueberry',
    'crop_strawberry',
    'crop_sunflower',
    'crop_pumpkin',
    'crop_hazelnut',
    'seed_fairy_bluebell',
  ];

  crops.forEach((itemId) => {
    inventoryManager.addItem(itemId, 5);
  });

  // Add a few sample potions for testing effects
  const samplePotions = [
    'potion_drink_me',
    'potion_eat_me',
    'potion_raincaller',
    'potion_sunburst',
    'potion_harvest_moon',
  ];

  samplePotions.forEach((itemId) => {
    inventoryManager.addItem(itemId, 2);
  });

  console.log('[Debug] Added magical ingredients, cooking ingredients, crops, and sample potions!');
}

/**
 * Try to handle a debug key press.
 * Returns true if the key was handled, false otherwise.
 */
export function handleDebugKey(key: string, handlers: DebugKeyHandlers): boolean {
  switch (key) {
    case 'F1':
      handleF1(handlers);
      return true;
    case 'F3':
      handleF3(handlers);
      return true;
    case 'F4':
      handleF4(handlers);
      return true;
    case 'F6':
      handleF6(handlers);
      return true;
    case 'F7':
      handleF7(handlers);
      return true;
    case 'F8':
      handleF8(handlers);
      return true;
    case 'F9':
      handleF9();
      return true;
    case 'F10':
      handleF10(handlers);
      return true;
    default:
      return false;
  }
}
