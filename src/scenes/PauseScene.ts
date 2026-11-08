import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { button, dim, label, restartOnResize, bindKeys } from '../render/ui';
import { SCENES } from './keys';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.pause);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const bw = Math.min(260, width - 60);
    dim(this);
    label(this, cx, height * 0.35, t.pause.title, 36, { bold: true });
    button(this, cx, height * 0.5, bw, 52, () => this.resume(), t.pause.resume);
    button(this, cx, height * 0.5 + 68, bw, 52, () => this.quit(), t.pause.quit);

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.resume());
      kb.once('keydown-P', () => this.resume());
    });
    restartOnResize(this);
  }

  private resume(): void {
    this.scene.resume(SCENES.game);
    this.scene.stop();
  }

  private quit(): void {
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.menu);
  }
}
