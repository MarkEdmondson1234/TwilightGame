# PixiJS rendering layers

The world is drawn by PixiJS (WebGL) when `USE_PIXI_RENDERER` is on in `constants.ts` (it is).
`hooks/usePixiRenderer.ts` owns the `PIXI.Application` and drives every layer from its
per-frame `updateAnimations()`. Texture memory rules — scoping per map, half-size sprites on
phones, mipmaps off on mobile — are in CLAUDE.md under **Texture Memory**; read that before
touching asset loading.

## Layers — check here before writing a new one

| File                                                                                        | What it draws                                                                                                    |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PixiLayer.ts`                                                                              | Abstract base class for layers                                                                                   |
| `PixiLayerManager.ts`                                                                       | Coordinates all layers                                                                                           |
| `TileLayer.ts`                                                                              | Background tiles (colour fill + tile sprites), farm plot states                                                  |
| `SpriteLayer.ts`                                                                            | Multi-tile sprites (furniture, buildings, trees), background and foreground passes                               |
| `BackgroundImageLayer.ts`                                                                   | Painted room backgrounds for interiors                                                                           |
| `RoomPropsLayer.ts`                                                                         | Static scenery from `MapDefinition.props`                                                                        |
| `PlacedItemsLayer.ts`                                                                       | Placed food, furniture and decorations                                                                           |
| `PlayerSprite.ts`                                                                           | The local player                                                                                                 |
| `NPCLayer.ts`                                                                               | NPCs                                                                                                             |
| `RemotePlayerLayer.ts`                                                                      | Other players (multiplayer)                                                                                      |
| `EmoteSprite.ts`, `PlayerSpeechBubble.ts`, `ThoughtBubbleLayer.ts`, `speechBubbleLayout.ts` | Emotes, chat and thought bubbles                                                                                 |
| `ShadowLayer.ts`, `CloudShadowLayer.ts`                                                     | Sprite shadows; drifting cloud shadows                                                                           |
| `AnimationLayer.ts`                                                                         | Tile-triggered `AnimatedSprite`s from optimiser sprite sheets                                                    |
| `WeatherLayer.ts`, `WeatherTint.ts`, `WeatherVane.ts`                                       | Weather particles, full-screen weather wash, the vane                                                            |
| `DarknessLayer.ts`, `CaveDrips.ts`                                                          | Cave/mine darkness with torch light; dripping water                                                              |
| `ForegroundParallaxLayer.ts`                                                                | Tree crowns framing the bottom of the screen                                                                     |
| `HighlightLayer.ts`                                                                         | Tile hover highlight                                                                                             |
| `maskUtils.ts`                                                                              | Safe mask attach/detach — use it; destroying a mask sprite while still assigned crashes with "this.mask is null" |
| `contextRecovery.ts`                                                                        | WebGL context-loss recovery                                                                                      |

## Rules

- **Linear scaling only** (`scaleMode: 'linear'`). The art is hand-drawn, not pixel art.
- **Z-order** comes from `zIndex.ts` constants, never literals. Depth-sorted characters use
  `Z_PLAYER + Math.floor(feetY)`.
- **Reuse sprites** — update texture/position; never create or destroy per frame. Cull
  off-screen sprites with `visible = false`. Map changes do a full cleanup and rebuild.
- **`textureManager.getTexture()` may miss** and schedules the load; skip drawing that frame
  rather than assuming the map's prefetch set is complete.
- **Sizing from `texture.width`** must multiply by `textureManager.getVariantScale(url)`, or a
  phone (half-size variant) draws it at half size.
- **Per-frame values stay out of React state** — read refs (`playerPosRef`, `remotePlayerManager`).

To add a layer, use the `add-pixi-component` skill.
