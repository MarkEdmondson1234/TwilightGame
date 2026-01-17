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

| Event | Sound Key | Location in App.tsx |
|-------|-----------|---------------------|
| Rain weather | `ambient_rain_light` | useEffect on currentWeather |
| Storm weather | `ambient_thunderstorm` | useEffect on currentWeather |
| Snow weather | `ambient_blizzard` | useEffect on currentWeather |
| Tilling soil | `sfx_hoeing` | onFarmAnimation callback |
| Watering crops | `sfx_digging` | onFarmAnimation callback |
| Door transitions | `sfx_door_opening` | onTransition callback |
| Talking to ducks | `sfx_ducks_quack` | onNPC callback |
| Magic potions | `sfx_magic_transition` | usePotion handler |
| Background music | `music_village`/`music_forest` | useEffect with timers |

## Key Integration Patterns

### Weather → useEffect on state
### Farming → onFarmAnimation callback
### Transitions → onTransition callback
### NPCs → onNPC callback
### Magic → After effect success

## Troubleshooting

**Sound not playing?** Check:
1. Registered in `assets.ts`
2. File exists in `/public/assets/audio/`
3. **Wired up in App.tsx** (most common issue!)
4. `audioManager.hasSound(key)` returns true
