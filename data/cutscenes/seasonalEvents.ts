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
import {
  HARVEST_FEAST_CATCHUP_CUTSCENE_ID,
  HARVEST_FEAST_GATHERING_CUTSCENE_ID,
  HARVEST_FEAST_CLOSING_CUTSCENE_IDS,
  HARVEST_FEAST_DAY,
  HARVEST_FEAST_CATCHUP_RECAP,
  ELIAS_GATHERING_LINE,
  ELIAS_CLOSING_LINES,
} from '../harvestFeast';

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
          image: 'cutscene_spring_background.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.02,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
        {
          image: 'cutscene_spring_middleground.png',
          zIndex: 1,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.05,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
        // Pinned at spring's own scene-2 resting offset — the establishing pan has already
        // happened, so the tree reads as settled rather than mid-reveal
        {
          image: 'cutscene_spring_left.png',
          zIndex: 2,
          offsetX: -20,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'cutscene_spring_right.png',
          zIndex: 3,
          offsetX: 20,
          animation: { type: 'static', duration: 0 },
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
          image: 'cutscene_summer_background.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 7000,
            zoomFrom: 1.08,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
        // Pinned at summer's own scene-2 resting offset — see mayday_greeting above
        {
          image: 'cutscene_summer_front_left.png',
          zIndex: 1,
          offsetX: -20,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'cutscene_summer_front_right.png',
          zIndex: 2,
          offsetX: 20,
          animation: { type: 'static', duration: 0 },
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
          image: 'cutscene_autumn_background.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.02,
            zoomTo: 1.0,
            easing: 'ease-in-out',
          },
        },
        {
          image: 'cutscene_autumn_middleground.png',
          zIndex: 1,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.06,
            zoomTo: 1.0,
            easing: 'ease-in-out',
          },
        },
        // Pinned at the resting offset the real autumn cutscene's foreground drifts to by the
        // end of its two-scene leftward pan — the reveal (and the walk to the mushroom house)
        // has already happened
        {
          image: 'cutscene_autumn_foreground.png',
          zIndex: 2,
          offsetX: -40,
          animation: { type: 'static', duration: 0 },
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
      soundEffect: 'sfx_yule_bells',
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
            duration: 7000,
            zoomFrom: 1.05,
            zoomTo: 1.0,
            easing: 'ease-out',
          },
        },
        // Pinned at winter's own scene-2 resting frame (offsetX -6, scale 1.12) via a
        // zero-duration zoom-hold — the reveal has already happened, so the foreground reads
        // as settled rather than mid-pan
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
// Harvest Feast — morning announcement (day 42 of Autumn, 8am)
// ============================================================================

// Deliberately hour 8, not 9 — harvestFestivalCutscene above already occupies
// hour 9/day 42/autumn, and a distinct hour avoids two cutscenes racing on
// the same trigger tuple rather than relying on registry iteration order.
export const harvestFeastCutscene: CutsceneDefinition = {
  id: 'seasonal_event_harvest_feast_morning',
  name: 'Harvest Feast',
  canSkip: true,
  canReplay: false,
  playOnce: false,
  cooldownMs: FESTIVAL_COOLDOWN_MS,

  trigger: {
    type: 'time',
    hour: 8,
    day: HARVEST_FEAST_DAY,
    season: 'autumn',
  },

  onComplete: { action: 'return' },

  scenes: [
    {
      id: 'harvest_feast_morning',
      backgroundLayers: [
        {
          image: 'cutscene_autumn_background.png',
          zIndex: 0,
          animation: {
            type: 'zoom',
            duration: 6000,
            zoomFrom: 1.02,
            zoomTo: 1.0,
            easing: 'ease-in-out',
          },
        },
        {
          image: 'cutscene_autumn_middleground.png',
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
          // A hand-drawn pumpkin composited as the scene's visual anchor,
          // the same way yule_tree.png stands in for the Yule tree below —
          // both are transparent prop illustrations, not landscape art, so
          // they read best as a positioned "character" rather than a
          // stretched-to-fill background layer.
          characterId: 'harvest_feast_pumpkin',
          spriteUrl: '/TwilightGame/assets-optimized/farming/pumpkin_adult.png',
          position: { x: 24, y: 56 },
          scale: 2.2,
          entrance: { type: 'fade', duration: 800 },
        },
        {
          characterId: 'village_elder',
          spriteUrl: sprites.elder,
          position: { x: 67, y: 50 },
          scale: 1.8,
          entrance: { type: 'slide', from: 'right', duration: 800 },
        },
      ],
      dialogue: {
        speaker: 'Old Man Elias',
        text: "Today's the day! Mind you're back in the village square by evening — we're laying out the Harvest Feast, and there's a place at the table for everyone.",
      },
      transitionOut: { type: 'fade', duration: 1000 },
    },
  ],
};

// ============================================================================
// Harvest Feast — catch-up recap (manual trigger — fired when a player logs
// in after day 42 of Autumn having missed the live event entirely)
// ============================================================================

