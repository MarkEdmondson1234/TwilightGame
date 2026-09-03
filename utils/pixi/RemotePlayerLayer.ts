/**
 * RemotePlayerLayer - PixiJS rendering for other players.
 *
 * Structurally a sibling of NPCLayer: remote players are, for rendering
 * purposes, NPCs we do not control. Sprites go into the shared depth-sorted
 * container so a remote player passes correctly behind and in front of trees,
 * buildings and the local player, and the camera comes for free with it.
 *
 * Each player gets three display objects — sprite, name tag, and an emote
 * bubble that is only made visible while an emote is running.
 *
 * Usage:
 *   const layer = new RemotePlayerLayer();
 *   layer.setDepthContainer(depthSortedContainer);
 *   app.stage.addChild(layer.getContainer());
 *   layer.renderRemotePlayers(players, characterScale, gridOffset, tileSize);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, PLAYER_SIZE } from '../../constants';
import type { Position } from '../../types';
import { textureManager } from '../TextureManager';
import { PixiLayer } from './PixiLayer';
import { Z_DEPTH_SORTED_BASE } from '../../zIndex';
import { getRemoteSpriteInfo } from '../../multiplayer/remoteSprites';
import { getEmoteIcon } from '../../multiplayer/emotes';
import { PlayerSpeechBubble } from './PlayerSpeechBubble';
import type { RemotePlayer } from '../../multiplayer/types';

/** Same feet offset PlayerSprite uses, so remote and local players sort alike. */
const PLAYER_FEET_OFFSET = 0.8;

/** Name tag sits this far above the player's centre, in tiles. */
const NAME_TAG_OFFSET_TILES = 0.85;

/** Emote bubble sits above the name tag. */
const EMOTE_OFFSET_TILES = 1.35;

/** Chat bubbles sit above the emote, which sits above the name tag. */
const CHAT_OFFSET_TILES = 1.35;

interface RemotePlayerDisplay {
  sprite: PIXI.Sprite;
  nameTag: PIXI.Text;
  emote: PIXI.Text;
  chat: PlayerSpeechBubble;
  currentSpriteUrl: string | null;
  currentName: string | null;
}

export class RemotePlayerLayer extends PixiLayer {
  private displays = new Map<string, RemotePlayerDisplay>();
  private depthContainer: PIXI.Container | null = null;
  /** Bubble for the local player's own chat message */
  private localChatBubble: PlayerSpeechBubble | null = null;

  /** Bubble for the local player's own emote — immediate feedback on pressing one */
  private localEmoteText: PIXI.Text | null = null;

  constructor() {
    super(Z_DEPTH_SORTED_BASE, true);
  }

  /**
   * Use the shared depth-sorted container so remote players interleave with
   * sprites, NPCs and the local player rather than sitting in a flat layer.
   */
  setDepthContainer(container: PIXI.Container): void {
    this.depthContainer = container;
    for (const display of this.displays.values()) {
      for (const object of [display.sprite, display.nameTag, display.emote, display.chat.container]) {
        if (object.parent === this.container) {
          this.container.removeChild(object);
          container.addChild(object);
        }
      }
    }
    if (this.localEmoteText && this.localEmoteText.parent === this.container) {
      this.container.removeChild(this.localEmoteText);
      container.addChild(this.localEmoteText);
    }
  }

  private getTargetContainer(): PIXI.Container {
    return this.depthContainer ?? this.container;
  }

