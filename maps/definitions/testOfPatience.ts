import { MapDefinition, TileType } from '../../types';
import { parseGrid } from '../gridParser';

/**
 * Test of Patience (fourth trial in the Wizard Trials series)
 *
 * Reached by winning "Test of Agility" (the mine-cart mini-game) — the player
 * is dropped straight into this room, not walked into it, so unlike the
 * antechamber there is no entrance trigger tile, only an exit.
 *
 * Unlike every other trial, this one isn't a puzzle to solve quickly: a
 * single bed of tilled earth and a well sit in an otherwise empty cave floor.
 * A nearby chest gives an unlimited supply of magic bean seeds. The player
 * plants one, waters it from the well, and must wait — across real gameplay
 * time — for it to grow into a giant beanstalk reaching the top of the room.
 *
 * The beanstalk is never harvested (magic_bean has harvestYield: 0 on
 * purpose — see data/crops.ts): reaching maturity is the win condition
 * itself, and it stays standing afterwards to be climbed. Maturing unlocks
 * both the door back to the antechamber AND a new transition at (13,0), the
 * top of the fully-grown stalk. See
 * data/questHandlers/wizardTrialsPatienceHandler.ts for the completion logic
 * and data/eventChains/wizard_trials_patience.yaml for the two-stage chain
 * that gates both transitions.
 *
 * Grid Legend:
 * V = Mine Floor (walkable) - single tile
 * T = Torch - single tile
 * X = Farm plot (fallow soil, global grid code) - the one bed - single tile
 * C = Chest - clickable, gives 1 magic bean seed each click, cannot be picked up - single tile
 * = = Well (global grid code) - 2x2 tiles, extends up+left from the anchor
 * D = Wizard Trials Entrance (floating door - the exit, back to the
 *     antechamber) - ~3.5x3.5 tiles, centred on the anchor
 * S = Stone Column (medium) - 5x5 tiles, extends right+down from the anchor
 */

// 27x15 map
const gridString = `
VVVVVVVVVVVVVVVVVVVVVVVVVVV
VVSVVVSVVVVVVVVVVVVVVSVVVVV
VVTVVVVVVVVVVVVVVVVVVVVVTVV
VVVVVVVVVVVVVVVVVVVVVVVVVVV
VVVVVVVVVVVVVVVVVVVVVVSVVVV
VVVVVVVVVVVVVVVVVVVVVVVVVVV
VSVVVVVVVVVVVVVVVVVVVVVVVVV
VVVVDVVVCVVVVXVVV=VVVVVVVVV
VVVVVVVVVVVVVVVVVVVVVVVVVVV
VVVVVVVVVVVVVVVVVVVVVVSVVVV
VVVVVVVVVVVVVVVVVVVVVVVVVVV
VVVVVVVVVVVVVVVVVVVVSVVVVVV
VVTVVVSVVVVVVSVVVVVVSVVVTVV
VVVVVVVVSVVVVVVVVSVVVVSVVVV
VVVVVVVVVVVVVVVVVVVVVVVVVVV
`;

export const testOfPatience: MapDefinition = {
  id: 'test_of_patience',
  name: 'Test of Patience',
  width: 27,
  height: 15,
  grid: parseGrid(gridString, {
    V: TileType.MINE_FLOOR,
    T: TileType.WALL_TORCH,
    D: TileType.WIZARD_TRIALS_ENTRANCE,
    C: TileType.CHEST,
    S: TileType.STONE_COLUMN_MD,
  }),
  colorScheme: 'lava',
  isRandom: false,
  spawnPoint: { x: 4, y: 10 },
  transitions: [
    {
      fromPosition: { x: 4, y: 7 },
      tileType: TileType.WIZARD_TRIALS_ENTRANCE,
      toMapId: 'wizard_trials',
      toPosition: { x: 12, y: 9 }, // Open floor south of the antechamber's entrance archway
      label: 'Leave the Trial',
      hasDoor: true,
      requiresQuest: 'wizard_trials_patience',
      requiresQuestStage: 2, // 'cleared' — beanstalk matured
    },
    {
      // Top of the fully-grown beanstalk (its sprite's top edge sits exactly
      // at row 0 above the bed at (13,7): offsetY -7 from anchor row 7).
      // No "top of the beanstalk" map exists — climbing it instead plays
      // Mordecai's final judgement cutscene (below), which sends the player
      // to wizard_trials or mums_kitchen depending on their answer.
      fromPosition: { x: 13, y: 0 },
      tileType: TileType.MINE_FLOOR,
      toMapId: 'wizard_trials',
      toPosition: { x: 12, y: 9 },
      label: 'Climb the Beanstalk',
      requiresQuest: 'wizard_trials_patience',
      requiresQuestStage: 2, // 'cleared' — beanstalk matured
      // Mordecai's final judgement plays here instead of a plain transition — its own
      // dialogue choice decides where the player actually ends up (see
      // data/cutscenes/wizardTrials.ts).
      precedingCutsceneId: 'wizard_trials_final_judgement',
    },
  ],
};
