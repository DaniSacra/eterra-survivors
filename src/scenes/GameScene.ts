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
import { loadSave, recordRun } from '../render/save';
import { lastChoice, type RunChoice } from './SelectScene';
import { World } from '../core/world';
import { isElo } from '../core/weapons';
import { WEAPONS, WEAPON_IDS, type WeaponId } from '../data/weapons';
import { clamp } from '../core/math';
import { config } from '../data/config';
import { t } from '../i18n/pt-BR';
import { UI } from '../render/ui';
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
import { Mirror } from '../render/mirror';
import { ART_SCALE } from '../render/art/pen';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

/** How long a hit lasts on an enemy, and the part of it (from the start) shown as a white flash. */
const HIT_FLASH = config.enemies.hitFlash;
const HIT_WHITE = 0.5;

/**
 * Weapons that hit a whole area on a beat (auras, frost patches): no white flash, or the crowd inside would turn
 * into one white blob on every tick; their sparks, the squash and the weapon's own pulse show the hit.
 */
const AREA_HIT = Object.fromEntries(
  WEAPON_IDS.map((id) => [id, WEAPONS[id].kind === 'aura' || WEAPONS[id].kind === 'zone']),
) as Record<WeaponId, boolean>;

/** Dust and earth kicked up by bosses. */
const DUST = 0xc8bca8;

/** Projectile sprites that spin as they fly, and the one that drops embers. */
const SPIN: Record<string, boolean> = { 'proj.hammer': true, 'proj.forgeFury': true };
const FORGE = 'proj.forgeFury';

/** Sparks a swing throws when it starts: [color, size, count]. */
const SWING_SPARK: Partial<Record<WeaponId, readonly [number, number, number]>> = {
  fury: [0xffd870, 6, 6],
  mace: [0xd8d0c4, 4, 4],
  jointBreaker: [0xffa060, 5, 6],
};

/**
 * The strongest camera shake (fraction of the screen size): the ground reaches this far past the view. Phaser's
 * shake moves the view by up to intensity x side x zoom world px on each axis.
 */
const MAX_SHAKE = 0.02;

/** Damage numbers: drawn at NUMBER_FONT px, shown NUMBER_WORLD world px tall but never under NUMBER_SCREEN on screen. */
const NUMBER_FONT = 16;
const NUMBER_WORLD = 13;
const NUMBER_SCREEN = 14;

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
  private enemyMirror!: Mirror<Enemy, Phaser.GameObjects.Image>;
  private projectileMirror!: Mirror<Projectile, Phaser.GameObjects.Image>;
  private damageMirror!: Mirror<DamageNumber, NumberText>;
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
  /** The calm-screen option, read once per frame. */
  private calm = false;
  /** Chest, Badalada and Sopro de Geada moments (drawn by drawFx), and the chest reward's icon rising. */
  private moments = newMoments();
  private rewardIcon!: Phaser.GameObjects.Image;
  /** Hit sparks, death stars and confetti (a fixed pool). */
  private sparks = new Sparks();
  /** Match time last frame: hits and puffs are only new on frames where the world moved. */
  private lastTime = 0;
  private stepDt = 0;
  /** The boss's ability phase last frame, to catch the moment it lands. */
  private bossAct = 0;
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
    this.world = new World(Date.now() >>> 0, { ...this.choice, bonuses: shopBonuses(loadSave()) });
    this.banked = false;
    this.heard = { attacks: 0, hits: 0, gems: 0, kills: 0 };
    this.ground = this.add.tileSprite(0, 0, 1, 1, this.world.stage.tile).setOrigin(0);
    this.decals = new Decals(this, this.world.stageId);
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
        if (img.texture.key !== p.sprite) img.setTexture(p.sprite);
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
      () => this.add.image(0, 0, 'enemy.skeleton').setDepth(5),
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
        if (this.stepDt > 0 && e.flash === HIT_FLASH) this.sparks.hit(e.x, e.y, e.hitBy, e.def.radius);
        // A hit flashes white for a moment (not with the calm screen), then the status tint shows again.
        if (hit > 1 - HIT_WHITE && !this.calm && !(e.hitBy && AREA_HIT[e.hitBy])) img.setTintFill(TINT.hit);
        else if (w.freeze > 0 && (w.freeze > 1 || Math.sin(w.time * 20) > -0.3))
          // Covered in frost (light on top), blinking in the last second before they walk again.
          img.setTint(TINT.frost, TINT.frost, TINT.frozen, TINT.frozen);
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

  /** Centers the camera on the hero and makes the ground and decals cover the view. */
  private placeView(): void {
    const w = this.world;
    const cam = this.cameras.main;
    cam.centerOn(w.player.x, w.player.y);
    // Infinite ground: a tile sprite that always covers the camera view, scrolled by world position.
    // (computed from the player, since cam.worldView only updates at render time)
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const vx = w.player.x - vw / 2 - this.viewMargin;
    const vy = w.player.y - vh / 2 - this.viewMargin;
    this.ground.setPosition(vx, vy).setSize(vw + this.viewMargin * 2, vh + this.viewMargin * 2);
    this.ground.setTilePosition(vx, vy);
    this.decals.update(vx, vy, vw + this.viewMargin * 2, vh + this.viewMargin * 2);
  }

  override update(_time: number, delta: number): void {
    if (!this.controls) return;
    const w = this.world;
    this.calm = settings().calm;
    this.hud.joystick.setEnabled(w.state === 'playing');
    w.step(delta / 1000, this.controls.read());
    this.stepDt = w.time - this.lastTime;
    this.lastTime = w.time;
    this.sparks.frame(this.calm);
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
    for (const f of this.world.puffs.active) {
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

  /** Swings that start this frame kick up their sparks: gold for Fúria, chips for the maces. */
  private swingSparks(): void {
    if (this.stepDt <= 0) return;
    const fresh = config.effects.slashTtl - this.stepDt - 1e-6;
    const sp = this.sparks;
    const p = this.world.player;
    for (const s of this.world.slashes.active) {
      if (s.ttl < fresh) continue;
      const spark = SWING_SPARK[s.weapon];
      if (!spark) continue;
      for (let i = 0; i < spark[2]; i++) {
        const a = s.angle - s.arc / 2 + s.arc * ((i + 0.5) / spark[2]);
        const x = p.x + Math.cos(a) * s.range;
        const y = p.y + Math.sin(a) * s.range;
        // Fúria flings its sparks along the turn; the maces knock chips outward.
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
    for (const b of this.world.bolts.active) {
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
          const name = describeUpgrade(e.reward).title;
          this.hud.announce(
            e.reward.kind === 'evolution' ? t.chest.evolved(name) : t.chest.gained(name),
            true,
          );
          this.moments.chest = w.time;
          this.moments.elo = e.reward.kind === 'evolution';
          this.rewardIcon.setTexture(describeUpgrade(e.reward).icon);
          break;
        }
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