export const harvestFeastCatchupCutscene: CutsceneDefinition = {
  id: HARVEST_FEAST_CATCHUP_CUTSCENE_ID,
  name: 'Harvest Feast (missed)',
  canSkip: true,
  canReplay: false,
  playOnce: false, // HarvestFeastManager handles the once-per-year check
  cooldownMs: 0,

  trigger: { type: 'manual', id: HARVEST_FEAST_CATCHUP_CUTSCENE_ID },

  onComplete: { action: 'return' },

  scenes: [
    {
      id: 'harvest_feast_catchup',
      backgroundLayers: [
        {
          image: 'cutscene_autumn_background.png',
          zIndex: 0,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'cutscene_autumn_middleground.png',
          zIndex: 1,
          animation: { type: 'static', duration: 0 },
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.5,
      },
      characters: [
        {
          characterId: 'harvest_feast_pumpkin_catchup',
          spriteUrl: '/TwilightGame/assets-optimized/farming/pumpkin_adult.png',
          position: { x: 24, y: 56 },
          scale: 1.8,
          opacity: 0.85,
          entrance: { type: 'fade', duration: 800 },
        },
        {
          characterId: 'village_elder',
          spriteUrl: sprites.elder,
          position: { x: 67, y: 50 },
          scale: 1.8,
          entrance: { type: 'fade', duration: 900 },
        },
      ],
      dialogue: {
        speaker: 'Old Man Elias',
        text: HARVEST_FEAST_CATCHUP_RECAP,
      },
      transitionOut: { type: 'fade', duration: 1000 },
    },
  ],
};

// ============================================================================
// Harvest Feast — gathering speech (manual trigger — fired when villagers
// gather round the table, see HarvestFeastManager.ensureGatheringStarted())
// ============================================================================

export const harvestFeastGatheringCutscene: CutsceneDefinition = {
  id: HARVEST_FEAST_GATHERING_CUTSCENE_ID,
  name: 'Harvest Feast Gathering',
  canSkip: true,
  canReplay: false,
  playOnce: false, // HarvestFeastManager handles the once-per-year check
  cooldownMs: 0,

  trigger: { type: 'manual', id: HARVEST_FEAST_GATHERING_CUTSCENE_ID },

  onComplete: { action: 'return' },

  audio: {
    music: 'music_harvest_feast_gathering',
  },

  scenes: [
    {
      id: 'harvest_feast_gathering',
      backgroundLayers: [
        {
          image: 'cutscene_autumn_background.png',
          zIndex: 0,
          animation: { type: 'static', duration: 0 },
        },
        {
          image: 'cutscene_autumn_middleground.png',
          zIndex: 1,
          animation: { type: 'static', duration: 0 },
        },
      ],
      weatherEffect: {
        type: 'falling_leaves',
        intensity: 'light',
        opacity: 0.5,
      },
      characters: [
        {
          characterId: 'village_elder',
          spriteUrl: sprites.elder,
          position: { x: 50, y: 50 },
          scale: 1.8,
          entrance: { type: 'fade', duration: 800 },
        },
      ],
      dialogue: {
        speaker: 'Old Man Elias',
        text: ELIAS_GATHERING_LINE,
      },
      transitionOut: { type: 'fade', duration: 1000 },
    },
  ],
};

// ============================================================================
// Harvest Feast — closing speech (manual trigger, one per tier — fired when
// the last dish is eaten, see HarvestFeastManager.maybeConclude())
// ============================================================================

function makeHarvestFeastClosingCutscene(tier: 1 | 2 | 3): CutsceneDefinition {
  return {
    id: HARVEST_FEAST_CLOSING_CUTSCENE_IDS[tier],
    name: `Harvest Feast Closing (tier ${tier})`,
    canSkip: true,
    canReplay: false,
    playOnce: false, // HarvestFeastManager handles the once-per-year check
    cooldownMs: 0,

    trigger: { type: 'manual', id: HARVEST_FEAST_CLOSING_CUTSCENE_IDS[tier] },

    onComplete: { action: 'return' },

    scenes: [
      {
        id: `harvest_feast_closing_tier${tier}`,
        backgroundLayers: [
          {
            image: 'cutscene_autumn_background.png',
            zIndex: 0,
            animation: { type: 'static', duration: 0 },
          },
          {
            image: 'cutscene_autumn_middleground.png',
            zIndex: 1,
            animation: { type: 'static', duration: 0 },
          },
        ],
        weatherEffect: {
          type: 'falling_leaves',
          intensity: 'light',
          opacity: 0.5,
        },
        characters: [
          {
            characterId: 'village_elder',
            spriteUrl: sprites.elder,
            position: { x: 50, y: 50 },
            scale: 1.8,
            entrance: { type: 'fade', duration: 800 },
          },
        ],
        dialogue: {
          speaker: 'Old Man Elias',
          text: ELIAS_CLOSING_LINES[tier],
        },
        transitionOut: { type: 'fade', duration: 1000 },
      },
    ],
  };
}

export const harvestFeastClosingCutsceneTier1 = makeHarvestFeastClosingCutscene(1);
export const harvestFeastClosingCutsceneTier2 = makeHarvestFeastClosingCutscene(2);
export const harvestFeastClosingCutsceneTier3 = makeHarvestFeastClosingCutscene(3);

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
        // Pinned at winter's own scene-2 resting frame — see yule_greeting above
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
