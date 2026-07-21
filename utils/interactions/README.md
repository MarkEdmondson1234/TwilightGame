# Interaction System

Answers one question: **"what can the player do at this position?"**

Every click and every action-button press flows through `getAvailableInteractions()`. If it
returns one interaction, it executes immediately; if it returns several, the radial menu
shows them.

## Adding a new interaction

Three steps. You should not need to read any file outside this folder.

1. **Create `providers/yourThing.ts`:**

   ```typescript
   import type { AvailableInteraction, InteractionContext } from '../types';

   export function yourThingProvider(ctx: InteractionContext): AvailableInteraction[] {
     const { currentMapId, tileData, tilePos } = ctx;
     const interactions: AvailableInteraction[] = [];

     if (/* your condition */) {
       interactions.push({
         type: 'your_thing',        // add to InteractionType in ../types.ts
         label: 'Do Your Thing',
         icon: '🌟',
         color: '#8b5cf6',
         execute: () => { /* the actual game mutation goes here */ },
       });
     }

     return interactions;
   }
   ```

2. **Add the type** to the `InteractionType` union in [`types.ts`](types.ts).

3. **Register it** — one line in [`registry.ts`](registry.ts).

If your interaction needs a new callback (e.g. to open a UI panel), add it to
`GetInteractionsConfig` in `types.ts` and pass it from
[`hooks/useInteractionController.ts`](../../hooks/useInteractionController.ts).

## Rules

- **Providers must be side-effect free at collection time.** `getAvailableInteractions` runs
  on every click just to find out what is *possible*. Game state may only change inside an
  interaction's `execute` callback, which runs when the player actually picks that option.
  Putting a mutation in the provider body means it fires on every click, whether the player
  chose it or not.

- **Order in `registry.ts` is the radial menu order.** Reordering changes what the player
  sees. Only do it deliberately.

- **`exclusive: true` suppresses every provider after it.** Return
  `{ interactions, exclusive: true }` when one interaction fully owns the click — the shop
  counters do this, because offering "talk to the shopkeeper" next to "browse the shop"
  would be wrong. Use it sparingly; it makes the provider order load-bearing.

- **Read shared values off `ctx`, don't recompute them.** `tileX`, `tileY`, `tileData`,
  `tilePos`, `placedItems` and `itemAtPosition` are computed once per call in
  [`index.ts`](index.ts). In particular `itemAtPosition` handles the scaled bounding boxes of
  large decorations — a hand-rolled anchor-tile check will silently miss them.

## Layout

| File | What it holds |
|---|---|
| [`index.ts`](index.ts) | `getAvailableInteractions`, context building, provider walking |
| [`registry.ts`](registry.ts) | The ordered provider list — **add your one line here** |
| [`types.ts`](types.ts) | `InteractionType`, `AvailableInteraction`, `InteractionContext`, config |
| `providers/*.ts` | One module per interaction kind |

Runtime helpers (`checkMirrorInteraction`, `handleFarmAction`, `checkDeskInteraction`, …)
still live in [`../actionHandlers.ts`](../actionHandlers.ts), because the keyboard and touch
input paths call them directly too. Providers import them from there. `actionHandlers.ts`
re-exports this folder's types, but only as `export type`, so there is no runtime import
cycle — keep it that way.

## History

This folder replaced a single 1,337-line `getAvailableInteractions` function inside
`actionHandlers.ts`. The split is behaviour-preserving: the provider bodies are the original
`if` blocks, moved verbatim and in the same order.
