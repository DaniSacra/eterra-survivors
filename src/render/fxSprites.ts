import type Phaser from 'phaser';
import { ART_SCALE } from './art/pen';

/**
 * Pixel sprites that effects place each frame (a shield orbiting the hero, a mace head coming down): `drawFx` is
 * Graphics-only, so it asks here for an image instead. A fixed pool of reused images, nothing allocated per frame.
 */
const MAX = 48;

class FxSprites {
  private images: Phaser.GameObjects.Image[] = [];
  private used = 0;

  /** Creates the pool in the scene (call again on every scene start). */
  init(scene: Phaser.Scene): void {
    this.images = [];
    this.used = 0;
    for (let i = 0; i < MAX; i++)
      this.images.push(
        scene.add.image(0, 0, 'fx.shield').setDepth(11.5).setScale(ART_SCALE).setVisible(false),
      );
  }

  /** Starts a frame: every image is free again. */
  begin(): void {
    this.used = 0;
  }

  /** Puts `key` at (x, y), turned `rot` radians, grown by `scale` (1 = the art's own size). */
  put(key: string, x: number, y: number, rot = 0, scale = 1, alpha = 1): void {
    const img = this.images[this.used];
    if (!img) return;
    this.used++;
    if (img.texture.key !== key) img.setTexture(key);
    img
      .setPosition(x, y)
      .setRotation(rot)
      .setScale(ART_SCALE * scale)
      .setAlpha(alpha)
      .setVisible(true);
  }

  /** Ends the frame: images not placed this frame are hidden. */
  end(): void {
    for (let i = this.used; i < this.images.length; i++)
      (this.images[i] as Phaser.GameObjects.Image).setVisible(false);
  }
}

export const fxSprites = new FxSprites();
