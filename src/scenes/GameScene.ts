import Phaser from 'phaser';
import type { DamageNumber } from '../core/effects';
import { BossAct } from '../core/bosses';
import { isFaded } from '../core/behaviours';
import type { Enemy } from '../core/enemies';
import type { Projectile } from '../core/projectiles';
import type { Gem } from '../core/xp';
import type { Pickup } from '../core/pickups';
import { PICKUPS } from '../data/pickups';
import { describeUpgrade } from '../render/describe';
import { shopBonuses, stageUnlocked } from '../core/meta';
import { CHARACTERS } from '../data/characters';
import { STAGE_IDS, type StageId } from '../data/stages';
import { loadSave, recordRun } from '../render/save';
import { lastChoice, type RunChoice } from './SelectScene';
import { World } from '../core/world';
import { isElo } from '../core/weapons';
import type { WeaponId } from '../data/weapons';
import { clamp } from '../core/math';
import { config } from '../data/config';
import { t } from '../i18n/pt-BR';
import { UI } from '../render/ui';
import { Controls } from '../render/controls';
import { DAMAGE_TEXT, HERO_COLOR, TINT, drawFx } from '../render/fx';
import { settings } from '../render/settings';
import { sound } from '../render/sound';
import { Decals } from '../render/decals';
import { Mirror } from '../render/mirror';
import { ART_SCALE } from '../render/art/pen';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

/** Shown instead of the damage numbers when they are turned off. */
const NONE: readonly DamageNumber[] = [];

export class GameScene extends Phaser.Scene {
  world!: World;
  private controls: Controls | null = null;
  private hud!: HudScene;
  private ground!: Phaser.GameObjects.TileSprite;
  private decals!: Decals;
  private playerSprite!: Phaser.GameObjects.Image;
  /** A light silhouette behind the hero: a permanent outline that reads over any crowd. */
  private playerOutline!: Phaser.GameObjects.Image;
  private enemyMirror!: Mirror<Enemy, Phaser.GameObjects.Image>;
  private projectileMirror!: Mirror<Projectile, Phaser.GameObjects.Image>;
  private damageMirror!: Mirror<DamageNumber, Phaser.GameObjects.Text>;
  private gemMirror!: Mirror<Gem, Phaser.GameObjects.Image>;
  private pickupMirror!: Mirror<Pickup, Phaser.GameObjects.Image>;
  private fx!: Phaser.GameObjects.Graphics;
  private fxTop!: Phaser.GameObjects.Graphics;
  private banked = false;
  /** Elos this run formed for the first time ever (shown on the end screen). */
  private newElos: WeaponId[] = [];
  /** world.tally as of the last frame, to turn new attacks, hits, kills and gems into sounds. */
  private heard = { attacks: 0, hits: 0, gems: 0, kills: 0 };
  /** Gems picked in a row (each chime a bit higher), and when the last one was. */
  private gemStreak = 0;
  private lastGem = 0;
  private choice!: RunChoice;

  constructor() {
    super(SCENES.game);
  }

  init(data: Partial<RunChoice>): void {
    this.choice = { ...lastChoice(this.registry), ...data };
  }

