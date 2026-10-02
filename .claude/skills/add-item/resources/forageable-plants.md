# Forageable plants

Detail for §3d of `SKILL.md`. A forageable plant is **two things**: a multi-tile map tile
(drawn from one anchor tile, typically 3×3) and the item it yields. Do the common core for
the item; the tile half overlaps the `add-tile-sprite` skill. Worked example below:
the luminescent toadstool, which exists — read its entries alongside these steps.

## Ask first

Name; where the tile sprite and the inventory sprite are; sprite size in tiles (artwork is
assumed square); season / time-of-day / weather limits; rarity; sell price; success rate.

## Steps

**1. Art and optimisation.** Tile art under `public/assets/tiles/…` (a sub-folder per
plant or map is fine — the toadstool is `tiles/mushroomMap/luminecent_toadstool.png`);
item art in `public/assets/items/magical/forageable/`. Run `npm run optimize-assets`
first so the optimised paths exist. Tiles are sized by filename keyword (`tree_`, flower
names, furniture…; default 256px) in `optimizeTiles()` in `scripts/optimize-assets.js` —
add a keyword there if a large plant comes out blurry.

**2. `TileType`** — `types/core.ts`, SCREAMING_SNAKE_CASE:
```typescript
LUMINESCENT_TOADSTOOL, // Glowing cyan toadstools (3x3, mushroom forest only)
```

**3. Grid code** — `GRID_CODES` in `maps/gridParser.ts`; pick an unused character:
```typescript
'7': TileType.LUMINESCENT_TOADSTOOL,
```
Place **one** anchor per plant on the map; the sprite spreads from it.

**4. Assets** — `assets.ts`: tile art in `tileAssets`, item art in `magicalAssets`, both
`/TwilightGame/assets-optimized/…`.

**5. `TILE_LEGEND`** — `data/tiles.ts`:
```typescript
[TileType.LUMINESCENT_TOADSTOOL]: {
  name: 'Luminescent Toadstool',
  color: 'bg-palette-sage',
  collisionType: CollisionType.WALKABLE,
  baseType: TileType.GRASS,              // grass drawn underneath
  image: [tileAssets.luminescent_toadstool], // an ARRAY, not a bare string
},
```
Seasonal plants use `seasonalImages: { spring, summer, autumn, winter, default }` — an
empty `winter: []` means dormant and invisible. Plants that open at night use
`timeOfDayImages` per season with `day` / `night` arrays (see `MOONPETAL`). Types are in
`types/tiles.ts`.

**6. `SPRITE_METADATA`** — `data/spriteMetadata.ts`:
```typescript
{
  tileType: TileType.LUMINESCENT_TOADSTOOL,
  spriteWidth: 3, spriteHeight: 3,   // square art → square box
  offsetX: -1, offsetY: -2,          // centred on the anchor, rising upwards
  image: tileAssets.luminescent_toadstool,
  collisionWidth: 0, collisionHeight: 0, collisionOffsetX: 0, collisionOffsetY: 0,
  enableFlip: true, enableRotation: false, enableScale: true, enableBrightness: false,
  scaleRange: { min: 0.9, max: 1.1 },
},
```

**7. Background colour** — `TILE_TYPE_TO_COLOR_KEY` in `utils/ColorResolver.ts`:
`[TileType.LUMINESCENT_TOADSTOOL]: 'grass',`. Without it the plant sits in a
wrong-coloured box.

**8. The item** — `data/items/magicalIngredients.ts` (seasonal decorative finds such as
`maple_leaf` live in `decorations.ts`):
```typescript
luminescent_toadstool: {
  id: 'luminescent_toadstool',
  name: 'luminescent_toadstool',
  displayName: 'Luminescent Toadstool',
  category: ItemCategory.MAGICAL_INGREDIENT,
  description: 'A cluster of softly glowing cyan mushrooms…',
  rarity: ItemRarity.UNCOMMON,
  stackable: true,
  sellPrice: 35,
  image: magicalAssets.luminescent_toadstool,
  forageSuccessRate: 0.75,
},
```

**9. Offer "Forage" on click** — `utils/interactions/providers/forage.ts`. Add the tile
type to the multi-tile `hasTileTypeNearby(tileX, tileY, [ … ], 1)` list. **This is the #1
miss: without it the option never appears.** Radius 1 covers a 3×3 sprite with a centred
anchor; larger sprites need a bigger radius. Read `utils/interactions/README.md` first;
`utils/actionHandlers.ts` needs no change.

