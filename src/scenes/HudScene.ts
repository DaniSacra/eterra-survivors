import Phaser from 'phaser';
import { BossAct, bossAbility } from '../core/bosses';
import type { Enemy } from '../core/enemies';
import { formatTime } from '../core/format';
import type { World } from '../core/world';
import { xpToNext } from '../core/xp';
import { PixelBar } from '../render/bars';
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
import { LowHpFrame } from '../render/lowHp';
import { EdgeArrows } from '../render/edgeArrows';
import { settings } from '../render/settings';
import { fxSprites } from '../render/fxSprites';
import { EVOLUTIONS, type Evolution } from '../data/evolutions';
import type { WeaponId } from '../data/weapons';

/** The icons a chest's roulette spins through before it settles on the prize. */
const ROULETTE_ICONS = [
  'icon.might',
  'pickup.gold',
  'icon.vigor',
  'pickup.food',
  'icon.haste',
  'icon.growth',
  'icon.armor',
];

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

/** Taps on the pause button this soon after the Pausa opened are ignored (a double tap must not open and close it). */
const PAUSE_ARM_MS = 300;
/** Notices wait while life is under this share of the maximum (NB-08). */
const TOAST_MIN_HP = 0.3;
/** Seconds a boss move's name stays under its bar. */
const MOVE_SHOW = 1.2;

/** Screen-space overlay (no camera zoom): bars, counters, joystick and the F3 debug panel. */
export class HudScene extends Phaser.Scene {
  joystick!: Joystick;
  private world!: World;
  /** The dark strip behind the XP bar (drawn on layout, not per frame) and the three pixel bars. */
  private bars!: Phaser.GameObjects.Graphics;
  private xpBar!: PixelBar;
  private hpBar!: PixelBar;
  private bossBar!: PixelBar;
  private timer!: Phaser.GameObjects.Text;
  private level!: Phaser.GameObjects.Text;
  private kills!: Phaser.GameObjects.Text;
  private gold!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  /** The boss move being wound up, under its bar: shown for `MOVE_SHOW` s from the windup's start (CU-03). */
  private bossMove!: Phaser.GameObjects.Text;
  private moveUntil = 0;
  private moveIdx = -1;
  private debug!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Rectangle;
  private pauseIcon!: Phaser.GameObjects.Graphics;
  /** The "continue" triangle shown in place of the pause bars while the Pausa is open (PU-01). */
  private playIcon!: Phaser.GameObjects.Graphics;
  private pausedAt = 0;
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
  private tipBox!: Phaser.GameObjects.Container;
  private tipBg!: Phaser.GameObjects.Rectangle;
  private tipText!: Phaser.GameObjects.Text;
  private tipIcon!: Phaser.GameObjects.Image;
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
  private lowHp!: LowHpFrame;
  private slowIcon!: Phaser.GameObjects.Image;
  /** Arrows on the frame toward chests and elites out of view (NU-01). */
  private arrows!: EdgeArrows;

