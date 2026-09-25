# Mobile UX: small screens, fewer controls, straight back into play

Status: **planned** (phase 0 shipped with this doc). Written 25 September 2026.
Builds on [`docs/MOBILE_UI_PLAN.md`](../../docs/MOBILE_UI_PLAN.md) (stages 1–3) and the
#157 fixes (PRs #160, #162, #163). Performance work is separate:
[`PERFORMANCE_MOBILE_PLAN.md`](PERFORMANCE_MOBILE_PLAN.md).

## Why

On 25 September the owner watched Sanne play on an iPhone and the game was "way too zoomed in
to be usable". Sentry (`message:game.world_ready`) gives the device:

| | |
|---|---|
| Device | iPhone, **Chrome for iOS**, landscape, not signed in |
| Viewport | **568 × 260 CSS px**. Chrome's toolbars take a quarter of a small phone's landscape height. The owner's phone reports 844 × 390. |
| Camera | `view.camera_zoom` 0.5, already the floor. The shop ran at 0.39. |

The camera could not zoom out any further, and the controls are fixed in pixels, so on a
260px-tall screen:

- The D-pad column took 152px (58% of the height).
- The chat/emote/satchel column took 144px.
- The top row took 52px.
- The world strip between them was about 140px, roughly **8 tiles**, and half of those sat under a control.
- Guidance cards were capped at 52px (news) and 10px (pinned quest body).

The game played well on the owner's phone and was nearly unusable on a friend's.

What the owner wants (quoted): players should be able to **log in and just start from where they
left off**, which "makes it a very cosy game". Beyond that, **zoom and UI elements can be
minimised or aggregated**.

## Principles

1. **World first.** On a touch screen, every always-on control has to earn its pixels. The
   default state is the fewest controls a child needs to walk, act and carry things.
2. **Size by height, not by device.** A phone in landscape is short. The tier comes from
   `getTouchLayoutTier(viewportHeight)`: `regular` ≥ 600, `compact` < 600, `tiny` < 340.
   Rules keyed on `isTouchDevice` (the HUD does this) treat an iPad and a small iPhone the same.
3. **One source of truth for where controls sit.** `utils/touchLayout.ts` owns every footprint.
   The action menu, camera overscroll, quick bar and cards all read it. A control placed by
   hand with its own numbers is how #157's "hidden behind chat" bugs happened.
4. **Tap-to-walk is the primary way to move.** Tapping the ground already walks the player
   there, and the D-pad is a comfort for children who like it. It must stay available and must
   never be the reason the world can't be seen.
5. **Minimise, don't remove.** Anything tucked away comes back with one tap, and the choice
   is remembered per device in localStorage, like the D-pad preference.
6. **Guard each rule with a test.** Every layout invariant in this doc has, or gets, a test in
   the style of `tests/touchActionMenuLayering.test.tsx`: collect every violation, assert once.

## Current always-on touch UI (at 568 × 260)

| Element | Where / size | Small-screen handling |
|---|---|---|
| Wallet | top-left, 44 × 44 | compact on any touch device |
| Location + clock + sundial | top centre, 260 wide | compact on any touch device |
| Books / Emotes / Menu | top-right, 3 × 44 + gaps = 148 × 44 | **none**. It touches the clock group at 568 wide. |
| Presence pill | fixed `top: 104px` in compact | **none**. It lands mid-screen at 260 tall. |
| Pinned quest | top-left card, 300 wide | **phase 0**: one-line pill on tiny |
| Village news / activity card | top-right card | **phase 0**: an open card rises over the controls on tiny. The activity card is a pill until tapped. News has no pill. |
| D-pad | bottom-left | **phase 0**: 112px on tiny, and can be tucked away |
| Quick bar | bottom, D-pad → satchel | fills the space left free by the D-pad |
| Satchel | bottom-right, 60 × 60 | none |
| Chat button | right 84, bottom 96, 64 × 44 | none |
| Emote button (TouchControls) | **never drawn** (App passes no `onEmotePress`), but `touchLayout` still reserves 48px for it | — |
| "Cook here" button | at least 160 × 56 | **none** |
| Transition / mini-game indicators | bobbing icon + tooltip | none |

