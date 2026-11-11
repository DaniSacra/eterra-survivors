import type Phaser from 'phaser';
import { enemyTraits } from '../../core/format';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { bestiaryOrder } from '../../data/stages';
import { t } from '../../i18n/pt-BR';
import { ART_RES, ART_SCALE } from '../../render/art/pen';
import { UI, button, disable, label } from '../../render/ui';
import type { TabArea, TabContent } from './tab';

const COLS = 4;
const GAP = 6;

/** An enemy's sprite fitted in a `box` px square (bosses shrink, bats grow), as a silhouette when not seen. */
function portrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  id: EnemyId,
  box: number,
  seen: boolean,
): Phaser.GameObjects.Image {
  const img = scene.add.image(x, y, ENEMIES[id].sprite);
  // The texture has a transparent margin (render/assets.ts PAD, 6 world px a side): fit the drawing, not it.
  const frame = Math.max(img.frame.width, img.frame.height) - 12 * ART_RES;
  img.setScale(ART_SCALE * ((box * ART_RES) / frame));
  if (!seen) img.setTint(UI.border);
  return img;
}

/**
 * Bestiário: every enemy as a small card (a silhouette and "???" until met); focusing or tapping one shows its
 * sheet under the grid (beside it on wide screens).
 */
export function drawBestiary(a: TabArea): TabContent {
  const { scene, save } = a;
  const order = bestiaryOrder(save.bestiary);
  const seenCount = order.filter((id) => save.bestiary[id]).length;
  const side = a.w >= 640;
  const sheetW = side ? Math.min(380, a.w * 0.42) : a.w;
  const gridW = side ? Math.min(560, a.w - sheetW - 12) : a.w;
  const gridX = side ? a.x + (a.w - gridW - sheetW - 12) / 2 : a.x;

  label(scene, gridX + gridW / 2, a.y + 8, t.bestiary.count(seenCount, order.length), 13, {
    color: UI.muted,
  });
  const top = a.y + 22;
  const rows = Math.ceil(order.length / COLS);
  const cardW = (gridW - GAP * (COLS - 1)) / COLS;
  // Standing: the grid takes what it needs (the sheet gets the rest); lying down: it fills the height.
  const cardH = side ? Math.min(96, (a.y + a.h - top) / rows - GAP) : Math.min(88, (a.h * 0.58) / rows - GAP);
  const box = Math.min(44, cardH - 36);
  const buttons: Phaser.GameObjects.Rectangle[] = [];
  const ids: EnemyId[] = [];
  order.forEach((id, i) => {
    const x = gridX + (i % COLS) * (cardW + GAP) + cardW / 2;
    const y = top + Math.floor(i / COLS) * (cardH + GAP) + cardH / 2;
    const entry = save.bestiary[id];
    const card = button(scene, x, y, cardW, cardH, () => focus(buttons.indexOf(card)));
    const iy = y - cardH / 2 + 4 + box / 2;
    portrait(scene, x, iy, id, box, !!entry);
    const nameY = iy + box / 2 + 12;
    if (entry) {
      buttons.push(card);
      ids.push(id);
      label(scene, x, nameY, t.enemies[id], 12, { wrap: cardW - 6 }).setLineSpacing(-3);
      label(scene, x, y + cardH / 2 - 9, t.bestiary.kills(t.int(entry.kills)), 12, { color: UI.gold });
    } else {
      disable(card);
      label(scene, x, nameY, t.bestiary.unknown, 13, { bold: true, color: UI.textOff });
    }
  });

  const gridBottom = top + rows * (cardH + GAP) - GAP;
  const sx = side ? gridX + gridW + 12 : a.x;
  const sy = side ? top : gridBottom + 10;
  const sheet = new Sheet(scene, sx, sy, sheetW, side ? gridBottom - sy : a.y + a.h - sy);
  let focus = (i: number) => sheet.show(ids[i] ?? null, a);
  if (ids.length > 0) sheet.show(ids[0] as EnemyId, a);
  else sheet.show(null, a);
  return {
    buttons,
    start: 0,
    onFocus: (i) => sheet.show(ids[i] ?? null, a),
    bindFocus: (f) => (focus = f),
  };
}

/** The enemy's sheet: portrait, name, where it was first seen, kills, traits in player terms and its line. */
class Sheet {
  private parts: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    private h: number,
  ) {
    scene.add.rectangle(x, y, w, h, UI.panel, 0.92).setOrigin(0).setStrokeStyle(2, UI.border);
  }

  show(id: EnemyId | null, a: TabArea): void {
    for (const p of this.parts) p.destroy();
    this.parts = [];
    const s = this.scene;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => (this.parts.push(o), o);
    const entry = id ? a.save.bestiary[id] : undefined;
    const pad = 12;
    const lx = this.x + pad;
    const w = this.w - pad * 2;
    if (!id || !entry) {
      add(
        label(s, this.x + this.w / 2, this.y + this.h / 2, t.bestiary.empty, 14, {
          color: UI.muted,
          wrap: w,
        }),
      );
      return;
    }
    const roomy = this.h >= 260;
    const box = roomy ? 56 : 44;
    add(portrait(s, lx + box / 2, this.y + pad + box / 2, id, box, true));
    const tx = lx + box + 12;
    add(label(s, tx, this.y + pad, t.enemies[id], 18, { bold: true, color: UI.gold, align: 'left' }));
    add(
      label(s, tx, this.y + pad + 24, `${t.bestiary.seenIn}: ${t.stages[entry.stage].name}`, 13, {
        color: UI.muted,
        align: 'left',
        wrap: this.x + this.w - pad - tx,
      }),
    );
    let y = this.y + pad + Math.max(box, 44) + 8;
    const tr = enemyTraits(ENEMIES[id]);
    const rows: [string, string][] = [
      [t.bestiary.killed, t.int(entry.kills)],
      [t.bestiary.hp, t.bestiary.hpGrows(t.int(tr.hp))],
      [t.bestiary.speed, t.bestiary.speeds[tr.speed]],
      [t.bestiary.damage, String(tr.damage)],
      [t.bestiary.push, t.bestiary.pushes[tr.push]],
    ];
    const abilities = t.bestiary.bossAbilities[id];
    if (abilities) rows.push([t.bestiary.way, abilities.join(', ')]);
    else if (tr.way) rows.push([t.bestiary.way, t.bestiary.ways[tr.way]]);
    const fs = roomy ? 14 : 13;
    const step = roomy ? 21 : 18;
    for (const [k, v] of rows) {
      add(label(s, lx, y, k, fs, { color: UI.muted, align: 'left' }));
      add(label(s, lx + w, y, v, fs, { bold: true }).setOrigin(1, 0));
      y += step;
    }
    const line = t.bestiary.flavor[id];
    if (line) {
      const who = t.bestiary.speakers[id];
      add(
        label(s, lx, y + 6, who ? t.bestiary.quoteBy(line, who) : t.bestiary.quote(line), 13, {
          italic: true,
          color: UI.text,
          align: 'left',
          wrap: w,
        }),
      );
    }
  }
}
