# Game Development Principles

This document outlines the core principles we will adhere to during the development of this game. These principles are designed to ensure code quality, prevent regressions, and increase development velocity. Adherence to these rules is mandatory for all future changes.

---

### 1. The "Single Source of Truth" (SSoT) Principle

*   **Problem Solved:** Prevents desynchronization between different game systems (e.g., physics, visuals, UI, debug info). This was the root cause of our most persistent early bugs.
*   **The Rule:** Any piece of shared data must have one, and *only one*, authoritative location. All parts of the code that need this information **must** get it from that single source.
*   **Current Implementation:**
    *   **Map Data:** The `utils/mapUtils.ts` file contains the `getTileData(x, y)` function. This is the **only** function in the application that is permitted to read the raw `MAP_DATA` and `TILE_LEGEND`. The physics engine, the visual renderer, and the debug overlays all call this single function.
*   **Going Forward:** As we add new systems (inventory, crafting recipes, NPC dialogue), we will create a single, authoritative manager or utility for that data. For example, an `inventoryManager` would be the single source of truth for the player's items.

---

### 2. The "Don't Repeat Yourself" (DRY) Principle

*   **Problem Solved:** Eliminates "magic numbers" and duplicated logic, which are common sources of bugs when values need to be updated.
*   **The Rule:** A value or piece of logic should be defined exactly once in a central, accessible location.
*   **Current Implementation:**
    *   **Game Constants:** The `constants.ts` file defines values like `TILE_SIZE`, `PLAYER_SIZE`, `MAP_WIDTH`, etc. These constants are imported and used by all relevant components, ensuring consistency between rendering and physics calculations.
*   **Going Forward:** All new constants, from item prices to character speeds, will be defined in a central constants file. Reusable logic will be extracted into utility functions.

---

### 3. The "Automated Sanity Check" Principle

*   **Problem Solved:** Catches bugs and regressions early, before they are discovered through manual playtesting. Provides a safety net for future changes.
*   **The Rule:** The game itself should be able to test its most fundamental assumptions every time it starts up.
*   **Current Implementation:**
    *   **Core Logic Tests:** The `runSelfTests()` function in `App.tsx` establishes the foundation for this. The current implementation runs basic checks on startup to verify that the collision engine's understanding of "solid" and "non-solid" tiles matches the data defined in `constants.ts`. The `utils/testUtils.ts` file is designated to hold these test functions.
*   **Going Forward:** As new core systems are added, we will add corresponding sanity checks to `testUtils.ts`. For example, a new crafting system will be accompanied by a test to verify that a known-valid recipe is correctly identified.
