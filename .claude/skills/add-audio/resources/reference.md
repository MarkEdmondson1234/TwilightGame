# Audio System Reference

Complete reference for TwilightGame's Web Audio API-based audio system.

## AudioManager API

### Initialisation

```typescript
import { audioManager } from '../utils/AudioManager';

// Called automatically in gameInitializer.ts
await audioManager.initialise();

// Resume after user gesture (mobile Safari)
audioManager.resume();

// Load audio assets
await audioManager.loadBatch(audioAssets);
```

### Sound Playback

```typescript
// Sound effects (one-shot)
const soundId = audioManager.playSfx('sfx_till');
audioManager.playSfx('sfx_harvest', { volume: 0.8, pitch: 1.2 });

// Music (with crossfade)
audioManager.playMusic('music_village');
audioManager.playMusic('music_forest', { fadeIn: 2000, crossfade: true });
audioManager.stopMusic(1000); // Fade out over 1 second

// Ambient (looping)
const ambientId = audioManager.playAmbient('ambient_rain');
audioManager.stopAmbient('ambient_rain', 500);
audioManager.stopAllAmbients(1000);

// UI sounds
audioManager.playUI('ui_button_click');

// Footsteps by surface
audioManager.playFootstep('grass');
audioManager.playFootstep('stone');
audioManager.playFootstep('wood');
audioManager.playFootstep('water');
```

### Sound Control

```typescript
// Stop specific sound
audioManager.stopSound(soundId, 500); // Fade out

// Stop by category
audioManager.stopCategory('sfx');
audioManager.stopCategory('ambient', 1000);

// Stop all sounds
audioManager.stopAll(500);
```

### Volume Control

```typescript
// Set volume (0.0 - 1.0)
audioManager.setVolume('master', 0.7);
audioManager.setVolume('music', 0.5);
audioManager.setVolume('ambient', 0.6);
audioManager.setVolume('sfx', 0.8);
audioManager.setVolume('ui', 0.7);

// Get volume
const musicVol = audioManager.getVolume('music');

// Mute
audioManager.setMuted(true);
audioManager.toggleMute();
const muted = audioManager.isMuted();
```

### Audio Effects

```typescript
// Low-pass filter (muffle)
audioManager.setLowPassFilter(2000, 1.0); // frequency (Hz), Q
audioManager.setLowPassFilter(0); // Disable

// High-pass filter (thin)
audioManager.setHighPassFilter(500, 0.5);
audioManager.setHighPassFilter(0); // Disable

// Reverb
audioManager.setReverb(0.3, 0.1, 0.5); // mix, delay (s), decay
audioManager.setReverb(0); // Disable

// Pitch shift (affects all new sounds)
audioManager.setPitchShift(1.2); // 0.5 - 2.0

// Effect presets
audioManager.applyEffectPreset('none');       // Reset all
audioManager.applyEffectPreset('underwater'); // Heavy low-pass, reverb
audioManager.applyEffectPreset('cave');       // Reverb, slight high-pass
audioManager.applyEffectPreset('indoor');     // Subtle reverb
audioManager.applyEffectPreset('distant');    // High-pass, quiet
audioManager.applyEffectPreset('dream');      // Pitch warp, reverb

// Get current effects
const effects = audioManager.getEffects();

// Get code snippet for current effects
const code = audioManager.getEffectCodeSnippet();
```

### Stats & Debugging

```typescript
const stats = audioManager.getStats();
// { loaded: 12, loading: 0, active: 2 }

audioManager.hasSound('sfx_till'); // true
audioManager.isReady(); // true after initialise()
audioManager.getSettings();
```

## Surface Type Mapping

```typescript
import { TILE_TO_SURFACE } from '../utils/AudioManager';

// GRASS, TUFT, TALL_GRASS, FERN → 'grass'
// PATH, ROCK, STONE → 'stone'
// FLOOR, WOOD_FLOOR → 'wood'
// CARPET → 'carpet'
// WATER, SHALLOW_WATER → 'water'
// SOIL_*, TILLED_* → 'soil'

const surface = audioManager.getSurfaceFromTile(TileType.GRASS);
```

## useAudio Hook

```typescript
import { useAudio } from '../hooks/useAudio';

function MyComponent() {
  const audio = useAudio();

  audio.playSfx('sfx_pickup');
  audio.playMusic('music_shop');
  audio.playAmbient('ambient_wind');
  audio.playFootstepForTile(TileType.GRASS);
  audio.setVolume('music', 0.5);
  audio.toggleMute();
}
```

## Asset Configuration

```typescript
interface AudioAssetConfig {
  url: string;             // Path to audio file
  category: SoundCategory; // 'sfx' | 'music' | 'ambient' | 'ui'
  loop?: boolean;          // Default: false for sfx/ui
  volume?: number;         // 0.0 - 1.0
}
```

### Naming Convention

```
{category}_{action}[_{variant}].{ext}

sfx_till.m4a
sfx_footstep_grass.m4a
music_village_day.m4a
ambient_rain_light.m4a
ui_menu_open.m4a
```

### URL Path Format

```typescript
// For GitHub Pages deployment
url: '/TwilightGame/assets/audio/sfx/till.m4a'
```

## Common Integration Patterns

### Farming Actions

```typescript
switch (action) {
  case 'till':
    audioManager.playSfx('sfx_till');
    break;
  case 'harvest':
    audioManager.playSfx('sfx_harvest');
    break;
}
```

### Map Transition

```typescript
if (transition) {
  audioManager.playSfx('sfx_door_open');
}
```

### Weather Ambient

```typescript
useEffect(() => {
  if (isRaining) {
    audioManager.playAmbient('ambient_rain');
  } else {
    audioManager.stopAmbient('ambient_rain', 2000);
  }
}, [isRaining]);
```

### Map Music

```typescript
useEffect(() => {
  const mapMusic = {
    village: 'music_village',
    forest: 'music_forest',
    cave: 'music_cave',
  };
  audioManager.playMusic(mapMusic[currentMapId], { crossfade: true });
}, [currentMapId]);
```

### Effect on Map Entry

```typescript
useEffect(() => {
  if (currentMapId.includes('cave')) {
    audioManager.applyEffectPreset('cave');
  } else {
    audioManager.applyEffectPreset('none');
  }
}, [currentMapId]);
```

## DevTools Testing

Press **F4** to access:
- Volume sliders for each category
- Mute toggle
- Audio stats
- Test sound buttons
- Effect presets
- Filter/reverb controls
- Code snippet copy

## Troubleshooting

### No Sound on Mobile Safari
AudioContext must resume after user gesture. `useAudio` handles this automatically.

### Sound Not Playing
1. Check console for errors
2. Verify asset in `assets.ts`
3. Verify file exists in `public/assets/audio/`
4. Check `audioManager.hasSound(key)`

### Effects Not Applied
Effects only apply to newly played sounds.
