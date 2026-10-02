# Mobile & iPad Design Document

This document outlines the plan to make Twilight Game fully playable on iPad and mobile devices.

## UI Overlap Issues

### Current Layout Problem

The touch controls and other UI elements have conflicting positions that cause overlap on mobile/tablet:

```
┌─────────────────────────────────────┐
│  HUD (top-2)                        │  ← Clocks fixed 70px, may crowd
│  Wallet  Location  🕐 📅            │
├─────────────────────────────────────┤
│                                     │
│         GAME CANVAS                 │
│                                     │
├─────────────────────────────────────┤ ← ~368px from bottom
│                                     │
│  D-Pad (176px)     Action Buttons   │  ← TouchControls: bottom-48 (192px)
│  ┌───┐             🌿 📖 🍳         │
│  │▲▼◄►│            ⋯  E             │
│  └───┘                              │
├─────────────────────────────────────┤ ← 192px from bottom
│  [Bookshelf]           [Satchel]    │  ← bottom-16 (64px) OVERLAP ZONE
│                        [Dev btns]   │  ← bottom-2 (8px)
│  [Debug Panel]                      │  ← bottom-4 (16px)
└─────────────────────────────────────┘
```

### Specific Overlap Conflicts

| Element | Position | Size | Conflicts With |
|---------|----------|------|----------------|
| **TouchControls** | `bottom-48` (192px) | D-Pad 176px tall | Satchel, Dev buttons |
| **Satchel (inventory)** | `bottom-16 right-2` (64px) | 256×256px image | Touch action buttons |
| **Dev Buttons** | `bottom-2 right-2` (8px) | ~40px buttons | Below touch controls |
| **Bookshelf** | `bottom-2 left-2` (8px) | Scaled 50-100% | Below D-Pad |
| **Debug Panel (F3)** | `bottom-4 right-4` (16px) | Variable | Dev buttons, satchel |

### On Small Screens (< 640px)

The problems compound:
- D-Pad occupies left 176px × 176px area
- Action buttons occupy right ~200px × ~150px area
- Satchel (256×256px scaled) overlaps with action button area
- Very little game canvas visible between HUD and touch controls

### Visual Conflict Map

```
Phone Portrait (375×667):
┌───────────────────────┐
│ HUD (top 90px)        │
├───────────────────────┤
│                       │ ← Only ~185px of
│   Visible Game        │    game canvas!
│   Canvas              │
├───────────────────────┤ ← 392px from top
│ Touch Controls        │
│ (192px-368px from     │
│  bottom)              │
├───────────────────────┤ ← 192px from bottom
│ Satchel overlaps      │ ← CONFLICT: Satchel 256px
│ with action buttons   │    sits in touch zone
└───────────────────────┘
```

### Solution: Unified Touch Zone

**Proposed Layout**:

```
┌─────────────────────────────────────┐
│  Compact HUD (48-64px)              │
│  💰 100g  🏡 Village  🕐 📅     [?] │  ← Help button in HUD
├─────────────────────────────────────┤
│                                     │
│         GAME CANVAS            [📦]│  ← Satchel (compact 64px)
│         (maximised)                 │     expands on tap
│                                     │
├─────────────────────────────────────┤
│  Tool Bar (optional, 48px)          │
│  [🔨][🌾][🚿][🧺]  selected: Hoe    │
├─────────────────────────────────────┤
│  Touch Controls (compact 160px)     │
│  ┌───┐              🌿 📖 🍳        │
│  │D  │              ⋯  [E]          │
│  │Pad│                              │
│  └───┘                              │
│  + safe-area-inset-bottom           │
└─────────────────────────────────────┘

No dev buttons or debug panel on touch devices (desktop only)
```

### Implementation Priorities

1. **Shrink satchel on mobile** - 64px default, expand on tap, reposition above touch controls
2. **Hide dev/debug UI on touch** - Desktop only (F3 keyboard shortcut anyway)
3. **Consolidate touch zone** - All touch UI in one bottom section
4. **Add safe area padding** - Account for notched devices
5. **Reduce touch control height** - Compact D-Pad option for small screens
6. **Hide touch controls when modals open** - Except essential navigation

### Z-Index Hierarchy (Current)

From [zIndex.ts](../zIndex.ts):

