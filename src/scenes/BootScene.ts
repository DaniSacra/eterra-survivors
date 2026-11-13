import Phaser from 'phaser';
import { generateAssets, preloadAssets } from '../render/assets';
import { loadingBar } from '../render/loadingBar';
import { SCENES } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    // The sprites are many and big: a phone on mobile data waits a while, so show that it is loading.
    loadingBar(this);
    preloadAssets(this);
  }

  create(): void {
    generateAssets(this);
    this.scene.start(SCENES.menu);
  }
}
