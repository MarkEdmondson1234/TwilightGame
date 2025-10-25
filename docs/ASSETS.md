# Game Asset Guidelines

This document outlines how to add your custom artwork to the game. The code has been updated to look for local image files, so you can now add your art directly to the project.

## File Structure

All game art is placed in `/public/assets/`. This folder is organized by category.

```
.
├── public/
│   └── assets/
│       ├── character1/        (Layered character customization system)
│       │   ├── base/
│       │   └── variations/
│       │
│       ├── npcs/              (NPC sprites)
│       │   ├── elder.svg
│       │   ├── shopkeeper.svg
│       │   └── child.svg
│       │
│       ├── tiles/             (Tile sprites)
│       │   ├── grass_0.png
│       │   ├── grass_1.png
│       │   ├── grass_2.png
│       │   ├── rock_0.png
│       │   ├── water_0.png
│       │   ├── path_0.png
│       │   ├── shop_door_0.png
│       │   └── mine_entrance_0.png
│       │
│       └── animations/        (Animated GIF effects)
│           ├── cherry_spring_petals.gif
│           ├── rain.gif        (future)
│           └── fireflies.gif   (future)
│
├── index.html
└── ... (other project files)
```

## Player Sprites (`/public/assets/character1/`)

The player sprite system now supports **layered customization**! Each character customization option (skin, hair, clothes, etc.) can have its own sprite layer that gets composited together.

### Simple Setup (Single Sprite)
If you want a simple single-sprite system:

-   **File Naming:** Please name files exactly as `[direction]_[frameNumber].png`. For example: `up_0.png`, `right_2.png`. The directions are `up`, `down`, `left`, `right`.
-   **Frame 0:** The `_0` frame is special. It's the "idle" or "standing still" pose. The game will show this frame when the player is not moving.
-   **Animation Frames:** Frames `_1`, `_2`, `_3`, etc., are for the walking animation. The engine is currently set up for 4 frames per direction (0 for idle, 1-3 for walking).
-   **Transparency:** All player sprites **must** have a transparent background.
-   **Size:** All player sprites should be the same dimensions (e.g., 32x32 pixels, or 64x64 for higher resolution). Consistency is key.

### Advanced Setup (Layered Customization)
For character customization support, organize sprites by layer:

```
public/assets/
├── character1/
│   ├── base/                    # Base body outline (required)
│   │   ├── down_0.png
│   │   ├── down_1.png
│   │   └── ... (all directions/frames)
│   │
│   ├── skin/                    # Skin tone layers
│   │   ├── pale/
│   │   │   ├── down_0.png
│   │   │   └── ... (all directions/frames)
│   │   ├── light/
│   │   ├── medium/
│   │   ├── tan/
│   │   ├── dark/
│   │   └── deep/
│   │
│   ├── hair/                    # Hair styles and colors
│   │   ├── short_black/
│   │   │   ├── down_0.png
│   │   │   └── ...
│   │   ├── short_brown/
│   │   ├── long_blonde/
│   │   ├── curly_red/
│   │   └── ... (style_color combinations)
│   │
│   ├── clothes/                 # Clothing styles and colors
│   │   ├── shirt_blue/
│   │   │   ├── down_0.png
│   │   │   └── ...
│   │   ├── tunic_green/
│   │   ├── dress_pink/
│   │   └── ... (style_color combinations)
│   │
│   ├── shoes/                   # Footwear styles and colors
│   │   ├── boots_brown/
│   │   │   ├── down_0.png
│   │   │   └── ...
│   │   ├── sneakers_white/
│   │   └── ... (style_color combinations)
│   │
│   └── glasses/                 # Glasses (optional layer)
│       ├── round/
│       │   ├── down_0.png
│       │   └── ...
│       ├── square/
│       └── sunglasses/
```

**How Layering Works:**
1. The game stacks layers in order: base → skin → clothes → shoes → hair → glasses
2. Each layer must have transparency where other layers show through
3. All sprites for the same frame/direction must be the same size
4. The system defined in `utils/characterSprites.ts` handles automatic layer composition

**Currently Using:** Placeholder sprites (color-coded). The system is ready to swap in custom layered sprites when you add them to the folders above.

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
-   **Important:** Animation files ARE optimized by the asset pipeline!

### Automatic Optimization

When you run `npm run optimize-assets`, GIFs are automatically:
-   **Resized** to 512x512 pixels (regardless of source size)
-   **Compressed** using gifsicle (60-80% file size reduction typical)
-   **Output** to `/public/assets-optimized/animations/`

**Requirements:**
-   Install gifsicle: `brew install gifsicle` (macOS) or `apt-get install gifsicle` (Linux)
-   If gifsicle is not installed, files are copied without optimization

**Scale Values:** Since optimized GIFs are 512x512px:
-   Small effects: `scale: 0.25` (~128px / 2 tiles)
-   Medium effects: `scale: 0.5` (~256px / 4 tiles)
-   Large effects: `scale: 0.8` (~410px / 6.4 tiles)

### File Guidelines
-   **File Naming:** Descriptive names like `cherry_spring_petals.gif`, `rain.gif`, `chimney_smoke.gif`, `fireflies.gif`
-   **Source Size:** Any size is fine! Optimization resizes to 512x512
-   **Transparency:** Use transparent backgrounds for overlay effects (falling petals, rain, etc.)
-   **Loop Quality:** Ensure smooth looping - first and last frames should match seamlessly
-   **Optimization:** The asset pipeline handles optimization automatically!

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
