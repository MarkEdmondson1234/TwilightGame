/**
 * NPC garden — admiring the villagers' plants in the public patches.
 *
 * Registered in ../registry.ts (after farmingProvider, so the harvest option
 * leads and admire sits below it). See ../README.md and
 * design_docs/planned/NPC_GARDENS.md.
 *
 * Left-click needs nothing from this provider: a READY NPC crop harvests
 * through the ordinary farming provider (with the shared-plot claim
 * transaction) once the player is friends enough with the gardener — below
 * NPC_GARDEN.PICK_MIN_TIER the farming provider offers a kind "not yet"
 * message instead (utils/npcGardenAccess.ts, issue #157) — and a growing one
 * is just a plant you walk past. "Admire" is
 * a right-click/long-press question — who planted this, and what do they
 * love growing? — so it is offered only in the context menu. Auto-executing
 * it on every walk-click through the field would turn a gentle touch into
 * toast spam.
 */

import type { AvailableInteraction, InteractionContext } from '../types';
import { farmManager } from '../../farmManager';
import { getCrop } from '../../../data/crops';
import { getGardener } from '../../../data/npcGardeners';

export function npcGardenProvider(ctx: InteractionContext): AvailableInteraction[] {
  if (!ctx.isContextMenu) return [];

  const plot = farmManager.getPlot(ctx.currentMapId, ctx.tilePos);
  if (!plot?.plantedByNpc || !plot.cropType) return [];

  const gardener = getGardener(plot.plantedByNpc);
  const crop = getCrop(plot.cropType);
  if (!gardener || !crop) return [];

  return [
    {
      type: 'npc_garden_admire',
      label: `Admire ${gardener.name}'s ${crop.displayName}`,
      icon: '🌿',
      color: '#7c9a6d',
      execute: () => {
        ctx.onShowToast?.(`${gardener.name}: ${gardener.admireLine}`, 'info');
      },
    },
  ];
}