/**
 * Davead the Flamingo NPC Factory
 *
 * A French expat flamingo who has settled in the mushroom forest,
 * preferring the damp shade to the heat of his homeland.
 * Generally eloquent, but prone to interjecting gangsta slang.
 * Harbours a deep love of cucumber and salmon.
 * Will share his secret lava cake recipe for a cucumber and salmon sandwich.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create Davead the Flamingo NPC
 *
 * - Lives at position (7,10) in the mushroom forest, behind the willow tree
 * - French accent, gangsta-slang flourishes
 * - Quest: bring him a cucumber and salmon sandwich -> he gives you his lava cake recipe
 *
 * @param id Unique NPC ID
 * @param position Starting position
 */
export function createDaveadNPC(id: string, position: Position): NPC {
  return createStaticNPC({
    id,
    name: 'Davead the Flamingo',
    position,
    direction: Direction.Right,
    sprite: npcAssets.davead_01,
    portraitSprite: npcAssets.davead_portrait,
    scale: 3.5,
    interactionRadius: 1.8,
    collisionRadius: 0.4,
    states: {
      idle: {
        sprites: [npcAssets.davead_01, npcAssets.davead_02],
        animationSpeed: 600,
      },
    },
    initialState: 'idle',
    dialogue: [
      // ── Quest complete / recipe given ─────────────────────────────────────
      {
        id: 'greeting',
        text: '*The flamingo tilts his head regally.* "Ah, mon ami! Wassup, people? You \'ave come to visit moi again. Ze finest decision you \'ave made all day, oui."',
        requiredQuest: 'davead_lava_cake',
        requiredQuestStage: 2,
        responses: [
          { text: 'Tell me about the lava cake recipe again.', nextId: 'recipe_reminder' },
          { text: 'Just saying hello!', nextId: 'au_revoir' },
        ],
      },
      // ── Quest active: remind player about the sandwich ────────────────────
      {
        id: 'greeting',
        text: '"Yo, you remember what I said, dude? Ze cucumber and salmon sandwich — bring me one, and I share my secret. Ze lava cake recipe. C\'est un deal, oui?"',
        requiredQuest: 'davead_lava_cake',
        maxQuestStage: 1,
        hiddenIfQuestCompleted: 'davead_lava_cake',
        responses: [
          {
            text: '"Here — I brought you a cucumber and salmon sandwich!"',
            nextId: 'quest_complete',
            completesQuest: 'davead_lava_cake',
          },
          { text: 'I\'m still working on it.', nextId: 'quest_reminder_patience' },
        ],
      },
      // ── Default greeting — before quest starts ────────────────────────────
      {
        id: 'greeting',
        text: '*A pink flamingo balances on one leg in the shade of the willow, looking thoroughly unbothered.* "Yo, who\'s there? *ruffles feathers* ...Ah. A visitor. Bonjour."',
        hiddenIfQuestStarted: 'davead_lava_cake',
        responses: [
          { text: 'Who are you?', nextId: 'who_are_you' },
          { text: 'What are you doing here?', nextId: 'why_here' },
          { text: 'You\'re a flamingo... in a forest?', nextId: 'flamingo_in_forest' },
        ],
      },

      // ── Identity & backstory ──────────────────────────────────────────────
      {
        id: 'who_are_you',
        text: '"I am Davead. Davead ze Flamingo. Expatriate, connoisseur, and — if I may say so — a bird of considerable refinement." *He adjusts his stance with a small flourish.* "Wassup, yeah, I know — most flamingos, zey live somezzing quite... différent from zis."',
        responses: [
          { text: 'Why are you living in a swamp?', nextId: 'why_here' },
          { text: 'What do you do here all day?', nextId: 'daily_life' },
          { text: 'You mentioned refinement... do you cook?', nextId: 'about_cooking' },
        ],
      },
      {
        id: 'why_here',
        text: '"Why am I \'ere?" *He gestures grandly at the dripping canopy.* "Dude, I was never a fan of excessive \'eat. Ze ozer flamingos, zey stand in ze blazing sun, zen zey stand in it some more. Me? Non. I prefer a colder climate. Très unusual for a flamingo, oui — but c\'est moi. I follow my \'eart."',
        seasonalText: {
          winter:
            '*He spreads his wings slightly, looking deeply content.* "Ze winter, dude — it is magnifique! Zis is when I am most alive. Ze others zink I am fou. But zen, most people are wrong about most zings, non?"',
          summer:
            '"Even in summer, ze shade of zis willow keeps me comfortable. Ze village, ze open fields — I tried it once. Too bright. Too \'ot. Non, merci."',
        },
        responses: [
          { text: 'That\'s a very unique perspective.', nextId: 'unique_perspective' },
          { text: 'Do you miss the other flamingos?', nextId: 'miss_home' },
          { text: 'What do you like to eat?', nextId: 'favourites' },
        ],
      },
      {
        id: 'flamingo_in_forest',
        text: '"Ah, yes. I get zis reaction. *waves a wing dismissively* Ze forest is not what most flamingos choose, I admit. But most flamingos, zey \'ave not truly lived, dude. Ze mushrooms, ze damp air, ze quiet — c\'est parfait."',
        responses: [
          { text: 'How did you end up here?', nextId: 'why_here' },
          { text: 'Do you ever miss warmer places?', nextId: 'miss_home' },
        ],
      },
      {
        id: 'unique_perspective',
        text: '"Merci. I \'ave always believed zat ze most interesting creatures are ze ones who do not fit neatly into ze categories. Ze flamingo who prefers ze cold, ze fish who climbs trees... *He pauses.* "Actually, I do not zink fish climb trees. But you understand ze point, oui?"',
      },
      {
        id: 'miss_home',
        text: '*A long, theatrical pause.* "Ze pink salt lakes, ze warm air, ze sunrise turning ze entire flock to gold... *sighs* ...Non. I do not miss it. Ze \'eat was unbearable, dude. And ze gossip — Mon Dieu, flamingos gossip. I prefer ze company of my own thoughts. And ze willow."',
        responses: [
          { text: 'It sounds like you\'re very settled here.', nextId: 'settled' },
          { text: 'What do you like best about this place?', nextId: 'about_forest' },
        ],
      },
      {
        id: 'settled',
        text: '"Settled, oui. I did not expect to stay so long, when I first arrived — but ze mushroom forest, she keeps you. Zere is somezzing très mystérieux about \'er. And I \'ave my routines. My ingredients. My recipe." *He taps the side of his beak meaningfully.*',
        responses: [
          { text: 'What recipe?', nextId: 'about_cooking' },
          { text: 'You seem very content.', nextId: 'au_revoir' },
        ],
      },
      {
        id: 'about_forest',
        text: '"Ze quiet, mostly. And ze shade. Ze giant mushrooms are like old friends — zey do not rush you, zey do not ask questions, zey do not tell you to go stand in ze sun. *He glances up at the willow.* "And zis tree. Ze willow, she is très romantique, non?"',
      },

      // ── Food & recipe ─────────────────────────────────────────────────────
      {
        id: 'daily_life',
        text: '"I observe. I contemplate. I cook, sometimes, when I \'ave ze right ingredients. And I practice standing on one leg — but zat is less a \'obby and more just... being a flamingo, yo."',
        responses: [
          { text: 'You cook? What do you make?', nextId: 'about_cooking' },
          { text: 'What do you think about all day?', nextId: 'contemplation' },
        ],
      },
      {
        id: 'contemplation',
        text: '"Ze nature of perfection, mostly. What makes a perfect sandwich. Whether ze moon \'as a flavour — I believe it would taste of something mineral and cold. *He pauses seriously.* "And sometimes I just watch ze mushrooms grow, dude. It is surprisingly riveting."',
        responses: [
          { text: 'A perfect sandwich?', nextId: 'favourites' },
        ],
      },
      {
        id: 'favourites',
        text: '"Ah, you ask what I love?" *His eyes close briefly in reverence.* "Cucumber. And salmon. Separately, zey are already sublime — ze cool crunch, ze delicate richness. But togezzair? *pauses for effect* Magnifique, yo. Ze greatest combination in all ze culinary arts."',
        responses: [
          { text: 'Do you have any special recipes?', nextId: 'about_cooking' },
          { text: 'I\'ll keep that in mind.', nextId: 'au_revoir' },
        ],
      },
      {
        id: 'about_cooking',
        text: '"I cook, oui — when I \'ave ze right zings. But my greatest pride..." *He lowers his voice conspiratorially.* "...is my family\'s lava cake. Ze chocolate, it melts inside and when you bite — *chef\'s kiss* — it spills like lava. Formidable. But I do not share ze recipe just like zat, dude."',
        hiddenIfQuestStarted: 'davead_lava_cake',
        responses: [
          { text: 'What would it take to get the recipe?', nextId: 'lava_cake_deal' },
          { text: 'That sounds incredible.', nextId: 'lava_cake_tease' },
        ],
      },
      {
        id: 'lava_cake_tease',
        text: '"It IS incredible. You \'ave no idea, dude. Ze butter, ze chocolate — ze way ze batter freezes, zen bakes... zis is not mere cooking. Zis is artistry. Zis is ze legacy of my grandmuzzer\'s grandmuzzer. Très précieux."',
        hiddenIfQuestStarted: 'davead_lava_cake',
        responses: [
          { text: 'What would it take to learn the recipe?', nextId: 'lava_cake_deal' },
        ],
      },
      {
        id: 'lava_cake_deal',
        text: '"What would it take?" *He tilts his head, studying you.* "I \'ave been craving somezzing. A cucumber and salmon sandwich — properly made, fresh, with ze right proportions. Bring me one, and I will share ze recipe. C\'est raisonnable, non?"',
        hiddenIfQuestStarted: 'davead_lava_cake',
        responses: [
          {
            text: '"A cucumber and salmon sandwich — I\'ll find one for you!"',
            nextId: 'quest_accepted',
            startsQuest: 'davead_lava_cake',
          },
          { text: 'I\'ll think about it.', nextId: 'au_revoir' },
        ],
      },

      // ── Quest flow nodes ──────────────────────────────────────────────────
      {
        id: 'quest_accepted',
        text: '"Magnifique! Yo, I knew you were a person of taste." *He settles back on one leg with quiet satisfaction.* "Ze cucumber and salmon — fresh, dude. Do not bring me some prepackaged zing. I will know."',
      },
      {
        id: 'quest_reminder_patience',
        text: '"Oui, oui — take your time. Ze best zings in life require patience, as ze lava cake requires ze freezer. *nods sagely* I am not going anywhere, dude."',
      },
      {
        id: 'quest_complete',
        text: '"Mon Dieu!" *He takes the sandwich with trembling wings and savours a slow, dignified bite.* "...Wassup, dude. Zis is perfect. Ze cucumber, ze salmon, ze bread — c\'est exactement ce que je voulais." *He composes himself.* "As promised — my family\'s lava cake recipe. Guard it well. It is not for everyone. But you — you \'ave earned it."',
      },
      {
        id: 'recipe_reminder',
        text: '"Ze recipe, oui!" *He recites it with practised reverence.* "Melt ze butter, add ze chocolate. Whip ze eggs and sugar until frothy. Fold zem togezzair. Freeze for at least three \'ours. Bake at 180 degrees for sixteen minutes, directly from ze freezer. Ze lava, she will come, dude. It is science. It is art. C\'est magnifique."',
      },
      {
        id: 'au_revoir',
        text: '*He inclines his head graciously.* "Au revoir, dude. Come back when ze shade is right and ze mood is philosophical."',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
