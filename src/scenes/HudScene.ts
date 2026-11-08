import Phaser from 'phaser';
import { formatTime } from '../core/format';
import type { World } from '../core/world';
import { xpToNext } from '../core/xp';
import { t } from '../i18n/pt-BR';
import { Joystick } from '../render/joystick';
import { UI, button, label } from '../render/ui';
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
  private pauseIcon!: Phaser.GameObjects.Text;
  private debugOn = false;
  private shown = { time: -1, level: -1, kills: -1, gold: -1 };

  constructor() {
    super(SCENES.hud);
  }

  init(data: { world: World }): void {
    this.world = data.world;
    this.shown = { time: -1, level: -1, kills: -1, gold: -1 };
  }

  create(): void {
    this.bars = this.add.graphics();
    this.timer = label(this, 0, 0, '', 26, { bold: true });
    this.level = label(this, 0, 0, '', 15, { bold: true }).setOrigin(1, 0);
    this.kills = label(this, 0, 0, '', 15).setOrigin(1, 0);
    this.gold = label(this, 0, 0, '', 15, { color: '#ffd870' }).setOrigin(0, 0);
    this.bossName = label(this, 0, 0, t.hud.boss, 14, { bold: true, color: '#ff8090' }).setVisible(false);
    this.debug = this.add
      .text(PAD, 0, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#9fffa0',
        backgroundColor: '#000000aa',
      })
      .setOrigin(0, 1)
      .setVisible(false);
    this.banner = label(this, 0, 0, '', 24, { bold: true, color: '#ff8090' }).setAlpha(0);
    const game = this.scene.get(SCENES.game) as GameScene;
    this.pauseBtn = button(this, 0, 0, 40, 40, () => game.pauseGame()).setAlpha(0.8);
    this.pauseIcon = label(this, 0, 0, 'II', 18, { bold: true });
    this.joystick = new Joystick(this);
    this.layout();

    const kb = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    kb.on('keydown-F3', () => this.debug.setVisible((this.debugOn = !this.debugOn)));
    kb.on('keydown-F4', () => this.debugOn && this.stress());
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.joystick.destroy();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private layout(): void {
    const { width, height } = this.scale;
    this.timer.setPosition(width / 2, XP_H + PAD + 18);
    this.level.setPosition(width - PAD, XP_H + 6);
    this.kills.setPosition(width - PAD, XP_H + 26);
    this.gold.setPosition(PAD, XP_H + PAD + HP_H + 6);
    this.bossName.setPosition(width / 2, height - 46);
    this.banner.setPosition(width / 2, height * 0.3);
    this.pauseBtn.setPosition(width - PAD - 20, XP_H + 70);
    this.pauseIcon.setPosition(width - PAD - 20, XP_H + 70);
    this.debug.setPosition(PAD, height - PAD);
  }

  /** Big centred message that fades out. Red warns; pass `good` for rewards. */
  announce(text: string, good = false): void {
    this.banner
      .setText(text)
      .setColor(good ? '#ffd870' : '#ff8090')
      .setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 2200, duration: 800 });
  }

  /** Debug only: 100 more enemies to measure performance. */
  private stress(): void {
    const seg = segmentAt(this.world.time);
    for (let i = 0; i < 100; i++)
      spawnOnRing(this.world, this.world.rng.weighted(seg.enemies).id, seg.hpMult);
  }

  override update(): void {
    const w = this.world;
    const p = w.player;
    const { width, height } = this.scale;
    const g = this.bars.clear();

    // XP bar across the top edge.
    g.fillStyle(0x000000, 0.6).fillRect(0, 0, width, XP_H);
    g.fillStyle(0x40c8e8).fillRect(0, 0, (width * w.xp) / xpToNext(w.level), XP_H);

    // HP bar, top-left.
    const hpW = Math.min(180, width * 0.38);
    const hpY = XP_H + PAD;
    g.fillStyle(0x000000, 0.6).fillRect(PAD, hpY, hpW, HP_H);
    g.fillStyle(0xd83a4a).fillRect(PAD, hpY, (hpW * p.hp) / p.stats.maxHp, HP_H);
    g.lineStyle(1, UI.border).strokeRect(PAD, hpY, hpW, HP_H);

    // Boss bar, bottom.
    const boss = w.boss;
    this.bossName.setVisible(!!boss);
    if (boss) {
      const bw = Math.min(420, width - PAD * 4);
      const bx = (width - bw) / 2;
      const by = height - 34;
      g.fillStyle(0x000000, 0.7).fillRect(bx, by, bw, 14);
      g.fillStyle(0xc8323e).fillRect(bx, by, (bw * Math.max(0, boss.hp)) / boss.maxHp, 14);
      g.lineStyle(1, 0xff8090).strokeRect(bx, by, bw, 14);
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
          `${w.enemies.size} ${d.enemies} · ${w.projectiles.size} ${d.projectiles}\n` +
          `${w.gems.size} ${d.gems} · ${w.damageNumbers.size} ${d.numbers}`,
      );
    }
  }
}
