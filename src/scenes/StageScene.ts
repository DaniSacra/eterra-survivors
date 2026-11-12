import Phaser from 'phaser';
import { devTag } from '../render/dev';
import { stageUnlocked } from '../core/meta';
import { ENEMIES } from '../data/enemies';
import { STAGES, STAGE_IDS, type StageId } from '../data/stages';
import { t } from '../i18n/pt-BR';
import { loadSave } from '../render/save';
import { ART_SCALE } from '../render/art/pen';
import { UI, backButton, button, disable, isShort, keyNav, label, restartOnResize, seal } from '../render/ui';
import { lastChoice } from './choice';
import { SCENES } from './keys';

/** The stage screen: one card per stage (ground window, boss, name and line). A card opens its story. Never scrolls. */
export class StageScene extends Phaser.Scene {
  constructor() {
    super(SCENES.stages);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const save = loadSave();
    const choice = lastChoice(this.registry);
    const short = isShort(this);
    const wrapW = Math.min(640, width - 24);
    const gap = 8;
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    label(this, cx, short ? 22 : 30, t.stageScreen.title, short ? 22 : 26, { bold: true, color: UI.gold });

    // Three cards in a column, or side by side on a wide, low screen.
    const cols = short && width >= 600 ? 3 : 1;
    const top = short ? 44 : 64;
    const bottom = short ? height - 8 : height - 70;
    const cardW = (wrapW - gap * (cols - 1)) / cols;
    const cardH = cols === 3 ? bottom - top : Math.min(200, Math.floor((bottom - top - gap * 2) / 3));
    const buttons: Phaser.GameObjects.Rectangle[] = [];
    STAGE_IDS.forEach((id, i) => {
      const x = cx - wrapW / 2 + (i % cols) * (cardW + gap) + cardW / 2;
      const y = top + Math.floor(i / cols) * (cardH + gap) + cardH / 2;
      const open = stageUnlocked(save, id);
      buttons.push(this.card(id, x, y, cardW, cardH, cols === 3, id === choice.stage, open, save.records));
    });
    backButton(this, t.select.back, () => this.scene.start(SCENES.heroes));
    const start = Math.max(0, STAGE_IDS.indexOf(choice.stage));
    keyNav(this, buttons, cols === 3 ? 3 : 1, start);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENES.heroes));
    devTag(this);
    restartOnResize(this);
  }

  private card(
    id: StageId,
    x: number,
    y: number,
    w: number,
    h: number,
    tall: boolean,
    on: boolean,
    open: boolean,
    records: Record<string, { wins: Partial<Record<StageId, number>> } | undefined>,
  ): Phaser.GameObjects.Rectangle {
    const s = t.stages[id];
    const card = button(this, x, y, w, h, () => this.scene.start(SCENES.story, { stage: id }));
    card.setStrokeStyle(on ? 3 : 2, on ? UI.accent : UI.border);
    if (!open) disable(card);
    const cleared = Object.values(records).some((r) => (r?.wins[id] ?? 0) > 0);
    const left = x - w / 2;
    const topY = y - h / 2;
    // The illustration: the ground and the boss standing on it.
    const iw = tall ? w - 12 : Math.min(h - 12, Math.floor(w * 0.42));
    const ih = tall ? Math.floor(h * 0.4) : h - 12;
    const ix = tall ? x : left + 6 + iw / 2;
    const iy = tall ? topY + 6 + ih / 2 : y;
    this.add
      .tileSprite(ix, iy, iw, ih, STAGES[id].tile)
      .setAlpha(open ? 1 : 0.4)
      .setTilePosition(20, 20);
    this.add.rectangle(ix, iy, iw, ih).setStrokeStyle(1.5, open ? UI.border : UI.borderOff);
    const boss = this.add.image(ix, iy + ih / 2 - 4, ENEMIES[STAGES[id].boss.id].sprite).setOrigin(0.5, 1);
    boss.setScale(Math.min(1, (ih - 8) / boss.height, (iw - 8) / boss.width)).setAlpha(open ? 1 : 0.35);
    boss.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    if (!open) this.add.image(ix, iy, 'icon.lock').setScale(ART_SCALE * Math.min(1.6, ih / 26));

    const tl = tall ? left + 10 : left + 12 + iw;
    const tw = w - (tl - left) - 10;
    const ty = tall ? topY + ih + 14 : topY + 12;
    label(this, tl, ty, s.name, 17, {
      bold: true,
      align: 'left',
      color: open ? UI.text : UI.textOff,
      wrap: tw,
    });
    // The seal sits at the card's bottom corner: at the top it ran into the name (PU-05).
    if (cleared) seal(this, x + w / 2 - 10, topY + h - 16, t.select.cleared);
    const prev = STAGE_IDS[STAGE_IDS.indexOf(id) - 1];
    label(
      this,
      tl,
      ty + 26,
      open ? s.desc : t.stageScreen.unlockBy(prev ? t.stages[prev].name : s.name),
      12,
      {
        color: open ? UI.muted : UI.textOff,
        align: 'left',
        wrap: tw,
      },
    );
    return card;
  }
}
