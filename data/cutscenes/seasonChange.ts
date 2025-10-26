/**
 * Season Change Cutscenes
 *
 * Triggered automatically when seasons change
 * Show the beauty of each season transition
 */

import { CutsceneDefinition } from '../../types';

export const springCutscene: CutsceneDefinition = {
  id: 'season_change_spring',
  name: 'Spring Awakening',
  canSkip: true,
  canReplay: false,
  playOnce: false, // Can repeat each year

  trigger: {
    type: 'season_change',
    season: 'spring',
  },

  onComplete: {
    action: 'return',
  },

  scenes: [
    {
      id: 'spring_arrival',
      backgroundLayers: [
        {
          image: 'spring_meadow.png',
          zIndex: 0,
          animation: {
            type: 'pan-and-zoom',
            duration: 6000,
            panFrom: 'bottom',
            panTo: 'top',
            zoomFrom: 1.3,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Season Narrator',
        text: 'Spring has arrived! Cherry blossoms dance in the breeze, and new life awakens across the land.',
        autoAdvance: {
          delay: 3500,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1000,
      },
    },
  ],
};

export const summerCutscene: CutsceneDefinition = {
  id: 'season_change_summer',
  name: 'Summer Warmth',
  canSkip: true,
  canReplay: false,
  playOnce: false,

  trigger: {
    type: 'season_change',
    season: 'summer',
  },

  onComplete: {
    action: 'return',
  },

  scenes: [
    {
      id: 'summer_arrival',
      backgroundLayers: [
        {
          image: 'summer_fields.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 5000,
            zoomFrom: 1.0,
            zoomTo: 1.2,
            easing: 'ease-in-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Season Narrator',
        text: 'Summer\'s warmth embraces the village. Crops grow tall under the sun\'s golden rays.',
        autoAdvance: {
          delay: 3500,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1000,
      },
    },
  ],
};

export const autumnCutscene: CutsceneDefinition = {
  id: 'season_change_autumn',
  name: 'Autumn Harvest',
  canSkip: true,
  canReplay: false,
  playOnce: false,

  trigger: {
    type: 'season_change',
    season: 'autumn',
  },

  onComplete: {
    action: 'return',
  },

  scenes: [
    {
      id: 'autumn_arrival',
      backgroundLayers: [
        {
          image: 'autumn_forest.png',
          zIndex: 0,
          animation: {
            type: 'pan',
            duration: 6000,
            panFrom: 'right',
            panTo: 'left',
            easing: 'ease-in-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Season Narrator',
        text: 'Autumn paints the world in gold and crimson. The harvest season brings abundance and gratitude.',
        autoAdvance: {
          delay: 3500,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1000,
      },
    },
  ],
};

export const winterCutscene: CutsceneDefinition = {
  id: 'season_change_winter',
  name: 'Winter\'s Rest',
  canSkip: true,
  canReplay: false,
  playOnce: false,

  trigger: {
    type: 'season_change',
    season: 'winter',
  },

  onComplete: {
    action: 'return',
  },

  scenes: [
    {
      id: 'winter_arrival',
      backgroundLayers: [
        {
          image: 'winter_village.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 7000,
            zoomFrom: 1.2,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      dialogue: {
        speaker: 'Season Narrator',
        text: 'Winter\'s peace settles over the village. Snow blankets the land in quiet beauty.',
        autoAdvance: {
          delay: 3500,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1000,
      },
    },
  ],
};
