/**
 * DecorationManager - Single Source of Truth for the decoration crafting system
 *
 * Manages:
 * - Paint crafting (forageable + binding agent → paint pot)
 * - Canvas crafting (linen + wooden frame → blank canvas)
 * - Flower arrangement crafting (vase + flowers → arrangement)
 * - Potted plant crafting (pot + crop → potted plant)
 * - Painting creation (canvas + paint(s) + uploaded image → framed painting)
 * - Unlocked paints/colours tracking
 *
 * Follows CookingManager pattern:
 * - Singleton instance
 * - Loads from characterData on initialise()
 * - Tracks state locally as SSoT
 * - Saves via characterData on state changes
 * - Emits EventBus events for UI updates
 */

import {
  ALL_DECORATION_RECIPES,
  PAINT_RECIPES,
  CANVAS_RECIPE,
  DecorationRecipe,
  getPaintColourMap,
} from '../data/decorationRecipes';
import { getItem } from '../data/items';
import { inventoryManager } from './inventoryManager';
import { gameState } from '../GameState';
import { characterData } from './CharacterData';
import { eventBus, GameEvent } from './EventBus';
import { deletePaintingImage, loadPaintingImage } from './paintingImageService';
import { PLAYER_SIZE } from '../constants';

// ===== Types =====

export interface PaintingData {
  id: string;
  name: string;
  /** Image URL (Firebase Storage or base64 data URL for offline) */
  imageUrl: string;
  /** Storage key for deletion (Firebase path or localStorage key) */
  storageKey: string;
  /** Paint IDs used (determines frame style) */
  paintIds: string[];
  /** Hex colours of paints used */
  colours: string[];
  /** When the painting was created */
  createdAt: number;
  /** Whether this is an uploaded image (vs procedural) */
  isUploaded: boolean;
  /** Tile-based scale chosen by the player (defaults to 1.5 × PLAYER_SIZE) */
  scale?: number;
}

export interface DecorationState {
  /** Paint item IDs the player has crafted at least once */
  craftedPaints: string[];
  /** All paintings created by the player */
  paintings: PaintingData[];
  /** Whether the player has received the easel */
  hasEasel: boolean;
}

export interface CraftResult {
  success: boolean;
  message: string;
  /** Item produced (if successful) */
  produced?: { itemId: string; quantity: number };
}

// ===== Manager =====

class DecorationManagerClass {
  private craftedPaints: Set<string> = new Set();
  private paintings: Map<string, PaintingData> = new Map();
  private hasEasel = false;
  private initialised = false;

  /**
   * Initialise the decoration manager with saved data
   */
  initialise(): void {
    if (this.initialised) return;

    const saved = gameState.loadDecorationState();
    if (saved) {
      saved.craftedPaints.forEach((id) => this.craftedPaints.add(id));
      saved.paintings.forEach((p) => {
        // Backward compat: paintings created before scale was added default to 1.5× character
        if (p.scale == null) p.scale = 1.5 * PLAYER_SIZE;
        this.paintings.set(p.id, p);
      });
      this.hasEasel = saved.hasEasel ?? false;

      console.log(
        `[DecorationManager] Loaded: ${this.craftedPaints.size} paints, ` +
          `${this.paintings.size} paintings, easel=${this.hasEasel}`
      );
    }

    this.initialised = true;
    console.log('[DecorationManager] Initialised');

    // Hydrate painting images from persistent storage (async, non-blocking)
    this.hydratePaintingImages().catch((e) => {
      console.warn('[DecorationManager] Painting image hydration failed:', e);
    });
  }

