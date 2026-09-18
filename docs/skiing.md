# Winter skiing

Skiing is both a firewood run and transport through the procedural forest. Use skis in a winter forest to start at the current forest depth. Each 14,000 world units completed advances one depth (about 25 seconds at the opening normal speed, faster with boost). Stopping safely enters that depth using the same daily map seed as walking. Depth caps at 30.

A crash ends the run at the forest entrance, without exhaustion or the trip to Mum's. Keep `ceil(total logs / 4)`, favouring the most valuable logs. The results screen offers either returning on foot or skiing again from the entrance; both bank salvage once. A safe stop keeps every log. Cancelling the introduction leaves the original map untouched.

## Controls and fairness

- A/D or left/right: steer. W/up: boost. Escape: pause. Touch buttons use pointer capture and release on cancellation.
- A short amber marker warns of an aligned obstacle within 0.75 seconds of contact. It is a prediction based on the current course, so steering away clears it.
- Contact occurs when the visible ground anchor of an object crosses the skier's ground anchor. Transparent image padding is excluded. Steering is interpolated at that instant, so a dropped frame cannot jump over an obstacle.
- F3 draws predicted contact footprints. Pickups have a slightly more forgiving collection width.
- The opening field gives warning time, and spawns preserve a free lane in each nearby depth band. The first roughly seven seconds stay gentle, then speed rises continuously with distance, including beyond depth 30. Obstacle intervals shrink to about 440 ms by depth 3 (minimum 300 ms). Deer appear from depth 2 as stationary obstacles, with contact aligned to their hooves and a wider body footprint. Wolves appear from depth 4. Nearby wolves mark a 0.55-second wind-up, lock your position, then leap sideways over 0.55 seconds. Boosting can pass before their landing; dodging after they commit also works. Poor, medium and fine logs appear from depths 1, 3 and 5.
- Losing focus, hiding the tab or a stall over 250 ms pauses play. A missing image offers a return to the forest instead of an endless loading screen.

## Scores

Score is distance / 10 (rounded down), plus 50/100/150 per poor/medium/fine log collected. Crashes still count as runs; salvage affects inventory, not the score. Personal records are saved locally per starting depth. Version 3 global boards also separate starting depths, so a deep-forest start is not compared with an entrance start.

`firebase/skiingScoreService.ts` stores one best per signed-in account at `skiingBoards/v3_<starting depth>/scores/<uid>`. A transaction never replaces a higher score with a lower one. The UI shows global best and the top five skiers. Network failure does not prevent play, and the saved local best is retried when the board is available on a later visit. Version 3 separates the faster, leaping-wolf rules from older scores; previous global boards remain stored. Records display the existing account display name (or “Forest skier”). These are friendly, client-reported records, not an anti-cheat competitive system.

**Release requirement:** publish the updated `firestore.rules` with the app. Until those rules are deployed, global boards show an unavailable state and local records continue working. Rules restrict writes to the account owner and validate fields, bounds, timestamps, board version and improving scores. Live Firebase access is separate from the local tests.

## Implementation and validation

- `rules.ts`: progression, economy, score, safe spawn selection and swept contact.
- `geometry.ts`: shared render/contact projection. Tests cover portrait and landscape viewports.
- `SkiingGame.tsx`: fixed-step simulation, canvas and asset lifecycle. Contact geometry is cached per viewport; depth-ordered objects render without per-frame sorting/filtering; the HUD updates at 10 Hz; paused screens do not redraw continuously.
- `SkiingHud.tsx` / `skiing.css`: introduction, trail progress, controls and results.
- `App.tsx`: applies forest destination through the normal validated map transition. A fresh component key isolates retries.

Run `make verify`. Focused regression tests are `skiingRules`, `skiingScores` and `skiingSalvage`. Browser checks should cover approaching a tree without an early crash, contact, an evasive move, safe stop, crash/retry, touch cancellation, focus loss and travel from a deeper start.

The rules and projection are separate to make a future summer variant possible, but no water-skiing mode or generic theme framework is included.

## Integrated browser playtest — 18 September 2026

Tested the actual application with a disposable local character in headless Chrome at desktop and phone-sized viewports. Winter/weather and obstacle randomness were controlled in the test browser. The long progression checks advanced only skiing's animation clock; the main game's inventory, result processing, map transitions and persistence remained real. This is automated browser playtesting, not a substitute for a human judgement of difficulty.

Verified:

- Entered skiing through the inventory's skis action in a winter forest.
- Steered around obstacles and collected 11 logs in a run from forest level 1 to 3. A safe stop transferred all 11 logs to inventory and placed the character at `(3, 15)` in the daily depth-3 forest.
- Continued from level 3 into wolf country at level 5. Wolves rendered; medium and fine firewood were collectible.
- Deliberately steered into an obstacle after collecting 17 logs. The crash retained 5 logs, favouring fine wood, as specified. A separate run with 18 logs also retained 5.
- “Ski again from the entrance” banked salvage once, moved the main game to depth 1 and created a fresh run with zero current score/wood while retaining the personal best.
- A browser touch-start moved the skier. Touch cancellation stopped steering immediately, without a stuck direction. Escape opened the pause screen, from which a safe stop worked.
- Reloading the full application restored the entrance map/position, personal records for both starting depths, and all 16 banked logs (`10 poor, 1 medium, 5 fine`). Inventory was checked after its normal asynchronous initialisation.
- A normal-speed keyboard-controlled run (no accelerated clock) lasted about 15 seconds, collected 2 logs and continued playing without a crash, unexpected pause or runtime exception. This was a functional check, not a hardware FPS benchmark.
- No uncaught JavaScript exceptions occurred in the completed checks. The dev server emitted an unrelated manifest parsing warning.

The global leaderboard was not tested against live Firebase. The environment has neither the Firebase emulator tooling nor a Java runtime, so an emulator-backed rules test was also unavailable. Verify reading/writing records with signed-in accounts when publishing the Firestore rules. No deployment was performed during this playtest.


## Faster progression and leaping wolves — follow-up

TypeScript, focused ESLint, and all 1,557 tests pass. An isolated integrated browser test placed the same sideways wolf attack ahead of the skier at level-4 speed: the warning held its target during the wind-up, boosting passed the wolf before it reached the skier, and cruising into the landing produced a crash. No uncaught browser errors occurred. This controlled encounter validates timing and collision integration; human balance testing is still needed. Skiing does not yet have dedicated sound effects.
