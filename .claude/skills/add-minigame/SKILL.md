---
name: Add Mini-Game
description: Create new mini-games for the TwilightGame plugin system. Use when user asks to create a mini-game, add a new game, or implement a mini-game activity.
---

# Add Mini-Game

Create self-contained mini-games that plug into TwilightGame's mini-game system. Each mini-game is 2 files + 1 registry line — no changes to core files needed.

## When to Use This Skill

Invoke this skill when:
- User asks to "create a mini-game" or "add a mini-game"
- User wants a new activity or game within the game (e.g. fishing, cooking contest, puzzle)
- User mentions pumpkin carving, fishing, crafting challenges, competitions

## Workflow: Interview the User

**IMPORTANT**: Do NOT jump straight to code. Walk the user through each decision using AskUserQuestion. Non-technical users should be able to create a mini-game by answering questions — they don't need to know TypeScript.

### Step 1: The Concept

Ask the user to describe their mini-game idea in plain English. If they've already described it, summarise what you understood and confirm.

Then use AskUserQuestion to clarify:

**Question 1 — "How does the player open this mini-game?"**
Offer these options:
- **Interact with an object** — Player clicks a placed item in the world (e.g. an easel, a cauldron, a workbench). Ask which object — can be an existing placed item or a new one.
- **Talk to an NPC** — Player talks to a character and chooses this activity from the menu. Ask which NPC (see NPC reference below).
- **Use an inventory item** — Player uses an item from their inventory to start the game.

**Question 2 — "When should this mini-game be available?"**
- **Always** — No restrictions
- **Certain seasons only** — Spring, Summer, Autumn, Winter (can pick multiple)
- **Time of day** — Day only, Night only
- **Friendship level** — Requires a minimum friendship with an NPC

**Question 3 — "Does the player need any items to play?"**
- **No items needed** — Free to play
- **Yes, uses items** — Ask which items and whether they're consumed when starting or when finishing. Validate item IDs exist in `data/items.ts`.

### Step 2: Rewards & Integration

**Question 4 — "What does the player get for completing it?"**
Offer multiple-select:
- **Gold** — How much? (or score-based formula)
- **Items** — Which items? Check they exist in `data/items.ts`
- **Friendship points** — With which NPC? How many?
- **Just a message** — Toast notification only
- **Nothing** — Pure fun, no rewards

**Question 5 — "Should this mini-game connect to any other systems?"**
Offer multiple-select:
- **Quest progression** — Completing the game advances a quest stage
- **Friendship** — Build friendship with a specific NPC
- **Inventory crafting** — Creates/transforms items
- **Sound effects** — Play sounds during gameplay
- **Save progress** — Remember scores/unlocks between sessions
- **None of these** — Standalone game

### Step 3: The Gameplay

**Question 6 — "What kind of gameplay?"**
Help the user describe the core mechanic. Offer examples based on existing games:
- **Canvas drawing/painting** — Like the painting easel (freeform creative)
- **Canvas interaction** — Like pumpkin carving (drag to modify an image)
- **Selection/crafting** — Like decoration crafting (pick recipes, combine items)
- **Timing/reflex** — Click at the right moment (e.g. fishing cast)
- **Puzzle** — Arrange/match/solve (e.g. potion mixing)
- **Conversation/choice** — Story-driven with branching options
- **Something else** — User describes it

**Question 7 — "How should it look?"**
- **Standard card** (recommended) — Dark overlay with a centred panel. Best for most games.
- **Full-screen** — Game controls the entire screen. Use for complex UIs (canvas painting, large layouts).

### Step 4: Confirm & Build

Present a summary of all decisions in plain English:

> **Fishing Mini-Game**
> - Opens when: Player interacts with the fishing_rod placed item
> - Available: Spring and Summer only
> - Requires: 1x bait (consumed on start)
> - Gameplay: Timing-based — cast and reel at the right moment
> - Rewards: Random fish item + 5-20 gold based on score
> - Friendship: +3 points with forest_chill_bear
> - Layout: Standard card
> - Sound effects: splash on cast, reel sound on catch

