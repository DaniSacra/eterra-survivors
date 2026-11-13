import type Phaser from 'phaser';
import { ART_SCALE } from './art/pen';
import { requestAssets } from './assets';

/**
 * Pixel sprites that effects place each frame (a shield orbiting the hero, a mace head coming down): `drawFx` is
 * Graphics-only, so it asks here for an image instead. A fixed pool of reused images, nothing allocated per frame.
 */
const MAX = 160;
/** Slots only damage pieces may take: decoration (zone flames, crystals) stops before them (PB-01). */
const RESERVE = 48;

/** Flat things lying on the ground (slime): a lane of their own under the enemies, hard-capped. */
const MAX_GROUND = 64;

class FxSprites {
  private images: Phaser.GameObjects.Image[] = [];
  private ground: Phaser.GameObjects.Image[] = [];
  private scene?: Phaser.Scene;
  private used = 0;
  private usedGround = 0;
  /** Pieces refused this frame because the pool was full (shown on the F3 panel in dev builds). */
  overflow = 0;

  /** Creates the pool in the scene (call again on every scene start). */
  init(scene: Phaser.Scene): void {
    this.scene = scene;
    this.images = [];
    this.ground = [];
    this.used = 0;
    this.usedGround = 0;
    for (let i = 0; i < MAX_GROUND; i++)
      this.ground.push(
        scene.add.image(0, 0, 'fx.shield').setDepth(3.9).setScale(ART_SCALE).setVisible(false),
      );
    for (let i = 0; i < MAX; i++)
      this.images.push(
        scene.add.image(0, 0, 'fx.shield').setDepth(11.5).setScale(ART_SCALE).setVisible(false),
      );
  }

  /** Whether strip `key` is loaded; if not (an effect loaded on demand), asks for it and skips the piece this frame. */
  private ready(key: string): boolean {
    const scene = this.scene;
    if (!scene || scene.textures.exists(key)) return true;
    requestAssets(scene, [key]);
    return false;
  }

  /** Starts a frame: every image is free again. */
  begin(): void {
    this.used = 0;
    this.usedGround = 0;
    this.overflow = 0;
  }

  /** Puts `key` at (x, y), turned `rot` radians, grown by `scale` (1 = the art's own size). */
  put(key: string, x: number, y: number, rot = 0, scale = 1, alpha = 1): void {
    const img = this.images[this.used];
    if (!img) {
      this.overflow++;
      return;
    }
    this.used++;
    if (img.texture.key !== key) img.setTexture(key);
    else if (img.frame.name !== '__BASE') img.setFrame('__BASE');
    img
      .setOrigin(0.5)
      .setPosition(x, y)
      .setRotation(rot)
      .setScale(ART_SCALE * scale)
      .setAlpha(alpha)
      .setVisible(true);
  }

  /**
   * Puts frame `frame` of the animated effect `key` (render/vfx.ts) so its anchor (`ox`, `oy`: fractions of the
   * frame) sits on (x, y); `scale` 1 = the art's own size.
   */
  putFrame(
    key: string,
    frame: number,
    ox: number,
    oy: number,
    x: number,
    y: number,
    scale = 1,
    alpha = 1,
    rot = 0,
    decor = false,
  ): void {
    if (!this.ready(key)) return;
    // Decoration leaves the last RESERVE slots to the pieces that show where the damage is.
    if (decor && this.used >= MAX - RESERVE) {
      this.overflow++;
      return;
    }
    const img = this.images[this.used];
    if (!img) {
      this.overflow++;
      return;
    }
    this.used++;
    if (img.texture.key !== key) img.setTexture(key, frame);
    else img.setFrame(frame);
    img
      .setOrigin(ox, oy)
      .setPosition(x, y)
      .setRotation(rot)
      .setScale(ART_SCALE * scale)
      .setAlpha(alpha)
      .setVisible(true);
  }

  /** Like `putFrame`, on the ground lane: drawn under the enemies and the hero (decoration, refused when full). */
  putGroundFrame(
    key: string,
    frame: number,
    ox: number,
    oy: number,
    x: number,
    y: number,
    scale = 1,
    alpha = 1,
  ): void {
    if (!this.ready(key)) return;
    const img = this.ground[this.usedGround];
    if (!img) {
      this.overflow++;
      return;
    }
    this.usedGround++;
    if (img.texture.key !== key) img.setTexture(key, frame);
    else img.setFrame(frame);
    img
      .setOrigin(ox, oy)
      .setPosition(x, y)
      .setScale(ART_SCALE * scale)
      .setAlpha(alpha)
      .setVisible(true);
  }

  /** Ends the frame: images not placed this frame are hidden. */
  end(): void {
    for (let i = this.used; i < this.images.length; i++)
      (this.images[i] as Phaser.GameObjects.Image).setVisible(false);
    for (let i = this.usedGround; i < this.ground.length; i++)
      (this.ground[i] as Phaser.GameObjects.Image).setVisible(false);
  }
}

export const fxSprites = new FxSprites();
