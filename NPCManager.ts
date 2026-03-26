import { NPC, Position, Direction, NPCBehavior, isTileSolid, SeasonalLocation } from './types';
import { getTileData } from './utils/mapUtils';
import { PLAYER_SIZE } from './constants';
import { metadataCache } from './utils/MetadataCache';
import { TimeManager, Season } from './utils/TimeManager';
import { eventBus, GameEvent } from './utils/EventBus';
import { audioManager } from './utils/AudioManager';

/**
 * NPCManager - Single Source of Truth for all NPC data
 *
 * Manages:
 * - NPC registration per map
 * - NPC positions and states
 * - NPC behaviors and movement
 * - NPC interaction detection
 * - NPC visibility conditions (seasonal, time of day, weather)
 * - Seasonal NPC locations and map transitions
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
  baseMapId: string; // Original map where NPC was registered
  basePosition: Position; // Original position when NPC was created
  baseDirection: Direction; // Original direction when NPC was created
  baseScale?: number; // Original scale for restoring after state-based scale override
  // Proximity trigger tracking
  previousState?: string; // State before proximity trigger (for recovery)
  proximityRecoveryStartTime?: number; // Timestamp when player left proximity zone
  // Hostile NPC pursuit tracking
  lastCombatTime?: number; // Timestamp of last combat trigger (for cooldown)
  isPursuing?: boolean; // Currently in pursuit mode
}

class NPCManagerClass {
  private npcsByMap: Map<string, NPC[]> = new Map();
  private npcStates: Map<string, NPCState> = new Map();
  private currentMapId: string | null = null;
  private currentSeason: Season | null = null;

  // Global NPC registry for NPCs with seasonal locations (can appear on multiple maps)
  private globalNPCs: Map<string, NPC> = new Map();

  // Temporary position overrides applied during special events (e.g. Yule celebration)
  private eventOverrides: Map<string, Position> = new Map();

  // NPCs frozen in place during scripted events (separate from isInDialogue so talking doesn't unfreeze them)
  private frozenNPCIds: Set<string> = new Set();

  private readonly NPC_SPEED = 1.0; // tiles per second
  private readonly NPC_SIZE = PLAYER_SIZE; // Same size as player

  /**
   * Register NPCs for a specific map
   */
  registerNPCs(mapId: string, npcs: NPC[]): void {
    this.npcsByMap.set(mapId, npcs);

    // Initialize state for each NPC (only if not already initialized)
    npcs.forEach((npc) => {
      // If NPC has seasonal locations, add to global registry
      if (npc.seasonalLocations) {
        this.globalNPCs.set(npc.id, npc);
      }

      if (!this.npcStates.has(npc.id)) {
        this.npcStates.set(npc.id, {
          npc,
          lastMoveTime: Date.now(),
          moveDirection: null,
          moveDuration: 0,
          waitDuration: 0,
          isWaiting: true,
          isInDialogue: false,
          baseMapId: mapId,
          basePosition: { ...npc.position },
          baseDirection: npc.direction,
          baseScale: npc.scale,
        });
      } else {
        // Update baseScale on re-registration (e.g., shop fox has different scale than village fox)
        const state = this.npcStates.get(npc.id)!;
        state.baseScale = npc.scale;
      }
    });

    console.log(`[NPCManager] Registered ${npcs.length} NPCs for map: ${mapId}`);

    // Reset entry animations for NPCs being registered on the current map
    // This handles background-image maps where NPCs are registered via loadLayers()
    // after setCurrentMap() has already been called
    if (mapId === this.currentMapId) {
      this.resetEntryAnimations(npcs);
    }
  }

  /**
   * Set the current active map
   */
  setCurrentMap(mapId: string): void {
    this.currentMapId = mapId;

    // Reset entry animations for NPCs already registered on this map
    const npcs = this.getNPCsForMap(mapId);
    if (npcs.length > 0) {
      this.resetEntryAnimations(npcs);
    }
  }

  /**
   * Reset entry animations for NPCs that have walk-in behaviour
   * Moves NPCs to their start position and transitions to walk state
   */
  private resetEntryAnimations(npcs: NPC[]): void {
    for (const npc of npcs) {
      if (!npc.entryAnimation) continue;

      const entry = npc.entryAnimation;

      // Move NPC to start position
      npc.position = { ...entry.startPosition };

      // Set walk direction
      if (entry.walkDirection !== undefined) {
        npc.direction = entry.walkDirection;
      }

      // Transition to walk state
      if (npc.animatedStates && npc.animatedStates.states[entry.walkState]) {
        this.transitionNPCState(npc.id, entry.walkState);
      }

      // Play entry sound effect (e.g., fox humming)
      if (entry.sound && audioManager.hasSound(entry.sound)) {
        audioManager.playSfx(entry.sound);
      }

      console.log(
        `[NPCManager] Entry animation: ${npc.id} starts at (${entry.startPosition.x}, ${entry.startPosition.y})`
      );
    }
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
    return allNPCs.filter((npc) => this.isNPCVisible(npc));
  }

  /**
   * Get NPC by ID from current map (respects visibility conditions)
   */
  getNPCById(npcId: string): NPC | null {
    const npcs = this.getCurrentMapNPCs();
    return npcs.find((npc) => npc.id === npcId) || null;
  }

  /** Unfreeze a hostile NPC after combat ends (allows pursuit to resume after cooldown). */
  unfreezeNPC(npcId: string): void {
    const state = this.npcStates.get(npcId);
    if (state) {
      state.isInDialogue = false;
    }
  }

  /** Freeze a wandering NPC in place during a scripted event (e.g. Yule celebration). */
  freezeWandering(npcId: string): void {
    this.frozenNPCIds.add(npcId);
  }

  /** Unfreeze a wandering NPC after the scripted event ends. */
  unfreezeWandering(npcId: string): void {
    this.frozenNPCIds.delete(npcId);
  }

  /**
   * Check if there's an NPC at or near a position (respects visibility conditions)
   */
  getNPCAtPosition(position: Position, radius: number = 1.5): NPC | null {
    const npcs = this.getCurrentMapNPCs();

    for (const npc of npcs) {
      // Skip NPCs performing entry walk-in animation
      if (npc.entryAnimation && npc.animatedStates?.currentState === npc.entryAnimation.walkState) {
        continue;
      }

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
  private checkCollision(pos: Position, canFly: boolean = false): boolean {
    const halfSize = this.NPC_SIZE / 2;
    const minTileX = Math.floor(pos.x - halfSize);
    const maxTileX = Math.floor(pos.x + halfSize);
    const minTileY = Math.floor(pos.y - halfSize);
    const maxTileY = Math.floor(pos.y + halfSize);

    // Flying NPCs bypass tile/sprite collision but must stay within map bounds
    if (canFly) {
      for (let y = minTileY; y <= maxTileY; y++) {
        for (let x = minTileX; x <= maxTileX; x++) {
          if (getTileData(x, y) === null) return true; // Out of bounds
        }
      }
      return false;
    }

    // First check regular tile collision
    for (let y = minTileY; y <= maxTileY; y++) {
      for (let x = minTileX; x <= maxTileX; x++) {
        const tileData = getTileData(x, y);
        if (
          tileData &&
          isTileSolid(tileData.collisionType) &&
          !metadataCache.isMultiTileSprite(tileData.type)
        ) {
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
        const spriteMetadata = tileData ? metadataCache.getMetadata(tileData.type) : undefined;

        if (spriteMetadata && tileData && isTileSolid(tileData.collisionType)) {
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
          if (
            pos.x + halfSize > spriteLeft &&
            pos.x - halfSize < spriteRight &&
            pos.y + halfSize > spriteTop &&
            pos.y - halfSize < spriteBottom
          ) {
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

    npcs.forEach((npc) => {
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

      // Apply per-state scale override (e.g., smaller during walk animation)
      const npcState = this.npcStates.get(npc.id);
      if (npcState?.baseScale !== undefined) {
        const targetScale = currentState.scale ?? npcState.baseScale;
        if (npc.scale !== targetScale) {
          npc.scale = targetScale;
          anyAnimationChanged = true;
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
      console.warn(
        `[NPCManager] Invalid state transition: ${states.currentState} -> ${newState} for NPC ${npcId}`
      );
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
   * Check proximity triggers for all NPCs
   * Triggers state changes when player enters/leaves proximity zones
   * (e.g., possum plays dead when player approaches)
   */
  private checkProximityTriggers(playerPos: Position): boolean {
    const currentTime = Date.now();
    const npcs = this.getCurrentMapNPCs();
    let anyStateChanged = false;

    for (const npc of npcs) {
      if (!npc.animatedStates) continue;

      const npcState = this.npcStates.get(npc.id);
      if (!npcState) continue;

      // Calculate distance to player
      const dx = npc.position.x - playerPos.x;
      const dy = npc.position.y - playerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check each state for proximity triggers
      for (const [stateName, state] of Object.entries(npc.animatedStates.states)) {
        if (!state.proximityTrigger) continue;

        const trigger = state.proximityTrigger;
        const currentStateName = npc.animatedStates.currentState;

        // If we're in a state WITH a trigger and player is within radius -> trigger
        if (currentStateName === stateName && distance <= trigger.radius) {
          // Store previous state for recovery
          npcState.previousState = currentStateName;
          npcState.proximityRecoveryStartTime = undefined; // Reset recovery timer
          this.transitionNPCState(npc.id, trigger.triggerState);
          anyStateChanged = true;
          break; // Only process one trigger per NPC per frame
        }

        // If we're in the TRIGGERED state and player has moved away -> recover
        if (currentStateName === trigger.triggerState) {
          const recoveryRadius = trigger.recoveryRadius ?? trigger.radius + 1.5;

          if (distance > recoveryRadius) {
            const recoveryDelay = trigger.recoveryDelay ?? 0;

            // Start recovery timer if not started
            if (npcState.proximityRecoveryStartTime === undefined) {
              npcState.proximityRecoveryStartTime = currentTime;
            }

            // Check if delay has passed
            if (currentTime - npcState.proximityRecoveryStartTime >= recoveryDelay) {
              const recoveryState = trigger.recoveryState ?? npcState.previousState ?? 'roaming';
              this.transitionNPCState(npc.id, recoveryState);
              npcState.proximityRecoveryStartTime = undefined;
              anyStateChanged = true;
            }
          } else {
            // Player came back within radius, reset recovery timer
            npcState.proximityRecoveryStartTime = undefined;
          }
          break; // Only process one trigger per NPC per frame
        }
      }
    }

    return anyStateChanged;
  }

  /**
   * Update NPC movement and behavior
   * Call this in the game loop with deltaTime (seconds) and optional player position
   * Returns true if any NPC moved or animation changed (needs re-render)
   *
   * @param deltaTime Time since last frame in seconds
   * @param playerPos Optional player position for proximity triggers
   */
  updateNPCs(deltaTime: number, playerPos?: Position): boolean {
    const currentTime = Date.now();
    const npcs = this.getCurrentMapNPCs();
    let anyNPCMoved = false;

    // Update animated states for all NPCs (returns true if any animation changed)
    const animationChanged = this.updateAnimatedStates(currentTime);
    if (animationChanged) {
      anyNPCMoved = true;
    }

    // Check proximity triggers if player position provided
    if (playerPos) {
      const proximityChanged = this.checkProximityTriggers(playerPos);
      if (proximityChanged) {
        anyNPCMoved = true;
      }
    }

    npcs.forEach((npc) => {
      // Process entry animations (walk-in) regardless of behavior type
      if (npc.entryAnimation) {
        const entry = npc.entryAnimation;
        const currentState = npc.animatedStates?.currentState;

        // Only move during the walk state
        if (currentState === entry.walkState) {
          const speed = entry.speed ?? this.NPC_SPEED;
          const movement = speed * deltaTime;

          const dx = entry.targetPosition.x - npc.position.x;
          const dy = entry.targetPosition.y - npc.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= movement) {
            // Arrived at target - snap to position and transition to idle
            npc.position = { ...entry.targetPosition };
            this.transitionNPCState(npc.id, entry.idleState);
          } else {
            // Move towards target
            npc.position.x += (dx / distance) * movement;
            npc.position.y += (dy / distance) * movement;
          }
          anyNPCMoved = true;
        }
      }

      if (npc.behavior === NPCBehavior.STATIC) return; // Static NPCs don't move

      const state = this.npcStates.get(npc.id);
      if (!state) return;

      // Don't move if NPC is in dialogue
      if (state.isInDialogue) return;

      // Don't move if NPC is frozen for a scripted event (e.g. Yule celebration)
      if (this.frozenNPCIds.has(npc.id)) return;

      // HOSTILE PURSUIT — chase player and trigger combat on contact
      if (npc.hostileConfig && playerPos) {
        const hc = npc.hostileConfig;
        const dx = playerPos.x - npc.position.x;
        const dy = playerPos.y - npc.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check cooldown
        const cooldownElapsed =
          !state.lastCombatTime || currentTime - state.lastCombatTime >= hc.combatCooldownMs;

        if (distance <= hc.detectionRadius && cooldownElapsed) {
          // Switch to pursuing state if not already
          if (!state.isPursuing) {
            state.isPursuing = true;
            if (npc.animatedStates && npc.animatedStates.states['pursuing']) {
              this.transitionNPCState(npc.id, 'pursuing');
            }
          }

          // Contact — trigger combat
          if (distance <= hc.contactRadius) {
            state.lastCombatTime = currentTime;
            state.isPursuing = false;
            state.isInDialogue = true; // Freeze during combat
            const portrait = npc.portraitSprite || npc.dialogueSprite || npc.sprite;
            eventBus.emit(GameEvent.COMBAT_INITIATED, {
              npcId: npc.id,
              npcName: npc.name,
              npcSprite: portrait,
              miniGameId: hc.combatMiniGameId,
            });
            return; // Skip all other movement
          }

          // Move toward player
          const movement = this.NPC_SPEED * hc.pursuitSpeed * deltaTime;
          const newPos = { ...npc.position };
          newPos.x += (dx / distance) * movement;
          newPos.y += (dy / distance) * movement;

          // Update facing direction
          if (Math.abs(dx) > Math.abs(dy)) {
            npc.direction = dx > 0 ? Direction.Right : Direction.Left;
          } else {
            npc.direction = dy > 0 ? Direction.Down : Direction.Up;
          }

          if (!this.checkCollision(newPos, npc.canFly)) {
            npc.position = newPos;
            anyNPCMoved = true;
          }
          return; // Skip normal wander/follow
        } else if (state.isPursuing) {
          // Player left detection range — return to normal wandering
          state.isPursuing = false;
          if (npc.animatedStates) {
            // Return to first non-pursuing state
            const fallbackState =
              Object.keys(npc.animatedStates.states).find((s) => s !== 'pursuing') ?? 'standing';
            this.transitionNPCState(npc.id, fallbackState);
          }
        }
      }

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

            // Check collision before moving (flying NPCs bypass obstacles)
            if (!this.checkCollision(newPos, npc.canFly)) {
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

            // Check collision before moving (flying NPCs bypass obstacles)
            if (!this.checkCollision(newPos, npc.canFly)) {
              npc.position = newPos;
              anyNPCMoved = true; // NPC actually moved
            } else {
              // Hit an obstacle, try other directions before giving up
              const allDirections = [Direction.Up, Direction.Down, Direction.Left, Direction.Right];
              const otherDirections = allDirections.filter((d) => d !== state.moveDirection);

              // Shuffle other directions for variety
              for (let i = otherDirections.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [otherDirections[i], otherDirections[j]] = [otherDirections[j], otherDirections[i]];
              }

              let foundAlternative = false;
              for (const dir of otherDirections) {
                const altPos = { ...npc.position };
                switch (dir) {
                  case Direction.Up:
                    altPos.y -= movement;
                    break;
                  case Direction.Down:
                    altPos.y += movement;
                    break;
                  case Direction.Left:
                    altPos.x -= movement;
                    break;
                  case Direction.Right:
                    altPos.x += movement;
                    break;
                }
                if (!this.checkCollision(altPos, npc.canFly)) {
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

    // Emit event if any NPC moved
    if (anyNPCMoved) {
      eventBus.emit(GameEvent.NPC_MOVED, { npcId: 'multiple' });
    }

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
    if (mapNPCs.find((n) => n.id === npc.id)) {
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
        baseMapId: this.currentMapId,
        basePosition: { ...npc.position },
        baseDirection: npc.direction,
      });
    }

    console.log(`[NPCManager] Added dynamic NPC ${npc.id} to map ${this.currentMapId}`);
    eventBus.emit(GameEvent.NPC_SPAWNED, { npcId: npc.id, mapId: this.currentMapId });
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
    const filteredNPCs = mapNPCs.filter((n) => n.id !== npcId);

    if (filteredNPCs.length === mapNPCs.length) {
      console.warn(`[NPCManager] NPC ${npcId} not found on map ${this.currentMapId}`);
      return;
    }

    this.npcsByMap.set(this.currentMapId, filteredNPCs);
    this.npcStates.delete(npcId);

    console.log(`[NPCManager] Removed dynamic NPC ${npcId} from map ${this.currentMapId}`);
    eventBus.emit(GameEvent.NPC_DESPAWNED, { npcId, mapId: this.currentMapId });
  }

  /**
   * Temporarily override an NPC's scale for a special event (e.g. Yule celebration).
   * Updates both npc.scale AND npcState.baseScale so the animation system respects the
   * new size (otherwise per-state scale logic resets it every tick).
   * Returns the original scale so the caller can restore it.
   */
  setEventScaleOverride(npcId: string, scale: number): number | null {
    // Find NPC across all maps (it may have been moved cross-map by setEventOverridePosition)
    let npc: NPC | undefined;
    for (const npcs of this.npcsByMap.values()) {
      const found = npcs.find((n) => n.id === npcId);
      if (found) { npc = found; break; }
    }
    if (!npc) return null;

    const npcState = this.npcStates.get(npcId);
    const originalScale = npc.scale ?? npcState?.baseScale ?? 3.0;

    npc.scale = scale;
    if (npcState) npcState.baseScale = scale;

    return originalScale;
  }

  /**
   * Restore an NPC's scale after a special event.
   * Updates both npc.scale AND npcState.baseScale.
   */
  restoreEventScale(npcId: string, scale: number): void {
    let npc: NPC | undefined;
    for (const npcs of this.npcsByMap.values()) {
      const found = npcs.find((n) => n.id === npcId);
      if (found) { npc = found; break; }
    }
    if (!npc) return;

    npc.scale = scale;
    const npcState = this.npcStates.get(npcId);
    if (npcState) npcState.baseScale = scale;
  }

  /**
   * Temporarily override an NPC's position for a special event (e.g. Yule celebration).
   * Only works for NPCs already on the current map.
   */
  setEventOverridePosition(npcId: string, position: Position): void {
    const npc = this.getNPCById(npcId);
    if (!npc) {
      console.warn(`[NPCManager] setEventOverridePosition: NPC "${npcId}" not found on current map`);
      return;
    }
    if (!this.eventOverrides.has(npcId)) {
      this.eventOverrides.set(npcId, { ...npc.position });
    }
    npc.position = { ...position };
    eventBus.emit(GameEvent.NPC_MOVED, { npcId, position });
  }

  /**
   * Restore all NPCs to their positions before event overrides were applied,
   * then clear the override registry.
   */
  clearEventOverrides(): void {
    for (const [npcId, originalPosition] of this.eventOverrides) {
      const npc = this.getNPCById(npcId);
      if (npc) {
        npc.position = { ...originalPosition };
        eventBus.emit(GameEvent.NPC_MOVED, { npcId, position: originalPosition });
      }
    }
    this.eventOverrides.clear();
    this.frozenNPCIds.clear();
  }

  /**
   * Get the current location for an NPC based on the current season
   * Returns null if NPC should not appear this season
   */
  private getSeasonalLocationForNPC(
    npc: NPC
  ): { mapId: string; position: Position; direction: Direction } | null {
    if (!npc.seasonalLocations) {
      // No seasonal locations, use base location
      const state = this.npcStates.get(npc.id);
      if (!state) return null;

      return {
        mapId: state.baseMapId,
        position: state.basePosition,
        direction: state.baseDirection,
      };
    }

    const currentTime = TimeManager.getCurrentTime();
    const season = currentTime.season.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';
    const seasonalData = npc.seasonalLocations[season];

    if (seasonalData) {
      return {
        mapId: seasonalData.mapId,
        position: seasonalData.position,
        direction: seasonalData.direction || npc.direction,
      };
    }

    // No data for this season, use base location
    const state = this.npcStates.get(npc.id);
    if (!state) return null;

    return {
      mapId: state.baseMapId,
      position: state.basePosition,
      direction: state.baseDirection,
    };
  }

  /**
   * Update NPC positions based on current season
   * Call this when the season changes
   */
  updateSeasonalLocations(): void {
    const currentTime = TimeManager.getCurrentTime();
    const newSeason = currentTime.season;

    // Only update if season actually changed
    if (this.currentSeason === newSeason) {
      return;
    }

    console.log(
      `[NPCManager] Season changed from ${this.currentSeason} to ${newSeason}, updating NPC locations`
    );
    this.currentSeason = newSeason;

    // Process all NPCs with seasonal locations
    this.globalNPCs.forEach((npc) => {
      const locationData = this.getSeasonalLocationForNPC(npc);
      if (!locationData) return;

      const { mapId, position, direction } = locationData;

      // Remove NPC from all maps first
      this.npcsByMap.forEach((mapNPCs, currentMapId) => {
        const filtered = mapNPCs.filter((n) => n.id !== npc.id);
        if (filtered.length !== mapNPCs.length) {
          this.npcsByMap.set(currentMapId, filtered);
        }
      });

      // Add NPC to the appropriate map for this season
      const targetMapNPCs = this.npcsByMap.get(mapId) || [];

      // Update NPC position and direction
      npc.position = { ...position };
      npc.direction = direction;

      // Only add if not already in the map
      if (!targetMapNPCs.find((n) => n.id === npc.id)) {
        targetMapNPCs.push(npc);
        this.npcsByMap.set(mapId, targetMapNPCs);
      }

      console.log(
        `[NPCManager] Moved NPC ${npc.id} to map ${mapId} at (${position.x}, ${position.y}) for ${newSeason}`
      );
    });
  }

  /**
   * Initialize seasonal locations (call this after all maps are registered)
   */
  initializeSeasonalLocations(): void {
    const currentTime = TimeManager.getCurrentTime();
    // Set currentSeason to null first to force the initial placement
    this.currentSeason = null;
    // Now update to the actual current season (this will trigger placement)
    this.updateSeasonalLocations();
    console.log(`[NPCManager] Initialized seasonal locations for ${this.currentSeason}`);
  }

  /**
   * Check if season has changed and update NPC locations if needed
   * Call this periodically (e.g., in the game loop)
   * @returns true if season changed and NPCs were relocated
   */
  checkSeasonChange(): boolean {
    const currentTime = TimeManager.getCurrentTime();
    if (this.currentSeason !== currentTime.season) {
      this.updateSeasonalLocations();
      return true;
    }
    return false;
  }

  /**
   * Clear all NPCs (useful for testing/reset)
   */
  clear(): void {
    this.npcsByMap.clear();
    this.npcStates.clear();
    this.globalNPCs.clear();
    this.currentMapId = null;
    this.currentSeason = null;
    console.log('[NPCManager] Cleared all NPCs');
  }
}

// Singleton export
export const npcManager = new NPCManagerClass();
