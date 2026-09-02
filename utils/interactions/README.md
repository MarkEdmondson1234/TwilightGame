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
  sees. Only do it deliberately. `furnitureProvider` sits ahead of `placedItemProvider` for
  exactly this reason: "Sleep" must be offered above "Pick Up".

- **A lone interaction auto-executes — on a click.** If your interaction would be destructive
  or surprising to fire on a single click, set `requireConfirmation: true` on it (or
  `confirmPickup: true` on the item definition) so the radial menu shows anyway. A placed bed
  used to offer nothing but "Pick Up", so clicking it to sleep picked the bed up instead.

- **`ctx.isContextMenu` means the player is asking, not doing.** It is true when the
  collection came from a right-click or a long press. Nothing auto-executes then, however
  few interactions you return, and the player has not committed to anything yet.

  Two consequences for a provider:

  1. You may offer actions the *held tool* does not currently allow, as long as the player
     could actually perform them — `providers/farming.ts` offers "Till Soil" to an empty
     hand when the hoe is in the inventory, and switches to it via `ctx.onSelectTool` inside
     `execute`. This is the fix for the game's most common complaint, "I clicked it and
     nothing happened", where the only thing wrong was which tool was in hand. Still check
     ownership: the menu shows what is possible, not what a shopping trip would make
     possible.
  2. Every label you return will be *read*. Placeholder entries that only exist to be
     auto-executed unseen must be suppressed when `isContextMenu` is set — the farming
     provider's "Check Farm Action ❓" guidance entry is one, and it looked like a bug in
     the menu until it was gated.

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
