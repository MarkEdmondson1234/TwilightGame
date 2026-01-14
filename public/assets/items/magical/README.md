# Magical Ingredients Asset Folder

This folder contains sprites for magical ingredients used in potion brewing.

## Folder Structure

```
public/assets/items/magical/
├── README.md (this file)
├── forageable/          # Ingredients found in the wild
├── shop/                # Ingredients purchasable from witch's shop
└── quest/               # Quest rewards and gift ingredients
```

## Sprite Guidelines

**File Format:** PNG with transparency
**Recommended Size:** 1024×1024px (will be optimized automatically)
**Style:** Magical/ethereal quality with glowing effects where appropriate
**Naming Convention:** `snake_case.png` matching the item ID (e.g., `moonpetal.png`)

## Asset List

### Forageable Ingredients (13 items)
Store in: `forageable/`

| Filename | Display Name | Visual Description |
|----------|--------------|-------------------|
| `moonpetal.png` | Moonpetal | Luminous flower, pale silver shimmer |
| `addersmeat.png` | Addersmeat | Night-blooming flower, star-like twinkle |
| `dragonfly_wings.png` | Dragonfly Wings | Delicate iridescent wings, ethereal light |
| `frost_crystal.png` | Frost Crystal | Crystalline formation, icy blue glow |
| `sakura_petal.png` | Sakura Petal | Perfect cherry blossom petal, soft pink |
| `dawn_dew.png` | Dawn Dew | Droplets with faint golden glow |
| `morning_dew.png` | Morning Dew | Fresh droplets on grass/leaves |
| `shadow_essence.png` | Shadow Essence | Wispy darkness, light-absorbing effect |
| `luminescent_toadstool.png` | Luminescent Toadstool | Glowing mushroom, soft eerie light |
| `ghost_lichen.png` | Ghost Lichen | Pale lichen, faint darkness glow |
| `mushroom.png` | Forest Mushroom | Common forest mushroom |
| `shrinking_violet.png` | Shrinking Violet | Tiny purple flower |
| `giant_mushroom_cap.png` | Giant Mushroom Cap | Large mushroom slice, pulsing glow |

### Shop Ingredients (7 items)
Store in: `shop/`

| Filename | Display Name | Visual Description |
|----------|--------------|-------------------|
| `eye_of_newt.png` | Eye of Newt | Actually a herb (classic potion ingredient) |
| `wolfsbane.png` | Wolfsbane | Purple-hooded flower, toxic looking |
| `phoenix_ash.png` | Phoenix Ash | Glittering ash, warm orange/gold glow |
| `temporal_dust.png` | Temporal Dust | Shimmering dust, slightly blurred/ethereal |
| `feather.png` | Feather | Soft bird feather (communication magic) |
| `vinegar.png` | Vinegar | Bottle/vial of sharp vinegar |
| `mint.png` | Fresh Mint | Fragrant mint leaves, cooling effect |

### Quest Rewards (2 items)
Store in: `quest/`

| Filename | Display Name | Visual Description |
|----------|--------------|-------------------|
| `hearthstone.png` | Hearthstone | Warm glowing stone, heart-shaped |
| `golden_apple.png` | Golden Apple | Shimmering golden apple, fairy magic |

## Visual Themes by Rarity

- **Common** (40% drop): Subtle effects, natural colors
- **Uncommon** (30% drop): Moderate glow/shimmer
- **Rare** (20% drop): Strong magical effects, vibrant
- **Very Rare** (10% drop): Spectacular effects, multiple colors

## Color Palette Suggestions

- **Moonpetal/Dawn Dew**: Silver, pale gold
- **Shadow Essence**: Deep purple-black, void-like
- **Frost Crystal**: Icy blue, white sparkles
- **Phoenix Ash**: Warm orange, gold embers
- **Temporal Dust**: Multi-hued shimmer (reality distortion)
- **Luminescent Toadstool**: Soft green/blue bioluminescence
- **Sakura Petal**: Delicate pink with subtle shine

## Integration Notes

Once sprites are created:
1. Place PNG files in the appropriate subfolder
2. Run `npm run optimize-assets` to create optimized versions
3. Update `assets.ts` to register the new magical ingredient assets
4. The optimization script will automatically handle sizing and compression

## Asset Registration Example

```typescript
// In assets.ts - add new section for magical ingredients
export const magicalAssets = {
  // Forageable
  moonpetal: '/TwilightGame/assets-optimized/items/magical/forageable/moonpetal.png',
  addersmeat: '/TwilightGame/assets-optimized/items/magical/forageable/addersmeat.png',
  // ... etc

  // Shop
  eye_of_newt: '/TwilightGame/assets-optimized/items/magical/shop/eye_of_newt.png',
  // ... etc

  // Quest
  hearthstone: '/TwilightGame/assets-optimized/items/magical/quest/hearthstone.png',
  golden_apple: '/TwilightGame/assets-optimized/items/magical/quest/golden_apple.png',
};
```

Then link these to the item definitions in `data/items.ts`:
```typescript
import { magicalAssets } from '../assets';

// In ITEMS object:
moonpetal: {
  // ... existing properties
  image: magicalAssets.moonpetal,
},
```
