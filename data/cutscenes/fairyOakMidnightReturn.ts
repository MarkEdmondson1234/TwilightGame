/**
 * Fairy Oak Midnight Return Cutscene
 *
 * Triggered on repeat visits to the fairy oak at midnight in fairy form,
 * after the initial fairy_oak_midnight cutscene has been completed.
 *
 * Queen Celestia briefly appears and gifts the player a fairy form potion.
 * This cutscene is repeatable (playOnce: false).
 *
 * The potion grant is handled by the cutscene completion handler in App.tsx.
 */

import { CutsceneDefinition } from '../../types';
import { npcAssets, tileAssets } from '../../assets';

// Dark blue → purple radial gradient (reused from main cutscene)
const MIDNIGHT_GRADIENT =
  'radial-gradient(ellipse at 50% 30%, #1a1040 0%, #0d0b2e 40%, #060618 100%)';
const MIDNIGHT_GRADIENT_BRIGHT =
  'radial-gradient(ellipse at 50% 30%, #241550 0%, #120e38 40%, #08071e 100%)';

export const fairyOakMidnightReturnCutscene: CutsceneDefinition = {
  id: 'fairy_oak_midnight_return',
  name: 'Return to the Fairy Queen',
  canSkip: true,
  canReplay: false,
  playOnce: false, // Repeatable — player can get potions each visit

  trigger: {
    type: 'position',
    mapId: 'deep_forest',
    position: { x: 17, y: 18 }, // Same as main cutscene — Giant Fairy Oak
    radius: 5,
  },

  requirements: {
    isFairyForm: true,
    timeRange: { fromHour: 0, toHour: 1 }, // Midnight to 1am
    completedCutscenes: ['fairy_oak_midnight'], // Must have completed the first meeting
  },

  onComplete: {
    action: 'return',
  },

  audio: {
    music: 'music_forest',
    ambient: 'ambient_blizzard',
    ambientVolume: 0.15,
    fadeInMs: 2000,
    fadeOutMs: 2000,
  },

  scenes: [
    // ── Scene 1: The bud stirs ─────────────────────────────────────────
    {
      id: 'bud_awakens',
      backgroundCss: MIDNIGHT_GRADIENT,
      backgroundLayers: [
        {
          image: '../tiles/fairy_oak_summer.png',
          zIndex: 1,
          opacity: 0.3,
          animation: { type: 'static' as const, duration: 0 },
        },
      ],
      characters: [
        {
          characterId: 'celestia_bud',
          spriteUrls: [tileAssets.celestia_flower_bud_01, tileAssets.celestia_flower_bud_02],
          spriteAnimationSpeed: 800,
          position: { x: 50, y: 55 },
          scale: 1.3,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'medium',
        opacity: 0.8,
      },
      dialogue: {
        text: 'The great flower bud at the base of the oak pulses with light as you approach. It recognises you.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1200,
      },
    },

    // ── Scene 2: Celestia appears and greets ───────────────────────────
    {
      id: 'celestia_greets',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [
        {
          image: '../tiles/fairy_oak_summer.png',
          zIndex: 1,
          opacity: 0.5,
          animation: { type: 'static' as const, duration: 0 },
        },
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 45 },
          scale: 1.3,
          entrance: {
            type: 'fade',
            duration: 1500,
          },
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'heavy',
        opacity: 0.9,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'Ah, my little honorary fairy returns. The midnight air suits you well.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 3: Celestia grants potion ────────────────────────────────
    {
      id: 'potion_gift',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      soundEffect: 'sfx_magic_transition',
      backgroundLayers: [
        {
          image: '../tiles/fairy_oak_summer.png',
          zIndex: 1,
          opacity: 0.55,
          animation: { type: 'static' as const, duration: 0 },
        },
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 44 },
          scale: 1.4,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'heavy',
        opacity: 0.9,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: '*She cups her hands together, and a soft glow gathers between them. When she opens them, a small vial rests in her palm.* Here, little one. A drop of fairy magic, distilled beneath the midnight moon.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 4: Farewell ──────────────────────────────────────────────
    {
      id: 'farewell',
      backgroundCss: MIDNIGHT_GRADIENT,
      backgroundLayers: [
        {
          image: '../tiles/fairy_oak_summer.png',
          zIndex: 1,
          opacity: 0.35,
          animation: { type: 'static' as const, duration: 0 },
        },
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 45 },
          scale: 1.3,
          exit: {
            type: 'fade',
            duration: 2000,
          },
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'light',
        opacity: 0.6,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'Use it wisely, dear one. The oak remembers all who shelter beneath it. Until next time...',
      },
      transitionOut: {
        type: 'fade',
        duration: 1500,
      },
    },
  ],
};
