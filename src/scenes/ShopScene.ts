import Phaser from 'phaser';
import {
  confirmPurchase,
  shopCost,
  setShopLevel,
  shopLevel,
  shopShortfall,
  type MetaSave,
  type ShopCart,
} from '../core/meta';
import { SHOP, SHOP_IDS, SHOP_SECTIONS, type ShopId, type ShopSection } from '../data/shop';
import { t } from '../i18n/pt-BR';
import { ART_SCALE } from '../render/art/pen';
import { STAT_ICON } from '../render/buildPanel';
import { formatStatDelta } from '../render/describe';
import { loadSave, writeSave } from '../render/save';
import { setSetting, settings } from '../render/settings';
import { DEV_MODE, devTag } from '../render/dev';
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
/** Smallest item card: wide enough for icon, name and price, tall enough to touch. */
const CARD_MIN_W = 150;
const CARD_MIN_H = 40;
/** Section tabs, when the whole list doesn't fit. */
const TAB_H = 40;

/** Test mode's own "Gaspar already greeted" (this session only; the real option is the player's). */
let devGasparMet = false;

/** The section an item belongs to. */
function sectionOf(id: ShopId): ShopSection {
  return (Object.keys(SHOP_SECTIONS) as ShopSection[]).find((k) => SHOP_SECTIONS[k].includes(id)) ?? 'stats';
}
const SECTION_ICON: Record<ShopSection, string> = {
  stats: 'icon.might',
  helps: 'icon.reroll',
  special: 'icon.amount',
};
const SECTIONS = Object.keys(SHOP_SECTIONS) as ShopSection[];

/** Icon of a Loja item: the passive that raises the same stat, or the helper's own icon. */
function itemIcon(id: ShopId): string {
  const def = SHOP[id];
  if ('stat' in def) return STAT_ICON[def.stat] ?? `icon.${id}`;
  return 'charge' in def ? `icon.${def.charge}` : `icon.${id}`;
}

