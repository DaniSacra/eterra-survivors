import { weaponUsed } from '../../core/meta';
import { EVOLUTIONS, EVOLVED_IDS, type Evolution } from '../../data/evolutions';
import { SIGNATURE_OWNER } from '../../data/characters';
import { t } from '../../i18n/pt-BR';
import { ART_SCALE } from '../../render/art/pen';
import { UI, gridCols, label } from '../../render/ui';
import type { TabArea, TabContent } from './tab';

/** Size of the recipe's icons and the room for the "+" and "=" between them, px. */
const ICON = 22;
const SYMBOL = 14;

/** Livro de Elos: every Elo; its recipe shows once the base weapon was used in a run, its name once formed. */
export function drawElos(a: TabArea): TabContent {
  const { scene, short } = a;
  const known = a.save.elos;
  const cx = a.x + a.w / 2;
  const count = t.elos.count(known.length, EVOLVED_IDS.length);
  let top = a.y;
  if (short) {
    // Phone lying down: the count and the rule share one line, so every card fits.
    label(scene, cx, top + 8, `${count}${t.sep}${t.elos.rule}`, 12, { color: UI.muted, wrap: a.w });
    top += 20;
  } else {
    label(scene, cx, top + 10, count, 14, { color: UI.muted });
    label(scene, cx, top + 30, t.elos.rule, 12, { color: UI.muted, wrap: a.w });
    top += 46;
  }

  const gap = 8;
  const avail = a.y + a.h - top;
  const cols = gridCols(EVOLVED_IDS.length, a.w + 24, avail, 74, gap, 2);
  const rows = Math.ceil(EVOLVED_IDS.length / cols);
  const cardW = Math.min(300, (a.w - gap * (cols - 1)) / cols);
  const cardH = Math.max(74, Math.min(92, avail / rows - gap));
  const left = cx - (cols * cardW + (cols - 1) * gap) / 2;
  EVOLVED_IDS.forEach((id, i) => {
    const x = left + (i % cols) * (cardW + gap) + cardW / 2;
    const y = top + Math.floor(i / cols) * (cardH + gap) + cardH / 2;
    const evo = EVOLUTIONS[id] as Evolution;
    const seen = known.includes(id);
    // The passive shows once the base weapon has been used in a run; the Elo itself only once formed.
    const recipeKnown = seen || weaponUsed(a.save, evo.from);
    scene.add
      .rectangle(x, y, cardW, cardH, seen ? UI.panel : UI.panelOff)
      .setStrokeStyle(2, seen ? UI.accent : UI.borderOff);
    const lx = x - cardW / 2 + 10;
    const small = cardW < 220;
    const cardTop = y - cardH / 2;
    label(scene, lx, cardTop + 6, seen ? t.weapons[id].name : t.elos.unknown, small ? 14 : 16, {
      bold: true,
      align: 'left',
      color: seen ? UI.text : UI.textOff,
    });
    // The recipe as icons: base weapon + passive = Elo. Unknown: the base shows (where it grows from), the
    // passive stays a "?" and the Elo a silhouette, so the mystery has a shape.
    const rowY = cardTop + (small ? 27 : 30) + ICON / 2;
    const step = ICON + SYMBOL;
    scene.add.image(lx + ICON / 2, rowY, `icon.${evo.from}`).setScale((ART_SCALE * ICON) / 28);
    label(scene, lx + ICON + SYMBOL / 2, rowY, t.elos.plus, 16, { bold: true, color: UI.muted });
    if (recipeKnown)
      scene.add.image(lx + step + ICON / 2, rowY, `icon.${evo.passive}`).setScale((ART_SCALE * ICON) / 28);
    else {
      scene.add.circle(lx + step + ICON / 2, rowY, ICON / 2 - 1, UI.panel).setStrokeStyle(1.5, UI.border);
      label(scene, lx + step + ICON / 2, rowY, t.elos.mystery, 15, { bold: true, color: UI.gold });
    }
    label(scene, lx + step + ICON + SYMBOL / 2, rowY, t.elos.equals, 16, { bold: true, color: UI.muted });
    const elo = scene.add
      .image(lx + 2 * step + ICON / 2, rowY, `icon.${id}`)
      .setScale((ART_SCALE * ICON) / 28);
    // A shadow of the Elo: its shape shows, its colors stay hidden.
    if (!seen) elo.setTint(UI.border);
    const owner = SIGNATURE_OWNER[evo.from];
    if (owner)
      label(scene, x + cardW / 2 - 10, rowY, t.elos.owner(t.characters[owner].name), 12, {
        color: UI.muted,
      }).setOrigin(1, 0.5);
    // Known: the recipe's names. Unknown: only the weapon it grows from (a hint, as in the original game).
    const recipe = recipeKnown
      ? t.elos.recipe(t.weapons[evo.from].name, t.passives[evo.passive])
      : t.elos.hint(t.weapons[evo.from].name);
    label(scene, lx, rowY + ICON / 2 + 4, recipe, 12, {
      color: recipeKnown ? UI.gold : UI.muted,
      align: 'left',
      wrap: cardW - 20,
    });
  });
  return { buttons: [] };
}
