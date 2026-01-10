# Save System Documentation

This document explains how TwilightGame stores player progress using browser localStorage.

## Overview

The game uses browser `localStorage` to persist player data between sessions. All save data is stored in a single JSON object under the key `twilight-game-save`.

## localStorage Key

```javascript
const SAVE_KEY = 'twilight-game-save';
```

**Location**: Browser's localStorage (accessible via browser DevTools)

**To inspect save data**:
1. Open browser DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Navigate to Local Storage → `http://localhost:4000` (or your domain)
4. Find the `twilight-game-save` key

**To view save data in console**:
```javascript
localStorage.getItem('twilight-game-save')
```

## Save Data Structure

The save data is a JSON object with the following top-level structure:

```typescript
{
  // Player position and map
  playerPosition: { x: number, y: number },
  currentMapId: string,

  // Inventory and tools
  inventory: Array<{ itemId: string, quantity: number, masteryLevel?: number }>,
  currentTool: string,

  // Cooking system
  cooking: {
    recipeBookUnlocked: boolean,
    unlockedRecipes: string[],
    recipeProgress: Record<string, RecipeProgress>
  },

  // Farming system
  farmPlots: Array<FarmPlot>,

  // NPC relationships
  friendship: {
    friendshipLevels: Record<string, number>,
    giftHistory: Record<string, GiftHistoryEntry[]>
  },

  // Placed items (items on surfaces)
  placedItems: Array<PlacedItem>,

  // Time and calendar
  time: {
    currentDay: number,
    currentSeason: string,
    currentYear: number,
    timeOfDay: number
  },

  // Character customization
  character: {
    skinTone: string,
    hairColor: string,
    // ... other customization options
  },

  // Quest and story progress
  quests: Record<string, QuestProgress>,

  // Game state flags
  hasSeenIntro: boolean,
  feelingSick: boolean,
  // ... other boolean flags
}
```

## Key Components

### 1. Cooking System (`cooking`)

Managed by: `utils/CookingManager.ts`

```typescript
cooking: {
  recipeBookUnlocked: boolean,        // Has player talked to Mum?
  unlockedRecipes: string[],          // Recipe IDs player knows
  recipeProgress: {
    [recipeId: string]: {
      recipeId: string,
      timesCooked: number,            // How many times cooked
      isMastered: boolean,            // Cooked 3+ times?
      unlockedAt: number              // Game day when unlocked
    }
  }
}
```

**Important**: If a recipe has `recipeProgress` but isn't in `unlockedRecipes`, the game will auto-unlock it on load (data migration).

### 2. Inventory System (`inventory`)

Managed by: `utils/inventoryManager.ts`

```typescript
inventory: [
  {
    itemId: string,        // Item identifier (e.g., 'food_tea', 'tea_leaves')
    quantity: number,      // How many the player has
    masteryLevel?: number  // For food items: 0-2 based on cooking skill
  }
]
```

**Tool tracking**:
```typescript
currentTool: string  // Currently selected tool ID
```

### 3. Friendship System (`friendship`)

Managed by: `utils/FriendshipManager.ts`

```typescript
friendship: {
  friendshipLevels: {
    [npcId: string]: number  // 0-100 friendship points
  },
  giftHistory: {
    [npcId: string]: [
      {
        day: number,        // Game day when gift was given
        itemId: string,     // What was gifted
        pointsGained: number // Friendship points earned
      }
    ]
  }
}
```

### 4. Farm System (`farmPlots`)

Managed by: `utils/farmManager.ts`

```typescript
farmPlots: [
  {
    id: string,
    x: number,
    y: number,
    mapId: string,
    state: 'fallow' | 'tilled' | 'planted' | 'watered' | 'ready',
    crop?: string,           // Crop ID if planted
    plantedDay?: number,     // Day planted
    lastWateredDay?: number  // Last day watered
  }
]
```

### 5. Character Data

Managed by: `utils/CharacterData.ts`

The `CharacterData` utility provides a unified API for saving/loading all character-specific data:

```typescript
// Save any subsystem data
characterData.save('cooking', cookingState);
characterData.save('friendship', friendshipState);

// Load subsystem data
const cookingData = characterData.load('cooking');
```

## Save/Load Flow

### Saving Data

1. **Individual managers save their own data**:
   - `cookingManager.save()` → calls `characterData.save('cooking', state)`
   - `friendshipManager.save()` → calls `characterData.save('friendship', state)`
   - `inventoryManager.save()` → calls `characterData.saveInventory(items, tools)`

