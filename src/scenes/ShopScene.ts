import Phaser from 'phaser';
import {
  confirmPurchase,
  shopCost,
  shopLevel,
  shopShortfall,
  type MetaSave,
  type ShopCart,
} from '../core/meta';
import { SHOP, SHOP_SECTIONS, type ShopId, type ShopSection } from '../data/shop';
import { t } from '../i18n/pt-BR';
import { ART_SCALE } from '../render/art/pen';
import { STAT_ICON } from '../render/buildPanel';
import { formatStatDelta } from '../render/describe';
import { loadSave, writeSave } from '../render/save';
import {
  UI,
  backButton,
  bindKeys,
  button,
  disable,
  isShort,
  keyNav,
  label,
  restartOnResize,
  safeArea,
  seal,
  type KeyNav,
} from '../render/ui';
import { SCENES } from './keys';

/** Icon badges are drawn 28 px wide (render/art/icons.ts). */
const BADGE = 28;
const GAP = 8;
const HEAD = 24;
const SECTION_ICON: Record<ShopSection, string> = {
  stats: 'icon.might',
  helps: 'icon.reroll',
  special: 'icon.amount',
};
const SECTIONS = Object.keys(SHOP_SECTIONS) as ShopSection[];

/** Icon of a Loja item: the passive that raises the same stat, or the helper's own icon. */
function itemIcon(id: ShopId): string {
  const def = SHOP[id];
  return 'stat' in def ? (STAT_ICON[def.stat] ?? `icon.${id}`) : `icon.${def.charge}`;
}

/** What an item gives at `level` (0 = nothing yet). */
function effectAt(id: ShopId, level: number): string {
  if (level <= 0) return t.shop.none;
  const def = SHOP[id];
  return 'stat' in def
    ? formatStatDelta(def.stat, def.perLevel * level)
    : t.shop.chargeTotal[def.charge](level);
}

