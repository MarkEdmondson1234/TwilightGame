# Test of Agility — crystal tunnels

Enter at the minecart doorway in the Strength Trial after clearing its boulders (F4 → Gameplay → Mini-Games → Test of Agility also launches it for development).

Steer with A/D, left/right arrows, or the touch buttons. Escape, focus loss, a hidden tab, or a frame stall longer than 250 ms pauses the run. There is no boost or item collection. Crystals, cave rocks and goblins are obstacles; the cave roof, floor and looping wall layers are scenery. Goblins appear in later stretches and mark a 0.65-second wind-up before lunging towards a fixed target: dodge after they commit.

The original 12,000-unit trial distance is preserved. Speed and obstacle density rise continuously within three 4,000-unit stretches. Reaching the finish pauses the game and secures the pass. Choose Test of Patience or continue into an increasingly difficult endurance run; a later crash does not undo the pass. An early crash offers an immediate retry. Leaving an unfinished trial returns to the antechamber through the existing host transition.

After a pass (or with an existing Patience quest), reopening the minecart also offers **Play for a high score**. This starts an endless run from the same entrance and difficulty, supports retries, and closes in place without changing quest progression or awarding items. The Strength Trial doorway remains available after its quest stage is cleared.

Score is `floor(distance / 10)`. Version 1 personal bests use the existing `test-of-agility` mini-game storage. Signed-in players share one best/account at `agilityBoards/v1/scores/<uid>`; the UI shows the global best and top five. Transactions never overwrite a stronger record. Offline play works and retries publishing the saved personal best on a later visit. These are friendly client-reported scores, not an anti-cheat system. Deploy the Firestore rules with the app; live board/rules verification is separate from local tests.

Collision geometry is cart-specific and uses measured sprite alpha margins. Crystals use base width 170 (previously 380), with near-camera width capped to 1.15 cart widths. The solver aligns the visible obstacle base to the cart wheels, and swept tests interpolate the cart and goblin positions at contact. Amber warnings mark imminent collisions. F3 shows contact footprints. The fixed 120 Hz simulation compacts objects in place, caches contact geometry per viewport, renders in depth order without per-frame sorting, updates the HUD at 10 Hz, and redraws paused scenes only when needed.

Validation: `npm run verify`, focused ESLint, and integrated browser checks for approach/contact, retry, goblin wind-up/dodge, pause, touch cancellation, trial pass, endurance crash, Test of Patience and antechamber transitions, free-play replay and exit, and local records. Global signed-in records need a live smoke test after deploying the rules.

## Browser verification — 18 September 2026

Controlled full-app Chrome checks confirmed a crystal can approach without an early crash, then collides at contact; retry resets distance/pass state; a goblin locks its target and is dodgeable; Escape and focus loss pause; touch cancellation releases steering; a trial pass survives a later endurance crash and reaches Test of Patience; leaving an unfinished trial reaches the antechamber. There were no uncaught browser exceptions.

An isolated preview (to avoid other workspace edits refreshing the page) verified free play continues past 12,000, supports a fresh retry, closes on the original map, and restores a 2,005-point personal best plus the free-play option after reloading. Desktop and phone layouts were visually checked. These were controlled simulation/browser checks, not a human balance or hardware FPS benchmark. Type checking, focused lint, and the full 1,606-test suite passed at validation time. Live signed-in global score access has not yet been exercised.
