/**
 * Farming — till, plant, water, harvest and clear farm plots.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 *
 * ## Held tool vs. context menu
 *
 * On a plain click, an action is offered only when the player is already holding the
 * right tool: till needs the hoe, planting needs a seed selected, watering needs the can.
 * That is deliberate — clicking is how you *do* things, and swapping the tool out from
 * under the player mid-click would be surprising.
 *
 * It is also the single biggest source of "I clicked it and nothing happened" in the
 * game, because nothing on screen explains why. So on a right-click / long-press
 * (`ctx.isContextMenu`) every action the *plot* supports is offered, whether or not it
 * is in hand, and picking one switches to the required tool first via `onSelectTool`.
 * Tools the player does not own are still not offered — the menu shows what is possible,
 * not what would be possible after a shopping trip.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { FarmPlotState, TileType } from '../../../types';
import { characterData } from '../../CharacterData';
import { farmManager } from '../../farmManager';
import { gameState } from '../../../GameState';
import { getCrop } from '../../../data/crops';
import { getCropIdFromSeed } from '../../../data/items';
import { inventoryManager } from '../../inventoryManager';
import { handleFarmAction } from '../../actionHandlers';
import { debugLog } from '../../debugLog';

/** Menu icon per crop. Falls back to a generic seedling for anything unlisted. */
const SEED_ICONS: Record<string, string> = {
  radish: '🥕',
  tomato: '🍅',
  salad: '🥗',
  corn: '🌽',
  pumpkin: '🎃',
  potato: '🥔',
  melon: '🍉',
  chili: '🌶️',
  spinach: '🥬',
  broccoli: '🥦',
  cauliflower: '🥬',
  sunflower: '🌻',
  onion: '🧅',
  pea: '🫛',
  cucumber: '🥒',
  carrot: '🥕',
  strawberry: '🍓',
};