  /**
   * Restore painting image URLs from localStorage/Firestore.
   * Paintings saved before Phase 4 may have stale blob: URLs.
   * Also hydrates placed items that have a paintingId but no customImage.
   */
  private async hydratePaintingImages(): Promise<void> {
    let hydrated = 0;

    // 1. Hydrate PaintingData entries
    for (const painting of this.paintings.values()) {
      if (painting.imageUrl.startsWith('data:')) continue;

      const dataUrl = await loadPaintingImage(painting.id);
      if (dataUrl) {
        painting.imageUrl = dataUrl;
        hydrated++;
      }
    }

    if (hydrated > 0) {
      this.save();
      console.log(`[DecorationManager] Hydrated ${hydrated} painting image(s)`);
    }

    // 2. Hydrate placed items that have a paintingId but missing/stale customImage
    const allPlaced = gameState.getState().placedItems;
    let placedHydrated = 0;
    for (const item of allPlaced) {
      if (!item.paintingId) continue;
      if (item.customImage?.startsWith('data:')) continue;

      const painting = this.paintings.get(item.paintingId);
      if (painting?.imageUrl.startsWith('data:')) {
        item.customImage = painting.imageUrl;
        // Also ensure frame style is set
        if (!item.frameStyle && painting.paintIds.length > 0) {
          const { getFrameStyle } = await import('./frameStyles');
          const frame = getFrameStyle(painting.paintIds);
          item.frameStyle = {
            colour: frame.colour,
            secondaryColour: frame.secondaryColour,
            borderWidth: frame.borderWidth,
            pattern: frame.pattern,
          };
        }
        placedHydrated++;
      }
    }

    if (placedHydrated > 0) {
      // Trigger re-render and save by emitting event
      eventBus.emit(GameEvent.PLACED_ITEMS_CHANGED, { mapId: '', action: 'update' });
      console.log(`[DecorationManager] Hydrated ${placedHydrated} placed painting(s)`);
    }
  }

  // ===== Crafting =====

  /**
   * Craft a paint pot from a recipe
   */
  craftPaint(recipeId: string): CraftResult {
    const recipe = PAINT_RECIPES[recipeId];
    if (!recipe) {
      return { success: false, message: 'Unknown paint recipe.' };
    }

    // Check ingredients
    const missing = this.getMissingIngredients(recipe);
    if (missing.length > 0) {
      const names = missing.map((m) => {
        const item = getItem(m.itemId);
        return `${m.quantity}x ${item?.displayName ?? m.itemId}`;
      });
      return { success: false, message: `Missing: ${names.join(', ')}` };
    }

    // Consume ingredients
    for (const ing of recipe.ingredients) {
      inventoryManager.removeItem(ing.itemId, ing.quantity);
    }

    // Add paint to inventory
    inventoryManager.addItem(recipe.resultItemId, recipe.resultQuantity);

    // Track that this paint has been crafted
    this.craftedPaints.add(recipe.resultItemId);

    this.save();
    this.saveInventory();

    eventBus.emit(GameEvent.DECORATION_CRAFTED, {
      recipeId,
      resultItemId: recipe.resultItemId,
      category: 'paint',
    });

    return {
      success: true,
      message: `Crafted ${recipe.displayName}!`,
      produced: { itemId: recipe.resultItemId, quantity: recipe.resultQuantity },
    };
  }

  /**
   * Craft a blank canvas
   */
  craftCanvas(): CraftResult {
    const recipe = CANVAS_RECIPE;

    const missing = this.getMissingIngredients(recipe);
    if (missing.length > 0) {
      const names = missing.map((m) => {
        const item = getItem(m.itemId);
        return `${m.quantity}x ${item?.displayName ?? m.itemId}`;
      });
      return { success: false, message: `Missing: ${names.join(', ')}` };
    }

    for (const ing of recipe.ingredients) {
      inventoryManager.removeItem(ing.itemId, ing.quantity);
    }

    inventoryManager.addItem(recipe.resultItemId, recipe.resultQuantity);
    this.saveInventory();

    eventBus.emit(GameEvent.DECORATION_CRAFTED, {
      recipeId: recipe.id,
      resultItemId: recipe.resultItemId,
      category: 'canvas',
    });

    return {
      success: true,
      message: 'Crafted a Blank Canvas!',
      produced: { itemId: recipe.resultItemId, quantity: recipe.resultQuantity },
    };
  }

