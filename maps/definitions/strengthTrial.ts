import { MapDefinition, TileType, RoomLayer } from '../../types';
import { parseGrid } from '../gridParser';
import { Z_PARALLAX_FAR } from '../../zIndex';

/**
 * Strength Trial - Background Image Interior
 *
 * Second trial in the Wizard Trials series. The player lands here immediately
 * on winning "Test of Wits" (the sliding-crate-puzzle mini-game), and can
 * leave once all six boulders blocking the door art are cleared. The exit
 * transition itself is a separate tile at (13,7) rather than the doorway art
 * at (7,4) — that doorway is the entry point for "Test of Agility" (see
 * minigames/test-of-agility/definition.ts), a mapLocation trigger rather than
 * a Transition, and sharing one tile for both meanings was confusing.
 *
 * Boulder-clearing mechanic (click to remove, costs stamina, resets on
 * exhaustion) is handled by:
 *  - utils/boulderInteractions.ts (click detection)
 *  - data/questHandlers/wizardTrialsStrengthHandler.ts (progress/state)
 *  - hooks/useInteractionController.ts (click wiring)
 *
 * Image dimensions: 1920x1080 pixels
 * Grid is 15x9 tiles, following the same halved-scale convention as
 * maps/definitions/seedShed.ts.
 *
 * Walkmesh Grid Legend:
 * . = Floor (walkable)
 * # = Wall/Obstacle (solid)
 * D = Door (transition) — the "Leave the Trial" exit at (13,7), per F3
 *     calibration. Not the doorway art at (7,4) — see above.
 *
 * The grid is invisible - only used for collision!
 */

// 15 columns x 9 rows
// Rows 0-3: back wall (solid — matches how far up the stone wall art actually
// extends; walkable floor doesn't start until row 4)
// Rows 4-7: open floor where the boulders sit and the player walks. The
// door-shaped art at (7,4) is where the trial continues onward — the
// mapLocation trigger for "Test of Agility" (not a Transition); the actual
// "Leave the Trial" exit sits apart from it at (13,7), so the two aren't confused.
// Row 8: front wall (base trim)
const gridString = `
###############
###############
###############
###############
...............
...............
...............
.............D.
###############
`;

const strengthTrialLayers: RoomLayer[] = [
  // Background image (stone chamber with door on the back wall)
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/strengthTrial/strength_trial.png',
    zIndex: Z_PARALLAX_FAR, // -100: Behind everything
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960, // Using half dimensions like the seed shed (actual image is 1920x1080)
    height: 540,
    scale: 1.3,
    centered: true,
  },
  // Boulder overlays — hidden once cleared. Boulder 0 is the big one covering
  // the door; 1-2 are medium; 3-5 are small (see BOULDER_TIERS in the handler).
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/strengthTrial/strength_trial_boulder1.png',
    zIndex: Z_PARALLAX_FAR + 1,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'boulder', boulderId: 0, showWhen: 'not_cleared' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/strengthTrial/strength_trial_boulder2.png',
    zIndex: Z_PARALLAX_FAR + 2,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'boulder', boulderId: 1, showWhen: 'not_cleared' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/strengthTrial/strength_trial_boulder3.png',
    zIndex: Z_PARALLAX_FAR + 2,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'boulder', boulderId: 2, showWhen: 'not_cleared' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/strengthTrial/strength_trial_boulder4.png',
    zIndex: Z_PARALLAX_FAR + 3,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'boulder', boulderId: 3, showWhen: 'not_cleared' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/strengthTrial/strength_trial_boulder5.png',
    zIndex: Z_PARALLAX_FAR + 3,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'boulder', boulderId: 4, showWhen: 'not_cleared' },
  },
  {
    type: 'image',
    image: '/TwilightGame/assets-optimized/rooms/strengthTrial/strength_trial_boulder6.png',
    zIndex: Z_PARALLAX_FAR + 3,
    parallaxFactor: 1.0,
    opacity: 1.0,
    width: 960,
    height: 540,
    scale: 1.3,
    centered: true,
    condition: { type: 'boulder', boulderId: 5, showWhen: 'not_cleared' },
  },
];

export const strengthTrial: MapDefinition = {
  id: 'strength_trial',
  name: 'Strength Trial',
  width: 15,
  height: 9,
  grid: parseGrid(gridString),
  colorScheme: 'cave',
  isRandom: false,
  spawnPoint: { x: 1, y: 7 }, // Floor, per F3 calibration
  renderMode: 'background-image',
  characterScale: 2.2,

  referenceViewport: { width: 1280, height: 720 },

  layers: strengthTrialLayers,

  transitions: [
    {
      fromPosition: { x: 13, y: 7 }, // Separate exit, apart from the "onward" doorway art at (7,4)
      tileType: TileType.DOOR,
      toMapId: 'wizard_trials',
      toPosition: { x: 12, y: 9 }, // Open floor south of the antechamber's entrance archway
      label: 'Leave the Trial',
      hasDoor: true,
      requiresQuest: 'wizard_trials_strength',
      requiresQuestStage: 2, // 'cleared' stage — all six boulders removed
    },
  ],
};
