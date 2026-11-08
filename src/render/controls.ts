import Phaser from 'phaser';
import { keysVector } from '../core/input';
import type { Vec2 } from '../core/math';
import type { Joystick } from './joystick';

/** Merges keyboard (WASD/arrows) and the touch joystick into one movement vector. */
export class Controls {
  readonly vector: Vec2 = { x: 0, y: 0 };
  private readonly keys: Record<
    'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd',
    Phaser.Input.Keyboard.Key
  >;

  constructor(
    scene: Phaser.Scene,
    private readonly joystick: Joystick,
  ) {
    const K = Phaser.Input.Keyboard.KeyCodes;
    const kb = scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    this.keys = kb.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
    }) as Controls['keys'];
  }

  read(): Vec2 {
    const j = this.joystick.vector;
    if (j.x !== 0 || j.y !== 0) {
      this.vector.x = j.x;
      this.vector.y = j.y;
      return this.vector;
    }
    const k = this.keys;
    return keysVector(
      this.vector,
      k.left.isDown || k.a.isDown,
      k.right.isDown || k.d.isDown,
      k.up.isDown || k.w.isDown,
      k.down.isDown || k.s.isDown,
    );
  }
}
