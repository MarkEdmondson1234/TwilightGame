/**
 * Chill Bear NPC Factory Functions
 *
 * Contains both the forest encounter and at-home versions of Chill Bear.
 */

import { NPC, Direction, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';

/**
 * Create a Chill Bear NPC - a peaceful forest creature enjoying tea
 *
 * Behaviour:
 * - Stationary (sits contentedly with tea)
 * - Gentle sipping animation
 * - Calm, friendly dialogue
 * - 20% chance of appearing in forest
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this bear
 * @param position Starting position
 * @param name Optional name (defaults to "Chill Bear")
 * @param scale Optional scale (defaults to 5.0 for outdoor, use smaller values like 2.5-3.0 for indoor)
 */
export function createChillBearNPC(
  id: string,
  position: Position,
  name: string = 'Chill Bear',
  scale: number = 5.0
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.chill_bear_01,
    portraitSprite: npcAssets.chill_bear_portrait,
    scale,
    interactionRadius: 2.0,
    states: {
      sipping: {
        sprites: [
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_02,
          npcAssets.chill_bear_01,
        ],
        animationSpeed: 1200,
      },
    },
    initialState: 'sipping',
    dialogue: [
      // ========================================
      // STAGE 0: First Meeting (Before Quest)
      // ========================================
      {
        id: 'greeting',
        text: '*The bear looks up from its tea and rumbles warmly.* "Oh! A visitor! How delightful. Would you like a cup of tea?"',
        seasonalText: {
          spring:
            '*The bear breathes in the spring air and smiles.* "Lovely day for a cuppa, isn\'t it? A new face in the forest! Would you like some tea?"',
          summer:
            '*The bear fans itself with a large paw.* "Hot out today! A visitor! Fancy some iced tea?"',
          autumn:
            '*The bear gestures at the falling leaves.* "Perfect weather for a warm brew. And a new friend! Would you like a cup?"',
          winter:
            '*The bear wraps its paws around a steaming mug.* "Come, warm yourself! Would you like some tea, traveller?"',
        },
        hiddenIfQuestStarted: 'chill_bear_friendship', // Hide once quest starts
        responses: [
          { text: 'Yes please!', nextId: 'accept_tea_first' },
          { text: 'Do you have coffee?', nextId: 'coffee_question' },
          { text: "Aren't you dangerous?", nextId: 'dangerous_question' },
          { text: 'No thank you.', nextId: 'decline_politely' },
        ],
      },
      {
        id: 'accept_tea_first',
        text: '*The bear\'s eyes light up with genuine delight. It pours you a cup of fragrant tea with surprising delicacy.* "Made it myself. Honey from the old oak, herbs from the meadow. Good stuff. You know... I don\'t get many visitors out here. It\'s rather nice." *The bear pauses thoughtfully.* "Say, would you like to come by my den sometime? For proper tea? I have a lovely spot - very cosy. It\'s behind the seed shed in the village farm area. Through the trees."',
        seasonalText: {
          spring:
            '*The bear hands you a cup filled with cherry blossom tea.* "Spring blend. Picked the petals this morning. Very refreshing. You know, I\'d love to have you over properly - at my den. Behind the seed shed in the farm area. What do you say?"',
          summer:
            "*The bear drops a sprig of mint into your iced tea.* \"Wild mint. Grows by the stream. Keeps you cool. Listen, if you'd like to visit my den sometime - proper visit - I'd enjoy the company. It's behind the seed shed by the farm. Through the trees.\"",
          autumn:
            '*The bear adds a cinnamon stick to your cup.* "Autumn special. Bit of apple, bit of spice. Warms the belly. You seem like good company. Would you like to visit my den? Behind the seed shed in the farm area. I\'ll have more tea ready."',
          winter:
            '*The bear ladles steaming tea from a pot by the fire.* "Extra honey in winter. Good for the soul. You know, it\'s awfully nice having company. Would you come by my den? Behind the seed shed by the village farm. Very warm and cosy."',
        },
        hiddenIfQuestStarted: 'chill_bear_friendship',
        responses: [
          {
            text: "I'd love to visit!",
            nextId: 'invitation_accepted',
            startsQuest: 'chill_bear_friendship',
            setsQuestStage: { questId: 'chill_bear_friendship', stage: 1 },
          },
          { text: 'Maybe another time.', nextId: 'invitation_declined' },
        ],
      },
      {
        id: 'invitation_accepted',
        text: '*The bear beams with joy.* "Wonderful! The path is a bit hidden - behind the seed shed in the farm area, to the right. Follow the trees and you\'ll find me. I\'ll put the kettle on!" *The bear settles back contentedly.* "I\'m so glad we met. Safe travels, friend."',
        hiddenIfQuestStarted: 'chill_bear_friendship',
      },
      {
        id: 'invitation_declined',
        text: '*The bear nods understandingly.* "No worries at all. The offer stands whenever you\'d like. The forest is here, and so am I." *The bear smiles warmly.* "Safe travels, friend."',
        hiddenIfQuestStarted: 'chill_bear_friendship',
      },
      // ========================================
      // STAGE 1+: After Accepting Invitation
      // ========================================
      {
        id: 'greeting',
        text: '*The bear spots you and waves cheerfully.* "Ah, my friend! Lovely to see you again. How have you been? Still enjoy a good cup of tea, I hope?"',
        seasonalText: {
          spring:
            '*The bear breathes in the spring air with contentment.* "Spring is lovely out here, isn\'t it? Have you visited my den yet? The path\'s behind the seed shed."',
          summer:
            '*The bear fans itself lazily.* "Warm day for a forest stroll! Have you found my den yet? It\'s much cooler inside. Behind the seed shed in the farm area."',
          autumn:
            '*The bear gestures at the colourful leaves.* "Beautiful season. Perfect for tea by the fire. Do come by the den if you haven\'t yet - behind the seed shed!"',
          winter:
            '*The bear smiles warmly despite the cold.* "Out in the winter! Brave soul. My den is much warmer - behind the seed shed. Always welcome."',
        },
        requiredQuest: 'chill_bear_friendship',
        requiredQuestStage: 1,
        responses: [
          { text: "I'd love some tea!", nextId: 'accept_tea_friend' },
          { text: 'Tell me about your den.', nextId: 'about_den' },
          { text: 'Just passing through.' },
        ],
      },
      {
        id: 'accept_tea_friend',
        text: '*The bear pours you a cup with practiced ease.* "Here you go! Made fresh this morning. You know, it\'s so nice having a friend who appreciates a good brew. Most creatures are in such a rush these days."',
        seasonalText: {
          spring:
            '*The bear hands you spring blossom tea.* "I picked these blossoms just for you. Friends deserve the best!"',
          summer:
            '*The bear adds extra mint to your iced tea.* "Perfect for a summer day. I\'m so glad we\'re friends."',
          autumn:
            '*The bear adds cinnamon and honey.* "Autumn blend - my favourite. It\'s wonderful to share it with a friend."',
          winter:
            '*The bear pours steaming tea with care.* "Extra warm, extra sweet. Friends need looking after in winter."',
        },
        requiredQuest: 'chill_bear_friendship',
        responses: [{ text: 'This is wonderful!', nextId: 'tea_compliment_friend' }],
      },
      {
        id: 'about_den',
        text: '"Oh, it\'s very cosy! I have a nice fireplace, comfortable cushions, and of course, an excellent tea collection. The entrance is a bit hidden - behind the seed shed in the farm area. Just follow the path through the trees." *The bear smiles.* "You\'re always welcome there, friend."',
        requiredQuest: 'chill_bear_friendship',
      },
      {
        id: 'tea_compliment_friend',
        text: '*The bear beams with pride.* "So glad you like it! You know, I\'ve perfected this recipe over many seasons. The secret is patience - and good company makes it taste even better."',
        requiredQuest: 'chill_bear_friendship',
      },
      {
        id: 'accept_tea',
        text: '*The bear\'s eyes light up with genuine delight. It pours you a cup of fragrant tea with surprising delicacy.* "Made it myself. Honey from the old oak, herbs from the meadow. Good stuff."',
        seasonalText: {
          spring:
            '*The bear hands you a cup filled with cherry blossom tea.* "Spring blend. Picked the petals this morning. Very refreshing."',
          summer:
            '*The bear drops a sprig of mint into your iced tea.* "Wild mint. Grows by the stream. Keeps you cool."',
          autumn:
            '*The bear adds a cinnamon stick to your cup.* "Autumn special. Bit of apple, bit of spice. Warms the belly."',
          winter:
            '*The bear ladles steaming tea from a pot by the fire.* "Extra honey in winter. Good for the soul."',
        },
        hiddenIfQuestStarted: 'chill_bear_friendship', // Use the older simple dialogue before quest
        responses: [{ text: 'This is delicious!', nextId: 'tea_compliment' }],
      },
      {
        id: 'coffee_question',
        text: '*The bear scratches its chin thoughtfully.* "Coffee? Tried it once. Made me all jittery. Couldn\'t nap properly for three days. Stick with tea, much better."',
        responses: [
          { text: 'Tea sounds good then.', nextId: 'accept_tea' },
          { text: 'Fair enough!' },
        ],
      },
      {
        id: 'dangerous_question',
        text: '*The bear blinks slowly, completely unbothered.* "Dangerous? Hmm. Only to a good honeycomb, I suppose. Or a fresh berry pie. Speaking of which, have you tried the blackberries this season? Absolutely wonderful."',
        seasonalText: {
          spring:
            '*The bear chuckles softly.* "Only danger here is eating too many spring rolls. The mushrooms by the stream are lovely this time of year, by the way."',
          summer:
            '*The bear waves a paw dismissively.* "Too hot to be dangerous. The real threat is the heat. Have you had any elderflower cordial? Very refreshing."',
          autumn:
            '*The bear pats its round belly.* "Dangerous? I suppose I\'m a menace to any pie left unattended. The apples are perfect right now, you know."',
          winter:
            '*The bear yawns contentedly.* "Far too sleepy to be dangerous. Besides, life\'s too short. Want to hear about my grandmother\'s recipe for honeyed porridge?"',
        },
        responses: [
          { text: 'Tell me more about the food.', nextId: 'food_chat' },
          { text: "You're quite chill, aren't you?", nextId: 'chill_response' },
        ],
      },
      {
        id: 'food_chat',
        text: '*The bear\'s eyes grow dreamy.* "Ah, food. The mushrooms here are sublime. And there\'s a bee colony in the old oak that makes the sweetest honey. Sometimes I just sit and watch the clouds, thinking about my next meal."',
        seasonalText: {
          spring:
            '"Fresh fiddleheads, wild garlic, the first strawberries... Spring is a feast for those who know where to look."',
          summer:
            '"Berries everywhere! Raspberries, blueberries, blackberries. And the fish practically jump into your paws."',
          autumn:
            '"Nuts and mushrooms, apples and late berries. I spend most of autumn just... collecting. Very satisfying."',
          winter:
            '"I live off my preserves in winter. Dried berries, honeycomb, roasted chestnuts. Cosy eating."',
        },
      },
      {
        id: 'chill_response',
        text: '*The bear smiles - a warm, genuine smile.* "Life is too beautiful to be stressed. The sun rises, the seasons turn, the tea brews. What more could one want?"',
      },
      {
        id: 'decline_politely',
        text: '*The bear nods understandingly.* "No worries, friend. The forest is here whenever you change your mind. Safe travels, and mind the good mushroom patches on your way - the orange ones are delicious."',
      },
      {
        id: 'tea_compliment',
        text: '*The bear beams with pride.* "Family recipe. My grandmother taught me. She always said the secret was patience - let it steep, don\'t rush it. Like most good things in life."',
      },
    ],
    friendshipConfig: {
      canBefriend: false,
      startingPoints: 0,
    },
  });
}

