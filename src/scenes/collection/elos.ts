import type Phaser from 'phaser';
import { weaponUsed } from '../../core/meta';
import { EVOLUTIONS, EVOLVED_IDS, type Evolution } from '../../data/evolutions';
import type { WeaponId } from '../../data/weapons';
import { t } from '../../i18n/pt-BR';
import { ART_SCALE } from '../../render/art/pen';
import { chain } from '../../render/buildPanel';
import { ELEMENT_COLOR, UI, button, gridCols, label } from '../../render/ui';
import type { TabArea, TabContent } from './tab';

/** Size of the recipe's icons and the room for the "+" and "=" between them, px. */
const ICON = 22;
const SYMBOL = 14;
/** The Elo page's recipe icons. */
const BIG = 44;

const css = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/**
 * Livro de Elos: every Elo; its recipe shows once the base weapon was used in a run, its name once formed. A
 * formed Elo opens its own page (`a.page` = its id): the recipe chained in its element's colour, what it does and
 * its line.
 */
export function drawElos(a: TabArea): TabContent {
  const open = a.page as WeaponId | undefined;
  if (open && EVOLUTIONS[open] && a.save.elos.includes(open)) return drawPage(a, open);
  const { scene, short } = a;
  const known = a.save.elos;
  const cx = a.x + a.w / 2;
  const count = t.elos.count(known.length, EVOLVED_IDS.length);
  const rule = known.length > 0 ? `${t.elos.rule} ${t.elos.open}` : t.elos.rule;
  let top = a.y;
  if (short) {
    // Phone lying down: the count and the rule share one line, so every card fits.
    label(scene, cx, top + 8, `${count}${t.sep}${rule}`, 12, { color: UI.muted, wrap: a.w });
    top += 20;
  } else {
    label(scene, cx, top + 10, count, 14, { color: UI.muted });
    label(scene, cx, top + 30, rule, 12, { color: UI.muted, wrap: a.w });
    top += 46;
  }

  const gap = 8;
  const avail = a.y + a.h - top;
  // A phone lying down takes a fourth column and lower cards, so all thirteen fit without scrolling.
  const minH = short ? 66 : 74;
  const cols = gridCols(EVOLVED_IDS.length, a.w + 24, avail, minH, gap, 2, 180, short ? 4 : 3);
  const rows = Math.ceil(EVOLVED_IDS.length / cols);
  const cardW = Math.min(300, (a.w - gap * (cols - 1)) / cols);
  const cardH = Math.max(minH, Math.min(92, avail / rows - gap));
  const left = cx - (cols * cardW + (cols - 1) * gap) / 2;
  const buttons: Phaser.GameObjects.Rectangle[] = [];
  const g = scene.add.graphics().setDepth(1);
  EVOLVED_IDS.forEach((id, i) => {
    const x = left + (i % cols) * (cardW + gap) + cardW / 2;
    const y = top + Math.floor(i / cols) * (cardH + gap) + cardH / 2;
    const evo = EVOLUTIONS[id] as Evolution;
    const seen = known.includes(id);
    const color = ELEMENT_COLOR[evo.element];
    // The passive shows once the base weapon has been used in a run; the Elo itself only once formed.
    const recipeKnown = seen || weaponUsed(a.save, evo.from);
    if (seen) {
      // A formed Elo is a button to its page, rimmed in its element's colour.
      const card = button(scene, x, y, cardW, cardH, () => a.reopen(id, buttons.indexOf(card)));
      card.setStrokeStyle(2, color);
      buttons.push(card);
    } else scene.add.rectangle(x, y, cardW, cardH, UI.panelOff).setStrokeStyle(2, UI.borderOff);
    const lx = x - cardW / 2 + 10;
    const small = cardW < 220;
    const cardTop = y - cardH / 2;
    label(scene, lx, cardTop + 6, seen ? t.weapons[id].name : t.elos.unknown, small ? 14 : 16, {
      bold: true,
      align: 'left',
      color: seen ? css(color) : UI.textOff,
    }).setDepth(2);
    // The recipe as icons: base weapon + passive = Elo. Unknown: the base shows (where it grows from), the
    // passive stays a "?" and the Elo a silhouette, so the mystery has a shape. Formed: the passive is chained to
    // the Elo, as in the run's build strip.
    const rowY = cardTop + (small ? 27 : 30) + ICON / 2;
    const step = ICON + SYMBOL;
    icon(scene, lx + ICON / 2, rowY, `icon.${evo.from}`, ICON);
    label(scene, lx + ICON + SYMBOL / 2, rowY, t.elos.plus, 16, { bold: true, color: UI.muted }).setDepth(2);
    if (recipeKnown) icon(scene, lx + step + ICON / 2, rowY, `icon.${evo.passive}`, ICON);
    else {
      scene.add.circle(lx + step + ICON / 2, rowY, ICON / 2 - 1, UI.panel).setStrokeStyle(1.5, UI.border);
      label(scene, lx + step + ICON / 2, rowY, t.elos.mystery, 15, { bold: true, color: UI.gold });
    }
    if (seen) chain(g, lx + step + ICON, rowY, lx + 2 * step, rowY, color, 1.4);
    else
      label(scene, lx + step + ICON + SYMBOL / 2, rowY, t.elos.equals, 16, { bold: true, color: UI.muted });
    const elo = icon(scene, lx + 2 * step + ICON / 2, rowY, `icon.${id}`, ICON);
    // A shadow of the Elo: its shape shows, its colors stay hidden.
    if (!seen) elo.setTint(UI.border);
    // Known: the recipe's names. Unknown: only the weapon it grows from (a hint, as in the original game).
    const recipe = recipeKnown
      ? t.elos.recipe(t.weapons[evo.from].name, t.passives[evo.passive])
      : t.elos.hint(t.weapons[evo.from].name);
    label(scene, lx, rowY + ICON / 2 + 4, recipe, 12, {
      color: recipeKnown ? UI.gold : UI.muted,
      align: 'left',
      wrap: cardW - 20,
    }).setDepth(2);
  });
  return { buttons, start: a.focus ?? (buttons.length > 0 ? 0 : -1) };
}

