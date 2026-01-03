# AI Conversations System - Developer Guide

## Overview

The AI conversations system allows NPCs to engage in free-form dialogue using the Anthropic Claude API. It extends the existing static dialogue tree system without replacing it.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interaction                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │      DialogueBox.tsx         │
              │   (Static dialogue trees)    │
              │                              │
              │   "Chat freely..." button    │
              └──────────────┬───────────────┘
                             │ onSwitchToAIMode()
                             ▼
              ┌──────────────────────────────┐
              │     AIDialogueBox.tsx        │
              │   - Text input (optional)    │
              │   - AI-generated suggestions │
              │   - Animated dialogue frame  │
              └──────────────┬───────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ anthropicClient │ │  aiChatHistory  │ │ dialogueService │
│                 │ │                 │ │                 │
│ - API calls     │ │ - 3-tier memory │ │ - NPC personas  │
│ - Response      │ │ - localStorage  │ │ - System prompt │
│   parsing       │ │                 │ │   generation    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `services/anthropicClient.ts` | Anthropic API wrapper, key management |
| `services/aiChatHistory.ts` | Three-tier memory system with localStorage |
| `services/dialogueService.ts` | NPC personas, system prompt builder |
| `components/AIDialogueBox.tsx` | AI chat UI component |
| `components/DialogueBox.tsx` | Modified to add "Chat freely..." button |
| `components/HelpBrowser.tsx` | Settings tab for API key management |

## Adding AI to an NPC

### Step 1: Create an Enhanced Persona

In `services/dialogueService.ts`, add to `NPC_PERSONAS`:

```typescript
my_new_npc: {
  id: 'my_new_npc',
  name: 'Character Name',
  aiEnabled: true,  // <-- This enables AI chat

  personality: ['trait1', 'trait2', 'trait3'],
  speakingStyle: `Description of how they talk. Uses British English.
    Any verbal tics or patterns go here.`,

  knowledge: [
    'Topic they know about',
    'Another topic',
    'World knowledge',
  ],

  occupation: 'Their job',
  background: `Backstory and context for the character.
    This helps the AI understand who they are.`,

  quirks: [
    'Something they often do or say',
    'Another behavioural quirk',
  ],

  mannerisms: [
    '*action they do while talking*',
    '*another action*',
  ],

  topics: {
    favourite: ['topic1', 'topic2'],
    disliked: ['topic3'],
  },

  relationshipToPlayer: 'stranger',  // or 'acquaintance', 'friend'
  maxResponseLength: 3,              // sentences
  tabooTopics: ['things they won\'t discuss'],
},
```

### Step 2: Ensure NPC ID Matches

The persona ID must match the NPC's `id` field in its factory function (e.g., in `utils/npcs/villageNPCs.ts`).

### Step 3: Test

1. Set up an API key via F1 → Settings
2. Talk to the NPC
3. Click "Chat freely..."
4. Verify AI responses match the persona

## Memory System

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Core Memories (100 max, permanent, highest priority)           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Player's name is "Luna" - a kind soul who loves nature  │  │
│  │ • We became true friends after the lost cat adventure     │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Long-term Memories (100 max, consolidated when full)           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Player helped find lost cat on Day 15                   │  │
│  │ • Player loves gardening, especially tomatoes             │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Recent History (last 50 messages)                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [user] Hello again!                                       │  │
│  │ [npc] Ah, good to see thee! How fares thy garden?         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Storage Keys

- `ai_chat_{npcId}` - Recent message history (JSON array)
- `ai_memory_{npcId}` - Long-term memories (JSON array)
- `ai_core_{npcId}` - Core memories (JSON array)

### Memory Flow

1. **New messages** → Added to Recent History
2. **When Recent History > 50** → Oldest 20 messages extracted to Long-term Memories
3. **When Long-term > 100** → Oldest 30 consolidated into Core Memories

Memory extraction and consolidation use AI calls to identify significant information.

## API Client

### Response Format

The AI is instructed to return responses in this format:

```
NPC dialogue text here.

> Suggested response 1
> Suggested response 2
> I should be going (farewell option)
```

The `generateResponse()` function parses this into:
- `text`: The NPC's dialogue
- `suggestions`: Array of clickable response options

### Error Handling

If the API call fails:
1. A fallback greeting/response is shown (defined in AIDialogueBox.tsx)
2. Default suggestion buttons appear
3. Error is logged but doesn't crash the game

## System Prompt Structure

The `buildSystemPrompt()` function creates a prompt with these sections:

1. **Core Identity** - "You are [Name], a character in..."
2. **Personality** - Comma-separated traits
3. **Speaking Style** - How they talk
4. **Background** - Character backstory
5. **Knowledge** - Topics they know about
6. **Quirks** - Behavioural patterns
7. **Mannerisms** - Actions to use sparingly
8. **Topics** - What they enjoy/avoid discussing
9. **Relationship** - How they see the player
10. **Current Context** - Season, time, weather
11. **Response Guidelines** - Length, British English, stay in character
12. **Taboo Topics** - What to deflect

## Mode Switching

### From Static to AI

In `DialogueBox.tsx`:
- If `isAIAvailable()` and `NPC_PERSONAS[npc.id]?.aiEnabled`
- Show "Chat freely..." button
- Clicking triggers `onSwitchToAIMode()`

In `App.tsx`:
- `dialogueMode` state toggles between `'static'` and `'ai'`
- Renders either `DialogueBox` or `AIDialogueBox`

### From AI to Static

- Click "Return to conversation" in AIDialogueBox
- Triggers `onSwitchToStatic()` → sets `dialogueMode` to `'static'`

## Cost Estimation

Using Claude 4.5 Haiku (as of January 2025):
- Input: $0.80 per million tokens
- Output: $4.00 per million tokens

Per conversation:
- System prompt: ~500 tokens
- Average message: ~50 tokens
- 10-message chat: ~1,000 tokens total
- **Cost: ~$0.002 per conversation**

## Testing

### Manual Testing

1. Add API key via F1 → Settings
2. Talk to any AI-enabled NPC:
   - **Village**: Village Elder, Old Woman, Village Child
   - **Home**: Mum (in living room or kitchen)
   - **Forest**: Chill Bear, The Witch
3. Click "Chat freely..."
4. Try typing custom questions
5. Try clicking suggested responses
6. Test "Return to conversation"
7. Verify memories persist (close game, reopen, chat again)

### Debugging

```javascript
// In browser console:

// Check if AI is available
isAIAvailable()

// View stored API key (just checks existence)
localStorage.getItem('twilight_anthropic_api_key')

// View chat history for an NPC
JSON.parse(localStorage.getItem('ai_chat_village_elder'))

// View memories
JSON.parse(localStorage.getItem('ai_memory_village_elder'))
JSON.parse(localStorage.getItem('ai_core_village_elder'))

// Clear all AI data for an NPC
localStorage.removeItem('ai_chat_village_elder')
localStorage.removeItem('ai_memory_village_elder')
localStorage.removeItem('ai_core_village_elder')
```

## Security Notes

- API key stored in localStorage (user's own key)
- `dangerouslyAllowBrowser: true` is acceptable for user-provided keys
- No server-side component - API calls go directly to Anthropic
- For a multiplayer/public deployment, API calls should go through a backend

## Future Enhancements

- **Friendship integration**: Adjust persona based on friendship level
- **Quest integration**: NPCs can give/track quests via AI
- **Emotion system**: NPC mood affects responses
- **Voice synthesis**: Optional text-to-speech
- **More NPCs**: Extend to all village characters
