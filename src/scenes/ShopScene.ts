import Phaser from 'phaser';
import { buy, shopCost, shopLevel } from '../core/meta';
import { SHOP, SHOP_IDS, type ShopDef, type ShopId } from '../data/shop';
import { t } from '../i18n/pt-BR';
import { formatStatDelta } from '../render/describe';
import { loadSave, writeSave } from '../render/save';
import {
  UI,
  backButton,
  bindKeys,
  button,
  disable,
  gridCols,
  isShort,
  keyNav,
  label,
  restartOnResize,
  seal,
  safeArea,
} from '../render/ui';
import { SCENES } from './keys';

/** Permanent upgrades, bought with banked gold. */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super(SCENES.shop);
  }

  /** Keyboard focus, kept when the scene rebuilds after a purchase. */
  private focus: ShopId | null = null;

  init(data: { focus?: ShopId }): void {
    this.focus = data.focus ?? null;
  }

  /** Purchases wait a moment after (re)building, so a double tap buys one level, not two. */
  private ready = false;

  create(): void {
    const { width, height } = this.scale;
    const cards: (Phaser.GameObjects.Rectangle | null)[] = [];
    this.ready = false;
    this.time.delayedCall(250, () => (this.ready = true));
    const cx = width / 2;
    const save = loadSave();
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    const short = isShort(this);
    if (short) {
      // Phone lying down: title, gold and Back share the top row, so every card fits.
      label(this, cx, 28, t.shop.title, 24, { bold: true, color: UI.gold });
      label(this, width - safeArea().right - 16, 28, t.shop.gold(save.gold), 16, {
        bold: true,
        color: UI.gold,
      }).setOrigin(1, 0.5);
      label(this, cx, 60, t.shop.intro, 13, { color: UI.muted, wrap: width - 32 });
    } else {
      label(this, cx, 34, t.shop.title, 28, { bold: true, color: UI.gold });
      label(this, cx, 66, t.shop.intro, 14, { color: UI.muted, wrap: Math.min(520, width - 32) });
      label(this, cx, 100, t.shop.gold(save.gold), 18, { bold: true, color: UI.gold });
    }

    let focus = -1;
    const gap = 8;
    const top = short ? 80 : 124;
    const avail = height - top - (short ? 12 : 70);
    // One column on narrow screens, more when the list wouldn't fit in height.
    const cols = gridCols(SHOP_IDS.length, width, avail, 44, gap, width >= 640 ? 2 : 1);
    const cardW = Math.min(300, (width - 24 - gap * (cols - 1)) / cols);
    const rows = Math.ceil(SHOP_IDS.length / cols);
    const cardH = Math.max(40, Math.min(58, avail / rows - gap));
    const left = cx - (cols * cardW + (cols - 1) * gap) / 2;
    SHOP_IDS.forEach((id, i) => {
      const x = left + (i % cols) * (cardW + gap) + cardW / 2;
      const y = top + Math.floor(i / cols) * (cardH + gap) + cardH / 2;
      const cost = shopCost(save, id);
      const done = cost === null;
      const affordable = !done && cost <= save.gold;
      const card = button(this, x, y, cardW, cardH, () => this.buy(id));
      if (id === this.focus) focus = i;
      cards.push(card);
      if (!affordable) disable(card);
      const lx = x - cardW / 2 + 10;
      const small = cardH < 50;
      label(this, lx, y - cardH / 2 + 5, t.shop.items[id], small ? 14 : 16, {
        bold: true,
        align: 'left',
        color: affordable ? UI.text : UI.textOff,
      });
      label(this, lx, y - cardH / 2 + (small ? 22 : 27), describeShop(id), small ? 12 : 13, {
        color: affordable ? UI.muted : UI.textOff,
        align: 'left',
      });
      const rx = x + cardW / 2 - 10;
      label(this, rx, y - cardH / 2 + 13, t.shop.level(shopLevel(save, id), SHOP[id].maxLevel), 13, {
        color: affordable ? UI.text : UI.textOff,
      }).setOrigin(1, 0.5);
      if (done) {
        // Completo: a seal of its own, so it never reads as "can't afford".
        seal(this, rx, y + cardH / 2 - 12, t.shop.maxed);
      } else
        label(this, rx, y + cardH / 2 - 12, t.shop.cost(cost), 13, {
          bold: true,
          color: affordable ? UI.gold : UI.danger,
        }).setOrigin(1, 0.5);
    });
    // Back sits on a row of its own.
    while (cards.length % cols !== 0) cards.push(null);
    cards.push(backButton(this, t.shop.back, () => this.back()));
    keyNav(this, cards, cols, focus);

    bindKeys(this, (kb) => kb.once('keydown-ESC', () => this.back()));
    restartOnResize(this);
  }

  private buy(id: ShopId): void {
    const save = loadSave();
    if (!this.ready || !buy(save, id)) return;
    this.ready = false; // the restart is queued: a second press this frame still lands here
    writeSave(save);
    this.scene.restart({ focus: id });
  }

  private back(): void {
    this.scene.start(SCENES.menu);
  }
}

function describeShop(id: ShopId): string {
  const def: ShopDef = SHOP[id];
  return 'stat' in def ? formatStatDelta(def.stat, def.perLevel) : t.shop.charges[def.charge];
}
