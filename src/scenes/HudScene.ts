import Phaser from 'phaser';
import { formatTime } from '../core/format';
import type { World } from '../core/world';
import { xpToNext } from '../core/xp';
import { t } from '../i18n/pt-BR';
import { Joystick } from '../render/joystick';
import { UI, button, label, safeArea } from '../render/ui';
import { spawnOnRing } from '../core/enemies';
import { segmentAt } from '../core/waves';
import type { GameScene } from './GameScene';
import { SCENES } from './keys';

const PAD = 10;
const XP_H = 10;
const HP_H = 12;

/** Screen-space overlay (no camera zoom): bars, counters, joystick and the F3 debug panel. */
export class HudScene extends Phaser.Scene {
  joystick!: Joystick;
  private world!: World;
  private bars!: Phaser.GameObjects.Graphics;
  private timer!: Phaser.GameObjects.Text;
  private level!: Phaser.GameObjects.Text;
  private kills!: Phaser.GameObjects.Text;
  private gold!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private debug!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Rectangle;
  private pauseIcon!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private debugOn = false;
  private shown = { time: -1, level: -1, kills: -1, gold: -1, hp: -1, maxHp: -1 };
  /** Safe-area insets, refreshed on layout. */
  private inset = { top: 0, right: 0, bottom: 0, left: 0 };

  constructor() {
    super(SCENES.hud);
  }

  init(data: { world: World }): void {
    this.world = data.world;
    this.shown = { time: -1, level: -1, kills: -1, gold: -1, hp: -1, maxHp: -1 };
  }

  create(): void {
    this.bars = this.add.graphics();
    this.timer = label(this, 0, 0, '', 26, { bold: true, stroke: true });
    this.level = label(this, 0, 0, '', 15, { bold: true, stroke: true }).setOrigin(1, 0);
    this.kills = label(this, 0, 0, '', 15, { stroke: true }).setOrigin(1, 0);
    this.gold = label(this, 0, 0, '', 15, { color: UI.gold, stroke: true }).setOrigin(0, 0);
    this.hpText = label(this, 0, 0, '', 12, { bold: true, stroke: true });
    this.bossName = label(this, 0, 0, t.enemies[this.world.stage.boss.id], 15, {
      bold: true,
      color: UI.danger,
      stroke: true,
    }).setVisible(false);
    this.debug = this.add
      .text(PAD, 0, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: UI.debug,
        backgroundColor: UI.debugBg,
      })
      .setOrigin(0, 1)
      .setVisible(false);
    this.banner = label(this, 0, 0, '', 24, { bold: true, color: UI.danger, stroke: true }).setAlpha(0);
    const game = this.scene.get(SCENES.game) as GameScene;
    this.pauseBtn = button(this, 0, 0, 40, 40, () => game.pauseGame()).setAlpha(0.8);
    // The pause sign, drawn (two bars), centered on its own origin so layout() only moves it.
    this.pauseIcon = this.add
      .graphics()
      .fillStyle(UI.textHex, 1)
      .fillRect(-7, -8, 5, 16)
      .fillRect(2, -8, 5, 16);
    this.joystick = new Joystick(this);
    this.layout();

    const kb = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    kb.on('keydown-F3', () => this.debug.setVisible((this.debugOn = !this.debugOn)));
    // Stress test: dev builds only (it would let players farm XP on the live game).
    if (import.meta.env.DEV) kb.on('keydown-F4', () => this.debugOn && this.stress());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.joystick.destroy();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private layout(): void {
    const { width, height } = this.scale;
    const s = (this.inset = safeArea());
    const top = s.top + XP_H;
    const left = s.left + PAD;
    const right = width - s.right - PAD;
    this.timer.setPosition(width / 2, top + PAD + 18);
    this.level.setPosition(right, top + 6);
    this.kills.setPosition(right, top + 26);
    this.hpText.setPosition(left + this.hpWidth() / 2, top + PAD + HP_H / 2);
    this.gold.setPosition(left, top + PAD + HP_H + 6);
    this.bossName.setPosition(width / 2, height - s.bottom - 58);
    this.banner.setPosition(width / 2, height * 0.3);
    this.pauseBtn.setPosition(right - 20, top + 70);
    this.pauseIcon.setPosition(right - 20, top + 70);
    this.debug.setPosition(left, height - s.bottom - PAD);
  }

