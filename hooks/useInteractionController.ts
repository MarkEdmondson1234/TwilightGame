/**
 * InteractionController - Domain controller for game interactions
 *
 * Consolidates all interaction-related state, refs, and logic:
 * - NPC dialogue state
 * - Radial menu state and handlers
 * - Farm action animations
 * - Canvas click handling
 *
 * Part of Phase 3 App.tsx refactoring - Domain Controllers.
 */

import { useState, useRef, useCallback, useEffect, MutableRefObject } from 'react';
import { Position, NPC, TileType } from '../types';
import { TILE_SIZE, INTERACTION } from '../constants';
import { MouseClickInfo } from './useMouseControls';
import { RadialMenuOption } from '../components/RadialMenu';
import { FarmActionType } from '../components/FarmActionAnimation';
import {
  getAvailableInteractions,
  FarmActionResult,
  ForageResult,
  TransitionResult,
  PlacedItemAction,
} from '../utils/actionHandlers';
import { npcManager } from '../NPCManager';
import { audioManager } from '../utils/AudioManager';
import { gameState } from '../GameState';
import { eventBus, GameEvent } from '../utils/EventBus';
import { getItem } from '../data/items';
import { inventoryManager } from '../utils/inventoryManager';
import { staminaManager } from '../utils/StaminaManager';
import { registerItemSprite } from '../utils/inventoryUIHelper';
import { getDistance } from '../utils/pathfinding';
import { InventoryItem } from '../components/Inventory';
import type { UseUIStateReturn } from './useUIState';
import {
  canCleanCobwebs,
  checkCobwebClick,
  cleanCobweb,
  calculateOverlayBounds,
} from '../utils/cobwebInteractions';

// ============================================================================
// Configuration Interface
// ============================================================================

export interface UseInteractionControllerProps {
  /** Current player position */
  playerPos: Position;

  /** Ref to player position for performance-critical access */
  playerPosRef: MutableRefObject<Position>;

  /** Current map ID */
  currentMapId: string;

  /** Currently selected inventory slot */
  selectedItemSlot: number | null;

  /** Current inventory items */
  inventoryItems: InventoryItem[];

  /** UI state from useUIState hook */
  uiState: UseUIStateReturn;

  /** Whether a cutscene is playing */
  isCutscenePlaying: boolean;

  /** Reference to NPCs */
  npcsRef: MutableRefObject<NPC[]>;

  /** Active NPC (for dialogue) - passed from App.tsx for shared state */
  activeNPC: string | null;

  /** Setter for activeNPC - passed from App.tsx */
  setActiveNPC: (npcId: string | null) => void;

  /** Dialogue mode - passed from App.tsx for shared state */
  dialogueMode: 'static' | 'ai';

  /** Setter for dialogueMode - passed from App.tsx */
  setDialogueMode: (mode: 'static' | 'ai') => void;

  // === Callbacks from App.tsx ===

  /** Callback to transition to a new map */
  onMapTransition: (mapId: string, position: Position) => void;

  /** Callback to show a toast notification */
  onShowToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;

  /** Callback to trigger VFX */
  triggerVFX: (type: string, position?: Position) => void;

  /** Callback to set click-to-move destination */
  setDestination: (pos: Position, npc?: NPC | null, onArrival?: () => void) => boolean;

  /** Callback for farm update (no-op, events handle this now) */
  onFarmUpdate: () => void;
}

// ============================================================================
// Return Interface
// ============================================================================

export interface UseInteractionControllerReturn {
  // === NPC Interaction State (passed through from props) ===
  // Note: activeNPC and dialogueMode are passed as props from App.tsx
  // Setters are returned for updating them
  setActiveNPC: (npcId: string | null) => void;
  setDialogueMode: (mode: 'static' | 'ai') => void;

  // === Radial Menu State ===
  radialMenuVisible: boolean;
  radialMenuPosition: { x: number; y: number };
  radialMenuOptions: RadialMenuOption[];
  setRadialMenuVisible: (visible: boolean) => void;

  // === Farm Action Animation State ===
  farmActionAnimation: FarmActionType | null;
  farmActionKey: number;
  waterSparklePos: Position | null;
  waterSparkleKey: number;
  showSplashEffect: boolean;
  splashKey: number;

