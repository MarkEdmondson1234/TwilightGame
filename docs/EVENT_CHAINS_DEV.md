# Event Chains — Developer & Authoring Guide

## Overview

Event chains are branching narrative sequences defined in YAML files. Each file is a self-contained story with stages, player choices, NPC dialogue injection, and global event publishing. The system is designed to make it very easy to add new stories — just drop a `.yaml` file in `data/eventChains/` and it's automatically loaded.

## Architecture

```
data/eventChains/*.yaml          ← Author writes these
        ↓
utils/eventChainLoader.ts        ← Discovers + validates + parses YAML
        ↓
utils/EventChainManager.ts       ← Manages lifecycle, choices, persistence
        ↓                    ↓
services/dialogueService.ts   utils/GlobalEventManager.ts
  (injects NPC dialogue)       (publishes shared events)
```

**Key files:**
- `utils/eventChainTypes.ts` — TypeScript types for the YAML schema
- `utils/eventChainLoader.ts` — Vite glob import + `yaml` parser + validation
- `utils/EventChainManager.ts` — Singleton manager (start, advance, choose, reset)
- `data/eventChains/*.yaml` — Event chain definitions (auto-discovered)

## YAML Schema Reference

### Root Fields

```yaml
id: unique_chain_id          # Required. Unique identifier (snake_case)
title: Human Readable Title   # Required. Shown in DevTools and AI context
description: Brief summary    # Required. What this chain is about
type: mystery                 # Required. discovery | achievement | seasonal | community | mystery
trigger:                      # Required. When/how chain activates
  type: manual                # manual | event_count | quest_complete | seasonal | friendship
stages:                       # Required. Array of stages (at least one)
  - id: start
    text: What happens here
```

### Trigger Types

| Type | Description | Extra Fields |
|------|-------------|--------------|
| `manual` | Started via DevTools or code | — |
| `event_count` | When enough global events of a type exist | `eventType`, `minCount` |
| `quest_complete` | When a specific quest is completed | `questId` |
| `seasonal` | When a specific season starts | `season` (spring/summer/autumn/winter) |
| `friendship` | When friendship with an NPC reaches a tier | `npcId`, `tier` |

**Examples:**
```yaml
# Trigger when 5 discovery events exist
trigger:
  type: event_count
  eventType: discovery
  minCount: 5

# Trigger when witch garden quest is done
trigger:
  type: quest_complete
  questId: witch_garden_quest

# Trigger every autumn
trigger:
  type: seasonal
  season: autumn

# Trigger when good friends with village elder
trigger:
  type: friendship
  npcId: village_elder
  tier: good_friend
```

### Stage Fields

```yaml
stages:
  - id: stage_name              # Required. Unique within chain (snake_case)
    text: Description of what happens  # Required. Shown in DevTools, used by AI

    # Optional: Global event published when entering this stage
    event:
      title: Event headline       # Short title for the event
      description: what happened  # Past tense, starts lowercase (prefixed by contributor)
      contributor: A brave traveller  # Who did this (British English!)
      location:                   # Optional
        mapId: deep_forest
        mapName: Deep Forest

    # Optional: NPC dialogue injected during this stage
    # Keys are NPC IDs (village_elder, mum, mushra, witch, etc.)
    dialogue:
      village_elder:
        text: "What the elder says during this stage"
        expression: thinky        # Optional: smile, thinky, happy, etc.
      mum:
        text: "What Mum says during this stage"

    # Optional: Player choices (makes this a branching point)
    choices:
      - text: "What the player can choose"
        next: target_stage_id     # Stage to go to if chosen
        event:                    # Optional: event published on choosing this
          title: Player chose wisely
          description: made an interesting decision
          contributor: A thoughtful traveller
        requires:                 # Optional: conditions to show this choice
          quest: some_quest_id
          questCompleted: finished_quest_id
          item: moonpetal
          friendshipTier:
            npcId: witch
            tier: acquaintance

    # Optional: Auto-advance (for linear stages without choices)
    next: next_stage_id           # Go to this stage after waitDays

    # Optional: Wait before auto-advancing
    waitDays: 2                   # Game days to wait before moving to 'next'

    # Optional: Item rewards
    rewards:
      - item: moonpetal           # Item ID from data/items.ts
        quantity: 3

    # Optional: Marks this as the final stage
    end: true
```

### Branching Patterns

**Linear chain** (A → B → C):
```yaml
stages:
  - id: start
    text: Beginning
    next: middle
  - id: middle
    text: Middle part
    next: ending
    waitDays: 1
  - id: ending
    text: The end
    end: true
```

**Branching choice** (A → B or C → D):
```yaml
stages:
  - id: start
    text: A choice appears
    choices:
      - text: "Option B"
        next: path_b
      - text: "Option C"
        next: path_c
  - id: path_b
    text: You chose B
    next: ending
  - id: path_c
    text: You chose C
    next: ending
  - id: ending
    text: Both paths converge here
    end: true
```

