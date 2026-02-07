/**
 * Bunnyfly NPC Factory Function
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createWanderingNPC } from '../createNPC';

/**
 * Create a Bunnyfly NPC (butterfly-bunny hybrid forest creature)
 *
 * Behavior:
 * - Wanders through the forest
 * - Gentle fluttering animation (wings)
 * - Shy, curious dialogue about the forest
 *
 * Uses createWanderingNPC factory.
 *
 * @param id Unique ID for this bunnyfly
 * @param position Starting position
 * @param name Optional name (defaults to "Bunnyfly")
 */
export function createBunnyflyNPC(id: string, position: Position, name: string = 'Bunnyfly'): NPC {
  return createWanderingNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.bunnyfly_01,
    portraitSprite: npcAssets.bunnyfly_portrait,
    scale: 4.0,
    interactionRadius: 1.5,
    states: {
      roaming: {
        sprites: [npcAssets.bunnyfly_01, npcAssets.bunnyfly_02],
        animationSpeed: 400,
      },
    },
    initialState: 'roaming',
    dialogue: [
      // Normal dialogue (without Beast Tongue potion)
      {
        id: 'greeting',
        text: '*The bunnyfly hovers near you, its tiny wings fluttering softly. It seems curious but shy.*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            '*The bunnyfly circles around the spring flowers, its pastel wings catching the sunlight. It twitches its little nose at you.*',
          summer:
            '*The bunnyfly flits between sunbeams, leaving a trail of sparkles. It seems especially playful in the warm weather.*',
          autumn:
            "*The bunnyfly's wings shimmer with autumn colours as it drifts amongst the falling leaves. It watches you with bright, gentle eyes.*",
          winter:
            '*Surprisingly, the bunnyfly still flutters about in the cold. Perhaps it has some magical warmth within? It tilts its head curiously.*',
        },
        timeOfDayText: {
          day: "*In the forest light, the bunnyfly's wings create tiny rainbows. It seems drawn to patches of sunlight.*",
          night:
            '*The bunnyfly glows softly in the darkness, its wings luminescent. What a magical little creature!*',
        },
        weatherText: {
          rain: '*The bunnyfly shelters beneath a large leaf, peering out at you with curious eyes. It seems to be waiting for the rain to pass.*',
          snow: "*Snowflakes settle on the bunnyfly's soft fur. It shakes them off with a tiny sneeze before continuing to flutter about.*",
          fog: '*The bunnyfly appears and disappears in the mist like a dream. Is it real, or just a forest spirit?*',
          mist: '*The bunnyfly drifts through the mist, almost ethereal. It seems perfectly at home in this mystical atmosphere.*',
          cherry_blossoms:
            '*The bunnyfly dances amongst the falling petals, indistinguishable from the pink blooms. Such grace!*',
        },
        responses: [
          { text: 'Reach out gently.', nextId: 'approach' },
          { text: 'Watch it flutter away.' },
        ],
      },
      {
        id: 'approach',
        text: '*The bunnyfly lands on your outstretched hand for just a moment. Its fur is impossibly soft. Then, with a gentle flutter, it takes flight again, circling you once before drifting deeper into the forest.*',
        hiddenWithPotionEffect: 'beast_tongue',
        seasonalText: {
          spring:
            '*The bunnyfly lands briefly on your hand, leaving behind the faint scent of spring blossoms. A gift from the forest!*',
          summer:
            "*The tiny creature's warmth is like a sunbeam on your palm. It seems to smile before fluttering away.*",
          autumn:
            "*The bunnyfly's wings dust your hand with shimmering autumn-coloured powder. How lovely!*",
          winter:
            '*Despite the cold, the bunnyfly radiates gentle warmth. A small comfort in the winter forest.*',
        },
      },
      // Beast Tongue dialogue (only visible with potion active)
      {
        id: 'beast_greeting',
        text: '*flutter flutter* Oh! A human who speaks our language! How rare and wonderful!',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'What do you like to do?', nextId: 'beast_activities' },
          { text: 'Where do you live?', nextId: 'beast_habitat' },
          { text: 'Tell me a secret', nextId: 'beast_secret' },
        ],
      },
      {
        id: 'beast_activities',
        text: 'We love berry bushes most of all! In winter, we keep secret stashes of dried berries and nuts in hollow tree trunks and little earthen dens. The deep forest is best - the magic there is ancient and full of life.',
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Where do you live?', nextId: 'beast_habitat' },
          { text: 'That sounds lovely', nextId: 'beast_thanks' },
        ],
      },
      {
        id: 'beast_habitat',
        text: "Bunniflies only live where the air is clean and clear. We couldn't bear to live near a smoking chimney! The fairies sometimes ride us as mounts, which tickles but we don't mind.",
        requiredPotionEffect: 'beast_tongue',
        responses: [
          { text: 'Fairies ride you?', nextId: 'beast_fairies' },
          { text: 'Tell me a secret', nextId: 'beast_secret' },
        ],
      },
      {
        id: 'beast_fairies',
        text: "*giggles* Oh yes! They're ever so light. We flutter through the forest together, and they tell us stories of the old magic. It's quite fun, really!",
        requiredPotionEffect: 'beast_tongue',
      },
      // Secret dialogue - requires Good Friends tier
      {
        id: 'beast_secret',
        text: "*whispers excitedly* Sometimes... we visit the bird people. They live in the upper stratosphere! They're terribly clever, though a bit stuck up about it.",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
        responses: [
          { text: 'Bird people? How do I meet them?', nextId: 'beast_secret_entrance' },
          { text: "That's amazing!", nextId: 'beast_secret_confirm' },
        ],
      },
      {
        id: 'beast_secret_entrance',
        text: "*looks around nervously, then whispers* There's a secret entrance to their world, you know. In the ancient ruins. But don't tell anyone I told you!",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
      },
      {
        id: 'beast_secret_confirm',
        text: "*nods happily* It is! The view from up there... you can see the whole world spread out below like a patchwork quilt. Someday, if we're very good friends, perhaps I could show you!",
        requiredPotionEffect: 'beast_tongue',
        requiredFriendshipTier: 'good_friend',
      },
      // Default when not Good Friends
      {
        id: 'beast_secret_not_ready',
        text: '*flutter flutter* Oh, I know many wonderful secrets! But... we only share those with our very best friends. Perhaps when we know each other better?',
        requiredPotionEffect: 'beast_tongue',
      },
      {
        id: 'beast_thanks',
        text: "*happy flutter* You're very kind! The forest needs more friends like you. Come visit us again!",
        requiredPotionEffect: 'beast_tongue',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 5,
    },
  });
}