  // === Handlers ===
  /** Handle canvas/mouse click for interactions */
  handleCanvasClick: (clickInfo: MouseClickInfo) => void;

  /** Handle farm action animation (consolidated - use from keyboard/touch/mouse) */
  handleFarmActionAnimation: (action: FarmActionType, tilePos?: Position) => void;

  /** Handle animation complete callback */
  handleAnimationComplete: () => void;

  /** Clear water sparkle effect (called when animation ends) */
  clearWaterSparkle: () => void;

  /** Hide splash effect (called when animation ends) */
  hideSplashEffect: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useInteractionController(
  props: UseInteractionControllerProps
): UseInteractionControllerReturn {
  const {
    playerPos,
    playerPosRef,
    currentMapId,
    selectedItemSlot,
    inventoryItems,
    uiState,
    isCutscenePlaying,
    activeNPC,
    setActiveNPC,
    dialogueMode,
    setDialogueMode,
    onMapTransition,
    onShowToast,
    triggerVFX,
    setDestination,
    onFarmUpdate,
  } = props;

  const { ui, openUI } = uiState;

  // -------------------------------------------------------------------------
  // Farm Action Animation State
  // -------------------------------------------------------------------------

  const [farmActionAnimation, setFarmActionAnimation] = useState<FarmActionType | null>(null);
  const [farmActionKey, setFarmActionKey] = useState(0);
  const [waterSparklePos, setWaterSparklePos] = useState<Position | null>(null);
  const [waterSparkleKey, setWaterSparkleKey] = useState(0);
  const [showSplashEffect, setShowSplashEffect] = useState(false);
  const [splashKey, setSplashKey] = useState(0);

  // -------------------------------------------------------------------------
  // Radial Menu State
  // -------------------------------------------------------------------------

  const [radialMenuVisible, setRadialMenuVisible] = useState(false);
  const [radialMenuPosition, setRadialMenuPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [radialMenuOptions, setRadialMenuOptions] = useState<RadialMenuOption[]>([]);
  const radialMenuNpcIdRef = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // Check if UI is blocking interactions
  // -------------------------------------------------------------------------

  const isUIBlocking =
    activeNPC ||
    isCutscenePlaying ||
    ui.helpBrowser ||
    ui.cookingUI ||
    ui.recipeBook ||
    ui.magicBook ||
    ui.characterCreator ||
    ui.inventory ||
    ui.shopUI ||
    ui.giftModal ||
    ui.brewingUI ||
    ui.devTools ||
    ui.vfxTestPanel;

  // -------------------------------------------------------------------------
  // Consolidated Farm Action Animation Handler
  // -------------------------------------------------------------------------

  const handleFarmActionAnimation = useCallback(
    (action: FarmActionType, tilePos?: Position) => {
      console.log('[InteractionController] Farm action animation:', action, tilePos);
      setFarmActionAnimation(action);
      setFarmActionKey((prev) => prev + 1);

      // Play farming sound effects
      if (action === 'till') {
        audioManager.playSfx('sfx_till');
      } else if (action === 'plant') {
        audioManager.playSfx('sfx_hoe');
      } else if (action === 'water') {
        // Play watering sound effect
        audioManager.playSfx('sfx_watering');
        // Trigger water sparkle effect
        if (tilePos) {
          setWaterSparklePos({ x: tilePos.x, y: tilePos.y });
          setWaterSparkleKey((prev) => prev + 1);
        }
      } else if (action === 'harvest') {
        // Play harvest sound effect
        audioManager.playSfx('sfx_harvest');
        // Trigger harvest glow VFX
        if (tilePos) {
          triggerVFX('harvest_glow', { x: tilePos.x + 0.5, y: tilePos.y + 0.5 });
        }
      }
    },
    [triggerVFX]
  );

  // -------------------------------------------------------------------------
  // Animation Complete Handler
  // -------------------------------------------------------------------------

  const handleAnimationComplete = useCallback(() => {
    console.log('[InteractionController] Animation complete');
    setFarmActionAnimation(null);
  }, []);

  const hideSplashEffect = useCallback(() => {
    setShowSplashEffect(false);
  }, []);

  const clearWaterSparkle = useCallback(() => {
    setWaterSparklePos(null);
  }, []);

  // -------------------------------------------------------------------------
  // Build Interaction Callbacks
  // -------------------------------------------------------------------------

  const buildInteractionCallbacks = useCallback(() => {
    return {
      onMirror: () => openUI('characterCreator'),
      onNPC: (npcId: string) => {
        // Play duck quacking if interacting with a duck
        if (npcId.toLowerCase().includes('duck')) {
          audioManager.playSfx('sfx_ducks_quack');
        }
        // Play random meow if interacting with a cat
        if (npcId.toLowerCase().includes('cat')) {
          const meowIndex = Math.floor(Math.random() * 3) + 1;
          audioManager.playSfx(`sfx_meow_0${meowIndex}`);
        }
        // Play random bark if interacting with a dog
        if (npcId.toLowerCase().includes('dog')) {
          const barkIndex = Math.floor(Math.random() * 1) + 1; // Currently 1 bark, extensible
          audioManager.playSfx(`sfx_bark_0${barkIndex}`);
        }
        // Play moo if interacting with the cow
        if (npcId.toLowerCase().includes('cow')) {
          audioManager.playSfx('sfx_bessie');
        }
        setActiveNPC(npcId);
      },
      onGiveGift: (npcId: string) => {
        openUI('giftModal', { giftTargetNpcId: npcId });
      },
      onTransition: (result: TransitionResult) => {
        if (result.success && result.mapId && result.spawnPosition) {
          if (result.hasDoor) {
            audioManager.playSfx('sfx_door_open');
          }
          onMapTransition(result.mapId, result.spawnPosition);
          const seedMatch = result.mapId.match(/_([\d]+)$/);
          const seed = seedMatch ? parseInt(seedMatch[1]) : undefined;
          gameState.updatePlayerLocation(result.mapId, result.spawnPosition, seed);
        }
      },
      onCooking: (locationType: string, position: Position | null) => {
        openUI('cookingUI', {
          cookingLocationType: locationType as 'stove' | 'campfire',
          cookingPosition: position || undefined,
        });
      },
      onBrewing: (position: Position | null) => {
        openUI('brewingUI', { brewingPosition: position || undefined });
      },
      onFarmAction: (result: FarmActionResult) => {
        if (result.handled) {
          onFarmUpdate();
        }
        if (result.message) {
          onShowToast(result.message, result.messageType || 'info');
        }
      },
      onFarmAnimation: handleFarmActionAnimation,
      onForage: (result: ForageResult) => {
        if (result.message) {
          onShowToast(result.message, result.found ? 'success' : 'info');
        }
      },
      onPlacedItemAction: (action: PlacedItemAction) => {
        if (action.action === 'pickup') {
          registerItemSprite(action.itemId, action.imageUrl);
          inventoryManager.addItem(action.itemId, 1);
          gameState.removePlacedItem(action.placedItemId);
          onShowToast('Picked up item', 'success');
        } else if (action.action === 'eat') {
          gameState.removePlacedItem(action.placedItemId);
          const restored = staminaManager.eatFood(action.itemId);
          onShowToast(`Ate the food (+${restored} stamina)`, 'success');
        } else if (action.action === 'taste') {
          onShowToast('Mmm, tasty!', 'info');
        }
      },
      onCollectWater: (result: { success: boolean; message: string }) => {
        if (result.success) {
          onFarmUpdate();
          onShowToast(result.message, 'success');
        }
      },
      onRefillWaterCan: (result: { success: boolean; message: string }) => {
        if (result.success) {
          setShowSplashEffect(true);
          setSplashKey((prev) => prev + 1);
          onShowToast(result.message, 'success');
        } else {
          onShowToast(result.message, 'info');
        }
      },
      onCollectResource: (result: { success: boolean; message: string }) => {
        if (result.success) {
          onFarmUpdate();
          onShowToast(result.message, 'success');
        } else {
          onShowToast(result.message, 'info');
        }
      },
      onOpenDecorationWorkshop: () => {
        openUI('decorationWorkshop');
      },
      onOpenPaintingEasel: () => {
        openUI('paintingEasel');
      },
      onPlaceDecoration: (result: {
        itemId: string;
        position: Position;
        image: string;
        paintingId?: string;
        customImage?: string;
        frameStyle?: {
          colour: string;
          secondaryColour?: string;
          borderWidth: number;
          pattern: 'solid' | 'gradient' | 'double' | 'filigree' | 'frosted';
        };
        customScale?: number;
      }) => {
        inventoryManager.removeItem(result.itemId, 1);
        gameState.addPlacedItem({
          id: `decoration_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          itemId: result.itemId,
          position: result.position,
          mapId: currentMapId,
          image: result.image,
          timestamp: Date.now(),
          permanent: true,
          // Painting-specific fields
          ...(result.paintingId && {
            paintingId: result.paintingId,
            customImage: result.customImage,
            frameStyle: result.frameStyle,
          }),
          // Per-instance scale (from painting size selection)
          ...(result.customScale != null && { customScale: result.customScale }),
        });
        eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: currentMapId, action: 'add' });
        const itemDef = getItem(result.itemId);
        onShowToast(`Placed ${itemDef?.displayName || 'decoration'}`, 'success');
      },
    };
  }, [openUI, onMapTransition, onFarmUpdate, onShowToast, handleFarmActionAnimation, currentMapId]);

  // -------------------------------------------------------------------------
  // Canvas Click Handler
  // -------------------------------------------------------------------------

  const handleCanvasClick = useCallback(
    (clickInfo: MouseClickInfo) => {
      console.log('[InteractionController] Click at:', clickInfo.tilePos);

      // Don't process clicks during dialogue, cutscenes, or UI overlays
      if (isUIBlocking) {
        console.log('[InteractionController] Ignoring click - UI overlay active');
        return;
      }

      // Get selected item from inventory (if any)
      const selectedItem = selectedItemSlot !== null ? inventoryItems[selectedItemSlot] : null;
      const currentTool = selectedItem?.id || 'hand';

      console.log(
        '[InteractionController] Using tool:',
        currentTool,
        '(slot:',
        selectedItemSlot,
        ')'
      );

      // === Cobweb Cleaning Special Handler ===
      // Check for cobweb clicks in Althea's cottage during the chores quest
      if (canCleanCobwebs(currentMapId, currentTool)) {
        // Calculate overlay bounds based on viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        // Approximate viewport scale (the BackgroundImageLayer calculates this more precisely)
        const referenceWidth = 1280;
        const referenceHeight = 720;
        const scaleX = viewportWidth / referenceWidth;
        const scaleY = viewportHeight / referenceHeight;
        const viewportScale = Math.min(scaleX, scaleY);

        const overlayBounds = calculateOverlayBounds(viewportWidth, viewportHeight, viewportScale);

        // Check if click hit a cobweb
        const cobwebResult = checkCobwebClick(
          clickInfo.screenPos.x,
          clickInfo.screenPos.y,
          overlayBounds.left,
          overlayBounds.top,
          overlayBounds.width,
          overlayBounds.height
        );

        if (cobwebResult.hit) {
          console.log('[InteractionController] Cobweb clicked:', cobwebResult);

          if (cobwebResult.alreadyCleaned) {
            onShowToast('This cobweb has already been cleaned.', 'info');
          } else {
            // Clean the cobweb
            const cleanResult = cleanCobweb(cobwebResult.cobwebIndex);
            if (cleanResult.success) {
              onShowToast(cleanResult.message, 'success');
              // Play a cleaning sound effect (if available)
              // audioManager.playSFX('sfx_clean');
            } else {
              onShowToast(cleanResult.message, 'info');
            }
          }
          return; // Don't process other interactions when cleaning cobwebs
        }
      }

      const callbacks = buildInteractionCallbacks();

      const interactions = getAvailableInteractions({
        position: clickInfo.worldPos,
        currentMapId: currentMapId,
        currentTool: currentTool,
        selectedSeed: null, // Seeds are now part of the tool system
        ...callbacks,
      });

      // No interactions at this position — ignore click
      if (interactions.length === 0) {
        return;
      }

      // Only interact if player is nearby (no walk-to-interact)
      const currentPlayerPos = playerPosRef.current;
      const distanceToClick = getDistance(currentPlayerPos, clickInfo.worldPos);
      const isNearby = distanceToClick <= INTERACTION.RANGE;

      if (!isNearby) {
        return;
      }

      if (interactions.length === 1) {
        interactions[0].execute();
        return;
      }

      // Multiple interactions — show radial menu
      const menuOptions: RadialMenuOption[] = interactions.map((interaction, index) => ({
        id: `${interaction.type}_${index}`,
        label: interaction.label,
        icon: interaction.icon,
        color: interaction.color,
        onSelect: interaction.execute,
      }));

      setRadialMenuOptions(menuOptions);
      setRadialMenuPosition(clickInfo.screenPos);
      setRadialMenuVisible(true);
    },
    [
      isUIBlocking,
      selectedItemSlot,
      inventoryItems,
      currentMapId,
      playerPosRef,
      buildInteractionCallbacks,
      onShowToast,
    ]
  );

  // -------------------------------------------------------------------------
  // Proximity-based Radial Menu for NPCs
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Don't show if UI overlays are active
    if (
      activeNPC ||
      isCutscenePlaying ||
      ui.helpBrowser ||
      ui.cookingUI ||
      ui.recipeBook ||
      ui.characterCreator ||
      ui.inventory
    ) {
      return;
    }

    // Use existing npcManager method to find NPC at player position
    const nearestNPC = npcManager.getNPCAtPosition(playerPos);

    // If no NPC in range, close menu if it was showing for an NPC
    if (!nearestNPC) {
      if (radialMenuNpcIdRef.current) {
        radialMenuNpcIdRef.current = null;
        setRadialMenuVisible(false);
      }
      return;
    }

    // If already showing menu for this NPC, don't re-trigger
    if (radialMenuNpcIdRef.current === nearestNPC.id) {
      return;
    }

    // Get interactions for this NPC
    const selectedItem = selectedItemSlot !== null ? inventoryItems[selectedItemSlot] : null;
    const currentTool = selectedItem?.id || 'hand';

    const callbacks = buildInteractionCallbacks();

    const interactions = getAvailableInteractions({
      position: nearestNPC.position,
      currentMapId: currentMapId,
      currentTool: currentTool,
      selectedSeed: null,
      ...callbacks,
    });

    // Only show menu if there are NPC-related interactions
    const npcInteractions = interactions.filter(
      (i) => i.type === 'npc' || i.type === 'give_gift' || i.type === 'collect_resource'
    );
    if (npcInteractions.length === 0) {
      return;
    }

    // Calculate screen position for the NPC (center of viewport offset by NPC position)
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const npcOffsetX = (nearestNPC.position.x - playerPos.x) * TILE_SIZE;
    const npcOffsetY = (nearestNPC.position.y - playerPos.y) * TILE_SIZE;
    const screenX = viewportCenterX + npcOffsetX;
    const screenY = viewportCenterY + npcOffsetY - 50; // Offset up a bit

    // Show radial menu
    radialMenuNpcIdRef.current = nearestNPC.id;
    const menuOptions: RadialMenuOption[] = npcInteractions.map((interaction, index) => ({
      id: `${interaction.type}_${index}`,
      label: interaction.label,
      icon: interaction.icon,
      color: interaction.color,
      onSelect: interaction.execute,
    }));
    setRadialMenuOptions(menuOptions);
    setRadialMenuPosition({ x: screenX, y: screenY });
    setRadialMenuVisible(true);
  }, [
    playerPos,
    activeNPC,
    isCutscenePlaying,
    ui.helpBrowser,
    ui.cookingUI,
    ui.recipeBook,
    ui.characterCreator,
    ui.inventory,
    currentMapId,
    selectedItemSlot,
    inventoryItems,
    buildInteractionCallbacks,
  ]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    // NPC state setters (state is passed as props)
    setActiveNPC,
    setDialogueMode,

    // Radial menu
    radialMenuVisible,
    radialMenuPosition,
    radialMenuOptions,
    setRadialMenuVisible,

    // Farm animations
    farmActionAnimation,
    farmActionKey,
    waterSparklePos,
    waterSparkleKey,
    showSplashEffect,
    splashKey,

    // Handlers
    handleCanvasClick,
    handleFarmActionAnimation,
    handleAnimationComplete,
    clearWaterSparkle,
    hideSplashEffect,
  };
}
