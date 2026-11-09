import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, button, keyNav, label, restartOnResize } from '../render/ui';
import { ART_SCALE } from '../render/art/pen';
import { CHARACTERS, CHARACTER_IDS } from '../data/characters';
import { HERO_COLOR, TINT } from '../render/fx';
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
    label(this, cx, height * 0.16, t.title, Math.min(44, width / 9), {
      bold: true,
      color: UI.gold,
      stroke: true,
    });
    label(this, cx, height * 0.16 + 42, t.subtitle, 18, { color: UI.muted });
    this.party(cx, height * 0.16 + 74, height * 0.42 - 30, Math.min(wrap, 360));
    label(this, cx, height * 0.42, t.menu.intro, 17, { wrap });
    const bw = Math.min(260, width - 60);
    keyNav(this, [
      button(this, cx, height * 0.58, bw, 56, () => this.start(), t.menu.start),
      button(this, cx, height * 0.58 + 64, bw, 44, () => this.scene.start(SCENES.shop), t.menu.shop),
      // Two smaller ones side by side: the book of Elos and the options.
      button(
        this,
        cx - bw / 4 - 3,
        height * 0.58 + 116,
        bw / 2 - 6,
        44,
        () => this.scene.start(SCENES.eloBook),
        t.menu.elos,
      ),
      button(
        this,
        cx + bw / 4 + 3,
        height * 0.58 + 116,
        bw / 2 - 6,
        44,
        () => this.scene.start(SCENES.options),
        t.menu.options,
      ),
    ]);
    const touch = this.sys.game.device.input.touch;
    const controls = touch ? t.menu.controlsTouch : t.menu.controlsDesktop;
    label(
      this,
      cx,
      height * 0.58 + 172,
      import.meta.env.DEV ? `${controls}\n${t.menu.debugHint}` : controls,
      14,
      {
        color: UI.muted,
        wrap,
      },
    );

    restartOnResize(this);
    this.cameras.main.fadeIn(150);
  }

  /** The four heroes side by side on the snow, each on their own light, bobbing a little. */
  private party(cx: number, top: number, bottom: number, w: number): void {
    const h = bottom - top;
    if (h < 50) return;
    const k = Math.min(2.2, h / 50);
    const scale = ART_SCALE * k;
    const feet = bottom - 6;
    const pad = 6 * k; // the texture's transparent margin under the feet (render/assets.ts PAD)
    this.add.ellipse(cx, feet, w * 1.05, 26, TINT.snow, 0.12);
    CHARACTER_IDS.forEach((id, i) => {
      const x = cx + (i - 1.5) * (w / 4);
      this.add.ellipse(x, feet, 46, 12, HERO_COLOR[id], 0.35).setStrokeStyle(2, HERO_COLOR[id], 0.9);
      const hero = this.add
        .image(x, feet + pad + 2, CHARACTERS[id].sprite)
        .setOrigin(0.5, 1)
        .setScale(scale)
        .setFlipX(i >= 2); // the two on the right face the others
      this.tweens.add({
        targets: hero,
        y: feet + pad - 3,
        duration: 600 + i * 70,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 150,
      });
    });
  }

  private start(): void {
    this.scene.start(SCENES.select);
  }
}
