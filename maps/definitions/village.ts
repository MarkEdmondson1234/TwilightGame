import { MapDefinition, TileType, Direction, NPCBehavior } from '../../types';
import { parseGrid } from '../gridParser';
import { createCatNPC } from '../../utils/npcFactories';
import { npcAssets } from '../../assets';

/**
 * Village - Central hub area
 *
 * A small village with:
 * - Path network connecting areas
 * - Multiple buildings (shop, houses, etc.) using building tiles
 * - Entrance to home (door D at bottom-center)
 * - Mine entrance (M)
 * - Exit to forest areas (paths at edges)
 *
 * Grid Legend:
 * G = Grass
 * L = Wall boundary (trees for map edges)
 * R = Rock (in-map decorative obstacles)
 * P = Path
 * W = Water
 * D = Door (back to home)
 * S = Shop Door
 * M = Mine Entrance
 * B = Building Wall
 * O = Building Roof
 * N = Building Door (eNtrance)
 * V = Building Window
 * K = Cottage (4x4 wooden house)
 * X = Farm plot (fallow soil)
 * U = Bush (decorative foliage)
 * Y = Tree (large decorative tree)
 * Z = Big Tree (extra large tree)
 * J = Cherry Tree (seasonal tree with blossoms/fruit)
 */

const gridString = `
ZLULYZLLULYLLULUUULLUYLLYULJL
LZGGGGGZGGGPGGZGOOOOGGZGGWWWL
YGGGGGGGGGGPGGGGOBVBXXXGGWWWJ
LGGGGGGGGGGPGGGGOBVBXXXGGWWWL
YGZGGGGKGGGPGGGGOBNBGGGGGWWWL
YYGGGGGPPPPPPPPGGGGGGGGGGWWUL
YGGGGGGPGGGGGGGPGGGGGGGGGGGGZ
LGGGGGGPGGGGGGGPGGGGGGGGUGGL
YGGGGGGPOOOOOUGPGGGGGGGGRGRL
LGGGGGGPOBVBOGPGGGOOGGGGGGGGL
JGGGGGGPOBVBOGPGGOOOGRGRGGRGJ
LZGGGGGPOBNBOGPGGOMOGRXXXGGGL
YGGGGGGPGGGGGGPGGGGGGGGGGGGP
LGGGGGGPPPPPPPPPGGGGGGGGGGGPZ
LGGGGGGGGGGPGGGGGGGGGGGUUGGPU
LPPPPPPPPPPPPPPPPPPPPPPPPPPPL
ZGGGGGGGGGGPGGGGGGGGGGGGGGGGY
UZOOOGGGUGPPGGGGGGGGGGGGGGGGL
LGOBVBXGGGPGGGGGGGGGGGGGGGGL
ZGOBVBXGGGPGGGGGGGGGGGGGGGGZ
LGOBNBXGGGPGGGGGGGGGGGGGGGGL
LGGGGGGGGGGPGGGGGJGGGGGGGGGGZ
ZGGGGGGGGGGPGGGGGGGGGGGGGGGGU
UGGGGGGOOOOPGGGGGGGGKGGGGGGUL
YGGGGGGOBVBPGGGGGGGGGGGGGGGUJ
LGGGGGGOBVBPGGGGGGGGGGGGGGGGL
JGGGGGGOBNBPGGGGGGGGGGGGGGGGL
LGGGGGGGGGGPGGGGGGGXXXXXGGGGU
ZGYGGGGGGGGPPPPPPPPPPPPPPPPPP
YLYLJLZLYLUULULJLYLULULUYLLUUU
`;

