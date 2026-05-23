import { NPC } from '../../types';
import { npcAssets } from '../../assets';
import { createStaticNPC } from './createNPC';
import { Position } from '../../types';

export function createGoddessOfEyesNPC(id: string, position: Position): NPC {
  return createStaticNPC({
    id,
    name: 'Goddess of Eyes',
    position,
    sprite: npcAssets.goddess_of_eyes_open,
    scale: 4.5,
    states: {
      idle: {
        sprites: [
          ...Array(14).fill(npcAssets.goddess_of_eyes_open), // ~3.5s eyes open
          npcAssets.goddess_of_eyes_closed,                   // blink
        ],
        animationSpeed: 250,
      },
    },
    initialState: 'idle',
    glow: {
      color: 0xffffff, // Pure white
      radius: 3.2,
      dayIntensity: 0.1,
      nightIntensity: 0.35,
      pulseSpeed: 3000,
    },
    hover: {
      amplitude: 0.12, // gentle float (~8px at TILE_SIZE=64)
      frequency: 4000, // 4-second cycle — slow, ethereal
    },
    dialogue: [
      { id: 'default', text: '...', responses: [] },
    ],
  });
}
