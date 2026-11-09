import type Phaser from 'phaser';
import { progress } from '../../core/achievements';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENT_IDS,
  type AchievementGroup,
  type AchievementId,
} from '../../data/achievements';
import { t } from '../../i18n/pt-BR';
import { ART_SCALE } from '../../render/art/pen';
import { achievementProgress, describeAchievement } from '../../render/describe';
import { loadSave, writeSave } from '../../render/save';
import { UI, button, label, newsDot, seal } from '../../render/ui';
import type { TabArea, TabContent } from './tab';

/** Registry keys: the last group open; this visit's new achievements; the ones that already blinked. */
const GROUP_KEY = 'collection.group';
const FRESH_KEY = 'collection.fresh';
const BLINKED_KEY = 'collection.blinked';

/** Leaving the Coleção ends the visit: the "new" marks go. */
export function forgetSession(registry: Phaser.Data.DataManager): void {
  registry.remove(FRESH_KEY);
  registry.remove(BLINKED_KEY);
}

const GAP = 8;
/** Most achievements in one group: every page keeps the same row size. */
const MOST = Math.max(
  ...ACHIEVEMENT_GROUPS.map((g) => ACHIEVEMENT_IDS.filter((id) => ACHIEVEMENTS[id].group === g).length),
);

/**
 * Conquistas: one page per group (chips with "3/6" on top), each achievement with a trophy or a padlock, its
 * reward and, while locked, a progress bar. Opening it clears the menu's dot; the new ones blink once. Tapping an
 * unlocked achievement with a title wears (or takes off) that title.
 */
export function drawAchievements(a: TabArea): TabContent {
  const { scene } = a;
  const reg = scene.registry;
  // Opening the tab marks the news as seen (the menu's dot goes), but they stay "new" for this visit.
  let fresh = (reg.get(FRESH_KEY) as AchievementId[] | undefined) ?? [];
  if (a.save.fresh.length > 0) {
    fresh = [...new Set([...fresh, ...a.save.fresh])];
    reg.set(FRESH_KEY, fresh);
    const save = loadSave();
    save.fresh = [];
    writeSave(save);
  }
  const groupOf = (id: AchievementId) => ACHIEVEMENTS[id].group;
  const group: AchievementGroup =
    (a.page as AchievementGroup | undefined) ??
    (fresh[0] ? groupOf(fresh[0]) : undefined) ??
    (reg.get(GROUP_KEY) as AchievementGroup | undefined) ??
    'kills';
  reg.set(GROUP_KEY, group);
  const done = new Set(a.save.achievements);

  const cx = a.x + a.w / 2;
  label(scene, cx, a.y + 8, t.collection.count(done.size, ACHIEVEMENT_IDS.length), 13, { color: UI.muted });

  // Group chips: one row when there is room, else 3 + 4.
  const n = ACHIEVEMENT_GROUPS.length;
  const oneRow = a.w >= 640;
  const chipH = 44;
  const rowsOf = oneRow
    ? [ACHIEVEMENT_GROUPS]
    : [ACHIEVEMENT_GROUPS.slice(0, 3), ACHIEVEMENT_GROUPS.slice(3)];
  const chips: Phaser.GameObjects.Rectangle[] = [];
  let y = a.y + 22;
  for (const row of rowsOf) {
    const cw = (a.w - 6 * (row.length - 1)) / row.length;
    row.forEach((g, i) => {
      const x = a.x + i * (cw + 6) + cw / 2;
      const cy = y + chipH / 2;
      const ids = ACHIEVEMENT_IDS.filter((id) => groupOf(id) === g);
      const open = g === group;
      chips.push(button(scene, x, cy, cw, chipH, () => a.reopen(g, ACHIEVEMENT_GROUPS.indexOf(g))));
      label(scene, x, cy - 9, t.achievements.groups[g], 13, { bold: true, color: open ? UI.gold : UI.text });
      label(
        scene,
        x,
        cy + 8,
        t.collection.groupCount(ids.filter((id) => done.has(id)).length, ids.length),
        12,
        {
          color: open ? UI.gold : UI.muted,
        },
      );
      if (open) scene.add.rectangle(x, cy + chipH / 2 - 3, cw - 12, 3, UI.goldHex);
      if (!open && ids.some((id) => fresh.includes(id))) newsDot(scene, x + cw / 2 - 6, cy - chipH / 2 + 6);
    });
    y += chipH + 6;
  }
  y += 4;

  // The page: one column standing, two lying down or on wide screens; the same row size on every page.
  const cols = a.w >= 640 ? 2 : 1;
  const rows = Math.ceil(MOST / cols);
  const avail = a.y + a.h - y;
  const rowW = (a.w - GAP * (cols - 1)) / cols;
  const rowH = Math.min(96, (avail - GAP * (rows - 1)) / rows);
  const list = ACHIEVEMENT_IDS.filter((id) => groupOf(id) === group);
  const blinked = (reg.get(BLINKED_KEY) as AchievementId[] | undefined) ?? [];
  const wearable: Phaser.GameObjects.Rectangle[] = [];
  list.forEach((id, i) => {
    const x = a.x + (i % cols) * (rowW + GAP);
    const top = y + Math.floor(i / cols) * (rowH + GAP);
    const focusAt = chips.length + wearable.length;
    const row = drawRow(scene, a, id, x, top, rowW, rowH, done.has(id), () => wear(a, id, group, focusAt));
    if (row.input?.enabled) wearable.push(row);
    if (fresh.includes(id) && !blinked.includes(id)) {
      blinked.push(id);
      blink(scene, x + rowW / 2, top + rowH / 2, rowW, rowH);
    }
  });
  reg.set(BLINKED_KEY, blinked);

  const buttons = [...chips, ...wearable];
  return {
    buttons,
    start: a.focus ?? ACHIEVEMENT_GROUPS.indexOf(group),
    onFocus: (i, prev) => {
      // Along the chips, the page follows the focus (like the tabs).
      if (i < n && prev >= 0 && prev < n && ACHIEVEMENT_GROUPS[i] !== group)
        a.reopen(ACHIEVEMENT_GROUPS[i], i);
    },
  };
}

