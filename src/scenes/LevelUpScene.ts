import Phaser from 'phaser';
import type { World } from '../core/world';
import type { ChargeKey } from '../data/shop';
import { t } from '../i18n/pt-BR';
import { describeUpgrade } from '../render/describe';
import { UI, button, dim, label, restartOnResize, bindKeys } from '../render/ui';
import { SCENES } from './keys';

const CHARGES: ChargeKey[] = ['reroll', 'skip', 'banish'];

/** Overlay with the upgrade choices. The world is frozen (state 'levelup') while it is open. */
export class LevelUpScene extends Phaser.Scene {
  private world!: World;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private selected = 0;
  /** After pressing Banir, the next card picked is banished instead of taken. */
  private banishing = false;

  constructor() {
    super(SCENES.levelUp);
  }

  init(data: { world: World; banishing?: boolean }): void {
    this.world = data.world;
    this.banishing = !!data.banishing && this.world.charges.banish > 0;
    this.selected = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const w = this.world;
    const opts = w.upgradeOptions;
    const cardW = Math.min(420, width - 32);
    const cardH = Math.min(84, (height - 260) / opts.length - 12);
    const top = height / 2 - ((cardH + 12) * opts.length) / 2 - 20;

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

    const bottom = top + opts.length * (cardH + 12);
    const hint = this.banishing ? t.levelUp.banishHint : t.levelUp.hint;
    label(this, width / 2, bottom + 14, hint, 14, { color: this.banishing ? '#ff8090' : UI.muted });

    // Trocar · Pular · Banir
    const bw = Math.min(130, (cardW - 16) / 3);
    CHARGES.forEach((key, i) => {
      const n = w.charges[key];
      const x = width / 2 + (i - 1) * (bw + 8);
      const b = button(this, x, bottom + 54, bw, 40, () => this.useCharge(key), t.levelUp.charges[key](n));
      if (n <= 0) b.setAlpha(0.4).disableInteractive();
      if (key === 'banish' && this.banishing) b.setStrokeStyle(3, 0xff8090);
    });
    if (!this.sys.game.device.input.touch)
      label(this, width / 2, bottom + 90, t.levelUp.chargeKeys, 12, { color: UI.muted });
    this.highlight();

    bindKeys(this, (kb) => kb.on('keydown', this.onKey, this));
    restartOnResize(this);
  }

  private onKey(e: KeyboardEvent): void {
    const n = this.cards.length;
    const k = e.key.toLowerCase();
    if (e.key >= '1' && e.key <= String(n)) this.choose(Number(e.key) - 1);
    else if (e.key === 'ArrowUp' || k === 'w') this.move(-1);
    else if (e.key === 'ArrowDown' || k === 's') this.move(1);
    else if (e.key === 'Enter' || e.key === ' ') this.choose(this.selected);
    else if (k === 'r') this.useCharge('reroll');
    else if (k === 'x') this.useCharge('skip');
    else if (k === 'b') this.useCharge('banish');
    else if (e.key === 'Escape' && this.banishing) this.refresh(false);
  }

  private move(d: number): void {
    this.selected = (this.selected + d + this.cards.length) % this.cards.length;
    this.highlight();
  }

  private highlight(): void {
    const on = this.banishing ? 0xff8090 : UI.accent;
    this.cards.forEach((c, i) =>
      c.setStrokeStyle(i === this.selected ? 3 : 2, i === this.selected ? on : UI.border),
    );
  }

  private useCharge(key: ChargeKey): void {
    const w = this.world;
    if (w.charges[key] <= 0) return;
    if (key === 'reroll') w.reroll();
    else if (key === 'skip') w.skipLevelUp();
    else return this.refresh(!this.banishing);
    this.refresh(false);
  }

  private choose(i: number): void {
    if (this.banishing) this.world.banish(i);
    else this.world.chooseUpgrade(i);
    this.refresh(false);
  }

  /** Rebuilds the cards while the level-up lasts, closes the overlay once it is over. */
  private refresh(banishing: boolean): void {
    if (this.world.state === 'levelup') this.scene.restart({ world: this.world, banishing });
    else this.scene.stop();
  }
}
