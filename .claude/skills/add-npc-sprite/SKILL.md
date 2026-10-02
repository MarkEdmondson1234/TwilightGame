---
name: Add NPC Sprite
description: Add a new NPC (non-player character) sprite to the game — hand-drawn PNG, optimised, with phone-sized variants
---

# Add NPC Sprite

This skill helps you add a new NPC sprite to the TwilightGame project following the project's asset management guidelines.

## When to Use

Use this skill when you need to:
- Add a new NPC character graphic (villager, shopkeeper, elder, child, etc.)
- Update or replace existing NPC sprites
- Register NPC assets in the centralized asset system

## Prerequisites

- The NPC image file should be ready (PNG with a transparent background)
- Know the NPC's identifier/name (e.g., "elder", "shopkeeper", "child")

## File Format

NPC sprites are **hand-drawn PNGs** with transparent backgrounds — every entry in `npcAssets` is a PNG served from `assets-optimized/`. Two legacy SVGs (`child.svg`, `elder.svg`) remain in `public/assets/npcs/` but nothing references them; do not use SVG for new NPCs.

## Steps

### 1. Place the Asset File

Place the NPC sprite in `/public/assets/npcs/`:
- Single-frame NPC: `/public/assets/npcs/[npcName].png` (e.g. `little_girl.png`)
- Animated NPC (several frames/states): a subfolder, e.g. `/public/assets/npcs/cat/cat_stand_01.png`, `cat_stand_02.png`, …
- Use a transparent background and a size consistent with other NPCs

### 2. Register in assets.ts

Add the asset to the `npcAssets` object in `assets.ts`, always using the optimised path:

```typescript
export const npcAssets = {
  // ... existing assets
  [npcName]: '/TwilightGame/assets-optimized/npcs/[npcName].png',
  [npcName]_portrait: '/TwilightGame/assets-optimized/npcs/[npcName].png', // dialogue portrait (may reuse a frame)
};
```

**Never reference `/assets/npcs/`** — the original is what the browser then downloads and uploads to the GPU.

### 3. Run Asset Optimisation

```bash
npm run optimize-assets
```

This will:
- Resize to at most 1024px on the longest edge with `fit: 'inside'` (aspect ratio preserved)
- Place the optimised version in `/public/assets-optimized/npcs/`
- Write a `[name]@half.png` sibling (512px) that phones load instead of the full file — `TextureManager` picks it automatically, so do not reference it in `assets.ts`

### 4. Verify

Check that:
- Original file exists at `/public/assets/npcs/[fileName]`
- Optimised file (and its `@half.png` sibling) exists under `/public/assets-optimized/npcs/`
- Asset is registered in the `npcAssets` object
- `make verify` is clean — typecheck plus the full test suite. **Never `npm test`** (watch mode, never exits); use `make test` or `npm run test:run` for tests alone.
- `tests/assetIntegrity.test.ts` walks every path exported from `assets.ts` and fails if the new `npcAssets` entry does not resolve to a real file — typically a typo, wrong case, or a skipped `npm run optimize-assets`
- `tests/textureVariants.test.ts` fails if the sprite landed without its `@half.png` sibling — run `npm run optimize-assets`
- **Expected result:** the suite is fully green — **any** failure is a real regression, including yours

## Asset Key Naming Convention

Use descriptive, lowercase names with underscores:
- `elder`
- `shopkeeper`
- `child`
- `village_elder`
- `merchant`
- `blacksmith`
- `farmer_joe`

## Example: Adding a PNG NPC

1. Place file: `/public/assets/npcs/farmer.png`
2. Register in assets.ts:
   ```typescript
   export const npcAssets = {
     // ... existing assets
     farmer: '/TwilightGame/assets-optimized/npcs/farmer.png',
     farmer_portrait: '/TwilightGame/assets-optimized/npcs/farmer.png',
   };
   ```
3. Run: `npm run optimize-assets`
4. Verify optimisation created `/public/assets-optimized/npcs/farmer.png` and `farmer@half.png`

## Important Notes

- **Always reference `public/assets-optimized/npcs/`**, never the originals
- All sprites use **linear (smooth) scaling** to preserve hand-drawn artwork quality (this game is NOT pixel art)
- Dialogue portraits are rendered as React `<img>`, not GPU textures; only the world sprite and `animatedStates` frames are uploaded to the GPU
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
