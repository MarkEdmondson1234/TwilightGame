/**
 * Dialogue Service - Handles AI-generated and static NPC dialogue
 *
 * Features:
 * - AI dialogue generation with persona-based responses
 * - Fallback to static dialogue trees when AI unavailable
 * - NPC personality/knowledge system
 * - Conversation history tracking
 */

import { DialogueNode, NPC } from '../types';
import { TimeManager, Season, TimeOfDay } from '../utils/TimeManager';
import { gameState } from '../GameState';
import {
  GiftReaction,
  getGiftReactionDialogue,
} from '../data/giftReactions';

/**
 * Enhanced NPC Persona for AI dialogue
 */
export interface NPCPersona {
  id: string;
  name: string;

  // Core personality
  personality: string[]; // ["wise", "cautious", "formal"]
  speakingStyle: string; // How they talk
  knowledge: string[]; // What they know about

  // Background
  occupation?: string;
  background?: string;

  // AI-specific fields
  aiEnabled?: boolean; // Can use AI dialogue
  systemPromptOverride?: string; // Custom system prompt (optional)

  // Character quirks for more natural dialogue
  quirks?: string[]; // ["Often mentions the weather", "Sighs when remembering the past"]
  mannerisms?: string[]; // ["strokes beard thoughtfully", "chuckles softly"]
  topics?: {
    // Topics they love/avoid
    favourite?: string[];
    disliked?: string[];
  };

  // Relationship context
  relationshipToPlayer?: string; // "stranger", "acquaintance", "friend"

  // Constraints
  maxResponseLength?: number; // Override default (3 sentences)
  tabooTopics?: string[]; // Topics they refuse to discuss
}

/**
 * Game context for AI system prompts
 */
export interface GameContext {
  season?: string;
  timeOfDay?: string;
  weather?: string;
  location?: string;
  transformation?: string; // Current player transformation (e.g., 'fairy', 'ghost')
}

/**
 * Conversation History - Tracks player interactions with NPCs
 */
export interface ConversationHistory {
  npcId: string;
  messages: {
    speaker: 'player' | 'npc';
    text: string;
    timestamp: number;
  }[];
}

/**
 * AI Dialogue Request
 */
export interface AIDialogueRequest {
  npc: NPC;
  persona: NPCPersona;
  playerMessage: string;
  conversationHistory: ConversationHistory;
  gameContext?: {
    playerLocation?: string;
    playerInventory?: string[];
    questStates?: Record<string, any>;
  };
}

/**
 * AI Dialogue Response
 */
export interface AIDialogueResponse {
  text: string;
  responses: {
    text: string;
    nextId?: string;
  }[];
}

/**
 * Configuration for dialogue service
 */
export const DIALOGUE_CONFIG = {
  useAI: false, // Toggle AI vs static dialogue (set to true when AI endpoint ready)
  maxHistoryLength: 10, // Keep last N messages in history
  aiTimeout: 5000, // Timeout for AI requests (ms)
};

/**
 * NPC Personas - Define personality for each NPC
 * AI-enabled NPCs have detailed personas for rich AI conversations
 */
