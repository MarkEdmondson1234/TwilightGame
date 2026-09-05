# Lava Leap

A side-scrolling crystal adventure. **Cinder the Guide**, a lava frog worker,
waits on protected ground near each lava level's entrance. Click or tap Cinder
and choose **Lava Leap**, or talk first to learn about the crystal crossing.
The optional **diamond marker at (5, 8) in the Wizard Trials chamber** also launches
the game. The chamber is one of the special rooms
discovered when travelling deeper through the lava caverns. Its existing Test of
Wits entrance remains available separately.

For a direct shortcut, open **F4 → Gameplay → Mini-Games → Lava Leap → Try me**.
This starts a fresh practice run without saving unlocks, best scores or awarding gold.

## Playing

- Move with A/D or left/right arrows; jump with Space, W or Up.
- Use the selected crystal with E; select Frost with 1 and Wind with 2.
- Equivalent pointer buttons support touch, including simultaneous movement and jumping.
- Escape or Pause pauses the course. Switching tabs or losing focus also pauses.
- Frost creates a five-second platform ahead. Switching powers gives it 1.5 seconds
  to crumble. Wind grants a lift and a gentle glide, and needs a landing to recharge.
- Wind is discovered in the middle cavern and remains unlocked on later visits.
- Amber chute warnings last 1.3 seconds, followed by a 1.2-second eruption.
- Falls return to the latest safe haven without losing collected treasures.
- The first completed crossing awards 30 gold. Replays record the best treasure
  count without repeatedly granting gold. Leaving early awards nothing.

Progress uses the framework's per-minigame browser storage, not cloud saves.
There is no entry cost, seasonal restriction, overall time limit or inventory loss.

## Implementation and validation

`minigames/lava-leap/engine.ts` owns fixed-step physics, level geometry and crystal
behaviour. `LavaLeapGame.tsx` owns rendering, input, pause and completion through
the existing minigame context. Existing rock, lava, crystal and character artwork
is reused with smooth scaling. No new images or dependencies are needed.

Run `make verify` and `npm run lint`. `tests/lavaLeap.test.ts` exercises a complete
first-time route, power limits, warning timing and safe retries.
`tests/lavaLeapUI.test.tsx` covers pause/input cleanup and cancellation without rewards.

Manual play checks: follow the diamond marker from the chamber's spawn; complete
the course; try both the lower Frost route and upper Wind route at the final river;
test two-finger movement/jump on iPad, portrait/landscape, pause, leave and replay.

## Next iteration

Earth is a planned third power, not unlocked in this first course. Add it together
with a section that teaches blocking chutes. The crystal union and metadata table
make the required engine and UI changes explicit. Difficulty and course length
should be tuned after children have played this first version.