## Phase 0: shipped with this doc

- **Zoom floor follows the screen height.** `getWorldMinZoom()` lets a touch screen shorter than
  390px zoom out until it shows `TOUCH_MIN_VISIBLE_WORLD_HEIGHT_PX` (780 world px, about
  12 tiles), with a floor of 0.3. Ordinary phones and desktop keep the 0.5 floor. A tiny screen
  starts at its floor. Render cost matches an 844 × 390 phone at 0.5, because the same area of
  world is on screen.
- **`tiny` tier.** The D-pad is 112px (144 compact, 176 regular). The quick bar starts from the
  D-pad's real footprint.
- **The D-pad can be tucked away.** A 32px toggle sits in the cross's empty top-left corner.
  Hiding the pad leaves only the toggle, and the quick bar slides left into the freed space.
  The choice is remembered per device (`utils/dpadPreference.ts`). The action menu and camera
  overscroll respect it.
- **Cards on tiny screens.** The pinned quest becomes a one-line pill showing the next step.
  An open news or activity card rises above the controls (`Z_QUEST_GUIDANCE_RAISED`) and uses
  the full height. "Later" puts the controls back.
- **No copy/paste callout while playing.** On coarse pointers, text selection and the iOS
  callout are off for the whole page; inputs and textareas opt back in. The owner saw the
  Copy/Look Up menu again after #157. It came from a thumb on the D-pad drifting onto nearby text.
- **Add to Home Screen tip.** Shown once to an iOS browser tab (not installed) under 400px
  tall. Installed, the same iPhone gets 568 × 320 instead of 568 × 260.

Tests: `smallTouchScreen`, `touchSelectionDisabled`, `guidanceCardClearance`, plus the updated
`touchCameraOverscroll` and `touchActionMenuLayering`.

## Phase 1: straight back into play (highest value)

The owner's own priority. Today `showSplashScreen` starts `true` on every load. A signed-in
player sees the title and taps Play, and on mobile the world renderer only starts after that
tap. That is correct for memory (see `MOBILE_UI_PLAN.md`), but it adds a wait to every return.

- **Signed-in resume.** When a cloud or local save exists for the signed-in uid, the title
  shows a single large **Continue** button, with the character's portrait and "Village, spring
  day 6". Account and Help become small secondary links. One tap goes to the world, with no
  season cutscene on a resume.
- **Returning from the Home Screen app.** For an installed app (`display-mode: standalone`)
  with a save, skip the title entirely and load straight into the last map. The title is one
  menu tap away.
- **Nudge sign-in on mobile.** Sanne was not signed in, so her progress lives in one browser's
  localStorage, and iOS evicts site data from an uninstalled tab after 7 days without use.
  After the first session milestone (first harvest or first cup of tea), show a friendly card:
  "Save your garden so you can come back to it on any device."
- **Acceptance:** from tapping the icon to walking takes one tap for a signed-in player, and
  zero taps for an installed app. Measure with a `game.resume` log: time from boot to
  `world_ready`, and whether the title was skipped.

## Phase 2: aggregate the HUD

- **One top-right button.** On compact and tiny screens, Books, Emotes and Menu fold into a
  single 44px menu button that opens a small sheet (Books, Emotes, Help & settings, Account).
  This saves 96px of the top row and ends the collision with the clock group at 568 wide.
- **One status chip.** Location, clock and sundial merge into one chip, "Village · 10:40 ☀",
  that expands on tap. The wallet joins it on tiny screens.
- **Right column.** Stop reserving space for the emote button nobody draws. On compact and
  tiny screens, the chat button moves into the menu sheet, or becomes a small speech-bubble
  badge on the satchel that appears only when chat is active. The right footprint drops from
  144px to the satchel's 68px, and the cards' `--guidance-bottom-clearance` drops with it.