  /**
   * Craft a decoration from a recipe (flower arrangement, potted plant)
   */
  craftDecoration(recipeId: string): CraftResult {
    const recipe = ALL_DECORATION_RECIPES[recipeId];
    if (!recipe) {
      return { success: false, message: 'Unknown recipe.' };
    }

    const missing = this.getMissingIngredients(recipe);
    if (missing.length > 0) {
      const names = missing.map((m) => {
        const item = getItem(m.itemId);
        return `${m.quantity}x ${item?.displayName ?? m.itemId}`;
      });
      return { success: false, message: `Missing: ${names.join(', ')}` };
    }

    for (const ing of recipe.ingredients) {
      inventoryManager.removeItem(ing.itemId, ing.quantity);
    }

    inventoryManager.addItem(recipe.resultItemId, recipe.resultQuantity);
    this.saveInventory();

    eventBus.emit(GameEvent.DECORATION_CRAFTED, {
      recipeId,
      resultItemId: recipe.resultItemId,
      category: recipe.category,
    });

    return {
      success: true,
      message: `Crafted ${recipe.displayName}!`,
      produced: { itemId: recipe.resultItemId, quantity: recipe.resultQuantity },
    };
  }

  // ===== Paintings =====

  /**
   * Create a painting from an uploaded image
   * Consumes: 1 blank_canvas + selected paint(s)
   */
  createPainting(params: {
    name: string;
    imageUrl: string;
    storageKey: string;
    paintIds: string[];
    isUploaded: boolean;
    /** Character-relative scale (0.25–2.0). Converted to tile scale internally. */
    scale?: number;
  }): CraftResult & { paintingId?: string } {
    // Check canvas
    if (!inventoryManager.hasItem('blank_canvas', 1)) {
      return { success: false, message: 'You need a Blank Canvas.' };
    }

    // Check paints (required for uploaded images, optional for hand-drawn)
    if (params.paintIds.length === 0 && params.isUploaded) {
      return { success: false, message: 'Choose at least one paint for the frame.' };
    }

    for (const paintId of params.paintIds) {
      if (!inventoryManager.hasItem(paintId, 1)) {
        const item = getItem(paintId);
        return {
          success: false,
          message: `You need ${item?.displayName ?? paintId}.`,
        };
      }
    }

    // Consume materials
    inventoryManager.removeItem('blank_canvas', 1);
    for (const paintId of params.paintIds) {
      inventoryManager.removeItem(paintId, 1);
    }

    // Create painting data
    const colourMap = getPaintColourMap();
    const paintingId = `painting_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const painting: PaintingData = {
      id: paintingId,
      name: params.name,
      imageUrl: params.imageUrl,
      storageKey: paintingId, // Used for image lookup in localStorage/Firestore
      paintIds: params.paintIds,
      colours: params.paintIds.map((id) => colourMap[id] ?? '#888888'),
      createdAt: Date.now(),
      isUploaded: params.isUploaded,
      scale: (params.scale ?? 1.5) * PLAYER_SIZE,
    };

    this.paintings.set(painting.id, painting);

    // Add framed_painting item to inventory
    inventoryManager.addItem('framed_painting', 1);

    this.save();
    this.saveInventory();

    eventBus.emit(GameEvent.PAINTING_CREATED, { paintingId: painting.id });

    return {
      success: true,
      message: `Created "${params.name}"!`,
      produced: { itemId: 'framed_painting', quantity: 1 },
      paintingId: painting.id,
    };
  }

  /**
   * Delete a painting (removes metadata and stored image data)
   */
  deletePainting(paintingId: string): boolean {
    const existed = this.paintings.delete(paintingId);
    if (existed) {
      this.save();
      // Clean up stored image data (localStorage + Firestore)
      deletePaintingImage(paintingId).catch((e) => {
        console.warn('[DecorationManager] Failed to delete painting image:', e);
      });
      eventBus.emit(GameEvent.PAINTING_DELETED, { paintingId });
    }
    return existed;
  }

  // ===== Queries =====

  /**
   * Get a painting by ID
   */
  getPainting(paintingId: string): PaintingData | undefined {
    return this.paintings.get(paintingId);
  }

  /**
   * Get all paintings
   */
  getAllPaintings(): PaintingData[] {
    return Array.from(this.paintings.values());
  }

  /**
   * Get the next painting that hasn't been placed on the map yet.
   * @param placedPaintingIds Set of painting IDs already placed as PlacedItems
   */
  getNextUnplacedPainting(placedPaintingIds: Set<string>): PaintingData | undefined {
    return Array.from(this.paintings.values()).find((p) => !placedPaintingIds.has(p.id));
  }

  /**
   * Get hex colours the player has unlocked (crafted at least once)
   */
  getUnlockedColours(): Array<{ paintId: string; colour: string; displayName: string }> {
    const colourMap = getPaintColourMap();
    return Array.from(this.craftedPaints)
      .filter((id) => colourMap[id])
      .map((id) => ({
        paintId: id,
        colour: colourMap[id],
        displayName: getItem(id)?.displayName ?? id,
      }));
  }

  /**
   * Get all available paint colours (including locked ones)
   */
  getAllPaintColours(): Array<{
    paintId: string;
    colour: string;
    displayName: string;
    unlocked: boolean;
    hint?: string;
  }> {
    const colourMap = getPaintColourMap();
    return Object.values(PAINT_RECIPES).map((recipe) => ({
      paintId: recipe.resultItemId,
      colour: recipe.colour ?? '#888888',
      displayName: recipe.displayName,
      unlocked: this.craftedPaints.has(recipe.resultItemId),
      hint: recipe.hint,
    }));
  }

  /**
   * Check if the player has the easel
   */
  getHasEasel(): boolean {
    return this.hasEasel;
  }

  /**
   * Grant the easel to the player (NPC friendship gift)
   * Note: Does NOT add to inventory — caller (FriendshipManager tier reward) handles that
   */
  grantEasel(): void {
    if (this.hasEasel) return;
    this.hasEasel = true;
    this.save();
    console.log('[DecorationManager] Easel granted!');
  }

  /**
   * Check if a recipe has all required ingredients
   */
  hasIngredients(recipeId: string): boolean {
    const recipe = ALL_DECORATION_RECIPES[recipeId];
    if (!recipe) return false;
    return this.getMissingIngredients(recipe).length === 0;
  }

  /**
   * Get missing ingredients for a recipe
   */
  getMissingIngredients(recipe: DecorationRecipe): Array<{ itemId: string; quantity: number }> {
    const missing: Array<{ itemId: string; quantity: number }> = [];
    for (const ing of recipe.ingredients) {
      const have = inventoryManager.getQuantity(ing.itemId);
      if (have < ing.quantity) {
        missing.push({ itemId: ing.itemId, quantity: ing.quantity - have });
      }
    }
    return missing;
  }

  // ===== State =====

  /**
   * Get current state for persistence
   */
  getDecorationState(): DecorationState {
    return {
      craftedPaints: Array.from(this.craftedPaints),
      paintings: Array.from(this.paintings.values()),
      hasEasel: this.hasEasel,
    };
  }

  /**
   * Save state via CharacterData API
   */
  private save(): void {
    const state = this.getDecorationState();
    characterData.save('decoration', state);
  }

  /**
   * Save inventory via CharacterData API
   */
  private saveInventory(): void {
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);
  }

  /**
   * Reset all decoration progress (for new game)
   */
  reset(): void {
    this.craftedPaints.clear();
    this.paintings.clear();
    this.hasEasel = false;
    this.initialised = false;
    this.save();
  }

  /**
   * Debug: Get summary of decoration state
   */
  getSummary(): string {
    const lines: string[] = ['=== DECORATION CRAFTING ==='];
    lines.push(`Easel: ${this.hasEasel ? 'yes' : 'no'}`);
    lines.push(`Paints crafted: ${this.craftedPaints.size}`);
    lines.push(`Paintings: ${this.paintings.size}`);

    if (this.craftedPaints.size > 0) {
      lines.push('');
      lines.push('Unlocked paints:');
      for (const paintId of this.craftedPaints) {
        const item = getItem(paintId);
        lines.push(`  - ${item?.displayName ?? paintId}`);
      }
    }

    if (this.paintings.size > 0) {
      lines.push('');
      lines.push('Paintings:');
      for (const painting of this.paintings.values()) {
        lines.push(`  - "${painting.name}" (${painting.isUploaded ? 'uploaded' : 'procedural'})`);
      }
    }

    return lines.join('\n');
  }
}

export const decorationManager = new DecorationManagerClass();
