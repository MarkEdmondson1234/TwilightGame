---
name: Add NPC Sprite
description: Add a new NPC (non-player character) sprite to the game, supporting both SVG and PNG formats
---

# Add NPC Sprite

This skill helps you add a new NPC sprite to the TwilightGame project following the project's asset management guidelines.

## When to Use

Use this skill when you need to:
- Add a new NPC character graphic (villager, shopkeeper, elder, child, etc.)
- Update or replace existing NPC sprites
- Register NPC assets in the centralized asset system

## Prerequisites

- The NPC image file should be ready (SVG or PNG format)
- Know the NPC's identifier/name (e.g., "elder", "shopkeeper", "child")

## File Formats

NPCs can use either:
- **SVG** (recommended for scalable vector graphics)
- **PNG** (for pixel art or raster graphics with transparency)

## Steps

### 1. Place the Asset File

Place the NPC sprite in `/public/assets/npcs/`:
- Format: `[npcName].svg` or `[npcName].png`
- Examples: `elder.svg`, `shopkeeper.svg`, `child.png`, `farmer.png`
- **SVG**: Ensure proper viewBox and dimensions
- **PNG**: Use transparent background, consistent size with other NPCs

Current NPC examples in the codebase:
- `elder.svg`
- `shopkeeper.svg`
- `child.svg`

### 2. Register in assets.ts

Add the asset to the `npcAssets` object in `assets.ts`:

For SVG files:
```typescript
export const npcAssets = {
  // ... existing assets
  [npcName]: new URL('./public/assets/npcs/[npcName].svg', import.meta.url).href,
};
```

For PNG files (use optimized path):
```typescript
export const npcAssets = {
  // ... existing assets
  [npcName]: new URL('./public/assets-optimized/npcs/[npcName].png', import.meta.url).href,
};
```

**Note**:
- SVG files are referenced directly from `public/assets/npcs/`
- PNG files are referenced from `public/assets-optimized/npcs/` (after optimization)

### 3. Run Asset Optimization (PNG only)

If you added a PNG file, run the optimization script:

```bash
npm run optimize-assets
```

This will:
- Optimize PNG compression
- Place optimized version in `/public/assets-optimized/npcs/`

**SVG files do not require optimization** - they are already optimized vector graphics.

### 4. Verify

Check that:
- Original file exists at `/public/assets/npcs/[fileName]`
- For PNG: Optimized file created at `/public/assets-optimized/npcs/[fileName]`
- Asset is properly registered in `npcAssets` object (or create this object if it doesn't exist)
- No TypeScript errors: `npx tsc --noEmit`

## Asset Key Naming Convention

Use descriptive, lowercase names with underscores:
- `elder`
- `shopkeeper`
- `child`
- `village_elder`
- `merchant`
- `blacksmith`
- `farmer_joe`

## Example: Adding an SVG NPC

1. Place file: `/public/assets/npcs/merchant.svg`
2. Register in assets.ts:
   ```typescript
   export const npcAssets = {
     elder: new URL('./public/assets/npcs/elder.svg', import.meta.url).href,
     shopkeeper: new URL('./public/assets/npcs/shopkeeper.svg', import.meta.url).href,
     merchant: new URL('./public/assets/npcs/merchant.svg', import.meta.url).href,
   };
   ```
3. No optimization needed for SVG
4. Verify file path is correct

## Example: Adding a PNG NPC

1. Place file: `/public/assets/npcs/farmer.png`
2. Register in assets.ts:
   ```typescript
   export const npcAssets = {
     // ... existing SVG assets
     farmer: new URL('./public/assets-optimized/npcs/farmer.png', import.meta.url).href,
   };
   ```
3. Run: `npm run optimize-assets`
4. Verify optimization created `/public/assets-optimized/npcs/farmer.png`

## Important Notes

- **SVG files**: Reference directly from `public/assets/npcs/`
- **PNG files**: Reference from `public/assets-optimized/npcs/`
- If `npcAssets` doesn't exist in assets.ts, create it following the same pattern as `tileAssets`
- All sprites use `imageRendering: 'pixelated'` for pixel art (PNG)
- SVG sprites scale smoothly at any size
- Ensure transparent backgrounds for proper rendering

## Creating NPC Instances in Maps

**IMPORTANT**: After adding NPC assets, you'll need to create NPC instances in map files. Follow the **factory function pattern** for consistency:

### Step 5: Create Factory Function (Recommended)

Create a reusable NPC factory function in `utils/npcFactories.ts`:

```typescript
/**
 * Create a [NPC Type] NPC with [description]
 *
 * @param id Unique ID for this NPC
 * @param position Where to place the NPC
 * @param name Optional name (defaults to "[NPC Type]")
 */
export function create[NpcType]NPC(
  id: string,
  position: Position,
  name: string = '[NPC Type]'
): NPC {
  const now = Date.now();

  // For animated NPCs, define animation states
  const animatedStates: AnimatedNPCStates = {
    currentState: 'idle',
    lastStateChange: now,
    lastFrameChange: now,
    currentFrame: 0,
    states: {
      idle: {
        sprites: [npcAssets.npc_01, npcAssets.npc_02],
        animationSpeed: 500, // ms per frame
      },
    },
  };

  return {
    id,
    name,
    position,
    direction: Direction.Down,
    behavior: NPCBehavior.STATIC, // or WANDER
    sprite: npcAssets.npc_01,
    portraitSprite: npcAssets.npc_portrait, // optional high-res
    scale: 3.0, // optional size (default 4.0)
    animatedStates, // optional for animated NPCs
    dialogue: [
      {
        id: 'greeting',
        text: 'Hello, traveller!',
        seasonalText: { // optional seasonal variations
          spring: 'Spring greetings!',
          // ...
        },
        responses: [ // optional branching dialogue
          { text: 'Hello!', nextId: 'follow_up' },
        ],
      },
    ],
    interactionRadius: 1.5, // optional (default 1.5)
  };
}
```

### Step 6: Use Factory in Map Definition

In your map file (e.g., `maps/definitions/village.ts`):

```typescript
import { createMerchantNPC } from '../../utils/npcFactories';

export const village: MapDefinition = {
  // ... map definition
  npcs: [
    // Clean, one-line NPC creation
    createMerchantNPC('merchant_1', { x: 10, y: 15 }),
    createVillageElderNPC('elder', { x: 20, y: 20 }),
  ],
};
```

### Benefits of Factory Functions

- **Clean map files**: Village.ts reduced from 404 → 169 lines (58% reduction!)
- **Reusable NPCs**: Create multiple instances easily
- **Centralized behavior**: Update NPC dialogue/behavior in one place
- **Consistent pattern**: All NPCs created the same way
- **DRY principle**: No duplicate NPC definitions

### When to Use Inline vs Factory

- **Factory function**: For any NPC you might reuse or has complex dialogue (recommended for all NPCs)
- **Inline definition**: Only for truly unique, one-off NPCs with minimal dialogue

## Related Documentation

- [ASSETS.md](../../../docs/ASSETS.md) - Complete asset guidelines
- [assets.ts](../../../assets.ts) - Centralized asset registry
- [npcFactories.ts](../../../utils/npcFactories.ts) - NPC factory function examples
