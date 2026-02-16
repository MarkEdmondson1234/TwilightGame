---
name: Add Mini-Game
description: Create new mini-games for the TwilightGame plugin system. Use when user asks to create a mini-game, add a new game, or implement a mini-game activity.
---

# Add Mini-Game

Create self-contained mini-games that plug into TwilightGame's mini-game system. Each mini-game is 2 files + 1 registry line — no changes to core files (App.tsx, useUIState, actionHandlers) needed.

## Quick Start

**Most common usage:**
```bash
# User says: "Create a fishing mini-game"
# This skill will:
# 1. Create minigames/fishing/definition.ts (MiniGameDefinition)
# 2. Create minigames/fishing/FishingGame.tsx (React component)
# 3. Register in minigames/registry.ts (1 import + 1 array entry)
# 4. Run npx tsc --noEmit to validate
```

## When to Use This Skill

Invoke this skill when:
- User asks to "create a mini-game" or "add a mini-game"
- User wants a new activity or game within the game (e.g. fishing, cooking contest, puzzle)
- User mentions pumpkin carving, fishing, crafting challenges, competitions

## Workflow

### 1. Gather Requirements

Determine from the user (or infer sensible defaults):
- **Game name** (kebab-case ID, e.g. `fishing`, `pumpkin-carving`)
- **Display name** (shown in radial menu, British English)
- **Trigger type** — how the mini-game opens:
  - `placedItemId` — interact with a placed item (e.g. easel, carving table)
  - `npcId` — talk to an NPC
  - `inventoryItemId` — use an inventory item
- **Item requirements** (optional) — items needed, consumed onStart or onComplete
- **Availability** (optional) — season/time-of-day restrictions
- **Backdrop** — standard (dark overlay, centred container) or custom (full-screen, game controls its own layout)

### 2. Create Definition File

Create `minigames/<game-name>/definition.ts`:

```typescript
import type { MiniGameDefinition } from '../types';
import { MyGame } from './MyGame';

export const myGameDefinition: MiniGameDefinition = {
  id: 'my-game',
  displayName: 'My Game',
  description: 'Short description in British English.',
  icon: '🎮',           // Emoji for radial menu
  colour: '#3b82f6',    // Hex colour for radial menu option
  component: MyGame,
  triggers: {
    placedItemId: 'some_item',  // or npcId / inventoryItemId
  },
  // Optional fields:
  requirements: [
    { itemId: 'crop_pumpkin', quantity: 1, consumeOn: 'onComplete' },
  ],
  availability: {
    seasons: ['autumn'],
    // timeOfDay: 'day',
    // minFriendship: { npcId: 'npc_id', level: 3 },
  },
  customBackdrop: false,  // true = component manages its own full-screen layout
};
```

### 3. Create Game Component

Create `minigames/<game-name>/MyGame.tsx`:

```typescript
import React, { useState, useCallback } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';

export const MyGame: React.FC<MiniGameComponentProps> = ({
  context,
  onClose,
  onComplete,
}) => {
  // Local game state
  const [score, setScore] = useState(0);

  // === Context API ===
  // context.gameState  — read-only: time, gold, currentMapId, playerPosition
  // context.actions    — showToast, addItem, removeItem, hasItem, getItemQuantity,
  //                      addGold, spendGold, addFriendshipPoints, getFriendshipLevel,
  //                      playSfx, emitEvent
  // context.storage    — load<T>(), save<T>(data), clear() — namespaced per game
  // context.triggerData — triggerType, position, npcId, itemId, extra

  const handleFinish = useCallback(() => {
    const result: MiniGameResult = {
      success: true,
      score,
      rewards: [{ itemId: 'some_item', quantity: 1 }],  // Optional
      goldReward: score * 10,                             // Optional
      friendshipRewards: [{ npcId: 'some_npc', points: 5 }],  // Optional
      message: 'Well done!',
      messageType: 'success',
      progressData: { lastScore: score },  // Saved to localStorage automatically
    };
    onComplete(result);
  }, [score, onComplete]);

  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: 16,
      padding: 24,
      minWidth: 360,
      color: '#e0e0e0',
      userSelect: 'none',
    }}>
      <h2>My Game</h2>
      {/* Game UI here */}
      <button onClick={handleFinish}>Finish</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};
```

### 4. Register in Registry

Edit `minigames/registry.ts`:

```typescript
// Add import
import { myGameDefinition } from './my-game/definition';

// Add to MINI_GAME_DEFINITIONS array
const MINI_GAME_DEFINITIONS: MiniGameDefinition[] = [
  decorationCraftingDefinition,
  paintingEaselDefinition,
  pumpkinCarvingDefinition,
  myGameDefinition,  // ← Add here
];
```

### 5. Validate

Run TypeScript check:
```bash
npx tsc --noEmit
```

## Key Interfaces Reference

### MiniGameComponentProps (what your component receives)

| Prop | Type | Description |
|------|------|-------------|
| `context` | `MiniGameContext` | Game state, actions, storage, trigger data |
| `onClose` | `() => void` | Close without result (cancel) |
| `onComplete` | `(result: MiniGameResult) => void` | Complete with rewards/score |

### MiniGameContext (available via props.context)

| Field | Type | Description |
|-------|------|-------------|
| `gameState` | `MiniGameGameState` | Read-only: time, gold, currentMapId, playerPosition |
| `actions` | `MiniGameActions` | showToast, addItem, removeItem, hasItem, addGold, spendGold, addFriendshipPoints, playSfx, emitEvent |
| `storage` | `MiniGameStorage` | load(), save(), clear() — auto-namespaced per game ID |
| `triggerData` | `MiniGameTriggerData` | How the game was triggered: triggerType, position, npcId, itemId |

### MiniGameResult (what onComplete expects)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | Did the player succeed? |
| `score` | `number` | No | Game-specific score |
| `rewards` | `Array<{itemId, quantity}>` | No | Items to award |
| `goldReward` | `number` | No | Gold to award |
| `friendshipRewards` | `Array<{npcId, points}>` | No | Friendship points to award |
| `message` | `string` | No | Toast message shown after closing |
| `messageType` | `'info'\|'success'\|'warning'\|'error'` | No | Toast type |
| `progressData` | `unknown` | No | Saved to localStorage automatically |

## Important Notes

- **British English** for all user-facing text (colour, favourite, travelling, practising)
- **Standard backdrop** (default) renders a dark overlay with centred content — your component just needs to be a card/panel
- **Custom backdrop** (`customBackdrop: true`) means your component is full-screen and handles its own positioning/z-index
- **Reward items** must exist in `data/items.ts` — check existing items before using an ID
- **Sound effects** played via `context.actions.playSfx(sfxId)` — check available SFX in AudioManager
- **Trigger items** (placedItemId, npcId) must exist in the game world for the mini-game to be accessible
- **No core file changes needed** — the registry auto-populates radial menus and handles all wiring

## Progressive Disclosure

1. **Always loaded**: This SKILL.md (workflow + interface reference)
2. **Read on demand**: `minigames/types.ts` for full TypeScript interfaces
3. **Reference example**: `minigames/pumpkin-carving/` for a complete working example

## Example Mini-Games

| Type | Trigger | Example |
|------|---------|---------|
| Placed item | `placedItemId: 'easel'` | Decoration crafting, painting |
| Placed item + requirements | `placedItemId: 'carving_table'` + `crop_pumpkin` | Pumpkin carving |
| NPC interaction | `npcId: 'chef_pierre'` | Cooking competition |
| Seasonal | `availability: { seasons: ['winter'] }` | Snowman building |
