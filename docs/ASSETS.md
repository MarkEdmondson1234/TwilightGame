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
