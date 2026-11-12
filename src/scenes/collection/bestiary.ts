import type Phaser from 'phaser';
import { enemyTraits } from '../../core/format';
import { ENEMIES, type EnemyId } from '../../data/enemies';
import { bestiaryOrder, enemyStage } from '../../data/stages';
import { t } from '../../i18n/pt-BR';
import { ART_RES, ART_SCALE } from '../../render/art/pen';
import { Showcase } from '../../render/bestiaryShow';
import { settings } from '../../render/settings';
import { UI, button, label } from '../../render/ui';
import type { TabArea, TabContent } from './tab';

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
  // Pixel sprites have a thin transparent border: fit the drawing (most of the frame), not the frame.
  const frame = Math.max(img.frame.width, img.frame.height) * 0.86;
  img.setScale(ART_SCALE * ((box * ART_RES) / frame));
  if (!seen) img.setTint(UI.border);
  return img;
}

/** Common, elite or boss, for the tag on the sheet. */
export function enemyKind(id: EnemyId): 'boss' | 'elite' | 'crowd' {
  const d = ENEMIES[id] as { boss?: unknown; elite?: unknown };
  return d.boss ? 'boss' : d.elite ? 'elite' : 'crowd';
}
const KIND_COLOR = { boss: UI.danger, elite: UI.gold, crowd: UI.muted };

/**
 * Bestiário: a stage where the chosen enemy walks and shows its tricks, large, over a sheet with what it is, how to
 * face it and its lore; every enemy as a small portrait in a grid (a silhouette until met) to choose from.
 * Wide screens: the grid on the left, the stage and the sheet on the right. Standing phones: stage, sheet, grid.
 */
export function drawBestiary(a: TabArea): TabContent {
  const { scene, save } = a;
  const order = bestiaryOrder(save.bestiary);
  const seenCount = order.filter((id) => save.bestiary[id]).length;
  const wide = a.w >= 640;

  // The grid: square portraits, as many columns as fit the width it gets.
  const cols = wide ? (a.short ? 6 : 5) : 7;
  const gridW = wide ? Math.min(a.w * 0.4, cols * (a.short ? 46 : 84)) : a.w;
  const cell = (gridW - GAP * (cols - 1)) / cols;
  const rows = Math.ceil(order.length / cols);
  const gridH = rows * (cell + GAP) - GAP;
  const rightW = wide ? Math.min(680, a.w - gridW - 16) : a.w;
  const left = wide ? a.x + (a.w - gridW - 16 - rightW) / 2 : a.x;
  const gridY = wide ? a.y + 22 : a.y + a.h - gridH;
  const panelX = wide ? left + gridW + 16 : a.x;
  const panelY = a.y + (wide ? 22 : 4);
  const panelH = (wide ? a.y + a.h : gridY - 24) - panelY;

  label(
    scene,
    wide ? left + gridW / 2 : a.x + a.w / 2,
    wide ? a.y + 8 : gridY - 13,
    t.bestiary.count(seenCount, order.length),
    13,
    { color: UI.muted },
  );

  // The stage takes the top of the panel, the sheet the rest.
  const showH = Math.round(Math.min(wide ? 360 : 230, panelH * (wide ? 0.56 : 0.5)));
  const show = new Showcase(scene, panelX, panelY, rightW, showH);
  const sheet = new Sheet(scene, panelX, panelY + showH + 8, rightW, panelH - showH - 8);

  const buttons: Phaser.GameObjects.Rectangle[] = [];
  const ids: EnemyId[] = [];
  order.forEach((id, i) => {
    const x = left + (i % cols) * (cell + GAP) + cell / 2;
    const y = gridY + Math.floor(i / cols) * (cell + GAP) + cell / 2;
    const seen = !!save.bestiary[id];
    const card = button(scene, x, y, cell, cell, () => focus(buttons.indexOf(card)));
    portrait(scene, x, y, id, cell - 12, seen);
    if (!seen) label(scene, x, y, '?', Math.round(cell * 0.4), { bold: true, color: UI.textOff });
    // Unseen ones can be focused too: the stage shows their silhouette, the sheet "???".
    buttons.push(card);
    ids.push(id);
  });

  const choose = (i: number) => {
    const id = ids[i];
    if (!id) return;
    const entry = save.bestiary[id];
    show.show(id, entry?.stage ?? enemyStage(id), !!entry, settings().calm);
    sheet.show(entry ? id : null, a);
  };
  let focus = (i: number) => choose(i);
  const first = Math.max(
    0,
    ids.findIndex((id) => save.bestiary[id]),
  );
  choose(first);
  return {
    buttons,
    start: first,
    onFocus: (i) => choose(i),
    bindFocus: (f) => (focus = f),
  };
}

