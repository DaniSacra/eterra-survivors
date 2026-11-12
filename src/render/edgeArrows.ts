import type Phaser from 'phaser';
import type { World } from '../core/world';
import { ART_SCALE } from './art/pen';
import { UI } from './ui';
import { MAX_ARROWS as MAX, arrowTargets, createTargets, type ArrowKind } from './edgeTargets';

/** The thief rat's arrow is yellow, the gold of the gems it carries. */
const THIEF_COLOR = 0xffe14a;

/** Distance of an arrow's tip from the screen's frame (px). */
const INSET = 22;

/**
 * Arrows on the screen's frame toward a chest on the ground, the thief rat or a living elite out of view (NU-01): an
 * elite often dies off screen and drops its chest there. Nothing allocates per frame; arrows vanish once the target shows.
 */
export class EdgeArrows {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly icons: Phaser.GameObjects.Image[] = [];
  private readonly targets = createTargets();

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(-5);
    for (let i = 0; i < MAX; i++)
      this.icons.push(
        scene.add
          .image(0, 0, 'pickup.chest')
          .setScale(ART_SCALE * 0.8)
          .setDepth(-4)
          .setVisible(false),
      );
  }

  /**
   * Draws the arrows inside the screen rectangle (top, bottom: px; between the HUD and the bottom safe area), from
   * the game camera's view. `calm` stops the pulse.
   */
  update(
    world: World,
    cam: Phaser.Cameras.Scene2D.Camera,
    w: number,
    top: number,
    bottom: number,
    calm: boolean,
  ): void {
    const g = this.g.clear();
    const view = cam.worldView;
    const cx = w / 2;
    const cy = (top + bottom) / 2;
    const n = arrowTargets(world, view.x, view.y, view.width, view.height, this.targets);
    for (let i = 0; i < n; i++) {
      const t = this.targets[i] as (typeof this.targets)[number];
      this.arrow(
        g,
        i,
        (t.x - view.x) * cam.zoom,
        (t.y - view.y) * cam.zoom,
        cx,
        cy,
        w,
        top,
        bottom,
        t.kind,
        world.time,
        calm,
      );
    }
    for (let i = n; i < MAX; i++) (this.icons[i] as Phaser.GameObjects.Image).setVisible(false);
  }

  private arrow(
    g: Phaser.GameObjects.Graphics,
    i: number,
    sx: number,
    sy: number,
    cx: number,
    cy: number,
    w: number,
    top: number,
    bottom: number,
    kind: ArrowKind,
    time: number,
    calm: boolean,
  ): void {
    // From the centre toward the target, stopped on the inset frame.
    const dx = sx - cx;
    const dy = sy - cy;
    const hw = w / 2 - INSET;
    const hh = (bottom - top) / 2 - INSET;
    const k = Math.min(hw / Math.max(1e-3, Math.abs(dx)), hh / Math.max(1e-3, Math.abs(dy)));
    const x = cx + dx * k;
    const y = cy + dy * k;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const chest = kind === 'chest';
    const color = chest ? UI.goldHex : kind === 'thief' ? THIEF_COLOR : UI.dangerHex;
    const pulse = calm ? 1 : 1 + 0.12 * Math.sin(time * 6 + i);
    const s = 9 * pulse;
    g.fillStyle(0x000000, 0.45).fillCircle(x - ux * 4, y - uy * 4, 13);
    g.fillStyle(color, 1).fillTriangle(
      x + ux * s,
      y + uy * s,
      x - uy * s * 0.75 - ux * s * 0.4,
      y + ux * s * 0.75 - uy * s * 0.4,
      x + uy * s * 0.75 - ux * s * 0.4,
      y - ux * s * 0.75 - uy * s * 0.4,
    );
    const icon = this.icons[i] as Phaser.GameObjects.Image;
    icon.setVisible(chest);
    if (chest) icon.setPosition(x - ux * 22, y - uy * 22);
    else g.fillStyle(color, 1).fillCircle(x - ux * 18, y - uy * 18, kind === 'thief' ? 7 : 5);
  }
}
