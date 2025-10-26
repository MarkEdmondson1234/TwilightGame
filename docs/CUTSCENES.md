# Cutscene System

The cutscene system provides a cinematic storytelling framework for Twilight Game, supporting animated backgrounds, character positioning, branching dialogue, and various trigger conditions.

## Features

- **Fullscreen Cinematic Display**: Hides all game UI to focus on the cutscene
- **Animated Backgrounds**: Ken Burns-style panning and zooming effects on large images
- **Layered Backgrounds**: Multiple image layers for depth and parallax effects
- **Character Positioning**: Place NPCs and the player character in scenes
- **Bottom Dialogue**: Dialogue positioned at the bottom (vs centered in-game dialogue)
- **Branching Choices**: Player can make choices that affect scene flow
- **Multiple Triggers**: Position-based, dialogue-based, season changes, events, and manual
- **Scene Transitions**: Fade, crossfade, and wipe effects between scenes
- **Progress Tracking**: Remembers which cutscenes have been viewed
- **Seasonal/Time Variations**: Dialogue can change based on season or time of day

## Architecture

### Core Components

1. **CutsceneManager** (`utils/CutsceneManager.ts`)
   - Single source of truth for cutscene state
   - Handles registration, triggers, and playback
   - Manages completion tracking

2. **CutscenePlayer** (`components/CutscenePlayer.tsx`)
   - Fullscreen React component for playback
   - Renders backgrounds, characters, and dialogue
   - Handles user input (E/Enter to advance, ESC to skip)

3. **GameState Integration** (`GameState.ts`)
   - Persists completed cutscenes to localStorage
   - Syncs with CutsceneManager on load

4. **Cutscene Definitions** (`data/cutscenes/`)
   - Structured data files defining scenes
   - Centralized registry in `data/cutscenes/index.ts`

## Creating a Cutscene

### Basic Structure

```typescript
import { CutsceneDefinition } from '../../types';

export const myCutscene: CutsceneDefinition = {
  id: 'my_cutscene',
  name: 'My Cutscene Title',

  // Trigger configuration
  trigger: {
    type: 'manual',
    id: 'custom_trigger_id',
  },

  // What happens after cutscene ends
  onComplete: {
    action: 'return', // or 'transition', 'trigger_cutscene', 'none'
  },

  // Options
  canSkip: true,
  canReplay: false,
  playOnce: true,

  // Scenes array
  scenes: [
    {
      id: 'scene_1',
      backgroundLayers: [
        {
          image: 'my_background.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 5000,
            zoomFrom: 1.0,
            zoomTo: 1.2,
            easing: 'ease-in-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Character Name',
        text: 'Dialogue text here.',
      },
      transitionOut: {
        type: 'fade',
        duration: 1000,
      },
    },
  ],
};
```

### Adding Characters to Scenes

```typescript
characters: [
  {
    characterId: 'player', // 'player' or NPC ID
    position: { x: 30, y: 50 }, // Percentage of screen
    scale: 1.5,
    entrance: {
      type: 'slide',
      from: 'left',
      duration: 1000,
    },
  },
  {
    characterId: 'mum',
    position: { x: 70, y: 50 },
    scale: 1.8,
    entrance: {
      type: 'fade',
      duration: 800,
    },
  },
],
```

### Adding Dialogue Choices

```typescript
dialogue: {
  speaker: 'Elder',
  text: 'Which path will you take?',
  choices: [
    {
      text: 'The forest path.',
      nextSceneIndex: 1, // Jump to scene 1
    },
    {
      text: 'The mountain path.',
      nextSceneIndex: 2, // Jump to scene 2
    },
    {
      text: 'Neither, I will stay here.',
      action: 'end', // End cutscene
    },
  ],
},
```

### Background Animation Types

**Static** - No animation:
```typescript
animation: {
  type: 'static',
  duration: 0,
}
```

