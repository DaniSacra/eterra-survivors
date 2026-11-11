import type Phaser from 'phaser';
import { obstacleAt, type Obstacle } from '../core/terrain';
import type { World } from '../core/world';
import { ART_SCALE } from './art/pen';
import type { Lighting } from './lighting';

/** Where each obstacle sprite's foot is (a fraction of its texture height): that point sits on the hit circle. */
const FOOT = [0.71, 0.53, 0.61];
const MAX = 60;
/** The column with a torch (render/art/tiles.ts) and its flame's height over the foot (world px). */
const TORCH = 'obstacle.0t';
const TORCH_DY = 39;

/**
 * The Cripta's obstacles on screen: like the decals, a fixed set of reused images laid out over the view's cells,
 * only when the camera crosses into another cell. Positions come from core/terrain.ts, so what is drawn is exactly
 * what blocks.
 */
export class Obstacles {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly ob: Obstacle = { x: 0, y: 0, r: 0, kind: 0 };
  private lastCx = NaN;
  private lastCy = NaN;
  private lastCols = 0;
  private shown = 0;
  private lastRows = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly world: World,
  ) {
    for (let i = 0; i < MAX; i++)
      this.images.push(
        scene.add.image(0, 0, 'obstacle.0').setDepth(2.5).setScale(ART_SCALE).setVisible(false),
      );
  }

  /** Lays out the obstacles over the view rectangle (x, y, w, h) in world px. */
  update(x: number, y: number, w: number, h: number): void {
    const layout = this.world.stage.layout;
    if (layout.kind !== 'obstacles') return;
    const c = layout.cell;
    // One cell of margin: a tall column whose foot is just below the view still shows its top.
    const cx = Math.floor(x / c) - 1;
    const cy = Math.floor(y / c) - 1;
    const cols = Math.ceil(w / c) + 3;
    const rows = Math.ceil(h / c) + 3;
    if (cx === this.lastCx && cy === this.lastCy && cols === this.lastCols && rows === this.lastRows) return;
    this.lastCx = cx;
    this.lastCy = cy;
    this.lastCols = cols;
    this.lastRows = rows;
    let n = 0;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        if (n >= MAX || !obstacleAt(this.world.seed, layout, cx + i, cy + j, this.ob)) continue;
        const k = this.ob.kind;
        // Every other column carries a torch.
        const torch = k === 0 && ((cx + i) * 7 + (cy + j) * 3) % 2 === 0;
        (this.images[n++] as Phaser.GameObjects.Image)
          .setTexture(torch ? TORCH : `obstacle.${k}`)
          .setOrigin(0.5, FOOT[k] ?? 0.5)
          .setPosition(this.ob.x, this.ob.y)
          .setFlipX(((cx + i + cy + j) & 1) === 1)
          .setVisible(true);
      }
    for (let k = n; k < MAX; k++) (this.images[k] as Phaser.GameObjects.Image).setVisible(false);
    this.shown = n;
  }

  /** Adds the torches' lights (the flame sits TORCH_DY world px over the column's foot). */
  lights(l: Lighting, time: number, calm: boolean): void {
    for (let i = 0; i < this.shown; i++) {
      const img = this.images[i] as Phaser.GameObjects.Image;
      if (img.texture.key === TORCH) l.flame(img.x, img.y - TORCH_DY, 200, 0xffa050, time, calm);
    }
  }
}
