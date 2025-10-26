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
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'pan-and-zoom',
            duration: 10000, // Slower, more contemplative
            panFrom: 'left',
            panTo: 'right',
            zoomFrom: 1.0,
            zoomTo: 2.2, // Dramatic zoom (300 DPI can handle it!)
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
        duration: 0, // Instant cut - keeps camera moving!
      },
    },
    {
      id: 'memory_continues',
      backgroundLayers: [
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'pan-and-zoom',
            duration: 8000,
            panFrom: 'right',
            panTo: 'left', // Pan back across the sky
            zoomFrom: 2.2,
            zoomTo: 1.5, // Zoom out but stay close
            easing: 'ease-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Village Elder',
        text: 'I was but a young lad then, lying beneath the cherry tree, dreaming of adventures beyond the village. Time moves swiftly, traveller.',
      },
      transitionOut: {
        type: 'fade',
        duration: 0, // Instant cut
      },
    },
    {
      id: 'memory_reflection',
      backgroundLayers: [
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 5000,
            zoomFrom: 1.5,
            zoomTo: 1.0, // Final slow zoom out to reveal full sky
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
        duration: 1000, // Final fade to black to return to game
      },
    },
  ],
};