  create(): void {
    // The scene instance is reused by "play again": nothing may leak from the last run.
    this.controls = null;
    this.gemStreak = 0;
    this.lastGem = -1;
    this.world = new World(undefined, { ...this.choice, bonuses: shopBonuses(loadSave()) });
    this.banked = false;
    this.heard = { attacks: 0, hits: 0, gems: 0, kills: 0 };
    this.ground = this.add.tileSprite(0, 0, 1, 1, this.world.stage.tile).setOrigin(0);
    this.decals = new Decals(this, this.world.stageId);
    this.gemMirror = new Mirror(
      () => this.add.image(0, 0, 'gem.small').setDepth(3).setScale(ART_SCALE),
      (img, g) => {
        const key = (config.gems.tiers.find((tier) => g.value >= tier.min) ?? config.gems.tiers[0]).sprite;
        if (img.texture.key !== key) img.setTexture(key);
        img.setPosition(g.x, g.y);
      },
    );
    this.pickupMirror = new Mirror(
      () => this.add.image(0, 0, 'pickup.chest').setDepth(3).setScale(ART_SCALE),
      (img, it) => {
        const key = PICKUPS[it.type].sprite;
        if (img.texture.key !== key) img.setTexture(key);
        // Items on the ground float a little.
        img.setPosition(it.x, it.y - 2 + Math.sin(this.world.time * 4 + it.x) * 2);
      },
    );
    this.fx = this.add.graphics().setDepth(4);
    this.fxTop = this.add.graphics().setDepth(11);
    const heroSprite = CHARACTERS[this.world.character].sprite;
    // Above enemies and effects, with a thick outline in the hero's own color.
    this.playerOutline = this.add
      .image(0, 0, heroSprite)
      .setDepth(13)
      .setTintFill(HERO_COLOR[this.world.character]);
    this.playerSprite = this.add.image(0, 0, heroSprite).setDepth(13.1).setScale(ART_SCALE);
    this.projectileMirror = new Mirror(
      () => this.add.image(0, 0, 'proj.elunLight').setDepth(12).setScale(ART_SCALE),
      (img, p) => {
        if (img.texture.key !== p.sprite) img.setTexture(p.sprite);
        img.setPosition(p.x, p.y).setRotation(p.angle);
      },
    );
    this.damageMirror = new Mirror(
      () =>
        this.add
          .text(0, 0, '', {
            fontFamily: UI.font,
            fontSize: '13px',
            fontStyle: 'bold',
            color: DAMAGE_TEXT.color,
          })
          .setStroke(DAMAGE_TEXT.stroke, 3)
          .setOrigin(0.5)
          .setDepth(12.5), // under the hero (13), over everything else
      (txt, d) => {
        const v = String(Math.round(d.value));
        if (txt.text !== v) txt.setText(v);
        const color = d.strong ? DAMAGE_TEXT.strong : DAMAGE_TEXT.color;
        if (txt.style.color !== color) txt.setColor(color);
        txt
          .setPosition(d.x, d.y)
          .setScale(d.strong ? 1.35 : 1)
          .setAlpha(Math.min(1, d.ttl * 4));
      },
    );
    this.enemyMirror = new Mirror(
      () => this.add.image(0, 0, 'enemy.skeleton').setDepth(5),
      (img, e) => {
        const w = this.world;
        if (img.texture.key !== e.def.sprite) img.setTexture(e.def.sprite);
        // Cartoon life: squash and stretch while walking (each enemy out of phase), face the player,
        // wobble when hit. Frozen enemies stand still.
        const a = w.freeze > 0 ? 0 : Math.sin(w.time * 9 + e.uid * 1.7) * 0.06;
        img
          .setPosition(e.x, e.y)
          .setScale(ART_SCALE * (1 + a), ART_SCALE * (1 - a))
          .setFlipX(w.player.x < e.x)
          .setRotation(
            e.act === BossAct.Windup
              ? Math.sin(w.time * 18) * 0.18 // a boss winding up shakes, rings or crouches: the cue
              : e.flash > 0
                ? Math.sin(w.time * 70) * 0.15
                : 0,
          );
        if (e.flash > 0) img.setTint(TINT.hit);
        else if (this.world.freeze > 0) img.setTint(TINT.frozen);
        else if (e.slow > 0) img.setTint(TINT.slowed);
        else img.clearTint();
        img.setAlpha(isFaded(e) ? 0.3 : 1); // a fading ghost: harmless and untouchable for a moment
      },
    );

    this.scene.launch(SCENES.hud, { world: this.world });
    const hud = (this.hud = this.scene.get(SCENES.hud) as HudScene);
    hud.events.once(Phaser.Scenes.Events.CREATE, () => (this.controls = new Controls(this, hud.joystick)));

    const kb = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    kb.on('keydown-ESC', this.pauseGame, this);
    kb.on('keydown-P', this.pauseGame, this);
    // Space too; holding it must not reopen the pause right after resuming.
    kb.on('keydown-SPACE', (e: KeyboardEvent) => e.repeat || this.pauseGame());
    // Phones: switching apps or locking the screen pauses the run.
    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseGame, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.bank();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseGame, this);
      for (const k of [SCENES.hud, SCENES.levelUp, SCENES.pause, SCENES.end]) this.scene.stop(k);
    });
    this.fitCamera();
    this.cameras.main.fadeIn(150);
  }

  /** Camera shake and flash, both skipped with the calm-screen option. */
  private shake(ms: number, intensity: number): void {
    if (!settings().calm) this.cameras.main.shake(ms, intensity);
  }

  private flash(ms: number, r: number, g: number, b: number): void {
    if (!settings().calm) this.cameras.main.flash(ms, r, g, b);
  }

  /** Zoom so the shortest screen side always shows `minWorldSide` world pixels (portrait-friendly). */
  private fitCamera(): void {
    const { width, height } = this.scale;
    const zoom = clamp(Math.min(width, height) / config.view.minWorldSide, 0.5, 4);
    this.cameras.main.setZoom(zoom);
    this.world.setView(width / zoom, height / zoom);
  }

  override update(_time: number, delta: number): void {
    if (!this.controls) return;
    const w = this.world;
    this.hud.joystick.setEnabled(w.state === 'playing');
    w.step(delta / 1000, this.controls.read());

    const cam = this.cameras.main;
    cam.centerOn(w.player.x, w.player.y);
    // The hero bounces while walking and turns to where it goes.
    const step = w.player.moving ? Math.abs(Math.sin(w.time * 12)) : 0;
    const sx = ART_SCALE * (1 + step * 0.05);
    const sy = ART_SCALE * (1 - step * 0.05);
    this.playerSprite.setPosition(w.player.x, w.player.y - step * 2.5).setScale(sx, sy);
    // Hurt (invulnerable): the outline blinks white instead of the hero fading into the crowd.
    const blink = w.player.iframes > 0 && Math.sin(w.time * 40) > 0;
    this.playerOutline
      .setPosition(w.player.x, w.player.y - step * 2.5 + 1)
      .setScale(sx * 1.22, sy * 1.16)
      .setTintFill(blink ? TINT.blink : HERO_COLOR[w.character]);
    if (w.player.facing.x !== 0) {
      this.playerSprite.setFlipX(w.player.facing.x < 0);
      this.playerOutline.setFlipX(w.player.facing.x < 0);
    }
    this.gemMirror.sync(w.gems.active);
    this.pickupMirror.sync(w.pickups.active);
    this.enemyMirror.sync(w.enemies.active);
    this.projectileMirror.sync(w.projectiles.active);
    this.damageMirror.sync(settings().damageNumbers ? w.damageNumbers.active : NONE);
    drawFx(this.fx, this.fxTop, w);
    // Infinite ground: a tile sprite that always covers the camera view, scrolled by world position.
    // (computed from the player, since cam.worldView only updates at render time)
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const vx = w.player.x - vw / 2 - 2;
    const vy = w.player.y - vh / 2 - 2;
    this.ground.setPosition(vx, vy).setSize(vw + 4, vh + 4);
    this.ground.setTilePosition(vx, vy);
    this.decals.update(vx, vy, vw, vh);
    this.handleEvents();
    this.frameSounds();
  }

  /** Sounds of frequent things, from the core's running counts (one sound per kind per frame at most). */
  private frameSounds(): void {
    const t = this.world.tally;
    const h = this.heard;
    if (t.attacks > h.attacks) sound.play('attack');
    if (t.kills > h.kills) sound.play('kill');
    else if (t.hits > h.hits) sound.play('hit');
    if (t.gems > h.gems) {
      const now = this.world.time;
      this.gemStreak = now - this.lastGem < 0.4 ? Math.min(this.gemStreak + 1, 12) : 0;
      this.lastGem = now;
      sound.play('gem', 2 ** (this.gemStreak / 12));
    }
    h.attacks = t.attacks;
    h.hits = t.hits;
    h.gems = t.gems;
    h.kills = t.kills;
  }

  /** A golden ring that bursts from the hero when a level is gained. */
  private levelUpPulse(): void {
    const p = this.world.player;
    const ring = this.add.circle(p.x, p.y, 20).setStrokeStyle(4, UI.goldHex).setDepth(11);
    this.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Records the run in the save, once (on death, victory or quitting): its gold, and the stage if won.
   * Returns the stage this victory just unlocked, if any.
   */
  private bank(): StageId | null {
    if (this.banked) return null;
    this.banked = true;
    const w = this.world;
    const won = w.state === 'won';
    const next = STAGE_IDS[STAGE_IDS.indexOf(w.stageId) + 1];
    const opens = won && next !== undefined && !stageUnlocked(loadSave(), next) ? next : null;
    this.newElos = recordRun(
      w.gold,
      won ? w.stageId : null,
      w.weapons.filter((o) => isElo(o.id)).map((o) => o.id),
    );
    return opens;
  }

  /** Only a running match can be paused (not during level-up or after the end). */
  pauseGame(): void {
    if (this.world.state !== 'playing' || !this.scene.isActive()) return;
    this.hud.joystick.setEnabled(false);
    this.scene.pause();
    this.scene.launch(SCENES.pause);
  }

  private handleEvents(): void {
    const w = this.world;
    for (const e of w.events) {
      switch (e.type) {
        case 'levelUp':
          sound.play('levelUp');
          this.levelUpPulse();
          // With level-ups queued, the open LevelUp scene refreshes itself for the next one.
          if (!this.scene.isActive(SCENES.levelUp)) this.scene.launch(SCENES.levelUp, { world: w });
          break;
        case 'playerHit':
          sound.play('hurt');
          this.shake(120, 0.006);
          this.playerSprite.setTintFill(TINT.heroHurt);
          this.time.delayedCall(90, () => this.playerSprite.clearTint());
          break;
        case 'bossSpawned':
          sound.play('boss');
          this.hud.announce(t.bossWarning(t.enemies[w.stage.boss.id]));
          this.shake(400, 0.01);
          break;
        case 'eliteSpawned':
          sound.play('elite');
          this.hud.announce(t.eliteWarning);
          break;
        case 'chest': {
          sound.play('chest');
          const name = describeUpgrade(e.reward).title;
          this.hud.announce(
            e.reward.kind === 'evolution' ? t.chest.evolved(name) : t.chest.gained(name),
            true,
          );
          this.flash(250, 255, 220, 140);
          break;
        }
        case 'pickup':
          if (e.id === 'gold') sound.play('pickup', 1.5);
          if (e.id === 'chest' || e.id === 'gold') break;
          sound.play('pickup');
          this.hud.announce(t.pickups[e.id], true);
          if (e.id === 'bomb') {
            this.flash(200, 255, 240, 200);
            this.shake(300, 0.012);
          } else if (e.id === 'freeze') this.flash(300, 160, 220, 255);
          break;
        case 'won':
        case 'lost': {
          sound.play(e.type);
          const unlocked = this.bank();
          this.time.delayedCall(900, () =>
            this.scene.launch(SCENES.end, { world: w, unlocked, newElos: this.newElos }),
          );
          break;
        }
      }
    }
    w.events.length = 0;
  }
}
