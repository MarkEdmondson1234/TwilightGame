---
name: Add Audio
description: Add audio files to the TwilightGame project. Use when user asks to add sounds, music, ambient audio, sound effects, footsteps, or background music to the game.
---

# Add Audio

Add audio files (SFX, music, ambient sounds) to TwilightGame using the Web Audio API-based AudioManager.

## Quick Start

**Most common usage:**
```bash
# User says: "Add a door creak sound effect"
# This skill will:
# 1. Place audio file in correct directory
# 2. Register in assets.ts with proper config
# 3. Wire it up in App.tsx to actually play
```

## When to Use This Skill

Invoke this skill when:
- User asks to add sound effects (SFX)
- User wants background music for maps
- User needs ambient sounds (rain, wind, crickets)
- User mentions footstep sounds
- User wants UI sounds (button clicks, menus)
- User wants to wire up existing sounds that aren't playing

## Audio Categories

| Category | Directory | Use Case | Loop Default |
|----------|-----------|----------|--------------|
| `sfx` | `/public/assets/audio/sfx/` | One-shot effects | No |
| `music` | `/public/assets/audio/music/` | Background tracks | Yes |
| `ambient` | `/public/assets/audio/ambient/` | Environmental loops | Yes |
| `ui` | `/public/assets/audio/ui/` | Interface sounds | No |

## Workflow

### 1. Place Audio File

Put the audio file in the correct subdirectory:

```
public/assets/audio/
├── sfx/
│   ├── footsteps/    # footstep_grass.m4a, footstep_stone.m4a
│   ├── farming/      # till.m4a, plant.m4a, water.m4a, harvest.m4a
│   ├── items/        # pickup.m4a, drop.m4a, equip.m4a
│   ├── transitions/  # door_open.m4a, teleport.m4a
│   ├── cooking/      # sizzle.m4a, bubble.m4a
│   ├── magic/        # spell_cast.m4a, magic_shimmer.m4a
│   ├── npcs/         # npc-specific sounds
│   └── player/       # player-specific sounds
├── music/            # twilight_village.m4a, forest_theme.m4a
├── ambient/          # rain.m4a, wind.m4a, crickets.m4a
└── ui/               # menu_open.m4a, button_click.m4a
```

**Supported formats:** `.m4a` (recommended), `.mp3`, `.ogg`, `.wav`

### 2. Register in assets.ts

Add entry to `audioAssets` in [assets.ts](assets.ts):

```typescript
import { AudioAssetConfig } from './utils/AudioManager';

export const audioAssets: Record<string, AudioAssetConfig> = {
  // Naming convention: category_name
  sfx_door_creak: {
    url: '/TwilightGame/assets/audio/sfx/transitions/door_creak.m4a',
    category: 'sfx',
  },

  // Music with loop
  music_forest: {
    url: '/TwilightGame/assets/audio/music/forest_theme.m4a',
    category: 'music',
    loop: true,
  },

  // Ambient with custom volume
  ambient_rain: {
    url: '/TwilightGame/assets/audio/ambient/rain.m4a',
    category: 'ambient',
    loop: true,
    volume: 0.6,
  },
};
```

**AudioAssetConfig properties:**
- `url` (required): Path to audio file
- `category` (required): `'sfx'` | `'music'` | `'ambient'` | `'ui'`
- `loop` (optional): `true` for music/ambient
- `volume` (optional): `0.0` - `1.0` (default: 1.0)

### 3. Wire Up the Sound (CRITICAL!)

**IMPORTANT**: Just registering a sound in assets.ts is NOT enough! You must also wire it up in App.tsx or another component to actually trigger playback.

First, import audioManager in App.tsx (if not already):
```typescript
import { audioManager } from './utils/AudioManager';
```

Then wire up the sound at the appropriate trigger point.

## Wiring Up Sounds by Type

### Weather Ambient Sounds

Add a useEffect in App.tsx that responds to weather changes:

```typescript
// Weather ambient audio - play/stop sounds based on weather and map
useEffect(() => {
  const isOutdoors = isWeatherAllowedOnMap(currentWeather, currentMapId);

  // Map weather types to audio keys
  const weatherAudioMap: Record<string, string | null> = {
    rain: 'ambient_rain_light',
    storm: 'ambient_thunderstorm',
    snow: 'ambient_blizzard',
    clear: null,
    fog: null,
  };

  // Stop all weather ambient sounds first
  audioManager.stopAmbient('ambient_rain_light', 1000);
  audioManager.stopAmbient('ambient_thunderstorm', 1000);
  audioManager.stopAmbient('ambient_blizzard', 1000);

  // Play new weather ambient if outdoors
  if (isOutdoors) {
    const audioKey = weatherAudioMap[currentWeather];
    if (audioKey && audioManager.hasSound(audioKey)) {
      setTimeout(() => {
        audioManager.playAmbient(audioKey);
      }, 500);
    }
  }
}, [currentWeather, currentMapId]);
```

### Farming Sound Effects

Add to the `onFarmAnimation` callback in the keyboard/touch controls config:

```typescript
onFarmAnimation: (action, tilePos) => {
  setFarmActionAnimation(action);
  setFarmActionKey((prev) => prev + 1);
  // Play farming sound effects
  if (action === 'till') {
    audioManager.playSfx('sfx_hoeing');
  } else if (action === 'water') {
    audioManager.playSfx('sfx_watering');
  } else if (action === 'harvest') {
    audioManager.playSfx('sfx_harvest');
  }
},
```

