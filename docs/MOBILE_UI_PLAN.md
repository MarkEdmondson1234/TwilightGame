# Mobile UI and multiplayer access plan

Reviewed 12 September 2026 against the code merged in PR #112.

Primary device: iPhone using Firefox. Landscape gameplay is acceptable to the owner. This is a plan, not a completed mobile compatibility certification or authentication fix. It supersedes the implementation assumptions in `MOBILE_IPAD_DESIGN.md`, whose control sizes and missing-feature list are now partly outdated.

**Scope: improve the existing mobile implementation.** Retain the current D-pad, tap interactions, long press, pinch zoom and touch-aware inventory. Refactor and adjust these components in place; this is not a replacement control system or a second mobile UI implementation. New controls require an observed usability gap in the existing flow.

## Implementation progress

Stage 1 is under review on `mobile-account-access`. Account now opens directly from the title and game HUD; Help uses its existing topic list as a separate phone view. The account form has labelled inputs, native submission, password autocomplete and unmodified password values. Firebase is prepared before the Google gesture, and account/sync subscriptions reconnect when the lazy service loads. Profile failures are distinguished from authentication failures without emitting another sign-in event.

The reported invalid-action page was reproduced on the deployed site in Chromium, before reaching Google. A request from the Firebase handler returned `Requests from referer https://twiightgame.firebaseapp.com/ are blocked.` The browser API key allowed only `*.markedmondson.me/*`. On 12 September, `https://twiightgame.firebaseapp.com/*` was appended to that key's allowed referrers; existing referrers and API service restrictions were preserved. Repeating the deployed sign-in reached `accounts.google.com/v3/signin/identifier`. No credentials were submitted. This configuration correction is already live, independently of the UI PR. Rollback is removal of that single added referrer; it would restore the reproduced failure.

The owner confirmed that Google sign-in succeeds and returns to the game on iPhone Firefox after the configuration correction. A two-player multiplayer session remains to be verified. The popup flow was retained because the reproduced failure was a referrer restriction, not evidence that a redirect migration was required. No hosting change was made.

Browser layout checks after the changes: email width 314px at 390 × 844, 508px at 640 × 360, and 432px at 844 × 390, without form horizontal overflow. Stages 2–5 remain outstanding, including keyboard/safe-area handling beyond the current dynamic-height account layout and all existing gameplay-control improvements.

## Design decisions

- Support **landscape gameplay** on phones. Show a friendly “Turn your phone to play” screen in portrait, with Account, Settings and Help still accessible. Release held movement when it appears; do not pause the shared multiplayer world. Preserve progress across rotation.
- Account, Settings and chat must remain usable in either orientation and with the software keyboard open. An orientation change during Google sign-in must not disrupt the return flow.
- Preserve the hand-drawn satchel, books, dialogue frames and world artwork. Change their layout and interaction areas rather than replacing the visual identity.
- Keep existing direct world taps, D-pad, long-press interactions and pinch zoom. Improve their reliability and discoverability before considering a different movement scheme.
- Use a rotation prompt rather than relying on browser orientation locking. [ScreenOrientation.lock has limited availability](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock).

## Findings and confidence

| Finding | Evidence | Consequence |
| --- | --- | --- |
| Settings is unusably narrow in phone portrait | Actual `HelpBrowser` mounted in Chromium touch viewports: at 390 × 844, its fixed 256px sidebar leaves a 94px content area; the email input measures 36px wide. At 360 × 640, content is only 64px wide. | Reflow the navigation and form; landscape alone does not solve account access. |
| Landscape gives the form enough width, but keyboard behaviour needs testing | At 844 × 390, the email input measures 432px wide. This was viewport emulation, without an iOS keyboard. | Optimise available height as well as width. |
| Google sign-in leaves the game for an invalid-action page | User report from iPhone Firefox. `authService.ts` currently uses `signInWithPopup`; the Settings handler awaits Firebase readiness before invoking it. | Diagnose the provider handoff independently of layout. The precise cause is not established. |
| Account is difficult to discover | It is inside Help → Settings, below Character and Audio controls. | Give Account/Multiplayer a direct entry point. |
| Small-screen controls become smaller | Compact D-pad buttons are 40px; reset is 32px. Touch buttons handle start/end without a local cancel handler. | Retain comfortable targets and make movement cancellation explicit. Cancellation failures are a risk to test, not a reproduced stuck-movement bug. |
| Some menus retain desktop layouts | Shop has two side-by-side panels with six-column item grids; Help has its fixed sidebar and large padding. | Use dedicated mobile layouts rather than scaling everything down. |
| Chat depends on keyboard conventions | Enter sends, blur closes; no visible Send button. | Add a keyboard-aware composer and preserve drafts. |
| Mobile support already exists | Safe-area viewport metadata, touch controls, long press, viewport-clamped context menus, touch inventory columns, responsive dialogue sizing. | Build on these rather than reimplementing them. |