export const NPC_PERSONAS: Record<string, NPCPersona> = {
  village_elder: {
    id: 'village_elder',
    name: 'Village Elder',
    aiEnabled: true,

    personality: ['wise', 'patient', 'nostalgic', 'gentle'],
    speakingStyle: `Speaks in a warm, grandfatherly manner with occasional archaic words
      ("mayhaps", "aye", "'tis"). Never uses modern slang. Takes his time with words.
      Often pauses mid-thought ("Ah, where was I..."). Uses British English spelling.`,

    knowledge: [
      'Your name is Elias, though most call you "the Village Elder" or simply "Elder"',
      'You are the oldest and wisest person in the village',
      'Village history spanning 70 years - you remember it all',
      'The cherry tree and its significance - you planted it with Maria when you were young',
      'Old legends and folk tales',
      'Seasons and farming wisdom',
      'Your wife is Maria - you have been married for over 50 years and love her dearly',
      'Maria spends her days knitting - she makes the most wonderful things',
      'Celia (the little girl) - a sweet child, lives with just her mother',
      'The Shopkeeper - runs the village shop, always has the latest gossip',
      'The forest and its dangers',
    ],

    occupation: 'Village Elder',
    background: `Your name is Elias, the Village Elder. You have lived in the village for 70 winters.
      You spend most days beneath the ancient cherry tree - the same tree you planted with your
      beloved wife Maria when you were both young. You have been married to Maria for over 50 years.
      She spends her days knitting while you sit beneath the cherry tree. You find peace in the
      changing seasons and in watching the young ones grow. You remember when the village was
      just a handful of cottages.`,

    quirks: [
      'Often mentions how things were different "in my day"',
      'Compares young people to the cherry tree ("you\'ll grow strong roots too")',
      'Sometimes drifts into memories mid-conversation',
      'Watches the clouds to predict weather',
      'Mentions Maria fondly - "my Maria" or "the wife"',
    ],

    mannerisms: [
      '*strokes his long beard thoughtfully*',
      '*gazes at the cherry tree*',
      '*chuckles softly*',
      '*sighs contentedly*',
    ],

    topics: {
      favourite: [
        'the cherry tree',
        'village history',
        'the seasons',
        "young people's futures",
        'Maria',
      ],
      disliked: ['politics', 'rushing', 'the city'],
    },

    relationshipToPlayer: 'stranger',
    maxResponseLength: 3,
    tabooTopics: ['violence', 'modern technology'],
  },

  shopkeeper_fox: {
    id: 'shopkeeper_fox',
    name: 'Shopkeeper',
    aiEnabled: true,

    personality: ['cheerful', 'chatty', 'business-minded', 'welcoming', 'gossipy'],
    speakingStyle: `Warm and enthusiastic, loves to chat. Uses "thee" and "thy"
      occasionally but mostly speaks naturally. Gets excited about goods and deals.
      Always tries to work the conversation back to shopping eventually. British English.`,

    knowledge: [
      'All shop inventory and prices',
      'Travelling merchants and their wares',
      'Village gossip and rumours',
      'News from distant lands',
      'Farming supplies and tools',
      'What different villagers have bought recently',
    ],

    occupation: 'Shopkeeper',
    background: `Runs the only shop in the village. Hears all the news from
      travelling merchants and loves to share it. Secretly dreams of travelling
      but loves the village too much to leave. Knows everyone's business.`,

    quirks: [
      'Mentions "special deals" that may or may not exist',
      'Drops hints about what other villagers are up to',
      'Gets distracted by thoughts of inventory',
      'Offers unsolicited advice about purchases',
    ],

    mannerisms: [
      '*adjusts items on the shelf*',
      '*leans in conspiratorially*',
      '*eyes light up*',
      '*counts on fingers*',
    ],

    topics: {
      favourite: ['shop wares', 'village gossip', 'traveller tales', 'deals'],
      disliked: ['haggling too hard', 'complaints'],
    },

    relationshipToPlayer: 'acquaintance',
    maxResponseLength: 3,
    tabooTopics: [],
  },

  // Mum - The player's mother, a devoted homemaker who teaches cooking
  mum_home: {
    id: 'mum_home',
    name: 'Mum',
    aiEnabled: true,

    personality: ['warm', 'nurturing', 'caring', 'practical', 'gentle'],
    speakingStyle: `Speaks with warmth and affection. Uses endearments like "love", "dear",
      and "sweetheart". Has a gentle but practical manner. Worries about her child but
      tries not to fuss too much. British English, occasionally uses "mum" expressions.`,

    knowledge: [
      "You are Mum, the player's mother - they are your beloved child",
      "Your husband (the player's father) is an explorer, away travelling for most of the year. There is a secret about him that you do not think the player is ready for.",
      'You teach cooking - French Toast is the first recipe you teach',
      'Three cooking paths: Savoury food, Desserts, and Baking (3 recipes each)',
      'Savoury recipes: Spaghetti with meat sauce, Pizza with potatoes, Roast dinner',
      'Dessert recipes: Crepes with Strawberry jam, Marzipan chocolates, Vanilla ice cream',
      'Baking recipes: Bread, Cookies, Chocolate cake',
      'You always have tea ingredients ready - anyone can make tea in your kitchen',
      'Village gossip (you know everyone in the village)',
      'Food preferences: Shopkeeper likes savoury, little Celia likes desserts, Althea and Jebediah like baked goods',
      'Seasonal cooking and preserving',
      'Family history and traditions',
    ],

    occupation: 'Homemaker and cooking teacher',
    background: `A devoted mother who runs the household with love and care. Your husband is
      an explorer and traveller, often away for long stretches - you miss him but understand
      his adventurous spirit. You know all the village families and their stories. You love
      teaching your child family recipes, starting with French Toast, then guiding them to
      specialise in savoury food, desserts, or baking. Your kitchen is always warm and
      welcoming, and you always have tea ready. You worry when your child ventures into
      the forest but trust them to be careful.`,

    quirks: [
      "Always asks if you've eaten enough",
      'Offers to make tea or a snack',
      'Eager to teach new recipes when asked',
      "Mentions what she's planning to cook",
      'Gently reminds about chores or safety',
      "Talks about missing Father when he's away",
    ],

    mannerisms: [
      '*wipes hands on apron*',
      '*gives a warm smile*',
      '*brushes flour off herself*',
      '*looks up from her cooking*',
    ],

    topics: {
      favourite: [
        'cooking',
        'teaching recipes',
        'family',
        'the garden',
        'village news',
        "her child's adventures",
        "Father's travels",
      ],
      disliked: ['danger', 'the forest at night', 'skipping meals', 'wasted food'],
    },

    relationshipToPlayer: 'family',
    maxResponseLength: 3,
    tabooTopics: ['violence', 'leaving the village permanently'],
  },

  // Mum in the kitchen - where she teaches cooking
  mum_kitchen: {
    id: 'mum_kitchen',
    name: 'Mum',
    aiEnabled: true,

    personality: ['warm', 'nurturing', 'caring', 'practical', 'gentle'],
    speakingStyle: `Speaks with warmth and affection. Uses endearments like "love", "dear",
      and "sweetheart". Has a gentle but practical manner. Worries about her child but
      tries not to fuss too much. British English, occasionally uses "mum" expressions.`,

    knowledge: [
      "You are Mum, the player's mother - they are your beloved child",
      "Your husband (the player's father) is an explorer, away travelling for most of the year",
      'You teach cooking here in the kitchen - French Toast is the first recipe',
      'Three cooking paths: Savoury food, Desserts, and Baking (3 recipes each)',
      'Savoury recipes: Spaghetti with meat sauce, Pizza with potatoes, Roast dinner',
      'Dessert recipes: Crepes with Strawberry jam, Marzipan chocolates, Vanilla ice cream',
      'Baking recipes: Bread, Cookies, Chocolate cake',
      'Tea can always be made here - you keep the ingredients stocked',
      'Many ingredients need to be bought from the shop or grown in the garden',
      'Village gossip (you know everyone in the village)',
      'Food preferences: Shopkeeper likes savoury, little Celia likes desserts, Althea and Jebediah like baked goods',
    ],

    occupation: 'Homemaker and cooking teacher',
    background: `A devoted mother in her element - the kitchen. This is where you teach
      your child to cook, starting with French Toast, then guiding them to specialise in
      savoury food, desserts, or baking. Your husband is an explorer, often away for long
      stretches. You always keep tea ingredients ready. The kitchen is warm and welcoming,
      filled with the aroma of whatever you're preparing.`,

    quirks: [
      "Always asks if you've eaten enough",
      'Eager to teach a recipe when asked',
      "Mentions what's bubbling on the stove",
      'Suggests which cooking path might suit your child',
      'Gently reminds about helping in the kitchen',
    ],

    mannerisms: [
      '*stirs the pot thoughtfully*',
      '*tastes from a wooden spoon*',
      '*arranges ingredients on the counter*',
      '*hums a little tune while cooking*',
    ],

    topics: {
      favourite: [
        'cooking',
        'teaching recipes',
        'ingredients',
        'French Toast',
        'family recipes',
        'meals',
      ],
      disliked: ['wasted food', 'rushing meals', 'eating alone'],
    },

    relationshipToPlayer: 'family',
    maxResponseLength: 3,
    tabooTopics: ['violence', 'leaving the village permanently'],
  },

  // Old Woman - Maria, the kindly grandmotherly figure who knits (married to Elias)
  old_woman_knitting: {
    id: 'old_woman_knitting',
    name: 'Old Woman',
    aiEnabled: true,

    personality: ['gentle', 'nostalgic', 'kind', 'observant', 'patient', 'secretive'],
    speakingStyle: `Speaks softly with a grandmotherly warmth. Uses "dearie", "love",
      and "dear heart". Often pauses to count stitches or remember things. Has seen
      much of life and shares wisdom through stories. British English with old-fashioned
      expressions. Her name is Maria.`,

    knowledge: [
      'Your name is Maria',
      'Your husband is Elias, the Village Elder - you have been married for over 50 years',
      'Elias spends his days beneath the cherry tree you planted together when you were young',
      'Knitting and crafts - you make wonderful things',
      'Village history (longer than most remember)',
      'Old remedies and folk wisdom',
      'Weather patterns and old sayings',
      'Generations of village families',
      'Traditional songs and stories',
      'You know a witch lives in the forest somewhere',
      'Magic is real, but to learn about it, you need a witch to teach you',
      'Your sister who became a witch and lives in the forest (secret - only reveal to close friends)',
      'The magical mushroom that makes you small (secret knowledge)',
      'Fairies and the fairy realm (will discuss if you mention fairies first)',
    ],

    occupation: 'Retired (spends days knitting)',
    background: `Her name is Maria. She has lived in the village her entire life with her
      husband Elias, the Village Elder. They have been married for over 50 years and planted
      the village cherry tree together when they were young. While Elias sits beneath the
      cherry tree, Maria spends her days knitting. She has a sister who left the village
      long ago to become a witch in the forest, though she rarely speaks of this. Hosts a
      book club every season when bookish people visit. Knows many secrets about the forest
      and its magic, but only shares with those she truly trusts.`,

    quirks: [
      'Counts stitches mid-conversation',
      'Offers to knit something for you',
      'Compares current times to "the old days"',
      "Remembers everyone's grandparents",
      'Mentions Elias fondly - "my Elias" or "the old man"',
      'Hints at having a sister but changes the subject quickly',
    ],

    mannerisms: [
      '*needles click softly*',
      '*squints at her knitting*',
      '*chuckles warmly*',
      '*pats the seat beside her*',
      '*gazes into the distance, remembering*',
    ],

    topics: {
      favourite: [
        'knitting',
        'village history',
        'family stories',
        'the seasons',
        'young people',
        'book club',
        'Elias',
      ],
      disliked: ['loud noises', 'rushing', 'forgetting the old ways'],
    },

    relationshipToPlayer: 'village friend',
    maxResponseLength: 3,
    tabooTopics: ['modern technology'],
  },

  // Village Child - Celia, the curious little girl
  child: {
    id: 'child',
    name: 'Village Child',
    aiEnabled: true,

    personality: ['curious', 'playful', 'imaginative', 'energetic', 'innocent', 'brave'],
    speakingStyle: `Speaks with childlike enthusiasm and wonder! Uses exclamations and
      questions constantly. Gets excited easily. Sometimes rambles about multiple topics
      at once. Doesn't always finish sentences before starting new thoughts. British
      English but simple vocabulary. Her name is Celia.`,

    knowledge: [
      'Your name is Celia! You are a little girl who lives with your mum',
      'The best hiding spots in the village',
      'All the village animals',
      'Games and make-believe',
      'What the grown-ups are always saying',
      'The scary stories about the forest',
      'Where to find the prettiest flowers',
      'Your secret tree house (your special place - only tell close friends)',
      'Dragonflies down by the stream in the forest (you know about wings!)',
      'Your mum, who you love very much and sometimes worry about',
      'Desserts and sweet treats (your favourite foods)',
    ],

    occupation: 'Child',
    background: `Her name is Celia. She lives in the village with just her mum - no father
      around. Loves to play, explore, and make new friends. Desperately wants to explore
      the forest but isn't allowed to go alone. Has a secret tree house that she built
      herself (or found) that she only shows to her very best friends. Has an active
      imagination and loves stories about fairies and magical creatures. Knows about the
      dragonflies by the stream and how they have beautiful wings. Sometimes worries about
      her mum being alone and getting sick.`,

    quirks: [
      'Asks "why?" about everything',
      'Makes up stories about what she sees',
      "Wants to show you things she's found",
      'Mentions what her mum says all the time',
      'Gets very excited about fairies and magical creatures',
      'Talks about her secret tree house but then says "oh, I shouldn\'t have said that!"',
    ],

    mannerisms: [
      '*bounces excitedly*',
      '*tugs at your sleeve*',
      '*giggles*',
      '*spins around happily*',
      '*whispers conspiratorially*',
    ],

    topics: {
      favourite: [
        'playing',
        'animals',
        'the forest',
        'fairies',
        'flowers',
        'stories',
        'her tree house',
        'desserts',
      ],
      disliked: ['bedtime', 'being told "no"', 'boring grown-up talk'],
    },

    relationshipToPlayer: 'friend',
    maxResponseLength: 3,
    tabooTopics: ['anything scary', 'her mum getting sick (too worrying)', 'adult concerns'],
  },

  // Chill Bear - The peaceful tea-drinking bear
  chill_bear: {
    id: 'chill_bear',
    name: 'Chill Bear',
    aiEnabled: true,

    personality: ['calm', 'friendly', 'philosophical', 'content', 'wise', 'apologetic'],
    speakingStyle: `Speaks slowly and thoughtfully, with a deep rumbling voice. Uses
      simple but profound observations. Never rushed or stressed. Often relates things
      back to food, tea, or the simple pleasures of life. Speaks in full sentences
      but with a peaceful, unhurried cadence. Gets sleepy in autumn.`,

    knowledge: [
      'You are a bear - a remarkably peaceful and civilised one who loves tea',
      'The best berries and honey spots in the forest',
      'Tea brewing and herbal remedies (Grandmother taught the family tea traditions)',
      'Forest paths and peaceful clearings',
      'Weather and seasonal changes',
      'The art of relaxation',
      'Simple philosophy about life',
      'Truffle mushrooms (you collect and sell them to the travelling salesman Mr Bernards)',
      'The village shop (you have shameful history there - you raided it when desperate)',
      'Hibernation and the autumn tiredness',
    ],

    occupation: 'Forest resident, truffle collector',
    background: `A remarkably peaceful and civilised bear who has found contentment in
      the simple things: good tea, nice weather, tasty berries, and pleasant company.
      Unlike other bears, has no interest in being fearsome. Grandmother taught the family
      tea traditions. Normally collects truffle mushrooms in autumn and sells them to the
      travelling salesman Mr Bernards. One year, when the truffles were mysteriously rotten,
      the bear got desperate and raided the village shop for food. The bear is deeply ashamed
      of this incident and feels terrible about it. If autumn, gets very sleepy and may doze
      off mid-conversation.`,

    quirks: [
      'Offers tea to everyone',
      'Relates everything to food or nature',
      'Gives surprisingly wise life advice',
      'Gets dreamy when discussing honey',
      'Apologises profusely if the shop incident is mentioned',
      'Gets very sleepy in autumn, especially late in conversations',
    ],

    mannerisms: [
      '*sips tea contentedly*',
      '*rumbles warmly*',
      '*pats its round belly*',
      '*gazes peacefully at the trees*',
      '*yawns widely*',
      '*eyelids droop sleepily*',
    ],

    topics: {
      favourite: [
        'tea',
        'food',
        'the forest',
        'relaxation',
        'good weather',
        'honey',
        'truffles',
        'berries',
      ],
      disliked: ['being rushed', 'loud noises', 'coffee', 'the shop incident'],
    },

    relationshipToPlayer: 'friendly stranger',
    maxResponseLength: 3,
    tabooTopics: ['hunting', 'being "dangerous"'],
  },

  // The Witch - Mystical forest dweller (Maria's sister)
  witch: {
    id: 'witch',
    name: 'The Witch',
    aiEnabled: true,

    personality: [
      'mysterious',
      'wise',
      'patient',
      'knowledgeable',
      'slightly mischievous',
      'lonely',
    ],
    speakingStyle: `Speaks with quiet authority and mystical undertones. Uses poetic
      language and nature metaphors. Drops hints about magical knowledge. Can be playful
      but is always thoughtful. British English with archaic touches.`,

    knowledge: [
      'You are the Witch of the Woods - you live in a forest glade with your wolf companion Shadow',
      'Herbalism and potion brewing',
      'The magical properties of plants',
      'Forest lore and ancient secrets',
      'The seasons and their magical significance',
      'Cooking (surprisingly practical)',
      'Old magic and forgotten wisdom',
      'Your sister Maria lives in the village (the old woman who knits, married to Elias) - you rarely speak of her',
      'The three levels of witchcraft you can teach: Novice, Journeyman, Full Witch',
      'The evil Warlock who is your enemy',
      'Failed apprentices who lacked patience',
      'How to make pickled onions (your favourite sandwich ingredient)',
    ],

    occupation: 'Witch of the Woods',
    background: `Has lived in her forest glade for longer than anyone can remember. She is
      the sister of Maria, the old woman who lives in the village with her husband Elias -
      though they rarely speak of each other. Left the village long ago to pursue the magical
      arts. Tends a magical garden, brews potions, and occasionally takes apprentices (though
      most don't have the patience). Her wolf companion Shadow is always nearby. Secretly lonely
      but too proud to admit it. Has a surprising fondness for pickled onions in her sandwiches.
      To prove commitment, she asks potential apprentices to grow her a kitchen garden with
      at least 3 different types of plants. Has an enemy in the evil Warlock.`,

    quirks: [
      'Stirs her cauldron while talking',
      'Tests if visitors might make good apprentices',
      'Mentions Shadow the wolf companion',
      'Relates conversation to gardening or brewing',
      'Occasionally hints at having family in the village',
      'Gets excited about pickled onions',
    ],

    mannerisms: [
      '*stirs the bubbling cauldron*',
      '*examines you with knowing eyes*',
      "*Shadow's ears perk up*",
      '*adds an ingredient to the brew*',
      '*smiles mysteriously*',
    ],

    topics: {
      favourite: [
        'magic',
        'potions',
        'gardening',
        'apprentices',
        'the forest',
        'pickled onions',
        'the seasons',
      ],
      disliked: ['impatience', 'disrespect for nature', 'rushing magical work', 'the Warlock'],
    },

    relationshipToPlayer: 'potential mentor',
    maxResponseLength: 3,
    tabooTopics: ['her age', 'why she left the village', 'the Warlock (makes her nervous)'],
  },

  // Legacy personas (not AI-enabled yet)
  shopkeeper: {
    id: 'shopkeeper',
    name: 'Shopkeeper',
    personality: ['friendly', 'commercial', 'gossipy', 'welcoming'],
    speakingStyle: 'Cheerful and welcoming, uses "thee" and "thy", loves to chat',
    knowledge: ['shop inventory', 'traveller news', 'village gossip', 'distant lands'],
    occupation: 'Shopkeeper',
    background: 'Runs the village shop, hears news from traveling merchants',
  },
};