/** The enemy's sheet: name and kind, its numbers in one line, how to face it, its lore and its line. */
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
    const bottom = this.y + this.h - pad + 4;
    if (!id || !entry) {
      add(
        label(s, this.x + this.w / 2, this.y + 24, t.bestiary.unknown, 20, { bold: true, color: UI.textOff }),
      );
      add(
        label(s, this.x + this.w / 2, this.y + this.h / 2 + 10, t.bestiary.empty, 14, {
          color: UI.muted,
          wrap: w,
        }),
      );
      return;
    }
    const roomy = this.h >= 300;
    const fs = roomy ? 15 : 13;
    let y = this.y + pad;
    // Name and kind, then where it was first seen and how many fell.
    const name = add(
      label(s, lx, y, t.enemies[id], roomy ? 22 : 18, { bold: true, color: UI.gold, align: 'left' }),
    );
    const kind = enemyKind(id);
    add(
      label(s, lx + w, y + name.height / 2, t.bestiary.kinds[kind], 13, {
        bold: true,
        color: KIND_COLOR[kind],
      }).setOrigin(1, 0.5),
    );
    y += name.height + 2;
    const where = add(
      label(
        s,
        lx,
        y,
        `${t.bestiary.seenIn}: ${t.stages[entry.stage].name}  ·  ${t.bestiary.killed}: ${t.int(entry.kills)}`,
        12,
        { color: UI.muted, align: 'left', wrap: w },
      ),
    );
    y += where.height + 6;
    // The numbers in one line, and its tricks.
    const tr = enemyTraits(ENEMIES[id]);
    const abilities = t.bestiary.bossAbilities[id];
    const way = abilities ? abilities.join(', ') : tr.way ? t.bestiary.ways[tr.way] : null;
    const facts = [
      `${t.bestiary.hp} ${t.int(tr.hp)}`,
      t.bestiary.speeds[tr.speed],
      tr.damage ? `${t.bestiary.damage} ${tr.damage}` : null,
      t.bestiary.pushes[tr.push],
    ].filter((f): f is string => !!f);
    const factLine = add(
      label(s, lx, y, facts.join('  ·  '), fs - 1, { bold: true, align: 'left', wrap: w }),
    );
    y += factLine.height + 2;
    if (way) {
      const wl = add(label(s, lx, y, way, fs - 1, { bold: true, color: UI.gold, align: 'left', wrap: w }));
      y += wl.height;
    }
    // How to face it, then the lore and the line, as far as the sheet has room (the line goes first).
    const block = (title: string | null, text: string, color: string, italic = false): void => {
      const head = title
        ? label(s, lx, y + 8, title, 12, { bold: true, color: UI.muted, align: 'left' })
        : null;
      const top = y + 8 + (head ? head.height + 1 : 0);
      const body = label(s, lx, top, text, fs, { align: 'left', wrap: w, color, italic });
      if (body.y + body.height > bottom) {
        head?.destroy();
        body.destroy();
        return;
      }
      if (head) add(head);
      add(body);
      y = body.y + body.height;
    };
    const tip = t.bestiary.tips[id];
    if (tip) block(t.bestiary.howTo, tip, UI.text);
    const lore = t.bestiary.lore[id];
    if (lore) block(t.bestiary.loreTitle, lore, UI.text, true);
    const line = t.bestiary.flavor[id];
    if (line) {
      const who = t.bestiary.speakers[id];
      block(null, who ? t.bestiary.quoteBy(line, who) : t.bestiary.quote(line), UI.muted, true);
    }
  }
}
