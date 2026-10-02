/**
 * Shape of the persisted game state (localStorage `twilight_game_state` and cloud saves).
 *
 * Changing a field here changes the save format: add a migration in
 * GameStatePersistence.ts (bump SAVE_VERSION) for anything that is not purely additive.
 */

import type { FarmPlot, NPCFriendship, PlacedItem, ColorScheme, DeskContents } from '../types';
import type { GameTime } from '../utils/TimeManager';

export interface CharacterCustomization {
  characterId: string; // Maps to folder name in /public/assets/ (e.g., 'character1', 'character2')
  /**
   * Worn costume id (see utils/characterOutfits.ts). Optional: absent/'everyday'
   * means the base art, and unknown ids resolve to the base art on read — old
   * saves must keep loading untouched.
   */
  outfit?: string;
  name: string;
  skin: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  clothesStyle: string;
  clothesColor: string;
  shoesStyle: string;
  shoesColor: string;
  glasses: string; // 'none', 'round', 'square', 'sunglasses'
  weapon: string; // 'sword', 'axe', 'bow', 'staff'
}

export interface GameState {
  /**
   * Schema version of this save. Written on every save; read on load to run the
   * migration chain. Absent on saves that predate versioning (treated as version 0).
   */
  saveVersion?: number;
  // Character customization
  selectedCharacter: CharacterCustomization | null;
  // Currency
  gold: number;

  // Time tracking (read-only, calculated from real time)
  // This is stored for display purposes but actual time comes from TimeManager
  lastKnownTime?: GameTime;

  // Exploration depth
  forestDepth: number; // How deep into the forest
  caveDepth: number; // How deep into the cave
  lavaDepth: number; // How deep into the lava levels
  revealedLavaEntrances: Record<string, { x: number; y: number }>; // caveMapId → tile position

  // Player location (for persistence across sessions)
  player: {
    currentMapId: string;
    position: { x: number; y: number };
    currentMapSeed?: number; // For regenerating random maps
  };

  // Inventory (managed by InventoryManager)
  inventory: {
    items: { itemId: string; quantity: number }[]; // Stackable items
    tools: string[]; // Owned tools (IDs)
    slotOrder?: string[]; // Persistent slot ordering
  };

  // Farming (plots are now managed by FarmManager and persisted here)
  farming: {
    plots: FarmPlot[];
    currentTool: 'hoe' | 'seeds' | 'wateringCan' | 'hand'; // Current farming tool
    selectedSeed: string | null; // Currently selected seed type
  };

  // Crafting
  crafting: {
    unlockedRecipes: string[]; // Recipe IDs
    materials: {
      [materialId: string]: number;
    };
  };

  // Player stats
  stats: {
    gamesPlayed: number;
    totalPlayTime: number; // in seconds
    mushroomsCollected: number;
  };

  // Custom color palette (for user-customized colors)
  customColors?: {
    [colorName: string]: string; // colorName -> hex value
  };

  // Custom color schemes (for user-modified map color schemes)
  customColorSchemes?: {
    [schemeName: string]: ColorScheme;
  };

  // Weather system (for environmental effects and animations)
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  automaticWeather: boolean; // Enable/disable automatic weather changes
  nextWeatherCheckTime: number; // Timestamp (ms) for next automatic weather change
  weatherDriftSpeed: number; // Multiplier for weather particle/fog drift speed (1.0 = normal)

  // Cutscene progress tracking
  cutscenes: {
    completed: string[]; // IDs of cutscenes that have been viewed
    lastSeasonTriggered?: string; // Track last season for season change cutscenes
  };

  // Harvest Feast progress tracking (see utils/HarvestFeastManager.ts).
  harvestFeast: {
    celebratedYears: number[]; // Years the feast fully concluded (or was caught up on)
    lastKnownDay: number | null; // Total game-day count as of last save, for missed-window detection
    contributedMealIds: string[]; // This year's distinct player-contributed meal ids (local mirror)
    /**
     * Real Date.now() when this client first observed gathering begin,
     * cleared once the feast concludes. Anchors the food-consumption pacing.
     * Deliberately NOT a pure function of (year, calendar) — that would tie
     * it to TimeManager's real clock, which a dev time-override deliberately
     * decouples from Date.now(), breaking testability (jumping to hour 18 via
     * the console wouldn't make food disappear on any sensible schedule).
     * Anchoring to "the moment I actually observed it" instead means the
     * console/DevTools override works for testing exactly as production play
     * does, at the small cost of two players who arrive at slightly
     * different real moments pacing their own countdown slightly differently
     * (removal itself is still shared — see tickConsumption).
     */
    gatherStartedAt: number | null;
  };