2. **CharacterData consolidates all data** into a single save object

3. **GameState.saveToLocalStorage()** writes the consolidated object to localStorage

### Loading Data

1. **Game starts** → `gameInitializer.ts` runs

2. **GameState.loadFromLocalStorage()** reads from localStorage

3. **Each manager initializes** with their data:
   - `cookingManager.initialise()` → loads `cooking` data
   - `friendshipManager.loadState()` → loads `friendship` data
   - `inventoryManager.initialise()` → loads inventory data

4. **Data migrations run** (e.g., auto-unlocking recipes with progress)

## Data Persistence Best Practices

### When to Save

✅ **DO save immediately after**:
- Unlocking a recipe (`cookingManager.unlockRecipe()`)
- Cooking food (`cookingManager.cook()`)
- Giving gifts to NPCs (`friendshipManager.giveGift()`)
- Planting/harvesting crops (`farmManager.plant/harvest()`)
- Adding/removing inventory items (`inventoryManager.addItem/removeItem()`)

❌ **DON'T save**:
- Every frame in the game loop
- During rapid state changes (e.g., player movement)
- In render functions

### Data Migration

When loading old save files, defensive checks ensure data consistency:

```typescript
// Example: CookingManager auto-unlocks recipes with progress
this.recipeProgress.forEach((progress, recipeId) => {
  if (!this.unlockedRecipes.has(recipeId)) {
    console.warn(`Auto-unlocking ${recipeId} - had progress but wasn't unlocked`);
    this.unlockedRecipes.add(recipeId);
  }
});
```

## Common Issues

### Save Data Lost

**Symptoms**: Player progress reset, localStorage returns `null`

**Causes**:
- Browser cleared storage (Settings → Clear browsing data)
- Incognito/Private mode (doesn't persist localStorage)
- Different browser/profile (each has separate storage)
- Manual reset via DevTools

**Prevention**:
- Use the same browser and profile
- Avoid incognito mode for persistent saves
- Future: Add export/import save feature

### Partial Data Corruption

**Symptoms**: Some progress exists but not all (e.g., `recipeProgress` but no `unlockedRecipes`)

**Cause**: Usually HMR (Hot Module Replacement) during development causing partial state updates

**Solution**: Data migration code auto-fixes inconsistencies on load

### Save Not Persisting

**Symptoms**: Changes don't save between sessions

**Debug steps**:
1. Check if `characterData.save()` is being called (console logs)
2. Verify localStorage has data: `localStorage.getItem('twilight-game-save')`
3. Check for JavaScript errors preventing save
4. Ensure browser isn't blocking localStorage (rare)

## Testing Save System

### Manual Testing

```javascript
// In browser console:

// View current save
JSON.parse(localStorage.getItem('twilight-game-save'))

// Clear save (reset game)
localStorage.removeItem('twilight-game-save')

// Backup save
const backup = localStorage.getItem('twilight-game-save')

// Restore save
localStorage.setItem('twilight-game-save', backup)
```

### Programmatic Testing

```typescript
// In game code (debug mode):
import { gameState } from './GameState';

// Force save
gameState.saveToLocalStorage();

// Force load
gameState.loadFromLocalStorage();

// Get specific subsystem data
const cookingData = gameState.loadCookingState();
```

## Future Enhancements

Planned features for the save system:

1. **Export/Import** - Download save as JSON file, upload to restore
2. **Multiple Save Slots** - Support for multiple characters
3. **Cloud Sync** - Optional cloud backup (requires backend)
4. **Auto-save Indicator** - Show when game is saving
5. **Save Compression** - Reduce localStorage footprint for large saves

## File Locations

Key files for the save system:

- `GameState.ts` - Main save/load logic and localStorage interface
- `utils/CharacterData.ts` - Unified API for character data
- `utils/CookingManager.ts` - Cooking data save/load
- `utils/FriendshipManager.ts` - NPC relationship data
- `utils/inventoryManager.ts` - Inventory and tools
- `utils/farmManager.ts` - Farm plot data
- `utils/gameInitializer.ts` - Save initialization on startup

## Related Documentation

- [COOKING.md](./COOKING.md) - Cooking system (if exists)
- [FARMING.md](./FARMING.md) - Farming system
- [TIME_SYSTEM.md](./TIME_SYSTEM.md) - Time and calendar system

---

**Last Updated**: 2026-01-10
**Maintained By**: TwilightGame Development Team
