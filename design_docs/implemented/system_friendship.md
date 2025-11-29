# Friendship System

The key to unlocking quests is to befriend the villagers.

## Friendship Levels

There is an invisible stat for each villager that defines how much they like you.

| Value | Level | Description |
|-------|-------|-------------|
| 1-3 | Barely know them | Strangers |
| 4-6 | Acquaintance | Friendly |
| 7-9 | Good Friend | Close relationship |

**Important**: Villagers will only help you, reveal secrets, or give you quests if you are a Good Friend (7-9).

## Gaining Friendship

| Action | Points |
|--------|--------|
| Talk to them every day | +1 per day |
| Give them food | +1 per meal |
| Give them food that they like | +3 per meal |
| Do quests for them | +3 per quest |

## Starting Relationships

| Character | Starting Level | Notes |
|-----------|---------------|-------|
| Mother | 9 | Maximum from start |
| Father | 9 | Maximum, but not home for Year 1 |

## Special Friends

To become Special Friends with someone, you have to go through a Life Crisis with them.

**What Special Friends Means**:
The NPC will go out of their way to help you.

## Characters and Their Crises

### The Old Man - Jebediah

**Crisis**: Can no longer take care of his garden.

**If you help**: He will let you have the crops.

### The Old Woman - Althea

**Crisis**: Death of the Old Man.

**If you help**:
- Help her with his funeral
- She will tell you stories of her youth with her sister, who became a witch

### The Little Girl - Celia

**Crisis**: She is alone with her mother, who becomes ill.

**If you help**:
- Help her fetch the doctor
- She will show you her secret tree house

## Food Preferences

Different villagers prefer different food types:

| Character | Preferred Food |
|-----------|---------------|
| The Shopkeeper | Savoury food |
| The Small Girl | Desserts |
| The Fairy | Desserts |
| The Old Man | Baked goods |
| The Old Woman | Baked goods |

## Implementation Notes

- Need friendship tracking per NPC
- Need daily interaction tracking
- Need gift/food tracking
- Need quest completion tracking
- Need crisis event triggers
- Need Special Friend status tracking
- UI to show friendship level? (hearts like Stardew?)