**Zoom** - Scale in/out:
```typescript
animation: {
  type: 'zoom',
  duration: 5000,
  zoomFrom: 1.0,
  zoomTo: 1.2,
  easing: 'ease-in-out',
}
```

**Pan** - Move across the image:
```typescript
animation: {
  type: 'pan',
  duration: 8000,
  panFrom: 'left',
  panTo: 'right',
  easing: 'ease-in-out',
}
```

**Pan-and-Zoom** - Combine both:
```typescript
animation: {
  type: 'pan-and-zoom',
  duration: 10000,
  panFrom: 'bottom',
  panTo: 'top',
  zoomFrom: 1.3,
  zoomTo: 1.0,
  easing: 'ease-out',
}
```

## Trigger Types

### Manual Trigger
Triggered explicitly by code:
```typescript
trigger: {
  type: 'manual',
  id: 'game_start',
}

// Trigger it:
cutsceneManager.triggerManualCutscene('game_start', savedPosition);
```

### Position Trigger
Triggered when player enters an area:
```typescript
trigger: {
  type: 'position',
  mapId: 'village',
  position: { x: 10, y: 15 },
  radius: 2.0, // Optional, defaults to 1.0
}
```

### Dialogue Trigger
Triggered by specific dialogue choices:
```typescript
trigger: {
  type: 'dialogue',
  npcId: 'elder',
  nodeId: 'special_quest',
}
```

### Season Change Trigger
Triggered when season changes:
```typescript
trigger: {
  type: 'season_change',
  season: 'spring', // 'spring' | 'summer' | 'autumn' | 'winter'
}
```

### Time Trigger
Triggered at specific game time:
```typescript
trigger: {
  type: 'time',
  hour: 12, // 0-23
  day: 7,   // Optional: specific day
}
```

### Event Trigger
Triggered by custom game events:
```typescript
trigger: {
  type: 'event',
  eventId: 'harvest_festival',
}
```

## Completion Actions

### Return
Return player to where cutscene started:
```typescript
onComplete: {
  action: 'return',
}
```

### Transition
Move player to a different map:
```typescript
onComplete: {
  action: 'transition',
  mapId: 'home_interior',
  position: { x: 5, y: 5 },
}
```

### Chain Cutscenes
Trigger another cutscene:
```typescript
onComplete: {
  action: 'trigger_cutscene',
  cutsceneId: 'next_cutscene',
}
```

### No Action
Stay in place, no special action:
```typescript
onComplete: {
  action: 'none',
}
```

## Requirements System

Cutscenes can have requirements that must be met:

```typescript
requirements: {
  minGold: 1000, // Minimum gold required
  requiredItems: ['special_key'], // Items player must have
  completedCutscenes: ['intro'], // Other cutscenes that must be completed first
  flags: ['quest_started'], // Custom game flags
}
```

## Assets

### Directory Structure
```
/public/assets/cutscenes/
  intro/
    village_wide.png
    cottage_interior.png
  season_spring/
    spring_meadow.png
  season_summer/
    summer_fields.png
  ...
```

### Image Guidelines
- **Resolution**: 1920x1080 (or higher for better quality)
- **Format**: PNG (supports transparency for layering)
- **Aspect Ratio**: 16:9 recommended
- **File Size**: Optimize images for web (use image compression tools)

## User Controls

While a cutscene is playing:
- **E** or **Enter**: Advance to next dialogue/scene
- **ESC**: Skip cutscene (if `canSkip: true`)

During dialogue choices:
- **Click** on choice to select

## Examples

See the example cutscenes in `data/cutscenes/`:
- [`intro.ts`](../data/cutscenes/intro.ts) - Game introduction with multiple scenes
- [`seasonChange.ts`](../data/cutscenes/seasonChange.ts) - Season transition cutscenes

## API Reference

### CutsceneManager Methods