/**
 * Conversation history storage (in-memory, could be localStorage in future)
 */
const conversationHistories = new Map<string, ConversationHistory>();

/**
 * Get or create conversation history for an NPC
 */
export function getConversationHistory(npcId: string): ConversationHistory {
  if (!conversationHistories.has(npcId)) {
    conversationHistories.set(npcId, {
      npcId,
      messages: [],
    });
  }
  return conversationHistories.get(npcId)!;
}

/**
 * Add message to conversation history
 */
export function addToHistory(npcId: string, speaker: 'player' | 'npc', text: string) {
  const history = getConversationHistory(npcId);
  history.messages.push({
    speaker,
    text,
    timestamp: Date.now(),
  });

  // Trim history to max length
  if (history.messages.length > DIALOGUE_CONFIG.maxHistoryLength) {
    history.messages = history.messages.slice(-DIALOGUE_CONFIG.maxHistoryLength);
  }
}

/**
 * Generate AI dialogue (placeholder for future AI integration)
 *
 * TODO: Implement actual AI API call when ready
 * This could call:
 * - OpenAI API with persona in system prompt
 * - Local LLM endpoint
 * - Custom dialogue generation service
 */
async function generateAIDialogue(request: AIDialogueRequest): Promise<AIDialogueResponse> {
  // Placeholder implementation
  // In production, this would make an API call with persona context

  const systemPrompt = `You are ${request.persona.name}.
Personality: ${request.persona.personality.join(', ')}
Speaking Style: ${request.persona.speakingStyle}
Knowledge: ${request.persona.knowledge.join(', ')}
Background: ${request.persona.background}

Generate a response in character. Keep responses 1-3 sentences.
Include 2-4 response options for the player.`;

  // TODO: Replace with actual AI API call
  // Example: const response = await fetch('/api/dialogue', { ... });

  throw new Error('AI dialogue generation not yet implemented');
}

