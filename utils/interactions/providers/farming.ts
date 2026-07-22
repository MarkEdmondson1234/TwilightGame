/**
 * Farming — till, plant, water, harvest and clear farm plots.
 *
 * Registered in ../registry.ts. See ../README.md for how to add a new provider.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { DEBUG } from '../../../constants';
import { FarmPlotState, TileType } from '../../../types';
import { characterData } from '../../CharacterData';
import { farmManager } from '../../farmManager';
import { gameState } from '../../../GameState';
import { getCrop } from '../../../data/crops';
import { getCropIdFromSeed } from '../../../data/items';
import { inventoryManager } from '../../inventoryManager';
import { handleFarmAction } from '../../actionHandlers';

export function farmingProvider(ctx: InteractionContext): AvailableInteraction[] {
  const { currentMapId, currentTool, onFarmAction, onFarmAnimation, tileX, tileY, tileData, tilePos } = ctx;
  const interactions: AvailableInteraction[] = [];

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
    if (currentTool === 'tool_hoe' && plotTileType === TileType.SOIL_FALLOW) {
      interactions.push({
        type: 'farm_till',
        label: 'Till Soil',
        icon: '🔨',
        color: '#92400e',
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

    // Plant seeds - if player has a seed item selected, allow planting
    if (currentTool.startsWith('seed_') && plotTileType === TileType.SOIL_TILLED) {
      // Player has a specific seed selected (e.g., 'seed_radish')
      const cropId = getCropIdFromSeed(currentTool);
      if (cropId) {
        const crop = getCrop(cropId);
        const seedIcons: Record<string, string> = {
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

        interactions.push({
          type: 'farm_plant',
          label: `Plant ${crop?.displayName || cropId}`,
          icon: seedIcons[cropId] || '🌱',
          color: '#16a34a',
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

    // Water soil or crop (not READY crops - those should be harvested; not herb states)
    if (
      currentTool === 'tool_watering_can' &&
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
                if (DEBUG.FARM)
                  console.log(
                    `[Action] Picked ${result.yield}x ${crop.displayName}${qualityStr} for ${totalGold} gold`
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
                if (DEBUG.FARM)
                  console.log(
                    `[Action] Harvested ${result.seedsDropped}x ${crop.displayName} Seeds`
                  );
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
    // This ensures mouse clicks show the same helpful messages as keyboard input
    const farmInteractionsAdded = interactions.filter((i) => i.type.startsWith('farm_')).length;
    if (farmInteractionsAdded === 0 && onFarmAction) {
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
