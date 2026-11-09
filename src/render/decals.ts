import type Phaser from 'phaser';
import type { StageId } from '../data/stages';
import { ART_SCALE } from './art/pen';

/** Which decals (render/art/tiles.ts DECAL_ART) each stage scatters over its ground. */
const STAGE_DECALS: Record<StageId, string[]> = {
  valmor: ['decal.grave', 'decal.snowMound', 'decal.twigs', 'decal.iceFlower', 'decal.snowMound'],
  crypt: ['decal.candle', 'decal.bonePile', 'decal.crack', 'decal.web', 'decal.crack'],
  southRoad: ['decal.puddle', 'decal.bush', 'decal.fence', 'decal.stones', 'decal.stones'],
};

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
  private lastCx = NaN;
  private lastCy = NaN;
  private lastCols = 0;
  private lastRows = 0;

  constructor(scene: Phaser.Scene, stage: StageId) {
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
  }
}

/** A small integer hash of a cell, stable across runs. */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