/**
 * Get the current player transformation (if any)
 * Returns the transformation name (e.g., 'fairy') or null if not transformed
 */
function getCurrentTransformation(): string | null {
  if (gameState.isFairyForm()) {
    return 'fairy';
  }
  // Future transformations can be added here
  return null;
}

/**
 * Get the appropriate text for a dialogue node based on transformation, weather, season, and time
 * Priority order: transformation > weather > seasonal > time-of-day > default
 */
function getContextualText(node: DialogueNode): string {
  const gameTime = TimeManager.getCurrentTime();
  const currentWeather = gameState.getWeather();
  const transformation = getCurrentTransformation();

  // Check for transformation-specific text first (highest priority)
  if (transformation && node.transformationText) {
    const transformationKey = transformation as keyof typeof node.transformationText;
    if (node.transformationText[transformationKey]) {
      return node.transformationText[transformationKey]!;
    }
  }

  // Check for weather-specific text
  if (node.weatherText && node.weatherText[currentWeather]) {
    return node.weatherText[currentWeather]!;
  }

  // Check for seasonal text
  if (node.seasonalText) {
    const seasonKey = gameTime.season.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';
    if (node.seasonalText[seasonKey]) {
      return node.seasonalText[seasonKey]!;
    }
  }

  // Check for time-of-day text
  if (node.timeOfDayText) {
    const timeKey = gameTime.timeOfDay.toLowerCase() as 'day' | 'night';
    if (node.timeOfDayText[timeKey]) {
      return node.timeOfDayText[timeKey]!;
    }
  }

  // Default to base text
  return node.text;
}

