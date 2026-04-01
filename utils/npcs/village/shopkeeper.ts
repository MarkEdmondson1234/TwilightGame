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
          // ── Always visible ────────────────────────────────────────────────
          {
            text: 'Can you walk me through what you sell?',
            nextId: 'fox_shop_guide',
          },
          {
            text: 'Just browsing, thanks.',
          },

          // ── Acquaintance tier: unlocks once, disappears after asked ───────
          {
            text: "If you're a fox, why do you own a shop?",
            nextId: 'fox_evolution',
            requiredFriendshipTier: 'acquaintance',
            hiddenIfQuestStarted: 'fox_asked_evolution',
            startsQuest: 'fox_asked_evolution',
          },

          // ── After evolution asked: standing_outside unlocks, disappears after asked ──
          {
            text: 'Why do you stand outside all day?',
            nextId: 'standing_outside',
            requiredQuest: 'fox_asked_evolution',
            hiddenIfQuestStarted: 'fox_asked_standing',
            startsQuest: 'fox_asked_standing',
          },

          // ── After standing_outside asked: gossip unlocks ──────────────────
          {
            text: 'Got any gossip for me?',
            nextId: 'shop_gossip',
            requiredQuest: 'fox_asked_standing',
          },

          // ── Good friend: rotating personal topics ─────────────────────────
          // Slot A – Dreams, first time only (quest not yet started)
          {
            text: 'What are your dreams, Mr Fox?',
            nextId: 'fox_dreams',
            requiredFriendshipTier: 'good_friend',
            hiddenIfQuestStarted: 'fox_chat_rotation',
            startsQuest: 'fox_chat_rotation',
            setsQuestStage: { questId: 'fox_chat_rotation', stage: 1 },
          },
          // Slot A – Dreams, recurring (after rotation cycles back to stage 0)
          {
            text: 'What are your dreams, Mr Fox?',
            nextId: 'fox_dreams',
            requiredFriendshipTier: 'good_friend',
            requiredQuest: 'fox_chat_rotation',
            requiredQuestStage: 0,
            maxQuestStage: 0,
            setsQuestStage: { questId: 'fox_chat_rotation', stage: 1 },
          },
          // Slot B – City life (stage 1)
          {
            text: 'Have you ever considered leaving the village?',
            nextId: 'fox_city_life',
            requiredFriendshipTier: 'good_friend',
            requiredQuest: 'fox_chat_rotation',
            requiredQuestStage: 1,
            maxQuestStage: 1,
            setsQuestStage: { questId: 'fox_chat_rotation', stage: 2 },
          },
          // Slot C – Village wishes (stage 2, cycles back to 0)
          {
            text: 'Is there anything you wish were different here?',
            nextId: 'fox_village_wishes',
            requiredFriendshipTier: 'good_friend',
            requiredQuest: 'fox_chat_rotation',
            requiredQuestStage: 2,
            maxQuestStage: 2,
            setsQuestStage: { questId: 'fox_chat_rotation', stage: 0 },
          },

          // ── Picnic quest responses (unchanged) ───────────────────────────
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

      // ── Gossip hub ────────────────────────────────────────────────────────
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

      // ── Standing outside & evolution (now gated, text unchanged) ─────────
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

      // ── Good friend: rotating personal conversations ──────────────────────
      {
        id: 'fox_dreams',
        text: "*is quiet for a moment, watching the square* If I am honest... what I want, above most things, is for this shop to do well. Not extravagantly — I am not a greedy fox. But enough to mean something. *pauses* And a family, in time. A litter, perhaps. Someone to hand this all on to. I think about it sometimes. Standing here in the evenings, watching the light go off the rooftops. Whether there might be small foxes running about one day. *straightens lapel* It is a simple sort of dream. But it is mine.",
      },
      {
        id: 'fox_city_life',
        text: "*considers carefully* I did wonder, once, whether I ought to be somewhere larger. A city, perhaps — better opportunities, more customers, all of that. I even went to visit my cousin. Lives in the capital. Very grand. Marble floors. Dining on the finest things. *pause* But everything else came with it too. The noise, the rush, the sense that if you slipped for a moment, someone would simply step over you. *long pause* My cousin seemed perfectly content. But I came home after three days and felt an enormous amount of relief. I rather think this village was waiting for me.",
      },
      {
        id: 'fox_village_wishes',
        text: "*gazes along the high street* I do wish there were more people here. More life in it. *slight pause* Not that I am unhappy — I love this village, genuinely. But a village this size ought to have a bakery, I think. Proper bread, fresh every morning. A bookshop would not go amiss either. And perhaps — *brightens slightly* — a little café. Somewhere to sit in the afternoon. *wry* I am not talking about competition, you understand. I stock groceries. A café is something else entirely. Just... people. Activity. The sort of place that pulls in travellers who might then wander into a shop.",
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

      // ── Mr Fox's Shop Guide ───────────────────────────────────────────────────

      {
        id: 'fox_shop_guide',
        text: "*straightens up with evident satisfaction* I run a well-organised shop. If thou hast ever wondered what precisely I stock and why, this is thy moment. What category interests thee?",
        responses: [
          { text: 'Tell me about seeds.', nextId: 'fox_seeds_hub' },
          { text: 'What fresh produce do you carry?', nextId: 'fox_fresh_produce' },
          { text: 'What pantry staples do you have?', nextId: 'fox_pantry' },
          { text: 'Dairy and eggs?', nextId: 'fox_dairy' },
          { text: 'Spices, herbs, and oils?', nextId: 'fox_spices' },
          { text: 'Proteins?', nextId: 'fox_proteins' },
          { text: 'Tools and materials?', nextId: 'fox_tools' },
          { text: 'Special items?', nextId: 'fox_specials' },
          { text: "That's all I needed. Thank you." },
        ],
      },

      {
        id: 'fox_seeds_hub',
        text: "Seeds are my most seasonally complex category, so pay attention. I divide them into four groups: spring-only, spring-and-summer, herb seeds, and the autumn varieties. Which wouldst thou like to know about?",
        responses: [
          { text: 'Spring-only seeds.', nextId: 'fox_seeds_spring' },
          { text: 'Spring and summer seeds.', nextId: 'fox_seeds_summer' },
          { text: 'Herb seeds.', nextId: 'fox_seeds_herbs' },
          { text: 'Autumn seeds and carrots.', nextId: 'fox_seeds_autumn' },
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },

      {
        id: 'fox_seeds_spring',
        text: "These must go in the ground during spring. Miss the window and thou art waiting a full year — I cannot stress this enough. *ticks off on fingers* Radish at 5 gold — the fastest crop I stock, good for beginners. Potato at 5 gold. Pea at 8. Salad at 7. Spinach at 8. Broccoli at 20. Cauliflower at 25 — I only stock those in spring, naturally. And the two larger investments: melon at 30 gold and pumpkin at 50. Those last two are strictly spring-only. No exceptions.",
        seasonalText: {
          spring:
            "These must go in during spring — and thou art in luck, because it *is* spring. *ticks off on fingers* Radish at 5 gold, potato at 5, pea at 8, salad at 7, spinach at 8, broccoli at 20, cauliflower at 25 — which I only stock this season. Melon at 30 and pumpkin at 50 gold. The pumpkin in particular is worth planning for. Get them in early.",
          summer:
            "I am afraid spring-only seeds are no longer available. Pumpkin, melon, cauliflower, broccoli, spinach, salad, pea, and potato all needed to go in during spring. My apologies — this is the risk of late planning.",
          autumn:
            "Spring seeds are, by definition, for spring. They are all gone now. If thou art already thinking ahead to next year — which I respect enormously — come back when spring arrives. I keep thorough stock.",
          winter:
            "Spring seeds will not be available until spring returns. I know that is obvious, but thou wouldst be surprised how often I am asked. Come back in a few months.",
        },
        responses: [
          { text: 'Back to seeds.', nextId: 'fox_seeds_hub' },
        ],
      },

      {
        id: 'fox_seeds_summer',
        text: "A more forgiving category — these can go in during spring or summer, so there is a second chance if one misses the first sowing. *counts* Tomato seeds at 15 gold — popular, versatile, good for cooking. Cucumber at 10. Corn at 25. Chili at 15 gold. All can be planted in either spring or summer, though earlier planting gives a longer growing season.",
        seasonalText: {
          spring:
            "Good timing — all four are currently in stock and ready to plant. Tomato at 15, cucumber at 10, corn at 25, chili at 15 gold. If thou art also sowing spring-only crops, do those first and come back for these — they are in no hurry.",
          summer:
            "Still available and still plantable! This is precisely why I call them the forgiving group. Tomato at 15, cucumber at 10, corn at 25, chili at 15. Get them in now and thou shouldst have a good harvest before autumn.",
          autumn:
            "These are spring-and-summer seeds — the planting window is now closed. I still stock them, but planting now would be a wasted investment. They will be back next spring.",
          winter:
            "Spring and summer seeds will return with the warmer weather. I recommend making a shopping list now while thou art thinking about it.",
        },
        responses: [
          { text: 'Back to seeds.', nextId: 'fox_seeds_hub' },
        ],
      },

      {
        id: 'fox_seeds_herbs',
        text: "Herb seeds are a rewarding category — they regrow after harvest, so one purchase goes a long way. Thyme seeds at 8 gold, lavender at 10, and mint at 10. All three can be planted in spring or summer. *slight pause* I should note I also sell dried thyme and rosemary as spices if thou dost not wish to grow thy own — though growing is considerably cheaper in the long run.",
        seasonalText: {
          spring:
            "All three herb seeds are in and ready: thyme at 8, lavender at 10, mint at 10. Spring is a fine time to establish herbs — they will be producing well by summer.",
          summer:
            "Still available and plantable: thyme at 8, lavender at 10, mint at 10. Herb plants established in summer will provide harvests through the rest of the season.",
          autumn:
            "Herb seeds are spring and summer plantings only — they are out of season now. The dried herb spices are still available year-round, however, if thou needest thyme or rosemary for cooking.",
          winter:
            "Herb seeds will return in spring. For cooking herbs this winter, I stock dried thyme, rosemary, and basil in the spice section.",
        },
        responses: [
          { text: 'Back to seeds.', nextId: 'fox_seeds_hub' },
        ],
      },

      {
        id: 'fox_seeds_autumn',
        text: "Two interesting cases. Onion seeds are exclusively an autumn planting at 12 gold — the only crop I know of that categorically refuses any other season. Then there is the carrot at 8 gold: planted in spring, and fresh carrots also come into stock in autumn when they are harvested. They are, in other words, useful across the year.",
        seasonalText: {
          spring:
            "Carrot seeds at 8 gold are available now for spring planting. Onion seeds are an autumn-only item — I do not stock them until then. Fresh carrots will be available again in autumn.",
          summer:
            "Carrot seeds are a spring crop and are no longer in stock for planting. Onion seeds will not arrive until autumn. Come back then.",
          autumn:
            "*brightens slightly* Autumn is precisely the right moment for this section. Onion seeds are in — 12 gold — plant them now. And fresh carrots have just arrived in the produce section at 35 gold if thou dost not wish to grow them thyself.",
          winter:
            "Onion seeds were an autumn item and are out of stock until next autumn. I find winter is a good time to plan the spring garden — makes the cold months feel purposeful.",
        },
        responses: [
          { text: 'Back to seeds.', nextId: 'fox_seeds_hub' },
        ],
      },

      {
        id: 'fox_fresh_produce',
        text: "Fresh produce changes with the seasons — I buy from local farms when things are in harvest. What is available right now depends on the time of year.",
        seasonalText: {
          spring:
            "*counts carefully* Spring produce: fresh strawberries at 45 gold, fresh salad at 35, fresh spinach at 30, and fresh carrots at 35. Strawberry jam also comes in at 25 gold — good if thou dost not wish to cook it thyself. All lovely young growth.",
          summer:
            "Summer is generous. Strawberries are still coming in at 45 gold, and fresh tomatoes have just started at 12 gold. Salad at 35 and spinach at 30 are still excellent. Strawberry jam remains at 25 gold. And I have sunflower bouquets this season only — 80 gold, a real statement piece.",
          autumn:
            "*raises a finger* Blackberries are in at 50 gold — and this is the only time of year thou wilt find them. Do not dawdle. Fresh tomatoes are still going at 12 gold, and carrots are back at 35 gold. Strawberry jam holds on through autumn at 25 gold. The salad and spinach are finished for the year, I am afraid.",
          winter:
            "*folds paws* Fresh produce is done for the year. Winter is a pantry season — everything I stock now is shelf-stable. The fresh crops will return with spring. In the meantime, I have tinned tomatoes in the pantry section, which are a reasonable substitute for certain recipes.",
        },
        responses: [
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },

      {
        id: 'fox_pantry',
        text: "*with calm authority* Pantry staples are available year-round, no exceptions. Flour at 6 gold. Whole grain wheat at 5. Sugar at 8. Salt at 3 — the cheapest item in the shop, and I will not apologise for that. Yeast at 5 gold. Rice at 8. Pasta at 10. Bread at 12 gold, delivered regularly. Tinned tomatoes at 10 gold — useful all winter. Vinegar at 8. And water at 1 gold, which I include for completeness, though I have always felt slightly embarrassed charging for it.",
        responses: [
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },

      {
        id: 'fox_dairy',
        text: "*gestures to the chilled section* Dairy is a reliable year-round category. Milk at 8 gold — the most versatile thing I stock. Cream at 12. Butter at 10. Buttermilk at 12 — essential for certain bakes. Cheese at 20 gold. Eggs at 5 gold, which I would buy in bulk if I were thee. *slight pause* I also stock almonds at 15 gold here — not dairy, technically, but they group well with the baking ingredients.",
        responses: [
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },

      {
        id: 'fox_spices',
        text: "*with quiet enthusiasm* Spices and herbs are a section I take particular interest in. Basil at 10 gold. Dried thyme at 8 — also available as a living herb seed, as I mentioned. Rosemary at 10 gold, likewise. Allspice at 12. Curry powder at 15 — a blend I source specifically. Black pepper at 8, which I would recommend keeping permanently stocked. Cinnamon at 15. *shifts to the oils* Olive oil at 15 gold and sunflower oil at 12. I consider oils to be liquid spices. Others may disagree.",
        responses: [
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },

      {
        id: 'fox_proteins',
        text: "*matter-of-factly* The protein section. Meat at 35 gold — good quality, general purpose. Minced meat at 30, for those who prefer it prepared. Tinned tuna at 15 gold — shelf-stable and underrated. And gravy at 8 gold, which I classify as a protein accompaniment. *brief pause* I am aware that as a fox there is a certain irony in my stocking meat products. I prefer not to dwell on it.",
        responses: [
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },

      {
        id: 'fox_tools',
        text: "*taps counter decisively* Tools. The hoe at 50 gold — tills soil for planting, essential for farming. The watering can at 75 gold — crops must be watered each day or they wilt. *slight pause* The watering can is, I suspect, the item most purchased twice: once by enthusiastic beginners who lose it in the shed, and again when they find it. Fertiliser at 15 gold — applied to tilled soil before planting, it accelerates crop growth considerably. Worth the investment if thou art in a hurry.",
        responses: [
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },

      {
        id: 'fox_specials',
        text: "*with something approaching enthusiasm* Several items that deserve individual mention. For baking: chocolate at 25 gold, vanilla at 20 — essential, do not substitute — cocoa powder at 18, and baking powder at 7. *shifts to another section* For decoration and crafting: linen at 15 gold, wooden frames at 20, ceramic vases at 25, plant pots at 15. The camera at 180 gold is a significant investment, but remarkable for documenting one's travels. *leans forward slightly* And I stock sunflower bouquets at 80 gold — but only in summer. One cannot rush flowers.",
        responses: [
          { text: 'Back to categories.', nextId: 'fox_shop_guide' },
        ],
      },
    ],
    friendshipConfig: {
      canBefriend: true,
      startingPoints: 0,
      likedFoodTypes: ['savoury'],
    },
  });
}
