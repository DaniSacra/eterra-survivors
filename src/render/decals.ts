import Phaser from 'phaser';
import type { StageId } from '../data/stages';
import { ART_SCALE } from './art/pen';
import type { Lighting } from './lighting';

/** Which decals (public/sprites/decals) each stage scatters over its ground. */
const STAGE_DECALS: Record<StageId, string[]> = {
  valmor: [
    'decal.grave',
    'decal.snowMound',
    'decal.twigs',
    'decal.iceFlower',
    'decal.snowMound',
    'decal.lantern',
  ],
  crypt: [
    'decal.candle',
    'decal.bonePile',
    'decal.crack',
    'decal.web',
    'decal.slab',
    'decal.moss',
    'decal.slab',
  ],
  southRoad: [
    'decal.puddle',
    'decal.bush',
    'decal.fence',
    'decal.stones',
    'decal.ruts',
    'decal.stones',
    'decal.campfire',
  ],
};

/** Decals that carry a flame: its light (radius world px, colour) and height of the flame over the decal's centre. */
const DECAL_LIGHT: Record<
  string,
  { radius: number; color: number; dy: number; dx?: number; halo?: { r: number; a: number } }
> = {
  'decal.candle': { radius: 120, color: 0xffb860, dy: -9, halo: { r: 40, a: 0.22 } },
  // The lamp post (PA-02): the lantern hangs to the right of the post (mirrored with the decal) near its top.
  'decal.lantern': { radius: 190, color: 0xffc070, dy: -30, dx: 16, halo: { r: 84, a: 0.34 } },
  'decal.campfire': { radius: 230, color: 0xff9040, dy: -4 },
};

/** Depth of the flame halos: over the light map (2.9), so a lantern glows warm in the dark. */
const HALO_DEPTH = 2.95;
const MAX_HALOS = 14;

/** World cell size; each cell holds at most one decal, picked by a hash of the cell. */
const CELL = 150;
/** Share of cells with a decal, 0..100. */
const DENSITY = 45;
const MAX = 80;

/**
 * Ground decals by world position: deterministic (the same place always looks the same), drawn from a fixed
 * set of reused images, and only re-laid out when the camera crosses into another cell.
 */
export class Decals {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly keys: string[];
  private readonly scene: Phaser.Scene;
  /** Warm additive glows over the flames (created on the first `lights`, once the radial texture exists). */
  private halos: Phaser.GameObjects.Image[] = [];
  /** How many images are laid out (the first `shown`). */
  private shown = 0;
  private lastCx = NaN;
  private lastCy = NaN;
  private lastCols = 0;
  private lastRows = 0;

  constructor(scene: Phaser.Scene, stage: StageId) {
    this.scene = scene;
    this.keys = STAGE_DECALS[stage];
    for (let i = 0; i < MAX; i++)
      this.images.push(
        scene.add
          .image(0, 0, this.keys[0] as string)
          .setDepth(1)
          .setScale(ART_SCALE)
          .setVisible(false),
      );
  }

  /** Lays decals over the view rectangle (x, y, w, h) in world px. */
  update(x: number, y: number, w: number, h: number): void {
    const cx = Math.floor(x / CELL) - 1;
    const cy = Math.floor(y / CELL) - 1;
    const cols = Math.ceil(w / CELL) + 3;
    const rows = Math.ceil(h / CELL) + 3;
    if (cx === this.lastCx && cy === this.lastCy && cols === this.lastCols && rows === this.lastRows) return;
    this.lastCx = cx;
    this.lastCy = cy;
    this.lastCols = cols;
    this.lastRows = rows;
    let n = 0;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const gx = cx + i;
        const gy = cy + j;
        const hsh = hash(gx, gy);
        if (hsh % 100 >= DENSITY || n >= MAX) continue;
        const img = this.images[n++] as Phaser.GameObjects.Image;
        const key = this.keys[(hsh >>> 7) % this.keys.length] as string;
        if (img.texture.key !== key) img.setTexture(key);
        img
          .setPosition(
            gx * CELL + ((hsh >>> 11) % (CELL - 30)) + 15,
            gy * CELL + ((hsh >>> 19) % (CELL - 30)) + 15,
          )
          .setFlipX(((hsh >>> 5) & 1) === 1)
          .setVisible(true);
      }
    for (let k = n; k < MAX; k++) (this.images[k] as Phaser.GameObjects.Image).setVisible(false);
    this.shown = n;
  }

  /** Adds the lights of the flames on screen (candles, lanterns, fires) and lays their warm halos. */
  lights(l: Lighting, time: number, calm: boolean): void {
    if (this.halos.length === 0 && this.scene.textures.exists('light.radial'))
      for (let i = 0; i < MAX_HALOS; i++)
        this.halos.push(
          this.scene.add
            .image(0, 0, 'light.radial')
            .setDepth(HALO_DEPTH)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setVisible(false),
        );
    let h = 0;
    for (let i = 0; i < this.shown; i++) {
      const img = this.images[i] as Phaser.GameObjects.Image;
      const light = DECAL_LIGHT[img.texture.key];
      if (!light) continue;
      const fx = img.x + (light.dx ?? 0) * (img.flipX ? -1 : 1);
      const fy = img.y + light.dy;
      l.flame(fx, fy, light.radius, light.color, time, calm);
      const halo = light.halo;
      if (halo && h < this.halos.length) {
        const flick = calm ? 1 : 1 + Math.sin(time * 9 + fx * 0.13) * 0.08 + Math.sin(time * 23 + fy) * 0.04;
        (this.halos[h++] as Phaser.GameObjects.Image)
          .setPosition(fx, fy)
          .setScale((halo.r / 64) * flick)
          .setTint(light.color)
          .setAlpha(halo.a)
          .setVisible(true);
      }
    }
    for (; h < this.halos.length; h++) (this.halos[h] as Phaser.GameObjects.Image).setVisible(false);
  }
}

/** A small integer hash of a cell, stable across runs. */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