/** One achievement. Returns its panel: a button when it gives a title that is unlocked (to wear it). */
function drawRow(
  scene: Phaser.Scene,
  a: TabArea,
  id: AchievementId,
  x: number,
  top: number,
  w: number,
  h: number,
  unlocked: boolean,
  onWear: () => void,
): Phaser.GameObjects.Rectangle {
  const d = describeAchievement(id);
  const wearable = unlocked && d.title !== null;
  const worn = wearable && a.save.title === id;
  const cx = x + w / 2;
  const cy = top + h / 2;
  const panel = wearable
    ? button(scene, cx, cy, w, h, onWear)
    : scene.add.rectangle(cx, cy, w, h, unlocked ? UI.panel : UI.panelOff, 0.95);
  panel.setStrokeStyle(2, worn ? UI.accent : unlocked ? UI.border : UI.borderOff);
  const pad = 9;
  const icon = 24;
  scene.add
    .image(x + pad + icon / 2, top + pad + icon / 2 - 2, unlocked ? 'icon.trophy' : 'icon.lock')
    .setScale(ART_SCALE * (icon / 22));
  const tx = x + pad + icon + 8;
  const right = x + w - pad;
  // Top right: done (or the title's state), else how far it is.
  let status: Phaser.GameObjects.Text;
  const p = progress(a.save, id);
  if (unlocked) {
    status = seal(
      scene,
      right,
      top + pad + 8,
      worn ? t.collection.inUse : wearable ? t.collection.useTitle : t.collection.done,
      worn || !wearable,
      12,
    ).text;
  } else {
    status = label(
      scene,
      right,
      top + pad + 8,
      p.goal > 1 ? achievementProgress(id, p.value, p.goal) : '',
      12,
      {
        color: UI.muted,
      },
    ).setOrigin(1, 0.5);
  }
  const nameW = right - tx - (status.width > 0 ? status.width + 16 : 0);
  label(scene, tx, top + pad - 1, d.name, w < 360 ? 14 : 15, {
    bold: true,
    align: 'left',
    color: unlocked ? UI.gold : UI.text,
    wrap: nameW,
  });
  const desc = label(scene, tx, top + pad + 18, d.desc, 13, {
    color: UI.muted,
    align: 'left',
    wrap: right - tx,
  });
  const reward = d.title ? `${d.reward}${t.sep}${t.collection.titleOf(d.title)}` : d.reward;
  label(scene, tx, Math.max(desc.y + desc.height + 1, top + h - pad - 20), reward, 12, {
    color: UI.gold,
    align: 'left',
    wrap: right - tx,
  });
  // Locked with a count to reach: a thin bar along the bottom.
  if (!unlocked && p.goal > 1) {
    const bw = w - pad * 2;
    const by = top + h - 5;
    scene.add.rectangle(x + pad, by, bw, 3, UI.borderOff).setOrigin(0, 0.5);
    if (p.value > 0)
      scene.add.rectangle(x + pad, by, (bw * p.value) / p.goal, 3, UI.accent).setOrigin(0, 0.5);
  }
  return panel;
}

/** Wears the title of `id`, or takes it off if worn already. */
function wear(a: TabArea, id: AchievementId, group: AchievementGroup, focus: number): void {
  const save = loadSave();
  if (save.title === id) delete save.title;
  else save.title = id;
  writeSave(save);
  a.reopen(group, focus);
}

/** A gold flash over a new achievement, twice. */
function blink(scene: Phaser.Scene, x: number, y: number, w: number, h: number): void {
  const glow = scene.add.rectangle(x, y, w, h, UI.goldHex, 0).setStrokeStyle(3, UI.goldHex);
  scene.tweens.add({
    targets: glow,
    fillAlpha: 0.22,
    duration: 280,
    yoyo: true,
    repeat: 1,
    delay: 250,
    onComplete: () => glow.destroy(),
  });
}
