import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, button, label, restartOnResize, bindKeys } from '../render/ui';
import { SCENES } from './keys';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const wrap = Math.min(420, width - 40);
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.6);
    this.add
      .image(cx, height * 0.2, 'enemy.blackKnight')
      .setAlpha(0.35)
      .setScale(1.6);
    label(this, cx, height * 0.2, t.title, Math.min(44, width / 9), { bold: true, color: '#ffd870' });
    label(this, cx, height * 0.2 + 44, t.subtitle, 18, { color: UI.muted });
    label(this, cx, height * 0.42, t.menu.intro, 17, { wrap });
    button(this, cx, height * 0.6, Math.min(260, width - 60), 56, () => this.start(), t.menu.start);
    const touch = this.sys.game.device.input.touch;
    label(this, cx, height * 0.72, touch ? t.menu.controlsTouch : t.menu.controlsDesktop, 14, {
      color: UI.muted,
      wrap,
    });

    bindKeys(this, (kb) => {
      kb.once('keydown-ENTER', () => this.start());
      kb.once('keydown-SPACE', () => this.start());
    });
    restartOnResize(this);
  }

  private start(): void {
    this.scene.start(SCENES.game);
  }
}