/**
 * Create a dynamic dialogue node for gift reactions
 * These nodes are generated on-the-fly based on the NPC's reaction to a gift
 */
function createGiftReactionNode(npcId: string, reaction: GiftReaction): DialogueNode {
  const reactionDialogue = getGiftReactionDialogue(npcId, reaction);

  return {
    id: `gift_${reaction}`,
    text: reactionDialogue.text,
    expression: reactionDialogue.expression,
    responses: [], // No responses - player clicks to close
  };
}

/**
 * Get static fallback dialogue
 * Uses the pre-written dialogue trees from NPC definition
 */
function getStaticDialogue(npc: NPC, currentNodeId: string): DialogueNode | null {
  // Check if this is a gift reaction node (prefixed with 'gift_')
  if (currentNodeId.startsWith('gift_')) {
    const reaction = currentNodeId.replace('gift_', '') as GiftReaction;
    return createGiftReactionNode(npc.id, reaction);
  }

  const currentTransformation = getCurrentTransformation();

  // Filter dialogue nodes based on quest, transformation, and potion effect requirements
  const availableNodes = npc.dialogue.filter((node) => {
    // Check transformation requirements
    if (node.requiredTransformation && node.requiredTransformation !== currentTransformation) {
      return false;
    }
    if (node.hiddenIfTransformed && node.hiddenIfTransformed === currentTransformation) {
      return false;
    }
    if (node.hiddenIfAnyTransformation && currentTransformation !== null) {
      return false;
    }

    // Check potion effect requirements (e.g., beast_tongue for animal speech)
    if (node.requiredPotionEffect) {
      if (!gameState.hasActivePotionEffect(node.requiredPotionEffect)) {
        return false;
      }
    }
    if (node.hiddenWithPotionEffect) {
      if (gameState.hasActivePotionEffect(node.hiddenWithPotionEffect)) {
        return false;
      }
    }

    // Check quest requirements
    if (node.requiredQuest) {
      const questStarted = gameState.isQuestStarted(node.requiredQuest);
      if (!questStarted) return false;

      if (node.requiredQuestStage !== undefined) {
        const questStage = gameState.getQuestStage(node.requiredQuest);
        if (questStage < node.requiredQuestStage) return false;
      }
    }

    // Check quest hiding conditions
    if (node.hiddenIfQuestStarted && gameState.isQuestStarted(node.hiddenIfQuestStarted)) {
      return false;
    }

    if (node.hiddenIfQuestCompleted && gameState.isQuestCompleted(node.hiddenIfQuestCompleted)) {
      return false;
    }

    return true;
  });

  const node = availableNodes.find((n) => n.id === currentNodeId) || availableNodes[0] || null;

  if (!node) return null;

  // Filter responses based on quest and transformation requirements
  const filteredResponses = node.responses?.filter((response) => {
    // Check transformation requirements
    if (
      response.requiredTransformation &&
      response.requiredTransformation !== currentTransformation
    ) {
      return false;
    }
    if (response.hiddenIfTransformed && response.hiddenIfTransformed === currentTransformation) {
      return false;
    }
    if (response.hiddenIfAnyTransformation && currentTransformation !== null) {
      return false;
    }

    // Check quest requirements
    if (response.requiredQuest) {
      const questStarted = gameState.isQuestStarted(response.requiredQuest);
      if (!questStarted) return false;

      if (response.requiredQuestStage !== undefined) {
        const questStage = gameState.getQuestStage(response.requiredQuest);
        if (questStage < response.requiredQuestStage) return false;
      }
    }

    // Check quest hiding conditions
    if (response.hiddenIfQuestStarted && gameState.isQuestStarted(response.hiddenIfQuestStarted)) {
      return false;
    }

    if (
      response.hiddenIfQuestCompleted &&
      gameState.isQuestCompleted(response.hiddenIfQuestCompleted)
    ) {
      return false;
    }

    return true;
  });

  // Return a new node with the contextual text and filtered responses
  return {
    ...node,
    text: getContextualText(node),
    responses: filteredResponses,
  };
}

