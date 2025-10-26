# Colour Scheme Editor

Press **F4** to open the Colour Scheme Editor and customise the colours of your world!

## Overview

The Colour Scheme Editor lets you change the colours of tiles in the game - grass, water, paths, floors, walls, and more. Changes apply **instantly** so you can see how they look as you experiment.

## How Colours Work

The game uses a **layered colour system**:

1. **Base Colours** - The default colours during daytime
2. **Seasonal Variations** - Optional colour changes for each season
3. **Night Colours** - Darker colours applied at night

When you edit colours, you choose which layer to modify.

## Opening the Editor

Press **F4** to open the Colour Scheme Editor. You'll see:

- **Game is currently showing:** What season and time the game is displaying right now
- **You are editing:** Which colour layer you're currently modifying
- **Tile list:** All the different tile types you can colour (grass, water, etc.)

## Choosing What to Edit

At the top of the editor, you'll see buttons to select:

### Season
- **Base** - The default colours (used for all seasons unless overridden)
- **Spr** (Spring) - Colours during spring (Day 1-7)
- **Sum** (Summer) - Colours during summer (Day 8-14)
- **Aut** (Autumn) - Colours during autumn (Day 15-21)
- **Win** (Winter) - Colours during winter (Day 22-28)

The currently active season is marked with a **●** dot.

### Time of Day
- **Day** - Daytime colours (uses base colours + seasonal variations)
- **Night** - Night-time colours (darker override colours)

The currently active time is marked with a **●** dot.

**Tip:** When you open the editor, it automatically selects the season and time that's currently active in the game, so you can immediately see and edit the colours you're looking at!

## Editing Colours

The editor has two tabs:

### Quick Edit Tab ⚡

Simple interface for quick colour changes:

1. **Click on a tile type** (e.g., "Path" or "Grass")
2. You'll see three colour swatches:
   - **Current** - The colour currently in use for this tile
   - **Default** - The original colour from the game
   - **Choose** - Click to pick a new colour
3. **Click "Choose"** to open the colour palette picker
4. **Select a colour** from the palette or use the custom colour picker
5. Changes apply **instantly** - walk around to see them!

**Tile Information:**
- Each tile shows how many times it appears on the current map
- Only tiles that are actually visible on this map are shown by default

### Advanced Tab 🔧

Full control over the colour palette:

- View and edit **all palette colours** (the master colour palette)
- See which tiles use each colour
- Make global colour changes that affect multiple tiles
- Edit seasonal and time-of-day variations for each tile type

## Understanding Tile Colours

Some tiles you can colour:

- **Grass** - The main outdoor ground colour
- **Path** - Background colour behind stepping stones
- **Water** - Ponds, rivers, and lakes
- **Floor** - Indoor floor tiles
- **Wall** - Indoor wall tiles
- **Carpet** - Indoor carpet/rug tiles
- **Rock** - Background colour behind rock sprites
- **Mushroom** - Background colour behind mushroom decorations
- **Special** - Mine entrances and shop doors
- **Furniture** - Background colour behind tables, chairs, etc.

**Note:** Many tiles have sprites (images) that cover the background. The background colour shows through transparent parts of the sprite or around the edges.

## Day and Night Colours

**Daytime:** The game uses base colours combined with seasonal variations.

**Night-time:** The game applies special darker colours to create atmospheric night-time lighting. Currently, only night colours are customised - daytime uses the base colours.

**Example:**
- **Grass during Summer Day:** Uses "olive" (warm summer green)
- **Grass during Summer Night:** Uses "moss" (darker green for night)

This creates a realistic day/night cycle where everything gets darker when the sun goes down!

## Tips and Tricks

### Reset to Original
Click the **↺ Reset** button to restore the default colours if you want to start over.

### Export Your Colours
Click the **▼ Export** button to copy the colour scheme code. You can save this to restore your custom colours later!

### See Your Changes
**Walk around!** The editor updates colours instantly, so move your character to different areas to see how your colour changes look in different locations.

### Focus on What Matters
The editor only shows tiles that are actually on the current map by default. This keeps things simple and focused.

### Match Colours
Many tile types work well when they match:
- **Rock** usually matches **Grass** (so rocks blend into the ground)
- **Mushroom** usually matches **Grass** (so mushrooms feel natural)
- **Bush** and **Tree** backgrounds usually match **Grass**

### Night Colours
When editing night colours, choose **darker versions** of your base colours. This creates realistic lighting without making it too hard to see.

## Keyboard Shortcuts

- **F4** - Open/close Colour Scheme Editor
- **ESC** - Close the editor
- **F1** - Open help menu (this document!)

## Seasonal Colour Examples

Here are some ideas for seasonal variations:

**Grass Colours:**
- Spring: Bright green (fresh growth)
- Summer: Warm olive green (lush and full)
- Autumn: Golden khaki (falling leaves)
- Winter: Cool slate grey (frost and snow)

**Water Colours:**
- Spring/Summer: Bright sky blue (warm weather)
- Autumn: Darker teal (cooler weather)
- Winter: Pale periwinkle (frozen ice)

## Troubleshooting

**Q: I changed a colour but don't see the change?**

A: Check which season/time you're editing! You might be editing "Night" colours but the game is showing "Day", or vice versa. Look at the "You are editing:" header to confirm.

**Q: The tile I want to colour isn't showing in the list?**

A: The editor only shows tiles that exist on the current map. Try going to a different map (like the village) where more tile types are present.

**Q: I want to make everything one colour?**

A: Use the Advanced tab to edit palette colours. This changes the master colour, which affects all tiles using that colour.

**Q: How do I undo my changes?**

A: Click the **↺ Reset** button to restore all colours to their defaults.

## Related Documentation

For more technical details about the colour system:
- Press **F1** and navigate to "Colour System" for the full technical guide
- Learn about the four-layer colour system
- Understand how seasonal and time-of-day modifiers work
- See the complete palette reference

---

**Have fun customising your world! Remember, you can always reset to defaults if you want to start fresh.**
