/**
 * Cloud Save Service
 *
 * Handles saving and loading game state to/from Firebase Firestore.
 * Supports multiple save slots per user.
 *
 * Data is split across multiple documents for:
 * - Avoiding 1MB document size limit
 * - Partial updates (only save changed data)
 * - Faster loading (parallel document fetches)
 */

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import { GameState } from '../GameState';
import {
  SaveSlot,
  SaveMetadata,
  CharacterSaveData,
  InventorySaveData,
  FarmingSaveData,
  CookingSaveData,
  MagicSaveData,
  FriendshipsSaveData,
  QuestsSaveData,
  WorldSaveData,
  StatsSaveData,
  DecorationSaveData,
  FIRESTORE_PATHS,
  SAVE_DATA_DOCS,
} from './types';

// ============================================
// Constants
// ============================================

const GAME_VERSION = '1.0.0';
const MAX_SAVE_SLOTS = 3;

// ============================================
// CloudSaveService Class
// ============================================

class CloudSaveService {
  /**
   * Get all save slots for the current user
   */
  async getSaveSlots(): Promise<SaveSlot[]> {
    this.ensureAuthenticated();

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    const savesRef = collection(db, FIRESTORE_PATHS.userSaves(userId));
    const snapshot = await getDocs(savesRef);

    const slots: SaveSlot[] = [];

    for (const slotDoc of snapshot.docs) {
      try {
        // Metadata is stored directly in the slot document
        const data = slotDoc.data();
        if (data && data.characterName) {
          slots.push({
            id: slotDoc.id,
            metadata: data as SaveMetadata,
          });
        }
      } catch (error) {
        console.warn(`[CloudSave] Failed to load metadata for slot ${slotDoc.id}:`, error);
      }
    }

    // Sort by last saved (most recent first)
    slots.sort((a, b) => {
      const aTime = a.metadata.lastSaved?.toMillis() ?? 0;
      const bTime = b.metadata.lastSaved?.toMillis() ?? 0;
      return bTime - aTime;
    });

    console.log(`[CloudSave] Found ${slots.length} save slots`);
    return slots;
  }

  /**
   * Get metadata for a specific save slot
   */
  async getSaveMetadata(slotId: string): Promise<SaveMetadata | null> {
    this.ensureAuthenticated();

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    // Metadata is stored directly in the slot document
    const slotRef = doc(db, FIRESTORE_PATHS.saveSlot(userId, slotId));
    const slotDoc = await getDoc(slotRef);

    if (!slotDoc.exists()) {
      return null;
    }

    return slotDoc.data() as SaveMetadata;
  }

