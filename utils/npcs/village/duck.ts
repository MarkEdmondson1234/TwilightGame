/**
 * Duck NPC Factory Function
 *
 * A duck that appears near the pond in spring.
 */

import { NPC, NPCBehavior, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createNPC } from '../createNPC';

/**
 * Create a Duck NPC (pond creature that appears in spring)
 *
 * Behavior:
 * - Wanders near water/ponds
 * - Gentle paddling animation
 * - Seasonal appearance (spring only)
 * - Simple, cheerful duck dialogue
 *
 * Uses the createNPC factory with animated states and visibility conditions.
 *
 * @param id Unique ID for this duck
 * @param position Starting position (should be near water)
 * @param name Optional name (defaults to "Duck")
 */
export function createDuckNPC(id: string, position: Position, name: string = 'Duck'): NPC {
  return createNPC({
    id,
    name,
    position,
    behavior: NPCBehavior.WANDER,
    sprite: npcAssets.duck_01,
    portraitSprite: npcAssets.duck_portrait,
    scale: 2.5, // Small pond creature
    states: {
      roaming: {
        sprites: [npcAssets.duck_01, npcAssets.duck_02],
        animationSpeed: 500, // Gentle paddling animation (500ms per frame)
      },
    },
    initialState: 'roaming',
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*Quack! Quack!* The duck waddles closer, looking at you with bright, curious eyes.',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            '*Quack quack!* The duck seems especially happy in the spring sunshine, splashing playfully in the pond.',
          summer:
            '*Quack...* The duck looks a bit warm. Perhaps it will return when the weather cools.',
          autumn: '*Quack?* The duck seems to be preparing to fly south for winter.',
          winter: '*This duck has flown south for the winter and will return in spring.*',
        },
        weatherText: {
          rain: '*Quack quack quack!* The duck is absolutely delighted by the rain, splashing about with pure joy!',
          snow: '*The duck has flown south for winter. It will return when the snow melts.*',
          fog: '*Quack?* The duck peers through the mist, a bit confused but still cheerful.',
          mist: '*Quack!* The duck glides through the misty water like a graceful ghost.',
        },
        responses: [
          {
            text: 'Toss some breadcrumbs.',
            nextId: 'feeding',
          },
          {
            text: 'Just watch the duck.',
          },
        ],
      },
      {
        id: 'feeding',
        text: '*Quack quack quack!* The duck eagerly gobbles up the breadcrumbs, then waddles around your feet hoping for more. What a friendly little creature!',
        hiddenWithPotionEffect: 'beast_tongue',
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: 'Quack! Oh, you understand us! How wonderful! I am Mama Duck, and these are my ducklings.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'How are the ducklings?', nextId: 'beast_ducklings' },
          { text: 'Are you staying for winter?', nextId: 'beast_winter' },
          { text: 'I might be able to help with housing', nextId: 'beast_housing_quest' },
        ],
      },
      {
        id: 'beast_ducklings',
        text: "They're good children, but they never walk in line! They need to eat lots of earthworms and duckweed so they're ready for the flight to the coast in autumn.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: "I'll look for some duckweed", nextId: 'beast_thanks' },
          { text: 'Are you staying for winter?', nextId: 'beast_winter' },
        ],
      },
      {
        id: 'beast_winter',
        text: 'We usually fly to the coast, but... I do love this village. If only someone could convince that nice old man - the Elder - to build us a proper duck coop. Then we could stay!',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'I know the Elder!', nextId: 'beast_elder_hope' },
          { text: "Why can't you build your own?", nextId: 'beast_no_thumbs' },
        ],
      },
      {
        id: 'beast_elder_hope',
        text: "*eyes brighten* Really? Do you think you could ask him? If we had somewhere warm and safe, and someone to feed us, I'd happily give you our eggs!",
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_no_thumbs',
        text: '*looks at wings* Have you seen these? No thumbs! Very good for flying, not so good for carpentry.',
        requiredPotionEffect: 'beast_tongue',
      },
      // Quest dialogue - requires Good Friends with Elder
      {
        id: 'beast_housing_quest',
        text: "You know the Elder well? Oh, wonderful! Do you think... could you ask him to build us a little house? If we had somewhere warm and safe, and someone to feed us, I'd happily give you our eggs!",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend', // This checks friendship with THIS NPC, but dialogue implies Elder
        // TODO: Need a way to check friendship with a different NPC (Elder)
      },
      {
        id: 'beast_thanks',
        text: "*happy quacking* You're very kind! The ducklings and I appreciate your help. Quack!",
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    interactionRadius: 1.5,
    friendshipConfig: {
      canBefriend: false, // Ducks are wild creatures, can't befriend like villagers
      startingPoints: 0,
    },
    reverseFlip: true, // Duck sprite faces left naturally, so flip when walking right instead of left
    visibilityConditions: {
      season: 'spring', // Duck only appears in spring (migrates south for other seasons)
    },
  });
}
