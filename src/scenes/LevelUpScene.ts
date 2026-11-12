import Phaser from 'phaser';
import type { World } from '../core/world';
import type { ChargeKey } from '../data/shop';
import { config } from '../data/config';
import { t } from '../i18n/pt-BR';
import { canBanish, canReroll, statPreview } from '../core/upgrades';
import { BuildSlots, StatSheet, type SlotFocus } from '../render/buildPanel';
import { describeUpgrade, formatCardTotal } from '../render/describe';
import { ART_SCALE } from '../render/art/pen';
import { UI, bindKeys, button, dim, disable, label, restartOnResize, safeArea } from '../render/ui';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

const CHARGES: ChargeKey[] = ['reroll', 'skip', 'banish'];
/**
 * When the choice opens, the overlay fades in and ignores touches for this long: a finger that taps again to
 * dodge (floating joystick) must not pick whatever card is under it. Also lets the level pulse show through.
 */
const ARM_DELAY = 300;
/** The build panel: width beside the cards, inner padding. */
const PANEL_W = 250;
const PANEL_PAD = 12;

/** Overlay with the upgrade choices. The world is frozen (state 'levelup') while it is open. */
export class LevelUpScene extends Phaser.Scene {
  private world!: World;
  private cards: Phaser.GameObjects.Rectangle[] = [];
  private selected = 0;
  private slots: BuildSlots | null = null;
  private sheet: StatSheet | null = null;
  /** After pressing Banir, the next card picked is banished instead of taken. */
  private banishing = false;

  constructor() {
    super(SCENES.levelUp);
  }

  /** True when rebuilt after Trocar, Banir or a queued level-up: the player is already looking, no guard. */
  private again = false;
  /** False until ARM_DELAY has passed: keys are ignored meanwhile, like the pointer. */
  private armed = false;

  init(data: { world: World; banishing?: boolean; again?: boolean }): void {
    this.world = data.world;
    this.banishing = !!data.banishing && this.world.charges.banish > 0;
    this.again = !!data.again;
    this.selected = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const w = this.world;
    const opts = w.upgradeOptions;
    // Phones have no number keys: no "1." on the cards and a hint about touching.
    const touch = this.sys.game.device.input.touch;
    // The HUD (bars, counters, build strip) is drawn on top: the cards stay clear of it.
    const hud = this.scene.get(SCENES.hud) as HudScene;
    hud.quiet();
    const n = opts.length;
    // Short screens (phone lying down): the charge buttons go in a column beside the cards.
    const side = height < hud.barsBottom + 480 && width >= 440 + 150 + 32;
    const cardW = side ? Math.min(440, width - 32 - 150) : Math.min(440, width - 24);
    const gap = side ? 10 : 12;
    const bw = side ? 138 : Math.min(130, (cardW - 16) / 3);
    // Lying down, cards and charges fit to the right of the build strip when wide enough; else below it.
    const besideStrip = side && hud.stripRight + 10 + cardW + 12 + bw + 10 <= width - safeArea().right;
    // The build and stats panel: beside the cards when wide, under the charges on tall phones, else none (the
    // HUD's build strip stays). With the panel, the HUD strip hides (the panel repeats it, with the preview).
    const slotSize = width >= 700 ? 28 : 24;
    const belowH = BuildSlots.heightFor(slotSize) + 10 + StatSheet.heightFor(true) + PANEL_PAD * 2;
    const belowKeep = hud.countersBottom;
    const belowCardH = (height - belowKeep - 62 - (touch ? 80 : 100) - belowH - 8) / n - gap;
    const panel: 'right' | 'below' | null = side
      ? null
      : width >= cardW + 16 + PANEL_W + 32 && height >= 560
        ? 'right'
        : height >= 700 && belowCardH >= 76
          ? 'below'
          : null;
    // Lying down on a small phone, the cards can't fit under the build strip: it hides for the choice (the cards
    // say each level) and the cards start right under the bars.
    const tight = side && !besideStrip && (height - hud.bottom - 88) / n - gap < 60;
    hud.setBuildVisible(!panel && !tight);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => hud.setBuildVisible(true));
    const keep = panel ? hud.countersBottom : besideStrip || tight ? hud.barsBottom : hud.bottom;
    const cardH = side
      ? Math.max(60, Math.min(100, (height - keep - 88) / n - gap))
      : panel === 'below'
        ? Math.min(100, belowCardH)
        : Math.max(76, Math.min(100, (height - keep - 190) / n - gap));
    const top = side
      ? keep + 54
      : panel === 'below'
        ? keep + 62
        : Math.max(keep + 62, height / 2 - ((cardH + gap) * n) / 2 - 10);
    const cx = besideStrip
      ? hud.stripRight + 10 + cardW / 2
      : side
        ? width / 2 - (bw + 12) / 2
        : panel === 'right'
          ? width / 2 - (PANEL_W + 16) / 2
          : width / 2;
    // The charge column starts under the gold and kills line.
    const chargeTop = Math.max(top, hud.countersBottom + 8);

