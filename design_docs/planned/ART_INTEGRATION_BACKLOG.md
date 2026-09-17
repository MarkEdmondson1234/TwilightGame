# Art Integration Backlog & Remaining Work

**Status:** Living document — the outstanding work from the hand-drawn art integration
sprint (September 2026) and the known polish items it surfaced.
**Context:** Six PRs shipped back-to-back: the hand-drawn D-pad ([#126](https://github.com/MarkEdmondson1234/TwilightGame/pull/126)),
Eugene the owl ([#127](https://github.com/MarkEdmondson1234/pull/127)), the greenhouse
([#128](https://github.com/MarkEdmondson1234/pull/128)), the lost kitten NPC
([#129](https://github.com/MarkEdmondson1234/pull/129)), the kitten's post-quest roaming
([#130](https://github.com/MarkEdmondson1234/pull/130)) and the greenhouse floor season fix
([#131](https://github.com/MarkEdmondson1234/pull/131)). NPC Gardens and the art-session
asset commits landed alongside (separate agent).

---

## 1. Art waiting for integration (`incoming-art/`)

The staging folder is **not** committed to the repo. Each item below lists what it is and
what integration would involve. When integrating, follow the relevant skill
(`add-npc-sprite`, `add-character-sprite`, `add-tile-sprite`, `add-inventory-sprite`) and
the PR + art-review workflow in §4.

| Artwork | What it is | Likely destination | Notes |
| --- | --- | --- | --- |
| `magnolia-mango-concepts.png` | Princess Magnolia & Knight Mango character sheet — knight in armour on horse, princess in gown, chibi shouting sketch | **Deliberately deferred** by Mark — decide later whether they become NPCs, character-creator options, or cutscene characters | Highest-effort item: character sprites, possibly a horse sprite. Do not start without a decision on scope. |
| `Polka dotted dress.PNG` + `Female player polka dot dress{, 2}.PNG` + `Female back polka dot dress{, 2}.PNG` (5 files) | ~~Player character outfit~~ **Integrated** — the art is the existing Girl (character2) in a different outfit (same topknot, ears, eyes and shadow), so it shipped as the game's first **costume**: an outfit picker in `CharacterCreator`, plumbed through sprites, preload, texture pinning, portraits and multiplayer presence. See `COSTUMES_SPRINT.md` and `utils/characterOutfits.ts`. | ~~Character sprite wardrobe~~ Done — `public/assets/character2/outfits/polka_dress/`, registry entry in `utils/characterOutfits.ts` | **Remaining gap:** the set has no side-view art — left/right frames are copies of the front frames (the character faces the camera when strafing). Side art, when drawn, drops into the same directory with zero code changes. Frame mapping: eyes-open front = idle, eyes-closed front = walk frame (reads as a blink), two back views = the up walk cycle. The hanger art lives on as `icon.png`, the creator chip's picture. |
| `Mushra.png` | Refreshed Mushra artwork (the mushroom villager) | Replace or supplement `public/assets/npcs/` Mushra sprites | Compare against the current mushroom NPC art first — the wreath workshop dialogue may also deserve a pass if her look changed materially. |
| `It's just nice.PNG` | Hand-drawn floral wreath with mushroom-house and toadstool motifs | The **wreath workshop** quest (`data/questHandlers/mushraWreathHandler.ts`, `WREATH_ITEM_IDS`) — as a crafted decoration sprite or quest-completion art | Square, clean transparency — would also work as a UI frame. Confirm intent before integrating. |
| `Untitled - 2 September 2026 …{, copy}.png` (2 files) | Elf character (dark-haired, purple gown, jewellery) — two near-identical frames, likely a blink/two-frame set | Needs identification — possibly a redraw of the elf child seen in the photo library, or a new NPC | Ask Mark who this is before wiring; could be a second frame for an existing NPC or a new villager. |
| `Eugene.png` (single frame) | Standalone Eugene frame, unused by the day/night set | Determine intent — portrait variant, or a spare frame | Eugene ships with the four day/night frames already; this one is surplus unless it is a better portrait (`eugene_portrait` currently points at `eugene_awake_1`). |
| `greenhouse_exterior.PNG`, `Kitten.png`, `Eugene at {day,night}{, 2}.png`, `arrow-emote-*.png`, `dpad-*.png` | **Integrated already** — kept in the folder as originals | — | Safe to archive/delete once the backlog is triaged; the repo holds its own copies under `public/assets/`. |

## 2. Placeholders that want proper art or code

- **Greenhouse interior** — currently a tiled placeholder room (sky-blue window band,
  flat `GRASS_PLAIN` floor, soil beds), the same approach as `house1`'s `empty_room.png`
  placeholder. A drawn interior (1920×1080, `background-image` room with invisible
  walkmesh — see `maps/definitions/cottageInterior.ts`) can replace it; the walkmesh
  grid and transitions would need to match the drawn furniture.
- **Princess Magnolia / Knight Mango** — see table above; parked on purpose.

## 3. Known polish items (small, code-level)

- **Side-view art for the polka-dot dress.** The costume shipped with front and
  back views only; its left/right frames are copies of the front frames, so the
  Girl faces the camera while strafing. Drawing `left_{0,1}.png`/`right_{0,1}.png`
  profiles and dropping them into `public/assets/character2/outfits/polka_dress/`
  (then `npm run optimize-assets`) replaces the copies with no code change.
- **Kitten's daily spot updates only at game load.** `getDailyKittenSpot()` is drawn when
  the map definition is built; a session that crosses an in-game day keeps yesterday's
  spot until the next load. Fix shape: a day-change hook (compare
  `TimeManager.getCurrentTime().totalDays` in the game loop, mirroring
  `NPCManager.checkSeasonChange()`) that repositions the kitten and emits
  `NPC_MOVED`. Low priority — sessions crossing a 2-hour game day are common, but the
  kitten is always somewhere sensible either way.
- **`ART_REVIEW_TOKEN` secret is not set**, so art-review comments link the contact
  sheets as workflow artifacts instead of showing them inline. A classic personal
  access token (Actions `GITHUB_TOKEN` is rejected for attachment uploads) pasted into
  repo secrets fixes it for all future PRs.
- **`incoming-art/` housekeeping.** The staging folder is untracked but not gitignored —
  an over-eager `git add -A` would commit it. Either add it to `.gitignore` or treat
  that as the standing reminder to empty it.
- **Optimised-but-untracked icons** (`public/assets-optimized/icons/ui/d-pad*.png`,
  `mushroom*.png`) are generated by the optimiser but referenced by nothing — they are
  deliberately left untracked, same as the mushroom-emote sources. Do not commit them
  by accident with a directory-wide `git add`.

## 4. How to integrate a piece (the standing checklist)

1. **Copy** the art into its home (`public/assets/npcs/`, `tiles/`, …) with a real
   name — originals live under `public/assets/`, code references
   `/assets-optimized/...` after `npm run optimize-assets`.
2. **Check the optimiser keyword rules** (`scripts/optimize-assets.js`) — size and
   quality are keyed on filename keywords; buildings are 1024px @ 98% quality, small
   creatures can justify a custom 512px rule (see Eugene).
3. **Register the asset** in `assets.ts` (`npcAssets` / `tileAssets`) — PNGs point at
   `/assets-optimized/`, SVGs at `/assets/`.
4. **Touch all four tile registries** for new tiles: `TILE_LEGEND` (`data/tiles.ts`),
   `GRID_CODES` (`maps/gridParser.ts`), `SPRITE_METADATA` (`data/spriteMetadata.ts`),
   `TILE_TYPE_TO_COLOR_KEY` (`utils/ColorResolver.ts`) — `tests/tileRegistration.test.ts`
   fails loudly if you miss one. Append new `TileType` values at the enum's end.
5. **Factory + barrels** for NPCs (`utils/npcs/<area>/<npc>.ts`, three barrel files),
   following `sparrow.ts` / `eugene.ts` for animated NPCs.
6. **`make verify` + `npm run lint`** — the suite walks every registered path
   (`assetIntegrity`), every map's texture set (`mapTextureBudget`, `mapValidation`)
   and the tile registries (`tileRegistration`).
7. **PR** → CI runs verify/performance/art-review. Art-review posts before/after
   contact sheets on PRs touching `public/assets**` (inline images need the
   `ART_REVIEW_TOKEN` secret — see §3). Merge order matters only when PRs share
   registry files; a one-line conflict in `assets.ts` resolves by keeping both blocks.

## 5. What is deliberately *not* on this list

- **Performance tracing / session replay in Sentry** — decided against for now
  (see CLAUDE.md "Deliberately not enabled").
- **Free-text chat moderation** — the shared world is accounts-only and the emote
  vocabulary closed by design; revisit only if the player group widens (CLAUDE.md,
  Multiplayer rule 2).
- Larger renderer ambitions (particle systems, lighting, post-processing) live in
  `design_docs/planned/PIXI_MIGRATION.md` and are not near-term work.