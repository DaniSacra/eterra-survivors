import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { homeBackdrop } from '../render/backdrop';
import { optionButtons } from '../render/options';
import { UI, bindKeys, button, keyNav, label, restartOnResize } from '../render/ui';
import { SCENES } from './keys';

/** Every option in one place (also shown in the pause menu), saved between sessions. */
export class OptionsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.options);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const ow = Math.min(340, width - 32);
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    homeBackdrop(this);
    const top = Math.max(50, height / 2 - 170);
    label(this, cx, top, t.options.title, 30, { bold: true, color: UI.gold });
    const toggles = optionButtons(this, cx, top + 80, ow);
    const back = button(
      this,
      cx,
      top + 80 + toggles.length * 54 + 40,
      Math.min(220, ow),
      46,
      () => this.back(),
      t.shop.back,
    );
    keyNav(this, [...toggles, back]);
    bindKeys(this, (kb) => kb.once('keydown-ESC', () => this.back()));
    restartOnResize(this);
  }

  private back(): void {
    this.scene.start(SCENES.menu);
  }
}
