/**
 * RoomPropsLayer - static scenery from MapDefinition.props (the easel in the player’s room)
 *
 * Each prop is one PIXI.Container in the shared depth-sorted container, at
 * roomPropZIndex(prop), so the player walks in front of it when standing below
 * its base and behind it when standing above — the same rule placed items use.
 *
 * This replaces drawing the scenery as DOM in the world overlay. The overlay sits
 * above the whole PixiJS canvas, so DOM art there covered the player however low
 * its z-index was (issue #158: the kitchen easel painted over the player).
 *
 * Props are rebuilt only when their size changes or a texture was missing at the
 * last build; a panning room merely moves the containers.
 */

import * as PIXI from 'pixi.js';
import type { Position, RoomProp, RoomPropPart } from '../../types';
import { textureManager } from '../TextureManager';
import { roomPropBox, roomPropZIndex } from '../roomProps';
import { PixiLayer } from './PixiLayer';
import { Z_DEPTH_SORTED_BASE } from '../../zIndex';

/** Soft drop shadow under a panel, matching the old DOM box-shadow (1px 2px #46322166). */
const PANEL_SHADOW = { dx: 1, dy: 2, color: 0x463221, alpha: 0.4 };
const PANEL_STROKE_WIDTH = 2;

interface PropEntry {
  container: PIXI.Container;
  width: number;
  height: number;
  /** False when a texture had not arrived yet — rebuilt on the next render. */
  complete: boolean;
}

export class RoomPropsLayer extends PixiLayer {
  private entries: Map<string, PropEntry> = new Map();
  private depthContainer: PIXI.Container | null = null;

  constructor() {
    super(Z_DEPTH_SORTED_BASE, true);
  }

  /** Props sort with the player and NPCs, so they live in the shared depth container. */
  setDepthContainer(container: PIXI.Container): void {
    this.depthContainer = container;
  }

  private getTargetContainer(): PIXI.Container {
    return this.depthContainer ?? this.container;
  }

  render(props: RoomProp[] | undefined, tileSize: number, gridOffset?: Position): void {
    const seen = new Set<string>();

    for (const prop of props ?? []) {
      seen.add(prop.id);
      const box = roomPropBox(prop, tileSize, gridOffset);

      let entry = this.entries.get(prop.id);
      if (entry && (!entry.complete || entry.width !== box.width || entry.height !== box.height)) {
        this.remove(prop.id);
        entry = undefined;
      }
      if (!entry) {
        entry = this.build(prop, box.width, box.height);
        this.entries.set(prop.id, entry);
        this.getTargetContainer().addChild(entry.container);
      }

      entry.container.x = box.x;
      entry.container.y = box.y;
      entry.container.zIndex = roomPropZIndex(prop);
    }

    for (const id of [...this.entries.keys()]) {
      if (!seen.has(id)) this.remove(id);
    }
  }

  private build(prop: RoomProp, width: number, height: number): PropEntry {
    const container = new PIXI.Container();
    container.label = `room-prop:${prop.id}`;
    let complete = true;

    for (const part of prop.parts) {
      const child = this.buildPart(part, width, height);
      if (child) container.addChild(child);
      else complete = false;
    }

    return { container, width, height, complete };
  }

  private buildPart(part: RoomPropPart, width: number, height: number): PIXI.Container | null {
    const x = part.left * width;
    const y = part.top * height;
    const w = part.width * width;
    const h = part.height * height;

    if (part.kind === 'panel') {
      const g = new PIXI.Graphics();
      g.rect(x + PANEL_SHADOW.dx, y + PANEL_SHADOW.dy, w, h);
      g.fill({ color: PANEL_SHADOW.color, alpha: PANEL_SHADOW.alpha });
      g.rect(x, y, w, h);
      g.fill(part.fill);
      g.stroke({ color: part.stroke, width: PANEL_STROKE_WIDTH });
      return g;
    }

    const texture = textureManager.getTexture(part.image);
    if (!texture) return null; // Load scheduled; the texture-arrival re-render rebuilds us

    if (texture.source) texture.source.scaleMode = 'linear';
    const sprite = new PIXI.Sprite(texture);
    // Centre-anchored so a rotation pivots about the part itself
    sprite.anchor.set(0.5, 0.5);
    sprite.x = x + w / 2;
    sprite.y = y + h / 2;
    sprite.width = w;
    sprite.height = h;
    if (part.rotationDeg) sprite.rotation = (part.rotationDeg * Math.PI) / 180;
    return sprite;
  }

  private remove(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.container.destroy({ children: true });
    this.entries.delete(id);
  }

  clear(): void {
    for (const id of [...this.entries.keys()]) this.remove(id);
  }
}
