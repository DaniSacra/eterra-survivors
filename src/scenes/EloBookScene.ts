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

/** Size of the recipe's icons and the room for the "+" and "=" between them, px. */
const ICON = 22;
const SYMBOL = 14;

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
    const cols = gridCols(EVOLVED_IDS.length, width, avail, 74, gap, 2);
    const rows = Math.ceil(EVOLVED_IDS.length / cols);
    const cardW = Math.min(300, (width - 24 - gap * (cols - 1)) / cols);
    const cardH = Math.max(74, Math.min(92, avail / rows - gap));
    const left = cx - (cols * cardW + (cols - 1) * gap) / 2;
    EVOLVED_IDS.forEach((id, i) => {
      const x = left + (i % cols) * (cardW + gap) + cardW / 2;
      const y = top + Math.floor(i / cols) * (cardH + gap) + cardH / 2;
      const evo = EVOLUTIONS[id] as Evolution;
      const seen = known.includes(id);
      this.add
        .rectangle(x, y, cardW, cardH, seen ? UI.panel : UI.panelOff)
        .setStrokeStyle(2, seen ? UI.accent : UI.borderOff);
      const lx = x - cardW / 2 + 10;
      const small = cardW < 220;
      const cardTop = y - cardH / 2;
      label(this, lx, cardTop + 6, seen ? t.weapons[id].name : t.elos.unknown, small ? 14 : 16, {
        bold: true,
        align: 'left',
        color: seen ? UI.text : UI.textOff,
      });
      // The recipe as icons: base weapon + passive = Elo. Unknown: the base shows (where it grows from), the
      // passive stays a "?" and the Elo a silhouette, so the mystery has a shape.
      const rowY = cardTop + (small ? 27 : 30) + ICON / 2;
      const step = ICON + SYMBOL;
      this.add.image(lx + ICON / 2, rowY, `icon.${evo.from}`).setScale((ART_SCALE * ICON) / 28);
      label(this, lx + ICON + SYMBOL / 2, rowY, t.elos.plus, 16, { bold: true, color: UI.muted });
      if (seen)
        this.add.image(lx + step + ICON / 2, rowY, `icon.${evo.passive}`).setScale((ART_SCALE * ICON) / 28);
      else {
        this.add
          .circle(lx + step + ICON / 2, rowY, ICON / 2 - 1, UI.panel)
          .setStrokeStyle(1.5, UI.border);
        label(this, lx + step + ICON / 2, rowY, t.elos.mystery, 15, { bold: true, color: UI.gold });
      }
      label(this, lx + step + ICON + SYMBOL / 2, rowY, t.elos.equals, 16, { bold: true, color: UI.muted });
      const elo = this.add
        .image(lx + 2 * step + ICON / 2, rowY, `icon.${id}`)
        .setScale((ART_SCALE * ICON) / 28);
      // A shadow of the Elo: its shape shows, its colors stay hidden.
      if (!seen) elo.setTint(UI.border);
      const owner = SIGNATURE_OWNER[evo.from];
      if (owner)
        label(this, x + cardW / 2 - 10, rowY, t.elos.owner(t.characters[owner].name), 12, {
          color: UI.muted,
        }).setOrigin(1, 0.5);
      // Known: the recipe's names. Unknown: only the weapon it grows from (a hint, as in the original game).
      const recipe = seen
        ? t.elos.recipe(t.weapons[evo.from].name, t.passives[evo.passive])
        : t.elos.hint(t.weapons[evo.from].name);
      label(this, lx, rowY + ICON / 2 + 4, recipe, 12, {
        color: seen ? UI.gold : UI.muted,
        align: 'left',
        wrap: cardW - 20,
      });
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
