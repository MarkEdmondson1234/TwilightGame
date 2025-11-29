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
  isInDialogue: boolean; // Freeze movement when talking to player
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
          isInDialogue: false,
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
   * Update animated NPC states (for NPCs with state machines like the cat)
   * Returns true if any animation frame changed (needs re-render)
   */
  private updateAnimatedStates(currentTime: number): boolean {
    const npcs = this.getCurrentMapNPCs();
    let anyAnimationChanged = false;

    npcs.forEach(npc => {
      if (!npc.animatedStates) return;

      const states = npc.animatedStates;
      const currentState = states.states[states.currentState];
      if (!currentState) return;

      // Determine which sprite array to use based on direction
      let spriteArray = currentState.sprites; // Default fallback

      if (currentState.directionalSprites) {
        const dirSprites = currentState.directionalSprites;
        switch (npc.direction) {
          case Direction.Up:
            if (dirSprites.up && dirSprites.up.length > 0) spriteArray = dirSprites.up;
            break;
          case Direction.Down:
            if (dirSprites.down && dirSprites.down.length > 0) spriteArray = dirSprites.down;
            break;
          case Direction.Left:
            if (dirSprites.left && dirSprites.left.length > 0) spriteArray = dirSprites.left;
            break;
          case Direction.Right:
            if (dirSprites.right && dirSprites.right.length > 0) spriteArray = dirSprites.right;
            break;
        }
      }

      // Update animation frame
      if (currentTime - states.lastFrameChange >= currentState.animationSpeed) {
        // Reset frame if sprite array changed (different length)
        if (states.currentFrame >= spriteArray.length) {
          states.currentFrame = 0;
        }
        states.currentFrame = (states.currentFrame + 1) % spriteArray.length;
        states.lastFrameChange = currentTime;

        // Update NPC sprite to current frame from appropriate array
        npc.sprite = spriteArray[states.currentFrame];
        anyAnimationChanged = true; // Animation frame changed
      } else {
        // Even when not advancing frame, ensure correct sprite array is used
        const oldSprite = npc.sprite;
        if (states.currentFrame >= spriteArray.length) {
          states.currentFrame = 0;
        }
        npc.sprite = spriteArray[states.currentFrame];
        if (npc.sprite !== oldSprite) {
          anyAnimationChanged = true; // Sprite changed due to direction change
        }
      }

      // Check for auto-transitions (duration-based state changes)
      if (currentState.duration && currentState.nextState) {
        const timeInState = currentTime - states.lastStateChange;
        if (timeInState >= currentState.duration) {
          this.transitionNPCState(npc.id, currentState.nextState);
          anyAnimationChanged = true; // State transition
        }
      }
    });

    return anyAnimationChanged;
  }

  /**
   * Transition an animated NPC to a new state
   */
  transitionNPCState(npcId: string, newState: string): void {
    const npc = this.getNPCById(npcId);
    if (!npc || !npc.animatedStates) return;

    const states = npc.animatedStates;
    if (!states.states[newState]) {
      console.warn(`[NPCManager] Invalid state transition: ${states.currentState} -> ${newState} for NPC ${npcId}`);
      return;
    }

    console.log(`[NPCManager] NPC ${npcId} transitioning: ${states.currentState} -> ${newState}`);

    states.currentState = newState;
    states.lastStateChange = Date.now();
    states.currentFrame = 0;
    states.lastFrameChange = Date.now();

    // Update sprite to first frame of new state
    const newStateData = states.states[newState];
    npc.sprite = newStateData.sprites[0];
  }

  /**
   * Trigger an event on an animated NPC (e.g., 'interact')
   */
  triggerNPCEvent(npcId: string, eventName: string): void {
    const npc = this.getNPCById(npcId);
    if (!npc || !npc.animatedStates) return;

    const states = npc.animatedStates;
    const currentState = states.states[states.currentState];

    if (currentState.transitionsTo && currentState.transitionsTo[eventName]) {
      const nextState = currentState.transitionsTo[eventName];
      this.transitionNPCState(npcId, nextState);
    }
  }

  /**
   * Update NPC movement and behavior
   * Call this in the game loop with deltaTime (seconds)
   * Returns true if any NPC moved or animation changed (needs re-render)
   */
  updateNPCs(deltaTime: number): boolean {
    const currentTime = Date.now();
    const npcs = this.getCurrentMapNPCs();
    let anyNPCMoved = false;

    // Update animated states for all NPCs (returns true if any animation changed)
    const animationChanged = this.updateAnimatedStates(currentTime);
    if (animationChanged) {
      anyNPCMoved = true;
    }

    npcs.forEach(npc => {
      if (npc.behavior === NPCBehavior.STATIC) return; // Static NPCs don't move

      const state = this.npcStates.get(npc.id);
      if (!state) return;

      // Don't move if NPC is in dialogue
      if (state.isInDialogue) return;

      const timeSinceLastMove = currentTime - state.lastMoveTime;

      // FOLLOW behavior (for NPCs with followTarget)
      if (npc.followTarget) {
        const targetNPC = this.getNPCById(npc.followTarget);
        if (targetNPC) {
          const dx = targetNPC.position.x - npc.position.x;
          const dy = targetNPC.position.y - npc.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Follow if target is more than 2 tiles away, but not too close (stay 1-2 tiles away)
          if (distance > 2.0) {
            // Move towards target
            const movement = this.NPC_SPEED * deltaTime * 1.2; // Slightly faster to catch up
            let newPos = { ...npc.position };

            // Normalize direction and move
            const moveX = (dx / distance) * movement;
            const moveY = (dy / distance) * movement;

            newPos.x += moveX;
            newPos.y += moveY;

            // Update direction based on movement
            if (Math.abs(dx) > Math.abs(dy)) {
              npc.direction = dx > 0 ? Direction.Right : Direction.Left;
            } else {
              npc.direction = dy > 0 ? Direction.Down : Direction.Up;
            }

            // Check collision before moving
            if (!this.checkCollision(newPos)) {
              npc.position = newPos;
              anyNPCMoved = true;
            }
          }
        }
      }
      // WANDER behavior
      else if (npc.behavior === NPCBehavior.WANDER) {
        // If NPC has animated states, only move when in a "roaming" or "walking" state
        // This synchronizes movement with the animation state machine
        if (npc.animatedStates) {
          const currentAnimState = npc.animatedStates.currentState;
          // Only allow movement in states that should show walking animation
          if (currentAnimState !== 'roaming' && currentAnimState !== 'walking') {
            // Force waiting state when not in a movement animation state
            state.isWaiting = true;
            return; // Skip movement updates, just animate in place
          }
        }

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
              anyNPCMoved = true; // NPC actually moved
            } else {
              // Hit an obstacle, try other directions before giving up
              const allDirections = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
              const otherDirections = allDirections.filter(d => d !== state.moveDirection);

              // Shuffle other directions for variety
              for (let i = otherDirections.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [otherDirections[i], otherDirections[j]] = [otherDirections[j], otherDirections[i]];
              }

              let foundAlternative = false;
              for (const dir of otherDirections) {
                const altPos = { ...npc.position };
                switch (dir) {
                  case Direction.Up: altPos.y -= movement; break;
                  case Direction.Down: altPos.y += movement; break;
                  case Direction.Left: altPos.x -= movement; break;
                  case Direction.Right: altPos.x += movement; break;
                }
                if (!this.checkCollision(altPos)) {
                  // Found a clear direction, switch to it
                  state.moveDirection = dir;
                  npc.direction = dir;
                  npc.position = altPos;
                  anyNPCMoved = true;
                  foundAlternative = true;
                  break;
                }
              }

              // If no clear direction found, wait briefly then try again
              if (!foundAlternative) {
                state.isWaiting = true;
                state.waitDuration = 300 + Math.random() * 500; // Shorter wait
                state.lastMoveTime = currentTime;
              }
            }
          }
        }
      }

      // TODO: Implement PATROL behavior
    });

    return anyNPCMoved;
  }

  /**
   * Set dialogue state for an NPC (freeze/unfreeze movement)
   */
  setNPCDialogueState(npcId: string, inDialogue: boolean): void {
    const state = this.npcStates.get(npcId);
    if (state) {
      state.isInDialogue = inDialogue;
    }
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
