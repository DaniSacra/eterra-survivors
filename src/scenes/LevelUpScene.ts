import Phaser from 'phaser';
import type { World } from '../core/world';
import type { ChargeKey } from '../data/shop';
import { t } from '../i18n/pt-BR';
import { describeUpgrade } from '../render/describe';
import { ART_SCALE } from '../render/art/pen';
import { UI, bindKeys, button, disable, label, restartOnResize, safeArea } from '../render/ui';
import { SCENES } from './keys';

const CHARGES: ChargeKey[] = ['reroll', 'skip', 'banish'];
/** Height of the HUD's XP and life bars, left uncovered (HudScene layout). */
const HUD_BARS = 44;

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
    const cardW = Math.min(440, width - 24);
    // The HUD bars (XP and life) stay visible above the dimmed area.
    const keep = safeArea().top + HUD_BARS;
    const cardH = Math.max(76, Math.min(100, (height - keep - 250) / opts.length - 12));
    const top = Math.max(keep + 80, height / 2 - ((cardH + 12) * opts.length) / 2 - 10);

    this.add
      .rectangle(0, keep, width, height - keep, UI.dim, 0.72)
      .setOrigin(0)
      .setInteractive();
    label(this, width / 2, top - 44, t.levelUp.title, 30, { bold: true, color: UI.gold, stroke: true });
    const owned = w.weapons.map((o) => o.id);
    this.cards = opts.map((opt, i) => {
      const y = top + i * (cardH + 12) + cardH / 2;
      const card = button(this, width / 2, y, cardW, cardH, () => this.choose(i));
      const d = describeUpgrade(opt, owned);
      const x0 = width / 2 - cardW / 2;
      this.add.image(x0 + 32, y, d.icon).setScale(ART_SCALE * 1.6);
      const left = x0 + 62;
      const textW = cardW - 62 - 12;
      label(this, left, y - cardH / 2 + 9, `${i + 1}. ${d.title}`, 18, { bold: true, align: 'left' });
      label(this, x0 + cardW - 12, y - cardH / 2 + 19, d.tag, 13, { color: UI.gold }).setOrigin(1, 0.5);
      const desc = label(this, left, y - cardH / 2 + 33, d.desc, 14, {
        color: UI.muted,
        align: 'left',
        wrap: textW,
      });
      if (d.recipe && desc.y + desc.height + 16 <= y + cardH / 2)
        label(this, left, y + cardH / 2 - 7, d.recipe, 12, { color: UI.gold, align: 'left' }).setOrigin(0, 1);
      return card;
    });

    const bottom = top + opts.length * (cardH + 12);
    const hint = this.banishing ? t.levelUp.banishHint : t.levelUp.hint;
    label(this, width / 2, bottom + 14, hint, 14, { color: this.banishing ? UI.danger : UI.muted });

    // Trocar · Pular · Banir
    const bw = Math.min(130, (cardW - 16) / 3);
    CHARGES.forEach((key, i) => {
      const n = w.charges[key];
      const x = width / 2 + (i - 1) * (bw + 8);
      const b = button(this, x, bottom + 54, bw, 40, () => this.useCharge(key), t.levelUp.charges[key](n));
      if (n <= 0) disable(b);
      if (key === 'banish' && this.banishing) b.setStrokeStyle(3, UI.dangerHex);
    });
    if (!this.sys.game.device.input.touch)
      label(this, width / 2, bottom + 90, t.levelUp.chargeKeys, 12, { color: UI.muted });
    this.highlight();

    bindKeys(this, (kb) => kb.on('keydown', this.onKey, this));
    restartOnResize(this);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return; // a movement key still held when the overlay opened
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
    const on = this.banishing ? UI.dangerHex : UI.accent;
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
