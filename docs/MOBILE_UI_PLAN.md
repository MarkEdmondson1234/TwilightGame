# Mobile UI and multiplayer access plan

Reviewed 12 September 2026 against the code merged in PR #112.

Primary device: iPhone using Firefox. Landscape gameplay is acceptable to the owner. This is a plan, not a completed mobile compatibility certification or authentication fix. It supersedes the implementation assumptions in `MOBILE_IPAD_DESIGN.md`, whose control sizes and missing-feature list are now partly outdated.

**Scope: improve the existing mobile implementation.** Retain the current D-pad, tap interactions, long press, pinch zoom and touch-aware inventory. Refactor and adjust these components in place; this is not a replacement control system or a second mobile UI implementation. New controls require an observed usability gap in the existing flow.

## Implementation progress

Stage 1 is under review on `mobile-account-access`. Account now opens directly from the title and game HUD; Help uses its existing topic list as a separate phone view. The account form has labelled inputs, native submission, password autocomplete and unmodified password values. Firebase is prepared before the Google gesture, and account/sync subscriptions reconnect when the lazy service loads. Profile failures are distinguished from authentication failures without emitting another sign-in event.

The reported invalid-action page was reproduced on the deployed site in Chromium, before reaching Google. A request from the Firebase handler returned `Requests from referer https://twiightgame.firebaseapp.com/ are blocked.` The browser API key allowed only `*.markedmondson.me/*`. On 12 September, `https://twiightgame.firebaseapp.com/*` was appended to that key's allowed referrers; existing referrers and API service restrictions were preserved. Repeating the deployed sign-in reached `accounts.google.com/v3/signin/identifier`. No credentials were submitted. This configuration correction is already live, independently of the UI PR. Rollback is removal of that single added referrer; it would restore the reproduced failure.

The owner confirmed that Google sign-in succeeds and returns to the game on iPhone Firefox after the configuration correction. A two-player multiplayer session remains to be verified. The popup flow was retained because the reproduced failure was a referrer restriction, not evidence that a redirect migration was required. No hosting change was made.

Browser layout checks after the changes: email width 314px at 390 × 844, 508px at 640 × 360, and 432px at 844 × 390, without form horizontal overflow. Physical-device checks and the remaining work in stages 2–5 are tracked below.

Stage 2 foundation is implemented on `mobile-menu-layout`: the shared menu boundary follows visual-viewport resize/scroll and all safe-area insets; Help/Account uses it. Phone portrait gameplay shows a rotation prompt with Account and Settings/Help access. Existing overlays use the common UI-state check (including previously omitted glamour, photo album and furniture catalogue), release held input, and hide touch controls consistently. Blur, rotation and visibility changes also release input. Native browser magnification remains available in menus. Keyboard-viewport behaviour has regression coverage; physical iOS keyboard checks and migration of other activity panels are still pending.

The owner subsequently prioritised repeated iPhone Firefox reloads, an oversized splash screen, camera zoom and fullscreen. They approved deferring the world renderer on mobile while retaining desktop preloading. This follow-up is implemented on `mobile-zoom-diagnostics`:

- Mobile title/account screens allocate no world renderer or map textures until Play. Desktop still warms the world in the background. The splash fits the existing seasonal artwork and exposes all three actions at 844 × 390, 390 × 844 and 640 × 240 in browser emulation.
- The map-coverage zoom floor incorrectly prevented zooming below 100% even on large maps. It now allows 50%, subject to map coverage. Settings offers 50/75/100% camera choices, preserving menu size and the preferred view across fitted interiors. The default remains 100%. World pinch excludes control fingers and no longer produces a trailing walk/long press.
- Renderer resolution caps framebuffer pixels against the screen budget when browser zoom enlarges the logical viewport. In the emulated mobile check, doubling both viewport dimensions retained a 1688 × 780 canvas. This is a memory-pressure mitigation, not proof of the reported crash cause.
- Sentry showed five fresh Firefox iOS sessions between 10:58:32 and 10:59:16 UTC on 12 September, each reaching renderer initialisation. No matching uncaught crash established the cause. Added explicit WebGL context-loss and renderer-initialisation reporting plus camera, viewport, framebuffer and texture-memory context. An OS/browser process kill can still prevent any final JavaScript report from uploading. Removed the temporary production vConsole and unbounded console buffer/synchronous storage logger.
- Settings requests fullscreen and then landscape locking where supported; failure leaves the game usable. iPhone guidance explains Safari → Share → Add to Home Screen. Fixed manifest/icon paths for `/TwilightGame/` and retained standalone display mode. Portrait account/settings access remains available; the game can require landscape play without reliably forcing physical rotation on iPhone.

Validation: `make verify`, lint and production build; browser emulation measured zero map textures before mobile Play and successful world loading afterwards, 75% camera selection and stable framebuffer size under an expanded viewport. The owner confirmed that the title screen is recoverable after deployment, then clarified that gameplay still intermittently crashes back to the splash after roughly a minute at normal browser zoom. The crash investigation remains active; this is not a stable-session confirmation. Keyboard, installation and fullscreen checks also remain pending. D-pad/HUD refinements, other activity menus, multiplayer chat and mini-game coverage are still outstanding.

Stage 3 HUD/control changes are implemented on `mobile-landscape-controls`, based on merged PRs #113–115:

