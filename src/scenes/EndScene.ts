import { ELO_DISCOVERY_GOLD, EVOLVED_IDS } from '../data/evolutions';
import Phaser from 'phaser';
import { formatTime } from '../core/format';
import { almostElo, hurtShare, passiveReport, reportExtent, weaponReport } from '../core/report';
import type { HurtSource } from '../core/enemyShots';
import type { World } from '../core/world';
import type { StageId } from '../data/stages';
import type { WeaponId } from '../data/weapons';
import { biggestGoal, nextHeroGoal, canBuyAny } from '../core/meta';
import { closestAchievement } from '../core/achievements';
import type { AchievementId } from '../data/achievements';
import { loadSave } from '../render/save';
import { t } from '../i18n/pt-BR';
import { achievementProgress, describeAchievement, formatCompact, formatDecimal } from '../render/describe';
import { UI, skin, button, dim, isShort, label, restartOnResize, bindKeys, keyNav } from '../render/ui';
import { firstFit } from '../core/layout';
import { ART_SCALE } from '../render/art/pen';
import { HERO_COLOR } from '../render/fxparts/common';
import { PASSIVES } from '../data/upgrades';
import { setChoice } from './choice';
import type { GameScene } from './GameScene';
import { SCENES } from './keys';

/** Compaction levels of the end screen, roomiest first. */
const END_LEVELS = 4;

/** Game over or victory: the run report (summary, damage per weapon, passives) over the frozen battlefield. */
export class EndScene extends Phaser.Scene {
  private world!: World;
  private unlocked: StageId | null = null;
  private newElos: WeaponId[] = [];
  private newAchievements: AchievementId[] = [];
  private vigilRecord = false;

  constructor() {
    super(SCENES.end);
  }

  init(data: {
    world: World;
    unlocked?: StageId | null;
    newElos?: WeaponId[];
    newAchievements?: AchievementId[];
    vigilRecord?: boolean;
    record?: boolean;
    treasure?: number;
  }): void {
    this.vigilRecord = !!data.vigilRecord;
    this.record = !!data.record;
    this.treasure = data.treasure ?? 0;
    // The numbers hide behind "Ver detalhes"; a player who opened them keeps them open.
    this.details = this.registry.get('endDetails') === true;
    this.world = data.world;
    this.unlocked = data.unlocked ?? null;
    this.newElos = data.newElos ?? [];
    this.newAchievements = data.newAchievements ?? [];
  }

  /** The hero's longest run so far was beaten (set by the game when the run is banked). */
  private record = false;
  /** Gold of the first-run treasure opened by this run (0: none). */
  private treasure = 0;
  /** The table (time, kills, weapons, passives) is open. */
  private details = false;