/**
 * Permanent upgrades, bought with banked gold. Every item looks available (only a price you can't pay turns red);
 * choosing one shows its detail, and buying needs a confirmation: Space/Enter, or the Comprar button.
 */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super(SCENES.shop);
  }

  /** The selected item, kept when the scene rebuilds after a purchase. */
  private cart: ShopCart = { selected: null };
  private save!: MetaSave;
  private detail: Phaser.GameObjects.GameObject[] = [];
  private detailBox = { x: 0, y: 0, w: 0, h: 0 };
  private nav: KeyNav | null = null;
  /** Purchases wait a moment after (re)building, so a double tap buys one level, not two. */
  private ready = false;

  init(data: { focus?: ShopId }): void {
    this.cart = { selected: data.focus ?? null };
  }

  create(): void {
    const { width, height } = this.scale;
    const s = safeArea();
    this.ready = false;
    this.time.delayedCall(250, () => (this.ready = true));
    this.detail = [];
    const cx = width / 2;
    const save = (this.save = loadSave());
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    const short = isShort(this);
    if (short) {
      // Phone lying down: title, gold and Back share the top row.
      label(this, cx, 28, t.shop.title, 24, { bold: true, color: UI.gold });
      label(this, width - s.right - 16, 28, t.shop.gold(save.gold), 16, {
        bold: true,
        color: UI.gold,
      }).setOrigin(1, 0.5);
    } else {
      label(this, cx, 30, t.shop.title, 28, { bold: true, color: UI.gold });
      label(this, cx, 60, t.shop.intro, 13, { color: UI.muted, wrap: Math.min(520, width - 32) });
      label(this, cx, 94, t.shop.gold(save.gold), 18, { bold: true, color: UI.gold });
    }

    // The detail panel goes beside the list on wide screens, under it on phones.
    const wide = width >= 760 || (short && width >= 600);
    const left = s.left + 12;
    const right = width - s.right - 12;
    const top = short ? 54 : 116;
    const bottom = short ? height - 10 : height - 68;
    let listRight = right;
    let listBottom = bottom;
    if (wide) {
      const dw = Math.min(320, (right - left) * (short ? 0.3 : 0.36));
      this.detailBox = { x: right - dw, y: top, w: dw, h: Math.min(260, bottom - top) };
      listRight = right - dw - 12;
    } else {
      const dh = 150;
      this.detailBox = { x: left, y: bottom - dh, w: right - left, h: dh };
      listBottom = bottom - dh - 10;
    }

    // The list, section by section; cards as tall as the space allows.
    const listW = listRight - left;
    const cols = Math.max(1, Math.min(3, Math.floor((listW + GAP) / (165 + GAP))));
    const rows = SECTIONS.reduce((n, k) => n + Math.ceil(SHOP_SECTIONS[k].length / cols), 0);
    const cardH = Math.max(34, Math.min(52, (listBottom - top - SECTIONS.length * HEAD) / rows - GAP));
    const cardW = (listW - GAP * (cols - 1)) / cols;
    const ids: ShopId[] = [];
    const cards: (Phaser.GameObjects.Rectangle | null)[] = [];
    let y = top;
    for (const key of SECTIONS) {
      this.add.image(left + 9, y + HEAD / 2 - 2, SECTION_ICON[key]).setScale((ART_SCALE * 18) / BADGE);
      label(this, left + 22, y + 2, t.shop.sections[key], 14, { bold: true, color: UI.muted, align: 'left' });
      y += HEAD;
      SHOP_SECTIONS[key].forEach((id, i) => {
        const x = left + (i % cols) * (cardW + GAP) + cardW / 2;
        const cy = y + Math.floor(i / cols) * (cardH + GAP) + cardH / 2;
        cards.push(this.card(id, x, cy, cardW, cardH, ids.length));
        ids.push(id);
      });
      y += Math.ceil(SHOP_SECTIONS[key].length / cols) * (cardH + GAP);
    }
    cards.push(backButton(this, t.shop.back, () => this.back()));
    const start = Math.max(0, ids.indexOf(this.cart.selected as ShopId));
    this.nav = keyNav(this, cards, 0, start, (i) => {
      const id = ids[i];
      if (id) this.select(id);
    });
    this.select(ids[start] as ShopId);

    bindKeys(this, (kb) => kb.once('keydown-ESC', () => this.back()));
    restartOnResize(this);
  }

  /** One item: icon, name, level and price (red when it can't be paid), or the Completo seal. */
  private card(
    id: ShopId,
    x: number,
    y: number,
    w: number,
    h: number,
    index: number,
  ): Phaser.GameObjects.Rectangle {
    const save = this.save;
    const card = button(this, x, y, w, h, () => {
      this.nav?.focus(index);
      this.select(id);
    });
    // Space/Enter on the focused card buys it (the confirmation).
    card.setData('action', () => this.confirm());
    const l = x - w / 2;
    const icon = Math.min(26, h - 12);
    this.add.image(l + 8 + icon / 2, y, itemIcon(id)).setScale((ART_SCALE * icon) / BADGE);
    const tx = l + 14 + icon;
    const cost = shopCost(save, id);
    const level = t.shop.level(shopLevel(save, id), SHOP[id].maxLevel);
    const rx = x + w / 2 - 8;
    // Short cards (phone lying down): one line, name and price only (the level shows in the detail).
    const compact = h < 44;
    label(this, tx, compact ? y : y - h / 2 + 5, t.shop.items[id], compact ? 12 : 13, {
      bold: true,
      align: 'left',
    }).setOrigin(0, compact ? 0.5 : 0);
    if (!compact) label(this, tx, y + h / 2 - 20, level, 12, { color: UI.muted, align: 'left' });
    const py = compact ? y : y + h / 2 - 12;
    if (cost === null) seal(this, rx, py, compact ? t.shop.maxedShort : t.shop.maxed);
    else
      label(this, rx, py, compact ? t.shop.costShort(cost) : t.shop.cost(cost), 12, {
        bold: true,
        color: cost <= save.gold ? UI.gold : UI.danger,
      }).setOrigin(1, 0.5);
    return card;
  }

  /** Shows the detail of `id`: what it gives now and next, its price and the Comprar button. */
  private select(id: ShopId): void {
    this.cart.selected = id;
    for (const o of this.detail) o.destroy();
    const { x, y, w, h } = this.detailBox;
    const save = this.save;
    const level = shopLevel(save, id);
    const max = SHOP[id].maxLevel;
    const cost = shopCost(save, id);
    const missing = shopShortfall(save, id);
    const d: Phaser.GameObjects.GameObject[] = (this.detail = []);
    d.push(this.add.rectangle(x, y, w, h, UI.panel, 0.95).setOrigin(0).setStrokeStyle(2, UI.accent));
    const pad = 12;
    const big = 36;
    d.push(
      this.add.image(x + pad + big / 2, y + pad + big / 2, itemIcon(id)).setScale((ART_SCALE * big) / BADGE),
    );
    const tx = x + pad * 2 + big;
    d.push(
      label(this, tx, y + pad, t.shop.items[id], 16, { bold: true, align: 'left', wrap: w - big - pad * 3 }),
    );
    d.push(label(this, tx, y + pad + 22, t.shop.level(level, max), 13, { color: UI.muted, align: 'left' }));
    const row = (ry: number, name: string, value: string, color: string) => {
      d.push(label(this, x + pad, ry, name, 13, { color: UI.muted, align: 'left' }));
      d.push(
        label(this, x + pad + 72, ry, value, 13, {
          bold: true,
          color,
          align: 'left',
          wrap: w - pad * 2 - 72,
        }),
      );
    };
    let ry = y + pad + big + 8;
    row(ry, t.shop.now, effectAt(id, level), UI.text);
    // Keyboard players get the two-step rule spelled out (touch players see the button).
    if (!this.sys.game.device.input.touch && h >= 180)
      d.push(label(this, x + w / 2, y + h - 12 - 52, t.shop.hintKeys, 11, { color: UI.muted }));
    if (cost === null) {
      d.push(seal(this, x + w - pad, y + h - pad - 12, t.shop.maxed).text);
      return;
    }
    ry += 20;
    row(ry, t.shop.next, effectAt(id, level + 1), UI.gold);
    const by = y + h - pad - 20;
    const bw = Math.min(220, w - pad * 2);
    if (missing)
      d.push(
        label(this, x + pad, by, t.shop.missing(missing), 13, {
          bold: true,
          color: UI.danger,
          align: 'left',
        }).setOrigin(0, 0.5),
      );
    const narrow = missing ? Math.min(bw, w - pad * 3 - 110) : bw;
    const buyBtn = button(
      this,
      x + w - pad - narrow / 2,
      by,
      narrow,
      40,
      () => this.confirm(),
      t.shop.buy(cost),
    );
    d.push(buyBtn, buyBtn.getData('label') as Phaser.GameObjects.Text);
    if (missing) disable(buyBtn);
  }

  private confirm(): void {
    const save = loadSave();
    if (!this.ready || !confirmPurchase(save, this.cart)) return;
    this.ready = false; // the restart is queued: a second press this frame still lands here
    writeSave(save);
    this.scene.restart({ focus: this.cart.selected });
  }

  private back(): void {
    this.scene.start(SCENES.menu);
  }
}
