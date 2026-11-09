import Phaser from 'phaser';
import { EVOLUTIONS, EVOLVED_IDS, type Evolution } from '../data/evolutions';
import { SIGNATURE_OWNER } from '../data/characters';
import { t } from '../i18n/pt-BR';
import { ART_SCALE } from '../render/art/pen';
import { loadSave } from '../render/save';
import {
  UI,
  backButton,
  bindKeys,
  gridCols,
  isShort,
  keyNav,
  label,
  restartOnResize,
  safeArea,
} from '../render/ui';
import { SCENES } from './keys';

/** Livro de Elos: every Elo, with its recipe revealed once it has been formed in a run. */
export class EloBookScene extends Phaser.Scene {
  constructor() {
    super(SCENES.eloBook);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const known = loadSave().elos;
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    const short = isShort(this);
    const count = t.elos.count(known.length, EVOLVED_IDS.length);
    if (short) {
      // Phone lying down: title, count and Back share the top row, so every card fits.
      label(this, cx, 28, t.elos.title, 24, { bold: true, color: UI.gold });
      label(this, width - safeArea().right - 16, 28, count, 14, { color: UI.muted }).setOrigin(1, 0.5);
      label(this, cx, 58, t.elos.rule, 12, { color: UI.muted, wrap: width - 32 });
    } else {
      label(this, cx, 32, t.elos.title, 28, { bold: true, color: UI.gold });
      label(this, cx, 60, count, 14, { color: UI.muted });
      label(this, cx, 80, t.elos.rule, 12, { color: UI.muted, wrap: width - 24 });
    }

    const gap = 8;
    const top = short ? 74 : 100;
    const avail = height - top - (short ? 12 : 76);
    const cols = gridCols(EVOLVED_IDS.length, width, avail, 56, gap, 2);
    const rows = Math.ceil(EVOLVED_IDS.length / cols);
    const cardW = Math.min(300, (width - 24 - gap * (cols - 1)) / cols);
    const cardH = Math.max(56, Math.min(92, avail / rows - gap));
    const left = cx - (cols * cardW + (cols - 1) * gap) / 2;
    EVOLVED_IDS.forEach((id, i) => {
      const x = left + (i % cols) * (cardW + gap) + cardW / 2;
      const y = top + Math.floor(i / cols) * (cardH + gap) + cardH / 2;
      const evo = EVOLUTIONS[id] as Evolution;
      const seen = known.includes(id);
      this.add
        .rectangle(x, y, cardW, cardH, seen ? UI.panel : UI.panelOff)
        .setStrokeStyle(2, seen ? UI.accent : UI.borderOff);
      const icon = this.add.image(x - cardW / 2 + 26, y, `icon.${id}`).setScale(ART_SCALE * 1.3);
      if (!seen) icon.setTintFill(UI.borderOff);
      const tx = x - cardW / 2 + 50;
      const small = cardW < 220;
      label(this, tx, y - cardH / 2 + 7, seen ? t.weapons[id].name : t.elos.unknown, small ? 14 : 16, {
        bold: true,
        align: 'left',
        color: seen ? UI.text : UI.textOff,
      });
      // Known: the full recipe. Unknown: only the weapon it grows from (a hint, as in the original game).
      const owner = SIGNATURE_OWNER[evo.from];
      const recipe = seen
        ? t.elos.recipe(t.weapons[evo.from].name, t.passives[evo.passive])
        : t.elos.hint(t.weapons[evo.from].name);
      const r = label(this, tx, y - cardH / 2 + (small ? 26 : 29), recipe, small ? 12 : 13, {
        color: seen ? UI.gold : UI.muted,
        align: 'left',
        wrap: cardW - 58,
      });
      if (owner && r.y + r.height + 14 <= y + cardH / 2 - 4)
        label(this, tx, y + cardH / 2 - 6, t.elos.owner(t.characters[owner].name), 12, {
          color: UI.muted,
          align: 'left',
        }).setOrigin(0, 1);
    });

    const back = backButton(this, t.shop.back, () => this.back());
    keyNav(this, [back]);
    bindKeys(this, (kb) => kb.once('keydown-ESC', () => this.back()));
    restartOnResize(this);
  }

  private back(): void {
    this.scene.start(SCENES.menu);
  }
}
