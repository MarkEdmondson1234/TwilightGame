---
name: Replace Emoji
description: Replace emoji characters with hand-drawn PNG icons. Use when user uploads a new icon, wants to map an emoji to a hand-drawn image, or says replace emoji.
---

# Replace Emoji with Hand-Drawn Icon

Replace game emoji/emoticons with hand-drawn PNG icons for visual consistency with the game's art style.

## Quick Start

**Most common usage:** User uploads a PNG icon and wants it to replace an emoji.

```
User: "I've uploaded a door icon, please map it to the door emoji"
→ Find door.png in public/assets/icons/
→ Register in iconAssets.ts
→ Map 🚪 → door in utils/iconMap.ts
→ Run optimize-assets
→ Verify TypeScript
```

## When to Use This Skill

- User says "replace emoji", "map emoji", or "add icon"
- User uploads a new hand-drawn PNG to `public/assets/icons/`
- User wants to swap an emoji for a hand-drawn image
- User asks which emojis still need replacement

## Workflow

### Step 1: Identify the Emoji and PNG

**Determine:**
- Which emoji character to replace (e.g., `🚪`)
- The PNG filename (e.g., `door.png`)
- Which category subfolder it belongs in

**Icon categories** (`public/assets/icons/<category>/`):
| Category | Contents |
|----------|----------|
| `actions/` | pick up, eat, taste, till, plant, water, harvest, clear, forage, gift, brew, cook |
| `navigation/` | door, cottage, kitchen, farm, garden, forest, cave, mine, village, stairs |
| `status/` | success, warning, error, info, lock, unlock, sparkle |
| `cooking/` | all-recipes, basics, savoury, desserts, baking, tutorial, stars |
| `ui/` | arrows, expand, collapse, play, close |
| `misc/` | heart, speech-bubble, mirror, milk, water-drop, feather, eagle, magnify |

### Step 2: Verify PNG Exists

Check the PNG is in the correct subfolder:

```bash
ls public/assets/icons/<category>/<name>.png
```

**Image specs:** PNG, ideally 256x256 or larger, transparent background, hand-drawn style.

If the file is missing, tell the user where to upload it:
> Upload your icon to `public/assets/icons/<category>/<name>.png`

### Step 3: Register in iconAssets.ts

Add the icon to the `iconAssets` object in `iconAssets.ts` (project root):

```typescript
export const iconAssets = {
  // existing entries...
  door: '/TwilightGame/assets-optimized/icons/navigation/door.png',  // NEW
};
```

**Naming:** Use snake_case key matching the filename (without extension).
**Path pattern:** `/TwilightGame/assets-optimized/icons/<category>/<name>.png`

### Step 4: Map Emoji in utils/iconMap.ts

Add the emoji-to-icon mapping to `EMOJI_TO_ICON` in `utils/iconMap.ts`:

```typescript
const EMOJI_TO_ICON: Record<string, string> = {
  // existing mappings...
  '🚪': iconAssets.door,  // NEW
};
```

**Important:** Use the exact emoji character. Some emojis have invisible variation selectors. Copy from the source code where they're used (e.g., `utils/actionHandlers.ts` or `utils/transitionIcons.ts`).

### Step 5: Run Asset Optimiser

```bash
npm run optimize-assets
```

Verify the icon appears in output:
```
🎯 Optimizing hand-drawn icons...
  ✅ navigation/door.png: XXkb → XXkb (saved XX%)
```

### Step 6: Verify TypeScript

```bash
npx tsc --noEmit
```

Must pass with zero errors.

### Step 7: Test in Game

The icon will automatically appear wherever that emoji was used in:
- **RadialMenu** — already uses `<GameIcon>` component
- Other components will get the icon once they're migrated to use `<GameIcon>`

## Key Files

| File | Purpose |
|------|---------|
| `public/assets/icons/<category>/` | Source PNG files (upload here) |
| `iconAssets.ts` | Asset path registry |
| `utils/iconMap.ts` | Emoji-to-PNG mapping |
| `components/GameIcon.tsx` | Renders image or emoji fallback |
| `components/RadialMenu.tsx` | First component using GameIcon |
| `scripts/optimize-assets.js` | Optimises icons to 256x256 |

## Finding Which Emojis Are Used Where

**Main emoji sources:**
- `utils/actionHandlers.ts` — Radial menu interaction icons
- `utils/transitionIcons.ts` — Map transition icons
- `components/Toast.tsx` — Notification icons
- `components/TouchControls.tsx` — Touch button labels
- `components/CookingInterface.tsx` — Cooking UI icons
- `components/FarmActionAnimation.tsx` — Farm action feedback

## Multi-Use Emojis

Some emojis are used for different meanings in different contexts. When replacing these, create **distinct icons** with descriptive names:

| Emoji | Contexts | Suggested Icons |
|-------|----------|-----------------|
| ✨ | Harvest action, magic sparkle, success | `harvest_sparkle.png`, `magic_sparkle.png` |
| 🌾 | Farm transition, info toast | `farm.png`, `info.png` |
| 💧 | Water crop, collect water | `water_drop.png`, `water_collect.png` |

For multi-use emojis, update the component code to use the specific icon URL directly instead of relying on the emoji mapping.

## Notes

- **Backwards compatible** — unmapped emojis still render as text
- **Incremental** — add icons one at a time as they're drawn
- Icons are optimised to 256x256 at 95% quality with transparency preserved
- The `GameIcon` component handles all rendering logic automatically
- Only RadialMenu uses `GameIcon` so far; other components will be migrated later