  /**
   * Save game state to a slot
   */
  async saveGame(slotId: string, state: GameState, playTimeSeconds: number): Promise<void> {
    this.ensureAuthenticated();

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    const batch = writeBatch(db);

    console.log(`[CloudSave] Saving to slot ${slotId}...`);

    // Save metadata directly in the slot document
    const metadata: Omit<SaveMetadata, 'lastSaved'> & {
      lastSaved: ReturnType<typeof serverTimestamp>;
    } = {
      characterName: state.selectedCharacter?.name || 'Unknown',
      characterId: state.selectedCharacter?.characterId || 'character1',
      playTimeSeconds,
      lastSaved: serverTimestamp(),
      currentMapId: state.player.currentMapId,
      gameDay: state.lastKnownTime?.day || 1,
      season: state.lastKnownTime?.season || 'spring',
      year: state.lastKnownTime?.year || 1,
      gold: state.gold,
      version: GAME_VERSION,
    };
    const slotRef = doc(db, FIRESTORE_PATHS.saveSlot(userId, slotId));
    batch.set(slotRef, metadata, { merge: true });

    // Save character data
    const characterData: CharacterSaveData = {
      customization: state.selectedCharacter,
      position: state.player.position,
      currentMapId: state.player.currentMapId,
      currentMapSeed: state.player.currentMapSeed,
    };
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'character')), characterData);

    // Save inventory
    const inventoryData: InventorySaveData = {
      items: state.inventory.items,
      tools: state.inventory.tools,
    };
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'inventory')), inventoryData);

    // Save farming
    const farmingData: FarmingSaveData = {
      plots: state.farming.plots,
      currentTool: state.farming.currentTool,
      selectedSeed: state.farming.selectedSeed,
    };
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'farming')), farmingData);

    // Save cooking
    const cookingData: CookingSaveData = state.cooking;
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'cooking')), cookingData);

    // Save magic (if exists)
    if (state.magic) {
      const magicData: MagicSaveData = state.magic;
      batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'magic')), magicData);
    }

    // Save friendships
    const friendshipsData: FriendshipsSaveData = {
      npcFriendships: state.relationships.npcFriendships,
    };
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'friendships')), friendshipsData);

    // Save quests
    const questsData: QuestsSaveData = state.quests;
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'quests')), questsData);

    // Save world state
    const worldData: WorldSaveData = {
      weather: state.weather,
      automaticWeather: state.automaticWeather,
      weatherDriftSpeed: state.weatherDriftSpeed,
      placedItems: state.placedItems,
      deskContents: state.deskContents,
      forageCooldowns: state.forageCooldowns,
      cutscenes: state.cutscenes,
    };
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'world')), worldData);

    // Save stats
    const statsData: StatsSaveData = {
      gold: state.gold,
      forestDepth: state.forestDepth,
      caveDepth: state.caveDepth,
      statusEffects: state.statusEffects,
      wateringCan: state.wateringCan,
      movementEffect: state.movementEffect,
      transformations: state.transformations,
      activePotionEffects: state.activePotionEffects,
      playerDisguise: state.playerDisguise,
      dailyResourceCollections: state.dailyResourceCollections,
      gamesPlayed: state.stats.gamesPlayed,
      totalPlayTime: state.stats.totalPlayTime,
      mushroomsCollected: state.stats.mushroomsCollected,
    };
    batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'stats')), statsData);

    // Save decoration state (if exists)
    if (state.decoration) {
      const decorationData: DecorationSaveData = state.decoration;
      batch.set(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'decoration')), decorationData);
    }

    // Commit all writes atomically
    await batch.commit();
    console.log(`[CloudSave] Saved to slot ${slotId} successfully`);
  }

  /**
   * Load game state from a slot
   */
  async loadGame(slotId: string): Promise<GameState> {
    this.ensureAuthenticated();

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();

    console.log(`[CloudSave] Loading from slot ${slotId}...`);

    // Load all documents in parallel
    const [
      characterDoc,
      inventoryDoc,
      farmingDoc,
      cookingDoc,
      magicDoc,
      friendshipsDoc,
      questsDoc,
      worldDoc,
      statsDoc,
      decorationDoc,
    ] = await Promise.all([
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'character'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'inventory'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'farming'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'cooking'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'magic'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'friendships'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'quests'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'world'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'stats'))),
      getDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, 'decoration'))),
    ]);

    // Extract data with defaults
    const character = characterDoc.data() as CharacterSaveData | undefined;
    const inventory = inventoryDoc.data() as InventorySaveData | undefined;
    const farming = farmingDoc.data() as FarmingSaveData | undefined;
    const cooking = cookingDoc.data() as CookingSaveData | undefined;
    const magic = magicDoc.exists() ? (magicDoc.data() as MagicSaveData) : undefined;
    const friendships = friendshipsDoc.data() as FriendshipsSaveData | undefined;
    const quests = questsDoc.data() as QuestsSaveData | undefined;
    const world = worldDoc.data() as WorldSaveData | undefined;
    const stats = statsDoc.data() as StatsSaveData | undefined;
    const decorationData = decorationDoc.exists()
      ? (decorationDoc.data() as DecorationSaveData)
      : undefined;

    // Reconstruct GameState with defaults for missing data
    const gameState: GameState = {
      selectedCharacter: character?.customization || null,
      gold: stats?.gold || 0,
      forestDepth: stats?.forestDepth || 0,
      caveDepth: stats?.caveDepth || 0,
      player: {
        currentMapId: character?.currentMapId || 'village',
        position: character?.position || { x: 15, y: 25 },
        currentMapSeed: character?.currentMapSeed,
      },
      inventory: {
        items: inventory?.items || [],
        tools: inventory?.tools || [],
      },
      farming: {
        plots: farming?.plots || [],
        currentTool: farming?.currentTool || 'hand',
        selectedSeed: farming?.selectedSeed || null,
      },
      crafting: { unlockedRecipes: [], materials: {} },
      stats: {
        gamesPlayed: stats?.gamesPlayed || 0,
        totalPlayTime: stats?.totalPlayTime || 0,
        mushroomsCollected: stats?.mushroomsCollected || 0,
      },
      weather: world?.weather || 'clear',
      automaticWeather: world?.automaticWeather ?? true,
      nextWeatherCheckTime: 0,
      weatherDriftSpeed: world?.weatherDriftSpeed || 1.0,
      cutscenes: world?.cutscenes || { completed: [] },
      relationships: { npcFriendships: friendships?.npcFriendships || [] },
      placedItems: world?.placedItems || [],
      deskContents: world?.deskContents || [],
      cooking: cooking || {
        recipeBookUnlocked: false,
        unlockedRecipes: ['tea'],
        recipeProgress: {},
      },
      magic: magic,
      statusEffects: stats?.statusEffects || {
        feelingSick: false,
        stamina: 100,
        maxStamina: 100,
        lastStaminaUpdate: Date.now(),
      },
      wateringCan: stats?.wateringCan || { currentLevel: 8 },
      dailyResourceCollections: stats?.dailyResourceCollections || {},
      forageCooldowns: world?.forageCooldowns || {},
      movementEffect: stats?.movementEffect || null,
      transformations: stats?.transformations || {
        isFairyForm: false,
        fairyFormExpiresAt: null,
      },
      quests: quests || {},
      activePotionEffects: stats?.activePotionEffects || {},
      playerDisguise: stats?.playerDisguise || null,
      decoration: decorationData || undefined,
    };

    console.log(`[CloudSave] Loaded from slot ${slotId} successfully`);
    return gameState;
  }

  /**
   * Delete a save slot
   */
  async deleteSave(slotId: string): Promise<void> {
    this.ensureAuthenticated();

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();

    console.log(`[CloudSave] Deleting slot ${slotId}...`);

    // Delete all data documents
    const deletePromises = SAVE_DATA_DOCS.map((docType) =>
      deleteDoc(doc(db, FIRESTORE_PATHS.saveData(userId, slotId, docType)))
    );

    // Delete slot document (which contains metadata)
    deletePromises.push(deleteDoc(doc(db, FIRESTORE_PATHS.saveSlot(userId, slotId))));

    await Promise.all(deletePromises);
    console.log(`[CloudSave] Deleted slot ${slotId} successfully`);
  }

  /**
   * Check if a save slot exists
   */
  async saveExists(slotId: string): Promise<boolean> {
    this.ensureAuthenticated();

    const userId = authService.getUserId()!;
    const db = getFirebaseDb();
    // Check if slot document exists (contains metadata)
    const slotRef = doc(db, FIRESTORE_PATHS.saveSlot(userId, slotId));
    const slotDoc = await getDoc(slotRef);

    return slotDoc.exists();
  }

  /**
   * Get the next available slot ID
   */
  async getNextAvailableSlot(): Promise<string | null> {
    const slots = await this.getSaveSlots();

    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      const slotId = `slot_${i}`;
      if (!slots.find((s) => s.id === slotId)) {
        return slotId;
      }
    }

    return null; // All slots full
  }

  /**
   * Migrate localStorage save to cloud
   */
  async migrateLocalSave(targetSlotId: string): Promise<void> {
    const localSave = localStorage.getItem('twilight_game_state');
    if (!localSave) {
      console.log('[CloudSave] No local save to migrate');
      return;
    }

    try {
      const state = JSON.parse(localSave) as GameState;
      const playTime = state.stats?.totalPlayTime || 0;
      await this.saveGame(targetSlotId, state, playTime);
      console.log('[CloudSave] Local save migrated to cloud');
    } catch (error) {
      console.error('[CloudSave] Failed to migrate local save:', error);
      throw error;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private ensureAuthenticated(): void {
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase not initialized');
    }
    if (!authService.isAuthenticated()) {
      throw new Error('Not authenticated');
    }
  }

  /**
   * Get maximum number of save slots
   */
  getMaxSlots(): number {
    return MAX_SAVE_SLOTS;
  }
}

// Singleton instance
export const cloudSaveService = new CloudSaveService();
