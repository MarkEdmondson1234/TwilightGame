/**
 * Shopkeeper NPC Factory Function
 *
 * The village shopkeeper who sells seeds and supplies.
 */

import { NPC, Position, EntryAnimation } from '../../../types';
import { npcAssets } from '../../../assets';
import { TIMING } from '../../../constants';
import { createStaticNPC } from '../createNPC';

/**
 * Create a Shopkeeper NPC with friendly animation
 *
 * Behavior:
 * - Static position (stays near shop)
 * - Friendly, attentive animation
 * - Seasonal and time-of-day dialogue about shop wares and village gossip
 * - Optional entry animation (walk-in from left when entering shop)
 *
 * Uses createStaticNPC factory.
 *
 * @param id Unique ID for this shopkeeper
 * @param position Where to place the NPC
 * @param name Optional name (defaults to "Shopkeeper")
 * @param entryAnimation Optional entry walk-in animation config
 */
export function createShopkeeperNPC(
  id: string,
  position: Position,
  name: string = 'Shopkeeper',
  entryAnimation?: EntryAnimation
): NPC {
  return createStaticNPC({
    id,
    name,
    position,
    sprite: npcAssets.shopkeeper_fox_01,
    portraitSprite: npcAssets.shopkeeper_fox_portrait,
    scale: 3.5,
    collisionRadius: 0.4, // NPCs have collision so player can't walk through
    states: {
      idle: {
        sprites: [npcAssets.shopkeeper_fox_01, npcAssets.shopkeeper_fox_02],
        animationSpeed: 500, // Friendly, attentive animation
      },
      walking: {
        sprites: [
          npcAssets.shopkeeper_fox_walk_01,
          npcAssets.shopkeeper_fox_walk_02,
          npcAssets.shopkeeper_fox_walk_03,
          npcAssets.shopkeeper_fox_walk_04,
        ],
        animationSpeed: 220, // Relaxed walk cycle animation
        scale: 2.4, // Smaller scale during walk animation
      },
    },
    initialState: entryAnimation ? 'walking' : 'idle',
    entryAnimation,
    dialogue: [
      {
        id: 'greeting',
        text: 'Welcome to my humble shop! I have the finest goods in all the village. What brings thee here today?',
        seasonalText: {
          spring:
            'Good morrow, traveller! Spring has arrived, and with it fresh seeds for thy garden. What brings thee to my shop this fine day?',
          summer:
            'Greetings, friend! The summer sun shines bright, and my shelves overflow with tools for the harvest season. How may I help thee?',
          autumn:
            'Welcome, welcome! Autumn is upon us, and I have preserves and winter supplies aplenty. What does thy heart desire?',
          winter:
            'Come in from the cold, traveller! Winter has arrived, but my shop stays warm and well-stocked. What can I offer thee today?',
        },
        timeOfDayText: {
          day: 'Welcome to my humble shop! A fine day for business, is it not? What brings thee here?',
          night:
            'Good evening, traveller! Working late tonight? I keep my shop open for night owls like thyself. What dost thou need?',
        },
        weatherText: {
          rain: 'Come in, come in! Get out of that rain! A wet day brings customers seeking shelter - and shopping, I hope! What can I get for thee?',
          snow: 'Brrr! Snowy weather is good for business - everyone needs warm supplies! Come closer to the fire and tell me what thou needest.',
          fog: "Welcome, friend! Hard to see in this fog, isn't it? Good thing my shop is well-lit! What brings thee through the mist?",
          mist: "Ah, misty weather! Perfect for a warm cup of tea and some shopping, wouldn't thou say? Browse at thy leisure!",
          storm:
            'Thank goodness thou made it here safely in this storm! Stay as long as thou needest - my shop is thy shelter. Now, what can I get for thee?',
          cherry_blossoms:
            "Isn't it magical? The petals drift past my shop windows like pink snowflakes! Such weather is good for the soul - and good for business! What can I help thee find?",
        },
        responses: [
          {
            text: 'What do you sell?',
            nextId: 'shop_wares',
          },
          {
            text: 'Any news from travellers?',
            nextId: 'shop_gossip',
          },
          {
            text: 'Why do you stand outside all day?',
            nextId: 'standing_outside',
          },
          {
            text: "If you're a fox, why do you own a shop?",
            nextId: 'fox_evolution',
          },
          {
            text: "What's in season right now?",
            nextId: 'seasonal_wares',
          },
          {
            text: 'Just browsing, thanks.',
          },
          {
            text: 'You seem a little distracted, Mr Fox. Is everything all right?',
            nextId: 'mfp_predicament',
            hiddenIfQuestStarted: 'mr_fox_picnic',
          },
          {
            text: 'Any news on the picnic front?',
            nextId: 'mfp_progress_check',
            requiredQuest: 'mr_fox_picnic',
            hiddenIfQuestCompleted: 'mr_fox_picnic',
          },
          {
            text: 'How are things going with Miss Periwinkle?',
            nextId: 'mfp_post_quest',
            requiredQuest: 'mr_fox_picnic',
            requiredQuestStage: 9,
          },
        ],
      },
      {
        id: 'shop_wares',
        text: 'I have seeds for farming, tools for crafting, and rare trinkets from distant lands. Come inside and see!',
        seasonalText: {
          spring:
            'Ah! Spring seeds are my specialty this season - peas, carrots, and beautiful flower bulbs. I also have new tools fresh from the blacksmith!',
          summer:
            'Thou art in luck! I have watering cans, hoes, and the finest fertiliser for thy summer crops. And cooling drinks, of course!',
          autumn:
            'Perfect timing! I have storage jars for preserves, warm blankets, and seeds that flourish in cooler weather. Stock up before winter!',
          winter:
            'Winter supplies! Warm clothing, preserved foods, and indoor crafts to pass the long evenings. Everything a villager needs!',
        },
      },
      {
        id: 'shop_gossip',
        text: "*leans against the doorframe with evident pleasure* Oh, there is always something worth knowing in a village this size. I make it my business to pay attention — one of the many advantages of standing outside all day. Any particular thread you'd like me to pull on?",
        responses: [
          {
            text: 'Anything about my mum?',
            nextId: 'gossip_mum',
          },
          {
            text: 'What do you know about my father?',
            nextId: 'gossip_father',
          },
          {
            text: 'Any history about this village?',
            nextId: 'gossip_village',
          },
          {
            text: 'Anything about Althea?',
            nextId: 'gossip_althea',
          },
          {
            text: 'Never mind.',
          },
        ],
      },
      {
        id: 'gossip_mum',
        text: "*straightens up with genuine admiration* Your mother's cooking. Now there is a subject worth discussing. I have eaten in a great many places, and I do not say this lightly: the woman is extraordinarily talented. The things she does with a simple stock are frankly unfair to the rest of us. What I cannot fathom — and I have turned this over many times — is why she would leave a thriving restaurant to come here. A village. With one shop. *pauses* Not that there is anything wrong with one shop. But she clearly had something very successful, and she gave it up. I have never quite dared to ask her directly. Perhaps you know more than I do.",
      },
      {
        id: 'gossip_father',
        text: "*raises an eyebrow with considerable interest* Your father! Yes, actually — I was going to mention this. I receive the newspaper, you know, even out here — it takes a few days but it does arrive. And just recently there was a piece about an excavation in Egypt. Quite a significant find, apparently. And there, in the third paragraph, was a name I recognised. *taps nose* I won't say more than that — it wasn't an enormous article, and the details were rather vague — but it was there. He has quite a reputation in certain circles, it seems. I had no idea. You must be proud.",
      },
      {
        id: 'gossip_village',
        text: "*lowers voice slightly, glancing around* Now this one is interesting. There are those who say — and I have heard this from more than one source — that this village is not the first to have stood on this land. That there was an older settlement here before, much older, and that at some point it simply... stopped. What happened to it, nobody seems to know. Or if they do know, they aren't saying. *straightens* I find it rather curious. The ground here has an odd quality to it sometimes. Whether that means anything, I really couldn't say. But I thought you ought to know.",
      },
      {
        id: 'gossip_althea',
        text: "*pauses, choosing words carefully* I will tell you one thing: Althea has a sister. Whether she has mentioned this to you, I do not know. It is not a topic she raises willingly, and I would strongly advise you to pick your moment carefully if you intend to bring it up. Catch her in the wrong mood and you will know about it. Catch her in the right one, though, and... well. I suspect there is quite a story there. I don't know the details myself — she is not exactly forthcoming — but the few things I have gathered suggest it is complicated. *tilts head* More than that, I really cannot say.",
      },
      {
        id: 'standing_outside',
        text: "*gazes around with quiet satisfaction* Ah, you've noticed my post. One observes a great deal from here, you know. The village has a rhythm to it — the baker who always arrives late on Tuesdays, the sparrows that squabble over the same rooftop every single morning. And the seasons! One feels the change in the air before any calendar announces it. I watch the colours shift in the trees, I listen to what people are carrying home from market, I catch the odd scrap of gossip drifting past on the breeze. And the clouds! People never look up nearly enough. This morning I spotted one shaped remarkably like a hedgehog carrying an umbrella.",
        seasonalText: {
          spring:
            "*takes a slow, contented breath* Spring is when it's finest, I think. Everything waking up at once — the birds, the blossoms, the mud. I watch the villagers come out of their winter shells, blinking like newborns. Very gratifying. And the cloud formations this time of year are exceptional.",
          summer:
            "*fans himself slightly* The summer light is extraordinary out here. Long evenings, golden hour lasting for ever. I watch the swallows practising their aerobatics over the square. One in particular is showing off terribly. I've named him Gerald.",
          autumn:
            "*tilts head thoughtfully* Autumn is the finest season for listening. Everyone's in a hurry, everyone has something to say. The harvest gossip alone is worth standing out here for. And the colours — *gestures vaguely at the trees* — well. Even a fox can appreciate that.",
          winter:
            "*tucks paws together* One must admit winter is somewhat less comfortable. But there is something peaceful about watching snow settle on the square. Very few clouds worth studying, mind you — they all look the same in winter. Grey. Featureless. A disappointment.",
        },
      },
      {
        id: 'fox_evolution',
        text: "*blinks slowly, as if the question is both obvious and mildly exhausting* You might as well ask why, if *you're* a primate, you aren't currently swinging between trees. It is a simple matter of evolution. E-vo-lu-tion. Certain species — myself, the bear, the elves — have quite clearly developed considerably larger brains over time. Larger brains led to speech. Speech led to commerce. Commerce led, naturally, to shops. This is not to say it couldn't have gone differently, of course. One can easily imagine a parallel universe where quite other creatures made the leap — a world where, say, elves have rounded ears and walk about on four legs, while foxes... well. *smooths lapel* We turned out rather well, I think.",
      },
      {
        id: 'seasonal_wares',
        text: 'Good question. My pantry staples are available year-round — flour, sugar, salt, oils, spices, dairy — the foundations of any decent kitchen. But fresh produce? That changes with the seasons. Ask me again and I can tell you what is particularly worth buying right now.',
        seasonalText: {
          spring:
            "*counts on a paw* Spring is a fine time to stock up. Fresh strawberries and strawberry jam are in, as are salad leaves and spinach — lovely young growth. Carrot seeds are ready for planting, and if you want strawberry plants, now is precisely the moment. The pantry staples are of course always here whenever you need them.",
          summer:
            '*leans forward slightly* Summer is generous. Strawberries are still coming in beautifully, and the tomatoes are just beginning — I have fresh tomatoes and tomato seeds for those who want to grow their own. Salad and spinach remain excellent. Strawberry jam, naturally. And everything in the pantry, as always — flour, sugar, spices, the lot.',
          autumn:
            "*raises a finger* Autumn is when the blackberries arrive — only available now, so do not dawdle. Tomatoes are still going, and carrots come back into stock this season as well. Strawberry jam holds on through autumn too. The fresh greens — salad, spinach — are gone for the year, I am afraid. Stock up on pantry essentials now before the winter merchants thin out.",
          winter:
            "*folds paws* I won't mislead you — fresh seasonal produce is done for the year. Winter is a pantry season. But I am very well stocked: flour, sugar, salt, yeast, oils, all your dairy, spices, herbs, rice, pasta. Everything you need to cook through the cold months. The seeds and fresh crops will return in spring. Until then, it is casserole weather.",
        },
      },
      // ── Mr Fox's Picnic Quest ─────────────────────────────────────────────

      // Proximity-triggered offer (opened via useProximityQuestTriggers hook)
      {
        id: 'mfp_offer',
        text: "Ohoy, there! I say — I'm in a bit of a predicament. Wondering if you'd be willing to help out this silly ol' fox?",
        responses: [
          {
            text: 'Of course! What is it?',
            nextId: 'mfp_explanation',
          },
          {
            text: "I'd rather not, sorry.",
            nextId: 'mfp_decline',
          },
        ],
      },

      // Accessible from the greeting when quest not yet started
      {
        id: 'mfp_predicament',
        text: "*pauses and smooths his lapel* Ah. Well. There is... a matter. Rather a personal one. I wasn't going to mention it, but since you've asked...",
        responses: [
          {
            text: "You can tell me.",
            nextId: 'mfp_explanation',
          },
          {
            text: "Sorry for prying!",
          },
        ],
      },

      // The decline path
      {
        id: 'mfp_decline',
        text: "*straightens up* Quite all right, quite all right. No need to trouble yourself on my account. I shall... manage. Probably.",
        responses: [
          {
            text: "Actually — what's the matter?",
            nextId: 'mfp_explanation',
          },
          {
            text: 'Good luck!',
          },
        ],
      },

      // Mr Fox explains his feelings — this starts the quest
      {
        id: 'mfp_explanation',
        text: "Well... *clears throat* ...truth be told, I have rather developed a — a — a *fondness* for Miss Periwinkle. The rabbit who visits young Celia. She is — she is quite extraordinary, in my view. Clever, and kind, and she laughs at things I say even when they aren't entirely funny. And I find myself at a complete and utter loss about what to do about it.",
        responses: [
          {
            text: "You could invite her on a picnic!",
            nextId: 'mfp_suggestion',
          },
        ],
      },

      // Player suggests a picnic
      {
        id: 'mfp_suggestion',
        text: "*eyes light up* A picnic! Yes! Yes, of course! That is — that is marvellous. A picnic in the meadow, warm afternoon, perhaps some good food... *deflates slightly* Ah. There is one small snag. I don't actually own a picnic blanket.",
        responses: [
          {
            text: "I could ask my mother if she has one.",
            nextId: 'mfp_blanket_offer',
          },
        ],
      },

      // Player offers to find blanket — starts quest
      {
        id: 'mfp_blanket_offer',
        text: "Would you? Oh, that would be most marvellous. I shall be right here, practising what I intend to say. *under breath* 'Lovely weather we're having.' No, too dull. 'Have you read anything interesting?' Better.",
        responses: [
          {
            text: "I'll find you a blanket.",
            nextId: undefined,
            startsQuest: 'mr_fox_picnic',
          },
        ],
      },

      // Progress check during the quest (from greeting)
      {
        id: 'mfp_progress_check',
        text: "*straightens lapel* Yes, well. The picnic situation is very much on my mind. I do appreciate your help.",
      },

      // Stage 4: Player has the blanket and can give it
      {
        id: 'mfp_give_blanket',
        text: "Oh! Is that — is that the picnic blanket? *reaches forward, then composes himself* My goodness. You actually found one. Thank you — truly, thank you.",
        responses: [
          {
            text: "It was buried in the seed shed. I had to tidy the whole place up to find it.",
            nextId: 'mfp_blanket_thanks',
          },
        ],
      },

      {
        id: 'mfp_blanket_thanks',
        text: "*blinks* You tidied the shed? The whole shed? ...Good heavens. I — well. That is really rather above and beyond, and I want you to know I am genuinely, sincerely grateful. *smooths the blanket carefully* This is going to be perfect. Absolutely perfect. Now all I need is — *stops suddenly*",
        responses: [
          {
            text: "Is something wrong?",
            nextId: 'mfp_cooking_confession',
          },
        ],
      },

      // Mr Fox admits he cannot cook
      {
        id: 'mfp_cooking_confession',
        text: "*pauses* ...There is, I confess, one further issue. I cannot cook. At all. I attempted boiled eggs once. They were somehow simultaneously raw and burnt. I do not know how I managed it. *long pause* So the question of what to put IN the picnic basket remains rather open.",
        responses: [
          {
            text: "Perhaps I could ask my mother for help?",
            nextId: 'mfp_cooking_agreed',
          },
        ],
      },

      {
        id: 'mfp_cooking_agreed',
        text: "Your mother? *brightens considerably* Oh, now THERE is an idea. She is an excellent cook, from what I understand. If you could prevail upon her — yes, I think that might work rather well.",
        responses: [
          {
            text: "I'll ask her.",
            nextId: undefined,
            advancesQuest: 'mr_fox_picnic',
          },
        ],
      },

      // Stage 8: Player has a full basket and can give it
      {
        id: 'mfp_give_basket',
        text: "*peers into basket, then looks up with wide eyes* Oh. Oh my. That looks — that looks wonderful. *swallows* Right. I am going to do this. I am going to invite Miss Periwinkle on a picnic. Thank you. Truly.",
        responses: [
          {
            text: "You've got this, Mr Fox. Go for it!",
            nextId: 'mfp_basket_accepted',
            completesQuest: 'mr_fox_picnic',
          },
        ],
      },

      // Basket not full enough
      {
        id: 'mfp_basket_too_empty',
        text: "*peers into basket politely* Oh — I don't mean to be ungrateful, truly, you've been wonderfully helpful — but it does look a little sparse. Perhaps just a bit more variety? Something for every course, ideally.",
      },

      // Post-giving — the picnic happens
      {
        id: 'mfp_basket_accepted',
        text: "*straightens coat, takes a deep breath* Right then. *quietly, mostly to himself* Don't mention the clouds. Don't mention the clouds.",
      },

      // Post-quest: Mr Fox gushes
      {
        id: 'mfp_post_quest',
        text: "*a slow, involuntary smile spreads across his face* Things are going... rather well, actually. Miss Periwinkle said — and I am quoting directly — that it was the loveliest afternoon she'd had in years. She asked if we might do it again sometime. *collects himself* I said I would think about it. I had already planned it. In detail. The previous evening.",
        responses: [
          {
            text: "That's wonderful, Mr Fox.",
            nextId: 'mfp_post_quest_2',
          },
        ],
      },

      {
        id: 'mfp_post_quest_2',
        text: "*quietly* She laughed at something I said about clouds. It wasn't even meant to be funny. *long pause* I think I am in rather serious trouble.",
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['savoury'],
    },
  });
}