export function farmingProvider(ctx: InteractionContext): AvailableInteraction[] {
  const {
    currentMapId,
    currentTool,
    isContextMenu,
    onFarmAction,
    onFarmAnimation,
    onSelectTool,
    tileX,
    tileY,
    tileData,
    tilePos,
  } = ctx;
  const interactions: AvailableInteraction[] = [];

  /**
   * Is `toolId` usable for an action here — either already in hand, or reachable because
   * this is a context menu and the player owns it?
   */
  const canUseTool = (toolId: string): boolean =>
    currentTool === toolId || (isContextMenu === true && inventoryManager.hasItem(toolId));

  /**
   * Run a farm action with the tool it requires rather than whatever is in hand, and
   * leave the player holding that tool afterwards — they almost always want to do it
   * again to the next plot.
   */
  const runWithTool = (toolId: string, position: typeof tilePos) => {
    if (toolId !== currentTool) onSelectTool?.(toolId);
    const farmResult = handleFarmAction(position, toolId, currentMapId, onFarmAnimation);
    onFarmAction?.(farmResult);
  };

  // Check for farming actions
  // Advance plot states before reading them so cooldowns/growth reflect real elapsed time.
  farmManager.updateAllPlots();
  // Search the clicked tile first; if no growing crop found, check adjacent tiles.
  // This handles tall crop sprites (e.g. peas, corn) whose visuals extend one tile
  // above the soil tile — clicking the upper portion maps to the tile above the plot.
  let farmTilePos = tilePos;
  let plot = farmManager.getPlot(currentMapId, tilePos);
  let plotTileType = plot ? farmManager.getTileTypeForPlot(plot) : tileData?.type;

  if (!plot && tileData?.type !== TileType.SOIL_FALLOW) {
    // No plot and not fallow soil at clicked tile — check adjacent tiles
    // for tall crop sprites (e.g. peas, corn) whose visuals extend above the soil tile.
    // We do NOT search adjacents when the clicked tile is fallow — that's a valid till target.
    for (const offset of [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
    ]) {
      const np = { x: tileX + offset.x, y: tileY + offset.y };
      const nearbyPlot = farmManager.getPlot(currentMapId, np);
      const nearbyType = nearbyPlot ? farmManager.getTileTypeForPlot(nearbyPlot) : undefined;
      if (nearbyType !== undefined && nearbyType !== TileType.SOIL_FALLOW) {
        farmTilePos = np;
        plot = nearbyPlot;
        plotTileType = nearbyType;
        break;
      }
    }
  }

  if (
    plotTileType !== undefined &&
    plotTileType >= TileType.SOIL_FALLOW &&
    plotTileType <= TileType.SOIL_DEAD
  ) {
    // Till soil
    if (canUseTool('tool_hoe') && plotTileType === TileType.SOIL_FALLOW) {
      interactions.push({
        type: 'farm_till',
        label: 'Till Soil',
        icon: '🔨',
        color: '#92400e',
        execute: () => runWithTool('tool_hoe', farmTilePos),
      });
    }

    // Plant seeds.
    //
    // Clicking plants the seed in hand. A context menu instead lists every seed the
    // player is carrying, so choosing what to plant does not mean closing the menu,
    // opening the inventory, selecting a seed and clicking the plot again.
    if (plotTileType === TileType.SOIL_TILLED) {
      const plantableSeeds = currentTool.startsWith('seed_')
        ? [currentTool]
        : isContextMenu
          ? // De-duplicated: seeds are stored as one instance per stack.
            [...new Set(inventoryManager.getAllSeeds().map((seed) => seed.itemId))]
          : [];

      for (const seedId of plantableSeeds) {
        const cropId = getCropIdFromSeed(seedId);
        if (!cropId) continue;
        const crop = getCrop(cropId);

        interactions.push({
          type: 'farm_plant',
          label: `Plant ${crop?.displayName || cropId}`,
          icon: SEED_ICONS[cropId] || '🌱',
          color: '#16a34a',
          execute: () => runWithTool(seedId, farmTilePos),
        });
      }
    }

    // Water soil or crop (not READY crops - those should be harvested; not herb states)
    if (
      canUseTool('tool_watering_can') &&
      (plotTileType === TileType.SOIL_TILLED ||
        plotTileType === TileType.SOIL_PLANTED ||
        plotTileType === TileType.SOIL_WATERED ||
        plotTileType === TileType.SOIL_WILTING)
    ) {
      const waterCheckPlot = farmManager.getPlot(currentMapId, farmTilePos);
      if (
        waterCheckPlot?.state === FarmPlotState.HERB_COOLDOWN ||
        waterCheckPlot?.state === FarmPlotState.HERB_DORMANT
      ) {
        // Skip water option for herbs not in growing state
      } else {
        const isTilled = plotTileType === TileType.SOIL_TILLED;
        interactions.push({
          type: 'farm_water',
          label: isTilled ? 'Water Soil' : 'Water Crop',
          icon: '💧',
          color: '#0ea5e9',
          execute: () => runWithTool('tool_watering_can', farmTilePos),
        });
      }
    }

    // Harvest crop
    if (plotTileType === TileType.SOIL_READY) {
      const readyPlot = farmManager.getPlot(currentMapId, farmTilePos);
      const readyCrop = readyPlot?.cropType ? getCrop(readyPlot.cropType) : null;

      if (readyCrop?.isHerb) {
        // Herb: show Harvest and Remove options
        const completeHerbHarvest = () => {
          const inventoryData = inventoryManager.getInventoryData();
          characterData.saveInventory(inventoryData.items, inventoryData.tools);
          onFarmAnimation?.('harvest', farmTilePos);
          farmManager.updateAllPlots();
          characterData.saveFarmPlots(farmManager.getAllPlots());
          onFarmAction?.({ handled: true });
        };

        interactions.push({
          type: 'farm_harvest_herb',
          label: `Harvest ${readyCrop.displayName}`,
          icon: '✂️',
          color: '#65a30d',
          execute: () => {
            const result = farmManager.harvestCrop(currentMapId, farmTilePos);
            if (result) {
              const qualityMultiplier =
                result.quality === 'excellent' ? 2.0 : result.quality === 'good' ? 1.5 : 1.0;
              const totalGold = Math.floor(readyCrop.sellPrice * result.yield * qualityMultiplier);
              gameState.addGold(totalGold);
              completeHerbHarvest();
            }
          },
        });

        interactions.push({
          type: 'farm_remove_herb',
          label: 'Remove Herb',
          icon: '🗑️',
          color: '#6b7280',
          execute: () => {
            farmManager.removeHerb(currentMapId, farmTilePos);
            farmManager.updateAllPlots();
            characterData.saveFarmPlots(farmManager.getAllPlots());
            onFarmAction?.({ handled: true });
          },
        });
      } else if (readyCrop?.dualHarvest) {
        // Dual-harvest crop: show two options in radial menu
        const dh = readyCrop.dualHarvest;

        /** Complete a dual-harvest: save inventory, animate, update plots */
        const completeDualHarvest = () => {
          const inventoryData = inventoryManager.getInventoryData();
          characterData.saveInventory(inventoryData.items, inventoryData.tools);
          onFarmAnimation?.('harvest', farmTilePos);
          farmManager.updateAllPlots();
          characterData.saveFarmPlots(farmManager.getAllPlots());
          onFarmAction?.({ handled: true });
        };

        interactions.push({
          type: 'farm_harvest_flowers',
          label: dh.flowerOption.label,
          icon: dh.flowerOption.icon,
          color: dh.flowerOption.color,
          execute: () => {
            const result = farmManager.harvestCropWithMode(currentMapId, farmTilePos, 'flowers');
            if (result) {
              const crop = getCrop(result.cropId);
              if (crop) {
                const qualityMultiplier =
                  result.quality === 'excellent' ? 2.0 : result.quality === 'good' ? 1.5 : 1.0;
                const totalGold = Math.floor(crop.sellPrice * result.yield * qualityMultiplier);
                gameState.addGold(totalGold);
                const qualityStr =
                  result.quality !== 'normal'
                    ? ` (${result.quality} quality, ${qualityMultiplier}x gold!)`
                    : '';
                debugLog(
                  'Action',
                  `Picked ${result.yield}x ${crop.displayName}${qualityStr} for ${totalGold} gold`
                );
              }
              completeDualHarvest();
            }
          },
        });

        interactions.push({
          type: 'farm_harvest_seeds',
          label: dh.seedOption.label,
          icon: dh.seedOption.icon,
          color: dh.seedOption.color,
          execute: () => {
            const result = farmManager.harvestCropWithMode(currentMapId, farmTilePos, 'seeds');
            if (result) {
              const crop = getCrop(result.cropId);
              if (crop) {
                debugLog('Action', `Harvested ${result.seedsDropped}x ${crop.displayName} Seeds`);
              }
              completeDualHarvest();
            }
          },
        });
      } else {
        // Normal single-harvest crop
        interactions.push({
          type: 'farm_harvest',
          label: 'Harvest Crop',
          icon: '🌾',
          color: '#eab308',
          execute: () => {
            const farmResult = handleFarmAction(
              farmTilePos,
              currentTool,
              currentMapId,
              onFarmAnimation
            );
            onFarmAction?.(farmResult);
          },
        });
      }
    }

    // Clear dead crop (works with any tool)
    if (plotTileType === TileType.SOIL_DEAD) {
      interactions.push({
        type: 'farm_clear',
        label: 'Clear Dead Crop',
        icon: '🗑️',
        color: '#6b7280',
        execute: () => {
          const farmResult = handleFarmAction(
            farmTilePos,
            currentTool,
            currentMapId,
            onFarmAnimation
          );
          onFarmAction?.(farmResult);
        },
      });
    }

    // Herb cooldown or dormant: show status info + Remove option
    const herbStatePlot = farmManager.getPlot(currentMapId, farmTilePos);
    if (
      herbStatePlot?.state === FarmPlotState.HERB_COOLDOWN ||
      herbStatePlot?.state === FarmPlotState.HERB_DORMANT
    ) {
      const isDormant = herbStatePlot.state === FarmPlotState.HERB_DORMANT;

      interactions.push({
        type: 'farm_harvest_herb', // Reuse type for info display
        label: isDormant ? 'Dormant until spring' : 'Resting...',
        icon: isDormant ? '❄️' : '⏳',
        color: isDormant ? '#93c5fd' : '#94a3b8',
        execute: () => {
          onFarmAction?.({
            handled: true,
            message: isDormant
              ? 'This herb is dormant for winter. It will be ready to harvest again in spring.'
              : 'This herb is resting after the last harvest. It will be ready again soon.',
            messageType: 'info',
          });
        },
      });

      interactions.push({
        type: 'farm_remove_herb',
        label: 'Remove Herb',
        icon: '🗑️',
        color: '#6b7280',
        execute: () => {
          farmManager.removeHerb(currentMapId, farmTilePos);
          farmManager.updateAllPlots();
          characterData.saveFarmPlots(farmManager.getAllPlots());
          onFarmAction?.({ handled: true });
        },
      });
    }

    // Fallback: If no specific farm interaction was added, call handleFarmAction to get guidance message
    // This ensures mouse clicks show the same helpful messages as keyboard input.
    //
    // Never in a context menu: this entry exists only to be auto-executed as a lone
    // interaction, and its placeholder label ("Check Farm Action" with a ❓) is written on
    // the assumption nobody reads it. A context menu shows every option, so it would.
    const farmInteractionsAdded = interactions.filter((i) => i.type.startsWith('farm_')).length;
    if (farmInteractionsAdded === 0 && onFarmAction && !isContextMenu) {
      // Create a guidance interaction that calls handleFarmAction
      interactions.push({
        type: 'farm_till', // Use generic type
        label: 'Check Farm Action', // Won't be shown (immediately executed for single interaction)
        icon: '❓',
        color: '#6b7280',
        execute: () => {
          const farmResult = handleFarmAction(
            farmTilePos,
            currentTool,
            currentMapId,
            onFarmAnimation
          );
          onFarmAction(farmResult);
        },
      });
    }
  }

  return interactions;
}
