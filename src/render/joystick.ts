import type Phaser from 'phaser';
import { config } from '../data/config';
import { joystickVector } from '../core/input';
import type { Vec2 } from '../core/math';

/** Floating virtual joystick: appears wherever the finger touches down. Screen-space (HUD scene). */
export class Joystick {
  readonly vector: Vec2 = { x: 0, y: 0 };
  private pointerId = -1;
  private baseX = 0;
  private baseY = 0;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly knob: Phaser.GameObjects.Arc;

  constructor(private readonly scene: Phaser.Scene) {
    const r = config.joystick.radius;
    this.base = scene.add.circle(0, 0, r, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.25).setVisible(false);
    this.knob = scene.add.circle(0, 0, r * 0.45, 0xffffff, 0.3).setVisible(false);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.input.on('pointerupoutside', this.onUp, this);
  }

  /** Touch only: on desktop the mouse should not steer. */
  private onDown(p: Phaser.Input.Pointer, over: unknown[]): void {
    if (this.pointerId !== -1 || !p.wasTouch || over.length > 0) return;
    this.pointerId = p.id;
    this.baseX = p.x;
    this.baseY = p.y;
    this.base.setPosition(p.x, p.y).setVisible(true);
    this.knob.setPosition(p.x, p.y).setVisible(true);
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.pointerId) return;
    const { radius, deadZone } = config.joystick;
    joystickVector(this.vector, p.x - this.baseX, p.y - this.baseY, radius, deadZone);
    this.knob.setPosition(this.baseX + this.vector.x * radius, this.baseY + this.vector.y * radius);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.pointerId) this.reset();
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
