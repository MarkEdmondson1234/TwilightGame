# Quest: The Ghost Boy

A major storyline that spans the first year of gameplay.

## Timeline

**Trigger**: Year 1, Spring, Day 5

## Part 1: Discovery

A strange boy moves into the house next door. But he never comes out.

**Player Observations**:
- You can see him through the window
- Going to his house triggers a cutscene

**Cutscene 1 - Window**:
The boy breathing on the window pane and writing "HELP!" in the mist.

**Cutscene 2 - Door**:
If you try to go to the door, you cannot go in. He pushes a piece of paper under the door with a message written crudely in charcoal:

> "The warlock has locked me in! He hid the key in the fairy tree in the forest! Can you get it? Please help!"

**NPC Reactions**:
If you try to have conversations with other NPCs, it seems that they can't see the boy.

## Part 2: The Rescue

**Objective**: Find the fairy tree in the forest and get the key.

**Reward**: The key lets out the boy.

## Part 3: The Boy's Story

The boy explains:
- He is a druid's apprentice
- He fell out with his master
- The master banished him to the spirit plane
- The master locked him in the house
- For some reason, only the Player Character can see him
- He is from the village, but it has been a long time
- His family is dead
- In his time, people used to live in huts, not houses

## Part 4: The Search

The boy goes away for a time - he sets out to find out how he can break the curse.

## Part 5: The Ritual

At some point he reappears. He needs your help.

**Requirements to Break the Curse**:
- A portal from the spirit realm to the realm of the living
- You need to guide him
- The portal can only be cast on a midsummer's night
- He will need a bonfire to light his way back

## Part 6: The Choice

**If you agree to help**:
You can either:
1. Build your own bonfire
2. Ask to use someone else's (if you have access to the witches' glade, they have a bonfire you can borrow once they are done with their dancing)

**If you decline or miss the deadline**:
He is disappointed and disappears forever.

## Part 7: Special Friend

**If you help the boy successfully**:
- You have a Special Friend
- You must help him settle in as a human

**Settlement Options**:
- He can move in with you
- He can stay in the cottage where he was locked in

**Teaching Modern Life**:
He needs:
- New clothes
- To be taught modern skills:
  - How to earn money
  - How to go to the shop
  - How to buy groceries
  - Etc.

## Implementation Notes

- Need to create the ghost boy character sprite (visible but ethereal?)
- Need to create the locked cottage map
- Need to add fairy tree to forest
- Need to implement the bonfire mechanic
- Need dialogue trees for all interactions
- Need to track quest state across game saves
- Deadline mechanic (next midsummer after quest starts)