Ask: "Does this look right? Anything you'd like to change?"

Only proceed to code after user confirms.

---

## Implementation (after user confirms)

### Files to Create

1. **`minigames/<game-name>/definition.ts`** — Game metadata and triggers
2. **`minigames/<game-name>/<GameName>Game.tsx`** — React component with gameplay

### File to Edit

3. **`minigames/registry.ts`** — Add 1 import + 1 array entry

### Then Validate

4. Run `make verify` — typecheck + full test suite, must be clean

   **Never run `npm test`** — that is vitest in watch mode and will never exit. Use `make verify`, `make test` or `npm run test:run`.

   `tests/minigameRegistry.test.ts` guards the registry entry's structure and checks that every item ID in requirements/rewards exists in `ITEMS`. **Known baseline:** `cropGrowth` and `eventChains` already fail on `main` for unrelated reasons, so "2 failed" is green.

---

## Definition Template

```typescript
import type { MiniGameDefinition } from '../types';
import { MyGame } from './MyGame';

export const myGameDefinition: MiniGameDefinition = {
  id: 'my-game',                    // kebab-case, unique
  displayName: 'My Game',           // British English, shown in radial menu
  description: 'A short description in British English.',
  icon: '🎮',                       // Emoji for radial menu
  colour: '#3b82f6',                // Hex colour for radial menu
  component: MyGame,
  triggers: {
    placedItemId: 'some_item',      // OR npcId OR inventoryItemId
  },
  requirements: [                    // Optional — omit if no items needed
    { itemId: 'item_id', quantity: 1, consumeOn: 'onComplete' },
  ],
  availability: {                    // Optional — omit if always available
    seasons: ['autumn'],
    // timeOfDay: 'day',
    // minFriendship: { npcId: 'npc_id', level: 3 },
  },
  customBackdrop: false,             // true = full-screen, false = standard card
};
```

## Component Template

```typescript
import React, { useState, useCallback } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';

export const MyGame: React.FC<MiniGameComponentProps> = ({
  context,
  onClose,
  onComplete,
}) => {
  const [score, setScore] = useState(0);

  // === Available Context API ===
  // context.gameState   — read-only: time, gold, currentMapId, playerPosition
  // context.actions     — showToast, addItem, removeItem, hasItem, getItemQuantity,
  //                       addGold, spendGold, addFriendshipPoints, getFriendshipLevel,
  //                       playSfx, emitEvent
  // context.storage     — load<T>(), save<T>(data), clear() — per-game localStorage
  // context.triggerData — triggerType, position, npcId, itemId, extra

  const handleFinish = useCallback(() => {
    const result: MiniGameResult = {
      success: true,
      score,
      rewards: [{ itemId: 'some_item', quantity: 1 }],
      goldReward: score * 10,
      friendshipRewards: [{ npcId: 'some_npc', points: 5 }],
      message: 'Well done!',
      messageType: 'success',
      progressData: { lastScore: score },
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

## Registry Edit

Edit `minigames/registry.ts` — add 1 import and 1 array entry:

```typescript
import { myGameDefinition } from './my-game/definition';

