# AI Chat with NPCs

## Overview

Some village NPCs can engage in free-form AI-powered conversations! Instead of following a fixed dialogue tree, you can ask them anything and they'll respond in character with their unique personality.

## How to Use

1. **Start a conversation** with an AI-enabled NPC (talk to them normally)
2. **Look for the "Chat freely..." button** - it appears alongside the normal dialogue options
3. **Click "Chat freely..."** to enter AI chat mode
4. **Choose your response**:
   - Click one of the suggested response buttons (touch-friendly!)
   - Or click "Ask something else..." to type your own question

## AI-Enabled NPCs

Currently, these NPCs support AI conversations:

### Village Elder
The wise elder who sits beneath the cherry tree. He knows the village's history, old legends, and farming wisdom. Speaks in a warm, grandfatherly manner with occasional archaic words.

**Good topics to ask about:**
- The cherry tree and its significance
- Village history and how things have changed
- Old legends and folk tales
- Farming wisdom and the seasons

### Mum
Your loving mother who takes care of the home. She's warm, nurturing, and loves to cook. Find her at home or in the kitchen.

**Good topics to ask about:**
- Cooking and family recipes
- Village news and neighbours
- Family stories and traditions
- What she's preparing for dinner

### Old Woman
The kindly grandmotherly figure who spends her days knitting. She's been in the village longer than almost anyone and knows its history.

**Good topics to ask about:**
- Her knitting projects
- Stories from the old days
- Village families and their history
- Traditional wisdom and folk remedies

### Village Child
The curious little girl who wanders the village. She's playful, imaginative, and full of questions about everything.

**Good topics to ask about:**
- Games and playing
- The forest (she's not allowed to go alone!)
- Animals she's seen
- Fairies and magical creatures

### Chill Bear
A remarkably peaceful bear found in the forest. Loves tea, honey, and philosophical conversation. Surprisingly wise and never in a hurry.

**Good topics to ask about:**
- Tea and how to make it
- The best food in the forest
- Peaceful places to relax
- Simple life wisdom

### The Witch
A mystical figure who lives in the forest glade with her wolf companion Shadow. She brews potions and tends a magical garden.

**Good topics to ask about:**
- Potion brewing and herbalism
- Becoming her apprentice
- The magical properties of plants
- Her wolf companion Shadow

## Features

### NPCs Remember You
Each NPC remembers your past conversations! They'll recall:
- Your name (if you told them)
- Topics you've discussed before
- Gifts you've given them
- Important events you shared

Memories persist across play sessions, so returning players get a warmer, more personalised greeting.

### Three-Tier Memory System
- **Recent conversations** - The last 50 messages with each NPC
- **Long-term memories** - Important facts extracted from older conversations
- **Core memories** - Defining moments in your relationship

### Natural Responses
NPCs respond with personality-appropriate dialogue:
- The Elder uses archaic speech ("mayhaps", "'tis", "aye")
- The Shopkeeper is chatty and loves working shopping into conversations
- Each has unique mannerisms and quirks

## Returning to Normal Dialogue

Click **"Return to conversation"** at any time to go back to the NPC's regular dialogue tree. This is useful for:
- Accessing specific dialogue options (like buying/selling)
- Completing quests or getting items
- When you're done chatting freely

## Setting Up AI Chat

AI chat requires an Anthropic API key. Here's how to set it up:

### Step 1: Get an API Key
1. Visit [console.anthropic.com](https://console.anthropic.com/)
2. Create an account or sign in
3. Go to API Keys and create a new key
4. Copy the key (starts with `sk-ant-`)

### Step 2: Add Your Key In-Game
1. Press **F1** to open the Help Browser
2. Click the **Settings** tab
3. Paste your API key in the text box
4. Click **Save API Key**

You'll see a confirmation message when AI dialogue is enabled.

### Privacy & Security
- Your key is stored **only in your browser** (localStorage)
- It's never sent to any server except Anthropic's API
- You can remove it anytime from the Settings tab

### Cost
AI conversations use Claude 3.5 Haiku, which costs fractions of a cent per conversation:
- Roughly **$0.002 per 10-message chat**
- A typical play session might cost $0.01-0.05

## Tips for Great Conversations

1. **Ask about their interests** - Each NPC has favourite topics they love discussing
2. **Reference the season** - NPCs are aware of the current time and weather
3. **Build a relationship** - The more you chat, the more they remember about you
4. **Stay in character** - NPCs respond best to questions that fit the village setting
5. **Try different approaches** - Ask the Elder about history, ask the Shopkeeper for gossip

## Troubleshooting

**"Chat freely..." button doesn't appear:**
- Check that you have an API key set up (F1 → Settings)
- Make sure you're talking to an AI-enabled NPC (Elder or Shopkeeper)

**NPC gives short or confused responses:**
- Try rephrasing your question
- Ask about topics the NPC knows about
- Make sure your question fits the village setting

**API errors:**
- Check your internet connection
- Verify your API key is valid
- The NPC will fall back to a default response if there's an error
