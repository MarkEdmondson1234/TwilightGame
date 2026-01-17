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
# 3. Show how to play it in code
```

## When to Use This Skill

Invoke this skill when:
- User asks to add sound effects (SFX)
- User wants background music for maps
- User needs ambient sounds (rain, wind, crickets)
- User mentions footstep sounds
- User wants UI sounds (button clicks, menus)

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

### 3. Play the Sound

Use `audioManager` or `useAudio()` hook:

```typescript
// Direct usage (in utilities/managers)
import { audioManager } from '../utils/AudioManager';

audioManager.playSfx('sfx_door_creak');
audioManager.playMusic('music_forest', { fadeIn: 2000 });
audioManager.playAmbient('ambient_rain');

// React hook (in components)
import { useAudio } from '../hooks/useAudio';

function MyComponent() {
  const audio = useAudio();

  const handleClick = () => {
    audio.playSfx('sfx_door_creak');
  };
}
```

## Playback Methods

| Method | Purpose | Options |
|--------|---------|---------|
| `playSfx(key)` | One-shot effects | `{ volume?, pitch? }` |
| `playMusic(key)` | Background music | `{ fadeIn?, crossfade? }` |
| `playAmbient(key)` | Looping ambient | Returns sound ID |
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

## Integration Points

### Footsteps (usePlayerMovement.ts)

```typescript
const movement = usePlayerMovement({
  // ... other config
  onFootstep: (position) => {
    const tileType = getTileData(position.x, position.y)?.type;
    if (tileType) {
      audio.playFootstepForTile(tileType);
    }
  },
  footstepIntervalMs: 280,
});
```

### Map Transitions (actionHandlers.ts)

```typescript
// In checkTransition()
audioManager.playSfx('sfx_door_open');
```

### Music by Map (App.tsx)

```typescript
useEffect(() => {
  const mapMusic: Record<string, string> = {
    village: 'music_village',
    forest: 'music_forest',
    home_interior: 'music_indoor',
  };

  const musicKey = mapMusic[currentMapId];
  if (musicKey) {
    audioManager.playMusic(musicKey, { crossfade: true });
  }
}, [currentMapId]);
```

## Testing

1. **DevTools (F4)**: AudioDebugSection has volume controls and test buttons
2. **Console**: `audioManager.getStats()` shows loaded/playing sounds
3. **Effects**: AudioEffectsSection in DevTools for experimenting with filters

## Resources

See [`resources/reference.md`](resources/reference.md) for:
- Complete API reference
- Surface-to-tile mapping
- Volume control patterns
- Mobile Safari handling

## Notes

- Audio loads in background (non-blocking)
- Mobile Safari requires user gesture to start AudioContext
- M4A format recommended for quality/size balance
- Use DevTools to experiment, then copy code snippets
