# Random Events

Events that occur randomly during gameplay.

## Weather Events

Rain, snow and storms occur during appropriate seasons.

| Weather | Seasons | Effects |
|---------|---------|---------|
| Rain | Spring, Summer, Autumn | Waters crops automatically? |
| Snow | Winter | Visual effect, movement? |
| Storm | Summer, Autumn | Keeps people indoors? |

**Implementation Notes**:
- Define weather probability per season
- Define gameplay effects of each weather type

## The Flu

People get infected with the flu and need to spend some time in bed.

**Gameplay Impact**:
- Affected NPCs are unavailable for interaction
- May need to bring them medicine or food?

**Implementation Notes**:
- Define infection probability
- Define recovery time
- Define player actions that can help

## Plant Pests

Plants get attacked by bugs.

**Gameplay Impact**:
- Crops can be damaged or destroyed
- Player needs to deal with the infestation

**Implementation Notes**:
- Define which crops are vulnerable
- Define how to prevent/treat infestations
- Define damage progression

## The Runaway Dog

The dog runs away, and someone has to find him.

**Quest Structure**:
1. Dog goes missing
2. Player must search for the dog
3. Dog found somewhere in the world
4. Return dog to owner

**Implementation Notes**:
- Define where the dog can be found
- Define rewards for finding the dog
- Define whose dog it is
