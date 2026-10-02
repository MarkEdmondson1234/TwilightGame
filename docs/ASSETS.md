# Game Asset Guidelines

This document outlines how to add your custom artwork to the game. The code has been updated to look for local image files, so you can now add your art directly to the project.

## File Structure

All game art is placed in `/public/assets/`. This folder is organized by category.

```
.
├── public/
│   └── assets/
│       ├── character1/        (Player character — frame sets; see Player Sprites below)
│       │   ├── base/
│       │   ├── fairy/
│       │   └── variations/
│       │
│       ├── character2/        (Second player character, plus outfits/ costume sets)
│       │
│       ├── npcs/              (NPC sprites)
│       │   └── ...
│       │
│       ├── tiles/             (Tile sprites)
│       │   ├── grass_0.png
│       │   ├── grass_1.png
│       │   ├── rock_0.png
│       │   └── ...
│       │
│       └── animations/        (Animated GIF effects)
│           └── ...
│
├── index.html
└── ... (other project files)
```

## Player Sprites (`/public/assets/character{1,2}/`)

The player is drawn as a **complete hand-drawn character per direction frame** — not a
layered composite. Each playable character owns a directory of frames, and which one
renders is decided by the chosen `characterId` (see `components/CharacterCreator.tsx`).

### How the system actually works

- **Directories:** `public/assets/characterN/base/` holds `{up,down,left,right}_{frame}.png`.
  Frame `_0` is the idle pose; frames `_1+` are the walk cycle, which **ping-pongs**
  (0 → 1 → 2 → 3 → 2 → 1 → 0). Frame counts are per-character and per-direction — set in
  `CHARACTER_SPRITE_CONFIGS` in `utils/characterSprites.ts` (character1 has 3-frame
  up/down and 4-frame sides; character2 has 2-frame up/down).
- **Costumes:** a character may have full sprite-set costumes in
  `public/assets/characterN/outfits/<outfitId>/`, registered in
  `utils/characterOutfits.ts`. Costumes are bought as clothing items
  (`data/items/clothing.ts`) and worn from the bag; the character-creator outfit
  chips only show owned outfits. A costume may ship fewer frames — its
  `frameCounts` override the character's per direction.
- **Registration:** no `assets.ts` entry is needed for character frames — the sprite
  URLs are built in code (`utils/characterSprites.ts`, `utils/assetPreloader.ts`) and
  must stay in step (they are pinned per map in `utils/mapTextureSet.ts`).
- **Sizing:** draw large (the current sources are 2064×2064). The optimiser normalises
  every frame to 1024×1024 at showcase quality, and the game renders them at 3× via
  `isCustomCharacterSprite()` — guarded by `tests/characterSpriteScale.test.ts`,
  because a broken path match renders the player a third of its size **with nothing
  throwing**.
- **Transparency:** all frames need a transparent background and identical dimensions
  across a character's set (costume sets included).
- **Fairy form** is a shared sprite set in `public/assets/characterN/fairy/`, replacing
  the character sprite while transformed.

### Adding a costume (the current extension path)

1. Draw the frames into `public/assets/characterN/outfits/<outfitId>/` —
   `{direction}_{frame}.png` (+ the item icon under `public/assets/items/clothing/`).
2. Register one entry in `OUTFITS` in `utils/characterOutfits.ts` (label, icon, frame counts).
3. Add the clothing item and put it in a shop's stock — buying it is what unlocks the outfit.
4. Add the outfit id to the `o` validation in `database.rules.json` (presence field).
5. `npm run optimize-assets`, then `make verify`.

The polka-dot dress (`character2/outfits/polka_dress/`) is the worked example — see
`design_docs/planned/COSTUMES_SPRINT.md`.

## Tile Sprites (`/public/assets/tiles/`)

-   **File Naming:** Please name files as `[tileName]_[variationNumber].png`. For example: `grass_0.png`, `grass_1.png`.
-   **Variations:** You can provide multiple versions for a tile (like grass) to make the world look more natural. The game will automatically and randomly pick between them. If a tile only has one look, just create a `_0` version (e.g., `rock_0.png`).
-   **Size:** All tile sprites **must** be square (e.g., 32x32 pixels).
-   **Seamless Tiling:** Design them so they look good when placed next to each other.

