/**
 * PlayerSpeechBubble — one chat bubble floating above a character.
 *
 * Lives in world space inside the depth-sorted container, like ThoughtBubbleLayer,
 * so it moves with the camera and scales with zoom without any viewport maths.
 *
 * Drawn rather than textured because the text decides the size: a bubble has to
 * fit whatever was typed, and a nine-slice sprite for a handful of words would
 * be more machinery than a rounded rectangle deserves.
 *
 * One viewport exception: the camera follows the LOCAL player, so a remote
 * speaker standing high on OUR screen has less headroom than on their own. A
 * four-line bubble above their head would run off the top of our canvas and
 * look cut short even though it is drawn whole. When the bubble's top would
 * leave the canvas, it flips below the head with its tail pointing up — which
 * is why "one player saw her own message in full while the other saw it cut
 * short" (the speaker is always centred on their own screen, the listener's
 * view is not).
 */

import * as PIXI from 'pixi.js';

/** Padding around the text, in world pixels. */
const PADDING_X = 10;
const PADDING_Y = 6;
/** Height of the little tail pointing at the speaker's head. */
const TAIL_HEIGHT = 8;
const TAIL_WIDTH = 12;
const CORNER_RADIUS = 10;
/** Longest a bubble gets before the text wraps, in world pixels. */
const MAX_WIDTH = 260;

/** Decide from the tail's screen position which side of the speaker gets the bubble. */
export function bubbleFlipsBelow(tailTopScreenY: number): boolean {
  return tailTopScreenY < 0;
}

export class PlayerSpeechBubble {
  readonly container: PIXI.Container;
  private background: PIXI.Graphics;
  private label: PIXI.Text;
  private renderedText: string | null = null;
  private flipped = false;
  /** Scratch objects, so the per-frame flip check allocates nothing. */
  private readonly globalMatrix = new PIXI.Matrix();
  private readonly globalPoint = new PIXI.Point();
  private readonly scratchPoint = new PIXI.Point();

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

    // Position first: the flip decision reads the container's global transform,
    // which must reflect where the bubble is this frame.
    this.container.x = x;
    this.container.y = y;
    this.container.zIndex = zIndex;
    this.container.visible = true;

    // Re-drawing the rounded rect every frame would be wasteful; the shape only
    // changes when the words do — or when the bubble flips to the other side.
    const textChanged = text !== this.renderedText;
    if (textChanged) {
      this.renderedText = text;
      this.label.text = text;
    }
    const flipped = this.shouldFlipBelow();
    if (textChanged || flipped !== this.flipped) {
      this.flipped = flipped;
      this.redraw();
    }
  }

  /**
   * Whether the bubble should hang below the head instead of above it.
   *
   * Computes where the bubble's top edge lands on the canvas (the global
   * transform folds in the stage's zoom) and flips when it would be clipped.
   */
  /**
   * Whether the bubble should hang below the head instead of above it.
   *
   * Computes where the bubble's top edge would land on the canvas if drawn
   * above the head (the global transform folds in the stage's zoom) and flips
   * when it would be clipped. Always evaluates the above-layout, so the
   * decision is stable whatever side we drew on last frame.
   */
  private shouldFlipBelow(): boolean {
    // getGlobalTransform recomputes the parent chain (including the stage's
    // zoom) rather than trusting last render's worldTransform. label.height is
    // the live measured height, so the first frame decides correctly too.
    const matrix = this.container.getGlobalTransform(this.globalMatrix);
    const extent = this.label.height + PADDING_Y * 2 + TAIL_HEIGHT;
    const top = matrix.apply(this.scratchPoint.set(0, -extent), this.globalPoint);
    return bubbleFlipsBelow(top.y);
  }

  private redraw(): void {
    const width = this.label.width + PADDING_X * 2;
    const height = this.label.height + PADDING_Y * 2;

    // The container's origin is the tail's tip at the speaker's head. Above is
    // the default; below keeps the text on-screen when there is no sky left.
    const rectTop = this.flipped ? TAIL_HEIGHT : -(height + TAIL_HEIGHT);

    this.background.clear();
    this.background.roundRect(-width / 2, rectTop, width, height, CORNER_RADIUS);
    const tailBaseY = this.flipped ? rectTop + 1 : rectTop + height - 1;
    this.background.poly([-TAIL_WIDTH / 2, tailBaseY, TAIL_WIDTH / 2, tailBaseY, 0, 0]);
    this.background.fill({ color: 0xfdfaf3, alpha: 0.96 });
    this.background.stroke({ color: 0x8a7f6b, width: 2, alignment: 0.5 });

    this.label.x = 0;
    this.label.y = rectTop + PADDING_Y;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}