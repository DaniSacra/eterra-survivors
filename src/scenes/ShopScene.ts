import Phaser from 'phaser';
import { buy, shopCost, shopLevel } from '../core/meta';
import { SHOP, SHOP_IDS, type ShopDef, type ShopId } from '../data/shop';
import { t } from '../i18n/pt-BR';
import { formatStatDelta } from '../render/describe';
import { loadSave, writeSave } from '../render/save';
import { UI, bindKeys, button, keyNav, label, restartOnResize } from '../render/ui';
import { SCENES } from './keys';

/** Permanent upgrades, bought with banked gold. */
export class ShopScene extends Phaser.Scene {
  constructor() {
    super(SCENES.shop);
  }

  /** Keyboard focus, kept when the scene rebuilds after a purchase. */
  private focus = 0;

  init(data: { focus?: number }): void {
    this.focus = data.focus ?? 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const cards: Phaser.GameObjects.Rectangle[] = [];
    const cx = width / 2;
    const save = loadSave();
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    label(this, cx, 34, t.shop.title, 28, { bold: true, color: '#ffd870' });
    label(this, cx, 66, t.shop.intro, 14, { color: UI.muted, wrap: Math.min(520, width - 32) });
    label(this, cx, 100, t.shop.gold(save.gold), 18, { bold: true, color: '#ffd870' });

    const gap = 8;
    const top = 124;
    const avail = height - top - 70;
    // One column on narrow screens, unless the list wouldn't fit in height.
    const cols = width >= 640 || SHOP_IDS.length * (44 + gap) > avail ? 2 : 1;
    const cardW = Math.min(300, (width - 24 - gap * (cols - 1)) / cols);
    const rows = Math.ceil(SHOP_IDS.length / cols);
    const cardH = Math.max(40, Math.min(58, avail / rows - gap));
    const left = cx - (cols * cardW + (cols - 1) * gap) / 2;
    SHOP_IDS.forEach((id, i) => {
      const x = left + (i % cols) * (cardW + gap) + cardW / 2;
      const y = top + Math.floor(i / cols) * (cardH + gap) + cardH / 2;
      const cost = shopCost(save, id);
      const card = button(this, x, y, cardW, cardH, () => this.buy(id, i));
      cards.push(card);
      if (cost === null || cost > save.gold) card.setAlpha(0.55);
      const lx = x - cardW / 2 + 10;
      const small = cardH < 50;
      label(this, lx, y - cardH / 2 + 5, t.shop.items[id], small ? 14 : 16, { bold: true, align: 'left' });
      label(this, lx, y - cardH / 2 + (small ? 22 : 27), describeShop(id), small ? 12 : 13, {
        color: UI.muted,
        align: 'left',
      });
      const rx = x + cardW / 2 - 10;
      label(this, rx, y - cardH / 2 + 13, t.shop.level(shopLevel(save, id), SHOP[id].maxLevel), 13).setOrigin(
        1,
        0.5,
      );
      label(this, rx, y + cardH / 2 - 12, cost === null ? t.shop.maxed : t.shop.cost(cost), 13, {
        bold: true,
        color: '#ffd870',
      }).setOrigin(1, 0.5);
    });
    cards.push(button(this, cx, height - 36, Math.min(220, width - 60), 44, () => this.back(), t.shop.back));
    keyNav(this, cards, cols, this.focus);

    bindKeys(this, (kb) => kb.once('keydown-ESC', () => this.back()));
    restartOnResize(this);
  }

  private buy(id: ShopId, index: number): void {
    const save = loadSave();
    if (!buy(save, id)) return;
    writeSave(save);
    this.scene.restart({ focus: index });
  }

  private back(): void {
    this.scene.start(SCENES.menu);
  }
}

function describeShop(id: ShopId): string {
  const def: ShopDef = SHOP[id];
  return 'stat' in def ? formatStatDelta(def.stat, def.perLevel) : t.shop.charges[def.charge];
}
