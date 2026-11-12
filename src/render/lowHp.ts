import Phaser from 'phaser';

const KEY = 'light.danger';
const SIZE = 128;
/** Life fractions that turn the frame on: slow pulse under LOW, fast under CRITICAL (CU-02). */
export const LOW = 0.35;
export const CRITICAL = 0.15;

/** A coral frame for the screen's edges (clear centre), created once. */
function dangerTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(KEY)) return KEY;
  const tex = scene.textures.createCanvas(KEY, SIZE, SIZE) as Phaser.Textures.CanvasTexture;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.34, SIZE / 2, SIZE / 2, SIZE * 0.72);
  g.addColorStop(0, 'rgba(224,74,90,0)');
  g.addColorStop(1, 'rgba(224,74,90,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  tex.refresh();
  return KEY;
}

/**
 * The low-life warning: a coral vignette on the screen's edges, pulsing slowly under 35% life and fast under 15%.
 * The calm screen setting keeps it fixed (no pulse). One image, no per-frame allocation.
 */
export class LowHpFrame {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.image = scene.add.image(0, 0, dangerTexture(scene)).setOrigin(0).setDepth(-9).setAlpha(0);
  }

  resize(width: number, height: number): void {
    this.image.setDisplaySize(width, height);
  }

  /** `fraction`: life left, 0..1; `time`: match seconds. */
  update(fraction: number, time: number, calm: boolean): void {
    if (fraction >= LOW || fraction <= 0) {
      this.image.setAlpha(0);
      return;
    }
    const critical = fraction < CRITICAL;
    const base = critical ? 0.55 : 0.35;
    const wave = calm ? 1 : 0.7 + 0.3 * Math.sin(time * (critical ? 9 : 3.5));
    this.image.setAlpha(base * wave);
  }
}