```typescript
// Register cutscenes
cutsceneManager.registerCutscene(cutscene: CutsceneDefinition)
cutsceneManager.registerCutscenes(cutscenes: CutsceneDefinition[])

// Start cutscene
cutsceneManager.startCutscene(cutsceneId: string, savedPosition?)

// Manual trigger
cutsceneManager.triggerManualCutscene(triggerId: string, savedPosition?)

// Check and trigger cutscenes
cutsceneManager.checkAndTriggerCutscenes(context: {
  playerPosition?: Position;
  currentMapId?: string;
  npcId?: string;
  nodeId?: string;
  eventId?: string;
})

// Progress
cutsceneManager.hasCompletedCutscene(cutsceneId: string): boolean
cutsceneManager.getCompletedCutscenes(): string[]
```

### GameState Methods

```typescript
// Track completion
gameState.markCutsceneCompleted(cutsceneId: string)
gameState.hasCutsceneCompleted(cutsceneId: string): boolean
gameState.getCompletedCutscenes(): string[]
```

## Best Practices

1. **Keep scenes focused**: 3-5 scenes per cutscene is ideal
2. **Use transitions**: Always use `transitionOut` for smooth flow
3. **Test thoroughly**: Test all dialogue branches and choices
4. **Optimize images**: Compress images to reduce load times
5. **British English**: Use British spellings in all dialogue
6. **Character positioning**: Use percentage-based positioning (0-100) for different screen sizes
7. **Auto-advance sparingly**: Only use `autoAdvance` for non-interactive scenes
8. **Seasonal variations**: Add `seasonalText` for immersion

## Integration Points

Cutscenes integrate with:
- **TimeManager**: Season and time-based triggers
- **NPCManager**: Character sprites in scenes
- **GameState**: Progress tracking and persistence
- **DialogueBox**: Shared dialogue rendering logic

## Troubleshooting & Debugging

### Cutscene Keeps Appearing on Page Reload

**Symptom:** A cutscene (especially season change cutscenes) appears every time you reload the page.

**Cause:** The `lastSeasonTriggered` state wasn't saved to localStorage before the fix was implemented.

**Solution:**

Open your browser console (F12) and run this command:

```javascript
const savedState = localStorage.getItem('twilight_game_state');
if (savedState) {
  const state = JSON.parse(savedState);
  if (!state.cutscenes) state.cutscenes = { completed: [] };
  state.cutscenes.lastSeasonTriggered = 'summer'; // or 'spring', 'autumn', 'winter'
  localStorage.setItem('twilight_game_state', JSON.stringify(state));
  console.log('Fixed! Reload the page.');
  location.reload();
}
```

Replace `'summer'` with the current season in your game.

---

### Cutscene Won't Trigger When It Should

**Possible Causes:**
1. Cutscene marked as completed (`playOnce: true`)
2. Requirements not met
3. Season already marked as triggered
4. Cutscene not registered

**Debug in Console:**

```javascript
// Check registered cutscenes
console.log('Registered:', cutsceneManager.getAllCutscenes().map(c => c.id));

// Check completion status
console.log('Completed:', gameState.getCompletedCutscenes());
console.log('Last season:', gameState.getLastSeasonTriggered());

// Check current conditions
const time = TimeManager.getCurrentTime();
console.log('Season:', time.season, 'Day:', time.day, 'Hour:', time.hour);

// Manually trigger
cutsceneManager.triggerManualCutscene('game_start', {
  mapId: 'village',
  position: { x: 15, y: 25 }
});
```

---

### Cutscene Triggers Too Often

**Cause:** Position triggers check every frame. If `playOnce: false`, they'll retrigger.

**Solutions:**

1. **Set playOnce: true:**
```typescript
playOnce: true, // Only plays once per save
```

2. **Add requirements:**
```typescript
requirements: {
  completedCutscenes: [], // Must not have completed this yet
}
```

3. **Reduce trigger radius:**
```typescript
trigger: {
  type: 'position',
  radius: 0.5, // Smaller area
}
```

---

### Debug Console Functions

Paste these into your browser console (F12):

