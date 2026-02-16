# Mini-Game Implementation Guide (Technical Reference)

This file is for Claude to read during implementation — after the user interview is complete. It contains detailed patterns, gotchas, and examples needed to write correct code.

## File Structure

Every mini-game is exactly 2 new files + 1 registry edit:

```
minigames/
  <game-name>/
    definition.ts          ← MiniGameDefinition export
    <GameName>Game.tsx     ← React component
  registry.ts              ← Add 1 import + 1 array entry
```

## Critical Rules

1. **British English** — All user-facing text: "colour" not "color", "favourite" not "favorite", "travelling" not "traveling"
2. **Validate item IDs** — Read `data/items.ts` and confirm every item ID in requirements/rewards actually exists
3. **Validate NPC IDs** — Check NPC factory files in `utils/npcs/` before using an NPC ID
4. **Touch support** — Every interactive element must work with both mouse AND touch (iPad). Use both `onMouseDown`/`onTouchStart` etc. Set `touchAction: 'none'` on canvases to prevent scroll
5. **`userSelect: 'none'`** — Add to root container to prevent text selection during gameplay
6. **No core file changes** — Never modify App.tsx, useUIState.ts, or actionHandlers.ts for a new mini-game
7. **Linear image scaling** — Never use `imageRendering: 'pixelated'`. All art is hand-drawn

## Component Patterns

### Loading External Assets

If the mini-game uses game images (from `assets.ts` or `groceryAssets`):

```typescript
import { groceryAssets } from '../../assets';

// Load image asynchronously
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// In component:
const imageRef = useRef<HTMLImageElement | null>(null);
const [imageLoaded, setImageLoaded] = useState(false);

useEffect(() => {
  let cancelled = false;
  loadImage(groceryAssets.pumpkin).then((img) => {
    if (cancelled) return;
    imageRef.current = img;
    setImageLoaded(true);
  });
  return () => { cancelled = true; };
}, []);

// Show loading state while image loads
if (!imageLoaded) {
  return <div>Loading...</div>;
}
```

**IMPORTANT**: When using canvas rendering that depends on loaded images, add `imageLoaded` to the `useCallback` dependency array of your render function. Otherwise the render effect won't re-run after the image is drawn to the surface canvas.

### Canvas-Based Games

For games that use HTML5 Canvas (drawing, carving, puzzles):

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null);

// Canvas must handle both mouse and touch
<canvas
  ref={canvasRef}
  width={400}
  height={400}
  style={{
    width: '100%',
    height: 'auto',
    borderRadius: 8,
    cursor: 'crosshair',
    touchAction: 'none',  // Prevent scroll on touch
  }}
  onMouseDown={handlePointerDown}
  onMouseMove={handlePointerMove}
  onMouseUp={handlePointerUp}
  onMouseLeave={handlePointerUp}
  onTouchStart={handlePointerDown}
  onTouchMove={handlePointerMove}
  onTouchEnd={handlePointerUp}
/>
```

Get canvas coordinates from both mouse and touch events:

```typescript
const getCanvasPos = (
  e: React.MouseEvent | React.TouchEvent
): { x: number; y: number } | null => {
  const canvas = canvasRef.current;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;

  if ('touches' in e) {
    const touch = e.touches[0];
    if (!touch) return null;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  }
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
};
```

### Animation Loops

For animated effects (flickering, pulsing, particles):

```typescript
const rafRef = useRef<number>(0);

useEffect(() => {
  let startTime = 0;
  const animate = (time: number) => {
    if (!startTime) startTime = time;
    const elapsed = (time - startTime) / 1000;
    // Use elapsed for animation calculations
    renderFrame(elapsed);
    rafRef.current = requestAnimationFrame(animate);
  };
  rafRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(rafRef.current);
}, [renderFrame]);
```

### Using Context API

```typescript
// Check player has items during gameplay
if (context.actions.hasItem('flour', 2)) {
  context.actions.removeItem('flour', 2);
  context.actions.showToast('Used 2 flour!', 'info');
}

// Play sound effects
context.actions.playSfx('sfx_harvest');

// Check friendship level to unlock features
const level = context.actions.getFriendshipLevel('forest_witch_wolf');
if (level >= 3) {
  // Unlock special recipe
}