  create(): void {
    // Above the HUD, which the level-up and pause overlays bring to the top.
    this.scene.bringToTop();
    dim(this, 0.82);
    const first = this.children.list.length;
    // Lay out at the roomiest level that fits; each next level packs the notes and the table tighter.
    const height = this.scale.height;
    const level = firstFit(END_LEVELS, height - 16, (l) => {
      const total = this.layout(l);
      for (const obj of this.children.list.slice(first)) obj.destroy();
      return total;
    });
    this.layout(level, true);

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.toMenu());
    });
    restartOnResize(this);
  }

  /**
   * Lays the whole panel out at compaction `level` (0 = roomiest) and returns its height. `place`: also centre it
   * and wire the buttons; when even the tightest level overflows, the actions are pinned to the bottom of the
   * screen and the rest is shrunk to fit above them, so the buttons are always reachable.
   */
  private layout(level: number, place = false): number {
    const { width, height } = this.scale;
    const cx = width / 2;
    const w = this.world;
    // A Noite Sem Fim comes after a victory: its end reads as one too.
    const won = w.state === 'won' || w.endless;
    // Lying down: two columns (the story and notes on the left, the weapons on the right).
    const wide = this.details && (isShort(this) ? width >= 600 : width >= 700 && level >= 2);
    const pw = wide ? Math.min(940, width - 16) : Math.min(600, width - 16);
    const left = cx - pw / 2 + 14;
    const small = pw < 460;
    const first = this.children.list.length;
    const panel = skin(
      this,
      this.add
        .rectangle(cx, 0, pw, 10, UI.panel, 0.92)
        .setOrigin(0.5, 0)
        .setStrokeStyle(2, won ? UI.accent : UI.dangerDark),
      'button',
    );

    const colW = wide ? (pw - 42) / 2 : pw - 28;
    const rightX = wide ? left + colW + 14 : left;
    let y = this.header(left, 14, colW, won, small || wide || level >= 2);
    let yr = wide ? 14 : y;
    if (this.details) {
      y = this.summary(left, y, colW, colW < 440 ? 2 : 4);
      yr = wide ? 14 : y;
      yr = this.weapons(rightX, yr, colW, level >= 2);
      if (!wide) y = yr;
      y = this.passives(left, y, colW);
    } else y = this.goldLine(left + colW / 2, y, place);
    y = this.notes(left + colW / 2, y + 2, colW, level);
    y = Math.max(y, wide ? yr : 0);
    const contentEnd = this.children.list.length;

    // Actions: Próxima fase (when this victory opened one) first and focused, then Jogar de novo · Menu.
    const actions: [string, () => void][] = [];
    const next = this.unlocked;
    if (next) actions.push([t.end.next, () => this.play(next)]);
    if (w.state === 'won' && !w.endless) actions.push([t.end.continueVigil, () => this.vigil()]);
    actions.push([t.end.again, () => this.play(w.stageId)], [t.end.menu, () => this.toMenu()]);
    // The Loja shortcut (PU-04) only shows when the cofre pays something; the focus stays on the first action.
    const save0 = loadSave();
    const shop: [string, () => void] | null = canBuyAny(save0)
      ? [t.end.shop(save0.gold), () => this.toShop()]
      : null;
    const buttons: Phaser.GameObjects.Rectangle[] = [];
    let by = y + 30;
    const top = by;
    // Standing: the extra actions get full-width rows, Jogar de novo · Menu share the last one.
    const oneRow = wide || (level >= 3 && width >= 560);
    while (actions.length > 2 && !oneRow) {
      const [label0, action0] = actions.shift() as [string, () => void];
      buttons.push(button(this, cx, by, pw - 28, 46, action0, label0));
      by += 54;
    }
    if (shop && oneRow) actions.push(shop);
    const bw = (pw - 28 - 8 * (actions.length - 1)) / actions.length;
    actions.forEach(([text, action], i) =>
      buttons.push(button(this, left + bw / 2 + i * (bw + 8), by, bw, 46, action, text)),
    );
    if (shop && !oneRow) {
      by += 54;
      buttons.push(button(this, cx, by, pw - 28, 46, shop[1], shop[0]));
    }
    // The numbers (time, kills, weapons, passives) open and close here.
    by += 54;
    buttons.push(
      button(
        this,
        cx,
        by,
        pw - 28,
        40,
        () => {
          this.registry.set('endDetails', !this.details);
          this.scene.restart({
            world: this.world,
            unlocked: this.unlocked,
            newElos: this.newElos,
            newAchievements: this.newAchievements,
            vigilRecord: this.vigilRecord,
            record: this.record,
            treasure: this.treasure,
          });
        },
        this.details ? t.end.hideDetails : t.end.showDetails,
      ),
    );
    const total = by + 37;
    panel.setSize(pw, total);
    if (!place) return total;

    keyNav(this, buttons, oneRow ? buttons.length : buttons.length > 2 ? 1 : buttons.length);
    const objects = this.children.list.slice(first);
    if (total <= height - 16) {
      const offset = (height - total) / 2;
      for (const obj of objects) (obj as unknown as { y: number }).y += offset;
      return total;
    }
    // Still too tall: the actions (from `top - 23` to `total`) sit at the bottom, the rest shrinks above them.
    const footer = total - (top - 23);
    const shift = height - 8 - total;
    for (const obj of this.children.list.slice(contentEnd)) (obj as unknown as { y: number }).y += shift;
    const content = this.add.container(0, 0, this.children.list.slice(first + 1, contentEnd));
    const scale = (height - 16 - footer) / (top - 23);
    content.setScale(scale).setPosition(cx * (1 - scale), 8);
    panel.setY(8).setSize(pw, height - 16);
    return total;
  }

  /** Title, flavor text and the stage and hero. Returns the next y. */
  private header(x: number, y: number, w: number, won: boolean, compact: boolean): number {
    const cx = x + w / 2;
    const world = this.world;
    const vigil = world.endless;
    label(
      this,
      cx,
      y + 18,
      vigil ? t.end.vigilOver : world.abandoned ? t.end.abandoned : won ? t.end.won : t.end.lost,
      compact ? 30 : 36,
      {
        bold: true,
        color: won ? UI.gold : UI.danger,
      },
    );
    y += compact ? 40 : 46;
    y = this.portrait(cx, y, compact ? 44 : 64, won);
    const flavor = vigil
      ? t.end.vigilText(formatTime(world.vigilTime))
      : won
        ? t.stages[world.stageId].won
        : world.abandoned
          ? t.end.abandonedText(t.characters[world.character].name)
          : t.end.lostByStage[world.stageId](t.characters[world.character].name);
    const text = label(this, cx, y, flavor, compact ? 14 : 15, { wrap: w }).setOrigin(0.5, 0);
    y += text.height + 6;
    // A lost run says what did the damage: the lesson that changes the next run (CU-02).
    const shares = world.state === 'lost' && !vigil && !world.abandoned ? hurtShare(world.hurtBy) : [];
    if (shares.length > 0) {
      const parts = shares.map((h) => `${t.end.hurt[h.source]} ${h.percent}%`).join(' · ');
      const line = label(this, cx, y, t.end.hurtBy(parts), 14, {
        bold: true,
        color: UI.muted,
        wrap: w,
      }).setOrigin(0.5, 0);
      y += line.height + 6;
    }
    if (this.record && !vigil && !world.abandoned) {
      label(this, cx, y, t.end.record(formatTime(world.time)), 15, { bold: true, color: UI.gold }).setOrigin(
        0.5,
        0,
      );
      y += 22;
    }
    // And one piece of advice for the next run, from the enemy that struck the last blow, else from the main source.
    if (shares.length > 0) {
      const tip =
        (world.killer && t.bestiary.tips[world.killer]) ||
        t.end.hurtTip[(shares[0] as { source: HurtSource }).source];
      const line = label(this, cx, y, tip, 14, { color: UI.text, wrap: w }).setOrigin(0.5, 0);
      y += line.height + 6;
    }
    if (vigil && this.vigilRecord) {
      label(this, cx, y, t.end.vigilRecord, 15, { bold: true, color: UI.gold }).setOrigin(0.5, 0);
      y += 22;
    }
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

  /** The hero on its light: standing after a victory, fallen after a defeat (PX-16). Returns the next y. */
  private portrait(cx: number, y: number, size: number, won: boolean): number {
    const id = this.world.character;
    const color = HERO_COLOR[id];
    const feet = y + size + 4;
    this.add.ellipse(cx, feet - 3, size * 0.9, size * 0.2, color, 0.4).setStrokeStyle(2, color, 0.9);
    const fallen = !won && this.world.state === 'lost';
    const hero = fallen
      ? this.add.image(cx, feet, `player.${id}.fall`, 6)
      : this.add.image(cx, feet, `player.${id}.front`);
    hero.setOrigin(0.5, 1);
    hero.setScale(size / (fallen ? 68 : hero.height));
    return feet + 6;
  }

  /** The run's gold in one line, counting up (PX-15). Returns the next y. */
  private goldLine(cx: number, y: number, animate: boolean): number {
    const gold = Math.floor(this.world.gold);
    const line = label(this, cx, y, t.end.goldEarned(gold), 20, { bold: true, color: UI.gold }).setOrigin(
      0.5,
      0,
    );
    if (animate && gold > 0) {
      const count = { n: 0 };
      line.setText(t.end.goldEarned(0));
      this.tweens.add({
        targets: count,
        n: gold,
        duration: 900,
        onUpdate: () => line.setText(t.end.goldEarned(Math.floor(count.n))),
      });
    }
    return y + 36;
  }

  /** Time, kills, level and gold: `per` cells a row. */
  private summary(x: number, y: number, w: number, per: number): number {
    const world = this.world;
    const stats: [string, string][] = [
      [t.end.time, formatTime(world.time)],
      [t.end.kills, String(world.kills)],
      [t.end.level, String(world.level)],
      [t.end.gold, String(Math.floor(world.gold))],
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
  private weapons(x: number, y: number, w: number, noTime = false): number {
    const small = w < 440;
    const rows = weaponReport(this.world);
    const { best, most } = reportExtent(rows);
    const right = x + w;
    const fs = small ? 13 : 14;
    const colW = small ? 50 : 66;
    const cols = noTime ? 1 : 2;
    const xLevel = right - colW * cols - (small ? 44 : 50);
    const xDamage = right - colW * cols;
    const xTime = right - colW;
    const header = (txt: string, hx: number) =>
      label(this, hx, y, txt, fs, { bold: true, color: UI.gold }).setOrigin(1, 0);
    label(this, x, y, t.end.weapon, fs, { bold: true, color: UI.gold, align: 'left' });
    header(t.end.weaponLevel, xLevel);
    header(t.end.damage, xDamage);
    if (!noTime) header(t.end.owned, xTime);
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
      if (!noTime) cell(formatTime(r.time), xTime);
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
  private notes(cx: number, y: number, w: number, level: number): number {
    const line = (text: string, size: number, color: string, bold = false) => {
      const l = label(this, cx, y, text, size, { bold, color, wrap: w }).setOrigin(0.5, 0);
      y += l.height + 6;
      return l;
    };
    // An achievement line: a trophy before the text (a padlock for the closest one, still locked).
    const badged = (text: string, size: number, color: string, icon: string, bold = false) => {
      const l = line(text, size, color, bold);
      // Shifted right by half the icon's room, so icon and text stay centred together.
      l.setX(cx + 11);
      this.add.image(cx + 11 - l.width / 2 - 13, l.y + size * 0.62, icon).setScale(ART_SCALE * (size / 18));
    };
    // From level 1 on, each kind of note takes one line; from level 3 on, only what this run brought.
    const packed = level >= 1;
    if (this.unlocked) line(t.end.unlocked(t.stages[this.unlocked].name), 16, UI.gold, true);
    // "Faltou pouco": the hook for one more run. An Elo never formed keeps its name a secret.
    const save = loadSave();
    const almost = almostElo(this.world);
    if (almost) {
      const weapon = t.weapons[almost.weapon].name;
      const piece = almost.missing === 'weapon' ? weapon : t.passives[almost.passive];
      const text = save.elos.includes(almost.elo)
        ? t.end.almostElo(piece, t.weapons[almost.elo].name)
        : t.end.almostEloUnknown(piece, weapon);
      line(text, 15, UI.gold, true);
    }
    const elos = this.newElos;
    if (packed && elos.length > 1)
      line(
        t.end.elosFound(elos.map((id) => t.weapons[id].name).join(', '), ELO_DISCOVERY_GOLD * elos.length),
        15,
        UI.gold,
        true,
      );
    else for (const id of elos) line(t.end.newElo(t.weapons[id].name, ELO_DISCOVERY_GOLD), 15, UI.gold, true);
    // The treasure of the very first run, win or lose (PX-17).
    if (this.treasure > 0) badged(t.end.treasure(this.treasure), 16, UI.gold, 'pickup.chest', true);
    // How many of the Elos the player knows now (PX-11): a collection to fill.
    if (save.elos.length > 0 && !packed)
      line(t.end.elosKnown(save.elos.length, EVOLVED_IDS.length), 14, UI.muted);
    // Achievements: up to three new ones; with none, the one closest to done (the next "one more run").
    const fresh = this.newAchievements;
    if (packed && fresh.length > 1)
      badged(t.end.achievementsFound(fresh.length), 15, UI.gold, 'icon.trophy', true);
    else {
      for (const id of fresh.slice(0, 3)) {
        const a = describeAchievement(id);
        badged(t.end.achievement(a.name, a.reward), 15, UI.gold, 'icon.trophy', true);
      }
      if (fresh.length > 3) line(t.end.moreAchievements(fresh.length - 3), 14, UI.gold);
    }
    const near =
      fresh.length === 0 && level < 3 ? (closestAchievement(save) ?? closestAchievement(save, 0)) : null;
    if (near)
      badged(
        t.end.near(describeAchievement(near.id).name, achievementProgress(near.id, near.value, near.goal)),
        14,
        UI.text,
        'icon.lock',
      );
    // The next goal: the cheapest hero still locked, and only after that the Loja.
    const hero = nextHeroGoal(save);
    if (hero && save.gold >= hero.cost) line(t.end.heroReady(t.characters[hero.id].name), 15, UI.gold, true);
    else if (hero) {
      line(t.end.heroGoal(save.gold, t.characters[hero.id].name, hero.cost - save.gold), 14, UI.text);
      // The bank as a bar toward the hero's price (PX-16): how close the next hero is.
      const bw = Math.min(w, 260);
      const share = Math.min(1, save.gold / hero.cost);
      this.add.rectangle(cx, y, bw, 8, UI.borderOff).setOrigin(0.5, 0).setStrokeStyle(1, UI.border);
      this.add.rectangle(cx - bw / 2, y, Math.max(2, bw * share), 8, UI.goldHex).setOrigin(0, 0);
      y += 16;
    } else {
      // A long-term goal, not a nudge to spend now: how far the most expensive thing in the Loja still is.
      const goal = biggestGoal(save);
      const missing = goal && goal.cost > save.gold ? goal.cost - save.gold : 0;
      if (packed && goal && missing > 0)
        line(t.end.bankedGoal(save.gold, t.shop.items[goal.id], missing), 14, UI.text);
      else {
        line(t.end.banked(save.gold), 14, UI.text);
        if (goal && missing > 0) line(t.end.toBuy(t.shop.items[goal.id], missing), 14, UI.muted);
      }
    }
    return y;
  }

  /** Starts a run with the same hero on `stage` (remembered as the last choice). */
  private play(stage: StageId): void {
    const choice = { character: this.world.character, stage };
    setChoice(this.registry, choice);
    this.scene.start(SCENES.game, choice);
  }

  /** Continuar a vigília: back to the battlefield, which goes on into the Noite Sem Fim. */
  private vigil(): void {
    (this.scene.get(SCENES.game) as GameScene).startVigil();
    this.scene.stop();
  }

  /** The Loja, which offers "Jogar de novo" with this hero and stage when left. */
  private toShop(): void {
    const again = { character: this.world.character, stage: this.world.stageId };
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.shop, { again });
  }

  private toMenu(): void {
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.menu);
  }
}
