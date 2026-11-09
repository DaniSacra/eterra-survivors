import Phaser from 'phaser';
import type { DamageNumber } from '../core/effects';
import { BossAct } from '../core/bosses';
import { CHARGE, isFaded } from '../core/behaviours';
import type { Enemy } from '../core/enemies';
import type { Projectile } from '../core/projectiles';
import type { Gem } from '../core/xp';
import type { Pickup } from '../core/pickups';
import { PICKUPS } from '../data/pickups';
import { describeUpgrade } from '../render/describe';
import { shopBonuses, stageUnlocked } from '../core/meta';
import { CHARACTERS } from '../data/characters';
import { STAGE_IDS, type StageId } from '../data/stages';
import { loadSave, recordRun, recordVigil } from '../render/save';
import { lastChoice, type RunChoice } from './SelectScene';
import { World } from '../core/world';
import { bankOnEnd, newRunSummary, summarizeRun, type RunSummary } from '../core/records';
import { liveAchievements } from '../core/achievements';
import type { MetaSave } from '../core/meta';
import type { AchievementId } from '../data/achievements';
import { WEAPONS, WEAPON_IDS, type WeaponDef, type WeaponId } from '../data/weapons';
import { clamp } from '../core/math';
import { config } from '../data/config';
import { t } from '../i18n/pt-BR';
import { ELEMENT_COLOR, UI } from '../render/ui';
import { EVOLUTIONS, EVOLVED_IDS, type Evolution } from '../data/evolutions';
import { Controls } from '../render/controls';
import {
  BOSS_PUFF,
  CHEST_SHOW,
  DAMAGE_TEXT,
  ELITE_PUFF,
  HERO_COLOR,
  TINT,
  drawFx,
  newMoments,
} from '../render/fx';
import { HIT_SPARK, SPARK, Sparks } from '../render/sparks';
import { settings } from '../render/settings';
import { sound } from '../render/sound';
import { Decals } from '../render/decals';
import { Obstacles } from '../render/obstacles';
import { Mirror } from '../render/mirror';
import { ART_SCALE } from '../render/art/pen';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

/** How long a hit lasts on an enemy, and the part of it (from the start) shown as a white flash. */
const HIT_FLASH = config.enemies.hitFlash;
const HIT_WHITE = 0.5;

/**
 * Weapons that hit many at once (swings, slams, auras, frost, bursts, chains, ricochets, burning ground): no white
 * flash, or the crowd inside would turn into one white blob; their sparks, the squash and the weapon's own shape
 * show the hit. Only single-target hits (bolts, thrown shots, orbiting blades, homing motes) flash white.
 */
const AREA_HIT = Object.fromEntries(
  WEAPON_IDS.map((id) => {
    const d = WEAPONS[id] as WeaponDef;
    const kind = d.kind === 'aura' || d.kind === 'zone' || d.kind === 'arc' || d.kind === 'slam';
    const blast = d.kind === 'thrown' && d.levels.some((l) => (l.blast ?? 0) > 0);
    return [id, kind || blast || !!(d.split || d.chain || d.ricochet || d.ward || d.ground || d.wave)];
  }),
) as Record<WeaponId, boolean>;

/** Dust and earth kicked up by bosses. */
const DUST = 0xc8bca8;

/** Projectile sprites that spin as they fly, and the one that drops embers. */
const SPIN: Record<string, boolean> = { 'proj.hammer': true, 'proj.forgeFury': true };
/** Each Elo's projectile sprite, tinted with its element's colour. */
const PROJECTILE_TINT: Record<string, number> = Object.fromEntries(
  EVOLVED_IDS.map((id) => [`proj.${id}`, ELEMENT_COLOR[(EVOLUTIONS[id] as Evolution).element]]),
);
/** The Elo forge's slow motion: how long (real ms) and how slow. */
const FORGE_SLOW_MS = 500;
const FORGE_SLOW = 0.25;
const FORGE = 'proj.forgeFury';

/** Sparks a swing throws when it starts: [color, size, count]. */
const SWING_SPARK: Partial<Record<WeaponId, readonly [number, number, number]>> = {
  fury: [0xffd870, 6, 6],
  mace: [0xd8cbb4, 4, 5],
  jointBreaker: [0xffa060, 5, 7],
};

/**
 * The strongest camera shake (fraction of the screen size): the ground reaches this far past the view. Phaser's
 * shake moves the view by up to intensity x side x zoom world px on each axis.
 */
const MAX_SHAKE = 0.02;

