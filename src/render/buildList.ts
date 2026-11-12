import type Phaser from 'phaser';
import { eloStatus } from '../core/upgrades';
import { isElo, maxLevel } from '../core/weapons';
import type { World } from '../core/world';
import { evolutionOf } from '../data/evolutions';
import { PASSIVES, type PassiveId } from '../data/upgrades';
import { t } from '../i18n/pt-BR';
import { ART_SCALE } from './art/pen';
import { UI, label, skin } from './ui';
import { recipeProgress } from './describe';

/** Icon badges are drawn 28 px wide (render/art/icons.ts). */
const BADGE = 28;
const ROW = 38;
/** A weapon's row in the compact list: one line, no recipe (phones, NU-03). */
const ROW_COMPACT = 24;
const PASSIVE = 30;
const PAD = 10;

/** Height of the list for `world` (title, a row per weapon, the passives). */
export function buildListHeight(world: World, w: number, withPassives = true, compact = false): number {
  const perRow = Math.max(1, Math.floor((w - PAD * 2) / 64));
  const passives = withPassives ? Object.keys(world.passives).length : 0;
  return (
    PAD * 2 +
    22 +
    world.weapons.length * (compact ? ROW_COMPACT : ROW) +
    (passives ? 6 + Math.ceil(passives / perRow) * PASSIVE : 0)
  );
}

/**
 * The run's build on a panel (the pause screen): each weapon with its level and where its Elo stands (what is
 * missing, ready, formed), then the passives with their levels. Returns its height.
 */
export function drawBuildList(
  scene: Phaser.Scene,
  world: World,
  x: number,
  y: number,
  w: number,
  maxH = Infinity,
  compact = false,
): number {
  // Short on room (phone lying down): the passives row goes (the HUD strip shows them anyway).
  const withPassives = buildListHeight(world, w, true, compact) <= maxH;
  const h = buildListHeight(world, w, withPassives, compact);
  skin(
    scene,
    scene.add.rectangle(x, y, w, h, UI.panel, 0.92).setOrigin(0).setStrokeStyle(2, UI.border),
    'button',
  );
  label(scene, x + PAD, y + PAD, t.pause.build, 14, { bold: true, color: UI.muted, align: 'left' });
  let ry = y + PAD + 22;
  const icon = (ix: number, iy: number, key: string, size: number) =>
    scene.add.image(ix, iy, key).setScale((ART_SCALE * size) / BADGE);
  for (const o of world.weapons) {
    if (compact) {
      // One line: icon, name, and on the right its level or "Elo formado".
      const cy = ry + ROW_COMPACT / 2;
      icon(x + PAD + 10, cy, `icon.${o.id}`, 20);
      const elo = isElo(o.id);
      label(scene, x + PAD + 26, cy, t.weapons[o.id].name, 13, {
        bold: true,
        align: 'left',
        color: elo ? UI.gold : UI.text,
      }).setOrigin(0, 0.5);
      const max = o.level >= maxLevel(o.id);
      label(scene, x + w - PAD, cy, elo ? t.pause.formed : t.pause.level(o.level, maxLevel(o.id)), 12, {
        color: elo || max ? UI.gold : UI.muted,
      }).setOrigin(1, 0.5);
      ry += ROW_COMPACT;
      continue;
    }
    const cy = ry + ROW / 2;
    icon(x + PAD + 13, cy, `icon.${o.id}`, 26);
    const tx = x + PAD + 32;
    const elo = isElo(o.id);
    label(scene, tx, cy - 9, t.weapons[o.id].name, 13, {
      bold: true,
      align: 'left',
      color: elo ? UI.gold : UI.text,
    }).setOrigin(0, 0.5);
    if (!elo)
      label(scene, x + w - PAD, cy - 9, t.pause.level(o.level, maxLevel(o.id)), 12, {
        color: o.level >= maxLevel(o.id) ? UI.gold : UI.muted,
      }).setOrigin(1, 0.5);
    // The recipe line: "Elo Fúria: arma 6/7 · Força 3/5" (or formed / none).
    const st = eloStatus(world, o.id);
    const evo = evolutionOf(o.id);
    let text: string = t.pause.none;
    let color = UI.muted;
    if (st.kind === 'formed') {
      text = t.pause.formed;
      color = UI.gold;
    } else if (st.kind === 'missing') text = recipeProgress(o.id, st.weapon, st.passiveLevel);
    let lx = tx;
    if (evo && st.kind !== 'formed') {
      icon(tx + 7, cy + 9, `icon.${evo.evo.passive}`, 14);
      lx += 18;
    }
    label(scene, lx, cy + 9, text, 12, { color, align: 'left' }).setOrigin(0, 0.5);
    ry += ROW;
  }
  const ids = Object.keys(world.passives) as PassiveId[];
  if (withPassives && ids.length) {
    ry += 6;
    const perRow = Math.max(1, Math.floor((w - PAD * 2) / 64));
    ids.forEach((id, i) => {
      const px = x + PAD + (i % perRow) * 64;
      const py = ry + Math.floor(i / perRow) * PASSIVE + PASSIVE / 2;
      icon(px + 11, py, `icon.${id}`, 22);
      const lv = world.passives[id] ?? 0;
      label(scene, px + 26, py, `${lv}/${PASSIVES[id].maxLevel}`, 12, {
        color: lv >= PASSIVES[id].maxLevel ? UI.gold : UI.text,
        align: 'left',
      }).setOrigin(0, 0.5);
    });
  }
  return h;
}
