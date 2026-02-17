/**
 * Fairy Oak Midnight Cutscene
 *
 * Triggered when the player is in fairy form, between midnight and 1am,
 * on the deep_forest map, and within 5 tiles of the Giant Fairy Oak.
 *
 * Narrative arc:
 *   1. Dark forest, the oak glows faintly
 *   2. A closed flower bud rests at the oak's roots — Celestia sleeps within
 *   3. The bud stirs and begins to unfurl
 *   4. Queen Celestia emerges in full majesty, the scene brightens
 *   5–8. Extended dialogue: the cycle of death and rebirth, the oak's purpose,
 *        acknowledgement of the player, and a parting gift of wisdom
 *
 * Visual design:
 *   - CSS radial gradient background (dark blue → purple)
 *   - Fairy oak layer fades in gradually (dark silhouette → revealed)
 *   - Fireflies throughout; mist in later scenes
 *   - Background transitions from MIDNIGHT_GRADIENT to MIDNIGHT_GRADIENT_BRIGHT
 *     when Celestia emerges (scene 4+)
 *
 * Plays once per save file.
 */

import { CutsceneDefinition } from '../../types';
import { npcAssets, tileAssets } from '../../assets';

// Shared animation type for background layer helpers
type LayerAnimation = {
  type: 'pan' | 'zoom' | 'static';
  duration: number;
  panFrom?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  panTo?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  zoomFrom?: number;
  zoomTo?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
};

// Dark blue → purple radial gradient for the midnight forest
const MIDNIGHT_GRADIENT =
  'radial-gradient(ellipse at 50% 30%, #1a1040 0%, #0d0b2e 40%, #060618 100%)';
// Slightly brighter variant for when Celestia is revealed
const MIDNIGHT_GRADIENT_BRIGHT =
  'radial-gradient(ellipse at 50% 30%, #241550 0%, #120e38 40%, #08071e 100%)';

// Reusable background layer preset for the fairy oak
const fairyOak = (opacity: number, animation?: LayerAnimation) => ({
  image: '../tiles/fairy_oak_summer.png',
  zIndex: 1,
  opacity,
  animation: animation ?? { type: 'static' as const, duration: 0 },
});

