/**
 * Seasonal Event Cutscenes
 *
 * Four annual festival cutscenes, each playing at 9am on day 42 of their season
 * (mid-season). A village character delivers a short line celebrating the day,
 * and a seasonal decoration is placed in the village square by SeasonalEventManager.
 *
 * Festivals:
 *   Spring  day 42 — Mayday        (the Village Child)
 *   Summer  day 42 — Summer Solstice (the Old Woman Knitting)
 *   Autumn  day 42 — Harvest Festival (the Shopkeeper Fox)
 *   Winter  day 42 — Yule          (the Village Elder)
 */

import { CutsceneDefinition } from '../../types';
import { YULE_CUTSCENE_ID } from '../yuleCelebration';

// NPC sprite paths (reused from seasonChange.ts for consistency)
const sprites = {
  child: '/TwilightGame/assets/npcs/little_girl.png',
  oldWoman: '/TwilightGame/assets-optimized/npcs/old_woman_knitting_01.png',
  fox: '/TwilightGame/assets/npcs/shop_keeper_fox_01.png',
  elder: '/TwilightGame/assets/npcs/elderly_01.png',
};

// Cooldown: 24 real hours. One game season = ~1 real week, so this safely
// prevents retrigger within the same hour while allowing replay next year.
const FESTIVAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Spring — Mayday
// ============================================================================

