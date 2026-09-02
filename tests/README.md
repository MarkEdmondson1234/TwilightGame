# Tests

```bash
make verify        # typecheck + all tests — run this before calling any change done
make test          # tests only
npm run test:run   # same, if make is unavailable
```

> ⚠️ **Never run `npm test`.** That is `vitest` with no arguments, which starts **watch mode**
> and never exits — it will hang your session.
>
> An optional guard script exists at `.claude/hooks/guard-test-command.sh` which blocks that
> one command and prints the alternatives. It is **not registered** by default. To enable it,
> add to the `hooks` object in `.claude/settings.json`:
>
> ```json
> "PreToolUse": [
>   { "matcher": "Bash", "hooks": [
>       { "type": "command",
>         "command": "\"$CLAUDE_PROJECT_DIR/.claude/hooks/guard-test-command.sh\"",
>         "timeout": 5 } ] }
> ]
> ```

## The baseline is green

Every test passes on `main`. **Any** failure is a real regression — do not wave one through as
"pre-existing".

This section used to document two permanent failures (`cropGrowth`, `eventChains`). Both turned
out to be bugs in the *tests*, not the game data, and are fixed:

- `cropGrowth.test.ts` judged every crop on a single harvest, which is the wrong model for a
  perennial. Mint (`isHerb: true`) breaks even on harvest one and profits from harvest two
  onwards — healthy, but it scored `profit === 0`. Annuals and perennials are now asserted
  separately.
- `eventChains.test.ts` kept its own copy of the valid chain-type list, which went stale when
  `romance` was added to the loader. It now imports `VALID_EVENT_TYPES` from
  `utils/eventChainLoader.ts` so the list cannot drift again.

The lesson worth keeping: a long-lived "known failure" is worth re-reading before trusting it —
both of these were masking a stale test, and a standing "treat N failed as green" rule will hide
the next real regression too.

To confirm something is genuinely pre-existing, run it against a clean tree:

```bash
git worktree add /tmp/baseline HEAD
ln -s "$PWD/node_modules" /tmp/baseline/node_modules
(cd /tmp/baseline && npx vitest run tests/thing.test.ts)
git worktree remove --force /tmp/baseline
```

## What each file guards

Most of these exist because the failure they catch is **invisible until someone plays the
game** — a mistyped asset path renders as nothing, an unmapped tile renders a wrong-coloured
box, an out-of-bounds transition dumps the player somewhere arbitrary. Nothing throws.

