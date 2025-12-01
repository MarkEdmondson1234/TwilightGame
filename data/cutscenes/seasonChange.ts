/**
 * Season Change Cutscenes
 *
 * Triggered automatically when seasons change
 * Show the beauty of each season transition with:
 * - Layered parallax backgrounds
 * - Character appearances
 * - Atmospheric narration
 */

import { CutsceneDefinition } from '../../types';

// Asset paths for cutscene characters (using optimized NPC sprites)
const characterSprites = {
  mum: '/TwilightGame/assets/npcs/mum_01.png',
  littleGirl: '/TwilightGame/assets/npcs/little_girl.png',
  elder: '/TwilightGame/assets/npcs/elderly_01.png',
  cat: '/TwilightGame/assets/npcs/cat/cat_sleeping_01.png',
  dog: '/TwilightGame/assets/npcs/dog_01.png',
  fox: '/TwilightGame/assets/npcs/shop_keeper_fox_01.png',
  bear: '/TwilightGame/assets/npcs/bear/bear_01.png',
  witch: '/TwilightGame/assets/npcs/witch/witch_wolf_01.png',
  morgan: '/TwilightGame/assets/npcs/morgan/morgan_front.png',
};

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
    // Scene 1: Cherry blossoms over the village
    {
      id: 'spring_blossoms',
      backgroundLayers: [
        // Sky layer
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'static',
            duration: 0,
          },
        },
        // Cherry blossom foreground
        {
          image: 'summer_just_cherry.PNG',
          zIndex: 1,
          animation: {
            type: 'pan-and-zoom',
            duration: 7000,
            panFrom: 'top',
            panTo: 'bottom',
            zoomFrom: 1.2,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      weatherEffect: {
        type: 'cherry_blossoms',
        intensity: 'medium',
        opacity: 0.8,
      },
      dialogue: {
        speaker: 'Season Narrator',
        text: 'Spring has arrived! Cherry blossoms dance in the gentle breeze, painting the sky pink.',
        autoAdvance: {
          delay: 4000,
        },
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1000,
      },
    },
    // Scene 2: Characters enjoying the spring
    {
      id: 'spring_village',
      backgroundLayers: [
        {
          image: 'summer_just_green.PNG',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.0,
            zoomTo: 1.15,
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'little_girl',
          spriteUrl: characterSprites.littleGirl,
          position: { x: 25, y: 55 },
          scale: 1.8,
          entrance: {
            type: 'slide',
            from: 'left',
            duration: 800,
          },
        },
        {
          characterId: 'mum',
          spriteUrl: characterSprites.mum,
          position: { x: 70, y: 50 },
          scale: 1.6,
          entrance: {
            type: 'fade',
            duration: 1000,
          },
        },
      ],
      weatherEffect: {
        type: 'cherry_blossoms',
        intensity: 'light',
        opacity: 0.6,
      },
      dialogue: {
        text: 'New life awakens across the land. The villagers emerge from their winter slumber, ready to plant and grow.',
        autoAdvance: {
          delay: 4500,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1200,
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
    // Scene 1: Panoramic summer landscape
    {
      id: 'summer_panorama',
      backgroundLayers: [
        // Sky with clouds
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'static',
            duration: 0,
          },
        },
        // Rolling green hills
        {
          image: 'summer_just_hills.PNG',
          zIndex: 1,
          offsetY: 20,
          animation: {
            type: 'pan',
            duration: 8000,
            panFrom: 'left',
            panTo: 'right',
            easing: 'ease-in-out',
          },
        },
        // Foreground greenery
        {
          image: 'summer_just_green.PNG',
          zIndex: 2,
          offsetY: 30,
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
        text: 'Summer\'s warmth embraces the village. The land bursts with vibrant life beneath endless blue skies.',
        autoAdvance: {
          delay: 4500,
        },
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1000,
      },
    },
    // Scene 2: Village life in summer
    {
      id: 'summer_village',
      backgroundLayers: [
        {
          image: 'summer_just_hill.PNG',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 7000,
            zoomFrom: 1.1,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'elder',
          spriteUrl: characterSprites.elder,
          position: { x: 30, y: 50 },
          scale: 1.5,
          entrance: {
            type: 'fade',
            duration: 800,
          },
        },
        {
          characterId: 'cat',
          spriteUrl: characterSprites.cat,
          position: { x: 65, y: 70 },
          scale: 1.2,
          entrance: {
            type: 'fade',
            duration: 1200,
          },
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'light',
        opacity: 0.9,
      },
      dialogue: {
        text: 'The villagers bask in the long golden days, whilst even the laziest cats find sunny spots to doze.',
        autoAdvance: {
          delay: 4500,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1200,
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
    // Scene 1: Autumn forest
    // TODO: Replace with proper autumn_forest.png when created
    {
      id: 'autumn_forest',
      backgroundLayers: [
        // Sky - reusing summer sky with warm tint applied via CSS could be nice
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: {
            type: 'static',
            duration: 0,
          },
        },
        // Hills - will look like autumn with golden lighting
        // TODO: Create autumn_hills.png with orange/gold foliage
        {
          image: 'summer_just_hills.PNG',
          zIndex: 1,
          offsetY: 15,
          animation: {
            type: 'pan',
            duration: 7000,
            panFrom: 'right',
            panTo: 'left',
            easing: 'ease-in-out',
          },
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'medium',
        opacity: 0.8,
      },
      dialogue: {
        speaker: 'Season Narrator',
        text: 'Autumn arrives in a blaze of gold and crimson. The trees shed their summer garments in graceful spirals.',
        autoAdvance: {
          delay: 4000,
        },
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1000,
      },
    },
    // Scene 2: Harvest time with villagers
    {
      id: 'autumn_harvest',
      backgroundLayers: [
        // TODO: Create autumn_field.png with harvest imagery
        {
          image: 'summer_just_green.PNG',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.0,
            zoomTo: 1.1,
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'fox_shopkeeper',
          spriteUrl: characterSprites.fox,
          position: { x: 25, y: 50 },
          scale: 1.6,
          entrance: {
            type: 'slide',
            from: 'left',
            duration: 900,
          },
        },
        {
          characterId: 'dog',
          spriteUrl: characterSprites.dog,
          position: { x: 70, y: 60 },
          scale: 1.4,
          entrance: {
            type: 'fade',
            duration: 1000,
          },
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.6,
      },
      dialogue: {
        text: 'The harvest season brings abundance and gratitude. Villagers gather the fruits of their labour with joyful hearts.',
        autoAdvance: {
          delay: 4500,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1200,
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
    // Scene 1: Snow-covered landscape
    // TODO: Create winter_sky.png (soft grey/blue winter sky)
    // TODO: Create winter_hills.png (snow-covered hills)
    {
      id: 'winter_snowfall',
      backgroundLayers: [
        // Soft winter sky
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          opacity: 0.7, // Muted for winter feel
          animation: {
            type: 'static',
            duration: 0,
          },
        },
        // TODO: Replace with proper snowy hills
        {
          image: 'summer_just_hills.PNG',
          zIndex: 1,
          offsetY: 10,
          opacity: 0.8,
          animation: {
            type: 'zoom',
            duration: 8000,
            zoomFrom: 1.2,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      weatherEffect: {
        type: 'snow',
        intensity: 'heavy',
        opacity: 0.85,
      },
      dialogue: {
        speaker: 'Season Narrator',
        text: 'Winter\'s peace settles gently over the village. Snowflakes drift like whispered secrets from the sky.',
        autoAdvance: {
          delay: 4000,
        },
      },
      transitionOut: {
        type: 'crossfade',
        duration: 1200,
      },
    },
    // Scene 2: Cosy village life
    {
      id: 'winter_village',
      backgroundLayers: [
        // TODO: Create winter_cottage.png (cosy cottage in snow)
        {
          image: 'summer_just_hill.PNG',
          zIndex: 0,
          opacity: 0.85,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.0,
            zoomTo: 1.1,
            easing: 'ease-in-out',
          },
        },
      ],
      characters: [
        {
          characterId: 'bear',
          spriteUrl: characterSprites.bear,
          position: { x: 30, y: 50 },
          scale: 1.8,
          entrance: {
            type: 'fade',
            duration: 1000,
          },
        },
        {
          characterId: 'witch',
          spriteUrl: characterSprites.witch,
          position: { x: 68, y: 52 },
          scale: 1.5,
          entrance: {
            type: 'slide',
            from: 'right',
            duration: 900,
          },
        },
      ],
      weatherEffect: {
        type: 'snow',
        intensity: 'medium',
        opacity: 0.7,
      },
      dialogue: {
        text: 'The villagers gather by warm hearths, sharing stories and steaming cups of tea. Even the forest creatures find shelter.',
        autoAdvance: {
          delay: 5000,
        },
      },
      transitionOut: {
        type: 'fade',
        duration: 1500,
      },
    },
  ],
};