The layout audit isolated the real component over the title screen; it was not an end-to-end gameplay or OAuth test. No credentials were submitted. Physical iPhone Firefox testing remains required.

## 1. Restore account access and Google sign-in

**First delivery: a usable Account screen and a verified Google return flow.**

Place an Account/Multiplayer button on the title screen and an accessible account/status entry in the game menu. Open the account screen directly, without scrolling through Help or unrelated settings. Display signed-out, signing-in, signed-in, and recoverable error states clearly. Show multiplayer connection and cloud-save status separately: authentication success does not guarantee either service is connected.

Use a single-column form with a visible Close/Back button, labelled inputs, appropriate autocomplete, password-manager support, normal form submission and a clear Google button. Keep errors beside the attempted action. Do not trim passwords. Retain entered email and show progress while requests run; cancellation should return to a usable screen.

Authentication investigation and implementation:

1. Reproduce the reported invalid-action page on the deployed site in iPhone Firefox. Record the Firebase error code and relevant callback host/path without collecting credentials, OAuth tokens or full sensitive callback URLs. Use existing auth error reporting where it captures the failure.
2. Verify the deployed host, Firebase authorised domains, configured `authDomain`, provider configuration and callback/session continuity. Check whether Firebase initialisation delays popup creation beyond the direct button gesture.
3. Choose and test a supported mobile flow. Firebase recommends redirect on mobile, but redirect also has cross-origin storage requirements. **Do not blindly swap popup for redirect or ask players to disable privacy settings.** Evaluate the deployed hosting arrangement against [Firebase redirect best practices](https://firebase.google.com/docs/auth/web/redirect-best-practices), then implement the appropriate supported setup and return handling. A hosting/domain change would be a separate concrete proposal if needed.
4. Distinguish successful authentication from subsequent Firestore profile/save operations. A profile write failure must not misleadingly say that Google login failed after the user has already authenticated.
5. Verify reload, cancelled sign-in, browser Back, returning from Google, session restoration and existing-account/save continuity. Preserve account identity; do not silently create another account as a workaround.

Acceptance: from the title screen, an existing player can sign in on actual iPhone Firefox, return to the game, see the correct account, and establish multiplayer presence. Errors remain understandable and retryable. Existing saves are not silently overwritten. Also verify iPhone Safari and desktop Google/email sign-in.

## 2. Introduce a common mobile menu layout

Create a shared responsive menu shell: pinned title and Close/Back controls, one main scrolling content region, safe-area padding on all four sides, and actions reachable without horizontal scrolling. Use available viewport height and keyboard-aware positioning rather than relying only on `90vh`. The [visual viewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) can shrink for an on-screen keyboard while the layout viewport remains unchanged.

On phones, replace the permanent Help sidebar with a section list that opens the selected page; Back returns to the list. Give Settings short categories such as Account, Sound, Controls and Display. Keep desktop navigation where space allows.

Use 48–56 CSS pixel primary game controls where practical; keep other touch targets at least 44px with separation. These are design targets, not a claim of accessibility certification. Use readable form text and do not globally suppress browser magnification in menus. Consolidate overlay input blocking so every modal suppresses world movement and gestures consistently.

Acceptance: no clipped form controls or horizontal menu overflow at 360px width; close and primary actions remain reachable at 640 × 360 landscape and with the keyboard visible. Test notch/home-indicator insets and browser toolbar expansion.

## 3. Make landscape play comfortable and reliable

- Reserve the lower left for movement and lower right for world actions and the satchel. Keep frequently used targets comfortably sized, even on short screens; reduce decoration and spacing before shrinking targets.
- Keep the upper HUD compact, with a clear Menu/Account entry. Put less frequent actions such as Reset and Photo inside an accessible menu. Gate the production vConsole/debug launcher.
- Give books a compact launcher that opens the existing illustrated bookshelf. Show only the quick slots that fit comfortably, with scrolling or an expandable tray for the rest.
- First test and improve existing tap targets, selection feedback and long-press discoverability. Only consider an additional labelled contextual action button if device testing exposes actions that remain hard to perform; reuse existing interaction providers. Preserve tap-to-walk semantics, especially around other players. Improve the existing context menu before introducing another interaction surface.
- Make held movement robust to pointer cancellation, loss of capture, overlays, rotation, backgrounding and release outside the button. Define pointer ownership so a D-pad finger plus another UI touch cannot trigger world pinch zoom. Scope world gestures to the game surface.

Acceptance: move and interact with simultaneous touches without unintended zoom; release or backgrounding never leaves movement held. Opening any modal disables world input. HUD and controls do not cover each other in short landscape layouts. Returning from portrait does not lose progress.

## 4. Reflow inventory, activities and multiplayer UI

| Surface | Planned change |
| --- | --- |
| Shop | Buy/Sell tabs on phones, responsive item grid, clear item details and a reachable transaction button. |
| Inventory and quick slots | Retain the existing touch grid; adapt to available width, expose item actions by tap, and keep selection/use/equip state visible. |
| Books, recipes, cooking, brewing and magic | Use the common menu shell, responsive content and reachable action buttons. Preserve illustrated covers and frames. |
| Dialogue and context menus | Keep the existing responsive frame; ensure long choices scroll and Close remains visible. Use a mobile action sheet for lists that cannot fit around a finger. |
| Multiplayer | Show connecting/online/offline status and a visible route to nearby-player actions, gifts and emotes. Reflect the actual guest/account policy rather than assuming sign-in alone guarantees access. |
| Chat | Visible Send and Close buttons; composer above the keyboard; retain drafts on blur or send failure. Suppress game shortcuts while typing and keep recent messages readable. |
| Mini-games | Audit every activity for keyboard-only actions, hover instructions, timers obscured by controls and unreachable exit buttons. Specify per-game touch controls where needed. |

Acceptance: a player can walk, interact, farm, change equipment, buy/sell, use books and recipes, chat, gift and complete/exit each mini-game without a hardware keyboard or mouse.

## 5. Validate on devices and check effect performance

The new cave drips and weather vane are pre-rendered sprites, not real-time Blender scenes. Their map-scoped loading and reduced-motion support are appropriate foundations for mobile. Approximate decoded atlas storage before mipmaps is 3 MiB for the cave drips and 5.625 MiB for the village vane. This does **not** establish performance of the whole game on an iPhone.

Test the village during each weather state, caves with multiple drips, transitions, multiplayer arrivals and longer play sessions. Measure frame stability, texture residency and sustained device behaviour before deciding whether an optional reduced-effects mode is needed. Reduced motion must continue to show the vane's weather symbol.

Release checks:

- Real iPhone Firefox first, then iPhone Safari, Android Chrome and iPad; retain desktop keyboard/mouse behaviour.
- Automated layout checks at 360 × 640, 390 × 844 and their landscape equivalents, plus 768 × 1024 and landscape tablet. These complement physical devices; they cannot validate iOS OAuth or keyboard behaviour.
- Keyboard opening/closing, toolbar resizing, rotation, safe areas, background/resume, slow connection, offline/reconnect, auth cancellation and session restoration.
- Complete a two-player session: sign in, see each other, move, chat, emote, gift, leave/rejoin and check save continuity.
- Run `make verify` and required lint checks for implementation changes. Add focused regression coverage for auth state transitions, overlay input blocking, pointer cancellation and chat draft retention; use browser checks for actual layout.

## Suggested PR sequence

1. **Account access and mobile Google sign-in:** direct entry, responsive account form, diagnosed auth fix and real-device return-flow validation.
2. **Mobile menu shell and orientation:** shared layout, Settings/Help navigation, keyboard/safe-area handling and portrait gameplay prompt.
3. **Existing landscape HUD and touch controls:** improve placement, target sizes, pointer cancellation, gesture ownership and feedback without replacing the control scheme.
4. **Activity menus and multiplayer UI:** shop/inventory/books, chat, nearby-player actions and connection feedback.
5. **Mini-game touch coverage and device performance:** remaining activity-specific controls, end-to-end device checks and measured effect optimisations if required.

Do not call the game mobile-ready until the real-device account flow and gameplay acceptance checks pass. The immediate priority is PR 1; merely asking users to rotate would leave the reported Google failure unresolved.