**10. Describe the harvest** — add a `ForageSource` (`utils/forage/types.ts`) to
`FORAGE_SOURCES` in `utils/forage/sources.ts`. `handleForageAction()`
(`utils/forageHandlers.ts`) walks the array top to bottom and the first source whose anchor
is near the player wins (so order matters when two plants are close);
`utils/forage/anchorForage.ts` runs gates, the success roll (`item.forageSuccessRate`,
else `fallbackSuccessRate`), quantity, inventory save and cooldown.

```typescript
{
  label: 'glowcap',                      // unique; used in logs and the test below
  tileTypes: [TileType.GLOWCAP],
  itemId: 'glowcap',
  fallbackSuccessRate: 0.5,
  gates: [
    seasonGate([Season.SPRING, Season.SUMMER], 'The glowcaps are dormant.'),
    // nightGate('They only open at night.'),
    // weatherGate('snow', 'It only blooms in the snow.'),
  ],
  cooldownMessage: "You've already gathered from this patch today.",
  failureMessage: 'You search carefully, but find nothing ready to pick.',
  // optional: rollQuantity, successMessage, findAnchor
},
```

Gate helpers live in `utils/forage/helpers.ts` (`seasonGate` — also accepts
`(season) => message` — `nightGate`, `weatherGate`, `dragonfliesGate`); the first gate that
blocks wins. Quantity rolls there too (`rollForageQuantity` is the default,
`rollPairQuantity`, `rollMoonpetalQuantity`).

**Cooldown (once a day per plant):** give a new source a `cooldownMessage` — it checks
against the anchor, so the whole sprite shares one cooldown — and add its `label` to the
expected set in `tests/forageSources.test.ts` ("declares cooldownMessage exactly for the
sources that self-check cooldown"). Do **not** add new tiles to `EARLY_COOLDOWN_TILES` in
`utils/forageHandlers.ts`; that scan exists only for older sources.

Not an anchor tile? Stream and sparrow finds live in `utils/forage/specialForage.ts`, bush
harvests in `utils/forage/bushHarvest.ts`, the forest-floor fallback (wild seeds,
`FORAGEABLE_TILES`) in `utils/forage/wildTiles.ts`.

**11. Place it.** In a designed map's grid (`maps/definitions/…`) use the grid code.
In procedural maps (`maps/procedural.ts`) spawn it with the generator's seeded `rng()` —
**never `Math.random()`**: procedural maps are shared between players and must be pure
functions of `(seed, depth)`.

**12. Verify** — `make verify`, then in game: click anywhere on the sprite → "Forage";
check the gates (season/time), the inventory icon, and that a second try the same day hits
the cooldown. If a tile change does not show, `make reload` and hard-refresh.

## Tests

| Test                                   | Catches                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| `tests/tileRegistration.test.ts`       | tile missing from `TILE_LEGEND` / `TILE_TYPE_TO_COLOR_KEY`; unknown grid codes |
| `tests/colorResolver.test.ts`          | colour resolution through map schemes                                |
| `tests/spriteMetadata.test.ts`         | missing art, square art declared non-square, oversized collision     |
| `tests/forageSources.test.ts`          | unknown item / tile in a source, duplicate label, cooldown set drift |
| `tests/forageCooldown.test.ts`         | the once-a-day cooldown                                              |
| `tests/interactionProviders.test.ts`   | provider registry wiring                                             |
| `tests/proceduralDeterminism.test.ts`  | `Math.random()` in `maps/procedural.ts`                              |
| `tests/itemSSoT.test.ts`, `tests/assetIntegrity.test.ts` | the item half (see `SKILL.md`)       |

## Troubleshooting

| Symptom                                 | Fix                                                                 |
| --------------------------------------- | ------------------------------------------------------------------- |
| No "Forage" in the menu                 | step 9 — add the tile to the provider list                           |
| "Forage" shows but never finds / wrong item | step 10 — no source, or an earlier source near it claims the forage |
| Coloured box behind the plant           | step 7                                                               |
| `Type 'string' is not assignable to 'string[]'` | `TILE_LEGEND` `image` must be an array                       |
| Plant stretched                         | `spriteWidth`/`spriteHeight` must match the art's aspect ratio       |