  // Yule celebration progress tracking (see utils/YuleCelebrationManager.ts).
  yule: {
    celebratedYears: number[]; // Years the celebration fully concluded (or was caught up on)
    lastKnownDay: number | null; // Total game-day count as of last save, for missed-window detection
    /**
     * Real Date.now() when this client first observed gathering begin,
     * cleared once the celebration concludes. Anchors the 10-minute gifting
     * window and the console-testability under TimeManager.setTimeOverride()
     * — same reasoning as harvestFeast.gatherStartedAt above.
     */
    startedAt: number | null;
    // NPC celebrationIds this client itself successfully gifted this year —
    // NOT the full "claimed" set (that's this ∪ the live Firestore
    // subscription, merged at read time by YuleCelebrationManager). Unlike
    // Harvest Feast's contributedMealIds, this needs to persist across reload
    // because a gifted NPC's thought bubble disappears with nothing else left
    // to observe — Harvest Feast's food-eaten state stays visible as shared
    // PlacedItems and needs no local record for the same reason.
    giftsClaimedLocally: string[];
  };

  // NPC relationships and friendship (managed by FriendshipManager)
  relationships: {
    npcFriendships: NPCFriendship[];
  };

  // Placed items (food, decorations, etc. on maps)
  placedItems: PlacedItem[];

  // Desk contents (items placed on desk tiles)
  deskContents: DeskContents[];

  // Cooking system (managed by CookingManager)
  cooking: {
    recipeBookUnlocked: boolean; // Whether player has talked to Mum to learn cooking
    unlockedRecipes: string[];
    recipeProgress: Record<
      string,
      {
        recipeId: string;
        timesCooked: number;
        isMastered: boolean;
        unlockedAt: number;
      }
    >;
  };

  // Magic system (managed by MagicManager)
  magic?: {
    magicBookUnlocked: boolean; // Whether player has talked to Witch to learn magic
    currentLevel: 'novice' | 'journeyman' | 'master'; // Current apprentice level
    unlockedRecipes: string[];
    recipeProgress: Record<
      string,
      {
        recipeId: string;
        timesBrewed: number;
        isMastered: boolean;
        unlockedAt: number;
      }
    >;
  };

  // Decoration crafting system (managed by DecorationManager)
  decoration?: {
    craftedPaints: string[];
    paintings: Array<{
      id: string;
      name: string;
      imageUrl: string;
      storageKey: string;
      paintIds: string[];
      colours: string[];
      createdAt: number;
      isUploaded: boolean;
    }>;
    hasEasel: boolean;
  };

  // Photography system (managed by PhotoAlbumManager)
  photography?: {
    albumPhotos: Array<{
      id: string;
      dataUrl: string;
      photoName: string;
      exposureNumber: number;
      takenAt: number;
    }>;
  };

  // Status effects
  statusEffects: {
    feelingSick: boolean; // Prevents leaving village, acquired from eating terrible food
    // Stamina system
    stamina: number; // Current stamina (0-100)
    maxStamina: number; // Maximum stamina (default 100)
    lastStaminaUpdate: number; // Timestamp for calculating passive restoration
  };

  // Watering can state
  wateringCan: {
    currentLevel: number; // Current water uses remaining (0 = empty)
  };

  // Daily NPC resource collection tracking (e.g., milk from cow)
  dailyResourceCollections: {
    [npcId: string]: {
      lastCollectedDay: number; // Game day of last collection
      collectionsToday: number; // Number of collections made today
    };
  };

  // Forage cooldown tracking - prevents infinite seed gathering
  // Key format: "mapId:x,y" -> timestamp of last forage
  forageCooldowns: {
    [tileKey: string]: number; // Timestamp when tile was last foraged
  };

  // Movement effect (floating/flying potions)
  movementEffect: {
    mode: 'floating' | 'flying';
    expiresAt: number; // Date.now() timestamp when effect ends
  } | null;

  // Transformation effects (fairy form via spell)
  transformations: {
    isFairyForm: boolean; // True when transformed into a fairy
    fairyFormExpiresAt: number | null; // Timestamp when fairy form expires (null = permanent until dispelled)
  };

  // Quest and storyline progression tracking
  quests: {
    [questId: string]: {
      started: boolean;
      completed: boolean;
      stage: number; // Current stage of multi-stage quests
      data: Record<string, unknown>; // Quest-specific data
    };
  };

  // Applied wallpapers per map (mapId → itemId of applied wallpaper)
  appliedWallpapers: Record<string, string>;

  // Active potion effects (for timed effects like Beast Tongue)
  // Key is effect type (e.g., 'beast_tongue'), value contains timing info
  activePotionEffects: {
    [effectType: string]: {
      startTime: number; // When effect was activated (Date.now())
      expiresAt: number; // When effect expires (Date.now() + duration)
    };
  };

  // Player disguise (for Glamour Draught potion)
  playerDisguise: {
    npcId: string; // ID of NPC being disguised as
    npcName: string; // Display name of NPC
    sprite: string; // Sprite path to use for player
    expiresAt: number; // When disguise expires (Date.now() + duration)
  } | null;
}
