/**
 * Possum NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Possum NPC - a shy forest creature that plays dead when approached
 *
 * Behaviour:
 * - Wanders through forest areas
 * - Alternates between walking (GIF) and sitting (PNG)
 * - When player comes within 2 tiles, plays dead
 * - Recovers when player moves 3.5+ tiles away
 * - Only one-sided sprites (faces left), uses reverseFlip
 *
 * Uses createWanderingNPC factory with proximity-triggered state machine.
 *
 * @param id Unique ID for this possum
 * @param position Starting position
 * @param name Optional name (defaults to "Possum")
 */
export function createPossumNPC(id: string, position: Position, name: string = 'Possum'): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Right,
    sprite: npcAssets.possum_walking_01,
    portraitSprite: npcAssets.possum_portrait,
    scale: 2.5, // Small forest creature
    interactionRadius: 1.5,
    // Sprite naturally faces right, so use standard flip logic (flip when moving left)
    initialState: 'roaming',
    states: {
      roaming: {
        sprites: [
          npcAssets.possum_walking_01,
          npcAssets.possum_walking_02,
          npcAssets.possum_walking_03,
        ],
        animationSpeed: 200, // Quick scurrying animation for a nimble creature
        duration: 4000, // Walk for 4 seconds
        nextState: 'sitting',
        proximityTrigger: {
          radius: 2,
          triggerState: 'playing_dead',
          recoveryRadius: 3.5,
          recoveryState: 'roaming',
          recoveryDelay: 500,
        },
      },
      sitting: {
        sprites: [npcAssets.possum_sitting],
        animationSpeed: 1000,
        duration: 3000, // Sit for 3 seconds
        nextState: 'roaming',
        proximityTrigger: {
          radius: 2,
          triggerState: 'playing_dead',
          recoveryRadius: 3.5,
          recoveryState: 'sitting',
          recoveryDelay: 500,
        },
      },
      playing_dead: {
        sprites: [npcAssets.possum_dead],
        animationSpeed: 1000,
        // No duration/nextState - waits for player to leave
        // Recovery handled by proximity trigger in roaming/sitting states
      },
    },
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*The possum lies perfectly still, not moving a muscle. Is it... alive?*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            '*The possum lies motionless among the spring flowers. It looks very convincingly dead.*',
          summer:
            '*Despite the summer heat, the possum lies perfectly still. Remarkable dedication!*',
          autumn:
            '*The possum lies among fallen leaves, nearly invisible. Its little chest rises ever so slightly...*',
          winter: '*The possum is curled up in the snow, looking like a small, furry snowdrift.*',
        },
        responses: [{ text: 'Poke it gently.', nextId: 'poke' }, { text: 'Leave it alone.' }],
      },
      {
        id: 'poke',
        text: '*The possum remains absolutely still. You could swear you saw one eye twitch, but perhaps it was your imagination.*',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      // Beast Tongue dialogue (with potion active)
      {
        id: 'beast_greeting',
        text: '*whispers without moving* "Please go away. I\'m very dead right now."',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I know you're not dead.", nextId: 'beast_caught' },
          { text: "Okay, I'll leave you be.", nextId: 'beast_thanks' },
        ],
      },
      {
        id: 'beast_caught',
        text: `*cracks one eye open* "Well, this is embarrassing. It usually works on the bigger creatures. Promise you won't eat me?"`,
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'I promise!', nextId: 'beast_relief' },
          { text: 'Why do you do that?', nextId: 'beast_explain' },
        ],
      },
      {
        id: 'beast_relief',
        text: `*slowly uncurls* "Oh, what a relief! You seem nice. Most things that approach me want to make me into dinner. I'm rather stringy, if I'm honest."`,
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_explain',
        text: `"It's an old family tradition! My great-great-grandmother discovered that most predators lose interest in things that smell dead. Very effective, usually." *sniffs* "Though some still try to take a bite first..."`,
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_thanks',
        text: '*maintains perfect stillness but whispers* "Thank you, kind human. You are a credit to your species. Now if you could just... wander away... that would be lovely."',
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
