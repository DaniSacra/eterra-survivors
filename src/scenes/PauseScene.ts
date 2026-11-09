import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { bindKeys, button, dim, isShort, keyNav, label, restartOnResize, safeArea } from '../render/ui';
import { optionButtons } from '../render/options';
import { SCENES } from './keys';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.pause);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    dim(this);
    // Phone lying down: actions on the left, options on the right, the title clear of the HUD timer.
    if (isShort(this) && width >= 600) {
      const colW = Math.min(320, (width - 48) / 2);
      const lx = cx - 8 - colW / 2;
      const rx = cx + 8 + colW / 2;
      const top = safeArea().top + 84;
      label(this, cx, top, t.pause.title, 32, { bold: true });
      keyNav(this, [
        button(this, lx, top + 62, Math.min(260, colW), 52, () => this.resume(), t.pause.resume),
        button(this, lx, top + 124, Math.min(260, colW), 52, () => this.quit(), t.pause.quit),
        ...optionButtons(this, rx, top + 58, colW),
      ]);
    } else {
      const bw = Math.min(260, width - 60);
      const ow = Math.min(320, width - 32);
      const top = Math.max(60, height / 2 - 190);
      label(this, cx, top, t.pause.title, 36, { bold: true });
      keyNav(this, [
        button(this, cx, top + 80, bw, 52, () => this.resume(), t.pause.resume),
        button(this, cx, top + 146, bw, 52, () => this.quit(), t.pause.quit),
        ...optionButtons(this, cx, top + 230, ow),
      ]);
    }

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
