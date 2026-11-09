import Phaser from 'phaser';
import { formatTime } from '../core/format';
import { almostElo, passiveReport, weaponReport } from '../core/report';
import type { World } from '../core/world';
import type { StageId } from '../data/stages';
import type { WeaponId } from '../data/weapons';
import { nextGoal } from '../core/meta';
import { closestAchievement } from '../core/achievements';
import type { AchievementId } from '../data/achievements';
import { loadSave } from '../render/save';
import { t } from '../i18n/pt-BR';
import { achievementProgress, describeAchievement, formatCompact, formatDecimal } from '../render/describe';
import { UI, button, dim, isShort, label, restartOnResize, bindKeys, keyNav } from '../render/ui';
import { ART_SCALE } from '../render/art/pen';
import { PASSIVES } from '../data/upgrades';
import { setChoice } from './SelectScene';
import { SCENES } from './keys';

/** Game over or victory: the run report (summary, damage per weapon, passives) over the frozen battlefield. */
export class EndScene extends Phaser.Scene {
  private world!: World;
  private unlocked: StageId | null = null;
  private newElos: WeaponId[] = [];
  private newAchievements: AchievementId[] = [];

  constructor() {
    super(SCENES.end);
  }

  init(data: {
    world: World;
    unlocked?: StageId | null;
    newElos?: WeaponId[];
    newAchievements?: AchievementId[];
  }): void {
    this.world = data.world;
    this.unlocked = data.unlocked ?? null;
    this.newElos = data.newElos ?? [];
    this.newAchievements = data.newAchievements ?? [];
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const w = this.world;
    const won = w.state === 'won';
    // Phone lying down: two columns (the story and notes on the left, the weapons on the right).
    const wide = isShort(this) && width >= 700;
    const pw = wide ? Math.min(940, width - 16) : Math.min(600, width - 16);
    const left = cx - pw / 2 + 14;
    const small = pw < 460;

    // Above the HUD, which the level-up and pause overlays bring to the top.
    this.scene.bringToTop();
    dim(this, 0.82);
    // Laid out from y = 0, then the panel is sized to the content and everything is centred vertically.
    const first = this.children.list.length;
    const panel = this.add
      .rectangle(cx, 0, pw, 10, UI.panel, 0.92)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, won ? UI.accent : UI.dangerDark);

    const colW = wide ? (pw - 42) / 2 : pw - 28;
    const rightX = wide ? left + colW + 14 : left;
    let y = this.header(left, 14, colW, won, small || wide);
    y = this.summary(left, y, colW, small || wide ? 2 : 4);
    let yr = wide ? 14 : y;
    yr = this.weapons(rightX, yr, colW);
    if (!wide) y = yr;
    y = this.passives(left, y, colW);
    y = this.notes(left + colW / 2, y + 2, colW);
    y = Math.max(y, wide ? yr : 0);

