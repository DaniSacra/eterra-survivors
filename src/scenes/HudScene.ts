import Phaser from 'phaser';
import { formatTime } from '../core/format';
import type { World } from '../core/world';
import { xpToNext } from '../core/xp';
import { t } from '../i18n/pt-BR';
import { BuildSlots } from '../render/buildPanel';
import { Joystick } from '../render/joystick';
import { ART_SCALE } from '../render/art/pen';
import { ELEMENT_COLOR, SHORT_SCREEN, UI, button, label, safeArea } from '../render/ui';
import { spawnOnRing } from '../core/enemies';
import { segmentAt } from '../core/waves';
import type { AchievementId } from '../data/achievements';
import { describeAchievement } from '../render/describe';
import { sound } from '../render/sound';
import type { GameScene } from './GameScene';
import { SCENES } from './keys';
import { vignetteTexture } from '../render/lighting';
import { EdgeArrows } from '../render/edgeArrows';
import { settings } from '../render/settings';
import { fxSprites } from '../render/fxSprites';
import { EVOLUTIONS, type Evolution } from '../data/evolutions';
import type { WeaponId } from '../data/weapons';

/** One in-run notice: its text, its badge and the colour of its rim (achievements gold, Elos their element). */
interface Toast {
  text: string;
  icon: string;
  rim: number;
  sound: 'achievement' | null;
}

