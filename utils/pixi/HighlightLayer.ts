/**
 * HighlightLayer - PixiJS layer for tile hover highlight
 *
 * Renders a semi-transparent coloured rectangle on the tile under the mouse
 * cursor, giving visual feedback about which tile will be targeted on click.
 * Colour varies by interaction category (farm, forage, transition, etc.).
 *
 * Uses a single PIXI.Graphics object that is repositioned and recoloured
 * as the mouse moves — no sprite creation or destruction per frame.
 *
 * Usage:
 *   const highlightLayer = new HighlightLayer();
 *   app.stage.addChild(highlightLayer.getContainer());
 *   highlightLayer.update(tileX, tileY, 'farm');
 *   highlightLayer.hide();
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { PixiLayer } from './PixiLayer';
import { Z_TILE_HIGHLIGHT } from '../../zIndex';

/** Interaction category used to determine highlight colour */
export type HighlightCategory =
  | 'none'
  | 'farm'
  | 'forage'
  | 'transition'
  | 'npc'
  | 'cooking'
  | 'pickup';

/** Fill colour (hex) per interaction category */
const FILL_COLORS: Record<HighlightCategory, number> = {
  none: 0xffffff,
  farm: 0x92400e,
  forage: 0x059669,
  transition: 0x3b82f6,
  npc: 0x60a5fa,
  cooking: 0xf59e0b,
  pickup: 0x10b981,
};

/** Fill alpha per category ('none' is more subtle) */
const FILL_ALPHA: Record<HighlightCategory, number> = {
  none: 0.12,
  farm: 0.25,
  forage: 0.25,
  transition: 0.25,
  npc: 0.25,
  cooking: 0.25,
  pickup: 0.25,
};

/** Stroke alpha (border) per category */
const STROKE_ALPHA: Record<HighlightCategory, number> = {
  none: 0.2,
  farm: 0.45,
  forage: 0.45,
  transition: 0.45,
  npc: 0.45,
  cooking: 0.45,
  pickup: 0.45,
};

const BORDER_WIDTH = 2;
const CORNER_RADIUS = 4;

export class HighlightLayer extends PixiLayer {
  private highlight: PIXI.Graphics;
  private currentTileX = -999;
  private currentTileY = -999;
  private currentCategory: HighlightCategory = 'none';
  private currentTooFar = false;

  constructor() {
    super(Z_TILE_HIGHLIGHT, false); // No child sorting needed — single graphic
    this.highlight = new PIXI.Graphics();
    this.highlight.visible = false;
    this.container.addChild(this.highlight);
  }

  /**
   * Update highlight position and colour.
   * When tooFar is true, shows border-only (no fill) with reduced opacity.
   * Only redraws if tile position, category, or tooFar changed.
   */
  update(tileX: number, tileY: number, category: HighlightCategory, tooFar = false): void {
    if (
      tileX === this.currentTileX &&
      tileY === this.currentTileY &&
      category === this.currentCategory &&
      tooFar === this.currentTooFar &&
      this.highlight.visible
    ) {
      return; // No change — skip redraw
    }

    this.currentTileX = tileX;
    this.currentTileY = tileY;
    this.currentCategory = category;
    this.currentTooFar = tooFar;

    const fillColor = FILL_COLORS[category];
    const strokeAlpha = tooFar ? 0.15 : STROKE_ALPHA[category];

    const x = tileX * TILE_SIZE;
    const y = tileY * TILE_SIZE;

    this.highlight.clear();

    // Border stroke (always shown, dimmer when too far)
    this.highlight.roundRect(
      x + BORDER_WIDTH / 2,
      y + BORDER_WIDTH / 2,
      TILE_SIZE - BORDER_WIDTH,
      TILE_SIZE - BORDER_WIDTH,
      CORNER_RADIUS
    );
    this.highlight.stroke({ width: BORDER_WIDTH, color: fillColor, alpha: strokeAlpha });

    // Fill only when in range
    if (!tooFar) {
      const fillAlpha = FILL_ALPHA[category];
      this.highlight.roundRect(
        x + BORDER_WIDTH,
        y + BORDER_WIDTH,
        TILE_SIZE - BORDER_WIDTH * 2,
        TILE_SIZE - BORDER_WIDTH * 2,
        CORNER_RADIUS
      );
      this.highlight.fill({ color: fillColor, alpha: fillAlpha });
    }

    this.highlight.visible = true;
  }

  /** Hide the highlight (mouse left game area) */
  hide(): void {
    this.highlight.visible = false;
    this.currentTileX = -999;
    this.currentTileY = -999;
  }

  /** Whether the highlight is currently visible */
  get isVisible(): boolean {
    return this.highlight.visible;
  }

  /** Clear on map change */
  clear(): void {
    this.highlight.clear();
    this.highlight.visible = false;
    this.currentTileX = -999;
    this.currentTileY = -999;
  }

  /** Release resources */
  destroy(): void {
    this.highlight.destroy();
    super.destroy();
  }
}
