# Quest: The Fairy Queen's Court

A friendship-based questline where you befriend fairies and earn the privilege of visiting their queen.

## Overview

Plant fairy bluebells to attract fairies at night. Build friendship with Morgan or Stella, and they'll gift you a Fairy Form Potion that allows you to shrink down and visit the Fairy Queen inside the ancient oak.

## Quest Flow

### Part 1: Growing Fairy Bluebells

**Prerequisites**: Obtain fairy bluebell seeds (from the Old Man's task or other sources)

**Steps**:
1. Plant fairy bluebell seeds in tilled soil
2. Water and tend the plants until they mature
3. Wait for night time (22:00-06:00)

**Result**: Fairies are attracted to mature fairy bluebells at night

### Part 2: Meeting the Fairies

**Location**: Near your mature fairy bluebells, at night

**Who Appears**:
- **Morgan** - A cheeky, slightly rude fairy who warms up over time
- **Stella** - A kind, gentle fairy who's warm from the start

**First Meeting**:
- The fairy comments on your bluebells
- Quest begins: "The Fairy Queen's Court"
- They hint at the Fairy Queen in the ancient oak

### Part 3: Building Friendship

**How to Build Friendship**:
- Talk to the fairies each night they appear (daily talk bonus)
- Give them gifts they like
- Reach **Good Friends** tier (600+ friendship points)

**Fairy Preferences**:
- Morgan likes: Shiny objects, rare flowers
- Stella likes: Sweet foods, gentle flowers

### Part 4: Receiving the Potion

**Trigger**: Reach Good Friends (600+ points) with Morgan or Stella

**Reward**: **Fairy Form Potion**
- Either fairy can give you the potion (first to Good Friends)
- The potion is a gift, not crafted
- If you lose or use the potion, you can ask your fairy friend for another

**Potion Details**:
- Consumable (single use)
- Double-click in inventory to use
- Transforms you into tiny fairy form for 1 hour (real time)
- Re-requestable from the fairy via dialogue

### Part 5: Visiting the Fairy Queen

**Location**: The Giant Fairy Oak in the Deep Forest

**Requirements**:
- Must be in fairy form (use the potion)
- Can only enter the oak at night

**Inside the Oak**:
- The Fairy Queen holds court
- You can request an audience with her

**Rewards**:
- She grants you the title of Honorary Fairy
- Opens the path to further magical quests

## Character Personalities

### Morgan
- **Personality**: Cheeky, playful, slightly rude
- **First impression**: Dismissive, teasing
- **Warms up**: Sarcastic affection, backhanded compliments
- **Example dialogue**: "Oh, it's you again. Did you bring me something shiny, or are you just here to gawk?"

### Stella
- **Personality**: Kind, gentle, nurturing, encouraging
- **First impression**: Warm and welcoming
- **Stays consistent**: Always supportive and friendly
- **Example dialogue**: "Oh, what lovely fairy bluebells you've grown! They shine so beautifully in the moonlight."

## Technical Implementation

### Files Modified
- `data/quests/fairyQueenQuest.ts` - Quest tracking and stages
- `utils/FriendshipManager.ts` - Tier rewards for fairies
- `utils/npcs/forestNPCs.ts` - Fairy dialogue with quest integration
- `utils/dialogueHandlers.ts` - Quest action handlers
- `utils/MagicEffects.ts` - Fairy form potion effect
- `data/items.ts` - Potion item definition

### Quest Stages
| Stage | ID | Description |
|-------|-----|-------------|
| NOT_STARTED | 0 | Quest not begun |
| MET_FAIRY | 1 | First talked to Morgan or Stella |
| RECEIVED_POTION | 2 | Reached Good Friends, got the potion |
| VISITED_QUEEN | 3 | Entered the fairy oak and met the queen |
| COMPLETED | 4 | Quest complete |

### Key Systems Used
- **Fairy Attraction Manager**: Spawns fairies near mature fairy bluebells at night
- **Friendship System**: Track relationship with fairies, tier rewards at Good Friends
- **Quest System**: Stage tracking, conditional dialogue
- **Potion System**: Double-click use, fairy form transformation

## Related Quests

- [quest_witch_apprentice.md](quest_witch_apprentice.md) - Follow-up quest from the Fairy Queen