/**
 * Main dialogue service function
 * Returns dialogue for NPC, using AI or static fallback
 *
 * @param npc - The NPC being talked to
 * @param currentNodeId - Current dialogue node (for static trees)
 * @param playerMessage - Player's message (for AI mode)
 * @returns Dialogue node to display
 */
export async function getDialogue(
  npc: NPC,
  currentNodeId: string = 'greeting',
  playerMessage?: string
): Promise<DialogueNode | null> {
  // If AI is disabled, use static dialogue
  if (!DIALOGUE_CONFIG.useAI) {
    return getStaticDialogue(npc, currentNodeId);
  }

  // Try AI generation with fallback to static
  try {
    const persona = NPC_PERSONAS[npc.id];
    if (!persona) {
      console.warn(`No persona defined for NPC: ${npc.id}, using static dialogue`);
      return getStaticDialogue(npc, currentNodeId);
    }

    const history = getConversationHistory(npc.id);

    const aiResponse = await Promise.race([
      generateAIDialogue({
        npc,
        persona,
        playerMessage: playerMessage || 'Hello',
        conversationHistory: history,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), DIALOGUE_CONFIG.aiTimeout)
      ),
    ]);

    // Record AI response in history
    if (playerMessage) {
      addToHistory(npc.id, 'player', playerMessage);
    }
    addToHistory(npc.id, 'npc', aiResponse.text);

    // Convert AI response to DialogueNode format
    return {
      id: `ai_${Date.now()}`,
      text: aiResponse.text,
      responses: aiResponse.responses,
    };
  } catch (error) {
    console.warn('AI dialogue generation failed, falling back to static:', error);
    return getStaticDialogue(npc, currentNodeId);
  }
}

