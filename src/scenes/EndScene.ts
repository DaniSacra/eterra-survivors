import Phaser from 'phaser';
import { formatTime } from '../core/format';
import { passiveReport, weaponReport } from '../core/report';
import type { World } from '../core/world';
import type { StageId } from '../data/stages';
import { t } from '../i18n/pt-BR';
import { formatCompact, formatDecimal } from '../render/describe';
import { UI, button, dim, label, restartOnResize, bindKeys, keyNav } from '../render/ui';
import { SCENES } from './keys';

/** Game over or victory: the run report (summary, damage per weapon, passives) over the frozen battlefield. */
export class EndScene extends Phaser.Scene {
  private world!: World;
  private unlocked: StageId | null = null;

  constructor() {
    super(SCENES.end);
  }

  init(data: { world: World; unlocked?: StageId | null }): void {
    this.world = data.world;
    this.unlocked = data.unlocked ?? null;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const w = this.world;
    const won = w.state === 'won';
    const pw = Math.min(600, width - 16);
    const left = cx - pw / 2 + 14;
    const right = cx + pw / 2 - 14;
    const small = pw < 460;

    dim(this, 0.82);
    // Laid out from y = 0, then the panel is sized to the content and everything is centred vertically.
    const first = this.children.list.length;
    const panel = this.add
      .rectangle(cx, 0, pw, 10, UI.panel, 0.92)
      .setOrigin(0.5, 0)
      .setStrokeStyle(2, won ? UI.accent : UI.dangerDark);

    let y = 14;
    label(this, cx, y + 18, won ? t.end.won : t.end.lost, small ? 30 : 36, {
      bold: true,
      color: won ? UI.gold : UI.danger,
    });
    y += 46;
    const flavor = won ? t.stages[w.stageId].won : t.end.lostText(t.characters[w.character].name);
    const text = label(this, cx, y, flavor, 15, { wrap: pw - 28 }).setOrigin(0.5, 0);
    y += text.height + 8;
    label(this, cx, y, t.end.run(t.stages[w.stageId].name, t.characters[w.character].name), 15, {
      bold: true,
      color: UI.gold,
    }).setOrigin(0.5, 0);
    y += 30;

    // Summary: 2 x 2 on phones, one row when wide.
    const stats: [string, string][] = [
      [t.end.time, formatTime(w.time)],
      [t.end.kills, String(w.kills)],
      [t.end.level, String(w.level)],
      [t.end.gold, String(w.gold)],
    ];
    const per = small ? 2 : 4;
    const cellW = (right - left) / per;
    stats.forEach(([k, v], i) => {
      const x = left + (i % per) * cellW;
      const yy = y + Math.floor(i / per) * 22;
      label(this, x, yy, k, 14, { color: UI.muted, align: 'left' });
      label(this, x + cellW - 12, yy, v, 14, { bold: true }).setOrigin(1, 0);
    });
    y += Math.ceil(stats.length / per) * 22 + 14;
    this.add.rectangle(cx, y, pw - 28, 1, UI.border).setOrigin(0.5, 0);
    y += 10;

    // Weapons: name · level · damage · time owned · DPS (best DPS highlighted).
    const rows = weaponReport(w);
    const best = Math.max(...rows.map((r) => r.dps));
    const fs = small ? 13 : 14;
    const colW = small ? 50 : 66;
    const xLevel = right - colW * 3.6;
    const xDamage = right - colW * 2;
    const xTime = right - colW;
    const header = (txt: string, x: number) =>
      label(this, x, y, txt, fs, { bold: true, color: UI.gold }).setOrigin(1, 0);
    label(this, left, y, t.end.weapon, fs, { bold: true, color: UI.gold, align: 'left' });
    header(t.end.weaponLevel, xLevel);
    header(t.end.damage, xDamage);
    header(t.end.owned, xTime);
    header(t.end.dps, right);
    y += 22;
    for (const r of rows) {
      const color = r.dps === best && best > 0 ? UI.gold : UI.text;
      label(this, left, y, t.weapons[r.id].name, fs, { align: 'left', color });
      const cell = (txt: string, x: number) => label(this, x, y, txt, fs, { color }).setOrigin(1, 0);
      cell(String(r.level), xLevel);
      cell(formatCompact(r.damage), xDamage);
      cell(formatTime(r.time), xTime);
      cell(formatDecimal(r.dps), right);
      y += 20;
    }
    y += 10;

    // Passives in one wrapped line.
    const passives = passiveReport(w);
    const list = passives.length
      ? passives.map((p) => `${t.passives[p.id]} ${p.level}`).join(' · ')
      : t.end.none;
    const pl = label(this, left, y, `${t.end.passives}: ${list}`, 13, {
      color: UI.muted,
      align: 'left',
      wrap: pw - 28,
    });
    y += pl.height + 12;

    if (this.unlocked) {
      label(this, cx, y, t.end.unlocked(t.stages[this.unlocked].name), 16, {
        bold: true,
        color: UI.gold,
      }).setOrigin(0.5, 0);
      y += 28;
    }

    const bw = (pw - 36) / 2;
    const by = y + 30;
    keyNav(this, [
      button(this, cx - bw / 2 - 4, by, bw, 46, () => this.again(), t.end.again),
      button(this, cx + bw / 2 + 4, by, bw, 46, () => this.toMenu(), t.end.menu),
    ]);
    const total = by + 37;
    panel.setSize(pw, total);
    const offset = Math.max(8, (height - total) / 2);
    for (const obj of this.children.list.slice(first)) (obj as unknown as { y: number }).y += offset;

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.toMenu());
    });
    restartOnResize(this);
  }

  /** Same hero, same stage. */
  private again(): void {
    this.scene.start(SCENES.game, { character: this.world.character, stage: this.world.stageId });
  }

  private toMenu(): void {
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.menu);
  }
}