export const village: MapDefinition = {
  id: 'village',
  name: 'Village',
  width: 30,
  height: 30,
  grid: parseGrid(gridString),
  colorScheme: 'village',
  isRandom: false,
  spawnPoint: { x: 15, y: 27 }, // On the path below the home building
  transitions: [
    {
      fromPosition: { x: 9, y: 26 }, // Home building door (N tile)
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'home_interior',
      toPosition: { x: 5, y: 6 },
      label: 'To Home',
    },
    {
      fromPosition: { x: 7, y: 4 }, // North-west house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house1',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 18, y: 4 }, // North-east house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house2',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 10, y: 11 }, // Shop building (middle-left)
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'shop',
      toPosition: { x: 7, y: 8 },
      label: 'To Shop',
    },
    {
      fromPosition: { x: 4, y: 20 }, // South-west house
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house3',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 9, y: 26 }, // South-center house door (N tile)
      tileType: TileType.BUILDING_DOOR,
      toMapId: 'house4',
      toPosition: { x: 3, y: 4 },
      label: 'To House',
    },
    {
      fromPosition: { x: 19.4, y: 23 }, // Cottage entrance (K tile)
      tileType: TileType.COTTAGE,
      toMapId: 'cottage_interior',
      toPosition: { x: 5, y: 6 },
      label: 'To Cottage',
    },
    {
      fromPosition: { x: 18, y: 11 }, // Mine entrance (M tile)
      tileType: TileType.MINE_ENTRANCE,
      toMapId: 'RANDOM_CAVE',
      toPosition: { x: 17, y: 12 },  // Spawn in center of cave (safe zone)
      label: 'To Mine',
    },
    {
      fromPosition: { x: 28, y: 12 }, // East exit to forest (last G before R border)
      tileType: TileType.GRASS,
      toMapId: 'RANDOM_FOREST',
      toPosition: { x: 20, y: 15 },  // Spawn in center of forest (safe zone)
      label: 'To Forest',
    },
    {
      fromPosition: { x: 28, y: 28 }, // Bottom-right corner of village
      tileType: TileType.GRASS,
      toMapId: 'farm_area',
      toPosition: { x: 10, y: 24 },
      label: 'To Farm',
    },
  ],
  npcs: [
    {
      id: 'village_elder',
      name: 'Village Elder',
      position: { x: 15, y: 22 }, // Nice spot near the cherry tree on main path
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: npcAssets.elderly_01, // Optimized sprite for in-game rendering
      portraitSprite: npcAssets.elderly_portrait, // High-res for dialogue
      scale: 3.0, // Slightly smaller than default 4.0
      dialogue: [
        {
          id: 'greeting',
          text: 'Hail and well met, traveller! A fine day to rest beneath this ancient tree.',
          seasonalText: {
            spring: 'Hail and well met, traveller! Behold the cherry blossoms in their springtime glory. Art thou not filled with wonder?',
            summer: 'Hail and well met, traveller! The cherry tree bears sweet fruit this season. Mayhaps thou wouldst care to taste?',
            autumn: 'Hail and well met, traveller! See how the cherry leaves turn crimson and gold. \'Tis my favourite season, watching nature\'s gentle farewell.',
            winter: 'Hail and well met, traveller! Even in winter\'s grasp, this old tree stands strong. Much like we villagers, eh?',
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
            {
              text: 'Farewell, elder.',
            },
          ],
        },
        {
          id: 'tree_admiration',
          text: 'Aye, this cherry tree hath stood here longer than I have lived. A comfort in changing times.',
          seasonalText: {
            spring: 'Indeed! Each spring I am blessed to witness the blossoms anew. They remind me that beauty returns, even after the harshest winter.',
            summer: 'Aye! The fruit is sweetest when shared with friends. In my youth, we children would climb these very branches.',
            autumn: 'Thou hast a keen eye, traveller. These autumn leaves fall like nature\'s own farewell, painting the ground in fire. I have watched this display for nigh on seventy years, and still it moves my heart.',
            winter: 'True, true. Bare branches against the snow... there is a stark beauty in it. The tree rests, gathering strength for spring.',
          },
          responses: [
            {
              text: 'How long have you lived here?',
              nextId: 'elder_history',
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
              text: 'Thank you for sharing.',
            },
          ],
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
      ],
      animatedStates: {
        currentState: 'idle',
        states: {
          idle: {
            sprites: [npcAssets.elderly_01, npcAssets.elderly_02],
            animationSpeed: 800, // Slow gentle animation (800ms per frame)
          },
        },
        lastStateChange: Date.now(),
        lastFrameChange: Date.now(),
        currentFrame: 0,
      },
    },
    {
      id: 'shopkeeper',
      name: 'Shopkeeper',
      position: { x: 8, y: 12 }, // On path near shop entrance (moved left to not block door)
      direction: Direction.Down,
      behavior: NPCBehavior.STATIC,
      sprite: '/TwilightGame/assets/npcs/shopkeeper.svg',
      dialogue: [
        {
          id: 'greeting',
          text: 'Welcome to my humble shop! I have the finest goods in all the village. What brings thee here today?',
          seasonalText: {
            spring: 'Good morrow, traveller! Spring has arrived, and with it fresh seeds for thy garden. What brings thee to my shop this fine day?',
            summer: 'Greetings, friend! The summer sun shines bright, and my shelves overflow with tools for the harvest season. How may I help thee?',
            autumn: 'Welcome, welcome! Autumn is upon us, and I have preserves and winter supplies aplenty. What does thy heart desire?',
            winter: 'Come in from the cold, traveller! Winter has arrived, but my shop stays warm and well-stocked. What can I offer thee today?',
          },
          timeOfDayText: {
            day: 'Welcome to my humble shop! A fine day for business, is it not? What brings thee here?',
            night: 'Good evening, traveller! Working late tonight? I keep my shop open for night owls like thyself. What dost thou need?',
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
              text: 'Just browsing, thanks.',
            },
          ],
        },
        {
          id: 'shop_wares',
          text: 'I have seeds for farming, tools for crafting, and rare trinkets from distant lands. Come inside and see!',
          seasonalText: {
            spring: 'Ah! Spring seeds are my specialty this season - peas, carrots, and beautiful flower bulbs. I also have new tools fresh from the blacksmith!',
            summer: 'Thou art in luck! I have watering cans, hoes, and the finest fertiliser for thy summer crops. And cooling drinks, of course!',
            autumn: 'Perfect timing! I have storage jars for preserves, warm blankets, and seeds that flourish in cooler weather. Stock up before winter!',
            winter: 'Winter supplies! Warm clothing, preserved foods, and indoor crafts to pass the long evenings. Everything a villager needs!',
          },
        },
        {
          id: 'shop_gossip',
          text: 'Ah yes! A merchant from the east spoke of strange lights in the cave. Most peculiar indeed...',
          seasonalText: {
            spring: 'A farmer mentioned the fields are blooming earlier than usual this year. The cherry blossoms came overnight! Quite magical, really.',
            summer: 'Travellers say the forest is thick with berries this summer. But they also warn of increased wildlife activity. Be careful out there!',
            autumn: 'The elder cannot stop talking about the autumn colours this year. He spends all day beneath that cherry tree! Sweet old fellow.',
            winter: 'Merchants are avoiding the mountain passes - too much snow already. We might not see traders until spring. Best stock up now!',
          },
        },
      ],
    },
    {
      id: 'child',
      name: 'Village Child',
      position: { x: 15, y: 17 }, // On main path in village center
      direction: Direction.Right,
      behavior: NPCBehavior.WANDER,
      sprite: npcAssets.little_girl,
      portraitSprite: npcAssets.little_girl_portrait, // High-res for dialogue
      dialogue: [
        {
          id: 'greeting',
          text: 'Hi! Want to play? My mum says I can\'t go to the forest alone. It\'s not fair!',
          seasonalText: {
            spring: 'Hi! Look at all the pretty flowers! Do you want to help me pick some? Mum loves springtime bouquets!',
            summer: 'Hi! It\'s so hot today! Want to play by the water? We could splash around and cool off!',
            autumn: 'Hi! Have you seen all the colourful leaves? I\'ve been collecting the prettiest ones! Want to see my collection?',
            winter: 'Hi! Did you see the snow? I want to build a snowman but mum says it\'s too cold. Will you help me convince her?',
          },
          timeOfDayText: {
            day: 'Hi! Want to play? The sun is out and it\'s perfect for adventures!',
            night: 'Hi! I\'m supposed to be in bed, but I snuck out. Don\'t tell mum, okay? Want to look at the stars with me?',
          },
          responses: [
            {
              text: 'What do you like to play?',
              nextId: 'play_games',
            },
            {
              text: 'Tell me about the village.',
              nextId: 'child_tales',
            },
            {
              text: 'Maybe another time!',
            },
          ],
        },
        {
          id: 'play_games',
          text: 'I like hide and seek! And exploring! But mum says the forest is too dangerous...',
          seasonalText: {
            spring: 'In spring I love picking flowers and chasing butterflies! The cherry blossoms are my favourite - they fall like pink snow!',
            summer: 'In summer I play in the stream and catch frogs! Sometimes the shopkeeper gives me ice treats when it\'s really hot!',
            autumn: 'In autumn I collect the biggest, most colourful leaves I can find! And I jump in the big leaf piles - it\'s so much fun!',
            winter: 'In winter I make snow angels and have snowball fights with the other children! But mum makes me wear so many layers I can barely move!',
          },
        },
        {
          id: 'child_tales',
          text: 'The elder tells the best stories! He knows everything about the village. And the shopkeeper always has sweets!',
          seasonalText: {
            spring: 'Everyone is happy in spring! The farmers plant their seeds, and mum says new baby animals are born. I want to see a baby lamb!',
            summer: 'Summer is the best! We have festivals and everyone stays outside late. Sometimes mum lets me stay up to see the fireflies!',
            autumn: 'The elder says autumn is his favourite. He sits by the cherry tree all day! I think he might be a bit lonely sometimes.',
            winter: 'Winter is hard for the older villagers. Mum says we should check on our neighbours and share what we have. That\'s what family does.',
          },
        },
        {
          id: 'forest_story',
          text: 'Mum says there are big scary monsters! But I bet they\'re not THAT scary. Are they?',
          responses: [
            {
              text: 'They can be dangerous, listen to your mum.',
              nextId: 'safety_lesson',
            },
            {
              text: 'Maybe when you\'re older.',
            },
          ],
        },
        {
          id: 'safety_lesson',
          text: 'Okay... I guess I\'ll wait till I\'m bigger. Will you tell me about your adventures sometime?',
          timeOfDayText: {
            day: 'Okay, okay... I\'ll be careful. But when I\'m grown up, I\'m going to have the BIGGEST adventures! Just you wait!',
            night: 'Fine... but the forest looks so mysterious at night. I bet there are magical things that only come out when it\'s dark!',
          },
        },
      ],
    },
    // Add cat NPC using factory function
    createCatNPC('village_cat', { x: 25, y: 23 }, 'Sleepy Cat'),
  ],
};
