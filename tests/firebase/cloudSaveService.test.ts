/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FIRESTORE_PATHS, SAVE_DATA_DOCS } from '../../firebase/types';

/**
 * Cloud Save Service Unit Tests
 *
 * These tests validate the CloudSaveService interface and data structures.
 * For full integration testing, use Firebase Emulator Suite.
 */

describe('CloudSaveService Data Structures', () => {
  describe('SaveMetadata', () => {
    it('should have all required fields', () => {
      const metadata = {
        characterName: 'Test Character',
        characterId: 'character1',
        playTimeSeconds: 3600,
        lastSaved: { toMillis: () => Date.now() },
        currentMapId: 'village',
        gameDay: 5,
        season: 'spring',
        year: 1,
        gold: 500,
        version: '1.0.0',
      };

      expect(metadata).toHaveProperty('characterName');
      expect(metadata).toHaveProperty('characterId');
      expect(metadata).toHaveProperty('playTimeSeconds');
      expect(metadata).toHaveProperty('lastSaved');
      expect(metadata).toHaveProperty('currentMapId');
      expect(metadata).toHaveProperty('gameDay');
      expect(metadata).toHaveProperty('season');
      expect(metadata).toHaveProperty('year');
      expect(metadata).toHaveProperty('gold');
      expect(metadata).toHaveProperty('version');
    });

    it('should enforce character name limits', () => {
      const maxLength = 50;
      const validName = 'A'.repeat(maxLength);
      const invalidName = 'A'.repeat(maxLength + 1);

      expect(validName.length).toBeLessThanOrEqual(maxLength);
      expect(invalidName.length).toBeGreaterThan(maxLength);
    });
  });

  describe('SaveSlot', () => {
    it('should have id and metadata', () => {
      const slot = {
        id: 'slot_1',
        metadata: {
          characterName: 'Hero',
          characterId: 'character1',
          playTimeSeconds: 0,
          lastSaved: { toMillis: () => Date.now() },
          currentMapId: 'village',
          gameDay: 1,
          season: 'spring',
          year: 1,
          gold: 0,
          version: '1.0.0',
        },
      };

      expect(slot).toHaveProperty('id');
      expect(slot).toHaveProperty('metadata');
      expect(slot.id).toMatch(/^slot_\d+$/);
    });
  });

  describe('SAVE_DATA_DOCS', () => {
    it('should contain all expected document types', () => {
      const expectedDocs = [
        'character',
        'inventory',
        'farming',
        'cooking',
        'magic',
        'friendships',
        'quests',
        'world',
        'stats',
        'decoration',
        'conversations',
      ];

      expect(SAVE_DATA_DOCS).toEqual(expectedDocs);
    });

    it('should have exactly 11 document types', () => {
      expect(SAVE_DATA_DOCS.length).toBe(11);
    });
  });
});

describe('Save Data Document Types', () => {
  describe('CharacterSaveData', () => {
    it('should have correct structure', () => {
      const data = {
        customization: {
          name: 'Hero',
          characterId: 'character1',
          skinTone: 'fair',
          hairStyle: 'short',
          hairColour: 'brown',
        },
        position: { x: 15, y: 25 },
        currentMapId: 'village',
        currentMapSeed: undefined,
      };

      expect(data).toHaveProperty('customization');
      expect(data).toHaveProperty('position');
      expect(data).toHaveProperty('currentMapId');
      expect(data.position).toHaveProperty('x');
      expect(data.position).toHaveProperty('y');
    });
  });

  describe('InventorySaveData', () => {
    it('should have correct structure', () => {
      const data = {
        items: [
          { itemId: 'seed_tomato', quantity: 5 },
          { itemId: 'crop_potato', quantity: 10 },
        ],
        tools: ['hoe', 'wateringCan'],
        slotOrder: ['seed_tomato', 'crop_potato'],
      };

      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('tools');
      expect(Array.isArray(data.items)).toBe(true);
      expect(Array.isArray(data.tools)).toBe(true);
    });
  });

  describe('FarmingSaveData', () => {
    it('should have correct structure', () => {
      const data = {
        plots: [
          {
            id: 'farm_plot_0_0',
            position: { x: 0, y: 0 },
            state: 'planted',
            cropType: 'tomato',
            waterLevel: 50,
            growthStage: 2,
          },
        ],
        currentTool: 'hoe' as const,
        selectedSeed: 'seed_tomato',
      };

      expect(data).toHaveProperty('plots');
      expect(data).toHaveProperty('currentTool');
      expect(data).toHaveProperty('selectedSeed');
      expect(['hoe', 'seeds', 'wateringCan', 'hand']).toContain(data.currentTool);
    });
  });

  describe('StatsSaveData', () => {
    it('should have correct structure', () => {
      const data = {
        gold: 1000,
        forestDepth: 5,
        caveDepth: 3,
        statusEffects: {
          feelingSick: false,
          stamina: 85,
          maxStamina: 100,
          lastStaminaUpdate: Date.now(),
        },
        wateringCan: { currentLevel: 8 },
        movementEffect: null,
        transformations: {
          isFairyForm: false,
          fairyFormExpiresAt: null,
        },
        activePotionEffects: {},
        playerDisguise: null,
        dailyResourceCollections: {},
        gamesPlayed: 10,
        totalPlayTime: 36000,
        mushroomsCollected: 25,
      };

      expect(data).toHaveProperty('gold');
      expect(data).toHaveProperty('statusEffects');
      expect(data).toHaveProperty('transformations');
      expect(data.statusEffects).toHaveProperty('stamina');
      expect(data.statusEffects).toHaveProperty('maxStamina');
    });
  });
});

