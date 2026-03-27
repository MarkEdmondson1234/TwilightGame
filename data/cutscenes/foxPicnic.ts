/**
 * Mr Fox's Picnic Cutscene
 *
 * A two-frame romance cutscene triggered when the player gives Mr Fox
 * the filled picnic basket. Shows the picnic with Spring Periwinkle.
 */

import { CutsceneDefinition } from '../../types';

const MEADOW = '/TwilightGame/assets/cutscenes/picnic_meadow.jpg';
const SCENE1 = '/TwilightGame/assets/cutscenes/fox_picnic1.png';
const SCENE2 = '/TwilightGame/assets/cutscenes/fox_picnic2.png';

export const foxPicnicCutscene: CutsceneDefinition = {
  id: 'fox_picnic',
  name: "Mr Fox's Picnic",
  canSkip: true,
  canReplay: true,
  playOnce: false,

  trigger: {
    type: 'manual',
    id: 'fox_picnic',
  },

  onComplete: {
    action: 'return',
  },

  audio: {
    ambient: 'ambient_village',
    ambientVolume: 0.35,
    fadeInMs: 1500,
    fadeOutMs: 1500,
  },

  scenes: [
    // -------------------------------------------------------------------------
    // Scene 1: The meadow — afternoon light
    // -------------------------------------------------------------------------
    {
      id: 'picnic_scene1',
      backgroundLayers: [
        {
          image: MEADOW,
          zIndex: 0,
          animation: { type: 'static', duration: 5000 },
        },
        {
          image: SCENE1,
          zIndex: 1,
          backgroundSize: 'contain',
          animation: {
            type: 'static',
            duration: 5000,
          },
        },
      ],
      dialogue: {
        text: '*The afternoon sun falls golden on the meadow. A blanket is spread between the wildflowers, a basket open beside it.*',
      },
      duration: 5500,
      transitionOut: {
        type: 'crossfade',
        duration: 800,
      },
    },

    // -------------------------------------------------------------------------
    // Scene 2: Mr Fox finds the words
    // -------------------------------------------------------------------------
    {
      id: 'picnic_scene2',
      backgroundLayers: [
        {
          image: MEADOW,
          zIndex: 0,
          animation: { type: 'static', duration: 7000 },
        },
        {
          image: SCENE2,
          zIndex: 1,
          backgroundSize: 'contain',
          animation: {
            type: 'static',
            duration: 7000,
          },
        },
      ],
      dialogue: {
        text: 'And for once, Mr Fox finds exactly the right words.',
      },
      duration: 7500,
      transitionOut: {
        type: 'fade',
        duration: 1200,
      },
    },
  ],
};
