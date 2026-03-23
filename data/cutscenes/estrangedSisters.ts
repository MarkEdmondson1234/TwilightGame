/**
 * Estranged Sisters Reunion Cutscene
 *
 * Triggered when the player agrees to help Althea reach the ruins to meet Juniper.
 * Shows the two estranged twin sisters meeting for the first time in fifty years.
 */

import { CutsceneDefinition } from '../../types';

// Ruins background sprites (seasonal variants exist, using spring-summer as default)
const RUINS_BG = '/TwilightGame/assets-optimized/tiles/ruins/ruins_entrance_spring-summer.png';
const RUINS_BG_AUTUMN = '/TwilightGame/assets-optimized/tiles/ruins/ruins_entrance_autumn.png';
const RUINS_BG_WINTER = '/TwilightGame/assets-optimized/tiles/ruins/ruins_entrance_winter.png';

// Character sprites
const JUNIPER_SPRITE = '/TwilightGame/assets/npcs/witch/witch_wolf_01.png';
const ALTHEA_SPRITE = '/TwilightGame/assets-optimized/npcs/old_woman_knitting_01.png';

export const estrangedSistersReunionCutscene: CutsceneDefinition = {
  id: 'estranged_sisters_reunion',
  name: 'The Reunion',
  canSkip: true,
  canReplay: false,
  playOnce: true,

  trigger: {
    type: 'manual',
    id: 'estranged_sisters_reunion',
  },

  onComplete: {
    action: 'return',
  },

  audio: {
    ambient: 'ambient_forest',
    ambientVolume: 0.4,
    fadeInMs: 2000,
    fadeOutMs: 2000,
  },

  scenes: [
    // -------------------------------------------------------------------------
    // Scene 1: The ruins, waiting
    // -------------------------------------------------------------------------
    {
      id: 'ruins_arrival',
      backgroundLayers: [
        {
          image: RUINS_BG,
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 4000,
            zoomFrom: 1.05,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.4,
      },
      dialogue: {
        text: '*The old ruins lie quiet in the afternoon light, moss-covered stones warm from the sun. Somewhere in the trees, a wood pigeon calls.*',
      },
      duration: 4500,
      transitionOut: {
        type: 'fade',
        duration: 600,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 2: Arrival — the sisters see each other
    // -------------------------------------------------------------------------
    {
      id: 'sisters_see_each_other',
      backgroundLayers: [
        {
          image: RUINS_BG,
          zIndex: 0,
          animation: {
            type: 'static',
            duration: 0,
          },
        },
      ],
      characters: [
        {
          characterId: 'witch',
          spriteUrl: JUNIPER_SPRITE,
          position: { x: 18, y: 55 },
          scale: 0.75,
          flipHorizontal: true,
          entrance: {
            type: 'slide',
            duration: 800,
            from: 'left',
          },
        },
        {
          characterId: 'old_woman_knitting',
          spriteUrl: ALTHEA_SPRITE,
          position: { x: 72, y: 58 },
          scale: 0.75,
          entrance: {
            type: 'slide',
            duration: 800,
            from: 'right',
          },
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.3,
      },
      dialogue: {
        speaker: 'Juniper',
        text: '"Althea?"',
        seasonalText: {
          autumn: '"Althea?" *Her voice is barely a whisper.*',
          winter: '"Althea?" *She says it as though she has not said the name aloud in years — perhaps because she has not.*',
        },
      },
      transitionOut: {
        type: 'crossfade',
        duration: 500,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 3: Recognition
    // -------------------------------------------------------------------------
    {
      id: 'recognition',
      backgroundLayers: [
        {
          image: RUINS_BG,
          zIndex: 0,
          animation: {
            type: 'pan',
            duration: 8000,
            panFrom: 'center',
            panTo: 'left',
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'witch',
          spriteUrl: JUNIPER_SPRITE,
          position: { x: 18, y: 55 },
          scale: 0.75,
          flipHorizontal: true,
        },
        {
          characterId: 'old_woman_knitting',
          spriteUrl: ALTHEA_SPRITE,
          position: { x: 72, y: 58 },
          scale: 0.75,
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.3,
      },
      dialogue: {
        speaker: 'Althea',
        text: '"You look just as I remember." *Her voice catches.* "Every single day I\'ve tried to picture your face, and every time I got it right."',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 500,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 4: Juniper's response — the dam breaks
    // -------------------------------------------------------------------------
    {
      id: 'junipers_response',
      backgroundLayers: [
        {
          image: RUINS_BG,
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 8000,
            zoomFrom: 1.0,
            zoomTo: 1.05,
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'witch',
          spriteUrl: JUNIPER_SPRITE,
          position: { x: 18, y: 55 },
          scale: 0.75,
          flipHorizontal: true,
        },
        {
          characterId: 'old_woman_knitting',
          spriteUrl: ALTHEA_SPRITE,
          position: { x: 72, y: 58 },
          scale: 0.75,
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.3,
      },
      dialogue: {
        speaker: 'Juniper',
        text: '"You look... older." *A pause — long enough to hurt.* "You look like Mum." *She turns away. Her shoulders shake once, then are still.*',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 500,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 5: Reconciliation
    // -------------------------------------------------------------------------
    {
      id: 'reconciliation',
      backgroundLayers: [
        {
          image: RUINS_BG,
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 10000,
            zoomFrom: 1.05,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'witch',
          spriteUrl: JUNIPER_SPRITE,
          position: { x: 30, y: 55 },
          scale: 0.75,
          flipHorizontal: true,
        },
        {
          characterId: 'old_woman_knitting',
          spriteUrl: ALTHEA_SPRITE,
          position: { x: 60, y: 58 },
          scale: 0.75,
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.3,
      },
      dialogue: {
        speaker: 'Juniper',
        text: '"I am sorry. For all those years I wasted being stubborn."',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 400,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 6: Althea's reply
    // -------------------------------------------------------------------------
    {
      id: 'althea_forgives',
      backgroundLayers: [
        {
          image: RUINS_BG,
          zIndex: 0,
          animation: {
            type: 'static',
            duration: 0,
          },
        },
      ],
      characters: [
        {
          characterId: 'witch',
          spriteUrl: JUNIPER_SPRITE,
          position: { x: 30, y: 55 },
          scale: 0.75,
          flipHorizontal: true,
        },
        {
          characterId: 'old_woman_knitting',
          spriteUrl: ALTHEA_SPRITE,
          position: { x: 60, y: 58 },
          scale: 0.75,
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.3,
      },
      dialogue: {
        speaker: 'Althea',
        text: '"As am I. We were both so stubborn, dear." *She reaches out her hand.* "We shall keep in touch from now on. No more silences."',
      },
      transitionOut: {
        type: 'crossfade',
        duration: 400,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 7: Juniper's promise
    // -------------------------------------------------------------------------
    {
      id: 'junipers_promise',
      backgroundLayers: [
        {
          image: RUINS_BG,
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 8000,
            zoomFrom: 1.0,
            zoomTo: 1.08,
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'witch',
          spriteUrl: JUNIPER_SPRITE,
          position: { x: 30, y: 55 },
          scale: 0.75,
          flipHorizontal: true,
        },
        {
          characterId: 'old_woman_knitting',
          spriteUrl: ALTHEA_SPRITE,
          position: { x: 60, y: 58 },
          scale: 0.75,
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.3,
      },
      dialogue: {
        speaker: 'Juniper',
        text: '"I would like that very much." *She takes her sister\'s hand. After a long moment, she almost smiles.*',
      },
      transitionOut: {
        type: 'fade',
        duration: 1200,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 8: Closing narration — fade to black
    // -------------------------------------------------------------------------
    {
      id: 'closing',
      backgroundCss: '#111111',
      backgroundLayers: [],
      dialogue: {
        text: 'Some doors, once closed for a very long time, are simply waiting for someone brave enough to knock.',
        autoAdvance: {
          delay: 5000,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1000,
      },
    },
  ],
};

/**
 * Seasonal variant of the cutscene — uses the autumn ruins background.
 * This is the same cutscene but with a different background image; handled
 * by the main cutscene's background layers if season-switching is needed.
 * For now, register the single cutscene definition; upgrade to seasonal
 * scene variants if desired in future.
 */
export { RUINS_BG_AUTUMN, RUINS_BG_WINTER };
