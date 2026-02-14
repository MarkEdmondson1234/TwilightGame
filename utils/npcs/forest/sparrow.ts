/**
 * Sparrow NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';
import { Z_SPRITE_FOREGROUND } from '../../../zIndex';

/**
 * Create a Sparrow NPC (small forest bird with takeoff/flight/landing cycle)
 *
 * Behavior:
 * - Sits on the ground, takes off, flies around, lands again
 * - 4-state animation cycle: sitting → takeoff → roaming → landing
 * - Landing animation is the takeoff sequence in reverse
 * - No collision (player can walk through)
 * - Flips horizontally when flying left (no moonwalking)
 *
 * Uses createWanderingNPC factory with multi-state animation.
 *
 * @param id Unique ID for this sparrow
 * @param position Starting position
 * @param name Optional name (defaults to "Sparrow")
 */
export function createSparrowNPC(
  id: string,
  position: Position,
  name: string = 'Sparrow'
): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.sparrow_sitting,
    portraitSprite: npcAssets.sparrow_portrait,
    scale: 1.5,
    interactionRadius: 1.0,
    zIndexOverride: Z_SPRITE_FOREGROUND + 10, // Render above trees — bird flies at canopy level
    initialState: 'sitting',
    states: {
      sitting: {
        sprites: [npcAssets.sparrow_sitting],
        animationSpeed: 1500,
        duration: 10000,
        nextState: 'takeoff',
      },
      takeoff: {
        sprites: [
          npcAssets.sparrow_takeoff_01,
          npcAssets.sparrow_takeoff_02,
          npcAssets.sparrow_takeoff_03,
          npcAssets.sparrow_takeoff_04,
        ],
        animationSpeed: 200,
        duration: 800,
        nextState: 'roaming',
      },
      roaming: {
        sprites: [
          npcAssets.sparrow_flight_wings_up,
          npcAssets.sparrow_flight_wings_down,
        ],
        animationSpeed: 400,
        duration: 4000,
        nextState: 'landing',
      },
      landing: {
        sprites: [
          npcAssets.sparrow_takeoff_04,
          npcAssets.sparrow_takeoff_03,
          npcAssets.sparrow_takeoff_02,
          npcAssets.sparrow_takeoff_01,
        ],
        animationSpeed: 200,
        duration: 800,
        nextState: 'sitting',
      },
    },
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*The sparrow tilts its head at you, chirping softly. It seems quite unafraid.*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            '*The sparrow hops about, pecking at seeds amongst the spring wildflowers. It chirps a cheerful little melody.*',
          summer:
            '*The sparrow ruffles its feathers in the warm breeze, basking contentedly in a patch of sunlight.*',
          autumn:
            '*The sparrow fluffs up against the autumn chill, its feathers puffed out like a tiny round ball. Rather endearing.*',
          winter:
            '*The sparrow huddles on a low branch, feathers fluffed against the cold. It watches you with bright, hopeful eyes.*',
        },
        responses: [
          { text: 'Offer some crumbs.' , nextId: 'approach' },
          { text: 'Leave it be.' },
        ],
      },
      {
        id: 'approach',
        text: '*The sparrow hops closer, pecking delicately at the ground near your feet. It chirps once — a tiny thank you — before fluttering away.*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            '*The sparrow sings a bright spring song as it picks at the crumbs. The forest seems to hum along.*',
          summer:
            '*The sparrow takes the offering gratefully, then flits to a sunny branch to eat in comfort.*',
          autumn:
            '*The sparrow stuffs its beak greedily — storing up for the colder months ahead, no doubt.*',
          winter:
            '*The sparrow gobbles the crumbs eagerly. In winter, every morsel counts. It chirps its thanks.*',
        },
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: '*cheep cheep!* Oh my, you speak Bird? How delightful! Not many big folk bother to learn.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'What do you do all day?', nextId: 'beast_activities' },
          { text: 'Know any good gossip?', nextId: 'beast_gossip' },
        ],
      },
      {
        id: 'beast_activities',
        text: "*chirp* Oh, the usual — seeds, worms, a good dust bath. And singing! We sparrows are tremendous singers, you know. The nightingale gets all the credit, but we've got *range*.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Any gossip?', nextId: 'beast_gossip' },
          { text: 'You do sing beautifully.', nextId: 'beast_thanks' },
        ],
      },
      {
        id: 'beast_gossip',
        text: "*hops excitedly* Well! The crows say there's something strange in the old ruins. And the robins won't stop going on about the witch's garden — apparently she grows the most magnificent sunflower seeds!",
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_thanks',
        text: "*puffs up proudly* Why, thank you! You're welcome to join the dawn chorus any time. We start at half four, mind — no lie-ins!",
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 3,
    },
  });
}