  private createDisplay(): RemotePlayerDisplay {
    const target = this.getTargetContainer();

    const sprite = new PIXI.Sprite();
    sprite.anchor.set(0.5, 0.5);
    sprite.visible = false;
    target.addChild(sprite);

    const nameTag = new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 15,
        fontWeight: '600',
        fill: 0xffffff,
        stroke: { color: 0x2b2b3a, width: 4, join: 'round' },
        align: 'center',
      },
    });
    nameTag.anchor.set(0.5, 1);
    nameTag.visible = false;
    // Names are UI, not world art: keep them a constant on-screen size rather
    // than letting them scale with the map's characterScale.
    nameTag.resolution = 2;
    target.addChild(nameTag);

    const emote = new PIXI.Text({
      text: '',
      style: { fontFamily: 'system-ui, sans-serif', fontSize: 28, align: 'center' },
    });
    emote.anchor.set(0.5, 1);
    emote.visible = false;
    emote.resolution = 2;
    target.addChild(emote);

    const chat = new PlayerSpeechBubble(target);

    return { sprite, nameTag, emote, chat, currentSpriteUrl: null, currentName: null };
  }

  /**
   * Render every remote player. Called once per frame from the game loop, not
   * from a React effect — remote positions must never cost a re-render.
   */
  async renderRemotePlayers(
    players: RemotePlayer[],
    characterScale: number = 1.0,
    gridOffset?: Position,
    tileSize: number = TILE_SIZE
  ): Promise<void> {
    const offsetX = gridOffset?.x ?? 0;
    const offsetY = gridOffset?.y ?? 0;
    const rendered = new Set<string>();

    for (const player of players) {
      rendered.add(player.uid);

      let display = this.displays.get(player.uid);
      if (!display) {
        display = this.createDisplay();
        this.displays.set(player.uid, display);
      }

      const { url, spriteScale, shouldFlip } = getRemoteSpriteInfo(player);

      if (display.currentSpriteUrl !== url) {
        try {
          const texture = await textureManager.loadTexture(url, url);
          if (texture) {
            display.sprite.texture = texture;
            display.currentSpriteUrl = url;
          }
        } catch (error) {
          console.warn(`[RemotePlayerLayer] Failed to load texture: ${url}`, error);
          continue;
        }
      }

      const x = player.position.x * tileSize + offsetX;
      const y = player.position.y * tileSize + offsetY;
      const size = PLAYER_SIZE * spriteScale * characterScale * tileSize;

      display.sprite.x = x;
      display.sprite.y = y;

      // Scale rather than width/height, so the horizontal flip survives.
      if (display.sprite.texture && display.sprite.texture.width > 0) {
        const scaleX = size / display.sprite.texture.width;
        const scaleY = size / display.sprite.texture.height;
        display.sprite.scale.x = shouldFlip ? -scaleX : scaleX;
        display.sprite.scale.y = scaleY;
      } else {
        display.sprite.width = size;
        display.sprite.height = size;
      }

      const feetY = player.position.y + PLAYER_FEET_OFFSET;
      const zIndex = Z_DEPTH_SORTED_BASE + Math.floor(feetY * 10);
      display.sprite.zIndex = zIndex;
      display.sprite.visible = true;

      if (display.currentName !== player.name) {
        display.nameTag.text = player.name;
        display.currentName = player.name;
      }
      display.nameTag.x = x;
      display.nameTag.y = y - NAME_TAG_OFFSET_TILES * tileSize * characterScale;
      // +1 keeps the tag above its own sprite without leapfrogging the player
      // standing one tile in front.
      display.nameTag.zIndex = zIndex + 1;
      display.nameTag.visible = true;

      const icon = player.emote ? getEmoteIcon(player.emote) : null;
      if (icon) {
        display.emote.text = icon;
        display.emote.x = x;
        display.emote.y = y - EMOTE_OFFSET_TILES * tileSize * characterScale;
        display.emote.zIndex = zIndex + 2;
        display.emote.visible = true;
      } else {
        display.emote.visible = false;
      }

      display.chat.update(
        player.chat,
        x,
        y - CHAT_OFFSET_TILES * tileSize * characterScale,
        zIndex + 3
      );
    }

    // Players who left this frame: hide rather than destroy, since they may
    // well be back (a brief disconnect, or walking in and out of view).
    for (const [uid, display] of this.displays) {
      if (rendered.has(uid)) continue;
      display.sprite.visible = false;
      display.nameTag.visible = false;
      display.emote.visible = false;
      display.chat.update(null, 0, 0, 0);
    }
  }

  /**
   * Draw the local player's own emote bubble. Uses the same positioning as a
   * remote player's, so your wave looks exactly like everyone else's.
   */
  renderLocalEmote(
    emote: string | null,
    position: Position,
    characterScale: number = 1.0,
    gridOffset?: Position,
    tileSize: number = TILE_SIZE
  ): void {
    const icon = emote ? getEmoteIcon(emote) : null;

    if (!icon) {
      if (this.localEmoteText) this.localEmoteText.visible = false;
      return;
    }

    if (!this.localEmoteText) {
      this.localEmoteText = new PIXI.Text({
        text: '',
        style: { fontFamily: 'system-ui, sans-serif', fontSize: 28, align: 'center' },
      });
      this.localEmoteText.anchor.set(0.5, 1);
      this.localEmoteText.resolution = 2;
      this.getTargetContainer().addChild(this.localEmoteText);
    }

    const x = position.x * tileSize + (gridOffset?.x ?? 0);
    const y = position.y * tileSize + (gridOffset?.y ?? 0);

    this.localEmoteText.text = icon;
    this.localEmoteText.x = x;
    this.localEmoteText.y = y - EMOTE_OFFSET_TILES * tileSize * characterScale;
    this.localEmoteText.zIndex = Z_DEPTH_SORTED_BASE + Math.floor((position.y + PLAYER_FEET_OFFSET) * 10) + 2;
    this.localEmoteText.visible = true;
  }

  /**
   * Draw the local player's own speech bubble, so saying something gives
   * immediate feedback rather than a silent hope that it reached anybody.
   */
  renderLocalChat(
    text: string | null,
    position: Position,
    characterScale: number = 1.0,
    gridOffset?: Position,
    tileSize: number = TILE_SIZE
  ): void {
    if (!text && !this.localChatBubble) return;

    if (!this.localChatBubble) {
      this.localChatBubble = new PlayerSpeechBubble(this.getTargetContainer());
    }

    const x = position.x * tileSize + (gridOffset?.x ?? 0);
    const y = position.y * tileSize + (gridOffset?.y ?? 0);

    this.localChatBubble.update(
      text,
      x,
      y - CHAT_OFFSET_TILES * tileSize * characterScale,
      Z_DEPTH_SORTED_BASE + Math.floor((position.y + PLAYER_FEET_OFFSET) * 10) + 3
    );
  }

  /** Drop the display objects for players we no longer track. */
  prune(activeUids: Set<string>): void {
    for (const [uid, display] of this.displays) {
      if (activeUids.has(uid)) continue;
      this.destroyDisplay(display);
      this.displays.delete(uid);
    }
  }

  private destroyDisplay(display: RemotePlayerDisplay): void {
    for (const object of [display.sprite, display.nameTag, display.emote]) {
      if (object.parent) object.parent.removeChild(object);
      object.destroy();
    }
    display.chat.destroy();
  }

  /** Clear all remote player sprites (required by PixiLayer). */
  clear(): void {
    for (const display of this.displays.values()) {
      this.destroyDisplay(display);
    }
    this.displays.clear();

    if (this.localEmoteText) {
      if (this.localEmoteText.parent) this.localEmoteText.parent.removeChild(this.localEmoteText);
      this.localEmoteText.destroy();
      this.localEmoteText = null;
    }

    this.localChatBubble?.destroy();
    this.localChatBubble = null;
  }
}
