---
name: Add Character Sprite
description: Add player character sprites to the game, supporting both simple single-sprite and advanced layered customization systems
---

# Add Character Sprite

This skill helps you add player character sprites to the TwilightGame project, supporting both simple and advanced layered character customization.

## When to Use

Use this skill when you need to:
- Add new player character sprites
- Add character customization layers (skin tones, hairstyles, clothing, accessories)
- Set up a simple single-sprite character system
- Expand the layered character customization system

## Two Approaches

### Simple Setup (Single Sprite)
For a basic character with no customization - just one set of sprites for all directions and animations.

### Advanced Setup (Layered Customization)
For character customization with multiple layers (skin, hair, clothes, shoes, glasses) that stack together.

## Prerequisites

- Character sprite files ready (PNG format with transparent backgrounds)
- All sprites same dimensions (e.g., 32x32 or 64x64 pixels)
- Sprites organized by direction: up, down, left, right
- 4 frames per direction (frame 0 = idle, frames 1-3 = walking animation)

## Rendering Architecture Note

**TwilightGame uses PixiJS WebGL rendering** for high performance (10-100x faster than DOM).

**What this means for you:**
- **Asset registration** (in `assets.ts`): Unchanged
- **Texture preloading**: Character sprites automatically preloaded into PixiJS TextureManager on game startup
- **Rendering**: Handled by `PlayerSprite.ts` (PixiJS) with movement logic in `App.tsx`
- **You don't need PixiJS knowledge** - just register your assets as documented below

No additional configuration needed beyond asset registration - the rendering engine handles texture loading and sprite composition automatically

## File Naming Convention

All character sprites must follow this pattern:
- Format: `[direction]_[frameNumber].png`
- Directions: `up`, `down`, `left`, `right`
- Frame 0: Idle/standing pose (shown when not moving)
- Frames 1-3: Walking animation frames
- Examples: `down_0.png`, `right_2.png`, `up_1.png`

## Simple Setup Steps

### 1. Place Character Sprites

Place all 16 sprite files (4 directions × 4 frames) in `/public/assets/character1/`:

```
/public/assets/character1/
├── down_0.png    (idle facing down)
├── down_1.png
├── down_2.png
├── down_3.png
├── up_0.png      (idle facing up)
├── up_1.png
├── up_2.png
├── up_3.png
├── left_0.png    (idle facing left)
├── left_1.png
├── left_2.png
├── left_3.png
├── right_0.png   (idle facing right)
├── right_1.png
├── right_2.png
└── right_3.png
```

### 2. Register in assets.ts

Add to the `playerAssets` object in `assets.ts`:

```typescript
export const playerAssets = {
  down_0: '/TwilightGame/assets-optimized/character1/down_0.png',
  down_1: '/TwilightGame/assets-optimized/character1/down_1.png',
  // ... all 16 sprites
};
```

### 3. Run Asset Optimization

```bash
npm run optimize-assets
```

This will optimize and place files in `/public/assets-optimized/character1/`.

## Advanced Setup Steps (Layered Customization)

### 1. Organize by Layers

Create subdirectories for each customization layer:

```
/public/assets/character1/
├── base/                    # Base body outline (required)
│   ├── down_0.png
│   ├── down_1.png
│   └── ... (all 16 frames)
│
├── skin/                    # Skin tone options
│   ├── pale/
│   │   ├── down_0.png
│   │   └── ... (all 16 frames)
│   ├── light/
│   ├── medium/
│   ├── tan/
│   ├── dark/
│   └── deep/
│
├── hair/                    # Hair style/color combinations
│   ├── short_black/
│   │   ├── down_0.png
│   │   └── ... (all 16 frames)
│   ├── short_brown/
│   ├── long_blonde/
│   ├── curly_red/
│   └── ...
│
├── clothes/                 # Clothing style/color combinations
│   ├── shirt_blue/
│   │   ├── down_0.png
│   │   └── ... (all 16 frames)
│   ├── tunic_green/
│   ├── dress_pink/
│   └── ...
│
├── shoes/                   # Footwear style/color combinations
│   ├── boots_brown/
│   ├── sneakers_white/
│   └── ...
│
└── glasses/                 # Glasses/accessories (optional)
    ├── round/
    ├── square/
    └── sunglasses/
```

### 2. Layer Composition

The game stacks layers in this order:
1. base (body outline)
2. skin (skin tone)
3. clothes (clothing)
4. shoes (footwear)
5. hair (hairstyle)
6. glasses (accessories)

**Important**: Each layer must have transparency where other layers should show through!

### 3. Register Layered Assets

The character customization system is defined in `utils/characterSprites.ts`. Register your layers there following the existing pattern.

### 4. Run Asset Optimization

```bash
npm run optimize-assets
```

The optimization script handles sprite sheet generation for layered characters.

## Sprite Requirements

✅ **Must Have:**
- Transparent background (required)
- Same dimensions for all sprites (consistency is critical)
- All 16 sprites (4 directions × 4 frames)
- Frame 0 is idle pose for each direction
- PNG format

✅ **Best Practices:**
- Use hand-drawn style (this game is NOT pixel art)
- Keep character centered in sprite bounds
- Design for smooth animation transitions
- Test idle and walking animations

## Verification Steps

1. Check original files exist in `/public/assets/character1/`
2. Check optimized files created in `/public/assets-optimized/character1/`
3. Verify all 16 sprites are present for each layer
4. Run TypeScript check: `npx tsc --noEmit`
5. Test in-game by running `npm run dev`
6. Verify animations play correctly (press WASD to move)

## Example: Adding Simple Character

1. Place 16 PNG files in `/public/assets/character1/`
2. Update `playerAssets` in assets.ts:
   ```typescript
   export const playerAssets = {
     down_0: '/TwilightGame/assets-optimized/character1/down_0.png',
     down_1: '/TwilightGame/assets-optimized/character1/down_1.png',
     down_2: '/TwilightGame/assets-optimized/character1/down_2.png',
     down_3: '/TwilightGame/assets-optimized/character1/down_3.png',
     // ... repeat for up, left, right
   };
   ```
3. Run `npm run optimize-assets`
4. Test with `npm run dev`

## Example: Adding Hair Style

1. Create directory: `/public/assets/character1/hair/ponytail_red/`
2. Place all 16 frames in that directory
3. Register in `utils/characterSprites.ts` (see existing patterns)
4. Run `npm run optimize-assets`
5. Test character customization in-game

## Important Notes

- **All sprites must be same size** - mixing sizes breaks layering
- **Frame 0 is special** - it's the idle pose shown when not moving
- **Transparency required** - solid backgrounds will hide other layers
- Game uses **linear (smooth) scaling** to preserve hand-drawn artwork quality (this game is NOT pixel art)
- Currently using placeholder sprites - system ready for custom art
- Character animation speed controlled by `ANIMATION_SPEED_MS` constant (150ms)

## Related Documentation

- [ASSETS.md](../../../docs/ASSETS.md) - Complete asset guidelines
- [utils/characterSprites.ts](../../../utils/characterSprites.ts) - Character sprite system
- [assets.ts](../../../assets.ts) - Centralized asset registry
- [App.tsx](../../../App.tsx) - Player movement and animation logic