  create(): void {
    // Under everything on the HUD: the light vignette that frames the game view.
    this.vignette = this.add.image(0, 0, vignetteTexture(this)).setOrigin(0).setDepth(-10);
    this.lowHp = new LowHpFrame(this);
    this.arrows = new EdgeArrows(this);
    this.bars = this.add.graphics();
    this.xpBar = new PixelBar(this, 'xp');
    this.hpBar = new PixelBar(this, 'hp');
    this.bossBar = new PixelBar(this, 'boss').setVisible(false);
    this.timer = label(this, 0, 0, '', 24, { bold: true, stroke: true });
    // The level sits in the middle of the XP bar, clear of the pause button; gold and kills share one line, each after its icon.
    this.level = label(this, 0, 0, '', 10, { bold: true, color: UI.gold, stroke: true });
    this.kills = label(this, 0, 0, '', 15, { bold: true, stroke: true }).setOrigin(1, 0.5);
    this.gold = label(this, 0, 0, '', 15, { bold: true, color: UI.gold, stroke: true }).setOrigin(1, 0.5);
    this.coinIcon = this.add.image(0, 0, 'pickup.gold').setScale(ART_SCALE);
    this.skullIcon = this.add.image(0, 0, 'icon.kills').setScale(ART_SCALE * 1.1);
    this.reviveIcon = this.add.image(0, 0, 'icon.revive').setDisplaySize(24, 24).setVisible(false);
    this.revives = label(this, 0, 0, '', 15, { bold: true, color: UI.danger, stroke: true })
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.slowIcon = this.add.image(0, 0, 'icon.slow').setScale(ART_SCALE).setVisible(false);
    this.hpText = label(this, 0, 0, '', 14, { bold: true, stroke: true });
    this.bossName = label(this, 0, 0, t.enemies[this.world.stage.boss.id], 15, {
      bold: true,
      color: UI.danger,
      stroke: true,
    }).setVisible(false);
    this.bossMove = label(this, 0, 0, '', 15, { bold: true, color: UI.gold, stroke: true }).setVisible(false);
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
    this.pauseBtn = button(this, 0, 0, PAUSE, PAUSE, () => this.pressPause(game)).setAlpha(0.8);
    // The pause sign, drawn (two bars), centered on its own origin so layout() only moves it.
    this.pauseIcon = this.add
      .graphics()
      .fillStyle(UI.textHex, 1)
      .fillRect(-7, -8, 5, 16)
      .fillRect(2, -8, 5, 16);
    this.playIcon = this.add
      .graphics()
      .fillStyle(UI.textHex, 1)
      .fillTriangle(-6, -9, -6, 9, 8, 0)
      .setVisible(false);
    // The achievement notice, built once: a small gold-rimmed strip with a trophy, under the timer.
    this.toastBg = this.add.rectangle(0, 0, 10, 34, UI.panel, 0.92).setStrokeStyle(2, UI.accent);
    this.toastText = label(this, 12, 0, '', 14, { bold: true, color: UI.gold }).setOrigin(0, 0.5);
    const trophy = this.add.image(0, 0, 'icon.trophy').setScale(ART_SCALE * 1.1);
    this.toastBox = this.add.container(0, 0, [this.toastBg, trophy, this.toastText]).setAlpha(0);
    this.hintBg = this.add.rectangle(0, 0, 10, 10, UI.panel, 0.92).setStrokeStyle(2, UI.goldHex);
    this.hintText = label(this, 0, 0, '', 14, { color: UI.text });
    this.hintBox = this.add.container(0, 0, [this.hintBg, this.hintText]).setAlpha(0);
    // The first-time enemy tip (CU-01): the enemy's sprite and one line, under the banner.
    this.tipBg = this.add.rectangle(0, 0, 10, 10, UI.panel, 0.92).setStrokeStyle(2, UI.goldHex);
    this.tipIcon = this.add.image(0, 0, 'icon.kills');
    this.tipText = label(this, 0, 0, '', 14, { color: UI.text, align: 'left' }).setOrigin(0, 0.5);
    this.tipBox = this.add.container(0, 0, [this.tipBg, this.tipIcon, this.tipText]).setAlpha(0);
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
    this.lowHp.resize(width, height);
    const s = (this.inset = safeArea());
    // The strip behind the XP bar keeps the notch area dark.
    this.bars
      .clear()
      .fillStyle(UI.dim, 0.6)
      .fillRect(0, 0, width, s.top + XP_H);
    this.xpBar.place(0, s.top, width, XP_H);
    this.hpBar.place(s.left + PAD, s.top + XP_H + PAD, this.hpWidth(), HP_H);
    const top = s.top + XP_H;
    const left = s.left + PAD;
    const right = width - s.right - PAD;
    // On the life bar's row, clear of the build strip under it (phones are narrow).
    this.timer.setPosition(width / 2, top + PAD + HP_H / 2 + 2);
    this.level.setPosition(width / 2, s.top + XP_H / 2);
    this.hpText.setPosition(left + this.hpWidth() / 2, top + PAD + HP_H / 2);
    // Pause in the real top-right corner, gold and kills on one line under it.
    const py = top + 8 + PAUSE / 2;
    this.pauseBtn.setPosition(right - PAUSE / 2, py);
    this.pauseIcon.setPosition(right - PAUSE / 2, py);
    this.playIcon.setPosition(right - PAUSE / 2, py);
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
    this.bossMove.setPosition(width / 2, this.bossY + 28);
    const bw = Math.min(420, width - PAD * 4);
    this.bossBar.place((width - bw) / 2, this.bossY, bw, 16);
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
    // The slowness sign sits at the left end of the counters line.
    const first = this.reviveIcon.visible ? this.reviveIcon.x - 24 : this.coinIcon.x - this.gold.width - 22;
    this.slowIcon.setPosition(first, y);
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

  /** The pause button: opens the Pausa, or, with it open, goes back to the run (taps in its first 300 ms are ignored). */
  private pressPause(game: GameScene): void {
    if (!this.scene.isActive(SCENES.pause)) return game.pauseGame();
    if (performance.now() - this.pausedAt < PAUSE_ARM_MS) return;
    this.scene.resume(SCENES.game);
    this.scene.stop(SCENES.pause);
  }

  /** The Pausa opened or closed: the button shows "continue" (a triangle) while it is open. */
  setPaused(on: boolean): void {
    if (on) this.pausedAt = performance.now();
    this.pauseIcon.setVisible(!on);
    this.playIcon.setVisible(on);
  }

  /**
   * A choice opened (level-up, pause): the banner, the tip and the notice showing now go away, so the screen is the
   * choice's alone. The notice goes back to the head of the queue and shows again once the run goes on.
   */
  quiet(): void {
    for (const o of [this.banner, this.hintBox, this.tipBox, this.toastBox]) {
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

  /**
   * CU-03: when the boss starts winding a move up, its name sits under the bar for `MOVE_SHOW` s. The text only changes
   * when the move does (setText re-renders a texture).
   */
  private updateBossMove(w: World, boss: Enemy | null): void {
    if (!boss || boss.act !== BossAct.Windup) {
      if (this.bossMove.visible && (!boss || w.time >= this.moveUntil)) this.bossMove.setVisible(false);
      if (!boss || boss.act === BossAct.Idle) this.moveIdx = -1;
      return;
    }
    const ab = bossAbility(boss);
    const name = ab && t.hud.bossMove[boss.type]?.[ab.kind];
    if (name && this.moveIdx !== boss.abilityIdx) {
      this.moveIdx = boss.abilityIdx;
      this.moveUntil = w.time + MOVE_SHOW;
      this.bossMove.setText(t.hud.ability(name)).setVisible(true);
    }
    if (w.time >= this.moveUntil) this.bossMove.setVisible(false);
  }

  /** Whether a first-time tip may show now: no notice, hint or tip up, and the HUD is live. */
  canTip(): boolean {
    return this.banner.alpha === 0 && this.hintBox.alpha === 0 && this.tipBox.alpha === 0;
  }

  /** The enemy's first-time tip (CU-01): its sprite at 28 px and one line, for 4 s. Does not pause the game. */
  tip(sprite: string, text: string): void {
    const { width } = this.scale;
    const iconH = 28;
    this.tipIcon.setTexture(sprite);
    this.tipIcon.setScale(Math.min(iconH / this.tipIcon.height, iconH / this.tipIcon.width));
    const textW = Math.min(360, width - 56 - 60);
    this.tipText.setText(text).setWordWrapWidth(textW);
    const h = Math.max(iconH, this.tipText.height) + 16;
    const w = textW > this.tipText.width ? this.tipText.width + 60 : textW + 60;
    this.tipBg.setSize(w, h);
    this.tipIcon.setPosition(-w / 2 + 28, 0);
    this.tipText.setPosition(-w / 2 + 50, 0);
    this.tipBox
      .setPosition(width / 2, this.banner.y + Math.max(30, this.banner.height / 2 + 8) + h / 2)
      .setAlpha(0);
    this.tweens.killTweensOf(this.tipBox);
    this.tweens.add({ targets: this.tipBox, alpha: 1, duration: 250 });
    this.tweens.add({ targets: this.tipBox, alpha: 0, delay: 3700, duration: 300 });
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

  /**
   * The first Elo of a player's life as an event (PX-11): the screen darkens, the weapon and the passive fly together,
   * burst into the Elo and its name shows. About 2 s; a tap skips it. The run goes on in slow motion beneath.
   */
  firstForge(elo: WeaponId): void {
    const evo = EVOLUTIONS[elo] as Evolution;
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height * 0.4;
    const color = ELEMENT_COLOR[evo.element];
    const parts: Phaser.GameObjects.GameObject[] = [];
    const veil = this.add.rectangle(cx, height / 2, width, height, 0x05040f, 0).setInteractive();
    parts.push(veil);
    this.tweens.add({ targets: veil, fillAlpha: 0.7, duration: 300 });
    const done = (): void => {
      this.tweens.add({
        targets: parts,
        alpha: 0,
        duration: 250,
        onComplete: () => parts.forEach((o) => o.destroy()),
      });
    };
    veil.once('pointerdown', done);
    const scale = ART_SCALE * 2;
    const weapon = this.add.image(cx - 130, cy, `icon.${evo.from}`).setScale(scale);
    const passive = this.add.image(cx + 130, cy, `icon.${evo.passive}`).setScale(scale);
    parts.push(weapon, passive);
    this.tweens.add({ targets: weapon, x: cx, duration: 700, ease: 'Cubic.easeIn' });
    this.tweens.add({
      targets: passive,
      x: cx,
      duration: 700,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        weapon.destroy();
        passive.destroy();
        const flash = this.add.circle(cx, cy, 20, color, 0.9);
        const star = this.add.image(cx, cy, `icon.${elo}`).setScale(scale * 0.4);
        const name = label(this, cx, cy + 70, t.elo.firstForge(t.weapons[elo].name), 24, {
          bold: true,
          color: UI.gold,
          stroke: true,
          wrap: width - 40,
        }).setAlpha(0);
        const sub = label(this, cx, cy + 110, t.elo.firstForgeSub, 15, {
          color: UI.text,
          wrap: width - 40,
        }).setAlpha(0);
        parts.push(flash, star, name, sub);
        this.tweens.add({ targets: flash, scale: 9, alpha: 0, duration: 500 });
        this.tweens.add({ targets: star, scale: scale * 1.5, duration: 450, ease: 'Back.easeOut' });
        this.tweens.add({ targets: [name, sub], alpha: 1, duration: 300, delay: 250 });
        this.time.delayedCall(1700, done);
      },
    });
  }

  /**
   * An elite's chest opens with a short roulette (PX-11 style party, PX-13): icons spin in a gold-rimmed box and settle
   * on the prize the core already decided (`final`). 1.1 s at most; a tap on the box skips it. Purely a show.
   */
  chestRoulette(final: string): void {
    const { width } = this.scale;
    const cx = width / 2;
    const cy = this.banner.y + 90;
    const box = this.add
      .rectangle(cx, cy, 84, 84, 0x05040f, 0.9)
      .setStrokeStyle(3, UI.accent)
      .setInteractive();
    const icon = this.add.image(cx, cy, ROULETTE_ICONS[0] as string).setScale(ART_SCALE * 1.6);
    const parts: Phaser.GameObjects.GameObject[] = [box, icon];
    let step = 0;
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      spin.remove();
      icon.setTexture(final).setScale(ART_SCALE * 2.2);
      const ring = this.add.circle(cx, cy, 30, UI.accent, 0.6);
      parts.push(ring);
      this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 400 });
      this.tweens.add({ targets: icon, scale: ART_SCALE * 1.8, duration: 250, ease: 'Back.easeOut' });
      this.tweens.add({
        targets: parts,
        alpha: 0,
        delay: 450,
        duration: 250,
        onComplete: () => parts.forEach((o) => o.destroy()),
      });
    };
    const spin = this.time.addEvent({
      delay: 70,
      repeat: 9,
      callback: () => {
        step++;
        icon.setTexture(ROULETTE_ICONS[step % ROULETTE_ICONS.length] as string);
        if (step >= 10) finish();
      },
    });
    box.once('pointerdown', finish);
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
    // No arrows over a choice (level-up, pause, end): the screen is the choice's alone.
    if (w.state === 'playing' && this.scene.isActive(SCENES.game))
      this.arrows.update(w, cam, width, this.bottom, this.scale.height - this.inset.bottom, settings().calm);
    else this.arrows.hide();
    this.xpBar.set(w.xp / xpToNext(w.level));
    this.hpBar.set(p.hp / p.stats.maxHp);
    this.lowHp.update(p.hp / p.stats.maxHp, w.time, settings().calm);
    this.slowIcon.setVisible(w.slowed);
    const hp = Math.ceil(p.hp);
    if (hp !== this.shown.hp || p.stats.maxHp !== this.shown.maxHp)
      this.hpText.setText(t.hud.hp((this.shown.hp = hp), (this.shown.maxHp = p.stats.maxHp)));

    // Boss bar, top, under the build strip.
    const boss = w.boss;
    this.bossName.setVisible(!!boss);
    this.bossBar.setVisible(!!boss);
    if (boss) this.bossBar.set(Math.max(0, boss.hp) / boss.maxHp);
    this.updateBossMove(w, boss);

    if (w.buildRev !== this.shownRev) {
      this.shownRev = w.buildRev;
      this.build.refresh(w);
    }

    // Texts only change when their value does (setText re-renders a texture).
    const sec = Math.floor(w.time);
    if (sec !== this.shown.time) this.timer.setText(formatTime((this.shown.time = sec)));
    if (w.level !== this.shown.level) this.level.setText(t.hud.level((this.shown.level = w.level)));
    if (
      Math.floor(w.gold) !== this.shown.gold ||
      w.kills !== this.shown.kills ||
      w.revives !== this.shown.revives
    ) {
      this.gold.setText(t.hud.gold((this.shown.gold = Math.floor(w.gold))));
      this.kills.setText(t.hud.kills((this.shown.kills = w.kills)));
      const r = (this.shown.revives = w.revives);
      this.revives.setText(t.hud.revives(r)).setVisible(r > 0);
      this.reviveIcon.setVisible(r > 0);
      this.placeCounters();
    }

    // One notice at a time, and none while the level-up (or the pause) holds the game, a banner is up, a boss lives or life is low.
    if (
      !this.toastOn &&
      this.toastQueue.length > 0 &&
      w.state === 'playing' &&
      this.banner.alpha === 0 &&
      !w.boss &&
      p.hp >= p.stats.maxHp * TOAST_MIN_HP &&
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
