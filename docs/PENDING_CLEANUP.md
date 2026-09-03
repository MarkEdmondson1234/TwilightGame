# Pending Code-Health Work

Handoff notes for the next working session. Everything here was scoped during the
September 2026 codebase sweep; the finished portions are listed so nothing gets
redone. Pick items up in any order — each section is self-contained.

---

## Where things stand

The sweep started from a clean bill of health (tsc clean, 874/874 tests, 0 lint
errors) and worked the warning backlog down. Current baseline:

| Metric | Sweep start | Now |
|---|---|---|
| ESLint warnings | 277 | **47** |
| `no-unused-vars` | 174 | **0** (PRs #74, #79) |
| `react-hooks/exhaustive-deps` | 40 | **0** (PRs #77, #78) |
| `no-explicit-any` | 60 | **47** (PR #76 did the window globals) |

**Verification command:** `npm run verify` (tsc + full test suite, ~4s).
**Lint:** `npx eslint .` — the working rule all session: warnings are signal, so
fix or explicitly justify; never leave the count creeping back up.

### Already merged (do not redo)

| PR | Content |
|---|---|
| #73 | CI perf gate moved from fps to **scene cost** (sprite/node/texture counts); fps gates only between real-GPU runs |
| #74 | All 174 unused imports/locals/args removed (AST codemod + manual triage) |
| #75 | ShopUI `handleDragStart`→`initiateTrade`, `showQuantitySlider`→`showQuantityStepper`; 3 stale eslint-disable directives removed |
| #76 | Typed `Window` interface in `vite-env.d.ts`; 13 `(window as any)` casts replaced |
| #77 | `useChatHistory` returns a memoised object; NPC-switch chat-history bug fixed; dialogue dep arrays made honest |
| #78 | Full exhaustive-deps triage: 4 real bugs fixed (BasketModal, PaintingEaselGame, MiniGameHost, CombatEncounter), intentional patterns documented with reasons |
| #79 | Prop bindings orphaned by #78 removed |

Each merge auto-deploys to GitHub Pages via `.github/workflows/deploy.yml`.

---

## 1. The last lint category: 47 `no-explicit-any`

Current distribution (run `npx eslint .` for live numbers):

| File | Count | Notes / suggested approach |
|---|---|---|
| `firebase/safe.ts` | 7 | Module-loading/dynamic-import plumbing. Type against `typeof import('./index')` shapes where possible; some `unknown` + narrowing is honest. |
| `tests/pixi-import-test.ts` | 6 | Test harness file — consider whether it's still needed at all (it reads like a one-off import smoke test). |
| `utils/pixi/TileLayer.ts` | 5 | PixiJS internals. Pixi v8 has decent types; try real types first. |
| `GameState.ts` | 4 | Look before blanket-typing — may be save-data boundaries where `unknown` + validation is correct. |
| `components/TileRenderer.tsx` | 4 | DOM/Pixi interop. |
| `components/DialogueBox.tsx` | 4 | **Dead file (see §3) — disappears with the deletion, no work needed.** |
| `components/dialogue/ScriptedControls.tsx` | 4 | Props for markdown/event handlers — likely real types available. |
| `maps/MapManager.ts`, `DebugInfoPanel.tsx` | 2+2 | |
| 10 other files | 1 each | Cheap single-file sweep. |

**Precedent to follow:** PR #76's `vite-env.d.ts` approach — one typed contract
beats N casts. Every removal is verified by `npm run verify`; `unknown` +
narrowing is preferred over inventing loose types.

**Done when:** `npx eslint . | grep -c no-explicit-any` → 0, or the remainder
carry a written justification comment.

---

## 2. Console noise: 682 `console.log` statements, no logging abstraction

682 sites in non-test source (App.tsx ~17, GameState.ts ~43, NPCManager.ts ~9,
plus ~600 across utils/components). Production players' consoles see all of it,
including per-frame debug lines like `[App] ui.devTools changed to:`.

**Suggested design** (small, in `utils/`):

```ts
// utils/debugLog.ts
// Gates on a runtime flag: ?debug=1 query param, localStorage key, or the
// existing DevTools toggle. Categories let devtools filtering work:
debugLog('map', 'Loaded map: village (30x30)');
```

**Migration strategy — do NOT blanket-convert:**

1. Build the helper + wire the flag (small PR on its own).
2. Convert by category per file, keeping the existing `[Prefix]` tags as
   categories — the prefixes already encode meaning.
3. Decide per category whether it is debug-only (gated) or player-visible
   diagnostics (keep as `console.warn`/`error` — those stay untouched).
4. The eslint config has **no `no-console` rule**; consider adding it as
   `warn` with an allowlist once the helper exists, so the count stays at zero
   afterwards.

**Known trap:** at least one `no-console` eslint-disable in the repo was a
no-op because the rule was never enabled (removed in #75).

---

## 3. Dead code: two complete dialogue components to delete

Both are superseded by `components/dialogue/UnifiedDialogueBox.tsx` — its
header comment says so explicitly. Both are verified **imported by nothing**
(re-checked 2026-09-03 with import-graph greps):

- `components/AIDialogueBox.tsx` — 940 lines. Its exhaustive-deps warning was
  given a "not currently mounted" disable in #77 as a stopgap.
- `components/DialogueBox.tsx` — also unimported.

**Deletion procedure:**

1. `grep -rn "AIDialogueBox\|components/DialogueBox"` one more time (cheap insurance).
2. Delete both files, run `npm run verify` (the 4 `any`s in DialogueBox vanish
   with it — see §1).
3. Check `docs/AI_CHAT.md` / `docs/AI_CONVERSATIONS_DEV.md` for references and
   update them to point at `UnifiedDialogueBox` only.
4. One PR for both, prose commit message noting they were replaced by the
   unified box. Git history preserves everything.

**After deleting, re-check:** `useStreamingDialogue`, `useChatHistory` and
other hooks they consumed may become partially or fully unused — run the
unused-vars sweep again and follow the same triage.

---

## 4. Tracked TODOs (8, all content/art, all safe to defer)

| Location | TODO |
|---|---|
| `maps/definitions/witchHut.ts:109` | Add familiar/pet NPCs (black cat, owl) |
| `App.tsx:1582` | GlamourModal component (feature gap) |
| `minigames/combat-encounter/antagonists.ts:81` | Goblin actionSprites (art) |
| `NPCManager.ts:871` | PATROL behaviour for NPCs (feature) |
| `utils/interactions/providers/berries.ts:95` | Dedicated blueberry sprite (art) |
| `data/items/food.ts:196` | lava_cake artwork (art; notes where to add it) |
| `data/items/toolsAndMaterials.ts:106` | Add item to Mushra's shop (design) |
| `data/items/toolsAndMaterials.ts:118` | Replace placeholder with real artwork |

These are fine to leave until the relevant feature/art work happens. The one
with real gameplay impact is `NPCManager.ts:871` (PATROL) if wandering NPCs
are ever wanted.

---

## 5. Longer-term: god files

The extraction pattern is already established and working (domain-controller
hooks: `useInteractionController`, `useMultiplayerController`,
`useKeyboardControls`, …; domain managers under `utils/`). Continue it
incrementally — one controller per PR, never a big-bang split:

| File | Lines | Notes |
|---|---|---|
| `App.tsx` | ~2,990 | The wiring hub: ~104 imports, ~84 hook call sites. Extract remaining domains (cutscene wiring, farm animation, UI effects) the same way `useUIState`/`useToast` were done. |
| `GameState.ts` | ~2,056 | Save-state + placement + quest surface. Consider splitting persistence-facing code from state. |
| `utils/forageHandlers.ts` | ~1,712 | |
| `maps/procedural.ts` | ~1,708 | |
| `components/DevTools.tsx` | ~1,670 | Debug tooling — low priority. |
| `utils/farmManager.ts` | ~1,566 | |

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
  explains the *why*; run `npx prettier --write <touched files>` before
  committing; `npm run verify` green before pushing.

---

## Suggested order for a fresh session

1. §3 dead dialogue components (30 min, shrinks §1 by 4 and unblocks §2's count)
2. §1 remaining `no-explicit-any` (~43 sites, half a day)
3. §2 `debugLog` helper + migration (a day; can be split per-subsystem)
4. §4 TODOs — only when their feature/art work actually happens
5. §5 god-file extraction — ongoing background work, one domain per PR