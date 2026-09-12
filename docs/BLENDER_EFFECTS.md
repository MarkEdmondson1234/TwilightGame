# Blender effects: cave water

Blender supplies **water only**. The hand-drawn stone columns, cave pools and
crystals remain the original images. No new formation or prop artwork is generated.

## Current experiment

Stone columns have a small drip falling from a painted ledge to the base. Cave
pools have an occasional drop arriving from above, with a tiny splash and ripple.
The 24-frame sequence plays at 12 fps, followed by a quiet interval. Each map/anchor
has a deterministic phase and interval (roughly 7–9 seconds between drops), so
movement and re-rendering do not restart every drop together. Lava has no water effect.

`utils/pixi/CaveDrips.ts` attaches the water to the existing Pixi sprites. It uses
their size, depth and visibility, stops displaying water for reduced-motion users,
and clears its sprites and frame views on map changes. The atlas belongs to the
normal map texture residency system, not the always-loaded core set. The legacy
DOM sprite renderer does not show this experimental effect.

The runtime atlas is 1024×768 RGBA (about 3 MiB decoded before mipmaps), shared by
all drops. It is already rendered at its intended resolution and must **not** be
passed through the general tile/GIF resizer. `assets.ts` registers its source path.

## Edit or reproduce

Open `design_docs/blender/cave-drip.blend` in Blender. It contains the animated
water bead, two impact rings, three tiny splash droplets, camera and light; no
painted game assets. The saved scene uses an orthographic camera and transparent film.

To reproduce with Blender 5.2:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/blender/cave_drip.py -- --out /tmp/twilight-cave-drip
node scripts/blender/pack-cave-drip.mjs /tmp/twilight-cave-drip
make verify
```

The packer writes the runtime atlas and copies the editable scene into the repository.
Adjust placement, opacity and timing in `data/caveDrips.ts`. Its placement coordinates
are fractions of the painted sprite's full square canvas, including transparent padding.
Keep that padding intact when editing art or the attachments will shift.

## Collision correction

Stone column and mine crystal collision now occupies a shallow ground footprint
near the painted base, leaving room for the player to walk behind their upright
silhouettes. The player's own 0.8-tile collision width still contributes to clearance.
Cave pool bounds have a smaller inset rectangle to ease movement around their edges.
Visual sprite dimensions are unchanged. The renderer's existing depth sorting reads
the corrected footprint, so it also sorts players at the ground contact line.

Check all three sizes in a cave: walk behind columns and crystals, approach their
bases from the front, skirt pools, move the camera, then leave and re-enter. Water
should remain subtle and should never prevent movement. The movement regression
test exercises the real collision hook against all six solid formation sizes.

## Next: weather vane

The weather vane should use an artist-supplied drawing/design. Blender's role will
be a shallow animated support for that artwork. The current weather configuration
has particle velocities but no shared compass wind direction; weather-driven
turning therefore needs a small explicit behaviour model. No substitute vane art
or weather changes are included in this cave experiment.