- Compact D-pad targets are 48px (56px on taller screens), with visible held state, pointer capture, per-direction pointer ownership and release on pointer cancellation, lost capture, blur, rotation, visibility change and unmount. A second finger cannot release another finger's direction.
- The satchel stays at 80px on touch devices and uses native click/tap activation, avoiding expansion under the finger and activation from cancelled touches. It occupies the lower-right corner; the D-pad occupies the lower-left.
- Quick slots stay 48px, retain the same nine inventory indices and long-press actions, and scroll horizontally between the controls when needed. Books opens the existing illustrated spines in a labelled menu using the common viewport shell and central overlay/input guard.
- Clock/calendar and location sit centrally on touch screens, clear of Account/Books/Help. Multiplayer presence moves below the compact clock group. Settings contains Unstick player and Take photo (when the camera is equipped), plus a brief reminder of existing tap/hold actions.

The browser resize sweep also showed a lighting overlay ending short of the viewport after enlarging a running game from phone to tablet dimensions. This observed rendering issue is recorded for the stage 5 resize/performance investigation; its cause is not established by the HUD checks.

Automated input regression coverage and full-game browser checks supplement the remaining physical-device validation. Activity-menu reflow, chat composer behaviour and mini-game touch coverage remain in stages 4–5; this PR does not complete them or establish sustained iPhone stability.

Stage 4 activity-menu work is implemented on `mobile-activity-menus`:

- Inventory uses the visual-viewport/safe-area shell on the existing touch-device path, with a single scrolling filter row and an adaptive grid of at least 64px slots. A selected item exposes an Item actions button in addition to the existing hold gesture; changing filters clears the pending item-action selection.
- Shops show Buy/Sell tabs on touch devices, adaptive grids and compact gold/header controls. Every mobile trade opens the item/quantity review, including a single affordable item, with the total and Confirm/Cancel kept visible. Desktop retains its dual grids and existing immediate single-item behaviour.
- Cooking and brewing use list/detail navigation on touch devices. Recipes and Close stay in the header; Cook/Brew occupies a separate fixed action row while details scroll. Desktop keeps its side-by-side recipe list and details.
- New CSS is scoped to explicit mobile menu attributes; desktop rendering checks confirmed those attributes are absent. The previously approved desktop HUD changes remain.

Validation: 1,313 tests pass across 156 files, lint has no errors and 7 existing warnings, and production build succeeds. Component browser checks with real artwork covered 390 × 844, 640 × 360, 640 × 240 and a 1280 × 800 desktop path. Mobile panels had no horizontal content overflow and Close targets measured 48px. The final short-screen checks include visible trade totals/actions and Cook/Brew buttons. Physical iPhone touch/keyboard verification remains pending. Illustrated book contents, dialogue/context-menu refinements, multiplayer chat and mini-game coverage remain later work; this batch does not claim to finish the complete mobile plan.

Stage 4 book/dialogue follow-up is implemented on `mobile-books-dialogue`:

- All four books use the shared visible-viewport shell on touch devices. Existing page contents flow vertically over the original book artwork, with chapter and page navigation outside the scrolling area. Close remains 48px; recipe/potion actions join the normal layout instead of floating beyond the title.
- Mobile dialogue uses the available viewport height, retains the painted frame and scrollable conversation history, and lets long scripted/AI choice lists scroll within the content area. Leave stays outside that scroll region; text inputs use 16px text.
- Touch context menus use a bounded, scrolling action list with wrapped labels and a sticky Close button. Existing action callbacks and confirmation behaviour are retained. Desktop keeps its positioned menu and two-page books.

Validation: `make verify` passes 1,315 tests across 157 files; targeted lint has no errors or warnings, and the production build succeeds. Browser component checks covered all four book themes at 390 × 844, 640 × 360 and 640 × 240, plus desktop at 1280 × 800. Mobile boundaries showed no horizontal overflow; the final long dialogue choice was reachable by scrolling. Review images use disposable component fixtures, not a physical iPhone session. The village crash remains awaiting the owner's deployed-device trial. Multiplayer/chat, expanded history and activity result overlays, mini-games and remaining physical-device checks are still outstanding.


Stage 4 chat/gift/emote follow-up is implemented on `mobile-multiplayer-menus`:

- Mobile chat has explicit Send and Close controls, a 16px input and a visual-viewport/safe-area shell. The launcher sits beside the existing emote control, clear of the D-pad. The last eight messages already heard nearby are readable in the composer; proximity and account rules are unchanged.
- Mobile drafts survive blur, Close/reopen and false/rejected delivery results. Send is guarded while pending, and only successful delivery clears the draft. Desktop keeps its existing composer and submission behaviour.
- Gifts use the common mobile shell, adaptive inventory grid and fixed selection/Give Gift footer. The existing gift transaction logic is unchanged. Mobile emotes use a four-column grid, a sticky Close button and completed-tap activation.
- Opening the mobile composer or emote menu releases held movement and suppresses world gestures through the existing UI guard.

Validation: 1,318 tests across 158 files pass, full lint reports no errors and 7 existing warnings, and production build succeeds. Browser component fixtures checked 390 × 844, 640 × 360, 640 × 240 and 640 × 180, plus desktop at 1280 × 800. Close/Send/Give Gift targets remain 48px and inside the mobile viewport. Failed-send checks use a local stub and send no real messages. Native iPhone keyboard behaviour and two-player delivery still require device trials. Connection-state feedback, nearby-player navigation, expanded history/result overlays and mini-game coverage remain outstanding; the village crash investigation is unchanged.


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

Do not call the game mobile-ready until the real-device account flow and gameplay acceptance checks pass. Google sign-in has been confirmed on the owner’s iPhone. The immediate release priority is the mobile startup/splash/zoom follow-up, then physical-device validation and the remaining planned controls and activity menus.
