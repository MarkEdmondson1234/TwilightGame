/**
 * Village Elder NPC Factory Function
 *
 * The wise elder who sits beneath the cherry tree.
 */

import { NPC, Position } from '../../../types';
import { npcAssets } from '../../../assets';
import { createStaticNPC } from '../createNPC';
import { GARDENING_QUEST_ID, GARDENING_QUEST_STAGES } from '../../../data/questHandlers/gardeningQuestHandler';
import { FAIRY_BLUEBELLS_QUEST_ID } from '../../../data/questHandlers/fairyBluebellsHandler';

export function createVillageElderNPC(
  id: string,
  position: Position,
  name: string = 'Village Elder'
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.elderly_01,
    portraitSprite: npcAssets.elderly_portrait,
    collisionRadius: 0.4, // NPCs have collision so player can't walk through
    states: {
      idle: {
        sprites: [npcAssets.elderly_01, npcAssets.elderly_02],
        animationSpeed: 800, // Slow gentle animation (800ms per frame)
      },
    },
    dialogue: [
      {
        id: 'greeting',
        text: 'Hail and well met, traveller! A fine day to rest beneath this ancient tree.',
        seasonalText: {
          spring:
            'Hail and well met, traveller! Behold the cherry blossoms in their springtime glory. Art thou not filled with wonder?',
          summer:
            'Hail and well met, traveller! The cherry tree bears sweet fruit this season. Mayhaps thou wouldst care to taste?',
          autumn:
            "Hail and well met, traveller! See how the cherry leaves turn crimson and gold. 'Tis my favourite season, watching nature's gentle farewell.",
          winter:
            "Hail and well met, traveller! Even in winter's grasp, this old tree stands strong. Much like we villagers, eh?",
        },
        weatherText: {
          rain: 'Hail and well met, traveller! A perfect day for the crops, this rain. Come, shelter beneath the tree with me.',
          snow: "Hail and well met, traveller! The snow falls gently today. Even in winter's grasp, there is beauty to behold.",
          fog: "Hail and well met, traveller! Can't see much through this fog, can we? Best stay close to the path.",
          mist: 'Hail and well met, traveller! The mist creeps in like an old memory. Mysterious, yet somehow comforting.',
          storm:
            "Hail and well met, traveller! Quite a storm we're having! Best seek shelter until it passes.",
          cherry_blossoms:
            "Hail and well met, traveller! Behold the petals dancing on the wind! 'Tis a sight that never grows old, no matter how many springs I witness.",
        },
        responses: [
          {
            text: 'The tree is beautiful.',
            nextId: 'tree_admiration',
          },
          {
            text: 'Tell me about the village.',
            nextId: 'village_tales',
          },
          // Garden quest offer - only shows if quest not started and not offered
          {
            text: 'Is there anything I can help you with?',
            nextId: 'garden_offer',
            hiddenIfQuestStarted: GARDENING_QUEST_ID,
          },
          // Garden help option - shows ONLY when quest was offered but declined (not when active)
          {
            text: 'Want me to help with the kitchen garden?',
            nextId: 'garden_accept',
            requiredQuest: GARDENING_QUEST_ID,
            requiredQuestStage: GARDENING_QUEST_STAGES.OFFERED,
            maxQuestStage: GARDENING_QUEST_STAGES.OFFERED,
          },
          // Show task check when quest is active
          {
            text: "How's the gardening going?",
            nextId: 'garden_task_check',
            requiredQuest: GARDENING_QUEST_ID,
            requiredQuestStage: GARDENING_QUEST_STAGES.ACTIVE,
            hiddenIfQuestCompleted: GARDENING_QUEST_ID,
          },
          {
            text: 'Dost thou have any wisdom about foraging or farming?',
            nextId: 'elias_knowledge_hub',
          },
          {
            text: 'Farewell, elder.',
          },
        ],
      },
      {
        id: 'tree_admiration',
        text: 'Aye, my Althea and I planted this cherry tree together when we were young and newly wed. A symbol of our love, it was. Still is.',
        seasonalText: {
          spring:
            "Indeed! Each spring I am blessed to witness the blossoms anew. Althea and I planted this tree together, you know. Fifty years of springs we've watched it bloom.",
          summer:
            'Aye! The fruit is sweetest when shared with friends. Althea makes the most wonderful cherry preserves from this very tree.',
          autumn:
            "Thou hast a keen eye, traveller. These autumn leaves fall like nature's own farewell. My Althea says I spend too much time here, but she understands.",
          winter:
            'True, true. Bare branches against the snow... there is a stark beauty in it. Althea knits me warm scarves so I may sit here even in winter.',
        },
        responses: [
          {
            text: 'How long have you lived here?',
            nextId: 'elder_history',
          },
          {
            text: 'Tell me about Althea.',
            nextId: 'wife_althea',
          },
          {
            text: 'I should be going.',
          },
        ],
      },
      {
        id: 'village_tales',
        text: 'This village hath been my home for seventy winters. I have seen much change, yet some things remain constant.',
        responses: [
          {
            text: 'What has changed?',
            nextId: 'village_changes',
          },
          {
            text: 'What remains the same?',
            nextId: 'village_constants',
          },
          {
            text: 'Tell me a story from your past.',
            nextId: 'summer_memory',
          },
          {
            text: 'Thank you for sharing.',
          },
        ],
      },
      {
        id: 'summer_memory',
        text: 'A story from my past? Ah yes... let me show thee.',
        responses: [], // No responses - cutscene will trigger automatically
      },
      {
        id: 'elder_history',
        text: 'I was but a lad when I first came here. This cherry tree was already ancient then. Now I am ancient too, yet the tree still blooms each spring.',
        responses: [
          {
            text: 'A beautiful thought.',
          },
        ],
      },
      {
        id: 'village_changes',
        text: 'Many faces have come and gone. Some seek adventure beyond our borders, whilst others settle to raise families. The cycle continues.',
      },
      {
        id: 'village_constants',
        text: 'The cherry tree blooms. The seasons turn. Neighbours help neighbours. These truths endure, traveller.',
      },
      {
        id: 'wife_althea',
        text: '*His eyes soften.* My Althea... we have been married for over fifty years now. I courted her for the longest time before she agreed, you know. She gave up much to be with me. *He smiles warmly.* She makes the most wonderful things with her knitting. You should visit her sometime.',
        responses: [
          {
            text: 'Fifty years is remarkable.',
            nextId: 'long_marriage',
          },
          {
            text: "I'll be sure to visit her.",
          },
        ],
      },
      {
        id: 'long_marriage',
        text: "Aye, we've weathered many storms together, she and I. I used to be a gardener, you know - still tend the communal kitchen gardens when these old bones allow. Althea teases that I spend more time with the vegetables than with her!",
        responses: [
          {
            text: 'You tend the village gardens?',
            nextId: 'gardening_tips',
          },
          {
            text: "That's sweet.",
          },
        ],
      },
      {
        id: 'gardening_tips',
        text: "Indeed! Though I could use some help these days. If thou art interested in growing things, I have some advice: spring is best for most crops, but put thy onion sets down in autumn - they'll be ready come summer. And if thou needest seeds, the forest sometimes hides them, but mind the wild creatures!",
        seasonalText: {
          autumn:
            "Autumn is the time for onion sets, young one! Plant them now, and come summer, thou'lt have fine bulbs. The shop should have some in stock.",
          spring:
            'Spring! The perfect time to plant most things. Visit the shop for seeds, or search the forest - nature provides for those who look carefully.',
        },
      },
      // ===== GARDENING QUEST =====
      // Initial offer - appears when player asks if they can help
      {
        id: 'garden_offer',
        text: 'Ah, young one. These old bones grow weary, and I can no longer tend the communal garden as I once did. The vegetables need planting, the soil needs tending... Would thou like to help an old man? I could teach thee what I know.',
        hiddenIfQuestStarted: GARDENING_QUEST_ID,
        responses: [
          {
            text: "Yes, I'd love to help!",
            nextId: 'garden_accept',
          },
          {
            text: 'Not right now, thank you.',
            nextId: 'garden_decline',
          },
        ],
      },
      {
        id: 'garden_decline',
        text: "No matter, young one. The offer stands whenever thou art ready. The garden shall wait - 'tis patient, like me.",
        // Note: Handler will set quest to OFFERED stage so the option appears in greeting
      },
      {
        id: 'garden_accept',
        text: "*His eyes light up.* Wonderful! 'Tis heartening to see the young folk take interest in the old ways.",
        seasonalText: {
          spring:
            "*His eyes light up.* Wonderful! 'Tis heartening to see the young folk take interest in the old ways. Spring is the perfect time to begin - let me give thee thy first task.",
          summer:
            "*His eyes light up.* Wonderful! 'Tis heartening to see the young folk take interest in the old ways. Summer is a fine season for growing - let me give thee a task.",
          autumn:
            "*His eyes light up.* Wonderful! 'Tis heartening to see the young folk take interest in the old ways. Autumn has its own work to be done.",
          winter:
            "*His eyes light up, then soften with regret.* Wonderful! But alas... 'tis winter now. The ground is frozen solid, and no seeds will take root until the thaw. Come see me when spring returns, young one. In the meantime, perhaps make friends with the other villagers? Learn to cook from thy mum? Winter is a time for hearth and home.",
        },
        responses: [
          {
            text: 'What should I do?',
            nextId: 'garden_seasonal_task',
            startsQuest: GARDENING_QUEST_ID,
          },
        ],
      },
      // Seasonal task assignment - shows appropriate message based on season
      {
        id: 'garden_seasonal_task',
        text: 'Now then, let me give thee thy first task...',
        seasonalText: {
          spring:
            "Here, take these seeds - tomatoes, peas, and sunflowers. Plant them in tilled soil and remember to water them each day, or they'll wilt. When thou hast grown something, bring it to show me.",
          summer:
            'Take these seeds - carrots, corn, and chillies. They love the warm weather. Plant them well, water them daily, and bring me something from thy harvest.',
          autumn:
            "Here are some onion sets - plant these. But I have another task for thee as well. I would dearly love some honey. There's a bear who lives in the forest... perhaps he'll share some with thee, or show thee where he keeps his hives. But do be careful - there are wild creatures about.",
          winter:
            'Alas, there is naught to do until spring. The ground sleeps beneath the frost. But when the thaw comes, seek me out - I shall have seeds and tasks aplenty for thee then. For now, enjoy the quiet season.',
        },
        requiredQuest: GARDENING_QUEST_ID,
      },
      // Spring task
      {
        id: 'garden_spring_task',
        text: "Spring is here! 'Tis the perfect time for planting. Here, take these seeds - tomatoes, peas, and sunflowers. Plant them in tilled soil and remember to water them each day, or they'll wilt. When thou hast grown something, bring it to show me.",
        requiredQuest: GARDENING_QUEST_ID,
      },
      // Summer task
      {
        id: 'garden_summer_task',
        text: 'Summer! A fine season for growing. Take these seeds - carrots, corn, and chillies. They love the warm weather. Plant them well, water them daily, and bring me something from thy harvest.',
        requiredQuest: GARDENING_QUEST_ID,
      },
      // Autumn task - special with honey request
      {
        id: 'garden_autumn_task',
        text: "Autumn brings the time for onion sets. Here, plant these. But I have another task for thee - I would dearly love some honey. There's a bear who lives in the forest... perhaps he'll share some with thee, or show thee where he keeps his hives. But do be careful - there are wild creatures about.",
        requiredQuest: GARDENING_QUEST_ID,
      },
      // Winter - no task available
      {
        id: 'garden_winter_wait',
        text: 'The ground sleeps beneath the frost now, young one. Come see me when spring returns, and we shall plant anew. In the meantime, perhaps visit the other villagers? Make friends, learn to cook from thy mum... winter is a time for hearth and home.',
        requiredQuest: GARDENING_QUEST_ID,
      },
      // Task check - when player talks during active quest
      // Also handles assigning new seasonal tasks when season changes
      {
        id: 'garden_task_check',
        text: 'Ah, young one! How is the gardening going? I hope thou art tending those plants well. Hast thou anything to show me?',
        requiredQuest: GARDENING_QUEST_ID,
        hiddenIfQuestCompleted: GARDENING_QUEST_ID,
        seasonalText: {
          spring:
            'Ah, young one! How is thy garden faring? The spring sunshine should be helping those seedlings along nicely. Hast thou anything to show me?',
          summer:
            'Ah, there thou art! The warm weather treating thy crops well? Hast thou something to show me?',
          autumn:
            'Ah, good to see thee! How goes the autumn work? Remember, I would dearly love some honey from the bear. Hast thou found any?',
          winter:
            'Ah, young one. The ground sleeps beneath the frost now. There is naught to do until spring. Enjoy the quiet season, and come see me when the thaw comes.',
        },
        responses: [
          {
            text: 'I have something for you!',
            nextId: 'garden_deliver_crop',
          },
          {
            text: 'Any advice?',
            nextId: 'garden_tip_random',
          },
          {
            text: "I'll keep working on it.",
          },
        ],
      },
      // Random tip during task
      {
        id: 'garden_tip_random',
        text: "Hmm, let me think... Have you made friends with the other villagers? They're good folk. Your mum is a wonderful cook - perhaps she could teach thee a thing or two? Old Bessie the cow gives the sweetest milk. The woods are full of treasures if thou knowest where to look. And if thou seekest Mushra the artist, just follow the huge toadstools to her mushroom house...",
        requiredQuest: GARDENING_QUEST_ID,
      },
      // Deliver crop via dialogue
      {
        id: 'garden_deliver_crop',
        text: 'Let me see what thou hast brought...',
        requiredQuest: GARDENING_QUEST_ID,
      },
      // No crop in inventory
      {
        id: 'garden_no_crop',
        text: 'Hmm, it seems thou hast not yet got anything to show me. Keep at it — the garden rewards patience!',
        requiredQuest: GARDENING_QUEST_ID,
      },
      // Task completion
      {
        id: 'garden_task_complete',
        text: "*He examines what you've brought with a warm smile.* Well done, young one! This is fine work. Thou hast a gift for growing things, I can tell.",
        requiredQuest: GARDENING_QUEST_ID,
        responses: [
          {
            text: 'What should I do next?',
            nextId: 'garden_wait_next_season',
          },
          {
            text: 'Thank you, Elias.',
          },
        ],
      },
      // Season task done - come back next season
      {
        id: 'garden_wait_next_season',
        text: "Thou hast done well this season, young one. There is no more I can teach thee until the seasons turn. In the meantime, why not visit the shop for more seeds? Try growing different things - experimentation is the heart of gardening!",
        seasonalText: {
          spring:
            "Thou hast done well this spring! Come see me when summer arrives - I shall have new seeds and a fresh task for thee. Until then, why not buy some seeds from the shop and try growing things on thine own? Gardening takes patience, young one.",
          summer:
            "A fine summer's work! When autumn comes, I shall have another task for thee. Until then, visit the shop for more seeds and do some experimenting. A true gardener never stops learning!",
          autumn:
            "Splendid autumn work! The garden rests in winter, but come spring I shall have something new for thee. Why not buy seeds from the shop and try thy hand at different crops? Patience is a gardener's greatest virtue.",
          winter:
            'The ground sleeps beneath the frost now, young one. Come see me when spring returns. In the meantime, perhaps visit the other villagers?',
        },
        requiredQuest: GARDENING_QUEST_ID,
      },
      // All seasonal tasks complete
      {
        id: 'garden_quest_complete',
        text: '*His eyes grow misty.* Thou hast helped an old man more than thou knowest, young one. Spring, summer, autumn... thou hast tended the garden through all the seasons. The village is richer for thy efforts. Thank thee, from the bottom of my heart.',
        requiredQuest: GARDENING_QUEST_ID,
      },
      // ===== FAIRY BLUEBELLS QUEST =====
      // Offered when player reaches Good Friends tier with Elias
      {
        id: 'fairy_bluebells_offer',
        text: "*He looks at you with deep trust.* My dear friend, I must confess something. I am frightened of the forest these days... but I so wish to give my Althea a bouquet of her favourite flower - the Shrinking Violet. And I'd like to send a gift to my old friend the bear - some hazelnuts and blueberries would make him so happy. If thou couldst gather these things for me, I would give thee the most precious thing I own: a fairy bluebell seed. They say if thou growest it and watchest carefully... it might attract the fae folk.",
        requiredFriendshipTier: 'good_friend',
        hiddenIfQuestStarted: FAIRY_BLUEBELLS_QUEST_ID,
        responses: [
          {
            text: "I'll find them for you.",
            nextId: 'fairy_bluebells_accept',
          },
          {
            text: 'That sounds like quite an adventure!',
            nextId: 'fairy_bluebells_accept',
          },
        ],
      },
      {
        id: 'fairy_bluebells_accept',
        text: "*His face lights up.* Thou art a true friend! To remind thee: one Shrinking Violet for Althea's bouquet, and some hazelnuts and blueberries for the bear. The violet grows in various places throughout the land. Hazelnuts fall from hazel bushes in autumn, and blueberries ripen in summer and autumn. Gift them to me when thou hast found them all.",
        // Note: Handler will start the quest
      },
      // Progress check
      {
        id: 'fairy_bluebells_check',
        text: 'How goes the search, friend? Remember - I need a Shrinking Violet for Althea, and hazelnuts and blueberries for the bear. Gift them to me as thou findest them.',
        requiredQuest: FAIRY_BLUEBELLS_QUEST_ID,
        hiddenIfQuestCompleted: FAIRY_BLUEBELLS_QUEST_ID,
      },
      // Item received
      {
        id: 'fairy_bluebells_item_received',
        text: "*He accepts your gift gratefully.* Thank thee, friend! This brings me one step closer to my heart's desire.",
        requiredQuest: FAIRY_BLUEBELLS_QUEST_ID,
      },
      // Quest complete
      {
        id: 'fairy_bluebells_complete',
        text: '*Tears well in his eyes.* Thou hast done it! Althea will be so happy with the violets, and the bear will feast well. As promised, here is my most treasured possession - a fairy bluebell seed. Plant it with care, and watch it closely at night. The old tales say... but I shall let thee discover that for thyself. Thank thee, dear friend. Truly.',
        requiredQuest: FAIRY_BLUEBELLS_QUEST_ID,
      },

      // ===== ENCYCLOPEDIC KNOWLEDGE =====
      {
        id: 'elias_knowledge_hub',
        text: "*He straightens up with evident pleasure.* Thou hast come to the right elder! I have spent seventy years watching these lands — the seasons, the forest, the soil. Ask me anything about what grows and where.",
        responses: [
          { text: 'Tell me about foraging.', nextId: 'elias_foraging_hub' },
          { text: 'Which seeds should I plant this season?', nextId: 'elias_seeds_seasonal' },
          { text: 'Any general farming advice?', nextId: 'elias_farming_advice' },
          { text: 'Farewell, elder.' },
        ],
      },
      {
        id: 'elias_foraging_hub',
        text: "The land provides generously for those who know where and when to look. Each season brings its own gifts — thou needst only learn the patterns.",
        responses: [
          { text: 'Where can I find berries?', nextId: 'elias_berries' },
          { text: 'Are there mushrooms to find?', nextId: 'elias_mushrooms' },
          { text: 'How do I find honey?', nextId: 'elias_honey' },
          { text: 'What else is worth foraging?', nextId: 'elias_other_forage' },
          { text: "That's everything, thank you." },
        ],
      },
      {
        id: 'elias_berries',
        text: "Berries each have their season — learn when, and thou shalt rarely go without.",
        seasonalText: {
          spring: "The strawberry plants are just greening up in spring, but they will not fruit until summer. Be patient! The blueberry bushes are also waking up, but the berries won't be ripe until summer either. Spring is a time for waiting — and planning.",
          summer: "Ah, now is the time! Wild strawberries ripen in summer — look along sunny forest edges. Blackberries appear on the brambles too, and the blueberry bushes begin to fruit. Summer is the finest season for a forager.",
          autumn: "The strawberries and blackberries are spent now, but autumn brings blueberries from the forest bushes — and the hazel trees drop their nuts. Look beneath the hazel branches for hazelnuts on the ground.",
          winter: "All the berries are long past now. But when summer comes again, thou'lt know exactly where to look!",
        },
        responses: [
          { text: 'What else can I forage?', nextId: 'elias_foraging_hub' },
          { text: 'Thank you, elder.' },
        ],
      },
      {
        id: 'elias_mushrooms',
        text: "Mushrooms prefer the cool and damp. They are patient creatures — thou must be patient too.",
        seasonalText: {
          spring: "Mushrooms are scarce in spring. A few may linger in shaded spots, but 'tis not the season for them.",
          summer: "Summer is too warm and dry for most mushrooms. Thou mightst find the odd one in deep shade, but do not go out of thy way.",
          autumn: "Now is the time! Head into the deep forest and keep thy eyes on the shaded ground — forest mushrooms spring up in the cooler, damper air of autumn. Look near the trees.",
          winter: "The mushrooms are gone until next autumn. But the deep forest still holds its own beauty, even in winter.",
        },
        responses: [
          { text: 'What else can I forage?', nextId: 'elias_foraging_hub' },
          { text: 'Thank you, elder.' },
        ],
      },
      {
        id: 'elias_honey',
        text: "The bees keep their hives in the forest, deep amongst the trees. Follow the sound of buzzing and thou shalt find them. The bear knows where every hive is — he has been visiting them for years! If thou canst find the bear's territory, thou'lt find honey nearby.",
        seasonalText: {
          winter: "The bees cluster tightly in winter, but the hives remain. A brave forager might still try, though the bees are less willing to share when the cold sets in.",
        },
        responses: [
          { text: 'What else can I forage?', nextId: 'elias_foraging_hub' },
          { text: 'Thank you, elder.' },
        ],
      },
      {
        id: 'elias_other_forage',
        text: "The village gardens have rosebushes — both pink and red — that bloom freely all through the year. In spring and summer, yellow mustard flowers appear in the meadows. And feathers! Keep an eye on the ground near the trees, where the sparrows roost. Many small things are worth picking up, if thou hast the patience to look.",
        responses: [
          { text: 'Tell me more about foraging.', nextId: 'elias_foraging_hub' },
          { text: 'Thank you, elder.' },
        ],
      },
      {
        id: 'elias_seeds_seasonal',
        text: "Every season has its planting. Miss the right moment and thou'lt wait a whole year to try again.",
        seasonalText: {
          spring: "Spring is the busy season! The shop sells nearly everything now: tomatoes, peas, potatoes, radishes, spinach, broccoli, cauliflower, cucumbers, corn, chillies, melons, pumpkins, and sunflowers. Start with radishes if thou art new to it — they grow quickly and teach the basics well.",
          summer: "Summer is still good for planting! The shop has chillies, spinach, salad greens, carrots, corn, and radishes available. Melons and pumpkins planted in spring should be coming along nicely — keep watering them!",
          autumn: "Autumn is for onion sets, and onion sets alone! They are special — plant them now, let them sleep through winter, and they shall reward thee come summer. The shop keeps them in stock only this season, so do not delay.",
          winter: "'Tis a time for rest, not planting — the ground is frozen solid. Use the quiet months to plan what thou wouldst like to grow come spring. Radishes and peas are always a fine beginning for a new gardener.",
        },
        responses: [
          { text: 'Any other farming advice?', nextId: 'elias_farming_advice' },
          { text: 'Tell me about foraging instead.', nextId: 'elias_foraging_hub' },
          { text: "That's very helpful, thank you." },
        ],
      },
      {
        id: 'elias_farming_advice',
        text: "Three things I have learned from a lifetime in the garden: water thy crops regularly, or they wilt and die. Use fertiliser if thou hast it — it improves the quality, and a fine vegetable fetches a finer price at market. And patience, young one. The pumpkin is slow, but at harvest time there is nothing more satisfying.",
        responses: [
          { text: 'Which seeds should I plant this season?', nextId: 'elias_seeds_seasonal' },
          { text: 'Thank you, Elias.' },
        ],
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
    },
  });
}