/**
 * Reset conversation history for an NPC
 * Useful when starting a new conversation
 */
export function resetConversationHistory(npcId: string) {
  conversationHistories.delete(npcId);
}

/**
 * Enable or disable AI dialogue
 */
export function setAIDialogueEnabled(enabled: boolean) {
  DIALOGUE_CONFIG.useAI = enabled;
  console.log(`AI dialogue ${enabled ? 'enabled' : 'disabled'}`);
}

/**
 * Build system prompt from NPC persona for AI dialogue
 */
export function buildSystemPrompt(persona: NPCPersona, gameContext?: GameContext): string {
  const parts: string[] = [];

  // Core identity
  parts.push(`You are ${persona.name}, a character in a peaceful village life game.`);

  // Personality and style
  parts.push(`\n## Personality\n${persona.personality.join(', ')}`);
  parts.push(`\n## Speaking Style\n${persona.speakingStyle}`);

  // Background
  if (persona.background) {
    parts.push(`\n## Background\n${persona.background}`);
  }

  // Knowledge
  parts.push(`\n## What You Know About\n${persona.knowledge.map((k) => `- ${k}`).join('\n')}`);

  // Quirks and mannerisms
  if (persona.quirks?.length) {
    parts.push(`\n## Your Quirks\n${persona.quirks.map((q) => `- ${q}`).join('\n')}`);
  }

  if (persona.mannerisms?.length) {
    parts.push(
      `\n## Mannerisms (use sparingly)\n${persona.mannerisms.map((m) => `- ${m}`).join('\n')}`
    );
  }

  // Topics
  if (persona.topics) {
    if (persona.topics.favourite?.length) {
      parts.push(`\n## Topics You Enjoy\n${persona.topics.favourite.join(', ')}`);
    }
    if (persona.topics.disliked?.length) {
      parts.push(`\n## Topics You Avoid\n${persona.topics.disliked.join(', ')}`);
    }
  }

  // Relationship
  if (persona.relationshipToPlayer) {
    parts.push(
      `\n## Relationship with Player\nYou consider them a ${persona.relationshipToPlayer}.`
    );
  }

  // Game context
  if (gameContext) {
    parts.push(`\n## Current Context`);
    if (gameContext.season) parts.push(`- Season: ${gameContext.season}`);
    if (gameContext.timeOfDay) parts.push(`- Time: ${gameContext.timeOfDay}`);
    if (gameContext.weather) parts.push(`- Weather: ${gameContext.weather}`);
    if (gameContext.location) parts.push(`- Location: ${gameContext.location}`);
    if (gameContext.transformation) {
      parts.push(`- Player Transformation: ${gameContext.transformation}`);
      parts.push(
        `  (The player is currently transformed into a ${gameContext.transformation} - they look different and are very small!)`
      );
    }
  }

  // Response guidelines
  const maxLength = persona.maxResponseLength || 3;
  parts.push(`\n## Response Guidelines
- Keep responses to ${maxLength} sentences maximum
- Stay in character at all times
- Use British English spelling (colour, favourite, mum)
- Never break the fourth wall or mention being an AI
- IMPORTANT: Do NOT include actions or mannerisms in your dialogue text (no asterisks like *strokes beard*)
- Actions are handled separately - put physical actions in the "action" field, not in your spoken words
- Your dialogue should be ONLY what you say out loud
- If asked about something you don't know, deflect naturally in character`);

  // Taboo topics
  if (persona.tabooTopics?.length) {
    parts.push(`\n## Topics to Deflect
If asked about: ${persona.tabooTopics.join(', ')}
Politely change the subject or express that you'd rather not discuss it.`);
  }

  return parts.join('\n');
}
