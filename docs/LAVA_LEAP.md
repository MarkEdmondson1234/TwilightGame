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

- Move with A/D or left/right arrows; jump with W or Up.
- Use the selected crystal with Space (E also works); select Frost with 1, Wind with 2 and Earth with 3.
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

## Playing together

Two signed-in players open Lava Leap from the same entrance (the same generated lava
map or Wizard Trials chamber), then both choose **Co-op with a friend** or
**Race a friend · split screen**. A shared four-second countdown starts when the
second player joins. Each person uses their own device and controls their own character.
Solo and the developer practice run remain available without multiplayer.

**Co-op:** Frost stepping stones and Earth vent seals help both players. Treasures,
checkpoints, discovered crystals and completion are shared; Wind lifts its owner.
Either teammate can choose the next passage at the junction; the first accepted
choice takes both players there. Falls return each player to the latest shared
checkpoint. Each player can claim their normal first-completion reward once.

**Race:** two camera views show both racers on each device, side by side on wide
screens and stacked on narrow screens. All three crystals start unlocked for a
fair start. The first finish accepted by the server at the main course's crystal
junction wins. Race results do not award gold or change adventure progress.
Within 240 cavern pixels horizontally and 140 vertically, successful powers also
briefly hinder the rival while retaining their normal benefit for their owner:

- Frost slows movement to 55% for 0.8 seconds; jumping still works.
- Wind pushes the rival 45 pixels backwards.
- Earth blocks the rival's powers for one second; movement and jumping still work.

Each cast affects a rival once. Expired or distant casts are ignored. These rivalry
effects apply only in Race; Co-op never applies penalties to teammates.

Online pause and focus loss stop only your controls. The shared cavern clock and
your friend continue. A disconnected player disappears after at most 15 seconds;
the status reports their absence. Reopening the same mode at the same entrance
rejoins the existing run while it remains active. Abandoned runs expire after 30
seconds without a heartbeat. A third player cannot displace either participant.

## Multiplayer implementation

`firebase/lavaLeapService.ts` uses its own Realtime Database room under
`lavaLeap/{mode_and_entrance}`; it never replaces the overworld presence connection.
The run record holds the countdown, course and cooperative progress. Each player
writes only their own transient position/power record under the run ID, with
disconnect cleanup. Transactions merge co-op pickups and select a single branch
or race winner. Server clock offset aligns vent timing and temporary effects.

Publish `database.rules.json` alongside the client when deploying this feature.
The existing Firebase and Pages workflows handle those separately on a push to
main. Transport tests use an in-memory database adapter; the browser review uses
two local preview clients, never production player records.

Safe havens are named stone-and-crystal beacons. They light up when reached and
emit a brief arrival ring. Chutes bubble and steam before their jets erupt; the
effect timing follows the simulation, including pause. Reduced-motion mode removes
particles, ripples and the animated inner jet while retaining hazard warnings.

Ten original PCM sound effects share the game's SFX/master volume and mute settings.
They are generated reproducibly with `node scripts/generate-lava-audio.mjs`.
Chute sounds play on phase changes only when nearby; other cues mark successful
powers, jumping, landing, treasures, checkpoints, rescues and completion.

## Implementation and validation

`minigames/lava-leap/engine.ts` owns fixed-step physics, level geometry and crystal
behaviour. `LavaLeapGame.tsx` owns rendering, input, pause and completion through
the existing minigame context. Existing rock, lava, crystal and character artwork
is reused with smooth scaling. No new images or dependencies are needed.

Run `make verify` and `npm run lint`. `tests/lavaLeap.test.ts` exercises a complete
first-time route, power limits, warning timing and safe retries.
`tests/lavaLeapUI.test.tsx` covers pause/input cleanup and cancellation without rewards.
`tests/lavaLeapMultiplayer.test.ts` covers shared progress, teammate powers and race
penalties. `tests/lavaLeapConnection.test.ts` runs two transport instances through
countdown, progress, branch contention, winner selection and cleanup.

Manual play checks: follow the diamond marker from the chamber's spawn; complete
the course; try both the lower Frost route and upper Wind route at the final river;
test two-finger movement/jump on iPad, portrait/landscape, pause, leave and replay.

## Next iteration

Tune course difficulty and race penalty strength after children have tried the
three powers together. The Forge passage teaches Earth and linked pressure vents.