/**
 * Create a Chill Bear NPC at home - the welcoming host in his cosy den
 *
 * Behaviour:
 * - Stationary (relaxing at home)
 * - Gentle sipping animation
 * - Warm, welcoming dialogue
 * - Grants friendship points when visited
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this bear
 * @param position Starting position
 * @param name Optional name (defaults to "Chill Bear")
 * @param scale Optional scale (use smaller values like 2.5-3.5 for indoor spaces)
 */
export function createChillBearAtHomeNPC(
  id: string,
  position: Position,
  name: string = 'Chill Bear',
  scale: number = 3.5
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    direction: Direction.Down,
    sprite: npcAssets.chill_bear_01,
    portraitSprite: npcAssets.chill_bear_portrait,
    scale,
    interactionRadius: 2.0,
    states: {
      sipping: {
        sprites: [
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_01,
          npcAssets.chill_bear_02,
          npcAssets.chill_bear_01,
        ],
        animationSpeed: 1200,
      },
    },
    initialState: 'sipping',
    dialogue: [
      // ========================================
      // AT HOME: Welcoming dialogue
      // ========================================
      {
        id: 'greeting_home',
        text: '*The bear looks up from his tea, his face lighting up with genuine joy.* "Oh! You came! You really came!" *He sets down his cup and gestures enthusiastically around the cosy den.* "I\'m so happy to see you here. I know some folk are... well, a bit nervous about visiting a bear. But you came anyway, and that means the world to me."',
        seasonalText: {
          spring:
            '*The bear beams at you.* "You made it! And in spring too - perfect timing! Come in, come in. I was just having some cherry blossom tea. Please, make yourself at home!"',
          summer:
            '*The bear wipes his brow happily.* "You came! Even in this heat! That\'s true friendship right there. Come, have some cold mint tea. My den stays nice and cool."',
          autumn:
            '*The bear gestures proudly at his home.* "Welcome, welcome! Autumn is my favourite time - everything is golden and peaceful. I\'m so glad you\'re here to share it with me."',
          winter:
            '*The bear pulls a chair closer to the fire.* "You braved the cold to visit! Come, warm yourself by the fire. I\'ve got hot tea and plenty of blankets."',
        },
        responses: [
          { text: 'Your home is lovely!', nextId: 'home_compliment' },
          { text: "I'm happy to be here.", nextId: 'happy_to_visit' },
          { text: 'Tell me about the area.', nextId: 'about_area' },
        ],
      },
      {
        id: 'home_compliment',
        text: '*The bear blushes under his fur.* "Oh, thank you! I do try to keep it cosy. A good home should feel like a hug, I think. Warm, safe, welcoming. That\'s what my grandmother always said."',
        responses: [
          { text: "What's around the den?", nextId: 'about_area' },
          { text: 'Your grandmother sounds wise.', nextId: 'grandmother_wisdom' },
        ],
      },
      {
        id: 'happy_to_visit',
        text: "*The bear's eyes shimmer with emotion.* \"And I'm so happy you're here. You know, sometimes being a bear can be... lonely. People see the size, the claws, and they forget bears can be gentle too. But you saw that. You understood. That's special.\"",
        responses: [
          { text: "Of course! You're wonderful.", nextId: 'friendship_deepens' },
          { text: 'Tell me about the area.', nextId: 'about_area' },
        ],
      },
      {
        id: 'about_area',
        text: '*The bear settles into his chair, gesturing excitedly.* "Oh, there\'s so much to explore around here! Berry bushes all around the clearing - blackberries, raspberries, even some wild strawberries if you know where to look. And the nut trees! Hazelnuts, chestnuts, walnuts..." *He sighs contentedly.* "Autumn is absolutely the best time for berry picking. Everything is perfectly ripe, sweet as can be. Nature\'s harvest!"',
        seasonalText: {
          spring:
            '*The bear points out the window.* "In spring, the berry bushes are just flowering. But come autumn, they\'ll be heavy with fruit! And the nut trees will be dropping their treasures everywhere."',
          summer:
            '*The bear smiles.* "The berries are ripening now! Some early ones are ready. But wait until autumn - that\'s when they\'re at their absolute best. Plump, sweet, perfect."',
          autumn:
            '*The bear\'s eyes light up.* "THIS is the time! Right now! The berries are perfect - go out and pick some! The bushes are practically bursting. And shake those nut trees - they\'re ready to share their bounty!"',
          winter:
            '*The bear gestures at his pantry.* "Winter isn\'t berry season, but I preserved plenty from autumn. Dried berries, berry jam, candied nuts... I\'ll share, of course! And in spring, the cycle begins again."',
        },
        responses: [
          { text: "I'll definitely go foraging!", nextId: 'foraging_encouragement' },
          { text: 'Do you have a favourite?', nextId: 'favourite_food' },
          { text: 'What else do you enjoy?', nextId: 'other_interests' },
        ],
      },
      {
        id: 'foraging_encouragement',
        text: '*The bear claps his paws together.* "Wonderful! The forest provides so generously. Take what you need, but always leave plenty for the birds and other creatures. They rely on those berries and nuts too. That\'s the bear way - take care of the forest, and it takes care of you."',
        responses: [
          { text: 'I will! Thank you.', nextId: 'gratitude_response' },
          { text: 'Do you like anything else?', nextId: 'other_interests' },
        ],
      },
      {
        id: 'favourite_food',
        text: '*The bear taps his chin thoughtfully.* "Hmm, that\'s tough! I love blackberries in summer, chestnuts roasted by the fire in winter... But if I\'m being honest?" *He leans in conspiratorially.* "Cookies. I absolutely adore cookies. Especially homemade ones. There\'s something about the butter, the sugar, the way they crumble just right..." *He sighs dreamily.* "If you ever happen to have any, well... I wouldn\'t say no!"',
        seasonalText: {
          spring:
            '"Spring cookies with lemon and elderflower are divine. But honestly, any cookie is a good cookie."',
          summer:
            '"Light summer biscuits, perfect with cold tea. Though I\'m not picky - all cookies are wonderful."',
          autumn:
            '"Spiced autumn cookies with cinnamon and nutmeg... heavenly. But really, I love them all."',
          winter:
            '"Gingerbread in winter is traditional, but any cookie brightens a cold day. I\'m easy to please!"',
        },
        responses: [
          { text: "I'll bring you cookies!", nextId: 'cookie_promise' },
          { text: 'What else do you like?', nextId: 'other_interests' },
        ],
      },
      {
        id: 'cookie_promise',
        text: "*The bear's eyes go wide with delight.* \"Really?! Oh, that would be wonderful! I'll look forward to it immensely. You're such a good friend. The best!\" *He bounces excitedly in his chair.*",
      },
      {
        id: 'other_interests',
        text: '*The bear settles back thoughtfully.* "Well, besides food - which is very important - I love watching the seasons change, reading by the fire, and of course... tea. Always tea. And having good company like you!" *He smiles warmly.* "A peaceful life is a happy life."',
        responses: [
          { text: "You've found a good balance.", nextId: 'life_philosophy' },
          { text: 'Thank you for having me.' },
        ],
      },
      {
        id: 'grandmother_wisdom',
        text: "*The bear nods fondly.* \"She was. Taught me everything - how to forage, how to prepare for winter, how to make the perfect cup of tea. But most importantly, she taught me to be kind. 'Big paws, gentle heart,' she'd say.\"",
        responses: [
          { text: "That's beautiful.", nextId: 'gratitude_response' },
          { text: "She'd be proud of you." },
        ],
      },
      {
        id: 'friendship_deepens',
        text: "*The bear wipes away a happy tear.* \"You know how to make an old bear's day. Thank you, truly. You're always welcome here - this den is as much yours as it is mine now. That's what friends do.\"",
      },
      {
        id: 'life_philosophy',
        text: '*The bear nods contentedly.* "That\'s all life really is - finding what makes you happy and sharing it with others. Tea tastes better with company. Cookies are sweeter when shared. And the forest is more beautiful when you have someone to show it to."',
      },
      {
        id: 'gratitude_response',
        text: '*The bear smiles warmly.* "Thank you for visiting. You\'ve made this bear very happy today. Come back anytime - the kettle\'s always on."',
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
