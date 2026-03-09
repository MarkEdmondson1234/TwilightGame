# Performance & AI Coding Optimisations

**Created:** 2026-03-09
**Status:** Planned

## Game Performance Issues

### Critical

#### 1. Duplicate Full Re-renders in usePixiRenderer
**File:** `hooks/usePixiRenderer.ts` (effects at ~line 594 and ~line 776)

Two separate `useEffect` blocks both call `renderTiles`, `renderSprites`, `renderShadows`, and `darknessLayer.update`. They share overlapping dependencies (`currentMapId`, `visibleRange`, `seasonKey`, `farmUpdateTrigger`, `currentWeather`), so many state changes trigger the entire render pipeline **twice**.

**Fix:** Merge both effects into one with the union of their dependencies.

#### 2. O(n) Array Scan in Collision Hot Path
**File:** `hooks/useCollisionDetection.ts:41,57`

`SPRITE_METADATA.find()` is called ~882 times per movement frame (441 iterations × 2 axes). `MetadataCache` with O(1) `Map` lookups already exists at `utils/MetadataCache.ts` and is used by `SpriteLayer` — but collision detection still does linear scans.

**Fix:** Replace `SPRITE_METADATA.find((s) => s.tileType === type)` with `metadataCache.getMetadata(type)`.

### High

#### 3. gameLoop Recreated on Dialogue/Transition
**File:** `App.tsx:576-649`

`activeNPC` and `currentMapId` in the `useCallback` deps cause the rAF chain to break and restart on every NPC interaction or map change. These should be refs read inside the loop, not closure captures.

**Fix:** Move `activeNPC`, `isCutscenePlaying`, `currentMapId`, `activeChainPopup` to refs.

#### 4. cullSprites Parses All Sprite Key Strings Every Render
**File:** `utils/pixi/TileLayer.ts:956`

