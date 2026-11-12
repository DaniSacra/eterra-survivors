import Phaser from 'phaser';
import { ART_RES } from './art/pen';
import { config } from '../data/config';
import { joystickRadius, joystickVector } from '../core/input';
import type { Vec2 } from '../core/math';

/**
 * A pixel ring (the base: a faint disc, a lit rim, eight tick marks) or a pixel knob (a disc with a highlight dot) of
 * radius `r` world px, baked once per size at ART_RES (alpha 0.14 inside, 0.4 on the rim, as PA-01 asks).
 */
function joystickTexture(scene: Phaser.Scene, r: number, knob: boolean): string {
  const R = Math.max(4, Math.round(r / ART_RES)); // radius in art px
  const name = `joy.${knob ? 'knob' : 'base'}.${R}`;
  if (scene.textures.exists(name)) return name;
  const D = R * 2 + 2;
  const src = document.createElement('canvas');
  src.width = D;
  src.height = D;
  const g = src.getContext('2d') as CanvasRenderingContext2D;
  const c = D / 2;
  for (let y = 0; y < D; y++)
    for (let x = 0; x < D; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      let a = 0;
      if (d <= R) a = knob ? 0.4 : 0.14;
      if (knob) {
        if (d > R - 1.2 && d <= R) a = 0.55;
        if (dx < 0 && dy < 0 && Math.abs(Math.hypot(dx + R * 0.4, dy + R * 0.4)) < 1.2) a = 0.8;
      } else {
        if (d > R - 2 && d <= R) a = 0.4;
        // Eight ticks just inside the rim.
        const ang = Math.atan2(dy, dx);
        const k = Math.abs((((ang / (Math.PI / 4)) % 1) + 1) % 1);
        if (d > R - 5 && d <= R - 2 && (k < 0.05 || k > 0.95)) a = 0.4;
      }
      if (a > 0) {
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.fillRect(x, y, 1, 1);
      }
    }
  const tex = scene.textures.createCanvas(name, D * ART_RES, D * ART_RES) as Phaser.Textures.CanvasTexture;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, D * ART_RES, D * ART_RES);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return name;
}

/** Floating virtual joystick: appears wherever the finger touches down. Screen-space (HUD scene). */
export class Joystick {
  readonly vector: Vec2 = { x: 0, y: 0 };
  /** When false (menus/overlays open), touches are ignored and the stick resets. */
  private enabled = true;
  private pointerId = -1;
  private baseX = 0;
  private baseY = 0;
  /** Sized to the screen on every touch (the window may have been resized or turned). */
  private radius: number = config.joystick.minRadius;
  private readonly base: Phaser.GameObjects.Image;
  private readonly knob: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene) {
    const r = this.radius;
    this.base = scene.add.image(0, 0, joystickTexture(scene, r, false)).setVisible(false);
    this.knob = scene.add.image(0, 0, joystickTexture(scene, r * 0.45, true)).setVisible(false);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  /** Touch only: on desktop the mouse should not steer. */
  private onDown(p: Phaser.Input.Pointer, over: unknown[]): void {
    if (!this.enabled || this.pointerId !== -1 || !p.wasTouch || over.length > 0) return;
    this.pointerId = p.id;
    const { radiusShare, minRadius, maxRadius } = config.joystick;
    const { width, height } = this.scene.scale;
    const r = joystickRadius(width, height, radiusShare, minRadius, maxRadius);
    if (r !== this.radius) {
      this.radius = r;
      this.base.setTexture(joystickTexture(this.scene, r, false));
      this.knob.setTexture(joystickTexture(this.scene, r * 0.45, true));
    }
    this.baseX = p.x;
    this.baseY = p.y;
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.knob.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    const radius = this.radius;
    joystickVector(this.vector, p.x - this.baseX, p.y - this.baseY, radius, config.joystick.deadZone);
    this.knob.setPosition(this.baseX + this.vector.x * radius, this.baseY + this.vector.y * radius);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.pointerId) this.reset();
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  reset(): void {
    this.pointerId = -1;
    this.vector.x = 0;
    this.vector.y = 0;
    this.base.setVisible(false);
    this.knob.setVisible(false);
  }

  destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.input.off('pointerupoutside', this.onUp, this);
  }
}
