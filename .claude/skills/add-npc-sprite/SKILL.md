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
- **PNG** (for hand-drawn raster graphics with transparency)

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
  [npcName]: '/TwilightGame/assets/npcs/[npcName].svg',
};
```

For PNG files (use optimized path):
```typescript
export const npcAssets = {
  // ... existing assets
  [npcName]: '/TwilightGame/assets-optimized/npcs/[npcName].png',
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
     elder: '/TwilightGame/assets/npcs/elder.svg',
     shopkeeper: '/TwilightGame/assets/npcs/shopkeeper.svg',
     merchant: '/TwilightGame/assets/npcs/merchant.svg',
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
     farmer: '/TwilightGame/assets-optimized/npcs/farmer.png',
   };
   ```
3. Run: `npm run optimize-assets`
4. Verify optimization created `/public/assets-optimized/npcs/farmer.png`

## Important Notes

- **SVG files**: Reference directly from `public/assets/npcs/`
- **PNG files**: Reference from `public/assets-optimized/npcs/`
- If `npcAssets` doesn't exist in assets.ts, create it following the same pattern as `tileAssets`
- All sprites use **linear (smooth) scaling** to preserve hand-drawn artwork quality (this game is NOT pixel art)
- SVG sprites scale smoothly at any size
- Ensure transparent backgrounds for proper rendering

## Creating NPC Instances in Maps

**IMPORTANT**: After adding NPC assets, you'll need to create NPC instances in map files. Follow the **factory function pattern** for consistency:

### Step 5: Create Factory Function (Recommended)

Use the `createNPC` factory from `utils/npcs/createNPC.ts` to create NPCs:

```typescript
import { createNPC, createStaticNPC, createWanderingNPC } from '../utils/npcs/createNPC';
import { npcAssets } from '../assets';

/**
 * Create a [NPC Type] NPC with [description]
 */
export function create[NpcType]NPC(id: string, position: Position): NPC {
  return createNPC({
    id,
    name: '[NPC Type]',
    position,
    sprite: npcAssets.npc_01,
    portraitSprite: npcAssets.npc_portrait, // optional high-res
    scale: 3.0, // optional (default 3.0)
    // For animated NPCs, add states:
    states: {
      idle: {
        sprites: [npcAssets.npc_01, npcAssets.npc_02],
        // animationSpeed defaults to TIMING.NPC_FRAME_MS (280ms)
      },
    },
    initialState: 'idle',
    dialogue: [
      {
        id: 'greeting',
        text: 'Hello, traveller!',
        seasonalText: { // optional seasonal variations
          spring: 'Spring greetings!',
        },
        responses: [ // optional branching dialogue
          { text: 'Hello!', nextId: 'follow_up' },
        ],
      },
    ],
  });
}

// Or use convenience functions for common patterns:
// createStaticNPC({ ... }) - NPC that stands still
// createWanderingNPC({ ... }) - NPC that moves around
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
