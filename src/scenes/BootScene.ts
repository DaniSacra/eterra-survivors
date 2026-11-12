import Phaser from 'phaser';
import { generateAssets, preloadAssets } from '../render/assets';
import { t } from '../i18n/pt-BR';
import { SCENES } from './keys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    // The sprites are many and big: a phone on mobile data waits a while, so show that it is loading.
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const barW = Math.min(280, width - 60);
    const text = this.add
      .text(cx, cy - 26, t.boot.loading(0), {
        fontFamily: '"Jersey 15", serif',
        fontSize: '26px',
        color: '#f0e6c8',
      })
      .setOrigin(0.5);
    this.add.rectangle(cx, cy + 6, barW + 4, 14, 0x1b2236).setStrokeStyle(2, 0x3a4766);
    const fill = this.add.rectangle(cx - barW / 2, cy + 6, 2, 8, 0xffc040).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => {
      fill.width = Math.max(2, barW * p);
      text.setText(t.boot.loading(Math.round(p * 100)));
    });
    preloadAssets(this);
  }

  create(): void {
    generateAssets(this);
    this.scene.start(SCENES.menu);
  }
}
