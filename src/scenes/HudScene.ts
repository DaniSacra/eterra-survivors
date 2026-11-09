import Phaser from 'phaser';
import { formatTime } from '../core/format';
import type { World } from '../core/world';
import { xpToNext } from '../core/xp';
import { t } from '../i18n/pt-BR';
import { BuildSlots } from '../render/buildPanel';
import { Joystick } from '../render/joystick';
import { ART_SCALE } from '../render/art/pen';
import { UI, button, label, safeArea } from '../render/ui';
import { spawnOnRing } from '../core/enemies';
import { segmentAt } from '../core/waves';
import type { GameScene } from './GameScene';
import { SCENES } from './keys';

const PAD = 10;
const XP_H = 14;
const HP_H = 12;
/** Pause button side: a full touch target. */
const PAUSE = 44;

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
  private coinIcon!: Phaser.GameObjects.Image;
  private skullIcon!: Phaser.GameObjects.Image;
  /** Where the boss bar goes (under the build strip), set by layout(). */
  private bossY = 0;
  /** The build strip (weapons and passives with level pips), redrawn only when `world.buildRev` changes. */
  private build!: BuildSlots;
  private shownRev = -1;
  private counterY = 0;
  /** Lowest y of the HUD's top block (bars, counters, build strip): overlays keep their content below it. */
  bottom = 0;
  /** Bottom of the life bar row, bottom of the gold and kills line, right edge of the build strip. */
  barsBottom = 0;
  countersBottom = 0;
  stripRight = 0;
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
    this.shownRev = -1;
  }

  create(): void {
    this.bars = this.add.graphics();
    this.timer = label(this, 0, 0, '', 24, { bold: true, stroke: true });
    // The level sits at the tip of the XP bar; gold and kills share one line, each after its icon.
    this.level = label(this, 0, 0, '', 12, { bold: true, color: UI.gold, stroke: true }).setOrigin(1, 0.5);
    this.kills = label(this, 0, 0, '', 15, { bold: true, stroke: true }).setOrigin(1, 0.5);
    this.gold = label(this, 0, 0, '', 15, { bold: true, color: UI.gold, stroke: true }).setOrigin(1, 0.5);
    this.coinIcon = this.add.image(0, 0, 'pickup.gold').setScale(ART_SCALE * 1.25);
    this.skullIcon = this.add.image(0, 0, 'icon.kills').setScale(ART_SCALE * 1.1);
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
    this.pauseBtn = button(this, 0, 0, PAUSE, PAUSE, () => game.pauseGame()).setAlpha(0.8);
    // The pause sign, drawn (two bars), centered on its own origin so layout() only moves it.
    this.pauseIcon = this.add
      .graphics()
      .fillStyle(UI.textHex, 1)
      .fillRect(-7, -8, 5, 16)
      .fillRect(2, -8, 5, 16);
    this.build = new BuildSlots(this);
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
    // On the life bar's row, clear of the build strip under it (phones are narrow).
    this.timer.setPosition(width / 2, top + PAD + HP_H / 2 + 2);
    this.level.setPosition(right - 2, s.top + XP_H / 2 + 1);
    this.hpText.setPosition(left + this.hpWidth() / 2, top + PAD + HP_H / 2);
    // Pause in the real top-right corner, gold and kills on one line under it.
    const py = top + 8 + PAUSE / 2;
    this.pauseBtn.setPosition(right - PAUSE / 2, py);
    this.pauseIcon.setPosition(right - PAUSE / 2, py);
    this.counterY = py + PAUSE / 2 + 14;
    this.placeCounters();
    // The build strip under the life bar; roomy screens get bigger slots (a new size means a redraw).
    const stripY = top + PAD + HP_H + 10;
    this.build.setSize(width >= 700 && height >= 600 ? 28 : 24);
    this.build.container.setPosition(left, stripY);
    this.shownRev = -1;
    // The boss bar under the strip, far from the thumb.
    this.barsBottom = stripY - 2;
    this.countersBottom = this.counterY + 10;
    this.stripRight = left + this.build.width;
    this.bottom = Math.max(stripY + this.build.height, this.countersBottom);
    this.bossY = this.bottom + 26;
    this.bossName.setPosition(width / 2, this.bossY - 13);
    this.banner.setPosition(width / 2, Math.max(height * 0.3, this.bossY + 48));
    this.debug.setPosition(left, height - s.bottom - PAD);
  }

  /** Right-aligned "coin 34  skull 212"; called when a value (and so a width) changes. */
  private placeCounters(): void {
    const right = this.scale.width - this.inset.right - PAD;
    const y = this.counterY;
    this.kills.setPosition(right, y);
    this.skullIcon.setPosition(right - this.kills.width - 11, y);
    this.gold.setPosition(right - this.kills.width - 28, y);
    this.coinIcon.setPosition(this.gold.x - this.gold.width - 11, y);
  }

  private hpWidth(): number {
    return Math.min(180, this.scale.width * 0.36);
  }

  /** The level-up panel shows the build itself (with a preview): the strip hides meanwhile. */
  setBuildVisible(visible: boolean): void {
    this.build.container.setVisible(visible);
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
    const { width } = this.scale;
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

    // Boss bar, top, under the build strip.
    const boss = w.boss;
    this.bossName.setVisible(!!boss);
    if (boss) {
      const bw = Math.min(420, width - PAD * 4);
      const bx = (width - bw) / 2;
      const by = this.bossY;
      g.fillStyle(UI.dim, 0.7).fillRect(bx, by, bw, 14);
      g.fillStyle(UI.hp).fillRect(bx, by, (bw * Math.max(0, boss.hp)) / boss.maxHp, 14);
      g.lineStyle(1, UI.dangerHex).strokeRect(bx, by, bw, 14);
    }

    if (w.buildRev !== this.shownRev) {
      this.shownRev = w.buildRev;
      this.build.refresh(w);
    }

    // Texts only change when their value does (setText re-renders a texture).
    const sec = Math.floor(w.time);
    if (sec !== this.shown.time) this.timer.setText(formatTime((this.shown.time = sec)));
    if (w.level !== this.shown.level) this.level.setText(t.hud.level((this.shown.level = w.level)));
    if (w.gold !== this.shown.gold || w.kills !== this.shown.kills) {
      this.gold.setText(t.hud.gold((this.shown.gold = w.gold)));
      this.kills.setText(t.hud.kills((this.shown.kills = w.kills)));
      this.placeCounters();
    }

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
