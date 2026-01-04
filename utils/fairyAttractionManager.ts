/**
 * Fairy Attraction Manager
 * Handles spawning fairies (Morgan and Stella) near mature fairy bluebells at night
 *
 * Rules:
 * - Fairies only appear between 22:00 and 06:00 (night time)
 * - Only appear near fully grown (adult) fairy bluebells
 * - Maximum 2 fairies can spawn (one per bluebell, up to 2 bluebells)
 * - 50% chance of Morgan or Stella spawning first
 * - Fairies despawn at 06:00
 */

import { TimeManager } from './TimeManager';
import { farmManager } from './farmManager';
import { NPC, FarmPlotState } from '../types';
import { Position } from '../types';
import { createMorganNPC, createStellaNPC } from './npcs/forestNPCs';

// Night time hours (22:00 to 06:00)
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 6;

interface FairySpawnData {
  npcId: string;
  bluebellPosition: Position;
  spawnTime: number;
}

class FairyAttractionManager {
  private spawnedFairies: FairySpawnData[] = [];
  private lastCheckTime: number = 0;

  /**
   * Check if it's currently night time (22:00 - 06:00)
   */
  private isNightTime(): boolean {
    const currentTime = TimeManager.getCurrentTime();
    const hour = currentTime.hour;

    // Night is from 22:00 to 06:00 (spans midnight)
    return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
  }

  /**
   * Find all mature fairy bluebell plots on the current map
   */
  private findMatureBluebells(mapId: string): Position[] {
    const allPlots = farmManager.getAllPlots();
    const matureBluebells: Position[] = [];

    allPlots.forEach(plot => {
      // Only check plots on the current map
      if (plot.mapId !== mapId) return;

      // Only interested in fully grown fairy bluebells
      if (plot.cropType === 'fairy_bluebell' && plot.state === FarmPlotState.READY) {
        matureBluebells.push(plot.position);
      }
    });

    return matureBluebells;
  }

  /**
   * Calculate spawn position directly over a bluebell
   * Fairies hover over the flowers to harvest nectar
   */
  private calculateFairySpawnPosition(bluebellPos: Position): Position {
    return {
      x: bluebellPos.x,
      y: bluebellPos.y, // Fairies spawn on the same tile (will render on top due to z-index)
    };
  }

  /**
   * Check if fairies should spawn and spawn them if needed
   * Returns array of fairy NPCs to add to the map
   */
  public updateFairySpawns(mapId: string, currentNPCs: NPC[]): NPC[] {
    const now = Date.now();
    const newFairies: NPC[] = [];

    // Only check every 5 seconds to avoid excessive processing
    if (now - this.lastCheckTime < 5000) {
      return newFairies;
    }
    this.lastCheckTime = now;

    // Check if it's night time
    const isNight = this.isNightTime();

    // If it's day time (06:00+), despawn all fairies
    if (!isNight) {
      this.despawnAllFairies(currentNPCs);
      return newFairies;
    }

    // Find mature bluebells
    const matureBluebells = this.findMatureBluebells(mapId);

    // No bluebells? No fairies!
    if (matureBluebells.length === 0) {
      return newFairies;
    }

    // Maximum 2 fairies (one per bluebell, up to 2 bluebells)
    const maxFairies = Math.min(2, matureBluebells.length);

    // Check how many fairies are already spawned
    const existingFairyCount = currentNPCs.filter(npc =>
      npc.id.startsWith('fairy_attracted_')
    ).length;

    // Already have max fairies? Nothing to do
    if (existingFairyCount >= maxFairies) {
      return newFairies;
    }

    // Spawn fairies (up to max)
    const fairiesNeeded = maxFairies - existingFairyCount;

    // Shuffle bluebells to randomize which ones get fairies
    const shuffledBluebells = [...matureBluebells].sort(() => Math.random() - 0.5);

    // Track which fairies we've already spawned
    const spawnedFairyTypes = currentNPCs
      .filter(npc => npc.id.startsWith('fairy_attracted_'))
      .map(npc => npc.name);

    for (let i = 0; i < fairiesNeeded && i < shuffledBluebells.length; i++) {
      const bluebellPos = shuffledBluebells[i];
      const spawnPos = this.calculateFairySpawnPosition(bluebellPos);

      // Determine which fairy to spawn
      // 50% chance of Morgan or Stella if neither has spawned yet
      // Otherwise spawn whichever one hasn't spawned
      let fairy: NPC;
      let fairyType: 'morgan' | 'stella';

      if (spawnedFairyTypes.includes('Morgan')) {
        // Morgan already spawned, spawn Stella
        fairyType = 'stella';
      } else if (spawnedFairyTypes.includes('Stella')) {
        // Stella already spawned, spawn Morgan
        fairyType = 'morgan';
      } else {
        // Neither spawned yet, 50/50 chance
        fairyType = Math.random() < 0.5 ? 'morgan' : 'stella';
      }

      // Create the fairy NPC
      const fairyId = `fairy_attracted_${fairyType}_${i}`;

      if (fairyType === 'morgan') {
        fairy = createMorganNPC(fairyId, spawnPos);
      } else {
        fairy = createStellaNPC(fairyId, spawnPos);
      }

      // Track this spawn
      this.spawnedFairies.push({
        npcId: fairyId,
        bluebellPosition: bluebellPos,
        spawnTime: now,
      });

      spawnedFairyTypes.push(fairy.name);
      newFairies.push(fairy);
    }

    return newFairies;
  }

  /**
   * Remove all spawned fairies from the map
   * Called at dawn (06:00)
   */
  private despawnAllFairies(currentNPCs: NPC[]): string[] {
    const fairyIds = currentNPCs
      .filter(npc => npc.id.startsWith('fairy_attracted_'))
      .map(npc => npc.id);

    // Clear our tracking
    this.spawnedFairies = [];

    return fairyIds;
  }

  /**
   * Get IDs of fairies that should be removed
   * Returns array of NPC IDs to remove
   */
  public getFairiesToDespawn(currentNPCs: NPC[]): string[] {
    if (!this.isNightTime()) {
      return this.despawnAllFairies(currentNPCs);
    }
    return [];
  }

  /**
   * Reset the manager (called when changing maps)
   */
  public reset(): void {
    this.spawnedFairies = [];
    this.lastCheckTime = 0;
  }
}

// Export singleton instance
export const fairyAttractionManager = new FairyAttractionManager();