**Conditional choice** (some options require quests/items):
```yaml
choices:
  - text: "Always available"
    next: common_path
  - text: "Ask the witch"
    next: witch_path
    requires:
      questCompleted: witch_garden_quest
  - text: "Use the moonpetal"
    next: magic_path
    requires:
      item: moonpetal
```

**Multiple endings:**
```yaml
stages:
  - id: choice
    choices:
      - text: "Happy path"
        next: happy_end
      - text: "Bittersweet path"
        next: bittersweet_end
  - id: happy_end
    text: Everything works out
    end: true
  - id: bittersweet_end
    text: Things are different now
    end: true
```

## NPC Dialogue Injection

When a chain stage has `dialogue` entries, those dialogue lines are **prepended** to the NPC's normal dialogue tree. They appear as the first thing the NPC says when you talk to them during that stage.

**NPC IDs** (use these in `dialogue` keys):
- `village_elder` — The Village Elder
- `mum` — Your Mum (in the house)
- `mushra` — Mushra the mushroom expert (forest)
- `witch` — The Witch (witch's hut)
- `althea` — Althea
- `henrietta` — The chicken
- Other NPC IDs as defined in `utils/npcs/`

**Expressions** (optional, depends on NPC having `dialogueExpressions` configured):
- `smile`, `happy`, `thinky`, `worried`, `surprised`
- Falls back to default `dialogueSprite` if expression not found

## Global Event Publishing

Each stage can publish a global event visible to all players:

```yaml
event:
  title: Short headline          # Shown in event lists
  description: what happened     # Lowercase, past tense (prefixed by contributor name)
  contributor: A brave traveller # British English! "traveller" not "traveler"
```

**How it appears to other players:** "A brave traveller found ancient fairy circles glowing softly in the moonlight"

**British English reminder:**
- "traveller" not "traveler"
- "colour" not "color"
- "favourite" not "favorite"
- "neighbour" not "neighbor"
- "recognised" not "recognized"

## Persistence

Chain progress is saved to `localStorage` under the key `twilight_event_chains`. The saved data includes:
- Current stage ID
- Day the chain started
- Day the current stage was entered
- All choices made (stage ID → choice text)
- Whether the chain is completed

Progress is restored on game load. If a YAML file is removed, its saved progress is silently dropped.

## Testing with DevTools (F4)

The **Event Chains (YAML)** section in DevTools shows:

- **All loaded chains** with their type, stage count, and trigger
- **Active chains** highlighted in blue with current stage details
- **Completed chains** highlighted in green
- **Choice buttons** for stages with player decisions
- **Advance button** for linear stages (skips waitDays)
- **Start/Reset buttons** to control chain lifecycle

### Testing Workflow

1. Open DevTools with **F4**
2. Scroll to "Event Chains (YAML)"
3. Click **Start** on a chain
4. See the current stage text and available choices
5. Click a choice to branch the story
6. Check NPC dialogue by talking to referenced NPCs
7. Click **Reset** to test a different path

## EventBus Integration

The `EVENT_CHAIN_UPDATED` event fires whenever a chain changes state:

```typescript
import { eventBus, GameEvent } from '../utils/EventBus';

eventBus.on(GameEvent.EVENT_CHAIN_UPDATED, ({ chainId, stageId, action }) => {
  // action: 'started' | 'advanced' | 'completed' | 'reset'
  console.log(`Chain ${chainId} ${action} at stage ${stageId}`);
});
```

## Auto-Advance

Chains with `waitDays` on a stage auto-advance when enough game days pass. Call `eventChainManager.checkAutoAdvance()` periodically (e.g., on day change) to process waiting stages.

**Note:** Stages with `choices` never auto-advance — they wait for player input.

## Creating a New Chain — Quick Checklist

1. Create `data/eventChains/your_chain.yaml`
2. Set `id`, `title`, `description`, `type`, `trigger`
3. Add stages with unique `id` fields
4. Add `choices` for branching or `next` for linear progression
5. Mark the final stage(s) with `end: true`
6. Add `dialogue` entries for NPC reactions
7. Add `event` entries for global event publishing
8. Use British English throughout
9. Test in DevTools (F4) — chain auto-loads on page refresh
10. Verify NPC dialogue by talking to referenced NPCs

## Current Limitations & Future Work

### Not Yet Implemented
- **Tile-based triggers** — chains can't yet be triggered by walking onto a tile (e.g., finding the kitten at a specific well tile)
- **Event popup UI** — no standalone popup for presenting chain choices; choices currently only appear through NPC dialogue
- **Automatic trigger evaluation** — trigger conditions (seasonal, event_count, etc.) are defined but not yet automatically evaluated; chains currently need manual starting via DevTools or code
- **Item requirement checking** — `requires.item` is in the schema but not yet checked at runtime
- **Reward distribution** — `rewards` are defined but not yet automatically given to the player

### Planned Enhancements
- Toast notifications when a new chain becomes available
- Map markers or visual indicators for chain-related locations
- Tile interaction triggers (walk near the well → kitten chain starts)
- Automatic trigger evaluation on season change, quest completion, etc.
- Firebase sync for chain progress (currently localStorage only)