export const maydayCutscene: CutsceneDefinition = {
  id: 'seasonal_event_mayday',
  name: 'Mayday',
  canSkip: true,
  canReplay: false,
  playOnce: false,
  cooldownMs: FESTIVAL_COOLDOWN_MS,

  trigger: {
    type: 'time',
    hour: 9,
    day: 42,
    season: 'spring',
  },

  onComplete: { action: 'return' },

  scenes: [
    {
      id: 'mayday_greeting',
      backgroundLayers: [
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'summer_just_cherry.PNG',
          zIndex: 1,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.05,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      weatherEffect: {
        type: 'cherry_blossoms',
        intensity: 'light',
        opacity: 0.7,
      },
      characters: [
        {
          characterId: 'child',
          spriteUrl: sprites.child,
          position: { x: 50, y: 52 },
          scale: 2.0,
          entrance: { type: 'slide', from: 'left', duration: 700 },
        },
      ],
      dialogue: {
        speaker: 'Village Child',
        text: "Oh, yay! I can't believe it's Mayday! I love all the singing and dancing! Spring is my favourite season!",
      },
      transitionOut: { type: 'fade', duration: 1000 },
    },
  ],
};

// ============================================================================
// Summer — Summer Solstice
// ============================================================================

export const summerSolsticeCutscene: CutsceneDefinition = {
  id: 'seasonal_event_summer_solstice',
  name: 'Summer Solstice',
  canSkip: true,
  canReplay: false,
  playOnce: false,
  cooldownMs: FESTIVAL_COOLDOWN_MS,

  trigger: {
    type: 'time',
    hour: 9,
    day: 42,
    season: 'summer',
  },

  onComplete: { action: 'return' },

  scenes: [
    {
      id: 'solstice_greeting',
      backgroundLayers: [
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'summer_just_green.PNG',
          zIndex: 1,
          animation: {
            type: 'zoom',
            duration: 7000,
            zoomFrom: 1.08,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      weatherEffect: {
        type: 'fireflies',
        intensity: 'light',
        opacity: 0.5,
      },
      characters: [
        {
          characterId: 'old_woman_knitting',
          spriteUrl: sprites.oldWoman,
          position: { x: 50, y: 50 },
          scale: 1.8,
          entrance: { type: 'fade', duration: 900 },
        },
      ],
      dialogue: {
        speaker: 'Old Woman',
        text: "My, my — if it isn't the summer solstice today! Did you know that witches celebrate this night as holy? For that is when nature is at its most potent, and the air is full of magic. If you believe in that sort of thing, that is...",
      },
      transitionOut: { type: 'fade', duration: 1000 },
    },
  ],
};

// ============================================================================
// Autumn — Harvest Festival
// ============================================================================

export const harvestFestivalCutscene: CutsceneDefinition = {
  id: 'seasonal_event_harvest_festival',
  name: 'Harvest Festival',
  canSkip: true,
  canReplay: false,
  playOnce: false,
  cooldownMs: FESTIVAL_COOLDOWN_MS,

  trigger: {
    type: 'time',
    hour: 9,
    day: 42,
    season: 'autumn',
  },

  onComplete: { action: 'return' },

  scenes: [
    {
      id: 'harvest_greeting',
      backgroundLayers: [
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'summer_just_green.PNG',
          zIndex: 1,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.06,
            zoomTo: 1.0,
            easing: 'ease-in-out',
          },
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.7,
      },
      characters: [
        {
          characterId: 'fox_shopkeeper',
          spriteUrl: sprites.fox,
          position: { x: 50, y: 50 },
          scale: 1.8,
          entrance: { type: 'slide', from: 'right', duration: 800 },
        },
      ],
      dialogue: {
        speaker: 'Shopkeeper',
        text: "Ah, the harvest festival is upon us! Every barn and larder brimming with nature's finest bounty! Truly, a most auspicious day!",
      },
      transitionOut: { type: 'fade', duration: 1000 },
    },
  ],
};

// ============================================================================
// Winter — Yule
// ============================================================================

export const yuleCutscene: CutsceneDefinition = {
  id: 'seasonal_event_yule',
  name: 'Yule',
  canSkip: true,
  canReplay: false,
  playOnce: false,
  cooldownMs: FESTIVAL_COOLDOWN_MS,

  trigger: {
    type: 'time',
    hour: 9,
    day: 42,
    season: 'winter',
  },

  onComplete: { action: 'return' },

  scenes: [
    {
      id: 'yule_greeting',
      backgroundLayers: [
        {
          image: 'summer_sky_cutscene.png',
          zIndex: 0,
          opacity: 0.6,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'summer_just_hills.PNG',
          zIndex: 1,
          opacity: 0.75,
          animation: {
            type: 'zoom',
            duration: 7000,
            zoomFrom: 1.1,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
      ],
      weatherEffect: {
        type: 'snow',
        intensity: 'light',
        opacity: 0.6,
      },
      characters: [
        {
          characterId: 'yule_tree',
          spriteUrl: '/TwilightGame/assets-optimized/seasonal/yule_tree.png',
          position: { x: 25, y: 52 },
          scale: 2.52,
          entrance: { type: 'fade', duration: 800 },
        },
        {
          characterId: 'village_elder',
          spriteUrl: sprites.elder,
          position: { x: 67, y: 52 },
          scale: 1.8,
          entrance: { type: 'fade', duration: 1000 },
        },
      ],
      dialogue: {
        speaker: 'Village Elder',
        text: "Ah, Yule — the longest night of the year. From this moment, darkness retreats and the light returns, day by day. Gather close, friend. Warmth and good cheer to all who shelter from the cold tonight.",
      },
      transitionOut: { type: 'fade', duration: 1200 },
    },
  ],
};

// ============================================================================
// Yule Celebration Opening (manual trigger — fired when player clicks the tree)
// ============================================================================

export const yuleCelebrationOpeningCutscene: CutsceneDefinition = {
  id: YULE_CUTSCENE_ID,
  name: 'Yule Celebration',
  canSkip: true,
  canReplay: false,
  playOnce: false, // YuleCelebrationManager handles the once-per-year check
  cooldownMs: 0,

  trigger: { type: 'manual', id: YULE_CUTSCENE_ID },

  onComplete: { action: 'return' },

  scenes: [
    {
      id: 'yule_gathering',
      backgroundLayers: [
        {
          image: '/TwilightGame/assets/cutscenes/summer_sky_cutscene.png',
          zIndex: 0,
          opacity: 0.45,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: '/TwilightGame/assets/cutscenes/summer_just_hills.PNG',
          zIndex: 1,
          opacity: 0.65,
          animation: {
            type: 'zoom',
            duration: 8000,
            zoomFrom: 1.12,
            zoomTo: 1.0,
            easing: 'ease-out',
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
          characterId: 'yule_tree_celebration',
          spriteUrl: '/TwilightGame/assets-optimized/seasonal/yule_tree.png',
          position: { x: 50, y: 48 },
          scale: 2.8,
          entrance: { type: 'fade', duration: 1000 },
        },
      ],
      dialogue: {
        speaker: 'Village Elder',
        text: "The village square fills with warmth and laughter. Voices rise in old Yule songs, gifts are exchanged with joy, and for one glowing evening, the darkness of winter feels very far away indeed.",
      },
      transitionOut: { type: 'fade', duration: 1500 },
    },
  ],
};
