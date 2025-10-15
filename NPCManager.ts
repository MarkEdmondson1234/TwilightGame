import { NPC, Position, Direction, NPCBehavior } from './types';
import { getTileData } from './utils/mapUtils';
import { PLAYER_SIZE } from './constants';

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

interface NPCState {
  npc: NPC;
  lastMoveTime: number;
  moveDirection: Direction | null;
  moveDuration: number; // How long to move in current direction (ms)
  waitDuration: number; // How long to wait before next move (ms)
  isWaiting: boolean;
}

class NPCManagerClass {
  private npcsByMap: Map<string, NPC[]> = new Map();
  private npcStates: Map<string, NPCState> = new Map();
  private currentMapId: string | null = null;

  private readonly NPC_SPEED = 1.0; // tiles per second
  private readonly NPC_SIZE = PLAYER_SIZE; // Same size as player

  /**
   * Register NPCs for a specific map
   */
  registerNPCs(mapId: string, npcs: NPC[]): void {
    this.npcsByMap.set(mapId, npcs);

    // Initialize state for each NPC (only if not already initialized)
    npcs.forEach(npc => {
      if (!this.npcStates.has(npc.id)) {
        this.npcStates.set(npc.id, {
          npc,
          lastMoveTime: Date.now(),
          moveDirection: null,
          moveDuration: 0,
          waitDuration: 0,
          isWaiting: true,
        });
      }
    });

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
   * Check if position would collide with solid tiles
   */
  private checkCollision(pos: Position): boolean {
    const halfSize = this.NPC_SIZE / 2;
    const minTileX = Math.floor(pos.x - halfSize);
    const maxTileX = Math.floor(pos.x + halfSize);
    const minTileY = Math.floor(pos.y - halfSize);
    const maxTileY = Math.floor(pos.y + halfSize);

    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        const tileData = getTileData(x, y);
        if (tileData && tileData.isSolid) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Update NPC movement and behavior
   * Call this in the game loop with deltaTime (seconds)
   */
  updateNPCs(deltaTime: number): void {
    const currentTime = Date.now();
    const npcs = this.getCurrentMapNPCs();

    npcs.forEach(npc => {
      if (npc.behavior === NPCBehavior.STATIC) return; // Static NPCs don't move

      const state = this.npcStates.get(npc.id);
      if (!state) return;

      const timeSinceLastMove = currentTime - state.lastMoveTime;

      // WANDER behavior
      if (npc.behavior === NPCBehavior.WANDER) {
        if (state.isWaiting) {
          // Waiting between moves
          if (timeSinceLastMove >= state.waitDuration) {
            // Pick a random direction and duration
            const directions = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
            state.moveDirection = directions[Math.floor(Math.random() * directions.length)];
            state.moveDuration = 1000 + Math.random() * 2000; // 1-3 seconds
            state.isWaiting = false;
            state.lastMoveTime = currentTime;
            npc.direction = state.moveDirection;
          }
        } else {
          // Moving
          if (timeSinceLastMove >= state.moveDuration) {
            // Stop moving, start waiting
            state.isWaiting = true;
            state.waitDuration = 1000 + Math.random() * 3000; // 1-4 seconds
            state.lastMoveTime = currentTime;
          } else {
            // Continue moving in current direction
            const movement = this.NPC_SPEED * deltaTime;
            let newPos = { ...npc.position };

            switch (state.moveDirection) {
              case Direction.Up:
                newPos.y -= movement;
                break;
              case Direction.Down:
                newPos.y += movement;
                break;
              case Direction.Left:
                newPos.x -= movement;
                break;
              case Direction.Right:
                newPos.x += movement;
                break;
            }

            // Check collision before moving
            if (!this.checkCollision(newPos)) {
              npc.position = newPos;
            } else {
              // Hit an obstacle, stop and wait
              state.isWaiting = true;
              state.waitDuration = 500 + Math.random() * 1000;
              state.lastMoveTime = currentTime;
            }
          }
        }
      }

      // TODO: Implement PATROL behavior
    });
  }

  /**
   * Clear all NPCs (useful for testing/reset)
   */
  clear(): void {
    this.npcsByMap.clear();
    this.npcStates.clear();
    this.currentMapId = null;
    console.log('[NPCManager] Cleared all NPCs');
  }
}

// Singleton export
export const npcManager = new NPCManagerClass();
