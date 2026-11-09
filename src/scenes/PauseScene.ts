import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { button, dim, label, restartOnResize, bindKeys, keyNav } from '../render/ui';
import { optionButtons } from '../render/options';
import { SCENES } from './keys';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.pause);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const bw = Math.min(260, width - 60);
    const ow = Math.min(320, width - 32);
    dim(this);
    const top = Math.max(60, height / 2 - 190);
    label(this, cx, top, t.pause.title, 36, { bold: true });
    keyNav(this, [
      button(this, cx, top + 80, bw, 52, () => this.resume(), t.pause.resume),
      button(this, cx, top + 146, bw, 52, () => this.quit(), t.pause.quit),
      ...optionButtons(this, cx, top + 230, ow),
    ]);

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