// Read/write per-game progress
const saved = context.storage.load<{ highScore: number }>();
if (score > (saved?.highScore ?? 0)) {
  context.storage.save({ highScore: score });
}
```

### Completing with Results

```typescript
const handleFinish = useCallback(() => {
  const result: MiniGameResult = {
    // Required
    success: score >= threshold,

    // Optional — only include what's relevant
    score,
    goldReward: Math.floor(score / 5),
    rewards: [{ itemId: 'crop_pumpkin', quantity: 1 }],
    friendshipRewards: [{ npcId: 'forest_chill_bear', points: 5 }],

    // Toast message (British English!)
    message: score >= threshold
      ? "Brilliant! A proper masterpiece!"
      : "Not quite, but a good effort.",
    messageType: score >= threshold ? 'success' : 'info',

    // Saved to localStorage automatically (namespaced per game)
    progressData: {
      lastScore: score,
      totalPlays: (context.storage.load<{ totalPlays?: number }>()?.totalPlays ?? 0) + 1,
    },
  };
  onComplete(result);
}, [score, context.storage, onComplete]);
```

## Definition File Patterns

### Placed Item Trigger (most common)

```typescript
export const myDefinition: MiniGameDefinition = {
  id: 'my-game',
  displayName: 'My Game',
  description: 'A fun activity in British English.',
  icon: '🎮',
  colour: '#3b82f6',
  component: MyGame,
  triggers: {
    placedItemId: 'workbench',
  },
};
```

### NPC Trigger with Friendship Gate

```typescript
export const myDefinition: MiniGameDefinition = {
  id: 'cooking-contest',
  displayName: 'Cooking Contest',
  description: 'Compete in a cooking challenge!',
  icon: '👨‍🍳',
  colour: '#ef4444',
  component: CookingContestGame,
  triggers: {
    npcId: 'village_shopkeeper',
  },
  availability: {
    minFriendship: { npcId: 'village_shopkeeper', level: 3 },
  },
};
```

### Seasonal with Item Requirements

```typescript
export const myDefinition: MiniGameDefinition = {
  id: 'snowman-building',
  displayName: 'Build Snowman',
  description: 'Build a snowman in the village square!',
  icon: '⛄',
  colour: '#93c5fd',
  component: SnowmanGame,
  triggers: {
    placedItemId: 'snowman_spot',
  },
  requirements: [
    { itemId: 'crop_carrot', quantity: 1, consumeOn: 'onComplete' },
  ],
  availability: {
    seasons: ['winter'],
  },
};
```

## Registry Edit Pattern

Always add to the end of the array in `minigames/registry.ts`:

```typescript
// Add this import with the other imports
import { myDefinition } from './my-game/definition';

// Add to the MINI_GAME_DEFINITIONS array
const MINI_GAME_DEFINITIONS: MiniGameDefinition[] = [
  decorationCraftingDefinition,
  paintingEaselDefinition,
  pumpkinCarvingDefinition,
  myDefinition,  // ← new entry
];
```

## Creating New Items

If the mini-game needs items that don't exist yet, add them to `data/items.ts`:

```typescript
my_new_item: {
  id: 'my_new_item',
  name: 'my_new_item',
  displayName: 'My New Item',
  category: ItemCategory.MISC,
  description: 'Description in British English.',
  stackable: true,
  sellPrice: 10,
  rarity: ItemRarity.COMMON,
},
```

**Always check existing items first** — run `grep -i 'displayName.*fish' data/items.ts` or similar to avoid creating duplicates.

## Creating New Placed Items

If the mini-game needs a new trigger object that doesn't exist yet, add it to `data/items.ts` as a DECORATION category item with `placeable: true`. The player will need to place it on a map before the mini-game becomes accessible.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Item ID doesn't exist | Check `data/items.ts` before using any item ID |
| NPC ID wrong | Check `utils/npcs/village/` and `utils/npcs/forest/` for exact IDs |
| American English | Use "colour", "favourite", "travelling", "practising" |
| No touch support | Add both `onMouse*` and `onTouch*` handlers |
| Canvas scrolls on iPad | Add `touchAction: 'none'` to canvas style |
| Pumpkin not visible | Add `imageLoaded` to `renderFrame` useCallback deps |
| Text selectable during game | Add `userSelect: 'none'` to root container |
| Pixelated images | Never use `imageRendering: 'pixelated'` — art is hand-drawn |
