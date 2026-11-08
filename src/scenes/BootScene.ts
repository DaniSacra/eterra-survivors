import Phaser from 'phaser';
import { generateAssets, preloadAssets } from '../render/assets';
import { SCENES } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    preloadAssets(this);
  }

  create(): void {
    generateAssets(this);
    this.scene.start(SCENES.game);
  }
}
