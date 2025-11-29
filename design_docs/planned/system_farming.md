# Kitchen Garden System

When you start the game, the kitchen garden is barren. You can cultivate it by buying seeds or befriending villagers.

## Getting Started

**Option 1**: Buy seeds from the shop

**Option 2**: Befriend the Old Man (Jebediah)
- When he becomes an Acquaintance (level 4-6)
- He will gift you 3 seeds: Sunflowers, Peas, and Salad

## Seed Sources

### Shop Seeds

| Seed | Price |
|------|-------|
| Potatoes | 5 gold |
| Melon | TBD |
| Pumpkin | TBD |
| Chili | TBD |
| Spinach | TBD |
| Broccoli | TBD |
| Cauliflower | TBD |

### Old Man's Seeds (Friendship Gift)

- Sunflowers
- Tomatoes
- Salad
- Onion
- Peas
- Cucumber
- Carrots

### Wild Seeds (Foraging)

- Strawberries

## Growing Seasons

| Crop | Plant Season | Harvest Season |
|------|--------------|----------------|
| Potatoes | Spring | Summer, Autumn |
| Melon | Spring | Summer, Autumn |
| Pumpkin | Spring | Autumn |
| Chili | Spring, Summer | Summer, Autumn |
| Spinach | Spring, Summer | Spring, Summer, Autumn |
| Broccoli | Spring | Summer, Autumn |
| Cauliflower | Spring | Summer, Autumn |
| Sunflowers | Spring | Summer, Autumn |
| Tomatoes | Spring | Summer |
| Salad | Spring, Summer | Spring, Summer |
| Onion | Autumn | Spring, Summer, Autumn |
| Peas | Spring | Summer |
| Cucumber | Spring | Summer |
| Carrots | Spring, Summer | Summer, Autumn |

## Crop Care

**Watering**:
- All crops need to be watered 1 time every day to succeed
- If not watered, crops will fail/wilt

**Fertiliser**:
- If fertiliser is added to the water, the quality will be better
- Better quality = higher sell price

## Selling Crops

**Option 1**: Sell to the Travelling Salesman
- Best prices for rare items

**Option 2**: Sell to the Shop
- The shop will keep the produce
- They sell it back to you later at an increased price
- If you keep crops yourself, they deteriorate within 3 days

## Implementation Notes

- Need crop state tracking (planted, growing, ready, harvested, wilted)
- Need watering mechanic
- Need fertiliser mechanic
- Need quality system
- Need crop sprites for each growth stage
- Need deterioration timer for harvested crops
- Need integration with shop system
- Need integration with travelling salesman
