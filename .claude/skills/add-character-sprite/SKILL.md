---
name: Add Character Sprite
description: Add player character sprites or costumes to the game — per-character frame sets, frame counts, and the costume (outfit) system
---

# Add Character Sprite

This skill helps you add player character artwork to the TwilightGame project: a new
playable character's frame set, replacement frames, or a wearable costume.

## How the system works (read first)

The player is a **complete hand-drawn character per direction frame** — not a layered
composite. What renders is decided by `characterId` (chosen in `components/CharacterCreator.tsx`):

- **Frames:** `public/assets/characterN/base/{up,down,left,right}_{frame}.png`.
  Frame `_0` is idle; `_1+` is the walk cycle, which **ping-pongs** (0 → 1 → 2 → 3 → 2 → 1 → 0).
- **Frame counts are data, not convention:** `CHARACTER_SPRITE_CONFIGS` in
  `utils/characterSprites.ts` declares how many frames each direction has per character.
  A character with 2-frame directions is fine (character2's up/down).
- **No assets.ts registration.** Sprite URLs are built in code (`utils/characterSprites.ts`
  and `utils/assetPreloader.ts` — these must stay in step) and pinned per map via
  `utils/mapTextureSet.ts`.
- **Scale:** custom artwork renders at 3× (`isCustomCharacterSprite()` matches
  `/character\d+/` in the URL). `tests/characterSpriteScale.test.ts` fails if a path
  change breaks the match — a broken match silently renders the player a third of
  its intended size, with nothing throwing.
- **Costumes:** full alternative sprite sets under
  `public/assets/characterN/outfits/<outfitId>/`, registered in
  `utils/characterOutfits.ts`, unlocked by buying a clothing item
  (`data/items/clothing.ts`) and worn from the bag. `COSTUMES_SPRINT.md` is the
  design doc; the polka-dot dress (`character2/outfits/polka_dress/`) is the
  worked example.

## Rendering Architecture

TwilightGame renders with **PixiJS WebGL** (see CLAUDE.md). Asset registration and
frame counts are all you touch; `PlayerSprite.ts` handles rendering, and textures
arrive via `TextureManager` (linear scaling, mipmaps — this game is NOT pixel art).

## Requirements

- PNG with transparent background, identical dimensions across a character's set
- Frame 0 = idle pose for each direction present
- Draw large (current sources are 2064×2064); the optimiser normalises every frame to
  1024×1024 at showcase quality via `npm run optimize-assets` (the
  `optimizeImageDir('characterN/base', …)` rules in `scripts/optimize-assets.js`)
- Character sprites are GPU-pinned textures (`width × height × 4` bytes each) — never
  load more of them than the selected character and the worn costume need

## Adding a new playable character

1. Create `public/assets/characterN/base/` with your frames (transparent PNGs, all
   the same size). If a direction has no art yet, copy the front frames — see the
   dress's side-view note in `design_docs/planned/ART_INTEGRATION_BACKLOG.md`.
2. Add an entry to `CHARACTER_SPRITE_CONFIGS` in `utils/characterSprites.ts` with the
   real per-direction frame counts.
3. Add the character card in `components/CharacterCreator.tsx` (`CHARACTER_OPTIONS`).
4. **Multiplayer:** add the id to `VALID_CHARACTER_IDS` in `multiplayer/wire.ts` AND the
   `c` validation in `database.rules.json` — the two closed vocabularies must stay in step.
5. Add the id to `preloadAllAssets()` in `utils/assetPreloader.ts`.
6. Add an `optimizeImageDir('characterN/base', …)` rule to `scripts/optimize-assets.js`, run it.
7. `make verify` — `tests/characterSpriteScale.test.ts` walks every generated URL through
   the 3× detector; extend it if you added a new character id.

## Adding a costume to an existing character

1. Draw frames into `public/assets/characterN/outfits/<outfitId>/` (+ the item icon
   under `public/assets/items/clothing/`).
2. Register one entry in `OUTFITS` in `utils/characterOutfits.ts` (label, icon URL,
   per-direction `frameCounts` override).
3. Add the clothing item (`data/items/clothing.ts`) with `outfitId` pointing at the
   costume, and a stock entry in `data/shopInventory.ts` — buying it is what unlocks
   the outfit.
4. Add the outfit id to the `o` validation in `database.rules.json` —
   `tests/characterOutfits.test.ts` and `tests/clothingActions.test.ts` fail if the
   client/rules vocabulary or the item↔outfit pairing drifts.
5. `npm run optimize-assets`, then `make verify`.

## Verification

1. `make verify` (typecheck + full suite; never `npm test` — it is watch mode).
2. Test in-game with `npm run dev`: walk in all four directions, open the creator
   (mirror), try a costume, check the dialogue portrait.
3. If the player renders at the wrong size, start at `isCustomCharacterSprite()` —
   the failure mode is silent (see `tests/characterSpriteScale.test.ts`).

## Related Documentation

- `docs/ASSETS.md` — asset guidelines (player sprites section mirrors this file)
- `utils/characterOutfits.ts` — the costume registry (SSoT)
- `design_docs/planned/COSTUMES_SPRINT.md` — costume system design
- `utils/characterSprites.ts` — sprite URL building and frame configs
- `tests/characterSpriteScale.test.ts` — the 3× scale guard