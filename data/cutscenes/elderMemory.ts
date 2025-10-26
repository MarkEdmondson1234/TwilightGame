/**
 * Elder's Memory Cutscene
 *
 * Triggered by dialogue with the Village Elder
 * A nostalgic story from the elder's past
 * Perfect for testing cutscene functionality
 */

import { CutsceneDefinition } from '../../types';

export const elderMemoryCutscene: CutsceneDefinition = {
  id: 'elder_memory',
  name: "Elder's Summer Memory",
  canSkip: true,
  canReplay: true, // Can be replayed for testing
  playOnce: false, // Won't be marked as completed, can trigger repeatedly

  trigger: {
    type: 'dialogue',
    npcId: 'village_elder',
    nodeId: 'summer_memory', // This dialogue node will trigger the cutscene
  },

  onComplete: {
    action: 'return', // Return player to where they were
  },

  scenes: [
    {
      id: 'memory_begins',
      backgroundLayers: [
        // Sky - simple pan
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'pan',
            duration: 10000,
            panFrom: 'left',
            panTo: 'right',
            easing: 'ease-in-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Village Elder',
        text: 'Ah, but I remember a summer long ago... The sky was just as blue, and the clouds drifted by without a care in the world.',
      },
      transitionOut: {
        type: 'fade',
        duration: 800,
      },
    },
    {
      id: 'memory_continues',
      backgroundLayers: [
        // Sky
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 10000,
            zoomFrom: 1.0,
            zoomTo: 1.3,
            easing: 'ease-in',
          },
        },
        // Cherry tree - foreground (solid)
        {
          image: 'summer_just_cherry.PNG',
          zIndex: 1,
          animation: {
            type: 'zoom',
            duration: 10000,
            zoomFrom: 1.0,
            zoomTo: 1.2,
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'village_elder',
          position: { x: 75, y: 65 }, // Bottom RIGHT side
          scale: 0.8, // Much smaller!
          entrance: {
            type: 'fade',
            duration: 1500,
          },
        },
      ],
      dialogue: {
        speaker: 'Village Elder',
        text: 'I was but a young lad then, lying beneath the cherry tree, dreaming of adventures beyond the village. Time moves swiftly, traveller.',
      },
      transitionOut: {
        type: 'fade',
        duration: 800,
      },
    },
    {
      id: 'memory_reflection',
      backgroundLayers: [
        // Sky - zoom out
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 8000,
            zoomFrom: 1.3,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
        // Hills in distance (solid)
        {
          image: 'summer_just_hills.PNG',
          zIndex: 1,
          animation: {
            type: 'zoom',
            duration: 8000,
            zoomFrom: 1.2,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Village Elder',
        text: 'Now here I sit, an old man watching the same sky. The clouds have not changed, but I certainly have. Such is the nature of life, is it not?',
      },
      transitionOut: {
        type: 'fade',
        duration: 1200, // Final fade to black to return to game
      },
    },
  ],
};