`String.replace()` with regex + `split().map(Number)` on every sprite key, every frame. Plus the fence regex pattern is wrong (`_fence$` doesn't match `_fence_left`), producing NaN coordinates for fence sprites that never get culled.

**Fix:** Store tile coordinates alongside sprites in the map (e.g. `Map<string, {sprite, x, y}>`). Add early-exit if `visibleRange` hasn't changed.

#### 5. PlayerSprite.update() is Async Per-Frame
**File:** `utils/pixi/PlayerSprite.ts:74`

Awaits `loadTexture()` every frame for already-cached textures. Microtask overhead on every frame.

**Fix:** Use synchronous `getTexture()` since textures are preloaded at startup.

#### 6. checkSeasonChange() Called 60fps
**File:** `App.tsx:592`

Computes `TimeManager.getCurrentTime()` every frame to check something that changes weekly.

**Fix:** Throttle to every few seconds using timestamp comparison.

#### 7. TimeManager.getCurrentTime() Called 6+ Times Per Render
**File:** `hooks/usePixiRenderer.ts` (lines 387, 564, 646, 659, 819, 851)

Each call involves `Date.now()`, division, modulo, and object construction.

**Fix:** Call once per render cycle, store result, pass down.

#### 8. Glow Effects Fully Redrawn on Every Camera Move
**File:** `utils/pixi/SpriteLayer.ts:319-331`

32 circles per glowing sprite cleared and redrawn whenever camera moves.

**Fix:** Cache last drawn pulse alpha and position; only redraw when changed.

### Medium

#### 9. Camera useMemo Recomputes Every Frame
**File:** `hooks/useCamera.ts:35`

`playerPos` is a new object reference every frame, cascading to `visibleRange` updates and PixiJS re-renders even when stationary.

**Fix:** Only update `playerPos` state when position actually changes.

#### 10. calculateTileTransforms() Re-runs for Every Visible Tile Every Render
**File:** `utils/pixi/TileLayer.ts:576`

Tile transforms are static per position — should be cached per `(tileType, x, y)`.

#### 11. GameState.notify() Always Schedules saveState()
**File:** `GameState.ts:651`

Every state mutation schedules a localStorage serialize timer. Batched mutations fire multiple timers.

---

## AI Coding Efficiency Issues

### High Impact (causes wrong code)

#### 12. Two Incompatible Season Types
- `utils/TimeManager.ts`: `enum Season { SPRING = 'Spring' }` (capitalised)
- `data/shopInventory.ts`: `type Season = 'spring'` (lowercase)

**Fix:** Consolidate to one canonical `Season` type in `types.ts`.

#### 13. SizeTier Defined in 3 Places
- `types/maps.ts`
- `utils/MagicEffects.ts`
- `hooks/useMovementController.ts`

**Fix:** Keep one definition in `types.ts`, import everywhere else.

#### 14. StaminaManager Uses Callbacks; Others Use EventBus
AI following the EventBus pattern will produce code that crashes.

**Fix:** Migrate to EventBus pattern with `GameEvent.TOAST`.

#### 15. CLAUDE.md References Dead/Moved Files
- Lists `DialogueBox.tsx` and `AIDialogueBox.tsx` as active (replaced by `UnifiedDialogueBox`)
- Says starting map is `home_interior` (removed)
- Says `TILE_LEGEND` is in `constants.ts` (moved to `data/tiles.ts`)
- Says `SPRITE_METADATA` is in `constants.ts` (moved to `data/spriteMetadata.ts`)

**Fix:** Update CLAUDE.md.

#### 16. showToast is Prop-Drilled Through 4+ Hooks
Every other cross-cutting concern uses EventBus.

**Fix:** Add `GameEvent.TOAST` to EventBus.

### Medium Impact (wastes time)

#### 17. 5-Level NPC Re-export Chain
`forest/morgan.ts` → `forest/index.ts` → `forestNPCs.ts` → `npcs/index.ts` → `npcFactories.ts`

#### 18. NPCManager.ts at Root, Not in utils/
Every other manager is in `utils/`. AI searching `utils/` will miss it.

#### 19. PixiLayerManager.ts is Dead Code
Never imported anywhere but sits in `utils/pixi/`.

#### 20. Three Identical *Ingredient Interfaces
`RecipeIngredient`, `PotionIngredient`, `DecorationIngredient` are structurally identical.

**Fix:** One shared `Ingredient` type.

#### 21. WeatherManager Not a Singleton
Only manager instantiated inside a hook rather than at module level.

---

## File Size Issues (>500 lines)

| File | Lines | Difficulty | Notes |
|------|-------|------------|-------|
| `data/items.ts` | 2,390 | Easy | Pure data with section banners |
| `GameState.ts` | 2,266 | Hard | God object, needs mixin/delegation |
| `utils/actionHandlers.ts` | 2,225 | Medium | Collection of functions |
| `App.tsx` | 2,063 | Hard | Extract overlays/HUD to sub-components |
| `components/DevTools.tsx` | 1,668 | Easy | 8 self-contained sub-components |
| `maps/procedural.ts` | 1,502 | Easy | 3 independent generators |
| `minigames/wreath-making/WreathMakingGame.tsx` | 1,489 | Medium | Monolithic component |
| `data/spriteMetadata.ts` | 1,441 | Easy | Split by category |
| `data/tiles.ts` | 1,368 | Easy | Split by tile category |
| `utils/farmManager.ts` | 1,364 | Medium | Extract Firebase sync |
| `utils/forageHandlers.ts` | 1,339 | Medium | Per-resource handlers |
| `services/dialogueService.ts` | 1,333 | Easy | Persona data is 677 lines |
| `utils/AudioManager.ts` | 1,090 | Medium | Separate concerns |
| `utils/pixi/TileLayer.ts` | 1,029 | Medium | Extract farm/fence renderers |
| `components/HelpBrowser.tsx` | 1,022 | Medium | Settings/docs/cloud panels |
| `NPCManager.ts` | 1,011 | Medium | Movement/proximity/seasonal |
| `hooks/usePixiRenderer.ts` | 966 | Medium | 19 useEffect blocks |
| `components/AIDialogueBox.tsx` | 940 | Dead | Replaced by UnifiedDialogueBox |

---

## Implementation Priority

1. **Quick wins (performance):** Replace `SPRITE_METADATA.find()` with `metadataCache.getMetadata()` (#2)
2. **Quick wins (AI):** Update CLAUDE.md stale references (#15), delete dead code (#19)
3. **High value (performance):** Merge duplicate render effects (#1), move gameLoop deps to refs (#3)
4. **High value (AI):** Consolidate `SizeTier` (#13), add `GameEvent.TOAST` (#14, #16)
5. **Ongoing:** Split files over 1,000 lines starting with easy ones
