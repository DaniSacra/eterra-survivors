import Phaser from 'phaser';
import { Joystick } from '../render/joystick';
import { SCENES } from './keys';

/** Screen-space overlay (no camera zoom): joystick, bars, counters. */
export class HudScene extends Phaser.Scene {
  joystick!: Joystick;

  constructor() {
    super(SCENES.hud);
  }

  create(): void {
    this.joystick = new Joystick(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.joystick.destroy());
  }
}
