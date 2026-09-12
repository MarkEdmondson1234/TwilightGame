# Mobile illustrated-room camera proposal

Reviewed 12 September 2026 after PR #121. Initial rooms: Mum's Kitchen and Village Shop. The mobile camera pilot below is implemented for review; artwork is unchanged.

## Findings before the pilot

- `hooks/usePinchZoom.ts:getZoomLimitsForRoom` pins illustrated rooms to 1× and disables gestures. Settings separately disables all zoom presets for these rooms.
- `App.tsx` prevents the room's viewport scale dropping below its authored size. On a phone this crops a large image rather than giving a useful choice of framing.
- `utils/backgroundRoomLayout.ts:getRoomTransform` already calculates a player-following, edge-clamped pan and shares the resulting tile size/origin with entities and tap inversion. Extend this existing transform rather than introducing a second camera.
- Existing transform tests exercise several zoom values for Mum's Kitchen and upstairs, but those values are not currently exposed by the UI. They do not yet establish renderer, shop, touch or transition correctness at every zoom.
- Mum's Kitchen is one flattened 960×540 illustration at 1.3×. The shop has 1200×675 background and counter layers at 1.2×. The shop counter is part of the interactive scene, not an independent decoration. Character scales also differ substantially: 1.8 in Mum's Kitchen and 3.0 in the shop.
- Centred image layers currently ignore `parallaxFactor` and move together. Setting different factors in the map definitions alone will not produce parallax.

## Recommended first implementation: a mobile camera pilot

1. **Expose a bounded interior game zoom.** Keep desktop's existing presentation. Use a room-specific minimum calculated from actual artwork coverage and viewport scale. Enable world pinch and usable Settings controls; provide a Fit choice when the minimum falls between the existing percentage presets. Keep browser zoom separate.
2. **Keep fitting and zoom separate.** Measure the base room layout when the viewport changes. Apply user zoom exactly once to the shared world transform. Do not refit independently for the background, actors, grid or overlays as the fingers move.
3. **Follow the player within the painted room.** As the player walks, the same camera transform scrolls the background, foreground furniture, characters, placed objects and collision/debug overlays. Clamp to painted boundaries. Near an edge the player moves away from screen centre instead of revealing empty space. On phones, account for the visible gameplay area above the lower controls when choosing the follow anchor.
4. **Choose framing from real device comparisons.** Start the review with Fit, 75% and 100% where valid. A universal 50% is not safe: Mum's Kitchen at 50% is only 624×351px, smaller than a 640×360 viewport. At 844×390 its coverage minimum is about 68%, versus 59% in the shop, before any extra viewport fitting. Review the shop's larger authored character size too; enabling pinch alone is not proof that its composition works.
5. **Retain separate interior/exterior view preferences.** Visiting a room should not overwrite the user's outdoor zoom. Entering another interior clamps the preferred interior view to that room's valid range. UI and touch-control sizes remain fixed.
6. **Make transitions and resize atomic.** A room change, rotation or browser-toolbar resize must update artwork, actor positions and inverse tap coordinates from one layout snapshot. Loading artwork is a map/asset operation, not a per-zoom operation; guard in-flight room loads so repeated zoom updates or a fast exit cannot duplicate layers or install an old room's result.

## Parallax without breaking the painted world

The useful first improvement is coherent camera scrolling. Parallax should then be explicit and opt-in on **decorative layers**, not applied to every existing layer.

- Keep floor, doors, stairs, counters, interactable furniture, NPC anchors and collisions at the same camera movement rate.
- A separately supplied window view may move more slowly. A non-interactive hanging leaf or foreground frame may move slightly faster. Start with only a few screen pixels of differential movement, capped at room edges so it cannot reveal gaps. Respect reduced motion.
- Decorative movement never changes hit testing or walkmesh coordinates. Window views need a mask; separate foreground artwork needs sufficient overscan.
- Mum's Kitchen cannot have genuine internal parallax from its single flattened painting without additional separated art. Preserve the original painting. Its camera pilot can ship without parallax, with decorative layers added later if suitable art is supplied or separately authorised.
- The shop's existing counter should remain aligned with the fox and interaction area. It is not a suitable layer for independent parallax simply because it is drawn in the foreground.

## Acceptance checks before rollout

- Walk from the entrance to Mum, stairs, cooking/placement surfaces and every usable boundary; repeat at each supported zoom.
- In the shop, approach and open the counter, follow the fox's entry animation, interact and exit. Confirm foreground occlusion stays correct.
- Tap the same visible doors, NPCs and floor points before/after zoom, pan and resize; verify against the authored tile positions. Test long press and two-finger gestures while another finger has used the D-pad.
- Verify no exposed image edges, clipped player feet, stale camera offsets or hidden destinations behind controls. Compare 640×360, 844×390, a short landscape viewport and iPad; rotate back from portrait and open/close menus.
- Check rapid room transitions and zoom while images are loading. Assert no duplicate sprites/NPC registration and no stale async room installs.
- Measure texture residency/framebuffer size before and after zoom. Reuse current images; no higher-resolution copies, full-screen render textures or filters are required for the camera fix.
- Run the existing full verification and targeted geometry/loading tests, then an actual iPhone Firefox walk-through. Desktop regression screenshots must retain the existing framing.

After those two rooms pass, apply the common camera policy to the other illustrated interiors, with per-room checks for custom grid offsets, unequal layer sizes, unusual walkmeshes and conditional artwork. This work does not establish that the separate village crash has been resolved.

## Pilot implementation and verification

- Mum’s Kitchen and Village Shop now opt into touch-device zoom, defaulting to 75% when coverage permits. Settings includes Fit. Indoor and outdoor choices remain separate for the session. Desktop and other interiors retain their existing fitted policy.
- The existing shared camera pans towards an anchor above the lower controls and clamps to painted bounds. Artwork and interactive layers remain together.
- Fixed saved-interior startup classification: map registration can finish after the first render, so the room policy must follow the loaded map rather than memoising an unavailable map by ID.
- Image loading now runs on map changes, with pending-load deduplication and stale-result rejection. Zoom/resize updates reuse existing sprites.
- `make verify`: 162 files / 1,333 tests pass. Full lint: zero errors, seven existing warnings. Vite production build passes.
- Chromium touch emulation at 844×390 confirmed saved-room startup, walking, Settings, Fit, pinch and resize to 640×240 without page errors. Fit is approximately 68% in the kitchen and 59% in the shop at 844×390. Desktop views were also inspected at 1280×720. These are browser checks, not an iPhone performance result.
- Geometry tests cover four viewport sizes, zoom limits, painted bounds and inverse tap coordinates. Loading tests cover duplicate pending loads and exiting before an image resolves.
- Still pending: the complete on-device interaction/door route above, actual iPhone Firefox performance, and review of high zoom on very short viewports (the shop’s large authored character can extend above the screen). Fit provides the wider view. Do not expand the pilot to other rooms yet.
- Parallax remains deferred until suitable separate decorative artwork is available. The village crash remains a separate investigation.
