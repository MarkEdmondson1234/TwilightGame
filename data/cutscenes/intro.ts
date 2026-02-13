/**
 * Intro Cutscene - Game opening sequence
 *
 * Example cutscene demonstrating:
 * - Multiple scenes with transitions
 * - Character positioning
 * - Animated backgrounds
 * - Dialogue with seasonal variations
 * - Dialogue choices
 */

import { CutsceneDefinition } from '../../types';

export const introCutscene: CutsceneDefinition = {
  id: 'game_intro',
  name: 'Welcome Home',
  canSkip: true,
  canReplay: true,
  playOnce: true, // Only play once per save

  trigger: {
    type: 'manual',
    id: 'game_start',
  },

  onComplete: {
    action: 'transition',
    mapId: 'mums_kitchen',
    position: { x: 7, y: 6 },
  },

  scenes: [
    // Scene 1: Village overview
    {
      id: 'village_overview',
      backgroundLayers: [
        {
          image: 'village_wide.png',
          zIndex: 0,
          animation: {
            type: 'pan',
            duration: 8000,
            panFrom: 'left',
            panTo: 'right',
            easing: 'ease-in-out',
          },
        },
      ],
      dialogue: {
        text: 'Welcome to Twilight Village, a peaceful place where time flows gently with the seasons.',
        seasonalText: {
          spring: 'Welcome to Twilight Village in the springtime, when cherry blossoms paint the sky pink.',
          summer: 'Welcome to Twilight Village in summer, when the sun shines bright and the crops grow tall.',
          autumn: 'Welcome to Twilight Village in autumn, when leaves turn gold and harvests are abundant.',
          winter: 'Welcome to Twilight Village in winter, when snow blankets the land in peaceful silence.',
        },
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1000,
      },
    },

    // Scene 2: Mum greeting
    {
      id: 'mum_greeting',
      backgroundLayers: [
        {
          image: 'cottage_interior.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.0,
            zoomTo: 1.1,
            easing: 'ease-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'mum',
          position: { x: 70, y: 50 },
          scale: 1.8,
          entrance: {
            type: 'fade',
            duration: 800,
          },
        },
        {
          characterId: 'player',
          position: { x: 30, y: 50 },
          scale: 1.5,
          entrance: {
            type: 'slide',
            from: 'left',
            duration: 1000,
          },
        },
      ],
      dialogue: {
        speaker: 'Mum',
        text: 'Welcome home, dear! I\'ve prepared your room upstairs. The village has missed you.',
        choices: [
          {
            text: 'It\'s good to be back, Mum.',
            action: 'continue',
          },
          {
            text: 'Thank you. I\'m excited to get started!',
            action: 'continue',
          },
        ],
      },
      transitionOut: {
        type: 'fade',
        duration: 800,
      },
    },

    // Scene 3: Village elder's advice
    {
      id: 'elder_advice',
      backgroundLayers: [
        {
          image: 'village_square.png',
          zIndex: 0,
          animation: {
            type: 'static',
            duration: 0,
          },
        },
      ],
      characters: [
        {
          characterId: 'village_elder',
          position: { x: 60, y: 50 },
          scale: 1.6,
          entrance: {
            type: 'fade',
            duration: 600,
          },
        },
      ],
      dialogue: {
        speaker: 'Village Elder',
        text: 'The land here is rich and kind to those who tend it. Plant seeds, water them with care, and thou shalt prosper.',
        choices: [
          {
            text: 'I will take good care of the land.',
            action: 'continue',
          },
          {
            text: 'What should I plant first?',
            action: 'continue',
          },
        ],
      },
      transitionOut: {
        type: 'fade',
        duration: 1000,
      },
    },

    // Scene 4: Final scene - exploration begins
    {
      id: 'exploration_begins',
      backgroundLayers: [
        {
          image: 'sunrise.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 5000,
            zoomFrom: 1.2,
            zoomTo: 1.0,
            easing: 'ease-in',
          },
        },
      ],
      dialogue: {
        text: 'Your journey begins now. Explore the village, meet your neighbours, and build your new life in Twilight Village.',
        autoAdvance: {
          delay: 4000,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1500,
      },
    },
  ],
};