const PAD = 10;
const XP_H = 16;
const HP_H = 16;
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
  /** Segunda Chance left (NU-06): an icon and its count before the gold, only while there is one. */
  private reviveIcon!: Phaser.GameObjects.Image;
  private revives!: Phaser.GameObjects.Text;
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
  /** The achievement notice: one at a time, from a queue, while the game runs. */
  private toastBox!: Phaser.GameObjects.Container;
  private toastBg!: Phaser.GameObjects.Rectangle;
  private toastText!: Phaser.GameObjects.Text;
  private toastQueue: Toast[] = [];
  /** A short tip under the banner (the first Elo ready explains what an Elo is). */
  private hintBox!: Phaser.GameObjects.Container;
  private hintBg!: Phaser.GameObjects.Rectangle;
  private hintText!: Phaser.GameObjects.Text;
  private toastOn = false;
  /** The notice showing now (put back at the head of the queue when an overlay hushes the HUD). */
  private toastNow: Toast | null = null;
  private shown = { time: -1, level: -1, kills: -1, gold: -1, hp: -1, maxHp: -1, revives: -1 };
  /** Safe-area insets, refreshed on layout. */
  private inset = { top: 0, right: 0, bottom: 0, left: 0 };

  constructor() {
    super(SCENES.hud);
  }

  init(data: { world: World }): void {
    this.world = data.world;
    this.shown = { time: -1, level: -1, kills: -1, gold: -1, hp: -1, maxHp: -1, revives: -1 };
    this.shownRev = -1;
    this.toastQueue = [];
    this.toastOn = false;
    this.toastNow = null;
  }

  private vignette!: Phaser.GameObjects.Image;
  /** Arrows on the frame toward chests and elites out of view (NU-01). */
  private arrows!: EdgeArrows;

  create(): void {
    // Under everything on the HUD: the light vignette that frames the game view.
    this.vignette = this.add.image(0, 0, vignetteTexture(this)).setOrigin(0).setDepth(-10);
    this.arrows = new EdgeArrows(this);
    this.bars = this.add.graphics();
    this.timer = label(this, 0, 0, '', 24, { bold: true, stroke: true });
    // The level sits at the tip of the XP bar; gold and kills share one line, each after its icon.
    this.level = label(this, 0, 0, '', 14, { bold: true, color: UI.gold, stroke: true }).setOrigin(1, 0.5);
    this.kills = label(this, 0, 0, '', 15, { bold: true, stroke: true }).setOrigin(1, 0.5);
    this.gold = label(this, 0, 0, '', 15, { bold: true, color: UI.gold, stroke: true }).setOrigin(1, 0.5);
    this.coinIcon = this.add.image(0, 0, 'pickup.gold').setScale(ART_SCALE * 1.25);
    this.skullIcon = this.add.image(0, 0, 'icon.kills').setScale(ART_SCALE * 1.1);
    this.reviveIcon = this.add.image(0, 0, 'icon.revive').setDisplaySize(24, 24).setVisible(false);
    this.revives = label(this, 0, 0, '', 15, { bold: true, color: UI.danger, stroke: true })
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.hpText = label(this, 0, 0, '', 14, { bold: true, stroke: true });
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
    // The achievement notice, built once: a small gold-rimmed strip with a trophy, under the timer.
    this.toastBg = this.add.rectangle(0, 0, 10, 34, UI.panel, 0.92).setStrokeStyle(2, UI.accent);
    this.toastText = label(this, 12, 0, '', 14, { bold: true, color: UI.gold }).setOrigin(0, 0.5);
    const trophy = this.add.image(0, 0, 'icon.trophy').setScale(ART_SCALE * 1.1);
    this.toastBox = this.add.container(0, 0, [this.toastBg, trophy, this.toastText]).setAlpha(0);
    this.hintBg = this.add.rectangle(0, 0, 10, 10, UI.panel, 0.92).setStrokeStyle(2, UI.goldHex);
    this.hintText = label(this, 0, 0, '', 14, { color: UI.text });
    this.hintBox = this.add.container(0, 0, [this.hintBg, this.hintText]).setAlpha(0);
    this.build = new BuildSlots(this);
    this.build.showEmpty = false;
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
    this.vignette.setDisplaySize(width, height);
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
    this.banner.setWordWrapWidth(width - 40).setAlign('center');
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
    this.revives.setPosition(this.coinIcon.x - 17, y);
    this.reviveIcon.setPosition(this.revives.x - this.revives.width - 13, y);
  }

  private hpWidth(): number {
    return Math.min(180, this.scale.width * 0.36);
  }

  /** The level-up panel shows the build itself (with a preview): the strip hides meanwhile. */
  setBuildVisible(visible: boolean): void {
    this.build.container.setVisible(visible);
  }

  /** Queues the in-run notice of an achievement just met. */
  toast(id: AchievementId): void {
    this.toastQueue.push({
      text: `${t.achievements.toast} ${describeAchievement(id).name}`,
      icon: 'icon.trophy',
      rim: UI.accent,
      sound: 'achievement',
    });
  }

  /** An Elo just forged: its notice (rimmed in its element's colour) and the chain forming in the build strip. */
  forged(elo: WeaponId): void {
    const evo = EVOLUTIONS[elo] as Evolution;
    const text = t.elo.forged(t.weapons[elo].name, t.weapons[evo.from].name, t.passives[evo.passive]);
    this.toastQueue.unshift({ text, icon: `icon.${elo}`, rim: ELEMENT_COLOR[evo.element], sound: null });
    this.build.forge(this.world, elo);
  }

  /** Shows the next notice: 2.5 s under the timer (under the boss bar once it shows), never mid-screen. */
  private nextToast(): void {
    const next = this.toastQueue.shift();
    if (!next) return;
    this.toastOn = true;
    this.toastNow = next;
    this.toastText.setText(next.text);
    const w = this.toastText.width + 54;
    this.toastBg.setSize(w, 34).setPosition(0, 0).setStrokeStyle(2, next.rim);
    this.toastBg.setOrigin(0.5);
    const badge = this.toastBox.list[1] as Phaser.GameObjects.Image;
    badge.setTexture(next.icon).setScale(next.icon === 'icon.trophy' ? ART_SCALE * 1.1 : ART_SCALE * 0.9);
    badge.setPosition(-w / 2 + 18, 0);
    this.toastText.setPosition(-w / 2 + 34, 0);
    // Standing: centred under the whole top block (the build strip reaches the middle on phones), or under the
    // boss bar. Lying down there is no height to spare: top right, under the gold and kills, clear of the hero.
    const { width, height } = this.scale;
    const side = height < SHORT_SCREEN && width >= 600;
    const x = side ? width - this.inset.right - PAD - w / 2 : width / 2;
    const y = side ? this.countersBottom + 24 : this.world.boss ? this.bossY + 34 : this.bottom + 26;
    this.toastBox.setPosition(x, y - 8).setAlpha(0);
    if (next.sound) sound.play(next.sound);
    this.tweens.add({ targets: this.toastBox, alpha: 1, y, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.toastBox,
      alpha: 0,
      delay: 2500,
      duration: 300,
      onComplete: () => {
        this.toastOn = false;
        this.toastNow = null;
      },
    });
  }

  /**
   * A choice opened (level-up, pause): the banner, the tip and the notice showing now go away, so the screen is the
   * choice's alone. The notice goes back to the head of the queue and shows again once the run goes on.
   */
  quiet(): void {
    for (const o of [this.banner, this.hintBox, this.toastBox]) {
      this.tweens.killTweensOf(o);
      o.setAlpha(0);
    }
    if (this.toastNow) this.toastQueue.unshift(this.toastNow);
    this.toastNow = null;
    this.toastOn = false;
  }

  /** A tip in a gold-rimmed box under the banner, for a few seconds. */
  hint(text: string): void {
    const { width } = this.scale;
    this.hintText.setText(text).setWordWrapWidth(Math.min(420, width - 56));
    this.hintBg.setSize(this.hintText.width + 24, this.hintText.height + 16);
    this.hintBox.setPosition(width / 2, this.banner.y + 30 + this.hintText.height / 2 + 8).setAlpha(0);
    this.tweens.killTweensOf(this.hintBox);
    this.tweens.add({ targets: this.hintBox, alpha: 1, duration: 250, delay: 400 });
    this.tweens.add({ targets: this.hintBox, alpha: 0, delay: 8000, duration: 500 });
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
    const cam = this.scene.get(SCENES.game).cameras.main;
    this.arrows.update(w, cam, width, this.bottom, this.scale.height - this.inset.bottom, settings().calm);
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
    if (Math.floor(w.gold) !== this.shown.gold || w.kills !== this.shown.kills || w.revives !== this.shown.revives) {
      this.gold.setText(t.hud.gold((this.shown.gold = Math.floor(w.gold))));
      this.kills.setText(t.hud.kills((this.shown.kills = w.kills)));
      const r = (this.shown.revives = w.revives);
      this.revives.setText(t.hud.revives(r)).setVisible(r > 0);
      this.reviveIcon.setVisible(r > 0);
      this.placeCounters();
    }

    // One notice at a time, and none while the level-up (or the pause) holds the game or a banner is up.
    if (
      !this.toastOn &&
      this.toastQueue.length > 0 &&
      w.state === 'playing' &&
      this.banner.alpha === 0 &&
      this.scene.isActive(SCENES.game)
    )
      this.nextToast();

    if (this.debugOn) {
      const d = t.debug;
      this.debug.setText(
        `${d.fps} ${Math.round(this.game.loop.actualFps)}\n` +
          `${w.enemies.size} ${d.enemies}${t.sep}${w.projectiles.size} ${d.projectiles}\n` +
          `${w.gems.size} ${d.gems}${t.sep}${w.damageNumbers.size} ${d.numbers}\n` +
          `${d.seed} ${w.seed}` +
          (import.meta.env.DEV && fxSprites.overflow > 0 ? `\n${d.fxFull} ${fxSprites.overflow}` : ''),
      );
    }
  }
}