#### Check Cutscene State
```javascript
const savedState = localStorage.getItem('twilight_game_state');
if (savedState) {
  const state = JSON.parse(savedState);
  console.log('Cutscene State:', state.cutscenes);
}
```

#### Clear All Cutscene State
```javascript
function clearCutsceneState() {
  const savedState = localStorage.getItem('twilight_game_state');
  if (savedState) {
    const state = JSON.parse(savedState);
    state.cutscenes = { completed: [] };
    localStorage.setItem('twilight_game_state', JSON.stringify(state));
    location.reload();
  }
}
clearCutsceneState();
```

#### Set Last Season Triggered
```javascript
function setLastSeason(season) {
  const savedState = localStorage.getItem('twilight_game_state');
  if (savedState) {
    const state = JSON.parse(savedState);
    if (!state.cutscenes) state.cutscenes = { completed: [] };
    state.cutscenes.lastSeasonTriggered = season;
    localStorage.setItem('twilight_game_state', JSON.stringify(state));
    location.reload();
  }
}
setLastSeason('summer'); // Change to current season
```

#### Reset All Progress (⚠️ Deletes everything!)
```javascript
localStorage.clear();
location.reload();
```

---

### Understanding State Persistence

The cutscene system uses the **Single Source of Truth** pattern:

**Storage Flow:**
```
localStorage → GameState → App.tsx → CutsceneManager
```

**What Gets Saved:**
```json
{
  "cutscenes": {
    "completed": ["game_intro", "season_change_spring"],
    "lastSeasonTriggered": "summer"
  }
}
```

- **CutsceneManager**: In-memory state only (does NOT save to localStorage)
- **GameState**: Handles ALL localStorage persistence
- **App.tsx**: Syncs between the two

---

### Common Issues

**Images not loading?**
- Ensure images are in `/public/assets/cutscenes/`
- Check file paths match exactly (case-sensitive)

**Characters not appearing?**
- Verify `characterId` matches NPC ID or 'player'
- Check NPC has `portraitSprite` defined

**TypeScript errors?**
- Run `npx tsc --noEmit`
- Verify all required fields in cutscene definition

---

### Troubleshooting Checklist

- [ ] Check browser console for `[CutsceneManager]` logs
- [ ] Verify cutscene registered in `data/cutscenes/index.ts`
- [ ] Check trigger conditions match game state
- [ ] Verify `playOnce` setting
- [ ] Check `requirements` aren't blocking
- [ ] Run `npx tsc --noEmit` for TypeScript errors
- [ ] Check assets exist in `/public/assets/cutscenes/`

---

### Development Tips

**Testing New Cutscenes:**

1. Clear state:
```javascript
clearCutsceneState();
```

2. Manually trigger:
```javascript
cutsceneManager.triggerManualCutscene('your_trigger_id', {
  mapId: 'current_map',
  position: { x: 10, y: 10 }
});
```

3. Watch console logs:
```
[CutsceneManager] Registered cutscene: my_cutscene
[CutsceneManager] Starting cutscene: My Cutscene Title
[CutsceneManager] Advancing to scene 1
[CutsceneManager] Ending cutscene: My Cutscene Title
```

**Preventing Infinite Loops:**
- Season change cutscenes: Tracked automatically
- Position triggers: Use `playOnce: true`
- Time triggers: Use specific day conditions
- Event triggers: Manual control only

**Common Mistakes:**

❌ DON'T modify state directly:
```javascript
cutsceneManager.getState().completedCutscenes.push('new_id'); // WRONG!
```

✅ DO use GameState methods:
```javascript
gameState.markCutsceneCompleted('new_id'); // CORRECT!
```

**Key Log Messages:**

| Message | Meaning |
|---------|---------|
| `Registered cutscene: X` | Cutscene loaded successfully |
| `Starting cutscene: X` | Cutscene beginning playback |
| `Marking season X as triggered` | Season cutscene tracking |
| `Requirements not met` | Cutscene blocked |
| `Already played (playOnce)` | Won't replay |
