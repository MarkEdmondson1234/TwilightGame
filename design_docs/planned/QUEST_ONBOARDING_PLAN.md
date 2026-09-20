# Quest onboarding and feature discovery plan

**Status:** In progress — discovery invitations, village news, tea repair, three quest guides, optional pinning and nearby conversation cues and the kitchen painting introduction implemented; Crate Trail adventure practice implemented; Tiny Wreath, cooking tasters and wider world signposting remain planned.
**Audit date:** 18 September 2026. **Code baseline:** `26a02b78`.  
**Audience:** New players aged 11–12, with optional help for any player.  
**Scope clarification:** Make every existing player-facing feature discoverable and reachable, including activities outside quest chains. New quests are one possible tool, not the default solution.  
**Primary report:** [GitHub #151 — Newbie ramp on](https://github.com/MarkEdmondson1234/TwilightGame/issues/151), read with `gh issue view 151 --json title,body,comments,url,state`; open, no comments at audit time.

## Implementation progress

### First release — contextual activity invitations

Implemented: illustrated winter-forest skiing clue, nearby invitations for the village child's autumn pumpkin carving, forest Mushra's all-year wreaths, and Cinder's Lava Leap; additional skiing/carving/wreath dialogue; a persistent **Things to try** journal chapter. Invitations defer while other interfaces are active, and **Later** retains directions rather than declining an activity. Equipped skiers can launch directly with the same location/season eligibility as the inventory action.

This first slice uses existing portraits/item artwork. World props and demonstrations, direct launches from NPC dialogue, personal objective cards, cooking repairs and multiplayer news/milestone publishing remain planned. No shared quest completion or new mini-game unlocks are introduced by remembering a lead.

Validation: eight new discovery/component tests; type check and lint (no errors); full suite's single existing YAML-loader timeout passed on an isolated rerun. Invitation layout reviewed in an isolated browser fixture at 844×390 and 390×844; live-world iPad playtesting remains needed.

Test in game: enter a winter forest; approach the village child in autumn, Mushra in the mushroom forest, or Cinder; choose **How do I try it?**, **Ask**, or **Later**; reopen the journal's **Things to try** chapter. Repeated visits should not repeat a remembered invitation. Test equipped skiing with **Go Skiing** and with the inventory action.

### Second release — village news and shared milestones

Implemented: an illustrated return recap and **Journal → Village news**, with authored spoiler-light summaries of shared events. **Later** preserves unread news; **Mark this news read** advances a persisted, account-scoped server timestamp/document-ID cursor. **Keep this lead** adds directions to Things to try without advancing personal quests. Repeated events are grouped, and the reader's own events are excluded.

New shared milestones cover a successful cook, a successful brew, a confirmed harvest, and discovering skiing, pumpkin carving, wreath-making or Lava Leap. Publication is once per account/activity, uses immutable deterministic Firestore documents for retry/device deduplication, and retains a bounded pending queue in the character save. Existing players can contribute their first recorded milestone after this release; the wording does not falsely claim their first-ever dish or harvest. Signed-out actions are not published. Cooking and brewing announcements come after successful save paths; ordinary shared harvest announcements wait for a winning claim, and disputed claims never announce a harvest. Shared dual-harvest announcements are deferred until that path has equivalent confirmation.

The recap deliberately summarises at most the latest 100 events and labels truncated results **recent highlights**; this first version is not a complete historical archive or an exact login-to-login activity ledger. **Later** retains news since the last explicit acknowledgement. Reads wait for initial cloud sync; offline failures do not advance the cursor and retry on reconnect. Legacy quest events receive generic summaries, while new milestone events provide specific leads. Personal quest state is never inferred from another player's news.

Still planned: direct references to durable shared decorations and other visible changes, richer scripted NPC follow-up, individually targeted advanced hints, more milestone types, and full event pagination. Existing NPC global-event context can pick up the new events through its usual refresh path.

Test with two signed-in accounts: A cooks/brews, harvests an uncontested crop, or opens one of the four supported mini-games. Allow up to 30 seconds for the saved milestone queue to publish. B reloads/returns after A's publication and should see news after cloud sync. B can keep a lead, reopen it in the journal, choose Later and return, or mark it read. Repeating A's action must not produce another milestone of the same kind. Check B's personal quest progress remains unchanged. Local checks cover selection/cursor boundaries, retries, account changes, UI actions, idempotent transport and the contested-harvest path; live two-account testing is still needed.


### Third release — a reliable first cup of tea

Implemented for #151: the book and kitchen action now share CookingManager's ingredient, stamina, item, recipe-progress and milestone path. Tea requires Mum's kitchen, with room-wide access through the book or **Make Tea at the Fireplace** interaction. Other recipes retain their existing station behaviour for this slice. Invalid attempts spend no stamina or ingredients. After asking Mum to teach cooking, she supplies missing ingredients for one successful practice cup; the saved tea cook count prevents repeat free cups.

Mum's introduction saves a journal lead rather than completing the lesson. Actual tea success completes it, confirms the tea is in the bag and directs players back to Mum for their next lesson. A nearby illustrated invitation points newcomers towards Mum. Existing tutorial unlocks stay unlocked; saved tea cooking history repairs missing lesson credit. Old book-shortcut cups had no cooking history, so they cannot be distinguished from bought or gifted tea; preserved legacy unlocks and the practice cup provide a recovery route.

Validation: manager tests cover location, ingredients, stamina, practice-cup limits, reload and legacy progress; book tests cover the shared path beside Mum and disabled cooking outside the kitchen. Live first-session keyboard/iPad playtesting remains required. Test a fresh character: ask Mum to teach cooking, make Tea through the book anywhere in her kitchen, check the bag and return to Mum for a domain choice. Reload and confirm it does not ask for another cup. Repeat on another fresh save via the fireplace action. Check that village reading cannot cook tea.

### Fourth release — personal next steps in the journal

Implemented: **Active Quests** now includes cooking lessons and live next-step guidance for Elias's gardening quest and Althea's chores. Each guide names the next action and destination, with ingredient shortages, cooking mastery counts, seasonal tasks, items in the bag and completed hand-ins. Existing chain story text stays available. Inventory, quest, chain and time events refresh the journal while it is open. Guidance is read-only and uses personal progress; village news never supplies quest credit.

Gardening keeps an assigned task across season changes, accepts an already-held delivery in winter, and suggests other activities when waiting for a new season. Althea's guide keeps dusting and both food deliveries visible, never asks for a delivered item again, and points to her final conversation once the chores are done. Her missing-tea/cookies dialogue now points to Mum and explains how to return. Cooking remains visible alongside the other quests and names ingredients still needed for one cook.

Removed estimated active-chain percentages: stage-array position is not a reliable completion measure in branching stories. Completed history entries retain their completion marker. Pinning, world markers, wider quest adapters and cooking-path flexibility remain planned.

Validation: all 1,620 tests passed; type check and lint passed (nine existing warnings). The journal panel was reviewed in an isolated 1024×768 touch browser. State-transition tests cover tea, mastery, ingredients, seasonal rollover, winter, inventory versus delivery and independent chores; a journal interaction test covers simultaneous activities and live inventory refresh. Playtest by switching among all three entries, handing over only one of Althea's items, and revisiting Elias after a season change. No quest state or inventory is changed by opening these guides.

### Fifth release — a next step while exploring

Implemented: players can pin cooking, gardening or Althea's next step from **Journal → Active Quests**. A compact cottage-style reminder shows the current action and location while exploring; selecting it opens the journal at the pinned quest. Pinning another quest replaces the preference without changing either quest's progress. Unpinning removes the reminder and leaves the quest active. The preference travels through existing character saves; old saves default to no pin.

The reminder reads the same personal guidance as the journal, refreshes after inventory, quest and cloud-sync events, and hides when the quest is no longer active. Dialogue, books, mini-games, cutscenes, village news and activity invitations take precedence. Touch controls retain their space, and the reminder has keyboard focus and labelled open/unpin actions. Only the three chains with reliable next-step adapters are pinnable in this release.

Validation: persistence/read validation, quest switching, stale/completed pins, inventory updates, cloud refresh, unpinning, invitation precedence and journal integration are covered by tests. The full local suite had one existing global-event dynamic-import timeout; that test passed on an isolated rerun. Type checking passes; lint has no errors and nine existing warnings. Browser fixture checks cover tablet and portrait/landscape phone sizes; a live fresh-save playtest remains needed.

Test in game: select a supported quest, choose **Pin next step while exploring**, close the book and follow the reminder. Collect a requested item and check the action changes to delivery. Tap the reminder to return to that journal entry. Switch to another quest, reload, open an invitation or mini-game, and finish or unpin the quest. Other accepted quests and their progress should remain intact.

Next: NPC readiness cues and reminders, then **A Picture for the Kitchen** and an all-season adventure practice route. Cooking tasters and remaining-chain adapters are still outstanding.

### Sixth release — nearby quest conversation cues

Implemented: nearby Mum, Elias and Althea can show a quiet speech cue when a supported personal quest has a useful conversation or delivery. Within talking range it expands into a short explanation and a keyboard/touch **Talk** button that opens ordinary dialogue. Reading or selecting a cue never gives an item, spends inventory or advances the quest. Unaccepted/completed chains do not advertise deliveries simply because the player carries an item.

The same next-step adapters supply journal, pinned guidance and conversation readiness. Mum offers the next cooking lesson after the current unlocked recipes are mastered. Elias distinguishes accepting the gardening offer, requesting a new seasonal task, honey advice and an actual crop/honey hand-in; waiting for a season is not marked ready. Althea distinguishes undelivered tea/cookies and her final story conversation. Her cookie-learning lead can point to Mum without promising to bypass the current cooking-path requirement.

Cues respect NPC visibility, proximity and interaction range, refresh after inventory/quest changes, and yield to dialogue, books, mini-games, cutscenes, village news and activity invitations. The existing shop indicator remains. Prompts stay inside the viewport at screen edges and use no looping animation. Scope remains the three existing adapted quest lines; new world props and wider quest coverage are still planned.

Validation: tests cover actionable versus waiting stages, autumn honey, winter carry-over, independent chores, active-only adapter reads, parallel quests, range, live refresh, hidden NPCs, overlay precedence, touch/click activation and preservation of the shop indicator. Browser fixtures were reviewed at 1024×768, 844×390 and 390×844, including an edge-clamped prompt. Live village/cottage playtesting remains needed.

Test in game: finish the tea lesson and approach Mum; carry a crop for Elias's assigned spring/summer task, or honey for autumn; bring Althea an undelivered food item. Approach to read the cue, choose **Talk**, and use the named dialogue topic. After hand-in the old delivery cue should disappear. Check winter waiting has no ready-delivery cue unless an earlier assigned task has a valid item in the bag.

Next: **A Picture for the Kitchen**, an all-season creative introduction with a starter canvas, followed by an adventure practice route. Cooking tasters and remaining-chain adapters remain outstanding.

### Seventh release — A Picture for the Kitchen

Implemented: a permanent communal easel beside the kitchen stairs, available all year with Draw and Craft Workshop; Mum’s optional painting dialogue and one saved starter canvas per character. This lesson runs independently of cooking. Saving a drawing records its identity; the journal and optional pin guide drawing → placing the picture → showing Mum. A nearby Mum cue appears when the player's lesson picture is actually displayed in the kitchen. Completion leaves the artwork in place and publishes an authored painting milestone for village news. Neighbours’ pictures never satisfy the personal lesson.

Recovery: repeating the acceptance dialogue cannot grant more canvases. The easel’s Craft Workshop can make another Blank Canvas (linen + wooden frame). Lost pictures can be replaced with another saved drawing; moving the finished picture later does not undo completion. Drawing and crafting remain available after the lesson.

Validation: lesson tests cover repeated/restored acceptance, genuine drawing identity and local kitchen placement, no credit from another picture or another room, completion/news once, and lost-material directions. Registry integration verifies both easel activities without owning equipment. Types and lint pass (nine existing warnings). Full local suite: 1,654 passed; two existing dynamic-import timeouts passed on isolated rerun. Easel artwork reviewed in a local room fixture at 1024×768 and 844×390. Live in-world touch and two-account news tests remain needed.

Test in game: talk to Mum → **Could I make a picture?** → accept; tap the easel beside the stairs → **Draw**; draw, name and save; select **Framed Painting** in your bag, close the bag and tap a clear kitchen spot → **Place**; talk to Mum → **About my kitchen picture…**. Check the journal/pin between steps. Log in with another account after publication to test the painting news lead.

Next: an all-season adventure practice route, followed by Tiny Wreath, cooking tasters and remaining-chain guides.


### Eighth release — the child’s Crate Trail

Implemented: an all-season, free village-child activity with a six-move beginner crate board, two pushes, labelled touch arrows, keyboard movement, Undo (last 100 moves), Restart and an optional explicit hint. The child introduces it through dialogue and a nearby discovery invitation. Reaching the golden door shows a short celebration; **Back to the village** records the independent lesson, adds a completed journal entry and publishes a deduplicated village-news milestone. Directions remain in **Things to try**, including a lead towards the harder Test of Wits.

This is the first playable slice of the proposed Delivery Mix-up: the puzzle is immediately available, with no parcel hand-in prerequisite. It has a separate mini-game ID and personal quest ID; it cannot trigger the Wizard Trials victory branch, cutscenes, travel or equipment rewards. Leaving before finishing/acknowledging the result gives no completion; replay is free. The full Test of Wits retains its original level and immediate completion result.

Validation: keyboard and touch solution tests, Undo/Restart, optional hints, leaving without credit, one-time personal/news completion and the original Test of Wits solution. Full local suite: 1,658 passed, three import/hook timeouts; affected suites rerun separately. Types and lint checked (nine existing warnings). Actual practice component solved through browser touch controls at 1024×768, 844×390 and 390×844, with screenshots reviewed. Live village entry and two-account news playtesting remain needed.

Test in game: approach the village child in any season → ask **What is Crate Trail?** or choose **Play Crate Trail** from her interaction menu → try a move, Undo, Restart and Hint → reach the golden door → **Back to the village**. Check the completed journal entry and Things to try; replay and confirm it adds no trial progress. Another account should receive the authored puzzle clue through village news.

Next: Mushra’s Tiny Wreath; then cooking tasters and remaining-chain guides. The fuller Delivery Mix-up parcel story and Lava Leap practice remain optional follow-ups.

## Recommendation

**Presentation direction:** Lead with visual storytelling, world activity and character dialogue. Helpful UI supports those clues by remembering them, confirming actions and offering optional guidance. Players should feel invited into village life and adventures, rather than directed through a checklist of features.

Fix the first cooking experience, give every active quest a reliable next step, then add a small set of playable introductions to the mini-games. Keep several quest lines available together. Increase complexity through decisions and combining skills, rather than through unclear controls, hidden prerequisites, or repetition before anything exciting happens.

Players should be able to answer four questions without an adult explaining the interface:

1. What am I trying to do now?
2. Where or with whom can I do it?
3. Did my action count?
4. If I cannot do this yet, what else can I enjoy?

## Audit scope and limits

This is a source and content audit of all 15 YAML event chains, the relevant quest handlers and NPC dialogue, cooking progression and entry points, journal presentation, proximity offers, and the mini-game registry/definitions. It is not a fresh-save playtest or a reproduction of the reported iPad behaviour. Findings below distinguish observed code from player reports and proposed changes. Existing design documents are useful background but are not evidence that their described features shipped; for example, the planned quest index still presents older story dependencies and a ghost-boy quest, while the current runtime includes the Invisible Ghost/Queen Avaricia chain.

### What already works as a foundation

- The journal already lists multiple active chains, completed stories, and conversation memories. We should improve it rather than introduce a competing quest log.
- Event chains support branching choices, NPC dialogue injection, rewards, seasonal/friendship/location triggers, and persistent metadata for detailed progress.
- Mr Fox and the ghost already initiate encounters through proximity. This provides a starting point for helpful NPC invitations.
- Existing mini-games offer creative, puzzle, movement, and combat experiences. Much of the reward content already exists.
- Some quests already give good concrete directions: Mr Fox's blanket and basket hand-offs, and the letter stages of Estranged Sisters. Extend that clarity consistently.

### Cross-cutting findings

| Finding | Evidence in current code | Player consequence | Priority |
|---|---|---|---|
| Cooking has inconsistent entry paths and tutorial state | `handleFireplaceTea` sets the tutorial flag before attempting to cook; `handleRecipeTeaching` also sets it on the introductory dialogue. The book has a separate near-Mum tea branch that adds an item directly. | Hearing instructions, attempting an action, and successfully learning a skill are conflated. Different paths can produce different progress. | P0 |
| Station rules are unclear | Recipe-book cooking calls `cookingManager.cook`; that method has no station/context argument. Fireplace has a separate interaction provider. | The reported confusion about cooking anywhere has a concrete architectural basis. | P0 |
| Current feedback differs from the issue report | Fireplace callback already calls `onShowToast(result.message, ...)`; normal cooking adds food to inventory. | Investigate timing/visibility and deployed version; do not assume no notification exists. | P0 investigation |
| Journal describes stages, not detailed objectives | `JournalContent` renders stage text and a percentage based on position in the stage array. | Collection counts, current seasonal requirements, and long waits are not explained by that percentage; branches make it especially misleading. | P1 |
| Cooking is outside the journal's chain list | Journal entries come from `EventChainManager`; cooking progression lives in `CookingManager`. | A major beginner activity lacks the same next-step view as story quests. | P1 |
| Cooking discourages changing interests | Mum asks players to master all three recipes in a chosen domain before switching; mastery threshold is three cooks per recipe. | At least nine successful cooks in a domain before switching via Mum is a substantial opening commitment. | P1 |
| Generic NPC markers are not quest-aware | `NPCInteractionIndicators` targets the shop counter; map-location mini-game indicators exist separately. | A nearby useful conversation or ready hand-in may be easy to overlook. | P1 |
| Proactive offers are bespoke | `useProximityQuestTriggers` handles Mr Fox and the ghost, and guards dialogue/cutscenes; it is not a general offer queue covering all interfaces. | Adding many similar triggers risks interruptions and competing popups. | P1 |
| Some narrative events describe actions rather than require them | Lost Kitten and Strange Lights branches can advance through choices/`next`; Harvest Festival uses choices and waits. | These are good story moments, but should not be counted as lessons in navigating, collecting, or using tools. | P2 |
| Two optional branches reference a different quest ID | Lost Kitten and Strange Lights require `witch_garden_quest`; the defined chain is `witch_garden`, and the chain requirement check uses the supplied ID. | Likely inaccessible witch choices. Verify legacy compatibility and correct before expanding branches. | P1 correctness |

Sources: [journal](../../components/book/JournalContent.tsx), [chain types](../../utils/eventChainTypes.ts), [chain manager](../../utils/EventChainManager.ts), [cooking manager](../../utils/CookingManager.ts), [book cooking](../../components/book/RecipeContent.tsx), [dialogue actions](../../utils/dialogueHandlers.ts), [fireplace action](../../utils/actionHandlers.ts), [interaction feedback](../../hooks/useInteractionController.ts), [Mum dialogue](../../utils/npcs/homeNPCs.ts), [NPC indicators](../../components/NPCInteractionIndicators.tsx), [proximity triggers](../../hooks/useProximityQuestTriggers.ts).

### Existing quest inventory and recommended treatment

All chain links below point to runtime content, not the older planned stories. Difficulty labels are this audit's design judgement, not measured player performance.

| Chain | Current route / demands | Main onboarding gap | Suggested treatment |
|---|---|---|---|
| Cooking with Mum (manager/dialogue, not YAML) | Fireplace introduction → choose domain → learn and repeatedly cook recipes → broader recipe sources | Station ambiguity; progress mismatch; commitment before sampling | Short tea lesson; explicit success; sample one recipe from each domain; retain mastery for advanced rewards |
| [Help Elias with the Garden](../../data/eventChains/gardening_quest.yaml) | Seasonal seed and delivery tasks across spring, summer, autumn; winter waiting | Generic active-stage text hides current task and completed seasons | Show this season's seeds, acceptable hand-in, quantities and completed seasons; separate a five-minute first planting lesson |
| [Fairy Bluebells](../../data/eventChains/fairy_bluebells.yaml) | Gardening progress + Good Friends with Elias → three forest gifts → seed | Friendship prerequisite and ingredient search span systems | Reveal prerequisite when relevant; track three deliveries; explain how to plant the reward and when to look for fairies |
| [Visit the Fairy Queen](../../data/eventChains/fairy_queen.yaml) | Meet fairies, build friendship, receive potion, visit oak at midnight | Growing, friendship, transformation, place and time compound | Distinct next steps and visible waiting state; reminder when visit becomes possible; potion recovery instructions |
| [Althea's Chores](../../data/eventChains/althea_chores.yaml) | Tea, homemade cookies, five cobwebs, return to Althea | Three objectives bundled together; homemade requirement needs explanation | Independent checkboxes, valid cooking credit, duster/control hint; let player do chores in any order |
| [The Witch's Garden](../../data/eventChains/witch_garden.yaml) | Three different crops in Juniper's garden, then pickled onions | Text says grow; handler counts harvests from the specific garden | Say “Harvest 3 different crops from Juniper's garden”; name counted varieties and remaining requirement; remove `witch_hut` from player prose |
| [Estranged Sisters](../../data/eventChains/estranged_sisters.yaml) | Letter → photograph of Althea → arrange reunion | Camera acquisition, photo capture and delivery add new controls | Add camera source and capture/hand-in guidance at the photo stage; retain the emotional story |
| [Mr Fox's Picnic](../../data/eventChains/mr_fox_picnic.yaml) | Spring/summer proximity offer → shed clearing → blanket → three different meals → basket delivery | Nine stages cross stamina, cleaning, cooking and inventory; permanent-decline storage exists | Present two chapters; explain rest and basket insertion; “Not now” remains resumable; show three distinct meal slots |
| [The Invisible Ghost](../../data/eventChains/ghost_queen.yaml) | Enter old house → ask about Nevarre → Mushra's book → return | “Ask around” is intentionally open, but a stuck player needs a recoverable lead | Keep mystery; record discovered lead from Mum to Mushra; optional stronger hint; clear hand-in action |
| [Davead's Secret Recipe](../../data/eventChains/davead_lava_cake.yaml) | Accept sandwich deal → cucumber and salmon sandwich → lava cake recipe | A simple request can hide recipe/ingredient dependencies | Link missing recipe and ingredients to known sources; expose remaining requirement without spoiling unexplored content |
| [Mushra's Wreath Workshop](../../data/eventChains/mushra_wreath_workshop.yaml) | Autumn days 1–7 village workshop; 23 materials across four types; decorate four houses | Too much collecting for a first creative reward; availability pressure | Keep as later community project; give a small all-year wreath introduction first; show material/house counters and out-of-season guidance |
| [The Lost Kitten](../../data/eventChains/lost_kitten.yaml) | Village-well proximity and narrative choices | Promises care/search mainly through text | Add one real conversation or care interaction before resolution; avoid chores for every branch; verify witch gate |
| [Strange Lights in the Forest](../../data/eventChains/mysterious_lights.yaml) | Deep-forest tile discovery; brave/cautious/witch branch | “Investigate” can resolve as prose; cautious branch waits two days | One optional observable investigation; explicitly mark waiting; verify witch gate |
| [Autumn Harvest Festival](../../data/eventChains/autumn_harvest_festival.yaml) | Seasonal trigger; choose celebration theme; timed stages | A cooking competition is described, not a cooking challenge | Use as an invitation hub to real cooking/carving/decorating activities; keep story-only participation valid |
| [Strength Trial](../../data/eventChains/wizard_trials_strength.yaml) | After Test of Wits; six boulders; stamina challenge | Remaining obstacles and exhaustion/reset rules need visibility | Show six-boulder progress and rules at entry; preserve advanced challenge |
| [Test of Patience](../../data/eventChains/wizard_trials_patience.yaml) | After mine-cart victory; grow magic bean; exits unlock at maturity | Poetic description does not teach the required interaction or indicate healthy progress | Optional plant/water clue, growth status, explicit exit rule; do not send a trapped player to another quest |

## Proposed player experience

### First session: a choice of small successes

Timing below is a playtest target, not a measured duration. Offer the first activity immediately, allow skipping, and aim for a mini-game encounter within 10–15 minutes. Do not require finishing tea to access every other starter.

- **Home, roughly 0–5 minutes:** Mum offers a practical tea lesson. One highlighted object at a time, visible ingredient pickup, successful cup, acknowledgement. Reward: a recipe and a choice of village invitations.
- **Village, roughly 5–10 minutes:** show two or three invitations: help Elias, make something creative, or try an adventure practice activity. Players can accept several and change focus.
- **First reward, by roughly 10–15 minutes:** play a small creative activity or an adventure practice course. Participation/completion earns the introductory reward; a high score is optional.
- **Following sessions:** introduce growing, gifting and recipe dependencies; later connect cooking, gardening and friendship to fairies, Juniper, community events and full Wizard Trials.

Progression should be: **one action with help → two linked actions → choose an order → combine two systems → solve a mystery or master a challenge**. Clear instructions remain available at every level; solutions to advanced puzzles stay optional.

### World and dialogue first, UI in support

This is the guiding presentation rule for every onboarding and discovery change. First let the player **see something interesting**, then let a character **make it meaningful**, then provide a small **actionable invitation**. The journal and other UI remember the encounter and help the player follow through. Do not put the burden of discovery on reading a menu or accepting a list of tutorial tasks.

Use the game's existing hand-drawn style, expressive portraits, NPC gestures, props, short animations and environmental changes. A scene can be very small: a child holding a carved pumpkin, tracks crossing a snowy path, or Mum turning towards a steaming kettle. Avoid requiring a long cutscene for every introduction.

| Activity | Visual story in the world (proposed) | Short dialogue invitation (example) | Supporting UI |
|---|---|---|---|
| Tea | Mum gestures towards the fireplace; tea supplies sit together; steam appears after brewing | “Let's make a cuppa. The leaves and milk are on the shelf. I'll show you the fire.” | Label the current target when nearby; confirm supplies/cup gained; remember the next step |
| Skiing | Ski tracks cross the winter forest entrance; a skier passes with a bundle of firewood | “Much quicker on skis! I found this wood further down the trail. Mr Fox sells a pair if you fancy a go.” | Optional shop direction; owned-skis invitation offers **Go Skiing**; journal remembers the lead |
| Lava Leap | Cinder demonstrates a crystal making a safe stepping stone beside the passage | “See what Frost can do? Come and try. Learn the crystal paths and I'll open the way deeper.” | A direct **Try Lava Leap** response; unobtrusive controls and checkpoint feedback inside the game |
| Pumpkin carving | The village child sits beside a pumpkin and displays a finished lantern | “I'm making faces for the village! Would you like to carve one too?” | Show pumpkin requirement only when relevant; offer a starter pumpkin through dialogue; confirm where the creation went |
| Wreath-making | Mushra weaves flowers into a wreath; a finished one hangs nearby | “These would look lovely on a door. Bring a few flowers and I'll help you make your own.” | Name the actual materials for the offered starter activity; show collected counts; remember the workshop location |
| Painting and crafting | A small display of villagers' pictures and decorations beside an easel | “There's room for yours. Would you like to paint, or make something for your room?” | Clearly separate the two actions; explain canvas/material needs and saving/placing at the point of use |
| Wizard Trials | Crate marks, a blocked doorway, then cart tracks provide a visible sequence | A guide or inscription hints at the next kind of challenge without solving it | Local action label, remaining boulder count and optional stronger hint; highlight the doorway briefly when it opens |

These scenes are proposed additions. Their placement, animation and dialogue must agree with actual availability and rewards. Where an NPC demonstration would be costly, a static prop plus an expressive dialogue beat is a valid first version. Do not advertise a demonstration as an interaction the player can perform unless that interaction exists.

**Give dialogue a practical job without making characters sound like help pages:**

- Establish why the character cares and what the player could enjoy or change.
- Offer one immediate action, then optional responses such as “Where can I find that?”, “How does it work?” and “Perhaps later”.
- Make follow-up dialogue acknowledge real progress: “You've got the milk—just the tea leaves now.” Avoid repeating the entire introduction.
- When the player asks for help, let the character point, demonstrate or describe a landmark before showing a route overlay.
- Let completed activities change a visible detail where feasible: a lantern on a doorstep, a wreath on a house, a picture on a wall, or an opened passage. Confirm success through the world as well as a toast.

**Keep helpful UI small, contextual and recoverable:**

- Default to a brief invitation bubble and a nearby object/action label, rather than a modal quest offer.
- The journal keeps the fuller checklist and remembered clues. The HUD shows a compact pinned reminder only when the player chooses to follow something; auto-suggest pinning for a first lesson rather than permanently filling the screen.
- Use a small journal update indicator when a clue is learned, a short named-item confirmation on pickup, and visible counts during a collection or hand-in task.
- Direction markers, target pulses and explicit step-by-step guidance appear on request or as an accepted hint. They fade when no longer needed. Avoid a permanent trail of arrows.
- Preserve the earlier one-expanded/two-alternative layout as the **expanded guidance view**, not mandatory always-visible HUD content. A quiet world view is the default.
- Provide text equivalents for visual clues, readable dialogue, touch-sized controls and reduced-motion alternatives. Critical instructions must remain recoverable if an animation, sound or speech bubble is missed.

**Review test:** For every feature invitation, identify its visual clue, character/story reason, dialogue action, and smallest useful UI aid. If the only discovery mechanism is a quest card, add a world encounter. If the scene is charming but the player cannot tell what to do, strengthen the invitation and contextual action. Test both together with new players.

### Shared “what next?” presentation

Extend the journal with a compact card for each accepted activity:

> **A First Cuppa — Make tea with Mum**  
> Next: Use the fireplace in Mum's kitchen.  
> Tea leaves: 1/1 · Milk: 1/1 · Kitchen fireplace: nearby  
> **Show me** · **Pin** · **Ask Mum for a hint**

The example quantities are proposed tutorial quantities; reconcile them with recipe data during implementation.

- Track any number of accepted quests; in the expanded guidance view, display one expanded pinned task and at most two compact alternatives. Keep the default HUD reminder small and optional. The display limit must not cap active quests.
- Use **Ready to do**, **Ready to hand in**, **Waiting**, and **Finished** states. Keep player pin choice stable when another quest advances.
- Replace stage-array percentages with meaningful counts and chapter labels. Do not claim a branch is 80% complete because its stage happens to be near the end of a file.
- Separate “collect”, “make”, “carry” and “deliver”. Historical actions stay checked after items are used; possession and delivery requirements show their own current state.
- “Show me” points to the next known exit or nearby target, not a perfect route through unexplored/procedural maps. Store semantic destinations/NPC identity rather than yesterday's generated coordinates.
- Explain blockers: “Come back at midnight”, “Harvest this in summer”, “Ask Mum for the cookie recipe”. Offer an available alternative where leaving is possible.
- Make offers resumable. “Not now” postpones; any permanent refusal needs wording that clearly describes that consequence.
- On returning after a break, offer a short recap of the pinned quest, progress and next step.

### Proactive NPCs and events without constant interruption

Use short speech bubbles, gestures and journal invitations before forced dialogue. Examples: Mum waves towards the fireplace; Elias points out a ready crop; the village child holds up a pumpkin; a guide demonstrates one safe jump.

Queue offers centrally. Only one appears at a time; defer during dialogue, books, inventory, cutscenes, mini-games, transitions and recovery. Initial tuning proposal: no repeated offer within five minutes of active play, and no repeat after “Not now” until another session or a relevant world change. Do not measure inactivity while paused or reading as being stuck.

Hints have three levels: a gentle reminder, a named place/person, then an explicit action/control. Offer the next level after repeated unsuccessful interactions or a few minutes of active searching, and always allow manual requests. Never reveal a puzzle solution merely because time elapsed.

Use a soft pulse and a text label rather than rapid flashing. Keep controls readable and tappable on iPad; offer reduced motion. Distinguish “new request”, “current target” and “ready to hand in” with shapes/labels as well as colour. Prefer deterministic authored help for authoritative requirements; AI conversation must not invent completion rules.

## Cooking: proposed resolution of issue #151

### What the audit establishes

The report is credible evidence of confusion, but its exact failure has not been reproduced. Current source hides starter recipes from the normal unlocked recipe list and omits a tea chapter, while retaining a near-Mum book handler that directly grants tea without normal cooking progress. That branch is evidence of inconsistent logic, not proof that it is reachable in today's UI. The fireplace already emits a toast. Compare the affected deployed build and save with a fresh save before identifying the precise bug.

The tutorial flag is currently set on the introductory dialogue and before the fireplace cook attempt, so it cannot reliably mean “successfully made tea”. Mum stands at `(7,5)` and the fireplace interaction targets `(4,5)` in the kitchen; inspect real touch targets and artwork before deciding whether moving Mum fixes the reported obstruction.

### Recommended cooking rule

The book can be read anywhere. Cooking requires a compatible station. In Mum's small kitchen, being in the same room is sufficient for fireplace tea; outdoors use a nearby station radius. Model station availability alongside ingredients, but do not consume it as an item. The book explains “Needs a kitchen fireplace” and offers directions when unavailable. Preserve intentional portable/no-heat recipes by declaring explicit preparation requirements rather than accidentally allowing all cooking everywhere.

All valid entry points use the same recipe validation, ingredient consumption, result, progression and notification path. Check requirements before spending stamina or ingredients. A successful brew counts regardless of which allowed button started it. Do not tell players to cook another cup solely because a tutorial flag was missed.

### A First Cuppa: concrete proposed quest

| Step | Player action | Feedback / completion rule | Recovery |
|---|---|---|---|
| Accept | Ask Mum to teach cooking, or accept her invitation | Journal creates the lesson; fireplace receives a labelled soft highlight | Skip or resume later |
| Gather | Pick up a tutorial portion of tea leaves and milk from labelled supplies | Item name, quantity and inventory confirmation; checklist updates | Supply missing starter ingredients if lost before first success; do not grant an unlimited sellable bundle |
| Brew | Tap fireplace, use interaction key, or choose tea in the book while in the kitchen | Shared cooking operation succeeds; exactly one ingredient deduction and one cup; “Tea made — in your bag” | Missing requirement names what and where; failed attempt spends nothing |
| Acknowledge | Return to Mum, or see her nearby response | Mum recognises successful cooking; journal records lesson complete | Credit surviving prior successful-cook history; do not infer cooking skill solely from bought/gifted tea |
| Choose | Pick a savoury, sweet, or baking taster, or leave for another activity | A clear next recipe and ingredient sources; creative/adventure invitations remain available | Change interests without losing progress |

After a first success, let players sample the three cooking domains. Keep three-cook mastery for advanced recipes, quality improvements and optional badges; remove it as a prerequisite to trying another domain. Review downstream course-completion gates individually so a small starter reward does not accidentally unlock the entire advanced catalogue. Retain earned unlocks on existing saves.

## New short quests and mini-game rewards

The release notes above track what has shipped (tea repair, kitchen painting and the Crate Trail puzzle sampler). Remaining rows describe proposals; avoid building a new tutorial chain for every control.

| Proposed quest | What the player actually does | Teaches / signposts | Reward and reuse | Scope |
|---|---|---|---|---|
| **A First Cuppa** — Mum, 3–5 min | Gather supplies, make tea, receive acknowledgement | Interact, inventory feedback, recipes, next-step card | First recipe plus optional invitations | Existing systems; repair and small chain |
| **A Picture for the Kitchen** — Mum/child, 5–8 min | Visit a clearly placed communal easel, draw, save, display | Follow a destination, interact, make and place an object | Painting mini-game and a keepsake; provide a first canvas because saving has its own requirement | Existing mini-game; new accessible easel placement and starter supplies |
| **One Little Plot** — Elias, 4–6 min of active play | Plant one supplied seasonal seed, water, inspect growth | Tools, growth and waiting; then explicitly choose another quest | Immediate creative invitation; later harvest reward without blocking the invitation | Existing farming; winter substitute is watering a protected demonstration planter, which needs new support |
| **Mushra's Tiny Wreath** — village invitation, 5–8 min | Collect two clearly identified nearby materials, visit workshop, arrange a wreath | Foraging, counts, crafting | Existing wreath mini-game with enough starter materials to complete; keep full autumn workshop as later project | All-year newcomer host/location needs implementation; do not assume forest Mushra is nearby |
| **The Delivery Mix-up** — village child, 5–8 min | Deliver one labelled parcel, then help clear a small crate route | NPC hand-in, interaction and undo/reset | Beginner version of Test of Wits | Reuse puzzle engine; new village practice entry and simple level |
| **A Guide's First Leap** — visiting mine guide, 5–8 min | Meet guide, practise movement/checkpoint, finish one short route | Movement mini-game controls and safe retries | Lava Leap practice, then a lead towards the real mines | Existing game; new practice course/entry and independent progress rules |
| **A Pumpkin for a Friend** — child, autumn, 3–5 min | Accept a donated starter pumpkin, carve it, display it | Start/finish creative activity; spend an item knowingly | Existing pumpkin carving, no harvest wait for first try | Seasonal optional variant; use painting/wreaths outside autumn |
| **Borrowed Skis** — winter guide, 5–8 min | Borrow skis, go to an eligible forest, use the inventory action | Equipment and contextual actions | Existing skiing with a short introduction | Seasonal optional variant; loan/recovery logic is new |

Do not claim the mini-games are all presently available in the village. Current access is: painting/crafting through a placed easel; wreaths through Mushra or a crafting table; pumpkin carving through the village child in autumn with a pumpkin; skiing via skis' inventory action in a winter forest; Test of Wits and Lava Leap through Wizard Trials locations (Lava Leap also has a guide-name trigger); mine-cart agility after Strength Trial. See [registry](../../minigames/registry.ts) and its linked definitions.

Practice rewards must be separate from main-story victories. A village crate puzzle must not advance Wizard Trials, and a practice jump must not unlock late-game travel or equipment. Keep full trials, longer courses, combat encounters and mastery rewards as reasons to progress. First-session fun should not depend on reaching a rare generated location.

## Feature discovery: clear routes to everything already in the game

**Scope added following review:** A good quest journal is insufficient if a player never discovers skiing, Lava Leap, pumpkin carving or wreath-making. The goal is coverage of existing features, not simply more quests. Prefer a well-timed clue, NPC demonstration, sign, shop recommendation or contextual action when that is enough. Reserve a quest for activities that benefit from several guided steps.

Every feature needs a route through **notice → understand the appeal → obtain requirements → reach the activity → start → understand the result → return later**. A help page or item tooltip alone does not cover that route: it helps only after the player knows what to look for.

### Worked example: skiing in winter

**Verified current route:** Skis cost 150 in the General Store, with unlimited stock and no seasonal restriction on that shop entry. Their item description says to select them in a winter forest. The inventory action is **Go Skiing**; `App.tsx` allows it in winter on maps whose IDs start with `forest`, or on `deep_forest`. The introduction explains travelling deeper, stopping to explore, steering, boosting and collision hazards. Runs award collected firewood; a crash returns the player to the forest entrance with a quarter of the wood, rounded up. This is useful exploration and gathering as well as a score challenge—but most of that appeal is explained only after launching the game.

Sources: [shop inventory](../../data/shopInventory.ts), [ski item](../../data/items/toolsAndMaterials.ts), [inventory action](../../utils/inventoryActions.ts), [launch checks](../../App.tsx), [ski introduction](../../minigames/skiing/SkiingHud.tsx), [run results](../../minigames/skiing/SkiingGame.tsx).

**Proposed discovery sequence:**

1. On the first eligible winter forest visit before trying skiing, show ski tracks and a small invitation. Example: “Those tracks lead deep into the woods! Skis let you race down the trail and collect firewood. Mr Fox sells them at the village shop.” Tracks/guide placement are new content, not current features.
2. If the player has no skis, offer **Find skis**, **Tell me more**, and **Not now**. Save “Winter skiing” as a journal opportunity if requested. Show the actual shop price from item/shop data, not a separately maintained number in dialogue.
3. At the shop, connect the item to that opportunity: “For winter forest trails — collect firewood and stop to explore.” If the player cannot afford skis, explain an available earning route. An optional first-run loan can remove the money barrier, but requires new loan/recovery rules; it is not an existing source of skis.
4. On acquiring skis, say where and how to use them. On returning to an eligible forest, show **Go Skiing** directly in the invitation, backed by the same eligibility check as inventory. Also teach the inventory action so the player can launch future runs independently.
5. If the player already owns skis on first winter entry, skip the shop instructions. If they have tried skiing before, use a small seasonal reminder rather than replaying the lesson. If winter begins while the player is already in the forest, evaluate the opportunity then too.
6. After the first run, clearly show firewood gained, current destination and **Try again / Explore here**. A tumble counts as having discovered the activity; do not require a high score to end the introductory guidance.
7. Outside winter, keep the discovered activity visible as “Winter activity”, with the season requirement. Do not repeatedly prompt an unavailable action or send the player to buy replacement skis they already own.

**Acceptance:** A player arriving in a winter forest without skis can explain why skiing is worth trying, where skis come from, and how to start after obtaining them. A player with skis can launch from the clue without hunting through menus. The clue survives dismissal through a recoverable journal opportunity and does not repeat on every forest transition.

### Every registered mini-game: proposed discovery coverage

The registry currently contains ten definitions, including two combat encounters sharing one component. Existing routes below are source-confirmed entry points; proposed invitations and shortcuts require implementation. Unlocking or recommending a feature must not bypass its intended story gate.

| Existing activity | Existing entry / barrier | Proposed timely clue and reason to try | Route to first use and repeat use |
|---|---|---|---|
| **Skiing** | Buy skis; winter forest; inventory action | Winter forest arrival: tracks/guide explain speed, firewood and deeper exploration | State-aware shop lead or direct start; retain inventory route and seasonal journal opportunity |
| **Lava Leap** | Cinder the Guide interaction, or Wizard Trials map location | On reaching Cinder's area, point out the crystal demonstration: “Learn crystal powers and open the way deeper.” Earlier mine rumours can create anticipation without promising immediate access | Give **Play Lava Leap** from Cinder's conversation as well as the interaction menu; show how to return to Cinder; preserve the real expedition completion gate |
| **Pumpkin carving** | Village child; autumn; one pumpkin consumed on completion | First autumn village visit: child displays a carved pumpkin and invites the player to make one | Offer a starter pumpkin or specific grow/acquire instructions; show requirement count and consumption timing; return to the child to carve again; outside autumn show when it returns |
| **Wreath-making** | Mushra in mushroom forest, or a placed crafting table; all year | First useful flower/forage collection or encounter with Mushra: show a sample wreath and explain making a decoration | Give a specific route to Mushra/a known table and enough material guidance for one creation; distinguish this all-year activity from the autumn workshop quest |
| **Painting** | Placed easel; saving checks canvas separately | First home/village creative invitation: a displayed painting suggests making one for the player's room | Proposed communal easel and first canvas avoid an equipment purchase before sampling; explain saving and placing; record known easel location |
| **Decoration crafting** | Also launched from an easel | At first easel use, visibly offer **Paint a picture** and **Craft decorations** as distinct choices | Preview one achievable recipe and its missing materials; explain where the result goes and how to place it; both actions remain available on return |
| **Test of Wits** | Floating-door location in Wizard Trials, a rare special lava location | Mine/guide hint advertises a puzzle challenge; at the door, a crate motif and clear action identify it | Signpost the route as regions are discovered; explain pushing/resetting at entry; optional village practice is separate from completing the real trial |
| **Test of Agility (mine cart)** | Strength Trial doorway, available after all six boulders are cleared | Tease cart tracks on entering the chamber; explicitly say the blocked passage leads to a cart challenge | Celebrate the last boulder and highlight the newly available doorway; present steering/retry controls; explain replay/reset rules without silently skipping earlier trials |
| **Goblin confrontation** | Interaction with a Goblin, matched by NPC name | Nearby mine warning/guide makes the encounter legible before the player accidentally starts it | Clear **Confront** choice, controls and consequences; explain any passage opened by this encounter after victory; decline/return remains understandable |
| **Umbra Wolf confrontation** | Interaction with an Umbra Wolf, matched by NPC name | Forest tracks or an NPC warning introduces the challenge and gives a reason in its story context | Clear optional confrontation entry and preparation advice; verify its encounter-specific reward before promising one; explain recovery and return |

Cinder already has good explanation of crystal powers and the deeper-passage reward. His current “How do I start?” response instructs players to close the conversation, interact again, and select Lava Leap. The opportunity here is to expose that invitation earlier and remove the extra menu discovery step, rather than rewrite useful existing dialogue. Source: [Cinder](../../utils/npcs/mine/lavaLeapGuide.ts).

For wreaths, never imply the player must finish the four-house autumn project to try the all-year mini-game. For pumpkins, never send a new player to wait for a harvest without explaining that delay and giving them something else to play. For any reward that requires saving, placing or collecting the result, teach that final action; entering the mini-game alone is not successful onboarding.

### Coverage beyond the mini-game registry

Build and maintain a feature-route inventory alongside implementation. The following is an initial coverage checklist from components, interaction providers and current systems, not a claim that every feature has been playtested. Each row must be split into distinct activities where requirements or entry routes differ.

| Feature family to cover | Appropriate discovery moment | Required route to document and verify |
|---|---|---|
| Farming and communal/NPC gardens | First garden visit, seasonal seed offer | Tools → eligible plot → plant/water → recognise growth → harvest/hand in; explain shared plot rules where relevant |
| Foraging, berries, fruit, leaf piles and water interactions | First nearby eligible resource | Recognisable interactable → available action → inventory/tool feedback → practical use for collected resource |
| Cooking, recipe teachers and cookbooks | First kitchen visit, recipe milestone, useful ingredient | Teacher/book → recipe requirements → suitable station → output → next recipe; each source has a visible lead |
| Friendship, gifts and NPC conversations | First meaningful meeting or liked-item opportunity | Explain gift action and relationship feedback; later point towards friendship-gated stories without revealing every secret |
| Fairy form, magic and brewing | Relevant fairy/Juniper story milestone | Reward item/recipe → use controls → destination/station → effect and expiry/recovery → next magical activity |
| Photography and photo album | Scenic encounter or before a photo-dependent quest | Camera source/cost → film requirements → capture → album → use/deliver photo; avoid a quest that introduces an unexplained expensive tool |
| Decorating, furniture, catalogue and wallpaper | First crafted decoration or home improvement invitation | Obtain → place/use → move/recover; distinguish catalogue browsing from buying and item ownership |
| Clothing, mirror and appearance changes | First relevant item or mirror visit | Acquisition → wear/change action → visible result → change again |
| Rest, sleeping and stamina recovery | First low-stamina event near an available rest point | Identify bed/seat → rest → feedback and stopping; connect this to blocked activities |
| Desk/diary, bookshelf, encyclopaedia and memories | First useful entry or discovery | Introduce the particular book/tool in context → open it on touch and keyboard → find the relevant page later |
| Seasonal play and celebrations, including snow angels, harvest feast and Yule | Relevant season/day/weather or village arrival | Invitation → actual place/action → current requirements → reward/participation → missed-event or next-availability explanation |
| Mines, forest exploration, special locations and treasure | Newly accessible area, discovery or story clue | Show a reachable first lead, preparation and return route; preserve exploration without depending entirely on random discovery |
| Multiplayer greetings, gifts and shared activities | Another player is present and service is available | Contextual action → result/receipt → distinction between personal and shared progress; do not advertise unavailable online features |

Cross-check this inventory against [interaction providers](../../utils/interactions/registry.ts), [mini-game registry](../../minigames/registry.ts), [inventory actions](../../utils/inventoryActions.ts), shop inventories, map entrances, seasonal managers, book sections and player-facing modals. Record a status for every activity: **route verified**, **route exists but poorly signposted**, **missing route**, or **not yet audited**. Do not label an activity “covered” merely because an item or menu entry exists in code.

### Delivery and acceptance changes

Move discovery of **existing** skiing, Lava Leap, pumpkins and wreaths into the first feature-discovery milestone alongside journal guidance. New practice courses remain useful, but should follow simple invitations and clearer launch routes to content already playable.

For each activity, keep one small implementation record: discovery trigger, authored invitation, appeal/reward, prerequisites and their sources, destination, exact start action on touch/keyboard, result feedback, replay route, blocked-state message, evidence/test date. Reuse runtime requirement checks for recommendations so a clue cannot disagree with the actual launch rules.

Test the journey starting **before the player knows the feature exists**. Cover missing/owned equipment, affordable/unaffordable requirements, active/inactive seasons, declined invitation, reload, already-completed introduction and multiple competing offers. In a short observed session, ask: “What could you do here?”, “Why would you try it?”, and “How would you start?” Do not prime the player by naming the hidden feature first.

The completeness gate is a reviewed route for every player-facing activity, with explicit unresolved rows. The engagement target is that new players encounter several appealing, currently reachable choices naturally; it is not that everyone must play every feature or be shown a screen full of spoilers.

## Multiplayer discovery: the village remembers what players do

**Additional design requirement:** Other players' achievements and contributions should make the world feel active when someone returns, and provide useful leads into their own adventures. Shared progress can reveal a possibility, provide advice, or change an explicitly shared part of the world. Reading about another player's success must not mark the reader's personal quest complete.

### Existing foundation and gaps

The game already has `SharedWorldEvent` records in Firestore, a `GlobalEventManager`, automatic quest-completion publication, YAML stage/choice event publication, and rare-forage discovery publication. Recent event descriptions are included in NPC conversation context. Shared farming, placed items and multiplayer battles also have their own state/synchronisation systems; a news feed must describe those systems' real changes rather than replace them.

The current event cache fetches the latest 50 events with a five-minute TTL. The normal read returns event data without document IDs. Writes use generated document IDs and server timestamps and may fail or be rate-limited. These are useful foundations, but do not yet provide a durable “since your last visit” cursor, guaranteed milestone deduplication, recipient-specific hints or a complete activity history. A quest's final stage can publish a story event as well as the automatic completion event, so summarisation must avoid announcing the same achievement twice. Some completion display-name mappings use older quest IDs and need reconciliation.

Sources: [global event manager](../../utils/GlobalEventManager.ts), [shared event service](../../firebase/sharedDataService.ts), [event schema](../../firebase/types.ts), [quest publication](../../utils/EventChainManager.ts), [rare finds](../../utils/forage/helpers.ts), [dialogue context](../../components/dialogue/UnifiedDialogueBox.tsx). Example events in `data/exampleGlobalEvents.ts` are development templates, not proof that those achievements are currently detected.

### “While you were away”: a small village news flash

At a safe moment after returning to the game, offer a short illustrated **While you were away** recap, styled as a village notice or postcard. Show at most three varied highlights, with **Read village news**, **Follow this lead**, and **Later**. It should be easy to dismiss and reopen from the journal or a proposed village noticeboard. Use pictures of the relevant plant, dish, activity or changed place; avoid a large modal blocking the first movement or a stream of achievement toasts.

Illustrative headlines, populated only from actual recorded events:

- “A neighbour cooked their first dish. Mum has been sharing kitchen tips.” → Ask Mum about cooking.
- “Someone tried the winter trails and brought back firewood.” → Find skis at the shop, or start skiing if already equipped and in the right place.
- “A new wreath is hanging in the village.” → See the actual decoration if it is still present, then learn where to make one.
- “A neighbour discovered Cinder's crystal challenge.” → Follow a mine lead appropriate to the reader's current access.

Show an in-game identity where appropriate, with “A neighbour” as the fallback; avoid turning the recap into a competitive ranking. The news should celebrate small first steps as well as advanced accomplishments. A beginner's first tea is worth sharing even when someone else has finished the Wizard Trials.

The recap introduces the lead; characters and scenery carry it into the world. Mum comments on the cooking milestone, Elias admires a successful harvest, and Mushra points out a new wreath. A relevant NPC can offer “Could you teach me too?” and “Where can I try that?” A subtle journal update remembers the answer. When an event has no actual shared visual outcome, use a notice or dialogue—do not fabricate a planted crop, placed wreath or opened door.

### Milestones that produce useful clues

Publish a small set of meaningful firsts and exceptional outcomes, not every action. All rows below are proposed event coverage unless already stated above.

| Milestone | Evidence required | What another player can learn |
|---|---|---|
| First successfully grown/harvested plant | Real harvest/growing state, attributed to the player whose action qualifies | Elias can explain seeds, watering and the relevant garden |
| Noteworthy gardening achievement | A defined existing measurement, such as a first harvest of a crop type or completed seasonal task | Name the plant and an appropriate growing tip/source; if “good quality” has no actual game metric, do not invent one |
| First cooked dish; first cook of a selected new recipe | Successful cooking transaction and recipe identity, not possession of purchased food | Recipe teacher/station and one achievable starting lead |
| First successfully brewed potion | Successful brew result and recipe identity, not a gifted potion | A beginner hears a rumour about learning magic; an apprentice gets an actionable brewing lead |
| First mini-game discovery/attempt | First actual encounter or launch, explicitly distinguished from winning | Where to meet its host and why the activity is interesting |
| First mini-game completion | Successful result from the real activity; practice flagged separately | Celebrate the achievement and explain the reader's own available route |
| Quest chapter or discovery | Selected meaningful stage transition, rather than every internal flag | A spoiler-filtered story lead suited to the reader |
| Visible shared contribution | Confirmed shared placement, garden change or other durable contribution | See what changed and where; recognise the contributor without awarding personal quest credit |

Define discovery precisely per activity: meeting Cinder may reveal Lava Leap; launching it records trying it; finishing a real route records completion. Do not announce a victory from opening its menu, or count a practice course as a full trial. Where a crop belongs to a shared plot, use existing ownership/contribution rules for attribution rather than assuming that planter, waterer and harvester are the same person.

### Helpful shared progress, personal accomplishment

Keep three things distinct in the design and data:

1. **Personal progress:** learned recipes, completed lessons, quest steps and individual rewards. These advance through the player's qualifying actions.
2. **Shared world state:** real communal plots, placed decorations, explicitly shared passages or event contributions. These follow each feature's established multiplayer rules.
3. **Shared knowledge:** news, rumours, hints and activity invitations unlocked by knowing what others have done. These may add a journal lead or an NPC response, but do not award items, learned recipes, quest stages or achievement credit by themselves.

For example, another player's successful garden can prompt Elias to explain a useful seed. Their potion can reveal that brewing exists. Their wreath can point towards Mushra. Their shared battle may already have opened a passage under existing multiplayer rules, but the returning player still needs accurate personal objectives. Where shared state removes an obstacle that a personal quest expected, define an alternate qualifying action or observation explicitly; avoid leaving that player stuck or silently claiming they performed someone else's action.

### Relevant clues, not spoilers or dead ends

Resolve each event into guidance using the **reader's** season, equipment, known locations and quest access. The same skiing milestone should offer an equipped winter player a launch lead and a summer player an optional “Try this in winter” reminder. A late-game potion should create intrigue for a newcomer without naming an unrevealed character or spoiling a quest ending.

Rank events by useful new opportunities, relevance to accepted quests, visible nearby changes, recency and variety. Group repeated milestones (“Three neighbours have tried skiing”) and combine duplicate chapter/completion announcements. Prefer other players' news in the return recap; the reader's own milestones can live in personal history. Give useful events a followable destination or NPC, but use semantic places and present-day availability rather than stale coordinates in yesterday's procedural forest.

“Follow this lead” records an opportunity and optional pin. It does not accept a quest, initiate combat, spend an item or open a mini-game without the player's next deliberate action. Existing local discovery routes remain available when nobody else has reached a milestone, so a quiet server never blocks onboarding.

### Delivery mechanics to plan before implementation

- Extend the existing event model with a stable milestone kind/key, subject ID (recipe/crop/activity/quest), event ID, story visibility requirements and optional reference to a real shared change. Prefer authored templates plus structured fields to interpreting free text as quest logic.
- Deduplicate durable publication by player/character, milestone and subject (plus season/year only for deliberately recurring achievements). Decide that scope explicitly. Use idempotent writes or equivalent server enforcement; rate limits and local flags alone cannot prevent duplicates across reloads and devices.
- Record milestones only after the qualifying action commits. Introduce missing cooking/brewing/mini-game success hooks at their shared authoritative result paths, not in display components. Keep local play successful if news publication fails; persist a bounded retry queue for eligible milestones and deduplicate retries.
- Use server timestamps and a stable event-ID tie-breaker for paginated reads. Store a per-reader recap watermark through character/account persistence as appropriate, plus unread/deferred news state. Do not rely on the device clock or merely fetching the latest 50 records.
- Capture a session boundary after authentication/sync succeeds. Fetch between the previous acknowledged boundary and that boundary so live arrivals do not reshuffle the recap. Mark displayed highlights as seen when presented; retain a deferred batch when **Later** is chosen. Advance the processed cursor only after retaining or processing the fetched range, with a clear distinction between read and deferred items.
- On first login, show a small recent selection labelled **Village news**, not “since your last visit”. On a long absence, summarise with pagination/retention limits and make “recent highlights” explicit if older history is unavailable. A failed fetch is “news unavailable”, not proof that nobody played; do not advance the cursor on failure.
- Re-fetch on reconnect/auth restoration and appropriate session entry. Share the same filtered event interpretation between recap, scripted NPC gossip and journal leads. AI may add flavour, but authoritative directions and unlock rules remain authored and state-checked.
- Use the existing game's shared-event audience; if multiple worlds/groups are introduced, scope events and cursors to the same world as gameplay. Validate event kinds, attribution and payloads in the shared write path/rules. Use in-game names or an anonymous neighbour label for the player-facing recap rather than blindly exposing an account display name.

### Multiplayer milestone and acceptance gate

Add a delivery slice after reliable personal next-step guidance: **village news + four milestone families** (gardening, cooking, brewing and mini-game discovery). Include a recap, an NPC follow-up for each family and at least one real shared visual-change reference. Expand to more story chapters after verifying relevance and spoiler rules. This is part of the feature-discovery scope, not an optional analytics dashboard.

Test with two accounts and a reconnect/reload:

- Player A completes a qualifying first; Player B returns and sees one relevant, correctly attributed highlight with a useful lead.
- B can follow that lead through dialogue into their own activity; none of B's personal completion flags or rewards advance just from reading it.
- Duplicate publication, repeated cooking, two tabs and reconnect retries do not flood the recap. A visible change is described only if its shared state supports it; stale changes are labelled as past activity.
- An advanced achievement produces a safe rumour for a beginner and a concrete lead for an eligible player. Seasonal and equipment blockers are explained.
- **Later**, interrupted login, multiple devices, timestamp ties, more than 50 new events and unavailable Firebase preserve sensible unread behaviour. Existing single-player invitations still work offline.
- In playtesting, a returning player can identify something another player did, explain why it interests them, and name a next action—without being forced through a news screen or having their own quest completed for them.

## Implementation approach

### Extend current systems

Add a quest presentation layer over existing authoritative state. Initially adapt cooking and a few handlers rather than rewriting all quests into a new engine.

Each objective needs: stable ID, action text, target identity, current/required amount, completion evidence, availability/blocker, optional hint levels, and a reward preview. Display counts should come from inventory for possession, recipe history for cooking, and handler metadata for deliveries/harvests. Do not persist a second conflicting copy of the same count.

The current YAML objective type only supports `go_to`. Extend types and loader validation deliberately for new objective kinds, or add typed per-chain adapters first. Recommended first slice: adapters for cooking, seasonal gardening and Althea; generalise once those different requirements work. Make journal cards, NPC reminders and markers consume the same computed next-step view.

Use existing EventBus updates for inventory/quest/cooking/availability changes. Avoid adding a per-frame React scan of every quest. Store pin, dismissed invitations and tutorial milestones through the existing character persistence path, with safe defaults for old saves. Personal quest credit stays personal in multiplayer; shared world activity must not accidentally finish another player's tutorial.

Handle queued choices explicitly: `useEventChainUI` currently holds a single popup. Ensure dismissing or deferring a choice leaves it recoverable in the journal/NPC conversation, and simultaneous quest events do not overwrite an unresolved choice.

### Delivery order and acceptance gates

| Phase | Deliverables | Done when |
|---|---|---|
| **0 — Establish the first-session baseline** | Reproduce #151 on fresh and affected saves if available; observe keyboard and iPad; record tea entry paths, UI feedback and current first-mini-game time | Exact reproduction or a clearly documented unresolved case; screenshots of relevant touch targets; no root-cause claim based only on stale code |
| **1 — Reliable tea lesson (P0)** | Shared cooking path; explicit station rule; success-based lesson credit; useful feedback; safe starter recovery; touch target fix if verified | A newcomer can make tea and have Mum recognise it without duplicate milk spending; invalid attempts spend nothing; reload preserves credit |
| **2 — Three clear parallel activities (P1)** | Journal cards/pinning; cooking, gardening and Althea adapters; offer queue; basic NPC readiness markers; cooking taster flexibility | Three active lines survive switching/reload; every visible task names an action or blocker; opening books/mini-games defers offers |
| **3 — Early fun (P1)** | Ship Picture for the Kitchen and one adventure practice quest; Tiny Wreath next; first-session invitation choice | At least one all-season creative route and one all-season adventure route reach playable rewards without advanced quest completion; practice cannot advance main trials |
| **4 — Retrofit the remaining chains (P2)** | Ingredient/location/time hints, hand-in counters, seasonal recovery, mystery hint ladders; repair incorrect gate references earlier if confirmed | All inventory-table chains have reviewed next steps, recovery and dependency checks; hard puzzles remain hard by default |
| **5 — Tune with players** | Small observed sessions, revise wording, hint timing and quest lengths | Meet the player outcomes below across keyboard and touch; repeat only the scenarios affected by revisions |

Phases 1–3 are the recommended initial milestone. Full navigation overlays, voice acting, a new quest engine, and new standalone mini-game engines are outside that milestone. Effort should be estimated after the reproduction and adapter spike; current timings above refer to intended player experience, not engineering estimates.

## Validation and player outcomes

For implementation, prioritise behavioural checks over snapshotting dialogue text:

- All allowed tea entry paths produce the same item and credit exactly once; failure, cancellation and repeat interaction do not spend duplicate ingredients. Starter replenishment cannot become repeatable farming income.
- Fresh save, old tutorial-flag-only save, existing cooking history, bought/gifted tea, full inventory, insufficient stamina and reload mid-step have defined outcomes.
- Switching between three quests preserves objectives and the pinned choice; an item needed by two quests is not consumed twice; delivery confirmation identifies which quest receives it.
- Gardening shows the current season and actual harvested/delivered progress; leaving and returning, season rollover, lost items and unavailable NPCs provide recoverable directions.
- Offers queue safely behind every modal; dismissal and competing branch choices remain recoverable. Keyboard and touch can reach the same actions.
- Practice mini-games have independent completion state; leaving, retrying and losing do not close off the reward or bypass full trials.
- Add content validation for quest IDs, prerequisite cycles, target IDs, and missing next-step/blocker text where feasible.

Run an initial moderated playtest with roughly five or six new players aged 11–12, with appropriate permission, across iPad and keyboard. Let them play without coaching; observe hesitation and ask them to explain the next step. Treat this as formative feedback, not statistically representative evidence.

Proposed success targets:

- At least four of five players make their first tea within five minutes without an adult pointing at the fire.
- At least four of five can identify their next action and destination from the game within ten seconds of being asked.
- At least four of five reach a chosen mini-game within fifteen minutes in any starting season.
- All tested players can switch between two quests and resume after a reload without losing credit.
- No player must repeat a successful cook solely to repair onboarding state; no compulsory mastery grind before the first mini-game.

Use observation notes first. If aggregate product events are later added, record milestone IDs and elapsed active-play time rather than dialogue text or children's personal content. Track hint requests and abandonment as design signals, not player failures.

## Recommended decisions for review

1. Adopt “read anywhere, cook at a suitable station”, with room-wide tea access in Mum's kitchen.
2. Allow cooking tasters across domains; preserve mastery for deeper progression.
3. Show one pinned activity and two alternatives while allowing more accepted quests.
4. Add all-season painting and adventure practice as the first mini-game rewards; seasonal activities are bonuses.
5. Preserve mystery difficulty with player-controlled hint depth, and replace accidental obscurity with reliable action feedback.
6. Lead discovery with visual storytelling and dialogue; use contextual UI to confirm, remember and clarify rather than carry the whole experience.
7. Make other players' milestones discoverable through a short return recap, NPC gossip and real shared changes; use those events as personal leads without granting personal completion.

These defaults make the first milestone concrete. They can be revised during review without changing the audit's central finding: new quests will help most once the game consistently explains the next action and recognises what the player has already done.
