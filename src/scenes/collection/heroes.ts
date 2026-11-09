import type Phaser from 'phaser';
import { formatTime } from '../../core/format';
import { heroUnlocked, newHeroRecord } from '../../core/meta';
import { favoriteWeapon } from '../../core/records';
import { EVOLVED_IDS } from '../../data/evolutions';
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../../data/characters';
import { STAGE_IDS } from '../../data/stages';
import { t } from '../../i18n/pt-BR';
import { ART_SCALE, INK } from '../../render/art/pen';
import { formatCompact } from '../../render/describe';
import { HERO_COLOR } from '../../render/fx';
import { UI, label } from '../../render/ui';
import type { TabArea, TabContent } from './tab';

const GAP = 8;

/** "2h05", or "45 min" under an hour. */
function played(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return m >= 60 ? t.collection.hours(Math.floor(m / 60), m % 60) : t.collection.minutes(m);
}

/** Heróis: the title worn, a card of records per hero (2 x 2 standing, side by side lying down), the totals. */
export function drawHeroes(a: TabArea): TabContent {
  const { scene, save } = a;
  const cx = a.x + a.w / 2;
  let top = a.y;
  if (save.title) {
    const title = t.achievements.titles[save.title];
    if (title) {
      label(scene, cx, top + 8, t.collection.titleOf(title), 14, { bold: true, color: UI.gold });
      top += 22;
    }
  }

  // The totals of every run, at the foot: one line when wide, else two.
  const tt = t.collection.totals;
  const s = save.totals;
  const items = [
    t.collection.total(tt.runs, t.int(s.runs)),
    t.collection.total(tt.wins, t.int(s.wins)),
    t.collection.total(tt.kills, t.int(s.kills)),
    t.collection.total(tt.damage, formatCompact(s.damage)),
    t.collection.total(tt.gold, t.int(s.gold)),
    t.collection.total(tt.time, played(s.time)),
  ];
  const wide = a.w >= 640;
  const lines = wide ? [items.join(t.sep)] : [items.slice(0, 3).join(t.sep), items.slice(3).join(t.sep)];
  const footH = lines.length * 18 + 6;

  const cols = wide ? 4 : 2;
  const rows = CHARACTER_IDS.length / cols;
  const cardW = Math.min(260, (a.w - GAP * (cols - 1)) / cols);
  const cardH = Math.min(290, (a.y + a.h - footH - 6 - top - GAP * (rows - 1)) / rows);
  const left = cx - (cols * cardW + (cols - 1) * GAP) / 2;
  CHARACTER_IDS.forEach((id, i) => {
    const x = left + (i % cols) * (cardW + GAP);
    const y = top + Math.floor(i / cols) * (cardH + GAP);
    heroCard(scene, a, id, x, y, cardW, cardH);
  });
  // Right under the cards (the bottom of the area on tall screens with room to spare).
  const footTop = Math.min(a.y + a.h - footH, top + rows * (cardH + GAP) + 4);
  lines.forEach((l, i) => label(scene, cx, footTop + 12 + i * 18, l, 13, { color: UI.muted }));
  return { buttons: [] };
}

function heroCard(
  scene: Phaser.Scene,
  a: TabArea,
  id: CharacterId,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const owned = heroUnlocked(a.save, id);
  const color = HERO_COLOR[id];
  scene.add
    .rectangle(x + w / 2, y + h / 2, w, h, owned ? UI.panel : UI.panelOff, 0.95)
    .setStrokeStyle(2, owned ? UI.border : UI.borderOff);
  const pad = 10;
  // Portrait on its light, name and role, and one mark per stage (lit once won there).
  const px = x + pad + 20;
  const feet = y + pad + 44;
  scene.add
    .ellipse(px, feet - 2, 36, 10, color, owned ? 0.35 : 0.12)
    .setStrokeStyle(2, color, owned ? 0.9 : 0.3);
  const hero = scene.add
    .image(px, feet + 4, CHARACTERS[id].sprite)
    .setOrigin(0.5, 1)
    .setScale(ART_SCALE * 1.15);
  if (!owned) hero.setTint(UI.border);
  const tx = x + pad + 46;
  label(scene, tx, y + pad, t.characters[id].name, 16, {
    bold: true,
    align: 'left',
    color: owned ? UI.text : UI.textOff,
  });
  label(scene, tx, y + pad + 20, t.characters[id].role, 12, { color: UI.muted, align: 'left' });
  const rec = a.save.records[id] ?? newHeroRecord();
  STAGE_IDS.forEach((stage, k) => {
    const won = (rec.wins[stage] ?? 0) > 0;
    scene.add
      .circle(tx + 6 + k * 17, y + pad + 44, 6, won ? UI.goldHex : UI.panelOff)
      .setStrokeStyle(2, won ? INK : UI.border);
  });

  const rowsTop = y + pad + 62;
  if (!owned) {
    // Not bought yet: the price, an invitation to the Preparação.
    label(scene, x + w / 2, rowsTop + 30, t.select.unlock(CHARACTERS[id].cost), 14, {
      bold: true,
      color: UI.gold,
      wrap: w - pad * 2,
    });
    return;
  }
  const c = t.collection.heroes;
  const dash = c.none;
  const fav = favoriteWeapon(rec);
  const elos = EVOLVED_IDS;
  const rows: [string, string | null][] = [
    [c.runs, t.int(rec.runs)],
    [c.bestTime, rec.bestTime > 0 ? formatTime(rec.bestTime) : dash],
    [c.fastestWin, rec.fastestWin > 0 ? formatTime(rec.fastestWin) : dash],
    [c.bestLevel, rec.bestLevel > 0 ? t.int(rec.bestLevel) : dash],
    [c.bestKills, rec.bestKills > 0 ? t.int(rec.bestKills) : dash],
    [c.bestHit, rec.bestHit > 0 ? t.int(rec.bestHit) : dash],
    [c.favorite, fav ? null : dash],
    [c.elos, c.elosOf(rec.elos.filter((e) => elos.includes(e)).length, elos.length)],
    // Noite Sem Fim: the longest vigil on each stage, in the order of the stage marks above.
    [c.vigil, STAGE_IDS.map((s) => (rec.vigil[s] ? formatTime(rec.vigil[s] as number) : dash)).join(t.sep)],
  ];
  const step = Math.min(24, (y + h - pad - rowsTop) / rows.length);
  const fs = step >= 20 ? 14 : 13;
  rows.forEach(([k, v], i) => {
    const ry = rowsTop + i * step + step / 2;
    label(scene, x + pad, ry, k, fs, { color: UI.muted, align: 'left' }).setOrigin(0, 0.5);
    if (v !== null) label(scene, x + w - pad, ry, v, fs, { bold: true }).setOrigin(1, 0.5);
    else if (fav) scene.add.image(x + w - pad - 10, ry, `icon.${fav}`).setScale((ART_SCALE * 20) / 28);
  });
}
