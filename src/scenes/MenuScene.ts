import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, button, isShort, keyNav, label, newsDot, restartOnResize } from '../render/ui';
import { ART_SCALE } from '../render/art/pen';
import { CHARACTERS, CHARACTER_IDS } from '../data/characters';
import { HERO_COLOR, TINT } from '../render/fx';
import { checkStoredAchievements, loadSave } from '../render/save';
import { SCENES } from './keys';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    // Saves from before the achievements earn the ones they already deserve.
    checkStoredAchievements();
    const { width, height } = this.scale;
    // Phone lying down: the title and the party on the left, the buttons on the right.
    const side = isShort(this) && width >= 600;
    const lx = side ? width * 0.29 : width / 2;
    const rx = side ? width * 0.73 : width / 2;
    const wrap = side ? Math.min(360, width * 0.5 - 32) : Math.min(420, width - 40);
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.6);
    const ty = height * (side ? 0.17 : 0.16);
    label(this, lx, ty, t.title, Math.min(44, (side ? wrap : width) / 9), {
      bold: true,
      color: UI.gold,
      stroke: true,
    });
    label(this, lx, ty + 42, t.subtitle, side ? 16 : 18, { color: UI.muted });
    const introY = height * (side ? 0.8 : 0.42);
    const intro = label(this, lx, introY, t.menu.intro, side ? 15 : 17, { wrap });
    this.party(lx, ty + 74, side ? intro.y - intro.height / 2 - 22 : introY - 30, Math.min(wrap, 360));

    const touch = this.sys.game.device.input.touch;
    const controls = touch ? t.menu.controlsTouch : t.menu.controlsDesktop;
    const hintText = import.meta.env.DEV ? `${controls}\n${t.menu.debugHint}` : controls;
    const bw = side ? Math.min(260, width * 0.4) : Math.min(260, width - 60);
    // Buttons block: 56 + 8 + 44 + 8 + 44 px, then the hint; centered on the right when lying down.
    const hint = label(this, rx, 0, hintText, side ? 13 : 14, {
      color: UI.muted,
      wrap: side ? bw + 40 : wrap,
    });
    const by = side ? (height - 160 - 16 - hint.height) / 2 + 28 : height * 0.58;
    hint.setY(by + (side ? 132 + 16 + hint.height / 2 : 172));
    const collection = button(
      this,
      rx - bw / 4 - 3,
      by + 116,
      bw / 2 - 6,
      44,
      () => this.scene.start(SCENES.collection),
      t.menu.collection,
    );
    // Something new in the Coleção (an achievement not seen yet): a gold dot on the button's corner.
    if (loadSave().fresh.length > 0)
      newsDot(this, collection.x + collection.width / 2 - 8, collection.y - collection.height / 2 + 8);
    keyNav(this, [
      button(this, rx, by, bw, 56, () => this.start(), t.menu.start),
      button(this, rx, by + 64, bw, 44, () => this.scene.start(SCENES.shop), t.menu.shop),
      // Two smaller ones side by side: the Coleção and the options.
      collection,
      button(
        this,
        rx + bw / 4 + 3,
        by + 116,
        bw / 2 - 6,
        44,
        () => this.scene.start(SCENES.options),
        t.menu.options,
      ),
    ]);

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