## Animation Effects (`/public/assets/animations/`)

Environmental animations add atmosphere and life to the game world. These are animated GIFs that appear automatically near specific tile types when conditions are met.

### File Format
-   **Recommended:** Animated GIF (`.gif`)
-   **Also supported:** Animated PNG (`.apng`)
-   **Important:** Animation files are NOT processed by the optimization pipeline - use original files directly

### File Guidelines
-   **File Naming:** Descriptive names like `cherry_spring_petals.gif`, `rain.gif`, `chimney_smoke.gif`, `fireflies.gif`
-   **Transparency:** Use transparent backgrounds for overlay effects (falling petals, rain, etc.)
-   **Loop Quality:** Ensure smooth looping - first and last frames should match seamlessly
-   **File Size:** Keep under 100KB when possible for performance (aim for 30-50KB)
-   **Optimization:** Reduce colors, optimize frame count, use tools like ezgif.com

### Examples in Game
-   **Cherry Blossom Petals** (`cherry_spring_petals.gif`): Falls near cherry trees in spring
-   **Future examples**: Rain, snow, fireflies, chimney smoke, magic sparkles

### How Animations Work
1. Placed in `/public/assets/animations/`
2. Registered in `assets.ts` → `animationAssets` object
3. Configured in `constants.ts` → `TILE_ANIMATIONS` array
4. Automatically rendered near trigger tiles when conditions match

### Configuration
Animations can be configured with:
-   **Trigger Tiles:** Which tile types trigger the animation (e.g., `TileType.CHERRY_TREE`)
-   **Layers:** Background (behind everything), Midground (behind player), Foreground (above player)
-   **Conditions:** Seasonal (spring/summer/autumn/winter) or time-of-day (day/night)
-   **Positioning:** Offset from tile, radius of effect
-   **Appearance:** Opacity, scale, looping

See `.claude/skills/add-animation/SKILL.md` for complete implementation guide.

## Image Optimisation

_Moved from CLAUDE.md. The two non-obvious rules (`fit: 'inside'` for NPCs, `withoutEnlargement`) are kept there._


The optimization script (`scripts/optimize-assets.js`) uses Sharp to optimize all game assets.

### Running the Optimizer

- **Command**: `npm run optimize-assets` - Optimizes all images
- **Automatic**: Runs automatically before `npm run build`
- **Requirements**:
  - Sharp (installed via npm)
- **Source**: Original high-quality images in `/public/assets/`
- **Output**: Optimized images in `/public/assets-optimized/` (typically 95-99% size reduction)
- **When to run manually**: After adding new assets to `/public/assets/`

### What Gets Optimized

The script optimizes different asset types with appropriate settings:

| Asset Type                                   | Size          | Quality         | Compression | Use Case                                                          |
| -------------------------------------------- | ------------- | --------------- | ----------- | ----------------------------------------------------------------- |
| **Player character** (`character{1,2}/base`) | 1024×1024     | Showcase (97%)  | Level 4     | Player sprite (most-rendered art in the game)                     |
| **NPC sprites**                              | 1024 max edge | Showcase (97%)  | Level 4     | NPCs and dialogue portraits                                       |
| **Trees**                                    | 1024×1024     | Showcase (97%)  | Level 4     | Major visual elements                                             |
| **Decorative flowers**                       | 768×768       | Showcase (97%)  | Level 4     | Multi-tile plants (iris, roses)                                   |
| **Large furniture**                          | 768×768       | High (95%)      | Level 6     | Beds, sofas, tables                                               |
| **Shop buildings / bear cave**               | 1024×1024     | Very High (98%) | Level 4     | Large multi-tile buildings                                        |
| **Room backgrounds** (`rooms/`)              | 1920×1080     | JPEG q92 if opaque, else PNG 98% | Level 3 | Fill the viewport — downscaling these is upscaling on any desktop. Opaque art ships as `.jpg` (~1 MB, not ~4.5 MB); `tests/roomBackgroundFormat.test.ts` |
| **Farming sprites**                          | 512×512       | High (95%)      | Level 6     | Crop plants (key gameplay)                                        |
| **Dialogue frames / stream**                 | 512×512       | High (95%)      | Level 6     | UI and animation frames                                           |
| **Regular tiles**                            | 256×256       | Standard (85%)  | Level 6     | Grass, rocks, paths                                               |
| **Animated GIFs** (`animations/`)            | 48 frames × 256² | High (95%)   | Level 6     | Become a sprite sheet PNG + `.sheet.json` sidecar; played by `utils/pixi/AnimationLayer.ts` |

