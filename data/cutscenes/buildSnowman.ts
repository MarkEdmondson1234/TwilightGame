/**
 * Build a Snowman Cutscene
 *
 * Triggered by a winter-only dialogue choice with the village child ("the
 * little girl"). Replayable — each play places a new snowman at a random
 * free spot on the village map (see utils/SnowmanManager.ts) and teleports
 * the player there via the App.tsx `build_snowman` completion branch.
 */

import { CutsceneDefinition } from '../../types';

export const buildSnowmanCutscene: CutsceneDefinition = {
  id: 'build_snowman',
  name: 'Building a Snowman',
  canSkip: true,
  canReplay: true,
  playOnce: false, // Can be played every winter, as many times as the player likes

  trigger: {
    type: 'dialogue',
    npcId: 'child',
    nodeId: 'build_snowman',
  },

  onComplete: {
    action: 'return', // No-op here — App.tsx's handleCutsceneComplete places the
    // snowman and teleports the player, since the destination is random
  },

  scenes: [
    {
      id: 'build_snowman_scene',
      backgroundLayers: [
        {
          image: 'cutscene_winter_sky.png',
          zIndex: 0,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'cutscene_winter_village.png',
          zIndex: 1,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'cutscene_winter_background.png',
          zIndex: 2,
          animation: {
            type: 'zoom',
            duration: 8000,
            zoomFrom: 1.06,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
        // Pinned at winter's own resting frame — see seasonChange.ts's winterCutscene
        // scene 2 and seasonalEvents.ts's yule_gathering, which both settle here
        {
          image: 'cutscene_winter_foreground.png',
          zIndex: 3,
          offsetX: -6,
          animation: {
            type: 'zoom',
            duration: 0,
            zoomFrom: 1.12,
            zoomTo: 1.12,
          },
        },
      ],
      weatherEffect: {
        type: 'snow',
        intensity: 'medium',
        opacity: 0.7,
      },
      characters: [
        {
          characterId: 'child',
          spriteUrl: '/TwilightGame/assets/npcs/little_girl.png',
          position: { x: 33, y: 54 },
          scale: 2.0,
          entrance: { type: 'slide', from: 'left', duration: 800 },
        },
        {
          characterId: 'snowman_prop',
          spriteUrl: '/TwilightGame/assets-optimized/seasonal/snowman.png',
          position: { x: 62, y: 58 },
          scale: 0.9,
          entrance: { type: 'fade', duration: 1000 },
        },
      ],
      dialogue: {
        speaker: 'Little Girl',
        text: 'You frolic in the snow with the little girl, until she has to go home. You are quite pleased with your creation.',
      },
      transitionOut: {
        type: 'fade',
        duration: 800,
      },
    },
  ],
};