| Layer | Z-Index | Purpose |
|-------|---------|---------|
| HUD | 1000 | Wallet, clocks, location |
| Inventory | 1000 | Satchel image (same as HUD - conflict!) |
| Touch Controls | 1050 | D-Pad, action buttons |
| Debug Panel | 1100 | F3 info (above touch) |
| Modals | 2000+ | Inventory, dialogue, cooking |

**Issues**:
- HUD and Inventory share z-index 1000
- Touch controls at 1050 should be above satchel but below modals
- Need clear separation between always-visible and modal layers

---

## Current State Summary

### What Works Well
- **Touch device detection** - Multi-method detection (ontouchstart, maxTouchPoints, user agent)
- **D-Pad movement** - Directional controls on left side, responsive scaling
- **Primary action button (E)** - Covers most interactions (NPCs, transitions, farming)
- **Secondary buttons** - Forage, Recipe Book, Cooking UI available
- **Viewport configuration** - Proper meta tags, zoom allowed
- **DialogueBox** - Good responsive behaviour with small screen detection

### Critical Issues

| Issue | Impact | Priority |
|-------|--------|----------|
| **Satchel too large on mobile** | 256px overlaps touch controls | **P0** |
| **Dev/debug UI on touch devices** | Clutters screen, unusable anyway | **P0** |
| **Touch controls too tall** | 368px total, leaves little game canvas | **P0** |
| Radial menu disabled on touch | Can't access multi-option interactions | **P0** |
| No Help button (F1) | Can't access documentation | **P1** |
| HelpBrowser sidebar fixed width | Unusable on mobile portrait | **P1** |
| No safe area support | Content behind notch/home indicator | **P1** |
| Touch controls hidden during dialogue | Can't access inventory mid-conversation | **P2** |
| HUD clocks non-responsive (70px fixed) | May be too large on small screens | **P2** |
| No quick slot selection (1-9) | Can't switch tools on touch | **P2** |
| No gesture support | No pinch/swipe/long-press | **P3** |

---

## Phase 0: Fix UI Overlap Issues (P0)

### 0.1 Shrink Satchel Image (Keep It!)

**Problem**: The 256×256px satchel image at `bottom-16 right-2` overlaps with touch action buttons.