export const fairyOakMidnightCutscene: CutsceneDefinition = {
  id: 'fairy_oak_midnight',
  name: 'The Fairy Queen Appears',
  canSkip: true,
  canReplay: false,
  playOnce: true,

  trigger: {
    type: 'position',
    mapId: 'deep_forest',
    position: { x: 17, y: 18 }, // Giant Fairy Oak anchor
    radius: 5,
  },

  requirements: {
    isFairyForm: true,
    timeRange: { fromHour: 0, toHour: 1 }, // Midnight to 1am
  },

  onComplete: {
    action: 'return',
  },

  audio: {
    music: 'music_forest',
    ambient: 'ambient_blizzard', // Distant wind through the trees
    ambientVolume: 0.15, // Quiet — just a whisper of wind
    fadeInMs: 3000,
    fadeOutMs: 3000,
  },

  scenes: [
    // ── Scene 1: The forest at midnight ──────────────────────────────────
    // Near-black with faint blue tint. The oak is barely visible.
    {
      id: 'midnight_forest',
      backgroundCss: MIDNIGHT_GRADIENT,
      backgroundLayers: [
        fairyOak(0.15, {
          type: 'zoom',
          duration: 12000,
          zoomFrom: 1.0,
          zoomTo: 1.1,
          easing: 'ease-in-out',
        }),
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'light',
        opacity: 0.7,
      },
      dialogue: {
        text: 'The deep forest is utterly still. Above you, the ancient fairy oak rises into the darkness, its branches lost among the stars.',
      },
      transitionOut: {
        type: 'fade',
        duration: 1200,
      },
    },

    // ── Scene 2: The sleeping bud ────────────────────────────────────────
    // The closed flower bud fades in at the roots. Celestia sleeps within.
    {
      id: 'sleeping_bud',
      backgroundCss: MIDNIGHT_GRADIENT,
      backgroundLayers: [fairyOak(0.2)],
      characters: [
        {
          characterId: 'celestia_bud_closed',
          spriteUrls: [tileAssets.celestia_flower_bud_01, tileAssets.celestia_flower_bud_02],
          spriteAnimationSpeed: 1500, // Slow pulse between bud frames
          position: { x: 50, y: 55 },
          scale: 1.3,
          entrance: {
            type: 'fade',
            duration: 2000,
          },
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'medium',
        opacity: 0.8,
      },
      dialogue: {
        text: 'At the base of the oak, cradled between the roots, rests a great flower bud. It pulses faintly with a soft purple light, as though something sleeps within.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1500,
      },
    },

    // ── Scene 3: The bud stirs ───────────────────────────────────────────
    // Frame 2 of the bud — it begins to unfurl.
    {
      id: 'bud_stirs',
      backgroundCss: MIDNIGHT_GRADIENT,
      backgroundLayers: [fairyOak(0.3)],
      characters: [
        {
          characterId: 'celestia_bud_opening',
          spriteUrls: [tileAssets.celestia_flower_bud_01, tileAssets.celestia_flower_bud_02],
          spriteAnimationSpeed: 600, // Faster pulsing — the bud is stirring
          position: { x: 50, y: 55 },
          scale: 1.3,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'heavy',
        opacity: 0.9,
      },
      dialogue: {
        text: 'The petals tremble. A warmth radiates outward, and the fireflies swarm closer, drawn to whatever stirs inside.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1500,
      },
    },

    // ── Scene 4: Celestia emerges ────────────────────────────────────────
    // The scene brightens. The bud fades below as Celestia rises above it.
    {
      id: 'celestia_emerges',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      soundEffect: 'sfx_magic_transition',
      backgroundLayers: [
        fairyOak(0.5, {
          type: 'zoom',
          duration: 8000,
          zoomFrom: 1.05,
          zoomTo: 1.0,
          easing: 'ease-out',
        }),
      ],
      characters: [
        {
          characterId: 'celestia_bud_fading',
          spriteUrl: tileAssets.celestia_flower_bud_02,
          position: { x: 50, y: 70 },
          scale: 0.9,
          opacity: 0.4,
        },
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 48 },
          scale: 0.7, // Starts distant, grows closer across scenes 4→10
          entrance: {
            type: 'fade',
            duration: 2500,
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
        text: '...Ah. A visitor.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 800,
      },
    },

    // ── Scene 5: Celestia in full majesty ────────────────────────────────
    // Background brightens further. She stands alone, regal.
    {
      id: 'celestia_majesty',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [
        fairyOak(0.6, {
          type: 'zoom',
          duration: 12000,
          zoomFrom: 1.0,
          zoomTo: 1.08,
          easing: 'ease-in-out',
        }),
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 47 },
          scale: 0.85,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'heavy',
        opacity: 0.9,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'Do not be afraid, little one. I felt your wings upon the midnight air long before you reached my oak. You carry the blessing of my court — I can taste it.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 6: She speaks of the oak ───────────────────────────────────
    {
      id: 'celestia_oak',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [fairyOak(0.65)],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 46 },
          scale: 1.0,
        },
      ],
      weatherEffect: {
        type: 'mist',
        intensity: 'light',
        opacity: 0.4,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'This oak is older than memory. It stood here when the first fairy opened her eyes, and it will stand when the last one closes hers. Every root, every branch — it remembers.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 7: The cycle of death and rebirth ──────────────────────────
    {
      id: 'celestia_cycle',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [
        fairyOak(0.55, {
          type: 'zoom',
          duration: 10000,
          zoomFrom: 1.08,
          zoomTo: 1.0,
          easing: 'ease-out',
        }),
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 45 },
          scale: 1.15,
        },
      ],
      weatherEffect: {
        type: 'mist',
        intensity: 'medium',
        opacity: 0.5,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'They say I am dead, you know. And they are not entirely wrong. When the last leaf falls, I sleep. The cold takes me, and I dream of nothing at all.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 8: Rebirth ─────────────────────────────────────────────────
    {
      id: 'celestia_rebirth',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [
        fairyOak(0.65, {
          type: 'zoom',
          duration: 10000,
          zoomFrom: 1.0,
          zoomTo: 1.1,
          easing: 'ease-in-out',
        }),
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 44 },
          scale: 1.3,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'heavy',
        opacity: 0.9,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'But when the first flower blooms, I wake. I always wake. That is the way of fairy magic — tied to the seasons, to the earth, to the stubborn insistence of green things that will not stay buried.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 9: She acknowledges the player ─────────────────────────────
    {
      id: 'celestia_acknowledges',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [fairyOak(0.6)],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 43 },
          scale: 1.45,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'medium',
        opacity: 0.8,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'You are not of our kind. And yet here you stand, small as we are, beneath my oak at the midnight hour. My court must think very highly of you indeed.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 10: Parting wisdom ─────────────────────────────────────────
    {
      id: 'celestia_parting',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [
        fairyOak(0.5, {
          type: 'zoom',
          duration: 12000,
          zoomFrom: 1.1,
          zoomTo: 1.0,
          easing: 'ease-out',
        }),
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 42 },
          scale: 1.6,
        },
      ],
      weatherEffect: {
        type: 'mist',
        intensity: 'light',
        opacity: 0.4,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'Remember this, traveller. The forest watches over those who watch over it. When you have need of us — tend to the wild places, and the oak shall answer.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 800,
      },
    },

    // ── Scene 11: Player choice — ask about magic ──────────────────────
    {
      id: 'player_asks_magic',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [fairyOak(0.5)],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 42 },
          scale: 1.6,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'medium',
        opacity: 0.8,
      },
      dialogue: {
        text: 'Queen Celestia regards you with ancient, knowing eyes. The fireflies swirl gently between you.',
        choices: [
          {
            text: 'Can you help me learn magic?',
            nextSceneIndex: 11, // → celestia_no_magic (next scene)
          },
          {
            text: 'Thank you for your wisdom, Your Majesty.',
            nextSceneIndex: 13, // → skip to honorary_fairy scene
          },
        ],
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 12: Celestia cannot grant magic ──────────────────────────
    {
      id: 'celestia_no_magic',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [fairyOak(0.55)],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 42 },
          scale: 1.6,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'light',
        opacity: 0.7,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: '*She smiles, and there is sadness in it.* Alas, little one. I shall gladly name you an honorary fairy — but I cannot give you magic. You are human, and fairy magic does not take root in human hands.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 13: But there is someone who can ─────────────────────────
    {
      id: 'celestia_althea_hint',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [
        fairyOak(0.5, {
          type: 'zoom',
          duration: 10000,
          zoomFrom: 1.0,
          zoomTo: 1.05,
          easing: 'ease-in-out',
        }),
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 42 },
          scale: 1.6,
        },
      ],
      weatherEffect: {
        type: 'mist',
        intensity: 'light',
        opacity: 0.4,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'But there is someone who can help you. In your village, there is an old woman who knits by the cherry tree. Ask her about her sister. If she trusts you enough... she might tell you what you need to know.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 600,
      },
    },

    // ── Scene 14: Honorary fairy and potion promise ────────────────────
    {
      id: 'honorary_fairy',
      backgroundCss: MIDNIGHT_GRADIENT_BRIGHT,
      backgroundLayers: [fairyOak(0.6)],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 43 },
          scale: 1.5,
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'heavy',
        opacity: 0.9,
      },
      dialogue: {
        speaker: 'Queen Celestia',
        text: 'From this night forth, you are one of us — an honorary fairy of the ancient oak. And whenever the midnight hour finds you here beneath my branches, I shall have a fairy form potion waiting for you. You need only ask.',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 800,
      },
    },

    // ── Scene 15: Farewell — Celestia returns to the bud ───────────────
    {
      id: 'celestia_farewell',
      backgroundCss: MIDNIGHT_GRADIENT,
      backgroundLayers: [
        fairyOak(0.3, {
          type: 'zoom',
          duration: 8000,
          zoomFrom: 1.05,
          zoomTo: 1.0,
          easing: 'ease-out',
        }),
      ],
      characters: [
        {
          characterId: 'queen_celestia',
          spriteUrl: npcAssets.celestia,
          position: { x: 50, y: 45 },
          scale: 1.3,
          exit: {
            type: 'fade',
            duration: 2500,
          },
        },
        {
          characterId: 'celestia_bud_returning',
          spriteUrls: [tileAssets.celestia_flower_bud_01, tileAssets.celestia_flower_bud_02],
          spriteAnimationSpeed: 1500,
          position: { x: 50, y: 55 },
          scale: 1.3,
          entrance: {
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
        text: 'Go well, little fairy. The oak remembers all who shelter beneath it.',
      },
      transitionOut: {
        type: 'fade',
        duration: 2000,
      },
    },
  ],
};
