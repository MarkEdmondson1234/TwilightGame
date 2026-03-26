/**
 * ThoughtBubbleLayer
 *
 * Renders a thought bubble above an NPC in PixiJS world space.
 * Lives inside the depthSortedContainer so it moves correctly with the
 * camera and scales correctly with the stage zoom — no viewport maths needed.
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE, PLAYER_SIZE } from '../../constants';
import type { NPC } from '../../types';
import { textureManager } from '../TextureManager';

// Bubble dimensions in world pixels (TILE_SIZE = 64, so ~1.5 × 1 tiles)
const BUBBLE_W = 96;
const BUBBLE_H = 64;

export class ThoughtBubbleLayer {
  private container: PIXI.Container;
  private graphics: PIXI.Graphics;
  private itemSprite: PIXI.Sprite;
  private nameLabel: PIXI.Text;
  private lastItemUrl: string | null = null;

  constructor() {
    this.container = new PIXI.Container();
    this.container.visible = false;
    // Above all depth-sorted entities on any map (max feetY*10 ≈ 500)
    this.container.zIndex = 9000;

    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);

    this.itemSprite = new PIXI.Sprite();
    this.itemSprite.anchor.set(0.5, 0.5);
    this.container.addChild(this.itemSprite);

    this.nameLabel = new PIXI.Text({
      text: '',
      style: new PIXI.TextStyle({
        fontSize: 9,
        fill: 0x4a3728,
        fontFamily: 'Georgia, serif',
      }),
    });
    this.nameLabel.anchor.set(0.5, 1.0);
    this.container.addChild(this.nameLabel);
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  async show(
    npc: NPC,
    itemImageUrl: string,
    npcName: string,
    tileSize: number = TILE_SIZE,
  ): Promise<void> {
    const npcScale = npc.scale ?? 3.0;
    const spriteHalfHeight = (PLAYER_SIZE * npcScale * tileSize) / 2;

    // Position the container so the triangle tip appears just above the NPC sprite
    // container origin = top-left of the bubble
    this.container.x = npc.position.x * tileSize - BUBBLE_W / 2;
    this.container.y = npc.position.y * tileSize - spriteHalfHeight - BUBBLE_H - 14;

    this.drawBubble();

    // NPC name label sits above the oval
    this.nameLabel.text = npcName;
    this.nameLabel.x = BUBBLE_W / 2;
    this.nameLabel.y = -2;

    // Load item texture (cached after first load)
    if (itemImageUrl !== this.lastItemUrl) {
      this.lastItemUrl = itemImageUrl;
      try {
        const texture = await textureManager.loadTexture(itemImageUrl, itemImageUrl);
        if (texture) {
          this.itemSprite.texture = texture;
        }
      } catch {
        // keep previous texture
      }
    }

    const iconSize = BUBBLE_H - 18;
    this.itemSprite.x = BUBBLE_W / 2;
    this.itemSprite.y = BUBBLE_H / 2;
    this.itemSprite.width = iconSize;
    this.itemSprite.height = iconSize;

    this.container.visible = true;
  }

  private drawBubble(): void {
    const g = this.graphics;
    g.clear();

    // Oval body
    g.ellipse(BUBBLE_W / 2, BUBBLE_H / 2, BUBBLE_W / 2, BUBBLE_H / 2);
    g.fill({ color: 0xfffcf0, alpha: 0.97 });
    g.ellipse(BUBBLE_W / 2, BUBBLE_H / 2, BUBBLE_W / 2, BUBBLE_H / 2);
    g.stroke({ color: 0xc8b89a, width: 2 });

    // Triangle pointer (pointing down toward the NPC)
    g.poly([
      BUBBLE_W / 2 - 7, BUBBLE_H,
      BUBBLE_W / 2 + 7, BUBBLE_H,
      BUBBLE_W / 2,     BUBBLE_H + 11,
    ]);
    g.fill({ color: 0xfffcf0, alpha: 0.97 });
    // Border lines for the triangle sides (not closing the base — that joins the oval)
    g.moveTo(BUBBLE_W / 2 - 7, BUBBLE_H);
    g.lineTo(BUBBLE_W / 2, BUBBLE_H + 11);
    g.lineTo(BUBBLE_W / 2 + 7, BUBBLE_H);
    g.stroke({ color: 0xc8b89a, width: 2 });
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
