import type { MiniGameDefinition } from '../types';
import { LavaLeapGame } from './LavaLeapGame';
import { LAVA_LEAP_GUIDE_NAME } from '../../utils/npcs/mine/lavaLeapGuide';

export const lavaLeapDefinition: MiniGameDefinition = {
  id: 'lava-leap',
  displayName: 'Lava Leap',
  description:
    'Discover Frost, Wind and Earth, then choose a crystal grotto, mushroom cavern or forge passage.',
  icon: '💎',
  colour: '#9fe9ff',
  component: LavaLeapGame,
  triggers: {
    mapLocation: { mapId: 'wizard_trials', x: 5, y: 8 },
    npcNameMatch: LAVA_LEAP_GUIDE_NAME,
  },
  confirmMessage:
    'Explore Lava Leap? Crystals and safe checkpoints will help you cross the rivers.',
  customBackdrop: true,
};