/** What an item gives at `level` (0 = nothing yet). */
function effectAt(id: ShopId, level: number): string {
  if (level <= 0) return t.shop.none;
  const def = SHOP[id];
  if ('stat' in def) return formatStatDelta(def.stat, def.perLevel * level);
  return 'charge' in def ? t.shop.chargeTotal[def.charge](level) : t.shop.reviveTotal(level);
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
    // Gaspar greets the player on the first visit only (the scene rebuilds after each purchase).
    // Test mode greets once a session and never spends the real player's first greeting.
    const greet = DEV_MODE ? !devGasparMet : !settings().gasparMet;
    if (greet && DEV_MODE) devGasparMet = true;
    else if (greet) setSetting('gasparMet', true);
    /** The title with Gaspar's anvil before it. */
    const title = (y: number, size: number): void => {
      const text = label(this, cx + size * 0.6, y, t.shop.title, size, { bold: true, color: UI.gold });
      this.add
        .image(text.x - text.width / 2 - size * 0.7, y, 'icon.anvil')
        .setScale((ART_SCALE * size) / BADGE);
    };
    if (short) {
      // Phone lying down: title, gold and Back share the top row; the greeting fades in and out over the list.
      title(28, 24);
      label(this, width - s.right - 16, 28, t.shop.gold(save.gold), 16, {
        bold: true,
        color: UI.gold,
      }).setOrigin(1, 0.5);
      if (greet) this.greetingBanner(cx, 60);
    } else {
      title(30, 28);
      const intro = label(this, cx + 14, 60, greet ? t.shop.greeting : t.shop.intro, 13, {
        color: greet ? UI.text : UI.muted,
        wrap: Math.min(500, width - 64),
      });
      this.add.image(intro.x - intro.width / 2 - 16, 60, 'icon.gaspar').setScale((ART_SCALE * 26) / BADGE);
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

    // The list, section by section; cards as tall as the space allows (at least a touch target).
    const listW = listRight - left;
    const cols = Math.max(1, Math.min(3, Math.floor((listW + GAP) / (CARD_MIN_W + GAP))));
    const rowsOf = (keys: readonly ShopSection[]) =>
      keys.reduce((n, k) => n + Math.ceil(SHOP_SECTIONS[k].length / cols), 0);
    const fits = (listBottom - top - SECTIONS.length * HEAD) / rowsOf(SECTIONS) - GAP >= CARD_MIN_H;
    // Too small for the whole list (small phones): one section at a time, under a row of section tabs.
    const current = sectionOf(this.cart.selected ?? (SHOP_SECTIONS.stats[0] as ShopId));
    const shown = fits ? SECTIONS : [current];
    const ids: ShopId[] = [];
    const cards: (Phaser.GameObjects.Rectangle | null)[] = [];
    let y = top;
    if (!fits) {
      const tw = (listW - GAP * (SECTIONS.length - 1)) / SECTIONS.length;
      for (const [i, key] of SECTIONS.entries()) {
        const tab = button(
          this,
          left + i * (tw + GAP) + tw / 2,
          y + TAB_H / 2,
          tw,
          TAB_H,
          () => this.showSection(key),
          t.shop.tabs[key],
        );
        tab.setData('action', () => this.showSection(key));
        if (key === current) tab.setStrokeStyle(3, UI.accent);
        cards.push(tab);
      }
      y += TAB_H + GAP;
    }
    const heads = fits ? SECTIONS.length * HEAD : 0;
    const cardH = Math.max(CARD_MIN_H, Math.min(52, (listBottom - y - heads) / rowsOf(shown) - GAP));
    const cardW = (listW - GAP * (cols - 1)) / cols;
    for (const key of shown) {
      if (fits) {
        this.add.image(left + 9, y + HEAD / 2 - 2, SECTION_ICON[key]).setScale((ART_SCALE * 18) / BADGE);
        label(this, left + 22, y + 2, t.shop.sections[key], 14, {
          bold: true,
          color: UI.muted,
          align: 'left',
        });
        y += HEAD;
      }
      SHOP_SECTIONS[key].forEach((id, i) => {
        const x = left + (i % cols) * (cardW + GAP) + cardW / 2;
        const cy = y + Math.floor(i / cols) * (cardH + GAP) + cardH / 2;
        cards.push(this.card(id, x, cy, cardW, cardH, cards.length));
        ids.push(id);
      });
      y += Math.ceil(SHOP_SECTIONS[key].length / cols) * (cardH + GAP);
    }
    cards.push(backButton(this, t.shop.back, () => this.back()));
    const tabs = cards.length - ids.length - 1;
    const start = Math.max(0, ids.indexOf(this.cart.selected as ShopId));
    this.nav = keyNav(this, cards, 0, tabs + start, (i) => {
      const id = ids[i - tabs];
      if (id) this.select(id);
    });
    this.select(ids[start] as ShopId);

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.back());
      // With section tabs, Q/E switch them (as the Coleção's).
      if (!fits)
        kb.on('keydown', (e: KeyboardEvent) => {
          const k = e.key.toLowerCase();
          const d = k === 'q' ? -1 : k === 'e' ? 1 : 0;
          if (d)
            this.showSection(
              SECTIONS[(SECTIONS.indexOf(current) + d + SECTIONS.length) % SECTIONS.length] as ShopSection,
            );
        });
      if (DEV_MODE)
        kb.on('keydown', (e: KeyboardEvent) => {
          if (e.key === '+' || e.key === '=') this.devStep(1);
          else if (e.key === '-') this.devStep(-1);
        });
    });
    devTag(this);
    restartOnResize(this);
  }

  /** Section tabs: show `key`'s items, its first one selected. */
  private showSection(key: ShopSection): void {
    this.scene.restart({ focus: SHOP_SECTIONS[key][0] });
  }

  /** Short layout: Gaspar's first-visit line as a banner that fades out by itself. */
  private greetingBanner(cx: number, y: number): void {
    const text = label(this, cx + 14, y, t.shop.greeting, 14, { wrap: this.scale.width - 96 });
    const w = text.width + 64;
    const h = Math.max(36, text.height + 14);
    const bg = this.add.rectangle(cx, y, w, h, UI.panel, 0.96).setStrokeStyle(2, UI.goldHex);
    const face = this.add
      .image(text.x - text.width / 2 - 16, y, 'icon.gaspar')
      .setScale((ART_SCALE * 26) / BADGE);
    const parts = [bg, face, text];
    parts.forEach((o, i) => o.setDepth(20 + i)); // the panel was made after the text it measures
    this.tweens.add({
      targets: parts,
      alpha: 0,
      delay: 3500,
      duration: 600,
      onComplete: () => parts.forEach((o) => o.destroy()),
    });
  }

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
    // Space/Enter on the focused card buys it (the confirmation); in test mode it raises it for free.
    card.setData('action', () => (DEV_MODE ? this.devStep(1) : this.confirm()));
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
    if (!compact && !DEV_MODE) label(this, tx, y + h / 2 - 20, level, 12, { color: UI.muted, align: 'left' });
    const py = compact ? y : y + h / 2 - 12;
    if (DEV_MODE)
      // Test mode: no prices, just where each item stands.
      label(this, rx, py, level, 12, {
        bold: true,
        color: shopLevel(save, id) ? UI.gold : UI.muted,
      }).setOrigin(1, 0.5);
    else if (cost === null) seal(this, rx, py, compact ? t.shop.maxedShort : t.shop.maxed);
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
    if (DEV_MODE) return this.devControls(id, level);
    // Keyboard players get the two-step rule spelled out (touch players see the button).
    if (!this.sys.game.device.input.touch && h >= 180)
      d.push(label(this, x + w / 2, y + h - 12 - 52, t.shop.hintKeys, 12, { color: UI.muted }));
    if (cost === null) {
      const done = seal(this, x + w - pad, y + h - pad - 12, t.shop.maxed);
      d.push(done.text, done.box);
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

  /** Test mode: − and + for this item, and the whole Loja at max or at zero, all free. */
  private devControls(id: ShopId, level: number): void {
    const { x, y, w, h } = this.detailBox;
    const d = this.detail;
    const pad = 12;
    const bw = (w - pad * 3) / 2;
    const add = (bx: number, by: number, text: string, act: () => void, off = false) => {
      const b = button(this, bx + bw / 2, by, bw, 36, act, text);
      const txt = b.getData('label') as Phaser.GameObjects.Text;
      // The signs read big; the long labels shrink to fit narrow panels.
      if (text.length === 1) txt.setFontSize(24);
      else if (txt.width > bw - 12) txt.setFontSize(13);
      d.push(b, txt);
      if (off) disable(b);
    };
    const low = y + h - pad - 18;
    const high = low - 44;
    add(x + pad, high, t.dev.down, () => this.devStep(-1), level === 0);
    add(x + pad * 2 + bw, high, t.dev.up, () => this.devStep(1), level === SHOP[id].maxLevel);
    add(x + pad, low, t.dev.allZero, () => this.devAll(false));
    add(x + pad * 2 + bw, low, t.dev.allMax, () => this.devAll(true));
    if (h >= 200) d.push(label(this, x + w / 2, high - 30, t.dev.hint, 12, { color: UI.muted }));
  }

  private devStep(by: number): void {
    const id = this.cart.selected;
    if (!DEV_MODE || !id || !this.ready) return;
    const save = loadSave();
    setShopLevel(save, id, shopLevel(save, id) + by);
    this.devSave(save);
  }

  private devAll(max: boolean): void {
    if (!this.ready) return;
    const save = loadSave();
    for (const id of SHOP_IDS) setShopLevel(save, id, max ? SHOP[id].maxLevel : 0);
    this.devSave(save);
  }

  private devSave(save: MetaSave): void {
    this.ready = false;
    writeSave(save);
    this.scene.restart({ focus: this.cart.selected });
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
