import Phaser from 'phaser';
import { buy, shopCost, shopLevel } from '../core/meta';
import { SHOP, SHOP_IDS, type ShopDef, type ShopId } from '../data/shop';
import { t } from '../i18n/pt-BR';
import { formatStatDelta } from '../render/describe';
import { loadSave, writeSave } from '../render/save';
import { UI, bindKeys, button, disable, keyNav, label, restartOnResize } from '../render/ui';
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

  create(): void {
    const { width, height } = this.scale;
    const cards: Phaser.GameObjects.Rectangle[] = [];
    const cx = width / 2;
    const save = loadSave();
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    label(this, cx, 34, t.shop.title, 28, { bold: true, color: UI.gold });
    label(this, cx, 66, t.shop.intro, 14, { color: UI.muted, wrap: Math.min(520, width - 32) });
    label(this, cx, 100, t.shop.gold(save.gold), 18, { bold: true, color: UI.gold });

    let focus = 0;
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
      const done = cost === null;
      const affordable = !done && cost <= save.gold;
      const card = button(this, x, y, cardW, cardH, () => this.buy(id));
      if (affordable) {
        if (id === this.focus) focus = cards.length;
        cards.push(card);
      } else disable(card);
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
        const seal = label(this, rx - 6, y + cardH / 2 - 12, t.shop.maxed, 12, {
          bold: true,
          color: UI.okText,
        });
        seal.setOrigin(1, 0.5);
        this.add
          .rectangle(seal.x + 6, seal.y, seal.width + 12, seal.height + 2, UI.ok, 0.18)
          .setOrigin(1, 0.5)
          .setStrokeStyle(1, UI.ok);
      } else
        label(this, rx, y + cardH / 2 - 12, t.shop.cost(cost), 13, {
          bold: true,
          color: affordable ? UI.gold : UI.danger,
        }).setOrigin(1, 0.5);
    });
    cards.push(button(this, cx, height - 36, Math.min(220, width - 60), 44, () => this.back(), t.shop.back));
    keyNav(this, cards, cols, focus);

    bindKeys(this, (kb) => kb.once('keydown-ESC', () => this.back()));
    restartOnResize(this);
  }

  private buy(id: ShopId): void {
    const save = loadSave();
    if (!buy(save, id)) return;
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
