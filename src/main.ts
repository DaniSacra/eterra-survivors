import Phaser from 'phaser';
import { t } from './i18n/pt-BR';

class PlaceholderScene extends Phaser.Scene {
  create(): void {
    this.add.text(16, 16, t.title, { color: '#e8e2d0', fontSize: '24px' });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0d14',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  scene: [PlaceholderScene],
});