**Current Code** ([GameUIControls.tsx:51](../components/GameUIControls.tsx#L51)):
```tsx
<div className={`absolute bottom-16 sm:bottom-14 right-2 ${zClass(Z_HUD)}`}>
  <img src={satchelImage} className="w-64 h-64" ... />
</div>
```

**Solution**: Keep satchel but make it smaller, with expand-on-tap for touch devices.

**Implementation**:

```tsx
// GameUIControls.tsx - Responsive satchel with hover/tap expand
const [satchelExpanded, setSatchelExpanded] = useState(false);

<div
  className={`absolute right-2 ${zClass(Z_HUD)} transition-all duration-200`}
  style={{
    bottom: isTouchDevice
      ? 'calc(200px + env(safe-area-inset-bottom, 0px))'  // Above touch controls
      : '64px'  // Original position for desktop
  }}
>
  <img
    src={satchelImage}
    onClick={onInventoryClick}
    onMouseEnter={() => !isTouchDevice && setSatchelExpanded(true)}
    onMouseLeave={() => setSatchelExpanded(false)}
    onTouchStart={() => setSatchelExpanded(true)}
    onTouchEnd={() => {
      setSatchelExpanded(false);
      onInventoryClick();
    }}
    className={`
      cursor-pointer drop-shadow-lg transition-transform duration-200
      ${satchelExpanded
        ? 'w-48 h-48 sm:w-64 sm:h-64 scale-110'  // Expanded
        : 'w-16 h-16 sm:w-24 sm:h-24 md:w-48 md:h-48 lg:w-64 lg:h-64'  // Compact on mobile
      }
    `}
  />
</div>
```

**Sizing Breakdown**:
| Screen | Default Size | Expanded Size |
|--------|-------------|---------------|
| Mobile (< 640px) | 64×64px | 192×192px |
| Tablet (640-768px) | 96×96px | 256×256px |
| Desktop (768px+) | 192-256px | 256px + scale |

**Position on Touch Devices**:
- Move satchel ABOVE touch controls (bottom: 200px + safe area)
- This puts it in the game canvas area but doesn't block controls

### 0.2 Hide Dev/Debug UI on Touch Devices

**Problem**: Dev buttons and debug panel clutter the screen on touch devices.

**Solution**: Show dev/debug UI only on desktop (keyboard users).

**Elements to Hide on Touch**:
- Dev buttons (bottom-right) → Desktop only
- Debug panel (F3) → Desktop only (keyboard shortcut anyway)
- Bookshelf button → Move above touch controls or into touch menu

**Implementation**:
```tsx
// GameUIControls.tsx - Hide dev buttons on touch
{!isTouchDevice && (
  <div className="absolute bottom-2 right-2 flex gap-2">
    {/* Dev buttons here */}
  </div>
)}

// DebugInfoPanel.tsx - Desktop only
if (isTouchDevice) return null;
```

**New Layout**:
```
Desktop/Keyboard:          Touch Device:
┌───────────────────┐      ┌───────────────────┐
│ HUD               │      │ HUD           [?] │
├───────────────────┤      ├───────────────────┤
│                   │      │              [📦] │ ← Satchel (compact)
│    Game Canvas    │      │    Game Canvas    │
│              [📦] │      │                   │
├───────────────────┤      ├───────────────────┤
│ [📚]    [Dev btns]│      │ D-Pad    Actions  │
└───────────────────┘      │          [📚]     │ ← Bookshelf in actions
                           └───────────────────┘
```

### 0.3 Reduce Touch Control Footprint

**Problem**: Touch controls occupy 176px height + 192px bottom offset = 368px total.

**Solution**: Compact mode for small screens.

```tsx
// TouchControls.tsx - Add compact mode
interface TouchControlsProps {
  compact?: boolean;  // Use smaller D-Pad on small screens
}

// Compact D-Pad: 128px instead of 176px
const dpadSize = compact ? 'w-32 h-32' : 'w-44 h-44 sm:w-48 sm:h-48';
const buttonSize = compact ? 'w-10 h-10' : 'w-14 h-14 sm:w-16 sm:h-16';
```

**Detection**:
```tsx
// In App.tsx
const isSmallScreen = window.innerHeight < 600;
<TouchControls compact={isSmallScreen} ... />
```

### 0.4 Safe Area Insets

**Problem**: Notched devices (iPhone X+, iPad Pro) have content behind notch/home indicator.

**Solution**: Add CSS environment variables.

**index.html** - Update viewport:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

**TouchControls.tsx** - Add safe area padding:
```tsx
<div
  className="fixed left-0 right-0 ..."
  style={{ bottom: 'calc(48px + env(safe-area-inset-bottom, 0px))' }}
>
```

**HUD.tsx** - Add safe area for top:
```tsx
<div
  className="absolute left-2 ..."
  style={{ top: 'calc(8px + env(safe-area-inset-top, 0px))' }}
>
```

### 0.5 Hide Touch Controls During Modals

**Problem**: Touch controls remain visible behind modals, wasting screen space.

**Current**: Controls hidden only when `activeNPC` is set.

**Solution**: Hide touch controls when ANY modal is open.

```tsx
// App.tsx
const anyModalOpen = showInventory || showCooking || showRecipeBook ||
                     showHelpBrowser || activeNPC || showShop;

{isTouchDevice && !anyModalOpen && (
  <TouchControls ... />
)}
```

**Alternative**: Fade controls to 20% opacity instead of hiding completely.

### Files to Modify

| File | Changes |
|------|---------|
| `components/GameUIControls.tsx` | Remove satchel image |
| `components/HUD.tsx` | Add inventory button, safe area |
| `components/TouchControls.tsx` | Add compact mode, safe area, reorganise buttons |
| `App.tsx` | Pass compact/modal props, hide controls during modals |
| `index.html` | Add `viewport-fit=cover` |

---

## Phase 1: Critical Touch Functionality (P0)

### 1.1 Enable Touch Interactions on Canvas

**Problem**: The radial menu system is click-based and disabled on touch devices via `enabled: !isTouchDevice` in `useMouseControls.ts`.

**Solution**: Enable touch-based canvas interaction.

```typescript
// hooks/useMouseControls.ts - Change detection
const handleCanvasInteraction = (screenX: number, screenY: number) => {
  // Convert screen coords to tile coords
  // Show radial menu at touch position
};

// Add touch event listener alongside mouse
canvas.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  handleCanvasInteraction(touch.clientX, touch.clientY);
});
```

**Implementation Steps**:
1. Create unified `useCanvasInteraction.ts` hook that handles both mouse and touch
2. Remove `enabled: !isTouchDevice` flag
3. Add touch event handling with proper coordinate translation
4. Prevent touch event propagation to D-Pad when interacting with game canvas
5. Test radial menu appears on tap

**Files to Modify**:
- `hooks/useMouseControls.ts` → Rename to `hooks/useCanvasInteraction.ts`
- `App.tsx` - Update hook usage

---

## Phase 2: Essential UI Buttons (P1)

### 2.1 Add Help Button

**Problem**: F1 key opens Help Browser, but no touch equivalent exists.

**Solution**: Add a help button (?) in the HUD or touch controls.

**Design**:
```
┌─────────────────────────────────────┐
│  💰 100g        🏡 Village    [?]   │  ← Add help button
│  🌾 Hoe                             │
└─────────────────────────────────────┘
```

**Implementation**:
- Add to `components/HUD.tsx` near the top-right
- Icon: `?` or `📖` (book)
- Size: 32×32px mobile, 40×40px tablet
- Position: Top-right, to the left of clocks

### 2.2 Add Inventory Button

**Problem**: Inventory only accessible via keyboard (I) or tiny satchel image.

**Solution**: Add prominent inventory button in touch controls.

**Design**:
```
┌─────────────────────────────────────┐
│                                     │
│   [↑]                     [📦] [E]  │  ← Inventory + Action
│ [←][↓][→]                           │
│                                     │
└─────────────────────────────────────┘
```

**Implementation**:
- Add to `components/TouchControls.tsx`
- Icon: 🎒 or 📦 (inventory/bag)
- Size: Same as action button (56-64px)
- Position: Left of action button

### 2.3 Quick Slot Selector

**Problem**: Number keys 1-9 for tool selection not available on touch.

**Solution**: Add horizontal tool bar or swipe-to-switch.

**Option A - Tool Bar** (Recommended):
```
┌─────────────────────────────────────┐
│ [🔨][🌾][🚿][🧺][🌱][🌱][🌱]      │  ← Scrollable tool bar
│                                     │
│   D-Pad                    Actions  │
└─────────────────────────────────────┘
```

**Option B - Swipe to Switch**:
- Swipe left/right on equipped item to cycle
- Long-press to show full selector

**Implementation**:
- Create new component `components/TouchToolBar.tsx`
- Render above touch controls (or below HUD)
- Show currently equipped item highlighted
- Tap to equip, scroll horizontally for more slots

---

## Phase 3: Responsive UI Components (P1-P2)

### 3.1 HelpBrowser Responsive Layout

**Problem**: Fixed 256px sidebar doesn't work on mobile portrait.

**Solution**: Collapsible sidebar with mobile-first design.

**Mobile Layout** (< 768px):
```
┌─────────────────────────────────────┐
│ [←] Getting Started              [×]│
├─────────────────────────────────────┤
│                                     │
│  # Getting Started                  │
│                                     │
│  Welcome to Twilight Game...        │
│                                     │
│  [📑 Topics ▼]  ← Tap to show menu  │
└─────────────────────────────────────┘
```

**Tablet/Desktop Layout** (≥ 768px):
```
┌──────────┬──────────────────────────┐
│ Topics   │ # Getting Started        │
│ ──────── │                          │
│ ▶ Guide  │ Welcome to Twilight...   │
│ ▶ Maps   │                          │
│ ▶ Time   │                          │
└──────────┴──────────────────────────┘
```

**Implementation**:
- Add state: `const [sidebarOpen, setSidebarOpen] = useState(false)`
- Use `md:` breakpoint for layout switch
- Mobile: Sidebar overlays content when open
- Add burger menu icon on mobile

### 3.2 HUD Responsive Scaling

**Problem**: Clocks fixed at 70px, location text doesn't scale.

**Solution**: Responsive sizing with Tailwind classes.

```tsx
// Current (bad)
<AnalogClock size={70} />

// Fixed (good)
<AnalogClock size="responsive" className="w-12 h-12 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px]" />
```

**Implementation**:
- Update `AnalogClock.tsx` and `SundialClock.tsx` to accept responsive sizing
- Add `text-[10px] sm:text-xs` to location text
- Test on various screen sizes

### 3.3 Touch Controls During Dialogue

**Problem**: All touch controls hidden when `activeNPC` is set.

**Current Code**:
```tsx
{isTouchDevice && !activeNPC && (
  <TouchControls ... />
)}
```

**Solution**: Keep essential controls visible during dialogue.

```tsx
{isTouchDevice && (
  <TouchControls
    dialogueMode={!!activeNPC}
    // In dialogue mode: hide D-Pad, show inventory/close buttons
  />
)}
```

**Implementation**:
- Add `dialogueMode` prop to TouchControls
- In dialogue mode:
  - Hide D-Pad (can't move during dialogue)
  - Hide action button (E) (dialogue has its own buttons)
  - Show: Inventory, Help, Close/Skip
- Update TouchControls.tsx with conditional rendering

---

## Phase 4: Enhanced Touch Experience (P2-P3)

### 4.1 Gesture Support

**Pinch to Zoom** (Camera):
- Two-finger pinch adjusts camera zoom
- Limits: 0.5x to 2x zoom
- Double-tap to reset zoom

**Swipe Navigation**:
- Swipe down from top: Show HUD details (stats, full time)
- Swipe up from bottom: Show inventory quick view

**Long-Press**:
- Long-press on tile: Show tile info (debug mode only)
- Long-press on inventory item: Show item details

**Implementation**:
- Create `hooks/useGestures.ts`
- Use `hammer.js` or custom gesture detection
- Integrate with existing touch system

### 4.2 Safe Area Support

**Problem**: Notched devices (iPhone X+, iPad Pro) may have content behind notch or home indicator.

**Solution**: CSS environment variables.

```css
/* index.css or App.tsx styles */
.game-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.touch-controls {
  bottom: calc(48px + env(safe-area-inset-bottom));
}

.hud-top {
  top: calc(8px + env(safe-area-inset-top));
}
```

**Implementation**:
- Add meta tag: `<meta name="viewport" content="..., viewport-fit=cover">`
- Apply safe area padding to HUD and touch controls
- Test on notched device or simulator

### 4.3 Landscape Orientation

**Problem**: Touch controls positioned for portrait, may conflict with game canvas in landscape.

**Solution**: Orientation-aware layouts.

**Portrait Layout**:
```
┌─────────────────┐
│      HUD        │
│                 │
│   Game Canvas   │
│                 │
│  D-Pad   Action │
└─────────────────┘
```

**Landscape Layout**:
```
┌─────────────────────────────────────┐
│ HUD                                 │
│ ┌───┐                         ┌───┐ │
│ │D  │    Game Canvas          │Act│ │
│ │Pad│                         │ion│ │
│ └───┘                         └───┘ │
└─────────────────────────────────────┘
```

**Implementation**:
- Detect orientation: `window.matchMedia('(orientation: landscape)')`
- Adjust touch control positioning with `landscape:` Tailwind variant
- Consider screen.orientation API for locked orientation option

---

## Phase 5: Component-Specific Fixes (P2)

### 5.1 CookingInterface Mobile

**Issues**:
- Recipe list limited to `max-h-40` on small screens
- Category tabs may overflow

**Fixes**:
- Full-screen modal on mobile
- Bottom sheet for recipe selection
- Larger touch targets for ingredients

### 5.2 ShopUI Touch Support

**Issues**:
- Drag-and-drop based on mouse events
- Quantity slider hard to use on touch

**Fixes**:
- Tap-to-select instead of drag
- Stepper buttons (+/-) alongside slider
- Larger buy/sell buttons

### 5.3 Inventory Grid

**Issues**:
- 9-column grid may be cramped on small phones

**Fixes**:
- Responsive columns: `grid-cols-5 sm:grid-cols-7 md:grid-cols-9`
- Minimum slot size: 44×44px (Apple's minimum touch target)
- Zoom/pan if inventory overflows

### 5.4 RecipeBook Layout

**Issues**:
- Similar sidebar layout to HelpBrowser

**Fixes**:
- Apply same responsive pattern as HelpBrowser
- Collapsible recipe list on mobile
- Full-width recipe details

---

## Implementation Priority

### Sprint 0: Fix Overlap Issues (Do First!)
1. ⬜ Shrink satchel on mobile (64px default, expand on tap)
2. ⬜ Reposition satchel above touch controls on touch devices
3. ⬜ Hide dev buttons and debug panel on touch devices (desktop only)
4. ⬜ Add compact mode to TouchControls for small screens
5. ⬜ Add safe area insets (viewport-fit=cover)
6. ⬜ Hide touch controls when modals are open

### Sprint 1: Core Touch Functionality
1. ⬜ Enable canvas tap interactions (radial menu on touch)
2. ⬜ Add Help button to HUD
3. ⬜ Keep essential controls during dialogue

### Sprint 2: Responsive Layouts
1. ⬜ HelpBrowser responsive sidebar (collapsible on mobile)
2. ⬜ HUD responsive clocks and text
3. ⬜ TouchToolBar for quick slot selection (1-9 keys alternative)

### Sprint 3: Enhanced Experience
1. ⬜ Gesture support (pinch zoom, swipe navigation)
2. ⬜ Landscape orientation layouts
3. ⬜ CookingInterface mobile optimisation
4. ⬜ ShopUI tap-based interaction (replace drag-drop)

### Sprint 4: Polish
1. ⬜ RecipeBook responsive layout
2. ⬜ Inventory grid scaling (fewer columns on small screens)
3. ⬜ Animation/transition polish
4. ⬜ Accessibility improvements (touch target sizes ≥44px)

---

## Testing Guidelines

### Devices to Test
- **iPad** (primary target): iPad Air, iPad Pro (both orientations)
- **iPhone**: iPhone SE (small), iPhone 14 (medium), iPhone Pro Max (large)
- **Android**: Pixel 6, Samsung Galaxy Tab

### Test Cases

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Canvas tap | Tap on NPC | Radial menu appears |
| Help access | Tap help button | HelpBrowser opens |
| Inventory access | Tap inventory button | Inventory modal opens |
| Tool switch | Tap tool in toolbar | Tool equips, HUD updates |
| Dialogue + inventory | Open dialogue, tap inventory | Inventory opens over dialogue |
| Landscape mode | Rotate device | Controls reposition correctly |
| Safe area | Use notched device | No content behind notch |
| Zoom | Pinch on canvas | Camera zooms smoothly |

### Browser Testing
- Safari (iOS) - Primary
- Chrome (iOS)
- Safari (iPadOS)
- Chrome (Android)
- Firefox (Android)

---

## Technical Notes

### Touch Event Handling
```typescript
// Prevent default to avoid scroll/zoom conflicts
element.addEventListener('touchstart', (e) => {
  e.preventDefault();
}, { passive: false });

// Use touch identifier for multi-touch tracking
const touch = e.changedTouches[0];
const touchId = touch.identifier;
```

### Coordinate Translation
```typescript
// Convert touch coordinates to game tile coordinates
const rect = canvas.getBoundingClientRect();
const touchX = touch.clientX - rect.left;
const touchY = touch.clientY - rect.top;
const tileX = Math.floor((touchX + cameraX) / TILE_SIZE);
const tileY = Math.floor((touchY + cameraY) / TILE_SIZE);
```

### Feature Detection
```typescript
// Prefer feature detection over user agent
const supportsTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const supportsPressure = 'onpointerdown' in window && 'pressure' in new PointerEvent('pointerdown');
```

---

## Success Metrics

- **Playability**: Complete farm cycle (plant → water → harvest) using only touch
- **Discoverability**: All features accessible without keyboard
- **Responsiveness**: UI usable on 320px wide screens
- **Performance**: 60 FPS maintained with touch controls
- **Accessibility**: Touch targets ≥ 44×44px

---

## Related Documentation

- [Touch Controls Architecture](./CONTROLS.md) (to be created)
- [Responsive Design Patterns](./RESPONSIVE.md) (to be created)
- [CLAUDE.md - Touch/iPad Support section](../CLAUDE.md#touchipad-support)