const MINI_GAME_DEFINITIONS: MiniGameDefinition[] = [
  decorationCraftingDefinition,
  paintingEaselDefinition,
  pumpkinCarvingDefinition,
  myGameDefinition,  // ← new
];
```

---

## Game Systems Reference

These are the real IDs and values from the game. Use these when building definitions — do NOT invent IDs that don't exist.

### Valid NPC IDs

**Village:** `village_cat`, `village_dog`, `village_duck`, `village_elder`, `village_shopkeeper`, `village_child`, `village_old_woman_knitting`

**Forest:** `forest_bunnyfly`, `forest_chill_bear`, `forest_deer`, `forest_morgan`, `forest_mother_sea`, `forest_mushra`, `forest_possum`, `forest_professor_birdimen`, `forest_puffle`, `forest_sparrow`, `forest_stella`, `forest_suffle`, `forest_umbra_wolf`, `forest_witch_wolf`

**Home:** `home_mum`

### Seasons

`spring`, `summer`, `autumn`, `winter`

### Time of Day

`dawn`, `day`, `dusk`, `night`

### Item Categories (in `data/items.ts`)

| Category | ID prefix | Examples |
|----------|-----------|----------|
| Seeds | `seed_*` | `seed_radish`, `seed_corn`, `seed_pumpkin` |
| Crops | `crop_*` | `crop_radish`, `crop_corn`, `crop_pumpkin` |
| Tools | — | `hoe`, `watering_can`, `fishing_rod` |
| Materials | — | `wood`, `stone` |
| Ingredients | — | `flour`, `butter`, `sugar`, `milk` |
| Magical | — | `moonpetal`, `addersmeat`, `fairy_dust` |
| Food | `food_*` | `food_bread`, `food_soup`, `food_tea` |
| Potions | `potion_*` | `potion_stamina`, `potion_fairy_form` |
| Decorations | — | `painting`, `vase`, `easel`, `blank_canvas` |
| Paints | `paint_*` | `paint_red`, `paint_blue`, `paint_green`, `paint_teal`, `paint_yellow`, `paint_violet` |

**IMPORTANT**: Always verify item IDs exist by checking `data/items.ts` before using them in requirements or rewards. Never invent item IDs.

### Sound Effects (via `context.actions.playSfx`)

| SFX ID | Sound |
|--------|-------|
| `sfx_till` | Tilling soil |
| `sfx_hoe` | Hoe swing |
| `sfx_watering` | Watering plants |
| `sfx_harvest` | Harvesting crop |
| `sfx_frying` | Cooking/frying |
| `sfx_door_open` | Door opening |
| `sfx_cash_register` | Purchase/sale |
| `sfx_magic_transition` | Magic effect |
| `sfx_potion_making` | Brewing potion |

### Existing Placed Items (valid trigger targets)

| Item | Used by |
|------|---------|
| `easel` | Painting easel, Decoration crafting |
| `carving_table` | Pumpkin carving |

New placed items can be created in `data/items/decorations.ts` if needed.

### EventBus Events (via `context.actions.emitEvent`)

Mini-games can emit events to notify other systems:
- `QUEST_STAGE_CHANGED` — Advance a quest
- `INVENTORY_CHANGED` — After modifying inventory
- `FRIENDSHIP_REWARD` — After awarding friendship

---

## Validation Checklist

Before considering the mini-game complete, verify:

- [ ] `make verify` is clean — typecheck passes with zero errors and the test suite shows only the 2 known baseline failures (`cropGrowth`, `eventChains`, both pre-existing on `main`)
- [ ] All item IDs in requirements/rewards exist in `data/items.ts` — `tests/minigameRegistry.test.ts` enforces this, along with unique mini-game IDs and valid trigger item IDs
- [ ] All NPC IDs in triggers/rewards exist in the game
- [ ] Trigger item (placedItemId/npcId) exists in the game world
- [ ] All user-facing text is in British English (colour, favourite, travelling)
- [ ] Component handles both mouse and touch input (iPad support)
- [ ] Cancel button calls `onClose()` (lets player exit without penalty)
- [ ] Finish/complete button calls `onComplete()` with a valid `MiniGameResult`
- [ ] If new items are needed, they've been added to the matching module under `data/items/`

## Progressive Disclosure

1. **Always loaded**: This SKILL.md — interview workflow + game systems reference
2. **Read before writing code**: `.claude/skills/add-minigame/resources/IMPLEMENTATION_GUIDE.md` — detailed technical patterns, canvas gotchas, context API examples, common mistakes
3. **Read on demand**: `minigames/types.ts` — full TypeScript interface definitions
4. **Reference examples**:
   - `minigames/pumpkin-carving/` — Canvas-based carving with asset image, candle effects, scoring
   - `minigames/decoration-crafting/` — Full crafting UI with tabs and recipes

**IMPORTANT**: Before writing any code, always read the IMPLEMENTATION_GUIDE.md resource file. It contains critical patterns (image loading, canvas touch support, animation loops) and common mistakes to avoid.