### Door/Transition Sounds

Add to the `onTransition` callback:

```typescript
onTransition: (result: TransitionResult) => {
  if (result.success && result.mapId && result.spawnPosition) {
    // Play door/transition sound
    audioManager.playSfx('sfx_door_opening');
    handleMapTransition(result.mapId, result.spawnPosition);
    // ... rest of transition logic
  }
},
```

### NPC-Specific Sounds (e.g., Ducks)

Add to the `onNPC` callback:

```typescript
onNPC: (npcId) => {
  // Play duck quacking if interacting with a duck
  if (npcId.toLowerCase().includes('duck')) {
    audioManager.playSfx('sfx_ducks_quack');
  }
  setActiveNPC(npcId);
},
```

### Magic/Potion Sounds

Add when potion effect succeeds:

```typescript
const result = usePotionEffect(itemId, magicEffectCallbacks);

if (result.success) {
  // Play magic sound effect
  audioManager.playSfx('sfx_magic_transition');
  // ... rest of potion logic
}
```

### Random Ambient Music (Fade In/Out)

Add a useEffect for music that plays randomly:

```typescript
useEffect(() => {
  let isMusicPlaying = false;
  let musicTimeout: ReturnType<typeof setTimeout> | null = null;

  const getMusicForMap = (mapId: string): string | null => {
    if (mapId.includes('forest')) return 'music_forest';
    if (mapId.includes('village')) return 'music_village';
    return 'music_village';
  };

  const getRandomInterval = () => Math.floor(Math.random() * 180000) + 120000; // 2-5 min
  const getRandomDuration = () => Math.floor(Math.random() * 60000) + 30000; // 30-90 sec

  const playRandomMusic = () => {
    if (isMusicPlaying) return;

    const musicKey = getMusicForMap(currentMapId);
    if (!musicKey || !audioManager.hasSound(musicKey)) {
      musicTimeout = setTimeout(playRandomMusic, getRandomInterval());
      return;
    }

    isMusicPlaying = true;
    audioManager.playMusic(musicKey, { fadeIn: 3000 });

    musicTimeout = setTimeout(() => {
      audioManager.stopMusic(3000);
      isMusicPlaying = false;
      musicTimeout = setTimeout(playRandomMusic, getRandomInterval());
    }, getRandomDuration());
  };

  const initialDelay = Math.floor(Math.random() * 20000) + 10000;
  musicTimeout = setTimeout(playRandomMusic, initialDelay);

  return () => {
    if (musicTimeout) clearTimeout(musicTimeout);
    audioManager.stopMusic(1000);
  };
}, [currentMapId]);
```

## Complete Integration Checklist

When adding a new sound:

1. ☐ Place audio file in correct `/public/assets/audio/` subdirectory
2. ☐ Register in `assets.ts` with proper `AudioAssetConfig`
3. ☐ Import `audioManager` in the file where you'll trigger it
4. ☐ Add trigger code at the appropriate event:
   - Weather → useEffect on `currentWeather`
   - Farming → `onFarmAnimation` callback
   - Transitions → `onTransition` callback
   - NPC interaction → `onNPC` callback
   - Magic/potions → After successful effect
   - UI actions → In button/action handlers
5. ☐ Test in browser (remember: needs user interaction first on mobile)

## Playback Methods

| Method | Purpose | Options |
|--------|---------|---------|
| `playSfx(key)` | One-shot effects | `{ volume?, pitch? }` |
| `playMusic(key)` | Background music | `{ fadeIn?, crossfade? }` |
| `playAmbient(key)` | Looping ambient | Returns sound ID |
| `stopAmbient(key)` | Stop specific ambient | `fadeOutMs` |
| `playUI(key)` | UI sounds | - |
| `playFootstep(surface)` | Footstep by surface | `'grass'|'stone'|'wood'|'water'` |

## Audio Effects

Apply effects for atmosphere:

```typescript
// Presets (quick)
audioManager.applyEffectPreset('underwater');  // Muffled, reverb
audioManager.applyEffectPreset('cave');        // Echo, reverb
audioManager.applyEffectPreset('indoor');      // Subtle reverb
audioManager.applyEffectPreset('distant');     // Thin, quiet
audioManager.applyEffectPreset('dream');       // Warbly, ethereal

// Manual control
audioManager.setLowPassFilter(2000, 1.0);   // Muffle (Hz, Q)
audioManager.setHighPassFilter(500, 0.5);   // Thin sound
audioManager.setReverb(0.3, 0.1, 0.5);      // mix, delay, decay
audioManager.resetEffects();                 // Clear all effects
```

## Testing

1. **DevTools (F4)**: AudioDebugSection has volume controls and test buttons
2. **Console**: `audioManager.getStats()` shows loaded/playing sounds
3. **Effects**: AudioEffectsSection in DevTools for experimenting with filters
4. **Check loading**: `audioManager.hasSound('key')` returns true if loaded

## Resources

See [`resources/reference.md`](resources/reference.md) for:
- Complete API reference
- Surface-to-tile mapping
- Volume control patterns
- Mobile Safari handling

## Notes

- Audio loads in background (non-blocking)
- Mobile Safari requires user gesture to start AudioContext (useAudio handles this)
- M4A format recommended for quality/size balance
- Use DevTools to experiment, then copy code snippets
- **Common mistake**: Registering sounds but forgetting to wire them up!