/** On the road, how much of the forest past each edge the camera may show (world px). */
const FOREST_SHOWN = 70;

/** Damage numbers: drawn at NUMBER_FONT px, shown NUMBER_WORLD world px tall but never under NUMBER_SCREEN on screen. */
const NUMBER_FONT = 16;
const NUMBER_WORLD = 13;
const NUMBER_SCREEN = 14;

/** An enemy's sprite, with who it showed last frame and whether they were stunned (to catch a crush). */
type EnemyImage = Phaser.GameObjects.Image & { uid?: number; stunned?: boolean };

/** Chance per frame that a bleeding or burning enemy lets a drop fall or an ember rise. */
const DOT_SPARK = 0.06;

/** Shown instead of the damage numbers when they are turned off. */
const NONE: readonly DamageNumber[] = [];

/** A damage number's text object, with the rounded value it shows (so it only converts when that changes). */
type NumberText = Phaser.GameObjects.Text & { shown?: number };

/** Asset key of a gem worth `value` (tiers are highest first). No closure: it runs per gem per frame. */
function gemSprite(value: number): string {
  const tiers = config.gems.tiers;
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i] as (typeof tiers)[number];
    if (value >= tier.min) return tier.sprite;
  }
  return 'gem.small';
}

export class GameScene extends Phaser.Scene {
  world!: World;
  private controls: Controls | null = null;
  private hud!: HudScene;
  private ground!: Phaser.GameObjects.TileSprite;
  private decals!: Decals;
  private playerSprite!: Phaser.GameObjects.Image;
  /** A light silhouette behind the hero: a permanent outline that reads over any crowd. */
  private playerOutline!: Phaser.GameObjects.Image;
  private enemyMirror!: Mirror<Enemy, EnemyImage>;
  private projectileMirror!: Mirror<Projectile, Phaser.GameObjects.Image>;
  private damageMirror!: Mirror<DamageNumber, NumberText>;
  private gemMirror!: Mirror<Gem, Phaser.GameObjects.Image>;
  private pickupMirror!: Mirror<Pickup, Phaser.GameObjects.Image>;
  private fx!: Phaser.GameObjects.Graphics;
  private fxTop!: Phaser.GameObjects.Graphics;
  private banked = false;
  /** The Noite Sem Fim was recorded (it ends once: death or quitting). */
  private vigilBanked = false;
  /** The run as the boss fell, when the player went on into the Noite Sem Fim; and whether it set a record. */
  private vigilBefore: RunSummary | null = null;
  private vigilRecord = false;
  /** Elos this run formed for the first time ever (shown on the end screen). */
  private newElos: WeaponId[] = [];
  private newAchievements: AchievementId[] = [];
  /** The in-run achievement notice: the save as the run began, one reused summary, what was announced. */
  private liveSave!: MetaSave;
  private live = newRunSummary();
  private liveShown = new Set<AchievementId>();
  private nextCheck = 1;
  /** world.tally as of the last frame, to turn new attacks, hits, kills and gems into sounds. */
  private heard = { attacks: 0, hits: 0, gems: 0, kills: 0 };
  /** Gems picked in a row (each chime a bit higher), and when the last one was. */
  private gemStreak = 0;
  private lastGem = 0;
  private choice!: RunChoice;
  /** The calm-screen option, read once per frame. */
  private calm = false;
  /** Real time (ms) until which the Elo forge's slow motion lasts. */
  private slowUntil = 0;
  /** Chest, Badalada and Sopro de Geada moments (drawn by drawFx), and the chest reward's icon rising. */
  private moments = newMoments();
  private rewardIcon!: Phaser.GameObjects.Image;
  /** Hit sparks, death stars and confetti (a fixed pool). */
  private sparks = new Sparks();
  /** Match time last frame: hits and puffs are only new on frames where the world moved. */
  private lastTime = 0;
  private stepDt = 0;
  /** The hero's life last frame, to see a heal. */
  private lastHp = 0;
  /** The boss's ability phase last frame, to catch the moment it lands. */
  private bossAct = 0;
  private obstacles!: Obstacles;
  private forest: Phaser.GameObjects.TileSprite[] = [];
  /** Ground drawn past each side of the view (world px), so a camera shake never shows the world's empty edge. */
  private viewMargin = 24;
  /** Damage numbers' scale, so they never show under 14 px on screen however far the camera zooms out. */
  private numberScale = 1;

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
    this.liveSave = loadSave();
    this.liveShown.clear();
    this.nextCheck = 1;
    this.vigilBefore = null;
    this.vigilRecord = false;
    this.world = new World(Date.now() >>> 0, { ...this.choice, bonuses: shopBonuses(this.liveSave) });
    this.banked = false;
    this.vigilBanked = false;
    this.heard = { attacks: 0, hits: 0, gems: 0, kills: 0 };
    this.ground = this.add.tileSprite(0, 0, 1, 1, this.world.stage.tile).setOrigin(0);
    this.decals = new Decals(this, this.world.stageId);
    this.obstacles = new Obstacles(this, this.world);
    // The road's frozen forest: one strip of pines on each side, over the ground, scrolled like it.
    const layout = this.world.stage.layout;
    this.forest =
      layout.kind === 'corridor'
        ? [0, 1].map((i) =>
            this.add
              .tileSprite(0, 0, 1, 1, 'tile.forest')
              .setOrigin(i === 0 ? 1 : 0, 0)
              .setDepth(4.6),
          )
        : [];
    this.gemMirror = new Mirror(
      () => this.add.image(0, 0, 'gem.small').setDepth(3).setScale(ART_SCALE),
      (img, g) => {
        const key = gemSprite(g.value);
        if (img.texture.key !== key) img.setTexture(key);
        // Gems twinkle (nothing else on screen does), each out of phase; bigger ones twinkle harder.
        const tw = Math.sin(this.world.time * 6 + g.x * 0.37 + g.y * 0.23);
        const amp = key === 'gem.large' ? 0.14 : key === 'gem.small' ? 0.06 : 0.1;
        img
          .setPosition(g.x, g.y)
          .setScale(ART_SCALE * (1 + amp * tw))
          .setAlpha(0.82 + 0.18 * tw * tw);
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
    this.moments = newMoments();
    this.sparks = new Sparks();
    this.lastTime = 0;
    this.lastHp = this.world.player.hp;
    this.bossAct = 0;
    this.rewardIcon = this.add.image(0, 0, 'pickup.chest').setDepth(12.6).setVisible(false);
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
        if (img.texture.key !== p.sprite) {
          img.setTexture(p.sprite);
          // An Elo's projectiles take its element's colour.
          const tint = PROJECTILE_TINT[p.sprite];
          if (tint === undefined) img.clearTint();
          else img.setTint(tint);
        }
        // Hammers spin end over end as they fly.
        img.setPosition(p.x, p.y).setRotation(SPIN[p.sprite] ? this.world.time * 14 : p.angle);
        // Fúria da Forja drops embers behind it.
        if (p.sprite === FORGE && this.stepDt > 0 && this.sparks.rand() < 0.3)
          this.sparks.add(p.x, p.y, 0, 20, 0.4, 5, 0xffa040, SPARK.ember);
      },
    );
    this.damageMirror = new Mirror(
      (): NumberText =>
        this.add
          .text(0, 0, '', {
            fontFamily: UI.font,
            fontSize: `${NUMBER_FONT}px`,
            fontStyle: 'bold',
            color: DAMAGE_TEXT.color,
          })
          .setStroke(DAMAGE_TEXT.stroke, 3)
          .setOrigin(0.5)
          .setDepth(12.5), // under the hero (13), over everything else
      (txt, d) => {
        const v = Math.round(d.value);
        if (txt.shown !== v) txt.setText(String((txt.shown = v)));
        const color = d.strong ? DAMAGE_TEXT.strong : DAMAGE_TEXT.color;
        if (txt.style.color !== color) txt.setColor(color);
        txt
          .setPosition(d.x, d.y)
          .setScale(d.strong ? this.numberScale * 1.3 : this.numberScale)
          .setAlpha(Math.min(1, d.ttl * 4));
      },
    );
    this.enemyMirror = new Mirror(
      (): EnemyImage => this.add.image(0, 0, 'enemy.skeleton').setDepth(5),
      (img, e) => {
        const w = this.world;
        if (img.texture.key !== e.def.sprite) {
          img.setTexture(e.def.sprite);
          // Bosses over their escort and elites over the crowd, so they always show whole.
          img.setDepth(e.def.boss ? 7 : e.def.elite ? 6 : 5);
        }
        // Cartoon life: squash and stretch while walking (each enemy out of phase), face the player,
        // squash when hit. Frozen enemies stand still.
        // Slowed enemies take heavy, slow steps.
        const a = w.freeze > 0 ? 0 : Math.sin(w.time * (e.slow > 0 ? 4 : 9) + e.uid * 1.7) * 0.06;
        // 1 -> 0 after a hit. Bosses are hit all the time: a small squash only, and no white flash (they would
        // stay a white silhouette, like the hurt hero used to be red).
        const hit = (e.flash / HIT_FLASH) * (e.def.boss ? 0.3 : 1);
        // Chargers crouch while winding up and stretch as they burst into the dash.
        let sx = 1 + a + 0.15 * hit;
        let sy = 1 - a - 0.15 * hit;
        if (e.def.move === 'charge') {
          if (e.act === BossAct.Windup) {
            sx += 0.15;
            sy -= 0.2;
          } else if (e.act === BossAct.Active && e.actT > CHARGE.dash - 0.2) {
            sx += 0.15;
            sy -= 0.08;
          }
        }
        img
          .setPosition(e.x, e.y)
          .setScale(ART_SCALE * sx, ART_SCALE * sy)
          .setFlipX(w.player.x < e.x)
          // A boss winding up shakes (rings the bell, raises the sword).
          .setRotation(e.act === BossAct.Windup && e.def.ability ? Math.sin(w.time * 18) * 0.18 : 0);
        if (this.stepDt > 0) {
          if (e.flash === HIT_FLASH) {
            this.sparks.hit(e.x, e.y, e.hitBy, e.def.radius);
            // Quebra-Junta crushing one that was already dizzy.
            if (img.uid === e.uid && img.stunned && e.hitBy && (WEAPONS[e.hitBy] as WeaponDef).crush)
              this.crushSpark(e);
          }
          if (e.dot > 0 && this.sparks.idle && this.sparks.rand() < DOT_SPARK) this.dotSpark(e);
        }
        img.uid = e.uid;
        img.stunned = e.stun > 0;
        // A hit flashes white for a moment (not with the calm screen), then the status tint shows again.
        if (hit > 1 - HIT_WHITE && !this.calm && !(e.hitBy && AREA_HIT[e.hitBy])) img.setTintFill(TINT.hit);
        else if (w.freeze > 0 && (w.freeze > 1 || Math.sin(w.time * 20) > -0.3))
          // Covered in frost (light on top), blinking in the last second before they walk again.
          img.setTint(TINT.frost, TINT.frost, TINT.frozen, TINT.frozen);
        else if (e.slow > 0) img.setTint(TINT.slowed);
        else if (e.dot > 0) img.setTint(e.dotKind === 'bleed' ? TINT.bleed : TINT.burn);
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
      // Quitting from the pause: a Noite Sem Fim records what the vigil brought, a plain run the run.
      const record = bankOnEnd(this.world.endless, this.banked, this.vigilBanked);
      if (record === 'vigil') this.bankVigil();
      else if (record === 'run') this.bank();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseGame, this);
      for (const k of [SCENES.hud, SCENES.levelUp, SCENES.pause, SCENES.end]) this.scene.stop(k);
    });
    this.fitCamera();
    this.cameras.main.fadeIn(150);
  }

  /** Camera shake, skipped with the calm-screen option. */
  private shake(ms: number, intensity: number): void {
    if (!settings().calm) this.cameras.main.shake(ms, intensity);
  }

  /** Zoom so the shortest screen side always shows `minWorldSide` world pixels (portrait-friendly). */
  private fitCamera(): void {
    const { width, height } = this.scale;
    const zoom = clamp(Math.min(width, height) / config.view.minWorldSide, 0.5, 4);
    this.cameras.main.setZoom(zoom);
    this.viewMargin = Math.ceil(MAX_SHAKE * Math.max(width, height) * zoom) + 4;
    this.numberScale = Math.max(NUMBER_WORLD, NUMBER_SCREEN / zoom) / NUMBER_FONT;
    this.world.setView(width / zoom, height / zoom);
    // Also while paused (no update runs): a phone turned on the pause screen must not show a black half.
    this.placeView();
  }

  /**
   * Centers the camera on the hero (on the road, it never shows more than a strip of forest past either edge: on a
   * wide screen the road stays centred) and makes the ground, decals and obstacles cover the view.
   */
  private placeView(): void {
    const w = this.world;
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    let cx = w.player.x;
    const layout = w.stage.layout;
    if (layout.kind === 'corridor') {
      const reach = layout.width / 2 + FOREST_SHOWN - vw / 2;
      cx = reach <= 0 ? 0 : clamp(cx, -reach, reach);
    }
    cam.centerOn(cx, w.player.y);
    // Infinite ground: a tile sprite that always covers the camera view, scrolled by world position.
    // (computed from the player, since cam.worldView only updates at render time)
    const vx = cx - vw / 2 - this.viewMargin;
    const vy = w.player.y - vh / 2 - this.viewMargin;
    const fw = vw + this.viewMargin * 2;
    const fh = vh + this.viewMargin * 2;
    this.ground.setPosition(vx, vy).setSize(fw, fh);
    this.ground.setTilePosition(vx, vy);
    this.decals.update(vx, vy, fw, fh);
    this.obstacles.update(vx, vy, fw, fh);
    if (layout.kind === 'corridor')
      for (let i = 0; i < this.forest.length; i++) {
        const f = this.forest[i] as Phaser.GameObjects.TileSprite;
        const edge = (i === 0 ? -1 : 1) * (layout.width / 2);
        const fwSide = Math.max(1, i === 0 ? edge - vx : vx + fw - edge);
        f.setPosition(edge, vy)
          .setSize(fwSide, fh)
          .setTilePosition(i === 0 ? edge - fwSide : edge, vy);
      }
  }

  override update(_time: number, delta: number): void {
    if (!this.controls) return;
    const w = this.world;
    this.calm = settings().calm;
    this.hud.joystick.setEnabled(w.state === 'playing');
    // The Elo forge runs the world slower for a moment (real time; the sparks keep their own pace).
    const slow = this.time.now < this.slowUntil ? FORGE_SLOW : 1;
    w.step((delta / 1000) * slow, this.controls.read());
    this.stepDt = w.time - this.lastTime;
    this.lastTime = w.time;
    this.sparks.frame(this.calm);
    if (this.stepDt > 0 && w.player.hp > this.lastHp + 0.01) this.healSpark();
    this.lastHp = w.player.hp;
    this.deathSparks();
    this.swingSparks();
    this.boltSparks();
    this.bossMoments();

    this.placeView();
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
    drawFx(this.fx, this.fxTop, w, this.moments);
    // Sparks keep flying after the boss falls (the world stops), but hold still behind the level-up choice.
    if (w.state !== 'levelup') this.sparks.update(delta / 1000);
    this.sparks.draw(this.fxTop);
    this.showReward();
    this.handleEvents();
    this.frameSounds();
    this.checkAchievements();
  }

  /**
   * Once a second of play: achievements this run has just met (the HUD announces them; the real unlock happens
   * when the run is recorded). Refills one summary; allocates only when something is found.
   */
  private checkAchievements(): void {
    const w = this.world;
    if (w.state !== 'playing' || w.time < this.nextCheck) return;
    this.nextCheck = Math.floor(w.time) + 1;
    const found = liveAchievements(this.liveSave, summarizeRun(w, this.live), this.liveShown);
    for (let i = 0; i < found.length; i++) this.hud.toast(found[i] as AchievementId);
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

  /** Stars for each new death; gold confetti for an elite (its chest); rings, stars and a big shake for a boss. */
  private deathSparks(): void {
    if (this.stepDt <= 0) return;
    const fresh = config.effects.puffTtl - this.stepDt - 1e-6;
    const sp = this.sparks;
    const hero = HERO_COLOR[this.world.character];
    for (let iF = 0; iF < this.world.puffs.active.length; iF++) {
      const f = this.world.puffs.active[iF] as (typeof this.world.puffs.active)[number];
      if (f.kind !== 'death' || f.ttl < fresh) continue;
      if (f.r >= BOSS_PUFF) {
        sp.add(f.x, f.y, 0, 0, 0.7, f.r * 4, UI.goldHex, SPARK.ring, true);
        sp.add(f.x, f.y, 0, 0, 0.9, f.r * 6, 0xffffff, SPARK.ring, true);
        sp.add(f.x, f.y, 0, 0, 1.1, f.r * 8, hero, SPARK.ring, true);
        sp.burst(f.x, f.y, 10, 260, 9, 0xffffff, SPARK.star, 0.8);
        sp.burst(f.x, f.y, 8, 200, 7, UI.goldHex, SPARK.confetti, 1.1);
        sp.burst(f.x, f.y, 6, 180, 7, hero, SPARK.confetti, 1.1);
        this.shake(500, 0.02);
      } else if (f.r >= ELITE_PUFF) {
        sp.add(f.x, f.y, 0, 0, 0.5, f.r * 3, UI.goldHex, SPARK.ring, true);
        sp.burst(f.x, f.y - f.r * 0.5, 6, 160, 6, UI.goldHex, SPARK.confetti, 0.9);
        sp.burst(f.x, f.y - f.r * 0.5, 4, 150, 6, 0xffffff, SPARK.confetti, 0.9);
        sp.burst(f.x, f.y - f.r * 0.5, 3, 170, 7, 0xffffff, SPARK.star, 0.5);
      } else if (sp.room)
        sp.burst(f.x, f.y - f.r * 0.3, 2 + (f.poolIndex & 1), 110, 5, 0xffffff, SPARK.star, 0.35, false);
    }
  }

  /** Swings that start this frame kick up their sparks (gold for Fúria); slams shake the ground and throw dust. */
  private swingSparks(): void {
    if (this.stepDt <= 0) return;
    const fx = config.effects;
    const sp = this.sparks;
    const p = this.world.player;
    for (let iS = 0; iS < this.world.slashes.active.length; iS++) {
      const s = this.world.slashes.active[iS] as (typeof this.world.slashes.active)[number];
      const ttl =
        s.form === 'smash'
          ? fx.smashTtl
          : s.form === 'shock'
            ? fx.shockTtl
            : s.form === 'pulse'
              ? fx.pulseTtl
              : fx.slashTtl;
      if (s.ttl < ttl - this.stepDt - 1e-6) continue;
      if (s.form === 'pulse') {
        // Chama de Yah's wave: holy sparks flung out from the hero.
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5;
          sp.add(p.x, p.y, Math.cos(a) * 260, Math.sin(a) * 260, 0.4, 7, ELEMENT_COLOR.holy, SPARK.star);
        }
        continue;
      }
      if (s.form === 'smash' || s.form === 'shock') {
        // Dust kicked up by the blow (no camera shake: weapons never move the screen).
        const spark = SWING_SPARK[s.weapon];
        if (!spark) continue;
        const n = spark[2];
        for (let i = 0; i < n; i++) {
          const a = s.angle + (i - (n - 1) / 2) * (s.form === 'shock' ? 1.2 : 0.45);
          const d = s.shock * (s.form === 'shock' ? 0.5 : 0.8);
          const x = s.x + Math.cos(a) * d;
          const y = s.y + Math.sin(a) * d;
          sp.add(x, y, Math.cos(a) * 90, Math.sin(a) * 90 - 60, 0.4, spark[1], spark[0], SPARK.star);
        }
        continue;
      }
      const spark = SWING_SPARK[s.weapon];
      if (!spark) continue;
      for (let i = 0; i < spark[2]; i++) {
        const a = s.angle - s.arc / 2 + s.arc * ((i + 0.5) / spark[2]);
        const x = p.x + Math.cos(a) * s.range;
        const y = p.y + Math.sin(a) * s.range;
        // Fúria flings its sparks along the turn.
        const out = s.weapon === 'fury' ? a + Math.PI / 2 : a;
        sp.add(x, y, Math.cos(out) * 150, Math.sin(out) * 150, 0.35, spark[1], spark[0], SPARK.star);
      }
    }
  }

  /** Bolts that land this frame: sparks (purple for Lyra's lightning) or embers rising from the fire. */
  private boltSparks(): void {
    if (this.stepDt <= 0) return;
    const fresh = config.effects.boltTtl - this.stepDt - 1e-6;
    const sp = this.sparks;
    for (let iB = 0; iB < this.world.bolts.active.length; iB++) {
      const b = this.world.bolts.active[iB] as (typeof this.world.bolts.active)[number];
      if (b.ttl < fresh) continue;
      const spark = HIT_SPARK[b.weapon];
      if (!spark) continue;
      if (spark[0] === SPARK.ember)
        for (let i = 0; i < 4; i++) {
          const a = sp.rand() * Math.PI * 2;
          const d = b.radius * 0.8 * sp.rand();
          sp.add(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 0, -30, 0.35, 5, spark[1], SPARK.ember);
        }
      else sp.burst(b.x, b.y, 4, 160, 5, spark[1], SPARK.star, 0.25, false);
    }
  }

  /** The boss's ability landing: Corte Brutal shakes the screen and throws dust along its arc. */
  private bossMoments(): void {
    const b = this.world.boss;
    const act = b ? b.act : 0;
    const was = this.bossAct;
    this.bossAct = act;
    const ab = b?.def.ability;
    if (!b || !ab || act === was) return;
    if (was === BossAct.Active && ab.kind === 'lunge') this.lungeDust(b);
    if (was !== BossAct.Windup) return;
    if (ab.kind === 'cleave' && act === BossAct.Active) {
      this.shake(150, 0.008);
      const aim = Math.atan2(b.aimY, b.aimX);
      const half = (ab.arc ?? 1) / 2;
      for (let i = 0; i < 6; i++) {
        const a = aim - half + (half * 2 * (i + 0.5)) / 6;
        const x = b.x + Math.cos(a) * ab.range;
        const y = b.y + Math.sin(a) * ab.range;
        this.sparks.add(x, y, Math.cos(a) * 90, Math.sin(a) * 90 - 30, 0.45, 6, 0xe8e2d0, SPARK.star, true);
      }
    } else if (ab.kind === 'toll') {
      // The dead rise: a puff of earth and bone on each mark.
      const n = ab.count ?? 6;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n;
        const x = b.x + Math.cos(a) * ab.range;
        const y = b.y + Math.sin(a) * ab.range;
        this.sparks.add(x, y, 0, 0, 0.4, 20, DUST, SPARK.ring, true);
        this.sparks.burst(x, y, 2, 70, 5, 0xe8e2d0, SPARK.star, 0.4);
      }
    }
  }

  /** A crush (a slam on a stunned enemy): an amber star bursting on it and a small ring, "that hit harder". */
  private crushSpark(e: Enemy): void {
    const sp = this.sparks;
    const r = e.def.radius;
    sp.add(e.x, e.y, 0, 0, 0.25, r * 2.2, ELEMENT_COLOR.earth, SPARK.ring);
    sp.add(e.x, e.y - r * 0.3, 0, -30, 0.25, 9 + r * 0.3, 0xffffff, SPARK.star);
    sp.burst(e.x, e.y, 3, 120, 5, ELEMENT_COLOR.earth, SPARK.star, 0.3, false);
  }

  /** A bleeding enemy drips emerald drops; a burning one gives off embers. */
  private dotSpark(e: Enemy): void {
    const sp = this.sparks;
    const r = e.def.radius;
    const x = e.x + (sp.rand() - 0.5) * r;
    if (e.dotKind === 'bleed') sp.add(x, e.y + r * 0.2, 0, 20, 0.45, 8, ELEMENT_COLOR.shadow, SPARK.drop);
    else sp.add(x, e.y - r * 0.4, 0, -25, 0.5, 6, ELEMENT_COLOR.fire, SPARK.ember);
  }

  /** The hero healed: red crosses (the life bar's colour) rising from the hero, and the bar glows (drawFx). */
  private healSpark(): void {
    const p = this.world.player;
    const sp = this.sparks;
    this.moments.heal = this.world.time;
    for (let i = 0; i < 2; i++)
      sp.add(
        p.x + (sp.rand() - 0.5) * 40,
        p.y - 18 - sp.rand() * 12,
        0,
        -60,
        0.6,
        7,
        UI.hp,
        SPARK.cross,
        true,
      );
  }

  /** Lobo Velho's lunge ending: dust where it stops. */
  private lungeDust(b: Enemy): void {
    for (let i = 0; i < 5; i++)
      this.sparks.add(
        b.x - b.aimX * 10,
        b.y + b.def.radius * 0.6,
        (i - 2) * 40,
        -20 - (i % 2) * 20,
        0.45,
        6,
        DUST,
        SPARK.star,
        true,
      );
    this.sparks.add(b.x, b.y + b.def.radius * 0.6, 0, 0, 0.4, b.def.radius * 1.6, DUST, SPARK.ring, true);
  }

  /**
   * The Elo forge: half a second of slow motion, the anvil sound, sparks of the element's colour bursting from the
   * hero, the Elo's icon rising over the hero, and the HUD notice with the chain forming in the build strip.
   */
  private forgeMoment(elo: WeaponId): void {
    const w = this.world;
    const p = w.player;
    const color = ELEMENT_COLOR[(EVOLUTIONS[elo] as Evolution).element];
    this.slowUntil = this.time.now + FORGE_SLOW_MS;
    sound.play('forge');
    this.moments.chest = w.time;
    this.moments.elo = true;
    this.rewardIcon.setTexture(`icon.${elo}`);
    const sp = this.sparks;
    sp.add(p.x, p.y, 0, 0, 0.6, 70, color, SPARK.ring, true);
    sp.add(p.x, p.y, 0, 0, 0.8, 110, 0xffffff, SPARK.ring, true);
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2 + sp.rand() * 0.3;
      const v = 160 + sp.rand() * 160;
      sp.add(
        p.x,
        p.y - 8,
        Math.cos(a) * v,
        Math.sin(a) * v - 60,
        0.5 + sp.rand() * 0.3,
        7,
        color,
        SPARK.star,
        true,
      );
    }
    if (!this.calm) this.shake(160, 0.006);
    this.hud.forged(elo);
  }

  /** The chest's reward icon pops out of the hero and floats up, then fades. */
  private showReward(): void {
    const age = this.world.time - this.moments.chest;
    const icon = this.rewardIcon;
    if (age >= CHEST_SHOW) {
      if (icon.visible) icon.setVisible(false);
      return;
    }
    const p = this.world.player;
    const pop = Math.min(1, age / 0.18);
    const s =
      ART_SCALE *
      (this.moments.elo ? 2 : 1.6) *
      (pop < 1 ? pop * 1.25 : 1 + 0.25 * Math.max(0, 1 - (age - 0.18) * 6));
    icon
      .setVisible(true)
      .setPosition(p.x, p.y - 26 - 34 * Math.min(1, age / 0.5))
      .setScale(s)
      .setAlpha(age > CHEST_SHOW - 0.3 ? (CHEST_SHOW - age) / 0.3 : 1);
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
    const recorded = recordRun(summarizeRun(w));
    this.newElos = recorded.elos;
    this.newAchievements = recorded.achievements;
    return opens;
  }

  /** "Continuar a vigília" (from the end screen): the run goes on; what it adds is recorded when it ends. */
  startVigil(): void {
    const w = this.world;
    if (w.state !== 'won' || w.endless) return;
    this.vigilBefore = summarizeRun(w);
    w.continueVigil();
    this.hud.announce(t.vigil.start, true);
    this.hud.hint(t.vigil.hint);
  }

  /** The end of a Noite Sem Fim: records the vigil on top of the victory already banked. */
  private bankVigil(): null {
    if (this.vigilBanked) return null;
    this.vigilBanked = true;
    const w = this.world;
    const save = loadSave();
    const best = save.records[w.character]?.vigil[w.stageId] ?? 0;
    const run = summarizeRun(w);
    this.vigilRecord = Math.floor(run.vigil) > best;
    const recorded = recordVigil(run, this.vigilBefore ?? run);
    this.newElos = recorded.elos;
    this.newAchievements = recorded.achievements;
    return null;
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
          // A red wash (multiplied, so the face stays visible) while the outline blinks white.
          this.playerSprite.setTint(TINT.heroHurt);
          this.time.delayedCall(140, () => this.playerSprite.clearTint());
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
          this.hud.announce(e.reward ? t.chest.gained(describeUpgrade(e.reward).title) : t.chest.plain, true);
          this.moments.chest = w.time;
          this.moments.elo = false;
          this.rewardIcon.setTexture(e.reward ? describeUpgrade(e.reward).icon : 'pickup.chest');
          break;
        }
        case 'eloForged':
          this.forgeMoment(e.elo);
          break;
        case 'pickup':
          if (e.id === 'gold') sound.play('pickup', 1.5);
          if (e.id === 'chest' || e.id === 'gold') break;
          sound.play('pickup');
          this.hud.announce(t.pickups[e.id], true);
          if (e.id === 'bomb') {
            this.moments.bomb = w.time;
            this.shake(300, 0.012);
          } else if (e.id === 'freeze') this.moments.frost = w.time;
          break;
        case 'ward': {
          // Muralha de Valmor took the hit: the plates burst off in a steel ring, sparks fly, a clang.
          sound.play('ward');
          const p = w.player;
          this.sparks.add(p.x, p.y, 0, 0, 0.35, 52, ELEMENT_COLOR.steel, SPARK.ring, true);
          this.sparks.add(p.x, p.y, 0, 0, 0.25, 40, 0xffffff, SPARK.ring, true);
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            this.sparks.add(
              p.x + Math.cos(a) * 32,
              p.y + Math.sin(a) * 32,
              Math.cos(a) * 180,
              Math.sin(a) * 180,
              0.35,
              6,
              ELEMENT_COLOR.steel,
              SPARK.star,
              true,
            );
          }
          break;
        }
        case 'revived':
          sound.play('levelUp');
          this.hud.announce(t.revived, true);
          if (!this.calm) this.cameras.main.flash(400, 255, 240, 200);
          this.levelUpPulse();
          break;
        case 'won':
        case 'lost': {
          sound.play(e.type);
          const unlocked = w.endless ? this.bankVigil() : this.bank();
          this.time.delayedCall(900, () =>
            this.scene.launch(SCENES.end, {
              world: w,
              unlocked,
              newElos: this.newElos,
              newAchievements: this.newAchievements,
              vigilRecord: this.vigilRecord,
            }),
          );
          break;
        }
      }
    }
    w.events.length = 0;
  }
}