  private hpWidth(): number {
    return Math.min(180, this.scale.width * 0.38);
  }

  /** Big centred message that fades out. Red warns; pass `good` for rewards. */
  announce(text: string, good = false): void {
    this.banner
      .setText(text)
      .setColor(good ? UI.gold : UI.danger)
      .setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 2200, duration: 800 });
  }

  /** Debug only: 100 more enemies to measure performance. */
  private stress(): void {
    const seg = segmentAt(this.world.time, this.world.stage.waves);
    for (let i = 0; i < 100; i++)
      spawnOnRing(this.world, this.world.rng.weighted(seg.enemies).id, seg.hpMult);
  }

  override update(): void {
    const w = this.world;
    const p = w.player;
    const { width, height } = this.scale;
    const g = this.bars.clear();

    const s = this.inset;
    // XP bar across the top edge (under the notch, the strip above it stays dark).
    g.fillStyle(UI.dim, 0.6).fillRect(0, 0, width, s.top + XP_H);
    g.fillStyle(UI.xp).fillRect(0, s.top, (width * w.xp) / xpToNext(w.level), XP_H);

    // HP bar, top-left, with the number on it.
    const hpW = this.hpWidth();
    const hpX = s.left + PAD;
    const hpY = s.top + XP_H + PAD;
    g.fillStyle(UI.dim, 0.6).fillRect(hpX, hpY, hpW, HP_H);
    g.fillStyle(UI.hp).fillRect(hpX, hpY, (hpW * p.hp) / p.stats.maxHp, HP_H);
    g.lineStyle(1, UI.border).strokeRect(hpX, hpY, hpW, HP_H);
    const hp = Math.ceil(p.hp);
    if (hp !== this.shown.hp || p.stats.maxHp !== this.shown.maxHp)
      this.hpText.setText(t.hud.hp((this.shown.hp = hp), (this.shown.maxHp = p.stats.maxHp)));

    // Boss bar, bottom.
    const boss = w.boss;
    this.bossName.setVisible(!!boss);
    if (boss) {
      const bw = Math.min(420, width - PAD * 4);
      const bx = (width - bw) / 2;
      const by = height - s.bottom - 40;
      g.fillStyle(UI.dim, 0.7).fillRect(bx, by, bw, 14);
      g.fillStyle(UI.hp).fillRect(bx, by, (bw * Math.max(0, boss.hp)) / boss.maxHp, 14);
      g.lineStyle(1, UI.dangerHex).strokeRect(bx, by, bw, 14);
    }

    // Texts only change when their value does (setText re-renders a texture).
    const sec = Math.floor(w.time);
    if (sec !== this.shown.time) this.timer.setText(formatTime((this.shown.time = sec)));
    if (w.level !== this.shown.level) this.level.setText(t.hud.level((this.shown.level = w.level)));
    if (w.gold !== this.shown.gold) this.gold.setText(t.hud.gold((this.shown.gold = w.gold)));
    if (w.kills !== this.shown.kills) this.kills.setText(t.hud.kills((this.shown.kills = w.kills)));

    if (this.debugOn) {
      const d = t.debug;
      this.debug.setText(
        `${d.fps} ${Math.round(this.game.loop.actualFps)}\n` +
          `${w.enemies.size} ${d.enemies}${t.sep}${w.projectiles.size} ${d.projectiles}\n` +
          `${w.gems.size} ${d.gems}${t.sep}${w.damageNumbers.size} ${d.numbers}\n` +
          `${d.seed} ${w.seed}`,
      );
    }
  }
}
