/**
 * PlayerSpeechBubble — one chat bubble floating above a character.
 *
 * Lives in world space inside the depth-sorted container, like ThoughtBubbleLayer,
 * so it moves with the camera and scales with zoom without any viewport maths.
 *
 * Drawn rather than textured because the text decides the size: a bubble has to
 * fit whatever was typed, and a nine-slice sprite for a handful of words would
 * be more machinery than a rounded rectangle deserves.
 */

import * as PIXI from 'pixi.js';

/** Padding around the text, in world pixels. */
const PADDING_X = 10;
const PADDING_Y = 6;
/** Height of the little tail pointing down at the speaker's head. */
const TAIL_HEIGHT = 8;
const TAIL_WIDTH = 12;
const CORNER_RADIUS = 10;
/** Longest a bubble gets before the text wraps, in world pixels. */
const MAX_WIDTH = 260;

export class PlayerSpeechBubble {
  readonly container: PIXI.Container;
  private background: PIXI.Graphics;
  private label: PIXI.Text;
  private renderedText: string | null = null;

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    this.container.visible = false;

    this.background = new PIXI.Graphics();
    this.container.addChild(this.background);

    this.label = new PIXI.Text({
      text: '',
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 15,
        fill: 0x2b2b3a,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: MAX_WIDTH,
      },
    });
    this.label.anchor.set(0.5, 0);
    // Text is UI, not world art: render at 2x so it stays crisp when the map
    // is zoomed, the same choice the name tags make.
    this.label.resolution = 2;
    this.container.addChild(this.label);

    parent.addChild(this.container);
  }

  /**
   * Show `text` with the bubble's tail at (x, y) — the point just above the
   * speaker's head. Pass null to hide.
   */
  update(text: string | null, x: number, y: number, zIndex: number): void {
    if (!text) {
      this.container.visible = false;
      return;
    }

    // Re-drawing the rounded rect every frame would be wasteful; the shape only
    // changes when the words do.
    if (text !== this.renderedText) {
      this.renderedText = text;
      this.label.text = text;
      this.redraw();
    }

    this.container.x = x;
    this.container.y = y;
    this.container.zIndex = zIndex;
    this.container.visible = true;
  }

  private redraw(): void {
    const width = this.label.width + PADDING_X * 2;
    const height = this.label.height + PADDING_Y * 2;

    // The container's origin is the tail's tip, so everything is drawn above it.
    const top = -(height + TAIL_HEIGHT);

    this.background.clear();
    this.background.roundRect(-width / 2, top, width, height, CORNER_RADIUS);
    this.background.poly([
      -TAIL_WIDTH / 2,
      top + height - 1,
      TAIL_WIDTH / 2,
      top + height - 1,
      0,
      0,
    ]);
    this.background.fill({ color: 0xfdfaf3, alpha: 0.96 });
    this.background.stroke({ color: 0x8a7f6b, width: 2, alignment: 0.5 });

    this.label.x = 0;
    this.label.y = top + PADDING_Y;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