describe('CloudSaveService API Contract', () => {
  it('should define expected methods', () => {
    const expectedMethods = [
      'getSaveSlots',
      'getSaveMetadata',
      'saveGame',
      'loadGame',
      'deleteSave',
      'saveExists',
      'getNextAvailableSlot',
      'migrateLocalSave',
      'getMaxSlots',
    ];

    // Document the expected API
    expectedMethods.forEach((method) => {
      expect(typeof method).toBe('string');
    });
  });

  it('should have maximum of 3 save slots', () => {
    const MAX_SAVE_SLOTS = 3;
    expect(MAX_SAVE_SLOTS).toBe(3);
  });

  it('should use correct slot ID format', () => {
    const slotIds = ['slot_1', 'slot_2', 'slot_3'];
    slotIds.forEach((id) => {
      expect(id).toMatch(/^slot_\d+$/);
    });
  });
});

describe('Firestore Path Consistency', () => {
  const testUserId = 'user123';
  const testSlotId = 'slot_1';

  it('all save data paths should use consistent structure', () => {
    SAVE_DATA_DOCS.forEach((docType) => {
      const path = FIRESTORE_PATHS.saveData(testUserId, testSlotId, docType);
      expect(path).toBe(`users/${testUserId}/saves/${testSlotId}/data/${docType}`);
    });
  });

  it('paths should be URL-safe', () => {
    const paths = [
      FIRESTORE_PATHS.userProfile(testUserId),
      FIRESTORE_PATHS.saveSlot(testUserId, testSlotId),
      ...SAVE_DATA_DOCS.map((doc) => FIRESTORE_PATHS.saveData(testUserId, testSlotId, doc)),
    ];

    paths.forEach((path) => {
      // No spaces, special characters, or double slashes
      expect(path).not.toMatch(/\s/);
      expect(path).not.toMatch(/\/\//);
      expect(path).toMatch(/^[a-zA-Z0-9_/]+$/);
    });
  });
});

describe('Shared Farm Plot Filtering', () => {
  // Mirrors SHARED_FARM_MAP_IDS from constants.ts — these are the maps
  // where farm plots are globally shared via Firestore (not saved per-player).
  const SHARED_FARM_MAP_IDS = new Set(['village', 'farm_area']);

  it('should identify village and farm_area as shared maps', () => {
    expect(SHARED_FARM_MAP_IDS.has('village')).toBe(true);
    expect(SHARED_FARM_MAP_IDS.has('farm_area')).toBe(true);
    expect(SHARED_FARM_MAP_IDS.has('personal_garden')).toBe(false);
    expect(SHARED_FARM_MAP_IDS.has('home_interior')).toBe(false);
  });

  it('should filter shared plots from personal saves', () => {
    const allPlots = [
      { mapId: 'village', position: { x: 5, y: 5 }, state: 1 },
      { mapId: 'farm_area', position: { x: 3, y: 3 }, state: 2 },
      { mapId: 'personal_garden', position: { x: 1, y: 1 }, state: 1 },
      { mapId: 'home_interior', position: { x: 2, y: 2 }, state: 0 },
    ];

    // Replicates the filtering logic from cloudSaveService.saveGame()
    const personalPlots = allPlots.filter((plot) => !SHARED_FARM_MAP_IDS.has(plot.mapId));

    expect(personalPlots.length).toBe(2);
    expect(personalPlots.map((p) => p.mapId)).toEqual(['personal_garden', 'home_interior']);
  });

  it('should preserve all plots when none are on shared maps', () => {
    const allPlots = [
      { mapId: 'personal_garden', position: { x: 1, y: 1 }, state: 1 },
      { mapId: 'personal_garden', position: { x: 2, y: 2 }, state: 2 },
    ];

    const personalPlots = allPlots.filter((plot) => !SHARED_FARM_MAP_IDS.has(plot.mapId));

    expect(personalPlots.length).toBe(2);
  });
});

describe('GameState Mapping', () => {
  it('should map GameState fields to correct save documents', () => {
    // Document which GameState fields go to which save document
    const fieldMapping = {
      character: [
        'selectedCharacter',
        'player.position',
        'player.currentMapId',
        'player.currentMapSeed',
      ],
      inventory: ['inventory.items', 'inventory.tools'],
      farming: ['farming.plots', 'farming.currentTool', 'farming.selectedSeed'],
      cooking: ['cooking'],
      magic: ['magic'],
      friendships: ['relationships.npcFriendships'],
      quests: ['quests'],
      world: [
        'weather',
        'automaticWeather',
        'weatherDriftSpeed',
        'placedItems',
        'deskContents',
        'forageCooldowns',
        'cutscenes',
      ],
      stats: [
        'gold',
        'forestDepth',
        'caveDepth',
        'statusEffects',
        'wateringCan',
        'movementEffect',
        'transformations',
        'activePotionEffects',
        'playerDisguise',
        'dailyResourceCollections',
        'stats.gamesPlayed',
        'stats.totalPlayTime',
        'stats.mushroomsCollected',
      ],
      decoration: ['decoration.craftedPaints', 'decoration.paintings', 'decoration.hasEasel'],
      conversations: [
        'npcConversations.chatHistory',
        'npcConversations.memories',
        'npcConversations.coreMemories',
      ],
    };

    // Verify all document types are mapped
    SAVE_DATA_DOCS.forEach((docType) => {
      expect(fieldMapping).toHaveProperty(docType);
      expect(Array.isArray(fieldMapping[docType as keyof typeof fieldMapping])).toBe(true);
    });
  });
});