| File | Catches | You'll hit this when |
|---|---|---|
| `assetIntegrity.test.ts` | Asset paths that don't resolve to a real file, including case mismatches | Adding any sprite, icon, or audio file |
| `itemSSoT.test.ts` | Recipes/shops referencing items that don't exist; duplicate items | Adding an item, recipe, or shop entry |
| `tileRegistration.test.ts` | Tiles missing from `TILE_LEGEND` or `TILE_TYPE_TO_COLOR_KEY`; unrecognised grid codes | Adding a tile type or editing a map grid |
| `mapValidation.test.ts` | Out-of-bounds spawn points, NPCs, and transition targets | Adding or editing a map |
| `spriteMetadata.test.ts` | Square artwork declared with non-square tile dimensions (visible stretching) | Adding a multi-tile sprite |
| `minigameRegistry.test.ts` | Duplicate ids, missing fields, trigger items **or NPCs** that don't exist | Adding a mini-game |
| `minigameRequirements.test.ts` | Required items not actually gating play; a game being unreachable | Adding a mini-game with requirements |
| `interactionProviders.test.ts` | Provider registry wiring and the `exclusive` short-circuit | Adding a click interaction |
| `wreathWorkshop.test.ts` | Capture geometry, pointer maths under `transform: scale()`, decoration instance matching | Touching the wreath workshop or custom decorations |
| `pixiMaskSafety.test.ts` | Raw `.mask =` assignment outside `maskUtils` (guards the "this.mask is null" crash) | Adding/using a PixiJS mask (fog, lighting, spotlights) |
| `colorResolver.test.ts` | Colour resolution behaviour through map schemes | Touching tile colours or palettes |
| `palette.test.ts` | Palette definitions stay consistent | Changing the colour palette |
| `farmManager.test.ts` / `cropGrowth.test.ts` | Planting, watering, growth stages, crop economics | Touching farming |
| `walkAnimation.test.ts` | Frame sequencing and direction handling | Touching player movement or sprites |
| `deterministicWeather.test.ts` | Weather is reproducible from its seed | Touching weather |
| `globalEvents.test.ts` / `eventChains.test.ts` | Event and quest chain definitions load and validate | Adding events or quest chains |
| `combat.test.ts` | Combat resolution | Touching the combat mini-game |
| `mapUtils.test.ts` | Tile coordinate helpers | Touching coordinate maths |
| `firebasePaths.test.ts` | Firestore path construction | Touching cloud saves |
| `anthropicClient.test.ts` | AI dialogue client behaviour | Touching AI dialogue |
| `emoteVocabulary.test.ts` | **Safety-critical.** `multiplayer/emotes.ts` and `database.rules.json` listing different emotes — a hole in the closed vocabulary that is the whole reason player-to-player chat is safe | Adding or renaming an emote |
| `presenceProtocol.test.ts` | Wire encode/decode, publish throttling, staleness eviction, remote-player interpolation lifecycle | Touching presence, the wire format, or RemotePlayerManager |
| `remotePlayerInterpolation.test.ts` | The lerp/snap/hold maths that makes other players glide instead of teleport | Touching `multiplayer/interpolation.ts` |
| `multiplayerSafeStubs.test.ts` | A method on the real presence service missing from the `firebase/safe` stub — crashes **only** in a build without the `firebase` package | Adding a method to any Firebase service |
| `determinism.test.ts` | `Math.random()` creeping back into NPC wander or fairy spawning, which silently desyncs what two players see | Touching NPC movement, fairies, or `utils/seededRandom.ts` |
| `sharedFarmHarvestClaim.test.ts` | Two players both harvesting one ripe crop; and the opposite error — confiscating a crop on a network blip | Touching harvesting or the shared farm |
| `multiplayerUI.test.tsx` | Render-time crashes in the emote wheel / presence indicator, which the headless probe does not reach (it does not click past the splash screen) | Touching multiplayer UI |
| `mapTextureBudget.test.ts` | A texture reference that 404s (renders as *nothing*, with no error), a filename whose case only matches on macOS, or a map whose resident textures exceed what a phone can hold — which kills the tab with no catchable error | Adding a map, NPC, or tile; changing `scripts/optimize-assets.js` |
| `textureManager.test.ts` | Unbounded texture fan-out at startup (mobile WebKit answers that by terminating requests as `TypeError: Load failed`), a render-loop miss retrying forever, or eviction destroying a texture still in use | Touching `utils/TextureManager.ts` or the loading policy |
| `characterSpriteScale.test.ts` | The player rendering at a third of its size. Custom art scales 3x and placeholders 1x, chosen by pattern-matching the sprite URL — move the artwork and the match breaks silently, with nothing thrown and no 404 | Moving character art, or touching `isCustomCharacterSprite()` |
| `backgroundRoomLayout.test.ts` | An interior that doesn't fill the window (a band of background colour down one side, at some window sizes but not others), or one whose artwork stops following the player so they walk off the edge of the screen | Touching interior scaling/panning, or a map's centred image layer `width`/`height`/`scale` |

## Writing a new test

Follow `itemSSoT.test.ts`. The house style is:

1. **Collect every violation, then assert once.** Failing on the first one hides the other nine.
2. **The failure message must say how to fix it** — name the file, the key, and the change.
   An agent reading only the assertion output should be able to act without opening the test.
3. **Header comment explaining what breaks** if the test fails, so the stakes are obvious.
4. `/** @vitest-environment node */` for anything that doesn't need a DOM.

```typescript
const violations: string[] = [];
for (const [id, thing] of Object.entries(THINGS)) {
  if (!isValid(thing)) violations.push(`"${id}": <what's wrong>. FIX: <exact change>`);
}
if (violations.length > 0) console.error('...\n' + violations.join('\n'));
expect(violations).toEqual([]);
```

### Known-exception lists

Two tests carry a small, documented allowlist (`KNOWN_ASPECT_EXCEPTIONS`,
`KNOWN_UNKNOWN_GRID_CHARS`). These record real pre-existing debt that
needs a **product or art decision**, not a code fix, so the suite stays meaningfully green.

**Do not add to them to silence your own change.** Each entry explains why it is there and
what would remove it, and `spriteMetadata.test.ts` actively fails if a listed sprite is later
corrected but left on the list — so the lists cannot quietly rot.
