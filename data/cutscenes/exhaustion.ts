/**
 * Exhaustion Cutscene
 *
 * Plays when the player runs out of stamina and is brought home.
 * Three scenes:
 *   0. Letterbox bars close — like eyes shutting as the player collapses
 *   1. Bars open to reveal Mum's kitchen — player wakes up on the floor
 *   2. Mum speaks — worried and relieved
 *
 * Repeatable — triggers every time the player exhausts.
 * Completion action transitions the player into mums_kitchen.
 */

import { CutsceneDefinition } from '../../types';

export const exhaustionCutscene: CutsceneDefinition = {
  id: 'exhaustion',
  name: 'Exhaustion',
  canSkip: true,
  canReplay: true,
  playOnce: false,
  cooldownMs: 5000, // Guard against accidental double-trigger

  trigger: { type: 'manual', id: 'exhaustion' },

  onComplete: {
    action: 'transition',
    mapId: 'mums_kitchen',
    position: { x: 8, y: 6 },
  },

  scenes: [
    // Scene 0: Eyes close — bars animate from 0% → 50%, auto-advancing when done
    {
      id: 'exhaustion_collapse',
      letterboxClose: true,
      backgroundCss: 'black',
      backgroundLayers: [],
    },

    // Scene 1: Eyes open — bars animate back to reveal Mum's kitchen
    {
      id: 'exhaustion_wakeup',
      letterboxReveal: true,
      backgroundLayers: [
        {
          image: '/TwilightGame/assets/rooms/home/mums_kitchen.jpeg',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 5000,
            zoomFrom: 1.05,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      dialogue: {
        text: "Blinking, you awake to find yourself lying on the floor of your mother's kitchen...",
      },
      transitionOut: { type: 'crossfade', duration: 800 },
    },

    // Scene 2: Mum speaks — worried, relieved
    {
      id: 'exhaustion_mum',
      backgroundLayers: [
        {
          image: '/TwilightGame/assets/rooms/home/mums_kitchen.jpeg',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.0,
            zoomTo: 1.05,
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'mum',
          spriteUrl: '/TwilightGame/assets/npcs/mum/dialogue/mum_default.png',
          position: { x: 65, y: 50 },
          scale: 1.6,
          entrance: { type: 'fade', duration: 600 },
        },
      ],
      dialogue: {
        speaker: 'Mum',
        text: "You fainted! We're lucky old Elias found you, and brought you back here! You mustn't run yourself ragged, my darling. Please be careful another time!",
      },
      transitionOut: { type: 'fade', duration: 1000 },
    },
  ],
};
