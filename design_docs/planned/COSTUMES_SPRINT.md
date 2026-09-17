# Costumes Sprint — the polka-dot dress (and the plumbing for the next ones)

**Status:** Approved by Mark (Option B) — the Girl gets an outfit picker, and the
plumbing is built so every future costume is one directory + one registry entry.
**Source art:** `incoming-art/` — `Female player polka dot dress{, 2}.PNG`,
`Female back polka dot dress{, 2}.PNG`, `Polka dotted dress.PNG` (hanger icon).

**Key discovery:** the dress art is the *existing* Girl (character2) in a different
outfit — same topknot, ears, red eyes and purple shadow as her coat-and-trousers
sprites — not a new character. So this is an outfit dimension on the character
model, not a third character card.

---

## Design

### Data model

- `CharacterCustomization.outfit?: string` — costume id (`'everyday'` = base art).
  Optional everywhere; old saves (which lack it) must not be reset.
- **SSoT registry** `utils/characterOutfits.ts`:

| Export | Purpose |
| --- | --- |
| `DEFAULT_OUTFIT = 'everyday'` | the base art |
| `getOutfits(characterId)` | costumes for the creator UI, in display order |
| `resolveOutfit(characterId, outfit)` | unknown / missing / wrong-character id → `'everyday'` (guards saved *and* remote data) |
| `isValidOutfitId(id)` | closed vocabulary for the wire — pairing with the character is checked by `resolveOutfit` |
| `getSpriteDir(characterId, outfit)` | `'character2/base'` or `'character2/outfits/polka_dress'` |
| `allOutfitIds()` | feeds the rules-in-step test |

Each costume entry: `{ id, label, iconUrl, frameCounts? }` — `frameCounts`
overrides the character's per-direction counts, because a costume may ship fewer
frames than the base art (the dress has 2-frame directions; the coat art has 4-frame
sides).

### Sprite paths

- Base: `/assets-optimized/{characterId}/base/{dir}_{i}.png` (unchanged)
- Costume: `/assets-optimized/{characterId}/outfits/{outfitId}/{dir}_{i}.png`
- `isCustomCharacterSprite()` already matches (`/character\d+/` covers the outfit
  nesting) — `tests/characterSpriteScale.test.ts` gains a costume case to pin it.

### Consumers threaded with the outfit parameter

| File | Change |
| --- | --- |
| `utils/characterSprites.ts` | `getSpriteConfig(characterId, outfit?)`, `generateCharacterSprites` builds the path via `getSpriteDir` |
| `utils/assetPreloader.ts` | `getCharacterSpriteUrls(characterId, outfit?)`; `preloadAllAssets` also preloads every registered costume (4 frames — instant in the creator) |
| `utils/mapTextureSet.ts` | `getCoreTextureUrls(characterId, outfit?)`, `getResidentTextureUrls(..., outfit?)` — the pinned set must be the worn costume |
| `hooks/usePixiRenderer.ts` | reads outfit off the selected character when pinning |
| `utils/portraitSprites.ts` | portrait path via `getSpriteDir` |
| `components/CharacterCreator.tsx` | outfit chips under the cards when the selected character has costumes; card preview follows the selection |
| `scripts/optimize-assets.js` | `optimizeImageDir('character2/outfits/polka_dress', …)` — 1024px showcase, like the base sets |

### Multiplayer (presence)

The wire gains one optional field: `o` (costume id, `null`/absent = everyday).

- `multiplayer/types.ts` — `PresenceWire.o?`, `LocalPresenceState.outfit?`, `RemotePlayer.outfit`
- `multiplayer/wire.ts` — encode publishes only valid non-default ids; decode falls back to `null`
- `multiplayer/publishPolicy.ts` — outfit change = `'state-change'` (bypasses the rate limit, like turning around)
- `multiplayer/RemotePlayerManager.ts` / `remoteSprites.ts` — thread outfit into frame lookup (cache keyed `characterId/outfit`)
- `App.tsx` `getLocalPresence()` — `outfit: character.outfit`
- `database.rules.json` — `"o"` validated against the closed vocabulary; **optional key, so old clients are unaffected, and the rules must be deployed before or with the app release** (an un-deployed ruleset rejects the whole presence write for costume wearers)

Backward compatible both directions: old clients never write `o`; old records decode as `null`.

### The dress itself

`public/assets/character2/outfits/polka_dress/`:

| File | Source |
| --- | --- |
| `down_0.png` / `down_1.png` | front views (eyes open = idle, closed = walk frame — reads as a blink) |
| `up_0.png` / `up_1.png` | the two back views |
| `left_{0,1}.png` / `right_{0,1}.png` | **copies of the down frames** — no side-view art exists yet; the character faces the camera when strafing |
| `icon.png` | the dress on its hanger (creator chip) |

2-frame directions ping-pong (character2's up/down already do). Side art, when it
arrives, is a file swap — zero code.

### Tests

- New `tests/characterOutfits.test.ts`: resolver fallbacks, costume URL building +
  3× scale recognition, frame-count override, wire round-trip (costume survives,
  everyday omits `o`, unknown id degrades), and the **rules ↔ registry** vocabulary
  test (the `emoteVocabulary` pattern — client and `database.rules.json` cannot drift).
- `tests/characterSpriteScale.test.ts`: costume URLs recognised as custom art.

### Deliberately out of scope

- Lava-leap mini-game shows base art for remote riders (it only receives characterIds).
- `walkAnimation.test.ts` keeps its own config copies — the 2-frame ping-pong is
  already covered there.

### Rollout note

`database.rules.json` must be deployed (`firebase deploy --only database`) **before
or with** the app release. The `o` key is optional in the rules, so deploying rules
first is safe; deploying the app first makes presence writes fail for costume
wearers (whole-record rejection under `$other: false`), hiding them from friends.