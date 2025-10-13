# Game Asset Guidelines

This document outlines how to add your custom artwork to the game. The code has been updated to look for local image files, so you can now add your art directly to the project.

## File Structure

All game art should be placed in a new top-level folder named `assets`. Inside this folder, we'll organize by category. You will need to create this `assets` folder.

```
.
├── assets/
│   ├── player/
│   │   ├── down_0.png  (Idle/Standing frame facing down)
│   │   ├── down_1.png  (Walk cycle frame 1)
│   │   ├── down_2.png  (Walk cycle frame 2)
│   │   ├── down_3.png  (Walk cycle frame 3)
│   │   ├── up_0.png    (Idle/Standing frame facing up)
│   │   ├── up_1.png
│   │   ├── ... (and so on for 'left' and 'right')
│   │
│   └── tiles/
│       ├── grass_0.png
│       ├── grass_1.png
│       ├── grass_2.png
│       ├── rock_0.png
│       ├── water_0.png
│       ├── path_0.png
│       ├── shop_door_0.png
│       └── mine_entrance_0.png
│
├── index.html
├── index.tsx
└── ... (other project files)
```

## Player Sprites (`/assets/player/`)

-   **File Naming:** Please name files exactly as `[direction]_[frameNumber].png`. For example: `up_0.png`, `right_2.png`. The directions are `up`, `down`, `left`, `right`.
-   **Frame 0:** The `_0` frame is special. It's the "idle" or "standing still" pose. The game will show this frame when the player is not moving.
-   **Animation Frames:** Frames `_1`, `_2`, `_3`, etc., are for the walking animation. The engine is currently set up for 4 frames per direction (0 for idle, 1-3 for walking).
-   **Transparency:** All player sprites **must** have a transparent background.
-   **Size:** All player sprites should be the same dimensions (e.g., 32x32 pixels, or 64x64 for higher resolution). Consistency is key.

## Tile Sprites (`/assets/tiles/`)

-   **File Naming:** Please name files as `[tileName]_[variationNumber].png`. For example: `grass_0.png`, `grass_1.png`.
-   **Variations:** You can provide multiple versions for a tile (like grass) to make the world look more natural. The game will automatically and randomly pick between them. If a tile only has one look, just create a `_0` version (e.g., `rock_0.png`).
-   **Size:** All tile sprites **must** be square (e.g., 32x32 pixels).
-   **Seamless Tiling:** Design them so they look good when placed next to each other.
