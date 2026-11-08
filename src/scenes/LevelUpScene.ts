import Phaser from 'phaser';
import type { World } from '../core/world';
import { t } from '../i18n/pt-BR';
import { describeUpgrade } from '../render/describe';
import { UI, button, dim, label, restartOnResize } from '../render/ui';
import { SCENES } from './keys';

/** Overlay with the upgrade choices. The world is frozen (state 'levelup') while it is open. */
export class LevelUpScene extends Phaser.Scene {
  private world!: World;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private selected = 0;

  constructor() {
    super(SCENES.levelUp);
  }

  init(data: { world: World }): void {
    this.world = data.world;
    this.selected = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const opts = this.world.upgradeOptions;
    const cardW = Math.min(420, width - 32);
    const cardH = Math.min(84, (height - 200) / opts.length - 12);
    const top = height / 2 - ((cardH + 12) * opts.length) / 2;

    dim(this);
    label(this, width / 2, top - 56, t.levelUp.title, 30, { bold: true, color: '#ffd870' });
    this.cards = opts.map((opt, i) => {
      const y = top + i * (cardH + 12) + cardH / 2;
      const card = button(this, width / 2, y, cardW, cardH, () => this.choose(i));
      const d = describeUpgrade(opt);
      const left = width / 2 - cardW / 2 + 14;
      label(this, left, y - cardH / 2 + 10, `${i + 1}. ${d.title}`, 19, { bold: true, align: 'left' });
      label(this, width / 2 + cardW / 2 - 14, y - cardH / 2 + 20, d.tag, 14, { color: '#ffd870' }).setOrigin(
        1,
        0.5,
      );
      label(this, left, y - cardH / 2 + 38, d.desc, 15, { color: UI.muted, align: 'left', wrap: cardW - 28 });
      return card;
    });
    label(this, width / 2, top + opts.length * (cardH + 12) + 20, t.levelUp.hint, 14, { color: UI.muted });
    this.highlight();

    const kb = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    kb.on('keydown', this.onKey, this);
    restartOnResize(this);
  }

  private onKey(e: KeyboardEvent): void {
    const n = this.cards.length;
    if (e.key >= '1' && e.key <= String(n)) this.choose(Number(e.key) - 1);
    else if (e.key === 'ArrowUp' || e.key === 'w') this.move(-1);
    else if (e.key === 'ArrowDown' || e.key === 's') this.move(1);
    else if (e.key === 'Enter' || e.key === ' ') this.choose(this.selected);
  }

  private move(d: number): void {
    this.selected = (this.selected + d + this.cards.length) % this.cards.length;
    this.highlight();
  }

  private highlight(): void {
    this.cards.forEach((c, i) =>
      c.setStrokeStyle(i === this.selected ? 3 : 2, i === this.selected ? UI.accent : UI.border),
    );
  }

  private choose(i: number): void {
    this.world.chooseUpgrade(i);
    if (this.world.state === 'levelup') this.scene.restart({ world: this.world });
    else this.scene.stop();
  }
}