- **Presence pill.** Anchor it under the status chip rather than at `top: 104px`.

## Phase 3: controls that get out of the way

- **Tiny screens start with the D-pad hidden** for *new* players. A first-run hint, "Tap where
  you want to go", pulses once over the world. Players who already chose keep their choice.
- **Fade while idle.** After about 4 s with no touch, the quick bar and D-pad fade to 40%
  opacity, and the first touch restores them. A pulled-out tool keeps its slot visible.
- **Quick bar on tiny screens:** show the selected slot plus four more, with a chevron to open
  all nine. The alternative is a single "hand" slot that opens the full bar.
- **Contextual action button.** `useTouchControls.handleActionPress` exists (farm, mirror, NPC,
  cooking, transition, the same order as E) but has no button, which was the open question on
  #162. Add one only if it can replace something. For example, a single context button that
  shows the action for the tile you're facing ("Water", "Talk", "Go inside") could absorb the
  in-world "Cook here" and exit prompts.

## Phase 4: zoom that remembers

- **Persist pinch zoom per device** (localStorage, per `world`/`interior`). It is React state
  today, so every reload forgets it.
- **Settings camera choices** (currently 50/75/100%) gain **"See more"**, which is the tier's
  floor from `getWorldMinZoom()`. It is labelled in words, not percentages, for children.
- **Double-tap reset** returns to the tier default, not a fixed 0.5.
- **Background-image rooms** (kitchen, shop) have their own framing
  (`utils/mobileInteriorFraming.ts`). Check them at 568 × 260: the shop ran at 0.39 there.

## Phase 5: the rest of the screen

- **In-world prompts:** "Cook here" (at least 160 × 56), transition and mini-game indicators
  get a compact form on tiny screens.
- **Dialogue at 260px tall:** portrait beside the text, at most two lines, with choices as a
  horizontal row.
- **Mini-games:** audit each at 568 × 260. The sliding-crate puzzle hard-codes
  `DPAD_RESERVE = 200`, which should read `touchLayout`.
- **Home Screen tip:** the phase 0 toast lasts 3 s. Replace it with a dismissible card
  showing the steps for Safari and for Chrome on iOS (both use Share → Add to Home Screen on
  iOS 16.4+).

## Measurement

- Add `view.touch_tier` and `touch.dpad_hidden` to `setDiagnosticView()`, so Sentry can answer
  how many sessions are tiny and whether players tuck the pad away.
- Add a `game.resume` log (phase 1).
- **Layout screenshots in CI.** `scripts/perf-test.js` already drives headless Chrome with
  touch device profiles, and SwiftShader renders the world (see the `headless-chrome-pixi-limit`
  note). Add a job that screenshots 568 × 260, 844 × 390 and 1024 × 768 after Play and posts
  them on PRs touching `components/` or `utils/touchLayout.ts`, like the art review does.

## Order and size

| Phase | Size | Why this order |
|---|---|---|
| 1 Resume | M | The owner's stated priority, and it helps every player on every device |
| 2 Aggregate HUD | M | The largest pixel win after phase 0, and it lowers the card clearance |
| 3 Controls out of the way | M | Depends on phase 2's right column, and needs a first-run hint |
| 4 Zoom memory | S | Independent; can ride along with any phase |
| 5 Rest of screen | M | An audit, best done with the CI screenshots in place |

## Risks

- **Children who rely on the D-pad.** Hiding it by default (phase 3) is for new players on tiny
  screens only, always one tap away, and never forced on an existing choice.
- **Zooming below 0.5 costs render work** on the screens that can least afford it. The floor
  is defined as "the same world area as an ordinary phone", so the cost is bounded by what
  already ships to 844 × 390. Watch `game.performance` for tiny-tier sessions.
- **Skipping the title** must not skip the account-mismatch guard (#154) or the cloud-save
  merge. Resume goes through the same `syncManager` path as Play.
- **Keyboard/desktop must not change.** Every rule here is gated on touch plus a height tier.
