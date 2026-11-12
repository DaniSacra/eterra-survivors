import Phaser from 'phaser';

/** Key of the contact shadow texture every ground creature stands on. */
export const SHADOW = 'shadow.contact';

const W = 32;
const H = 12;

/**
 * A pixel contact shadow: an ellipse in three dark bands (no smooth gradient, so it sits with the hi-bit sprites).
 * Created once; the enemy shadow mirror stamps one image per enemy and scales it by the enemy's radius.
 */
export function ensureShadowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(SHADOW)) return;
  const tex = scene.textures.createCanvas(SHADOW, W, H) as Phaser.Textures.CanvasTexture;
  const ctx = tex.getContext();
  const bands = [
    { k: 1, a: 0.16 },
    { k: 0.74, a: 0.16 },
    { k: 0.46, a: 0.2 },
  ];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#05040f';
  for (const b of bands) {
    ctx.globalAlpha = b.a;
    const rx = (W / 2) * b.k;
    const ry = (H / 2) * b.k;
    for (let y = 0; y < H; y++) {
      const dy = (y + 0.5 - H / 2) / ry;
      if (Math.abs(dy) >= 1) continue;
      const half = Math.floor(rx * Math.sqrt(1 - dy * dy));
      ctx.fillRect(W / 2 - half, y, half * 2, 1);
    }
  }
  tex.refresh();
}
