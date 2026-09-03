# Pending Code-Health Work

Handoff notes for the next working session. Everything here was scoped during the
September 2026 codebase sweep; the finished portions are listed so nothing gets
redone. Pick items up in any order — each section is self-contained.

---

## Where things stand

The sweep started from a clean bill of health (tsc clean, 874/874 tests, 0 lint
errors) and worked the warning backlog down. Current baseline:

| Metric                        | Sweep start | Now                                                                     |
| ----------------------------- | ----------- | ----------------------------------------------------------------------- |
| ESLint warnings               | 277         | **0**                                                                   |
| `no-unused-vars`              | 174         | **0** (PRs #74, #79)                                                    |
| `react-hooks/exhaustive-deps` | 40          | **0** (PRs #77, #78)                                                    |
| `no-explicit-any`             | 60          | **0** (PRs #76, #82)                                                    |
| raw `console.log` sites       | 682         | **570** (PR #84 started the migration; helper + first subsystem landed) |

**Verification command:** `npm run verify` (tsc + full test suite, ~4s).
**Lint:** `npx eslint .` — the working rule all session: warnings are signal, so
fix or explicitly justify; never leave the count creeping back up.

### Already merged (do not redo)

| PR  | Content                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #73 | CI perf gate moved from fps to **scene cost** (sprite/node/texture counts); fps gates only between real-GPU runs                                                                                          |
| #74 | All 174 unused imports/locals/args removed (AST codemod + manual triage)                                                                                                                                  |
| #75 | ShopUI `handleDragStart`→`initiateTrade`, `showQuantitySlider`→`showQuantityStepper`; 3 stale eslint-disable directives removed                                                                           |
| #76 | Typed `Window` interface in `vite-env.d.ts`; 13 `(window as any)` casts replaced                                                                                                                          |
| #77 | `useChatHistory` returns a memoised object; NPC-switch chat-history bug fixed; dialogue dep arrays made honest                                                                                            |
| #78 | Full exhaustive-deps triage: 4 real bugs fixed (BasketModal, PaintingEaselGame, MiniGameHost, CombatEncounter), intentional patterns documented with reasons                                              |
| #79 | Prop bindings orphaned by #78 removed                                                                                                                                                                     |
| #81 | Dead `DialogueBox`/`AIDialogueBox` deleted; AI_CONVERSATIONS_DEV.md rewritten for the unified box                                                                                                         |
| #82 | All 43 remaining `no-explicit-any` removed; `tests/pixi-import-test.ts` deleted; `getColorHexByName`/`lookupFarmingAsset` typed contracts added; `Navigator`/`Performance` ambient types in vite-env.d.ts |
| #84 | `utils/debugLog.ts` category-gated logging helper + DevTools toggle + `no-console` guard on converted files; `dialogueHandlers.ts` converted as the pattern                                               |

Each merge auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`.

---

## 1. ~~The last lint category: 47 `no-explicit-any`~~ — DONE (PR #82)

Zero as of PR #82. `npx eslint .` reports 0 warnings total.

The reusable typed contracts added there, for future use:

- `palette.ts` → `getColorHexByName(string)` (regex-extracted colour names)
- `assets.ts` → `lookupFarmingAsset(key)` (runtime-built crop sprite keys)
- `vite-env.d.ts` → `Navigator.msMaxTouchPoints`, `Performance.memory`

---

## 2. Console noise: migration in progress (helper landed in PR #84)

`utils/debugLog.ts` now exists: category-gated `debugLog(category, ...args)` that
re-attaches the `[Prefix]` tag on output. Flag sources are the same as
`runtimeDebug()` in constants.ts: `?debug=<categories|1|all>` URL param and the
`twilight_debug` localStorage key, plus a DevTools toggle (World tab → "Debug
Logging") that persists and needs no reload. Case-insensitive category matching.
`console.warn`/`error` stay ungated everywhere (player-visible diagnostics).

**eslint config** has a `no-console: ['warn', {allow: ['warn','error','info']}]`
override scoped to converted files (`utils/debugLog.ts` itself is exempt).
**Extend that `files` list as each subsystem converts** — that is what keeps the
count honest afterwards.

**Migration recipe** (see `utils/dialogueHandlers.ts` for the worked example —
39 sites, one codemod + hand-fixed multi-line forms):

1. Per file: `console.log('[Prefix] ...')` → `debugLog('Prefix', ...)` (prefix
   moves out of the string into the first argument; output looks identical).
2. Drop any `if (DEBUG.X)` guards wrapping the logs — `DEBUG.QUEST`-style flags
   are hardcoded `import.meta.env.DEV && false` (never on); the category flag
   revives these diagnostics behind `?debug=<category>`.
3. Add the file to the eslint `no-console` override list.
4. Per category, sanity-check intent: diagnostics → gated `debugLog`; anything
   a player genuinely needs → keep/convert to `console.warn` (ungated).

**Remaining inventory** (console.log counts on main after the merge): GameState.ts ~43,
GameStatePersistence.ts ~32, farmManager.ts ~31, FriendshipManager.ts ~30,
actionHandlers.ts ~27, gameInitializer.ts ~24, procedural.ts ~20,
inventoryManager.ts ~17, App.tsx ~17, AudioManager.ts ~16, then tail. 113
unique `[Prefix]` tags total — the prefix _is_ the category, so most files are
one-category conversions.

**Done when:** every non-test source file is either in the eslint override list
or uses only `console.warn`/`error`.

**Known trap:** at least one `no-console` eslint-disable in the repo was a
no-op because the rule was never enabled (removed in #75). The new override
actually enables the rule, so disables inside converted files would now be
meaningful — don't add any; delete the call instead.

---

## 3. ~~Dead code: two complete dialogue components to delete~~ — DONE (PR #81)

Both deleted; `AI_CONVERSATIONS_DEV.md` updated; consumed hooks all remain in
use by `UnifiedDialogueBox` (verified in PR #81).

---

## 4. Tracked TODOs (8, all content/art, all safe to defer)

| Location                                       | TODO                                           |
| ---------------------------------------------- | ---------------------------------------------- |
| `maps/definitions/witchHut.ts:109`             | Add familiar/pet NPCs (black cat, owl)         |
| `App.tsx:1582`                                 | GlamourModal component (feature gap)           |
| `minigames/combat-encounter/antagonists.ts:81` | Goblin actionSprites (art)                     |
| `NPCManager.ts:871`                            | PATROL behaviour for NPCs (feature)            |
| `utils/interactions/providers/berries.ts:95`   | Dedicated blueberry sprite (art)               |
| `data/items/food.ts:196`                       | lava_cake artwork (art; notes where to add it) |
| `data/items/toolsAndMaterials.ts:106`          | Add item to Mushra's shop (design)             |
| `data/items/toolsAndMaterials.ts:118`          | Replace placeholder with real artwork          |

These are fine to leave until the relevant feature/art work happens. The one
with real gameplay impact is `NPCManager.ts:871` (PATROL) if wandering NPCs
are ever wanted.

---

## 5. Longer-term: god files

The extraction pattern is already established and working (domain-controller
hooks: `useInteractionController`, `useMultiplayerController`,
`useKeyboardControls`, …; domain managers under `utils/`). Continue it
incrementally — one controller per PR, never a big-bang split:

| File                      | Lines  | Notes                                                                                                                                                                      |
| ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                 | ~2,990 | The wiring hub: ~104 imports, ~84 hook call sites. Extract remaining domains (cutscene wiring, farm animation, UI effects) the same way `useUIState`/`useToast` were done. |
| `GameState.ts`            | ~2,056 | Save-state + placement + quest surface. Consider splitting persistence-facing code from state.                                                                             |
| `utils/forageHandlers.ts` | ~1,712 |                                                                                                                                                                            |
| `maps/procedural.ts`      | ~1,708 |                                                                                                                                                                            |
| `components/DevTools.tsx` | ~1,670 | Debug tooling — low priority.                                                                                                                                              |
| `utils/farmManager.ts`    | ~1,566 |                                                                                                                                                                            |

**Do not start this** until §1–§3 are done — refactoring while lint noise
exists hides regressions. Note `App.tsx` grew slightly during the sweep
(session added ~10 lines of disables/comments); that is the cost of honesty,
not drift.

---

## 6. Operational notes (learned the hard way this sweep)

- **CI perf gate flake mode:** if `performance` fails with
  `Error: No performance data collected`, the runner starved the metrics
  sampler (seen once on #76). The runtime code was identical to a passing run.
  **Re-run the failed job** (`gh run rerun <id> --failed`) before
  investigating. Real regressions surface in the scene-cost table of the PR
  comment, not as missing files.
- **`generate performance report` failing on `perf-results.json not found`**
  is the same flake: the test steps are `|| true`-guarded, so the report step
  is where a dead run surfaces. If it recurs often, consider making the report
  step emit a neutral "no data" status instead of failing the job.
- **Deploy dedup:** consecutive merges cancel each other's deploys
  (concurrency group `pages-${{ github.ref }}`) — a "cancelled" deploy after a
  merge is normal; the later one covers it.
- **eslint-plugin-react-hooks v7 quirks:**
  - It rejects property-chain deps (`chatHistory.addAssistantMessage`) —
    destructure the hook and list the binding.
  - Deps-array warnings are reported **at the deps-array start line** for
    multi-line arrays (single-line: at the line). `eslint-disable-next-line`
    must sit immediately before that line, not after it.
  - Dep arrays evaluate during render: referencing a `const` declared later in
    the component body is a runtime TDZ crash, not just a lint gripe. tsc
    catches it (`TS2448`) — always run `tsc` before committing hook changes.
  - "Unnecessary dependency" on values like `diaryRefreshKey`/
    `magicUpdateTrigger`/`npcUpdateTrigger` is the **version-counter
    pattern**: the dep exists to invalidate a memo that reads manager
    singletons. Keep it, add `eslint-disable-next-line … -- reason`.
- **PR conventions:** prose-style commit subjects (see `git log`), body
  explains the _why_; run `npx prettier --write <touched files>` before
  committing; `npm run verify` green before pushing.

---

## Suggested order for a fresh session

1. ~~§3 dead dialogue components~~ — DONE (PR #81)
2. ~~§1 remaining `no-explicit-any`~~ — DONE (PR #82)
3. §2 `debugLog` migration — helper + pattern landed (PR #84); convert the
   remaining ~570 sites subsystem-by-subsystem per the recipe in §2, one or a
   few files per PR, extending the eslint override list each time
4. §4 TODOs — only when their feature/art work actually happens
5. §5 god-file extraction — ongoing background work, one domain per PR
