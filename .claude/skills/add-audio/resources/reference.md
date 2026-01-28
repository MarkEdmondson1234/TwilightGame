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
audioManager.playSfx('sfx_till');
audioManager.playSfx('sfx_harvest', { volume: 0.8, pitch: 1.2 });

// Music (with crossfade)
audioManager.playMusic('music_village');
audioManager.playMusic('music_forest', { fadeIn: 2000, crossfade: true });
audioManager.stopMusic(1000); // Fade out over 1 second

// Ambient (looping)
audioManager.playAmbient('ambient_rain');
audioManager.stopAmbient('ambient_rain', 500);
audioManager.stopAllAmbients(1000);

// UI sounds
audioManager.playUI('ui_button_click');

// Footsteps by surface
audioManager.playFootstep('grass');
```

### Volume Control

```typescript
audioManager.setVolume('master', 0.7);
audioManager.setVolume('music', 0.5);
audioManager.setMuted(true);
audioManager.toggleMute();
```

## Currently Wired Up Sounds

| Event | Sound Key | Wired In |
|-------|-----------|----------|
| Rain weather | `ambient_rain_light` | useEnvironmentController (useEffect on currentWeather) |
| Storm weather | `ambient_thunderstorm` | useEnvironmentController (useEffect on currentWeather) |
| Snow weather | `ambient_blizzard` | useEnvironmentController (useEffect on currentWeather) |
| Forest birds | `ambient_birds` | useEnvironmentController (useEffect on currentMapId) |
| Running stream | `ambient_running_stream` | useEnvironmentController (useEffect on currentMapId) |
| Tilling soil | `sfx_till` | useInteractionController (onFarmAnimation callback) |
| Door transitions | `sfx_door_open` | useInteractionController (onTransition callback, DOOR tiles only) |
| Talking to ducks | `sfx_ducks_quack` | useInteractionController (onNPC callback) |
| Interacting with cat | `sfx_meow_01`/`02`/`03` | useInteractionController (onNPC callback, random) |
| Cooking | `sfx_frying` | RecipeContent.tsx / CookingInterface.tsx (handleCook) |
| Magic potions | `sfx_magic_transition` | App.tsx (usePotion handler) |
| Background music | `music_village`/`music_forest` | useEnvironmentController (useEffect with timers) |

## Key Integration Patterns

### Weather/Ambient → useEffect in useEnvironmentController
### Farming → onFarmAnimation callback in useInteractionController
### Transitions → onTransition callback in useInteractionController
### NPCs → onNPC callback in useInteractionController
### Cooking → handleCook in cooking components (direct audioManager import)
### Magic → After effect success in App.tsx

## Troubleshooting

**Sound not playing?** Check:
1. Registered in `assets.ts`
2. File exists in `/public/assets/audio/`
3. **Wired up** — trigger code exists in the relevant hook/component (most common issue!)
4. **Key matches** — the key used in `playSfx()` matches the key in `assets.ts`
5. `audioManager.hasSound(key)` returns true