/** A formed Elo's page: name and element, the recipe chained, what it does, its line, and the way back. */
function drawPage(a: TabArea, id: WeaponId): TabContent {
  const { scene, short } = a;
  const evo = EVOLUTIONS[id] as Evolution;
  const color = ELEMENT_COLOR[evo.element];
  const cx = a.x + a.w / 2;
  const w = Math.min(520, a.w);
  let y = a.y + (short ? 12 : 22);
  label(scene, cx, y, t.weapons[id].name, short ? 22 : 26, { bold: true, color: css(color) });
  y += short ? 22 : 28;
  label(scene, cx, y, t.elos.element(t.elos.elements[evo.element]), 13, { color: UI.muted });
  y += short ? 30 : 46;

  // weapon + passive ═══ Elo, the chain braided in the element's colour.
  const big = short ? 36 : BIG;
  const gap = big * 0.5;
  const span = big * 3 + gap * 3 + big;
  const x0 = cx - span / 2 + big / 2;
  icon(scene, x0, y, `icon.${evo.from}`, big);
  label(scene, x0 + big / 2 + gap / 2 + 2, y, t.elos.plus, 22, { bold: true, color: UI.muted });
  const px = x0 + big + gap;
  icon(scene, px, y, `icon.${evo.passive}`, big);
  const ex = px + big * 2 + gap * 2;
  const g = scene.add.graphics();
  chain(g, px + big / 2 + 2, y, ex - big / 2 - 2, y, color, 2.2);
  scene.add.circle(ex, y, big * 0.72, color, 0.25);
  icon(scene, ex, y, `icon.${id}`, big * 1.2);
  y += big / 2 + 16;
  label(scene, cx, y, t.elos.recipe(t.weapons[evo.from].name, t.passives[evo.passive]), 14, {
    color: UI.gold,
  });
  y += short ? 24 : 34;

  label(scene, cx, y, t.elos.effect, 13, { bold: true, color: UI.muted });
  y += 10;
  const desc = label(scene, cx, y, t.weapons[id].desc, short ? 14 : 16, { wrap: w }).setOrigin(0.5, 0);
  y += desc.height + (short ? 10 : 18);
  const line = t.elo.lines[id];
  if (line) {
    const lore = label(scene, cx, y, `“${line}”`, 14, { italic: true, color: UI.muted, wrap: w });
    lore.setOrigin(0.5, 0);
    y += lore.height + (short ? 12 : 22);
  }
  const bw = Math.min(240, a.w);
  const by = Math.min(a.y + a.h - 22, y + 22);
  const index = EVOLVED_IDS.filter((e) => a.save.elos.includes(e)).indexOf(id);
  const back = button(scene, cx, by, bw, 40, () => a.reopen(undefined, index), t.elos.back);
  return { buttons: [back], start: 0 };
}

function icon(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: string,
  size: number,
): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, key)
    .setScale((ART_SCALE * size) / 28)
    .setDepth(2);
}