    // The whole screen dims; the HUD (bars, timer, build) is brought above the overlay.
    dim(this, 0.72);
    this.scene.bringToTop(SCENES.hud);
    // Keys wait for the same delay as the pointer: a reflex key at the opening must not choose a card (PB-04).
    this.armed = this.again;
    if (!this.again) {
      this.input.enabled = false;
      this.cameras.main.setAlpha(0);
      this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: ARM_DELAY });
      this.time.delayedCall(ARM_DELAY, () => {
        this.input.enabled = true;
        this.armed = true;
      });
    }
    label(
      this,
      besideStrip || panel === 'right' ? cx : width / 2,
      side ? top - 28 : top - 40,
      t.levelUp.title,
      side ? 26 : 30,
      {
        bold: true,
        color: UI.gold,
        stroke: true,
      },
    );
    const owned = w.weapons;
    this.cards = opts.map((opt, i) => {
      const y = top + i * (cardH + gap) + cardH / 2;
      const card = button(this, cx, y, cardW, cardH, () => this.choose(i));
      // Pointing at a card (mouse) focuses it, so the panel previews it.
      card.on('pointerover', () => {
        this.selected = i;
        this.highlight();
      });
      const d = describeUpgrade(opt, owned, w.passives);
      // Without the stat panel, a passive's card carries the total itself: "Vida máxima +20 (180 → 200)" (NU-04).
      const pv = panel ? null : statPreview(w, opt);
      if (pv) {
        const total = formatCardTotal(pv.stat, pv.from, pv.to, config.player.stats[pv.stat]);
        if (total) d.desc = t.levelUp.withTotal(d.desc, total);
      }
      // A short card (phone lying down) packs title, numbers and recipe closer, so the numbers stay.
      const tight = cardH < 74;
      const x0 = cx - cardW / 2;
      this.add.image(x0 + 32, y, d.icon).setScale(ART_SCALE * 1.6);
      const left = x0 + 62;
      const textW = cardW - 62 - 12;
      const title = label(
        this,
        left,
        y - cardH / 2 + (tight ? 5 : 9),
        touch ? d.title : t.levelUp.numbered(i + 1, d.title),
        tight ? 16 : 18,
        {
          bold: true,
          align: 'left',
        },
      );
      const tag = label(this, x0 + cardW - 12, y - cardH / 2 + (tight ? 14 : 19), d.tag, 13, { color: UI.gold }).setOrigin(
        1,
        0.5,
      );
      // A long name next to a long tag (narrow phones): the name shrinks until they no longer touch.
      for (let size = tight ? 15 : 17; size >= 13 && title.x + title.width > tag.x - tag.width - 8; size--)
        title.setFontSize(size);
      // Numbers first (a new weapon's level 1 line), the flavour only when there is room.
      const desc = label(this, left, y - cardH / 2 + (tight ? 24 : 33), d.stats ? `${d.stats}\n${d.desc}` : d.desc, tight ? 13 : 14, {
        color: UI.muted,
        align: 'left',
        wrap: textW,
      });
      // The card's text ends here: above the recipe when there is one, else near the bottom edge.
      let limit = y + cardH / 2 - 4;
      if (d.recipe) {
        const ry = y + cardH / 2 - (tight ? 4 : 7);
        // The recipe's passive as a mini icon, then its state ("você tem", "falta" or "Elo pronto").
        const rx = d.recipeIcon ? left + 18 : left;
        const recipe = label(this, rx, ry, d.recipe, tight ? 11 : 12, {
          color: d.recipeMissing ? UI.muted : UI.gold,
          align: 'left',
          wrap: left + textW - rx,
        }).setOrigin(0, 1);
        limit = ry - recipe.height - 3;
        if (d.recipeIcon) this.add.image(left + 7, ry - 8, d.recipeIcon).setScale((ART_SCALE * 16) / 28);
      }
      // The recipe always stays (it is what opens an Elo, NU-02). A new weapon gives up its flavour first, then a long
      // description its last lines; a single line that still overlaps goes (the title and tag say the rest).
      if (d.stats && desc.y + desc.height > limit) desc.setText(d.stats);
      let lines = desc.getWrappedText();
      while (desc.y + desc.height > limit && lines.length > 1) {
        lines = lines.slice(0, -1);
        desc.setText(`${lines.join('\n').replace(/[\s.,;:]+$/, '')}…`);
      }
      if (desc.y + desc.height > limit) desc.setVisible(false);
      return card;
    });

    const bottom = top + n * (cardH + gap);
    const hint = this.banishing ? t.levelUp.banishHint : touch ? t.levelUp.hintTouch : t.levelUp.hintKeys;
    label(this, cx, bottom + (side ? 8 : 14), hint, 14, { color: this.banishing ? UI.danger : UI.muted });

    // Trocar · Pular · Banir: a row under the cards, or a column beside them.
    const bx = cx + cardW / 2 + 12 + bw / 2;
    CHARGES.forEach((key, i) => {
      const c = w.charges[key];
      const x = side ? bx : cx + (i - 1) * (bw + 8);
      const y = side ? chargeTop + 22 + i * 52 : bottom + 54;
      const b = button(this, x, y, bw, side ? 44 : 40, () => this.useCharge(key), t.levelUp.charges[key](c));
      if (key === 'skip') {
        // What skipping pays, in gold under the label.
        const main = b.getData('label') as Phaser.GameObjects.Text;
        const h = b.height;
        main.setY(y - h * 0.16).setFontSize(Math.min(18, h * 0.36));
        label(this, x, y + h * 0.25, t.levelUp.skipGold(config.skipGold), Math.min(13, h * 0.3), {
          bold: true,
          color: UI.gold,
        });
      }
      // A charge that would do nothing here is off too: Trocar with no other cards, Banir with no card to spare.
      const useless =
        (key === 'reroll' && !canReroll(w)) || (key === 'banish' && !opts.some((o) => canBanish(w, o)));
      if (c <= 0 || useless) disable(b);
      if (key === 'banish' && this.banishing) b.setStrokeStyle(3, UI.dangerHex);
    });
    if (!touch)
      label(this, side ? bx : cx, side ? chargeTop + 22 + 3 * 52 : bottom + 90, t.levelUp.chargeKeys, 12, {
        color: UI.muted,
        wrap: side ? bw : undefined,
      });
    this.slots = null;
    this.sheet = null;
    if (panel === 'right') this.buildPanel(cx + cardW / 2 + 16, top, PANEL_W, slotSize, false);
    else if (panel === 'below')
      this.buildPanel(cx - cardW / 2, bottom + (touch ? 80 : 100), cardW, slotSize, true);
    this.highlight();

    bindKeys(this, (kb) => kb.on('keydown', this.onKey, this));
    restartOnResize(this);
  }

  /** The build slots and the stat sheet in a panel at (x, y), `w` wide. */
  private buildPanel(x: number, y: number, w: number, slotSize: number, columns: boolean): void {
    const bg = this.add.rectangle(x, y, w, 10, UI.panel, 0.9).setOrigin(0).setStrokeStyle(2, UI.border);
    const inner = w - PANEL_PAD * 2;
    const slots = (this.slots = new BuildSlots(this, slotSize));
    slots.container.setPosition(x + PANEL_PAD + (columns ? 0 : (inner - slots.width) / 2), y + PANEL_PAD);
    const sheetY = y + PANEL_PAD + slots.height + 10;
    this.sheet = new StatSheet(this, x + PANEL_PAD, sheetY, inner, this.world, columns);
    bg.setSize(w, sheetY + this.sheet.height + PANEL_PAD - y);
  }

  /** The slot the focused card fills (blinking; a star when it takes a new one) and its stat change. */
  private preview(): void {
    const opt = this.world.upgradeOptions[this.selected];
    if (!this.slots || !this.sheet || !opt) return;
    let focus: SlotFocus | null = null;
    if (opt.kind === 'weapon') {
      const i = this.world.weapons.findIndex((o) => o.id === opt.id);
      focus = { kind: 'weapon', index: i < 0 ? this.world.weapons.length : i, fresh: i < 0 };
    } else if (opt.kind === 'passive') {
      const ids = Object.keys(this.world.passives);
      const i = ids.indexOf(opt.id);
      focus = { kind: 'passive', index: i < 0 ? ids.length : i, fresh: i < 0 };
    }
    this.slots.refresh(this.world, this.banishing ? null : focus);
    this.sheet.setPreview(this.banishing ? null : statPreview(this.world, opt));
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.armed || e.repeat) return; // not armed yet, or a movement key still held when the overlay opened
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
    this.preview();
  }

  private useCharge(key: ChargeKey): void {
    const w = this.world;
    if (w.charges[key] <= 0) return;
    if (key === 'banish' && !this.banishing && !w.upgradeOptions.some((o) => canBanish(w, o))) return;
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
    if (this.world.state === 'levelup') this.scene.restart({ world: this.world, banishing, again: true });
    else this.scene.stop();
  }
}