    // Actions: Próxima fase (when this victory opened one) first and focused, then Jogar de novo · Menu.
    const actions: [string, () => void][] = [];
    const next = this.unlocked;
    if (next) actions.push([t.end.next, () => this.play(next)]);
    actions.push([t.end.again, () => this.play(w.stageId)], [t.end.menu, () => this.toMenu()]);
    const buttons: Phaser.GameObjects.Rectangle[] = [];
    let by = y + 30;
    if (actions.length === 3 && !wide) {
      const [label0, action0] = actions.shift() as [string, () => void];
      buttons.push(button(this, cx, by, pw - 28, 46, action0, label0));
      by += 54;
    }
    const bw = (pw - 28 - 8 * (actions.length - 1)) / actions.length;
    actions.forEach(([text, action], i) =>
      buttons.push(button(this, left + bw / 2 + i * (bw + 8), by, bw, 46, action, text)),
    );
    keyNav(this, buttons, buttons.length === 3 && !wide ? 1 : buttons.length);
    const total = by + 37;
    panel.setSize(pw, total);
    const offset = Math.max(8, (height - total) / 2);
    for (const obj of this.children.list.slice(first)) (obj as unknown as { y: number }).y += offset;

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.toMenu());
    });
    restartOnResize(this);
  }

  /** Title, flavor text and the stage and hero. Returns the next y. */
  private header(x: number, y: number, w: number, won: boolean, compact: boolean): number {
    const cx = x + w / 2;
    const world = this.world;
    label(this, cx, y + 18, won ? t.end.won : t.end.lost, compact ? 30 : 36, {
      bold: true,
      color: won ? UI.gold : UI.danger,
    });
    y += compact ? 40 : 46;
    const flavor = won ? t.stages[world.stageId].won : t.end.lostText(t.characters[world.character].name);
    const text = label(this, cx, y, flavor, compact ? 14 : 15, { wrap: w }).setOrigin(0.5, 0);
    y += text.height + 6;
    label(this, cx, y, t.end.run(t.stages[world.stageId].name, t.characters[world.character].name), 15, {
      bold: true,
      color: UI.gold,
    }).setOrigin(0.5, 0);
    // The title the player wears (chosen in the Coleção), under the hero's name.
    const worn = loadSave().title;
    const title = worn ? t.achievements.titles[worn] : undefined;
    if (title) {
      label(this, cx, y + 21, title, 13, { italic: true, color: UI.muted }).setOrigin(0.5, 0);
      y += 19;
    }
    return y + 28;
  }

  /** Time, kills, level and gold: `per` cells a row. */
  private summary(x: number, y: number, w: number, per: number): number {
    const world = this.world;
    const stats: [string, string][] = [
      [t.end.time, formatTime(world.time)],
      [t.end.kills, String(world.kills)],
      [t.end.level, String(world.level)],
      [t.end.gold, String(world.gold)],
    ];
    const cellW = w / per;
    stats.forEach(([k, v], i) => {
      const cx = x + (i % per) * cellW;
      const yy = y + Math.floor(i / per) * 22;
      label(this, cx, yy, k, 14, { color: UI.muted, align: 'left' });
      label(this, cx + cellW - 12, yy, v, 14, { bold: true }).setOrigin(1, 0);
    });
    y += Math.ceil(stats.length / per) * 22 + 12;
    this.add.rectangle(x, y, w, 1, UI.border).setOrigin(0, 0);
    return y + 10;
  }

  /** Damage per weapon: icon, name, level, damage, time owned, DPS, and a bar against the best damage. */
  private weapons(x: number, y: number, w: number): number {
    const small = w < 440;
    const rows = weaponReport(this.world);
    const best = Math.max(...rows.map((r) => r.dps));
    const most = Math.max(1, ...rows.map((r) => r.damage));
    const right = x + w;
    const fs = small ? 13 : 14;
    const colW = small ? 50 : 66;
    const xLevel = right - colW * 2 - (small ? 44 : 50);
    const xDamage = right - colW * 2;
    const xTime = right - colW;
    const header = (txt: string, hx: number) =>
      label(this, hx, y, txt, fs, { bold: true, color: UI.gold }).setOrigin(1, 0);
    label(this, x, y, t.end.weapon, fs, { bold: true, color: UI.gold, align: 'left' });
    header(t.end.weaponLevel, xLevel);
    header(t.end.damage, xDamage);
    header(t.end.owned, xTime);
    header(t.end.dps, right);
    y += 22;
    const bars = this.add.graphics();
    for (const r of rows) {
      const color = r.dps === best && best > 0 ? UI.gold : UI.text;
      this.add.image(x + 10, y + 8, `icon.${r.id}`).setScale((ART_SCALE * 20) / 28);
      label(this, x + 24, y, t.weapons[r.id].name, fs, { align: 'left', color });
      const cell = (txt: string, cx: number) => label(this, cx, y, txt, fs, { color }).setOrigin(1, 0);
      cell(String(r.level), xLevel);
      cell(formatCompact(r.damage), xDamage);
      cell(formatTime(r.time), xTime);
      cell(formatDecimal(r.dps), right);
      // A thin bar under the row: this weapon's share of the best damage.
      const barW = right - (x + 24);
      bars.fillStyle(UI.borderOff, 1).fillRect(x + 24, y + 18, barW, 3);
      bars
        .fillStyle(r.dps === best && best > 0 ? UI.goldHex : UI.accent, 1)
        .fillRect(x + 24, y + 18, (barW * r.damage) / most, 3);
      y += 26;
    }
    return y + 4;
  }

  /** Passives as icons with level pips. */
  private passives(x: number, y: number, w: number): number {
    const list = passiveReport(this.world);
    const head = label(this, x, y + 2, t.end.passives, 13, { color: UI.muted, align: 'left' });
    if (list.length === 0) {
      label(this, x + head.width + 8, y + 2, t.end.none, 13, { color: UI.muted, align: 'left' });
      return y + 26;
    }
    const g = this.add.graphics();
    const step = 28;
    const perRow = Math.max(1, Math.floor((w - head.width - 10) / step));
    list.forEach((p, i) => {
      const px = x + head.width + 10 + (i % perRow) * step;
      const py = y + Math.floor(i / perRow) * 30;
      this.add.image(px + 10, py + 10, `icon.${p.id}`).setScale((ART_SCALE * 20) / 28);
      const max = PASSIVES[p.id].maxLevel;
      const pipW = (20 - (max - 1)) / max;
      for (let k = 0; k < max; k++)
        g.fillStyle(k < p.level ? (p.level >= max ? UI.goldHex : UI.textHex) : UI.borderOff, 1).fillRect(
          px + k * (pipW + 1),
          py + 22,
          pipW,
          3,
        );
    });
    return y + Math.ceil(list.length / perRow) * 30 + 6;
  }

  /**
   * The next stage, the Elo that almost formed, new Elos, new achievements (or the closest one), the bank and the
   * next thing to buy. Centred on cx.
   */
  private notes(cx: number, y: number, w: number): number {
    const line = (text: string, size: number, color: string, bold = false) => {
      const l = label(this, cx, y, text, size, { bold, color, wrap: w }).setOrigin(0.5, 0);
      y += l.height + 6;
    };
    if (this.unlocked) line(t.end.unlocked(t.stages[this.unlocked].name), 16, UI.gold, true);
    // "Faltou pouco": the hook for one more run. An Elo never formed keeps its name a secret.
    const save = loadSave();
    const almost = almostElo(this.world);
    if (almost) {
      const weapon = t.weapons[almost.weapon].name;
      const text =
        almost.kind === 'level'
          ? t.end.almostLevel(weapon)
          : save.elos.includes(almost.elo)
            ? t.end.almostElo(t.weapons[almost.elo].name)
            : t.end.almostEloUnknown(weapon);
      line(text, 15, UI.gold, true);
    }
    for (const id of this.newElos) line(t.end.newElo(t.weapons[id].name), 15, UI.gold, true);
    // Achievements: up to three new ones; with none, the one closest to done (the next "one more run").
    const fresh = this.newAchievements;
    for (const id of fresh.slice(0, 3)) {
      const a = describeAchievement(id);
      line(t.end.achievement(a.name, a.reward), 15, UI.gold, true);
    }
    if (fresh.length > 3) line(t.end.moreAchievements(fresh.length - 3), 14, UI.gold);
    const near = fresh.length === 0 ? (closestAchievement(save) ?? closestAchievement(save, 0)) : null;
    if (near)
      line(
        t.end.near(describeAchievement(near.id).name, achievementProgress(near.id, near.value, near.goal)),
        14,
        UI.text,
      );
    const goal = nextGoal(save);
    line(t.end.banked(save.gold), 14, UI.text);
    if (goal) {
      const name = goal.kind === 'shop' ? t.shop.items[goal.id] : t.characters[goal.id].name;
      const can = save.gold >= goal.cost;
      line(
        can ? t.end.canBuy(name, goal.cost) : t.end.toBuy(name, goal.cost - save.gold),
        14,
        can ? UI.gold : UI.muted,
      );
    }
    return y;
  }

  /** Starts a run with the same hero on `stage` (remembered as the last choice). */
  private play(stage: StageId): void {
    const choice = { character: this.world.character, stage };
    setChoice(this.registry, choice);
    this.scene.start(SCENES.game, choice);
  }

  private toMenu(): void {
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.menu);
  }
}
