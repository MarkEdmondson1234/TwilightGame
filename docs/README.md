# Developer docs

Where documentation lives:

| Folder                 | What                                                                                        | Notes                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `docs/` (here)         | Developer guides for current systems                                                        | Start with `ARCHITECTURE_GOTCHAS.md`                                                    |
| `public/docs/`         | **Player-facing** help pages shown in the F1 Help Browser                                   | Listed in `data/helpDocs.ts`; must live in `public/` to ship (`tests/helpDocs.test.ts`) |
| `docs/history/`        | Archive — dated plans, investigations, review screenshots                                   | Not current; check the code first                                                       |
| `design_docs/planned/` | Design docs for planned and in-progress features                                            | Some have shipped — check each doc's Status line                                        |
| Next to the code       | Subsystem guides: `utils/interactions/README.md`, `utils/pixi/README.md`, `tests/README.md` | Read before changing that subsystem                                                     |

## Guides

| Doc                                                                                                        | Covers                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [ARCHITECTURE_GOTCHAS.md](ARCHITECTURE_GOTCHAS.md)                                                         | **Read first** — non-obvious bugs and root causes (coordinates, clicks, audio, z-index) |
| [MAP_GUIDE.md](MAP_GUIDE.md)                                                                               | Creating maps                                                                           |
| [COORDINATE_GUIDE.md](COORDINATE_GUIDE.md), [POSITION_VALIDATION.md](POSITION_VALIDATION.md)               | Positions and validation                                                                |
| [ASSETS.md](ASSETS.md)                                                                                     | Asset layout and the image optimiser                                                    |
| [TILE_BACKGROUND_COLORS.md](TILE_BACKGROUND_COLORS.md), [COLOR_SYSTEM.md](COLOR_SYSTEM.md)                 | Colour schemes and tile backgrounds                                                     |
| [BUILDINGS.md](BUILDINGS.md)                                                                               | Buildings                                                                               |
| [SAVE_SYSTEM.md](SAVE_SYSTEM.md)                                                                           | Saves and localStorage                                                                  |
| [SEASONAL_NPC_LOCATIONS.md](SEASONAL_NPC_LOCATIONS.md), [ADDING_SEASONAL_NPCS.md](ADDING_SEASONAL_NPCS.md) | Seasonal NPCs                                                                           |
| [AI_CONVERSATIONS_DEV.md](AI_CONVERSATIONS_DEV.md)                                                         | AI dialogue                                                                             |
| [EVENT_CHAINS_DEV.md](EVENT_CHAINS_DEV.md), [CUTSCENES.md](CUTSCENES.md)                                   | Event chains and cutscenes                                                              |
| [LAVA_LEAP.md](LAVA_LEAP.md), [skiing.md](skiing.md), [minecart-agility.md](minecart-agility.md)           | Mini-games                                                                              |
| [BLENDER_EFFECTS.md](BLENDER_EFFECTS.md)                                                                   | Blender-made effects                                                                    |
| [SESSION_DIAGNOSTICS.md](SESSION_DIAGNOSTICS.md)                                                           | Debugging a player session in Sentry                                                    |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md)                                                                         | Known issues                                                                            |

## Live work (dated — check status before relying on these)

| Doc                                                              | Status                                                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| [PENDING_CLEANUP.md](PENDING_CLEANUP.md)                         | Handoff list of cleanup work (referenced from `TODO.md`)             |
| [MOBILE_CRASH_INVESTIGATION.md](MOBILE_CRASH_INVESTIGATION.md)   | Open investigation into iPhone reloads                               |
| [MOBILE_INTERIOR_CAMERA_PLAN.md](MOBILE_INTERIOR_CAMERA_PLAN.md) | Mobile room camera — implemented in `utils/mobileInteriorFraming.ts` |