**Two rules that are not obvious from the table:**

1. **NPCs use `fit: 'inside'`, everything else uses `fit: 'contain'`.** `contain`
   pads non-square art out to a square, which moves the artwork inside its
   texture — and since sprites are stretched to their `SPRITE_METADATA` box, that
   changes how they look on screen. `inside` preserves the source aspect ratio
   exactly. For an already-square source the two are identical. Do **not** flip
   this globally: ~15 in-use sprites (sofa, mushroom house) have geometry tuned
   against the current padding.
2. **`withoutEnlargement` on the paths that use `inside`** — a 500×530 source was
   being upscaled to 1024×1024, quadrupling its GPU cost for no extra detail.

If an asset must bypass the optimiser, that is a bug in the optimiser, not a
reason to reference `/assets/`: the original is what the browser then downloads
_and_ uploads to the GPU.

### Quality Settings

Quality constants in `scripts/optimize-assets.js`:

```javascript
const COMPRESSION_QUALITY = 85; // Standard quality (regular tiles)
const HIGH_QUALITY = 95; // High quality (furniture, crops)
const SHOWCASE_QUALITY = 97; // Showcase quality (trees, flowers, NPCs)
const SHOP_QUALITY = 98; // Very high quality (large buildings)
```

**Compression Level** (Sharp PNG):

- Lower = better quality, larger files (e.g., 4)
- Higher = more compression, smaller files (e.g., 6-9)

### Customizing Optimization

**Adding new keywords** (automatic size/quality detection):

Edit `scripts/optimize-assets.js` in the `optimizeTiles()` function:

```javascript
// Example: Add "lavender" as a decorative flower
else if (file.includes('iris') || file.includes('rose') || file.includes('lavender')) {
  await sharp(inputPath)
    .resize(FLOWER_SIZE, FLOWER_SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ quality: SHOWCASE_QUALITY, compressionLevel: 4 })
    .toFile(outputPath);
}
```

**Changing quality for specific assets**:

1. Find the asset's keyword match in `optimizeTiles()`
2. Adjust `quality` (0-100) or `compressionLevel` (0-9)
3. Re-run `npm run optimize-assets`

**Example - Making iris even higher quality**:

```javascript
.png({ quality: 98, compressionLevel: 3 }) // Maximum quality
```

### Important Notes

- **Asset References**: Always import from `/public/assets-optimized/` in `assets.ts`
- **Multi-tile sprites**: Use optimized versions (they preserve transparency and quality)
- **Animated GIFs are not shipped**: the optimiser turns each into a sprite sheet (`name.sheet.png` + `name.sheet.json`, at most 48 frames of 256²) and PixiJS plays it as an `AnimatedSprite`. `tests/animationSheets.test.ts` fails if a sidecar is missing or disagrees with its PNG.
- **Re-optimization**: Safe to run multiple times - overwrites previous output

### Keyword quick reference

When adding new tile types, the optimization script uses **filename keywords** to determine size/quality:

| Keyword                    | Size   | Use Case                 |
| -------------------------- | ------ | ------------------------ |
| `tree_`, `oak_`, `willow_` | 1024px | Trees                    |
| `iris`, `rose`, flowers    | 768px  | Decorative flowers (3x3) |
| `bed`, `sofa`, furniture   | 768px  | Multi-tile furniture     |
| `shop`, buildings          | 1024px | Large buildings          |
| _(default)_                | 256px  | Regular tiles            |

**To add new keywords**: Edit `scripts/optimize-assets.js` in `optimizeTiles()`.
