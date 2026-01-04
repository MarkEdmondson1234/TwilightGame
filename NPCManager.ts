import { NPC, Position, Direction, NPCBehavior } from './types';
import { getTileData } from './utils/mapUtils';
import { PLAYER_SIZE, SPRITE_METADATA } from './constants';
import { TimeManager } from './utils/TimeManager';

/**
 * NPCManager - Single Source of Truth for all NPC data
 *
 * Manages:
 * - NPC registration per map
 * - NPC positions and states
 * - NPC behaviors and movement
 * - NPC interaction detection
 * - NPC visibility conditions (seasonal, time of day, weather)
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
   * Check if an NPC is visible based on its visibility conditions
   * Checks season, time of day, and weather (when implemented)
   */
  isNPCVisible(npc: NPC): boolean {
    if (!npc.visibilityConditions) {
      return true; // No conditions means always visible
    }

    const conditions = npc.visibilityConditions;
    const currentTime = TimeManager.getCurrentTime();

    // Check season condition
    if (conditions.season && conditions.season !== currentTime.season.toLowerCase()) {
      return false; // Hide NPC if season doesn't match
    }

    // Check time of day condition
    if (conditions.timeOfDay && conditions.timeOfDay !== currentTime.timeOfDay.toLowerCase()) {
      return false; // Hide NPC if time of day doesn't match
    }

    // Weather conditions can be added here in the future
    // if (conditions.weather && conditions.weather !== currentWeather) {
    //   return false;
    // }

    return true; // All conditions passed
  }

  /**
   * Get all NPCs for a specific map
   */
  getNPCsForMap(mapId: string): NPC[] {
    return this.npcsByMap.get(mapId) || [];
  }

  /**
   * Get all NPCs for the current map (filtered by visibility conditions)
   */
  getCurrentMapNPCs(): NPC[] {
    if (!this.currentMapId) return [];
    const allNPCs = this.getNPCsForMap(this.currentMapId);
    // Filter by visibility conditions (seasonal creatures, time-based NPCs, etc.)
    return allNPCs.filter(npc => this.isNPCVisible(npc));
  }

  /**
   * Get NPC by ID from current map (respects visibility conditions)
   */
  getNPCById(npcId: string): NPC | null {
    const npcs = this.getCurrentMapNPCs();
    return npcs.find(npc => npc.id === npcId) || null;
  }

  /**
   * Check if there's an NPC at or near a position (respects visibility conditions)
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
   * Check if position would collide with solid tiles or multi-tile sprites
   * Uses the same collision detection logic as the player (from useCollisionDetection.ts)
   */
  private checkCollision(pos: Position): boolean {
    const halfSize = this.NPC_SIZE / 2;
    const minTileX = Math.floor(pos.x - halfSize);
    const maxTileX = Math.floor(pos.x + halfSize);
    const minTileY = Math.floor(pos.y - halfSize);
    const maxTileY = Math.floor(pos.y + halfSize);

    // First check regular tile collision
    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        const tileData = getTileData(x, y);
        if (tileData && tileData.isSolid && !SPRITE_METADATA.find(s => s.tileType === tileData.type)) {
          return true;
        }
      }
    }

    // Check for multi-tile sprite collision in a wider area
    // Need to check tiles that might have sprites extending into NPC position
    const searchRadius = 10; // Large enough to catch any sprite
    for (let tileY = minTileY - searchRadius; tileY <= maxTileY + searchRadius; tileY++) {
      for (let tileX = minTileX - searchRadius; tileX <= maxTileX + searchRadius; tileX++) {
        const tileData = getTileData(tileX, tileY);
        const spriteMetadata = SPRITE_METADATA.find(s => s.tileType === tileData?.type);

        if (spriteMetadata && tileData?.isSolid) {
          // Use collision-specific dimensions if provided, otherwise use sprite dimensions
          const collisionWidth = spriteMetadata.collisionWidth ?? spriteMetadata.spriteWidth;
          const collisionHeight = spriteMetadata.collisionHeight ?? spriteMetadata.spriteHeight;
          const collisionOffsetX = spriteMetadata.collisionOffsetX ?? spriteMetadata.offsetX;
          const collisionOffsetY = spriteMetadata.collisionOffsetY ?? spriteMetadata.offsetY;

          // Calculate collision bounds based on tile position and metadata
          const spriteLeft = tileX + collisionOffsetX;
          const spriteRight = spriteLeft + collisionWidth;
          const spriteTop = tileY + collisionOffsetY;
          const spriteBottom = spriteTop + collisionHeight;

          // Check if NPC position overlaps with collision bounds
          if (pos.x + halfSize > spriteLeft && pos.x - halfSize < spriteRight &&
              pos.y + halfSize > spriteTop && pos.y - halfSize < spriteBottom) {
            return true;
          }
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
            const newPos = { ...npc.position };

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
            const newPos = { ...npc.position };

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
   * Add a dynamic NPC to the current map (for time-based spawning like fairies)
   */
  addDynamicNPC(npc: NPC): void {
    if (!this.currentMapId) {
      console.warn('[NPCManager] Cannot add dynamic NPC: No current map');
      return;
    }

    const mapNPCs = this.npcsByMap.get(this.currentMapId) || [];

    // Check if NPC already exists
    if (mapNPCs.find(n => n.id === npc.id)) {
      console.warn(`[NPCManager] NPC ${npc.id} already exists on map ${this.currentMapId}`);
      return;
    }

    // Add to map
    mapNPCs.push(npc);
    this.npcsByMap.set(this.currentMapId, mapNPCs);

    // Initialize state
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

    console.log(`[NPCManager] Added dynamic NPC ${npc.id} to map ${this.currentMapId}`);
  }

  /**
   * Remove a dynamic NPC from the current map (for despawning)
   */
  removeDynamicNPC(npcId: string): void {
    if (!this.currentMapId) {
      console.warn('[NPCManager] Cannot remove dynamic NPC: No current map');
      return;
    }

    const mapNPCs = this.npcsByMap.get(this.currentMapId) || [];
    const filteredNPCs = mapNPCs.filter(n => n.id !== npcId);

    if (filteredNPCs.length === mapNPCs.length) {
      console.warn(`[NPCManager] NPC ${npcId} not found on map ${this.currentMapId}`);
      return;
    }

    this.npcsByMap.set(this.currentMapId, filteredNPCs);
    this.npcStates.delete(npcId);

    console.log(`[NPCManager] Removed dynamic NPC ${npcId} from map ${this.currentMapId}`);
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
