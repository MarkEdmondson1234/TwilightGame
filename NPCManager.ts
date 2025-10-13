import { NPC, Position, Direction, NPCBehavior } from './types';

/**
 * NPCManager - Single Source of Truth for all NPC data
 *
 * Manages:
 * - NPC registration per map
 * - NPC positions and states
 * - NPC behaviors and movement
 * - NPC interaction detection
 *
 * Following SSoT principle from CLAUDE.md
 */

class NPCManagerClass {
  private npcsByMap: Map<string, NPC[]> = new Map();
  private currentMapId: string | null = null;

  /**
   * Register NPCs for a specific map
   */
  registerNPCs(mapId: string, npcs: NPC[]): void {
    this.npcsByMap.set(mapId, npcs);
    console.log(`[NPCManager] Registered ${npcs.length} NPCs for map: ${mapId}`);
  }

  /**
   * Set the current active map
   */
  setCurrentMap(mapId: string): void {
    this.currentMapId = mapId;
  }

  /**
   * Get all NPCs for a specific map
   */
  getNPCsForMap(mapId: string): NPC[] {
    return this.npcsByMap.get(mapId) || [];
  }

  /**
   * Get all NPCs for the current map
   */
  getCurrentMapNPCs(): NPC[] {
    if (!this.currentMapId) return [];
    return this.getNPCsForMap(this.currentMapId);
  }

  /**
   * Get NPC by ID from current map
   */
  getNPCById(npcId: string): NPC | null {
    const npcs = this.getCurrentMapNPCs();
    return npcs.find(npc => npc.id === npcId) || null;
  }

  /**
   * Check if there's an NPC at or near a position
   */
  getNPCAtPosition(position: Position, radius: number = 1.5): NPC | null {
    const npcs = this.getCurrentMapNPCs();

    for (const npc of npcs) {
      const dx = Math.abs(npc.position.x - position.x);
      const dy = Math.abs(npc.position.y - position.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      const interactionRadius = npc.interactionRadius || radius;
      if (distance <= interactionRadius) {
        return npc;
      }
    }

    return null;
  }

  /**
   * Update NPC position (for animated/moving NPCs)
   */
  updateNPCPosition(npcId: string, newPosition: Position): void {
    const npc = this.getNPCById(npcId);
    if (npc) {
      npc.position = newPosition;
    }
  }

  /**
   * Update NPC direction (for animated NPCs)
   */
  updateNPCDirection(npcId: string, direction: Direction): void {
    const npc = this.getNPCById(npcId);
    if (npc) {
      npc.direction = direction;
    }
  }

  /**
   * Clear all NPCs (useful for testing/reset)
   */
  clear(): void {
    this.npcsByMap.clear();
    this.currentMapId = null;
    console.log('[NPCManager] Cleared all NPCs');
  }
}

// Singleton export
export const npcManager = new NPCManagerClass();
