import Phaser from 'phaser';
import type { DamageNumber } from '../core/effects';
import { BossAct, bossAbility } from '../core/bosses';
import type { BossAbility } from '../data/enemies';
import { CHARGE, isFaded } from '../core/behaviours';
import { spriteOf, type Enemy } from '../core/enemies';
import type { Projectile } from '../core/projectiles';
import type { Gem } from '../core/xp';
import type { Pickup } from '../core/pickups';
import { PICKUPS } from '../data/pickups';
import { FLYERS, HERO_FALL, HERO_HURT, SPRITE_SCALE } from '../render/assets';
import { ENEMY_ANIMS, enemyPose, inReach, poseFrame, poseKey } from '../render/enemyAnims';
import { describeUpgrade } from '../render/describe';
import { assistMight, playtest, shopBonuses, stageUnlocked } from '../core/meta';
import { formatTime } from '../core/format';
import { track } from '../render/analytics';
import { CHARACTERS } from '../data/characters';
import { STAGE_IDS, type StageId } from '../data/stages';
import { loadSave, markLessonSeen, markTipSeen, recordRun, recordVigil } from '../render/save';
import { nextTip, TIP_GAP } from '../core/tips';
import { LESSON_GAP, eliteOnField, nextLesson, type LessonId } from '../core/coach';
import { ENEMIES, type EnemyId } from '../data/enemies';
import { lastChoice, type RunChoice } from './choice';
import { World } from '../core/world';
import { bankOnEnd, newRunSummary, summarizeRun, type RunSummary } from '../core/records';
import { liveAchievements } from '../core/achievements';
import type { MetaSave } from '../core/meta';
import type { AchievementId } from '../data/achievements';
import { WEAPONS, WEAPON_IDS, type AuraLevel, type WeaponDef, type WeaponId } from '../data/weapons';
import { isElo, weaponStats } from '../core/weapons';
import { clamp } from '../core/math';
import { config } from '../data/config';
import { t } from '../i18n/pt-BR';
import { ELEMENT_COLOR, SUMMON_COLOR, SUMMON_EDGE, UI, fontPx } from '../render/ui';
import { EVOLUTIONS, EVOLVED_IDS, type Evolution } from '../data/evolutions';
import { Controls } from '../render/controls';
import {
  BOSS_PUFF,
  CHEST_SHOW,
  DAMAGE_TEXT,
  ELITE_PUFF,
  HERO_COLOR,
  PILE_SHAKE,
  SHOT_PLAIN,
  TINT,
  HEAL_COLOR,
  FX_LIGHTS,
  drawFx,
  newMoments,
  shotStyle,
} from '../render/fx';
import { fxSprites } from '../render/fxSprites';
import { AREA_HIT, HIT_SPARK, HitWeight, SPARK, Sparks } from '../render/sparks';
import { settings } from '../render/settings';
import { sound } from '../render/sound';
import { music } from '../render/music';
import { STAGE_MUSIC } from '../render/musics';
import { Decals } from '../render/decals';
import { Obstacles } from '../render/obstacles';
import { Lighting, mixColor } from '../render/lighting';
import { Mirror } from '../render/mirror';
import { PixelBar } from '../render/bars';
import { ensureShadowTexture, SHADOW } from '../render/shadow';
import { ART_RES, ART_SCALE } from '../render/art/pen';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

/** How long a hit lasts on an enemy, and the part of it (from the start) shown as a white flash. */
const HIT_FLASH = config.enemies.hitFlash;
const HIT_WHITE = 0.5;

/**
 * The colour an enemy flashes when a weapon hits it (CF-06): the weapon's own spark colour, lightened. Pale crypt
 * enemies would turn into a white blotch under a white flash, so white is only for a critical hit.
 */
const HIT_PLAIN_TINT = 0xffe6b0;
const HIT_TINT = Object.fromEntries(
  WEAPON_IDS.map((id) => [id, mixColor(HIT_SPARK[id]?.[1] ?? HIT_PLAIN_TINT, 0xffffff, 0.3)]),
) as Record<WeaponId, number>;

/** Piles of bones tracked between frames (CF-01): where they lay, to tell a broken pile from any other death. */
const PILES_TRACKED = 24;
/** Seconds a risen skeleton takes to straighten (squash). */
const RISE_SQUASH = 0.25;

/** Dust and earth kicked up by bosses. */
const DUST = 0xc8bca8;
/** The pale cool light behind the hero. */
const HERO_HALO = 0xdfe8ff;
const HERO_RIM = 0xb4d0ff;
const HERO_SLOW_RIM = 0x7ad04a;
/** Distance from the hero's centre to their feet (world px), where the contact shadow sits. */
const HERO_FEET = 36;
/**
 * The hero is drawn this much higher than their position, which is where every weapon starts from: so shots,
 * swings and orbits leave from the chest and hands, not from the head.
 */
const HERO_LIFT = 22;
/** Flyers hover this high (px) over the spot they threaten, bob a little and flap fast. */
const HOVER = 13;
/** Width of the hero's life bar (px). */
/** Display scale of the pixel pickups: the chest at hero density (1 art px = 2 px, it is the prize), the rest at ART_SCALE. */
const PICKUP_SCALE: Record<string, number> = { 'pickup.chest': 1 };
const HERO_BAR_W = 44;

/** Projectile sprites that spin as they fly, and the one that drops embers. */
const SPIN: Record<string, boolean> = {
  'proj.hammer': true,
  'proj.forgeFury': true,
  'proj.shields': true,
  'proj.valmorWall': true,
  'proj.daggers': true, // a thrown dagger turns end over end
};
/** Each Elo's projectile sprite, tinted with its element's colour. */

/** The thief rat's outline (gold) and the glow of the gems it carries. */
const THIEF_RIM = 0xffe14a;
const GEM_GLOW = 0x3ed4ff;

/** Light colours (the light map multiplies the ground by them). */
const PROJECTILE_LIGHT = 0xffe8b0;
/** Each boss carries a light of its own colour (CA-02); the Cavaleiro Negro keeps the cold violet. */
const BOSS_LIGHT = 0xd8b0ff;
const BOSS_LIGHTS: Record<string, number> = {
  'enemy.spiderMother': 0xff58c8, // venom magenta, readable on Valmor's blue ground
  'enemy.bellRinger': 0xffb040, // the bell's amber
  'enemy.oldWolf': 0xeaf6ff, // frost white
};
/** The Sineiro's bell, from his centre in the unflipped sprite (it hangs behind him, so it flips with him). */
const BELL_DX = 58;
const BELL_DY = -16;
const BURN_LIGHT = 0xff9040;
const FROST_LIGHT = 0x90c8ff;
const ZONE_LIGHT = 0xd8ffc0;

const PROJECTILE_TINT: Record<string, number> = Object.fromEntries(
  EVOLVED_IDS.map((id) => [`proj.${id}`, ELEMENT_COLOR[(EVOLUTIONS[id] as Evolution).element]]),
);
/** The Elo forge's slow motion: how long (real ms) and how slow. */
const FORGE_SLOW_MS = 500;
/** Seconds the Mãe-Aranha takes to come down her web on arrival. */
const BOSS_DROP = 1.3;
/** The first Elo of a life slows the run this long, under the HUD's fusion (PX-11). */
const FIRST_FORGE_SLOW_MS = 2000;
const FORGE_SLOW = 0.25;
const FORGE = 'proj.forgeFury';
/** Luz Sagrada's doves and the pixel Elo shots keep their own colours instead of the element tint. */
const DOVE = 'proj.holyLight';
const OWN_COLOUR = new Set([DOVE, 'proj.fury', 'proj.fan', 'proj.soulProcession']);

/** Sparks a swing throws when it starts: [color, size, count]. */
const SWING_SPARK: Partial<Record<WeaponId, readonly [number, number, number]>> = {
  blade: [0xdce8ff, 4, 3],
  fury: [0xffd870, 6, 6],
  mace: [0xd8cbb4, 4, 5],
  jointBreaker: [0xffa060, 5, 7],
};

/** Hit-stop: the world freezes this long (real ms, about three frames) when a heavy blow lands. */
const HIT_STOP_MS = 50;

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
type EnemyImage = Phaser.GameObjects.Image & {
  uid?: number;
  stunned?: boolean;
  /** Was a pile of bones last frame / was digging (for the transitions) and when it last stood up. */
  piled?: boolean;
  digging?: boolean;
  rose?: number;
  /** Pixel enemies: the pose shown and the world time it began (a strike plays from its start). */
  pose?: string;
  poseT0?: number;
  /** The thief rat's yellow outline is on (a recycled image must lose it for the next enemy). */
  rimmed?: boolean;
};

/** A dying pixel enemy playing its death strip where it fell, then fading (render only). */
interface Corpse {
  img: Phaser.GameObjects.Image;
  sprite: string;
  t0: number;
}
/** Corpses at once, and how long the last frame stays before the fade (ms). */
const MAX_CORPSES = 8;
const CORPSE_HOLD = 700;
const CORPSE_FADE = 500;

/** How long Estrela de Lyra's starlets fly before they burst (their hop spans it). */
const STARLET_FALL = (WEAPONS.lyraStar as WeaponDef).split?.fall ?? 0.4;

/** A hit at least this hard squashes harder and throws a bigger spark (NF-06; the same bar as the gold numbers). */
const STRONG_HIT = config.effects.strongHit;

/** Chance per frame that a bleeding or burning enemy lets a drop fall or an ember rise. */
const DOT_SPARK = 0.06;

/** Shown instead of the damage numbers when they are turned off. */
const NONE: readonly DamageNumber[] = [];

/** A damage number's text object, with the rounded value it shows (so it only converts when that changes). */
type NumberText = Phaser.GameObjects.Text & { shown?: number };

/** A projectile image and the hit radius its sprite was drawn for (half its longest side, world px). */
type ProjImage = Phaser.GameObjects.Image & { baseR?: number };

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
  private playerSprite!: Phaser.GameObjects.Sprite;
  /** The hero's silhouette in moonlight, one pixel up and left behind the sprite: a pale rim around the dark outline. */
  private heroRim!: Phaser.GameObjects.Image;
  /** The hero's walk and idle animations when they have pixel-art strips (else null: the code art bounces). */
  private heroAnims: { walk: string; idle: string } | null = null;
  /** Real time (ms) of the last hit on the hero and of the final fall (-1: none), for the hurt and fall strips. */
  private hurtAtMs = -1e9;
  private fallAtMs = -1;
  private heroKey = '';
  /** Contact shadows on the ground (hero, flyers), redrawn each frame under the enemies. */
  private shadows!: Phaser.GameObjects.Graphics;
  /** The hero's life bar, under their feet and over the crowd. */
  private heroBar!: PixelBar;
  private enemyMirror!: Mirror<Enemy, EnemyImage>;
  /** One contact shadow per enemy image, on the ground under the crowd (CA-01). */
  private shadowMirror!: Mirror<Enemy, Phaser.GameObjects.Image>;
  private corpsePool: Corpse[] = [];
  private projectileMirror!: Mirror<Projectile, ProjImage>;
  private damageMirror!: Mirror<DamageNumber, NumberText>;
  private gemMirror!: Mirror<Gem, Phaser.GameObjects.Image>;
  private pickupMirror!: Mirror<Pickup, Phaser.GameObjects.Image>;
  private fx!: Phaser.GameObjects.Graphics;
  private fxTop!: Phaser.GameObjects.Graphics;
  /** The additive layer: flames, auras and sparks that add light over what is below. */
  private fxGlow!: Phaser.GameObjects.Graphics;
  /** The "+N" of a heal, rising and fading, and the life it adds up while it waits to be shown. */
  private healText!: Phaser.GameObjects.Text;
  private healAcc = 0;
  /** When the hero last gained life (world time), to tell a new healing from steady regeneration. */
  private lastHealAt = -Infinity;
  private healAge = 9;
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
  /** Enemies whose first-time tip was shown (this save), the match time of the last tip, and the next check (CU-01). */
  private tipsSeen = new Set<EnemyId>();
  /** The basics already taught (this save): shown once each, before any enemy tip. */
  private lessonsSeen = new Set<LessonId>();
  private tipAt = -TIP_GAP;
  private nextTipCheck = 0;
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
  /** Real time (ms) until which a heavy blow holds the world still. */
  private stopUntil = 0;
  /** Chest, Badalada and Sopro de Geada moments (drawn by drawFx), and the chest reward's icon rising. */
  private moments = newMoments();
  /** True once this run has forged an Elo: only the first one of a life gets the big moment. */
  private bigForgeDone = false;
  /** This run beat the hero's longest one. */
  private newBest = false;
  /** The gold of the first-run treasure this run banked (0 later). */
  private treasure = 0;
  /** The "you get help" tip was shown (or there is no help this run). */
  private assistShown = true;
  /** Entrance of the boss (PX-14): when it came, the camera's pull-back factor and where it was last seen. */
  private bossIntroAt = -99;
  private camPull = { k: 1 };
  private baseZoom = 1;
  private bossAt = { x: 0, y: 0 };
  /** A level was gained and its ring waits for the choice to close. */
  private levelRingPending = false;
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
  /** Where the piles lay last frame and this frame (x, y pairs), to catch a pile broken for good. */
  private pilesPrev = new Float32Array(PILES_TRACKED * 2);
  private pilesNow = new Float32Array(PILES_TRACKED * 2);
  private nPrev = 0;
  private nNow = 0;
  /** The enemy shot nearest the hero at the start of the frame, and whether it is the cold kind (for the hit). */
  private nearShot = 1e9;
  private nearCold = false;
  private bossAb: BossAbility | undefined;
  private obstacles!: Obstacles;
  private lighting!: Lighting;
  /** The view rectangle the ground covers this frame (world px), for the light map. */
  private view = { x: 0, y: 0, w: 1, h: 1 };
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
    this.tipsSeen = new Set(this.liveSave.tipsSeen);
    this.lessonsSeen = new Set(this.liveSave.lessonsSeen);
    this.tipAt = -TIP_GAP;
    this.nextTipCheck = 0;
    this.nextCheck = 1;
    this.vigilBefore = null;
    this.vigilRecord = false;
    // A player stuck on a stage never won gets a little damage for each defeat in a row (PX-17).
    const bonuses = shopBonuses(this.liveSave);
    this.assistShown = assistMight(this.liveSave, this.choice.stage) <= 0;
    bonuses.stats.might = (bonuses.stats.might ?? 0) + assistMight(this.liveSave, this.choice.stage);
    this.world = new World(Date.now() >>> 0, { ...this.choice, bonuses });
    track(`start/${this.choice.stage}/${this.choice.character}`);
    track(`run-number/${Math.min(this.liveSave.totals.runs + 1, 10)}`);
    music.play(this, STAGE_MUSIC[this.world.stageId]);
    this.banked = false;
    this.vigilBanked = false;
    this.corpsePool = [];
    this.heard = { attacks: 0, hits: 0, gems: 0, kills: 0 };
    this.ground = this.add.tileSprite(0, 0, 1, 1, this.world.stage.tile).setOrigin(0);
    this.decals = new Decals(this, this.world.stageId);
    this.obstacles = new Obstacles(this, this.world);
    this.lighting = new Lighting(this, this.world.stageId);
    // The road's frozen forest: one strip of pines on each side, over the ground, scrolled like it.
    const layout = this.world.stage.layout;
    this.forest =
      layout.kind === 'corridor'
        ? [0, 1].map((i) =>
            this.add
              .tileSprite(0, 0, 1, 1, 'tile.forest')
              .setOrigin(i === 0 ? 1 : 0, 0)
              .setDepth(2.6),
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
        const k = PICKUP_SCALE[key] ?? ART_SCALE;
        if (img.scaleX !== k) img.setScale(k);
        // Items on the ground float a little.
        img.setPosition(it.x, it.y - 2 + Math.sin(this.world.time * 4 + it.x) * 2);
      },
    );
    this.moments = newMoments();
    this.bigForgeDone = false;
    this.bossIntroAt = -99;
    this.camPull.k = 1;
    this.levelRingPending = false;
    this.sparks = new Sparks();
    this.lastTime = 0;
    this.lastHp = this.world.player.hp;
    this.lastHealAt = -Infinity;
    this.bossAct = 0;
    this.rewardIcon = this.add.image(0, 0, 'pickup.chest').setDepth(12.6).setVisible(false);
    this.fx = this.add.graphics().setDepth(4);
    this.fxTop = this.add.graphics().setDepth(11);
    fxSprites.init(this);
    this.fxGlow = this.add.graphics().setDepth(11.5).setBlendMode(Phaser.BlendModes.ADD);
    this.healText = this.add
      .text(0, 0, '', {
        fontFamily: UI.font,
        fontSize: `${fontPx(NUMBER_FONT)}px`,
        fontStyle: 'bold',
        color: '#9bf0a8',
      })
      .setStroke('#0b3a1c', 3)
      .setOrigin(0.5)
      .setDepth(12.6)
      .setVisible(false);
    const heroSprite = CHARACTERS[this.world.character].sprite;
    this.shadows = this.add.graphics().setDepth(4.5);
    this.heroBar = new PixelBar(this, 'hp', true).place(0, 0, HERO_BAR_W + 4, 10).setDepth(13.2);
    this.playerSprite = this.add.sprite(0, 0, heroSprite).setDepth(13.1).setScale(ART_SCALE);
    this.heroRim = this.add.image(0, 0, heroSprite).setDepth(13.05).setTintFill(HERO_RIM);
    const walk = `${heroSprite}.walk`;
    this.heroAnims = this.anims.exists(walk) ? { walk, idle: `${heroSprite}.idle` } : null;
    this.heroKey = heroSprite;
    this.hurtAtMs = -1e9;
    this.fallAtMs = -1;
    this.projectileMirror = new Mirror(
      (): ProjImage => this.add.image(0, 0, 'proj.elunLight').setDepth(12).setScale(ART_SCALE),
      (img, p) => {
        if (img.texture.key !== p.sprite) {
          img.setTexture(p.sprite);
          img.baseR = (Math.max(img.width, img.height) * ART_SCALE) / 2;
          // An Elo's projectiles take its element's colour.
          const tint = OWN_COLOUR.has(p.sprite) ? undefined : PROJECTILE_TINT[p.sprite];
          if (tint === undefined) img.clearTint();
          else img.setTint(tint);
        }
        // Hammers spin end over end as they fly.
        // Estrela de Lyra's starlets hop in an arc and fall where they burst (NF-08): ttl runs from FALL to 0.
        const hop = p.fuse ? Math.sin(Math.PI * Math.min(1, Math.max(0, 1 - p.ttl / STARLET_FALL))) * 22 : 0;
        img.setPosition(p.x, p.y - hop).setRotation(SPIN[p.sprite] ? this.world.time * 14 : p.angle);
        // A shot that hits wider than its sprite (Fúria's wave, Área) grows to its hit size (NF-07); never shrinks.
        img.setScale(ART_SCALE * Math.max(1, p.radius / (img.baseR ?? p.radius)));
        // Fúria da Forja drops embers behind it.
        this.lighting.add(p.x, p.y, 70, PROJECTILE_TINT[p.sprite] ?? PROJECTILE_LIGHT, 0.55, 0.15);
        if (p.sprite === FORGE && this.stepDt > 0 && this.sparks.rand() < 0.3)
          this.sparks.add(p.x, p.y, 0, 20, 0.4, 5, 0xffa040, SPARK.ember);
      },
    );
    this.damageMirror = new Mirror(
      (): NumberText =>
        this.add
          .text(0, 0, '', {
            fontFamily: UI.font,
            fontSize: `${fontPx(NUMBER_FONT)}px`,
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
    ensureShadowTexture(this);
    this.shadowMirror = new Mirror(
      () => this.add.image(0, 0, SHADOW).setDepth(4.6).setAlpha(0.9),
      (sh, e) => {
        const r = e.def.radius;
        // Flyers have their own bobbing shadow; the rest stand on the ground with theirs at the feet.
        if (e.pile <= 0 && FLYERS[spriteOf(e)]) {
          sh.setVisible(false);
          return;
        }
        const k = (r * 2.4) / 32;
        sh.setVisible(true)
          .setPosition(e.x, e.y + r * 0.72)
          .setScale(k, k * (e.def.boss ? 1.1 : 1));
      },
    );
    this.enemyMirror = new Mirror(
      (): EnemyImage => this.add.image(0, 0, 'enemy.skeleton').setDepth(5),
      (img, e) => {
        const w = this.world;
        // A pixel enemy with state animations shows the strip of what it is doing; the rest keep one still.
        const spr = spriteOf(e);
        const anim = e.pile > 0 ? undefined : ENEMY_ANIMS[spr];
        const posed = anim ? enemyPose(e, anim, inReach(e, w.player.x, w.player.y)) : null;
        const key =
          anim && posed
            ? poseKey(spr, posed.pose)
            : e.pile > 0
              ? (e.def.reassemble as { sprite: string }).sprite
              : spr;
        if (img.texture.key !== key) {
          img.setTexture(key);
          // Bosses over their escort and elites over the crowd, so they always show whole.
          img.setDepth(e.def.boss ? 7 : e.def.elite ? 6 : 5);
        }
        // Seconds in the pose (each enemy out of phase): the strip frame and the step's hop both follow it.
        let poseSec = 0;
        if (anim && posed) {
          if (img.pose !== posed.pose) {
            img.pose = posed.pose;
            img.poseT0 = w.time;
          }
          poseSec = w.freeze > 0 ? 0 : w.time - (img.poseT0 ?? w.time) + e.uid * 0.13;
          img.setFrame(poseFrame(anim, posed.pose, posed.k, poseSec));
        }
        // Cartoon life: squash and stretch while walking (each enemy out of phase), face the player,
        // squash when hit. Frozen enemies stand still.
        // Slowed enemies take heavy, slow steps.
        const a =
          (w.freeze > 0 ? 0 : Math.sin(w.time * (e.slow > 0 ? 4 : 9) + e.uid * 1.7) * 0.06) *
          (anim ? 0.5 : 1);
        // A walker's step hops once per stride of its strip (two footfalls a cycle), so the body falls and rises
        // with the legs instead of rocking sideways.
        let step = 0;
        if (anim && posed && posed.pose === 'walk' && anim.bob > 0 && w.freeze <= 0 && e.def.move !== 'still')
          step =
            Math.abs(Math.sin((Math.PI * poseSec * anim.fps.walk) / anim.frames.walk)) *
            anim.bob *
            ART_RES *
            (e.slow > 0 ? 0.6 : 1);
        // 1 -> 0 after a hit. Bosses are hit all the time: a small squash only, and no white flash (they would
        // stay a white silhouette, like the hurt hero used to be red).
        const hit = (e.flash / HIT_FLASH) * (e.def.boss ? 0.3 : 1);
        // Chargers crouch while winding up and stretch as they burst into the dash.
        // A strong hit squashes harder (NF-06).
        const squash = e.hitAmount >= STRONG_HIT ? 0.25 : 0.15;
        let sx = 1 + a + squash * hit;
        let sy = 1 - a - squash * hit;
        if (e.def.move === 'charge') {
          if (e.act === BossAct.Windup) {
            sx += 0.15;
            sy -= 0.2;
          } else if (e.act === BossAct.Active && e.actT > CHARGE.dash - 0.2) {
            sx += 0.15;
            sy -= 0.08;
          }
        }
        // A leaper in the air rises in an arc over its landing mark (FT-04).
        const lp = e.def.leap;
        const lift =
          lp && e.act === BossAct.Active ? Math.sin(Math.PI * (1 - e.actT / lp.air)) * (lp.radius + 20) : 0;
        // A pile about to stand up trembles; the one that just stood straightens up with a vertical stretch.
        const shake = e.pile > 0 && e.pile < PILE_SHAKE ? Math.sin(w.time * 60 + e.uid) * 1.5 : 0;
        const rise = img.uid === e.uid && img.rose !== undefined ? 1 - (w.time - img.rose) / RISE_SQUASH : 0;
        if (rise > 0) {
          sx -= 0.18 * rise;
          sy += 0.3 * rise;
        }
        // A flyer hovers above the ground with a small shadow below, bobbing and beating its wings.
        let hover = 0;
        // Scale and flying go by the enemy's own sprite, not by the pose strip it shows now.
        const sprite = e.pile > 0 ? key : spr;
        if (FLYERS[sprite]) {
          const t = w.freeze > 0 ? 0 : w.time;
          hover = HOVER + Math.sin(t * 5 + e.uid) * 2.5;
          const flap = Math.sin(t * 24 + e.uid * 1.3);
          sx += flap * 0.1;
          sy -= flap * 0.12;
          const sw = 14 - (hover - HOVER) * 0.6;
          this.shadows.fillStyle(0x000000, 0.3).fillEllipse(e.x, e.y + 8, sw, sw * 0.32);
        }
        // The Mãe-Aranha arrives down a web: for a moment she hangs above where she lands (PX-14).
        const intro =
          e === w.boss && e.type === 'spiderMother'
            ? Math.max(0, 1 - (w.time - this.bossIntroAt) / BOSS_DROP) * 260
            : 0;
        if (intro > 0)
          this.shadows
            .lineStyle(2, 0xe8e2d0, 0.75)
            .lineBetween(e.x, e.y - intro - 30, e.x, e.y - intro - 800);
        img
          .setPosition(e.x + shake, e.y - lift - hover - intro - step)
          .setScale(
            ART_SCALE * sx * (SPRITE_SCALE[sprite] ?? 1),
            ART_SCALE * sy * (SPRITE_SCALE[sprite] ?? 1),
          )
          .setFlipX(w.player.x < e.x)
          // A boss winding up shakes (rings the bell, raises the sword).
          .setRotation(this.windupSway(e));
        this.thiefLook(img, e);
        if (this.stepDt > 0) {
          if (e.flash === HIT_FLASH) {
            this.sparks.hit(
              e.x,
              e.y,
              e.hitBy,
              e.def.radius,
              e.hitCrit ? HitWeight.Crit : e.hitAmount >= STRONG_HIT ? HitWeight.Strong : HitWeight.Plain,
            );
            // Quebra-Junta crushing one that was already dizzy.
            if (img.uid === e.uid && img.stunned && e.hitBy && (WEAPONS[e.hitBy] as WeaponDef).crush)
              this.crushSpark(e);
          }
          if (
            (e.dot > 0 || (e.def.burst && e.pile <= 0)) &&
            this.sparks.idle &&
            this.sparks.rand() < DOT_SPARK
          )
            this.dotSpark(e);
        }
        this.pileMoments(img, e);
        img.uid = e.uid;
        img.stunned = e.stun > 0;
        // A hit flashes white for a moment (not with the calm screen), then the status tint shows again.
        if (hit > 1 - HIT_WHITE && !this.calm && !(e.hitBy && AREA_HIT[e.hitBy]))
          img.setTintFill(e.hitCrit || !e.hitBy ? TINT.hit : (HIT_TINT[e.hitBy] ?? TINT.hit));
        else if (w.freeze > 0 && (w.freeze > 1 || Math.sin(w.time * 20) > -0.3))
          // Covered in frost (light on top), blinking in the last second before they walk again.
          img.setTint(TINT.frost, TINT.frost, TINT.frozen, TINT.frozen);
        else if (e.slow > 0) img.setTint(TINT.slowed);
        else if (e.dot > 0) img.setTint(e.dotKind === 'bleed' ? TINT.bleed : TINT.burn);
        // Out of the hero's light, the night shades them (never so dark that they hide).
        else img.setTint(this.lighting.enemyTint(e.x, e.y));
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

  /** This frame's lights (projectiles add theirs as they are mirrored). */
  private addLights(): void {
    const w = this.world;
    const l = this.lighting;
    l.begin();
    l.hero(w.player.x, w.player.y, HERO_COLOR[w.character]);
    // The stage's own flames: candles, lanterns, fires and torches.
    this.decals.lights(l, w.time, this.calm);
    this.obstacles.lights(l, w.time, this.calm);
    // Bosses carry their own light, so they are never a shape in the dark.
    if (w.boss) {
      const b = w.boss;
      l.add(b.x, b.y, b.def.radius * 5, BOSS_LIGHTS[b.def.sprite] ?? BOSS_LIGHT, 0.7);
      // The bell is lit as it hangs, brighter and pulsing with the toll when he winds up (Badalada, Dobre).
      if (b.def.sprite === 'enemy.bellRinger') {
        const warn = b.act === BossAct.Windup;
        const swing = warn && !this.calm ? 0.5 + 0.5 * Math.sin(w.time * 14) : 0;
        const side = w.player.x < b.x ? 1 : -1;
        l.add(
          b.x + side * BELL_DX,
          b.y + BELL_DY,
          warn ? 150 : 90,
          0xffb040,
          warn ? 0.95 : 0.6,
          warn ? 0.3 + 0.35 * swing : 0.2,
        );
      }
    }
    // A war banner's brazier is one of the road's lights: it is seen from afar (FT-06).
    if (w.alive.warBanner) {
      const foes = w.enemies.active;
      for (let i = 0; i < foes.length; i++) {
        const e = foes[i] as (typeof foes)[number];
        if (e.def.banner && !e.dead) l.flame(e.x, e.y - 30, 160, 0xff8a3a, w.time, this.calm);
      }
    }
    // A nest's sacs pulse a sick acid light, faster in the last second before each batch (FT-09).
    if (w.alive.spiderNest || w.alive.spiderEgg) {
      const foes = w.enemies.active;
      for (let i = 0; i < foes.length; i++) {
        const e = foes[i] as (typeof foes)[number];
        if (!e.def.nest || e.dead) continue;
        const soon = e.actT < 1 && e.spawned < e.def.nest.total;
        const pulse = this.calm ? 0.6 : 0.5 + 0.3 * Math.sin(w.time * (soon ? 18 : 4));
        l.add(e.x, e.y, 90, 0xc8e040, pulse);
      }
    }
    // The witch's cauldron is a source of sick acid light, and flares while she stirs (FT-11).
    if (w.alive.witch) {
      const foes = w.enemies.active;
      for (let i = 0; i < foes.length; i++) {
        const e = foes[i] as (typeof foes)[number];
        if (e.def.brew && !e.dead) l.flame(e.x - 8, e.y, e.stir > 0 ? 220 : 130, 0xc8e040, w.time, this.calm);
      }
    }
    // A thief's sack leaks the light of the gems it carries (FT-10).
    if (w.alive.thiefRat) {
      const foes = w.enemies.active;
      for (let i = 0; i < foes.length; i++) {
        const e = foes[i] as (typeof foes)[number];
        if (e.def.flee && !e.dead) l.add(e.x, e.y, 50 + Math.min(70, e.carry * 4), 0x8fe8ff, 0.7);
      }
    }
    // A cold orb carries a faint blue light (CF-05); a few at most, effect lights are budgeted.
    const shots = w.enemyShots.active;
    for (let i = 0, lit = 0; i < shots.length && lit < 4; i++) {
      const sh = shots[i] as (typeof shots)[number];
      if (shotStyle(sh) === SHOT_PLAIN) continue;
      lit++;
      l.add(sh.x, sh.y, 60, FROST_LIGHT, 0.4);
    }
    const zones = w.zones.active;
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i] as (typeof zones)[number];
      const color = z.burnDps > 0 ? BURN_LIGHT : z.slows ? FROST_LIGHT : ZONE_LIGHT;
      // A fresh zone lands with a brief brightening (none with the calm screen).
      const landed = this.calm ? 0 : Math.max(0, 1 - (z.duration - z.ttl) / 0.3);
      l.add(z.x, z.y, z.radius * 2.2, color, 0.55 + 0.3 * landed, 0.12 * landed);
    }
    this.effectLights();
    // Chests glow where they lie.
    const items = w.pickups.active;
    for (let i = 0; i < items.length; i++) {
      const it = items[i] as (typeof items)[number];
      l.add(it.x, it.y, 90, it.type === 'chest' ? 0xffd070 : 0xc8d8ff, 0.5);
    }
  }

  /**
   * Lights of weapon and status effects, at most FX_LIGHTS a frame: burning bodies (a pool of orange on the ground,
   * flickering), the aura's breath, a fresh bolt. The pools over the crowd are drawn by drawFx's additive layer.
   */
  private effectLights(): void {
    const w = this.world;
    const l = this.lighting;
    const calm = this.calm;
    let used = 0;
    for (let i = 0; i < w.weapons.length && used < FX_LIGHTS; i++) {
      const wp = w.weapons[i] as (typeof w.weapons)[number];
      const def = WEAPONS[wp.id] as WeaponDef;
      if (def.kind !== 'aura') continue;
      const st = weaponStats(wp) as AuraLevel;
      let k: number;
      let flare: number;
      let on = 1;
      if (def.burst) {
        // Aura de Yah lights the ground only while its window is open: in at once, out with the ring.
        if (wp.burst <= 0) continue;
        const age = def.burst.window - wp.burst;
        on = Math.min(1, age / 0.18, wp.burst / 0.5);
        const gap = def.burst.window / def.burst.ticks;
        flare = calm ? 0 : Math.max(0, 1 - (age % gap) / 0.3);
        k = 1;
      } else {
        // The light charges between ticks, then flares right at the tick (the same beat as the wave of the rim).
        k = 1 - wp.timer / (st.cooldown * w.player.stats.cooldown);
        flare = calm ? 0 : Math.max(0, 1 - k * 3);
      }
      l.add(
        w.player.x,
        w.player.y,
        st.radius * w.player.stats.area * 1.3,
        isElo(wp.id) ? 0xff8a30 : 0xffc860,
        (0.4 + 0.15 * k * k + 0.35 * flare) * on,
        (0.08 + 0.04 * k * k + 0.12 * flare) * on,
      );
      used++;
    }
    // Blows that land: Chama de Yah's wave and the mace's blow and shock wave light the ground where they hit and
    // fade with them (half strength with the calm screen; never under the level-up overlay).
    if (w.state !== 'levelup') {
      const slashes = w.slashes.active;
      const fx = config.effects;
      for (let i = 0; i < slashes.length && used < FX_LIGHTS - 2; i++) {
        const sl = slashes[i] as (typeof slashes)[number];
        const form = sl.form;
        if (form !== 'smash' && form !== 'shock' && form !== 'pulse') continue;
        const total = form === 'smash' ? fx.smashTtl : form === 'shock' ? fx.shockTtl : fx.pulseTtl;
        const q = Math.min(1, Math.max(0, 1 - sl.ttl / total)); // 0 at the blow, 1 when it is gone
        const reach = form === 'smash' ? sl.range : sl.shock;
        const colour = form === 'pulse' ? 0xff9a40 : (HIT_SPARK[sl.weapon]?.[1] ?? 0xffb040);
        const a = (sl.echo ? 0.3 : 0.55) * (1 - q) * (calm ? 0.5 : 1);
        const grow = form === 'smash' ? 1.4 : 1.1 + 0.5 * q;
        l.add(sl.x, sl.y, reach * grow + 30, colour, a, calm ? 0 : 0.14 * (1 - q));
        used++;
      }
    }
    const foes = w.enemies.active;
    if (w.alive.emberBones) {
      for (let i = 0; i < foes.length && used < FX_LIGHTS - 2; i++) {
        const e = foes[i] as (typeof foes)[number];
        if (!e.def.burst || e.dead || e.pile > 0) continue;
        l.flame(e.x, e.y - 6, 120, 0xff7a24, w.time, calm);
        used++;
      }
    }
    const bolts = w.bolts.active;
    for (let i = 0; i < bolts.length && used < FX_LIGHTS; i++) {
      const b = bolts[i] as (typeof bolts)[number];
      const k = Math.min(1, b.ttl / config.effects.boltTtl);
      const c = HIT_SPARK[b.weapon]?.[1] ?? 0xfff0c0;
      l.add(b.x, b.y, b.radius * 2 + 50, c, (calm ? 0.35 : 0.6) * k, calm ? 0 : 0.15 * k);
      used++;
    }
  }

  /** Camera shake, skipped with the calm-screen option. */
  private shake(ms: number, intensity: number): void {
    if (!settings().calm) this.cameras.main.shake(ms, intensity);
  }

  /** Zoom so the shortest screen side always shows `minWorldSide` world pixels (portrait-friendly). */
  private fitCamera(): void {
    const { width, height } = this.scale;
    const side = height > width ? config.view.portraitWorldSide : config.view.minWorldSide;
    const zoom = clamp(Math.min(width, height) / side, 0.5, 4);
    this.baseZoom = zoom;
    this.cameras.main.setZoom(zoom * this.camPull.k);
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
    this.view.x = vx;
    this.view.y = vy;
    this.view.w = fw;
    this.view.h = fh;
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
    const slow = this.time.now < this.stopUntil ? 0 : this.time.now < this.slowUntil ? FORGE_SLOW : 1;
    this.noteNearShot();
    w.step((delta / 1000) * slow, this.controls.read());
    this.stepDt = w.time - this.lastTime;
    this.lastTime = w.time;
    this.sparks.frame(this.calm);
    // The piles seen last frame are the reference for this frame's deaths; the mirror refills the new list.
    const spare = this.pilesPrev;
    this.pilesPrev = this.pilesNow;
    this.pilesNow = spare;
    this.nPrev = this.nNow;
    this.nNow = 0;
    if (this.stepDt > 0 && w.player.hp > this.lastHp + 0.01) {
      this.healAcc += w.player.hp - this.lastHp;
      // A new healing starts the 3 s glow; steady regeneration does not keep renewing it.
      if (w.time - this.lastHealAt > 1) this.moments.heal = w.time;
      this.lastHealAt = w.time;
      if (w.time - this.moments.heal < 3) this.healSpark();
    }
    this.lastHp = w.player.hp;
    this.deathSparks();
    this.corpses();
    this.swingSparks();
    this.boltSparks();
    this.bossMoments();

    this.placeView();
    // The hero walks (pixel-art strips) or bounces (code art) and turns to where it goes.
    const anims = this.heroAnims;
    if (anims) this.heroPose(w.player.moving ? anims.walk : anims.idle);
    const step = w.player.moving && !anims ? Math.abs(Math.sin(w.time * 12)) : 0;
    const sx = ART_SCALE * (1 + step * 0.05);
    const sy = ART_SCALE * (1 - step * 0.05);
    this.playerSprite.setPosition(w.player.x, w.player.y - HERO_LIFT - step * 2.5).setScale(sx, sy);
    // Hurt (invulnerable): the hero blinks instead of fading into the crowd.
    this.playerSprite.setAlpha(w.player.iframes > 0 && Math.sin(w.time * 40) > 0 ? 0.55 : 1);
    if (w.player.facing.x !== 0) this.playerSprite.setFlipX(w.player.facing.x < 0);
    const ps = this.playerSprite;
    this.heroRim
      .setTexture(ps.texture.key, ps.frame.name)
      .setPosition(ps.x + (ps.flipX ? 1 : -1), ps.y - 1)
      .setScale(ps.scaleX, ps.scaleY)
      .setFlipX(ps.flipX)
      .setAlpha(ps.alpha * 0.5);
    // Slowed by the ground (slime, ice): the rim turns slime-green and stronger (CU-02).
    if (w.slowed) this.heroRim.setTintFill(HERO_SLOW_RIM).setAlpha(ps.alpha * 0.9);
    else this.heroRim.setTintFill(HERO_RIM);
    // A discreet contact shadow under the hero's feet.
    this.shadows.clear();
    if (w.boss && !w.boss.dead) {
      this.bossAt.x = w.boss.x;
      this.bossAt.y = w.boss.y;
    }
    // A pale halo behind the body so a dark hero (Andilla) still stands out on the dark ground (DD-12).
    for (let i = 0; i < 4; i++)
      this.shadows
        .fillStyle(HERO_HALO, 0.045)
        .fillEllipse(w.player.x, w.player.y - 6 - HERO_LIFT, 96 - i * 15, 112 - i * 17);
    this.shadows.fillStyle(0x000000, 0.35).fillEllipse(w.player.x, w.player.y + HERO_FEET - HERO_LIFT, 26, 8);
    // Life under the feet: wide, framed in dark, always over the crowd; blinks coral when low.
    const hpK = Math.max(0, w.player.hp / w.player.stats.maxHp);
    const low = hpK <= 0.35 && Math.sin(w.time * 12) > 0;
    this.heroBar
      .moveTo(
        Math.round(w.player.x - HERO_BAR_W / 2) - 2,
        Math.round(w.player.y + HERO_FEET - HERO_LIFT + 8) - 2,
      )
      .set(hpK)
      .setTint(low ? 0xffb0b8 : 0xffffff);
    this.addLights();
    this.gemMirror.sync(w.gems.active);
    this.pickupMirror.sync(w.pickups.active);
    this.shadowMirror.sync(w.enemies.active);
    this.enemyMirror.sync(w.enemies.active);
    this.projectileMirror.sync(w.projectiles.active);
    this.damageMirror.sync(settings().damageNumbers ? w.damageNumbers.active : NONE);
    fxSprites.begin();
    drawFx(this.fx, this.fxTop, w, this.moments, this.fxGlow, this.calm);
    fxSprites.end();
    // Sparks keep flying after the boss falls (the world stops), but hold still behind the level-up choice.
    if (w.state !== 'levelup') this.sparks.update(delta / 1000);
    this.sparks.draw(this.fxGlow);
    this.showHealNumber(delta / 1000);
    const v = this.view;
    this.lighting.render(v.x, v.y, v.w, v.h, delta / 1000);
    this.showReward();
    this.handleEvents();
    this.releaseLevelRing();
    this.frameSounds();
    this.checkAchievements();
    this.checkTips();
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

  /**
   * First time (per save) an enemy with a verb is near: a short tip under the banner (CU-01). At most one every
   * `TIP_GAP` s, never with a boss alive or a notice up, none when the option is off. Twice a second.
   */
  private checkTips(): void {
    const w = this.world;
    if (w.state !== 'playing' || w.time < this.nextTipCheck) return;
    this.nextTipCheck = w.time + 0.5;
    if (!settings().tips || w.boss || !this.hud.canTip()) return;
    // A player who tried again gets told why the hero hits a little harder (PX-17), once the run is under way.
    if (!this.assistShown && w.time >= 3) {
      this.assistShown = true;
      this.tipAt = w.time;
      this.hud.tip('icon.might', t.assist(Math.round(assistMight(this.liveSave, w.stageId) * 100)));
      return;
    }
    // The basics first (move, weapons attack alone, gems, life), a short while apart.
    if (w.time - this.tipAt >= LESSON_GAP) {
      const lesson = nextLesson(w, this.lessonsSeen);
      if (lesson) {
        this.lessonsSeen.add(lesson);
        this.tipAt = w.time;
        markLessonSeen(lesson);
        // A finger as the main pointer (phones, tablets), not just a touch screen on a laptop.
        const touch =
          !this.sys.game.device.os.desktop || window.matchMedia?.('(pointer: coarse)').matches === true;
        let text: string;
        if (lesson === 'move') text = t.lessons.move(touch);
        else if (lesson === 'elite') text = t.lessons.elite(t.enemies[eliteOnField(w) ?? 'skeleton']);
        else if (lesson === 'boss')
          text = t.lessons.boss(formatTime(playtest.bossAt ?? w.stage.boss.at), t.enemies[w.stage.boss.id]);
        else text = t.lessons[lesson];
        this.hud.tip(t.lessons.icon[lesson], text);
        return;
      }
    }
    if (w.time - this.tipAt < TIP_GAP) return;
    const id = nextTip(w, this.tipsSeen);
    if (!id) return;
    this.tipsSeen.add(id);
    this.tipAt = w.time;
    markTipSeen(id);
    this.hud.tip(ENEMIES[id].sprite, t.bestiary.tips[id] ?? '');
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
      if (this.brokenPile(f.x, f.y, f.r)) continue;
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

  /** Dying pixel enemies: each new death puff of one with a death strip starts a corpse, and every corpse plays on. */
  private corpses(): void {
    const now = this.time.now;
    if (this.stepDt > 0) {
      const fresh = config.effects.puffTtl - this.stepDt - 1e-6;
      for (let i = 0; i < this.world.puffs.active.length; i++) {
        const f = this.world.puffs.active[i] as (typeof this.world.puffs.active)[number];
        const anim = ENEMY_ANIMS[f.sprite];
        if (f.kind !== 'death' || f.ttl < fresh || !anim?.frames.death) continue;
        let c: Corpse | undefined;
        for (let k = 0; k < this.corpsePool.length; k++)
          if (!(this.corpsePool[k] as Corpse).img.visible) {
            c = this.corpsePool[k];
            break;
          }
        if (!c && this.corpsePool.length < MAX_CORPSES) {
          c = { img: this.add.image(0, 0, f.sprite).setDepth(4).setScale(ART_SCALE), sprite: '', t0: 0 };
          this.corpsePool.push(c);
        }
        if (!c) continue;
        c.sprite = f.sprite;
        c.t0 = now;
        c.img
          .setTexture(poseKey(f.sprite, 'death'), 0)
          .setPosition(f.x, f.y)
          .setFlipX(f.flip)
          .setAlpha(1)
          .setVisible(true);
        c.img.setTint(this.lighting.enemyTint(f.x, f.y));
      }
    }
    for (let k = 0; k < this.corpsePool.length; k++) {
      const c = this.corpsePool[k] as Corpse;
      if (!c.img.visible) continue;
      const a = ENEMY_ANIMS[c.sprite] as (typeof ENEMY_ANIMS)[string];
      const t = (now - c.t0) / 1000;
      c.img.setFrame(poseFrame(a, 'death', -1, t));
      const over = now - c.t0 - ((a.frames.death ?? 1) / a.fps.death) * 1000 - CORPSE_HOLD;
      if (over > 0) c.img.setAlpha(Math.max(0, 1 - over / CORPSE_FADE));
      if (over > CORPSE_FADE) c.img.setVisible(false);
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
        // A heavy blow freezes the world for a beat (not with the calm screen on).
        // One pause per frame: the blow and its wave land together (PF-02).
        if (!this.calm && this.time.now >= this.stopUntil) this.stopUntil = this.time.now + HIT_STOP_MS;
        // Dust kicked up by the blow (no camera shake: weapons never move the screen).
        const spark = SWING_SPARK[s.weapon];
        if (!spark) continue;
        const n = spark[2];
        for (let i = 0; i < n; i++) {
          const a = s.angle + (i - (n - 1) / 2) * (s.form === 'shock' ? 1.2 : 0.45);
          const d = s.shock * (s.form === 'shock' ? 0.5 : 0.8);
          const x = s.x + Math.cos(a) * d;
          const y = s.y + Math.sin(a) * d;
          sp.add(x, y, Math.cos(a) * 90, Math.sin(a) * 90 - 60, 0.4, spark[1], spark[0], SPARK.chunk);
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
        sp.add(x, y, Math.cos(out) * 150, Math.sin(out) * 150, 0.35, spark[1], spark[0], SPARK.chunk);
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
    // The ability that was running last frame: the cycle moves on in the same step the act changes.
    const ab = this.bossAb;
    this.bossAb = b ? bossAbility(b) : undefined;
    if (!b || !ab || act === was) return;
    if (was === BossAct.Active && ab.kind === 'lunge') this.lungeDust(b);
    if (act === BossAct.Windup && ab.kind === 'toll') sound.play('bellToll');
    if (act === BossAct.Windup && ab.kind === 'cleave' && (ab.arc ?? 1) >= Math.PI * 2 - 0.01)
      sound.play('bellDirge');
    if (was !== BossAct.Windup) return;
    if (ab.kind === 'cleave' && act === BossAct.Active && (ab.arc ?? 1) >= Math.PI * 2 - 0.01) {
      // The Dobre Fúnebre rings out: dust along the whole edge of the ring, a flash on the ground, a deep beat.
      this.shake(150, 0.008);
      sound.play('dirgeBeat');
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n + 0.2;
        const x = b.x + Math.cos(a) * ab.range;
        const y = b.y + Math.sin(a) * ab.range;
        this.sparks.add(x, y, Math.cos(a) * 60, Math.sin(a) * 60 - 25, 0.5, 7, DUST, SPARK.star, true);
      }
      this.sparks.add(b.x, b.y, 0, 0, 0.3, ab.range, 0xffffff, SPARK.ring, true);
      if (!this.calm) this.lighting.flash(b.x, b.y, ab.range * 2.4, 0xffe8e8, 0.3);
    } else if (ab.kind === 'cleave' && act === BossAct.Active) {
      this.shake(150, 0.008);
      const aim = Math.atan2(b.aimY, b.aimX);
      const half = (ab.arc ?? 1) / 2;
      for (let i = 0; i < 6; i++) {
        const a = aim - half + (half * 2 * (i + 0.5)) / 6;
        const x = b.x + Math.cos(a) * ab.range;
        const y = b.y + Math.sin(a) * ab.range;
        this.sparks.add(x, y, Math.cos(a) * 90, Math.sin(a) * 90 - 30, 0.45, 6, 0xe8e2d0, SPARK.star, true);
      }
    } else if (ab.kind === 'frost') {
      // The howl lands: the ground freezes (drawIce) and the screen shakes, a boss's right.
      this.shake(300, 0.008);
      this.sparks.burst(b.x, b.y - b.def.radius * 0.5, 8, 160, 6, 0xe8e2f4, SPARK.star, 0.5, false);
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

  /**
   * The bones of a pile (CF-01), once per transition: it falls (a fan of bones and a puff of dust), counts down (the
   * ring is drawn by drawFx; in its last 0.6 s bones fly back to it) and stands up (a short ring and a squash).
   * Also records where the pile lies for `brokenPile`.
   */
  private pileMoments(img: EnemyImage, e: Enemy): void {
    const piled = e.pile > 0;
    const sp = this.sparks;
    if (piled && this.nNow < PILES_TRACKED) {
      this.pilesNow[this.nNow * 2] = e.x;
      this.pilesNow[this.nNow * 2 + 1] = e.y;
      this.nNow++;
    }
    if (this.stepDt > 0 && img.uid === e.uid) {
      const r = e.def.radius;
      if (piled && !img.piled) {
        sound.play('pileFall');
        sp.add(e.x, e.y + r * 0.3, 0, 0, 0.35, r * 2.4, DUST, SPARK.ring);
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.55;
          sp.add(e.x, e.y, Math.cos(a) * 110, Math.sin(a) * 110, 0.5, 4, SUMMON_COLOR, SPARK.star);
        }
      } else if (!piled && img.piled && e.rose) {
        sound.play('pileRise');
        img.rose = this.world.time;
        sp.add(e.x, e.y, 0, 0, 0.3, r * 3, SUMMON_EDGE, SPARK.ring);
        for (let i = 0; i < 3; i++)
          sp.add(e.x + (i - 1) * 6, e.y + r * 0.4, (i - 1) * 40, -30, 0.35, 5, DUST, SPARK.star);
      } else if (piled && e.pile < PILE_SHAKE && sp.idle && sp.rand() < 0.25) {
        // Bones flying back to the pile.
        const a = sp.rand() * Math.PI * 2;
        sp.add(
          e.x + Math.cos(a) * 22,
          e.y + Math.sin(a) * 14,
          -Math.cos(a) * 100,
          -Math.sin(a) * 70,
          0.28,
          3.5,
          SUMMON_COLOR,
          SPARK.star,
        );
      }
    }
    if (img.uid !== e.uid) img.rose = undefined;
    else if (img.rose !== undefined && this.world.time - img.rose > RISE_SQUASH) img.rose = undefined;
    img.piled = piled;
    // The Coveiro plants his shovel: a thud, and earth flies.
    const digging = e.stir > 0 && !!e.def.dig;
    if (this.stepDt > 0 && digging && !img.digging && img.uid === e.uid) {
      sound.play('dig');
      sp.burst(e.x, e.y + e.def.radius * 0.6, 4, 90, 5, DUST, SPARK.star, 0.4, false);
    }
    img.digging = digging;
  }

  /** A death on a pile of bones last frame is the pile broken for good: a double star and a crack (CF-01). */
  private brokenPile(x: number, y: number, r: number): boolean {
    for (let i = 0; i < this.nPrev; i++) {
      if (
        Math.abs((this.pilesPrev[i * 2] as number) - x) > 2 ||
        Math.abs((this.pilesPrev[i * 2 + 1] as number) - y) > 2
      )
        continue;
      const sp = this.sparks;
      sound.play('pileBreak');
      sp.add(x, y - 2, 40, -50, 0.32, 13, SUMMON_EDGE, SPARK.star, true);
      sp.add(x, y - 4, -40, -60, 0.28, 9, 0xffffff, SPARK.star, true);
      sp.add(x, y, 0, 0, 0.2, r * 2.2, SUMMON_EDGE, SPARK.ring, true);
      if (sp.room) sp.burst(x, y, 5, 130, 4, SUMMON_COLOR, SPARK.star, 0.4, false);
      return true;
    }
    return false;
  }

  /**
   * The Ossada em Brasa goes off (CF-02): a hot white flash running out to the exact blast radius, short rays, embers
   * rising and pale smoke, with a scorch left on the ground by the mark. At most 10 sparks, a light, no shake.
   */
  private emberBurst(x: number, y: number, radius: number): void {
    const sp = this.sparks;
    sound.play('emberBurst');
    sp.add(x, y, 0, 0, 0.18, radius, 0xfff0c0, SPARK.ring, true);
    sp.add(x, y, 0, 0, 0.32, radius, 0xff8a3a, SPARK.ring, true);
    sp.burst(x, y, 4, radius * 3.5, 5, 0xff8a3a, SPARK.ember, 0.6, true);
    sp.burst(x, y, 4, radius * 1.4, 6, 0xffe8b0, SPARK.star, 0.3, true);
    const m = this.moments;
    const b = m.bursts[m.nextBurst] as (typeof m.bursts)[number];
    m.nextBurst = (m.nextBurst + 1) % m.bursts.length;
    b.t = this.world.time;
    b.x = x;
    b.y = y;
    b.r = radius;
    if (!this.calm) this.lighting.flash(x, y, radius * 3.2, 0xff9a40, 0.45);
  }

  /**
   * The thief rat is easy to spot and to chase: a yellow outline, and the glow of the gems in its sack (the cyan of the
   * gems, stronger than theirs) lighting the ground around it. Other enemies sharing the image lose the outline.
   */
  private thiefLook(img: EnemyImage, e: Enemy): void {
    if (!e.def.flee) {
      if (img.rimmed) {
        img.preFX?.clear();
        img.rimmed = false;
      }
      return;
    }
    if (!img.rimmed) {
      img.preFX?.addGlow(THIEF_RIM, 3, 0, false, 0.1, 6);
      img.rimmed = true;
    }
    const pulse = this.calm ? 1 : 1 + 0.15 * Math.sin(this.world.time * 8);
    this.lighting.add(e.x, e.y - 4, 95 * pulse, GEM_GLOW, 0.9, 0.35);
  }

  /** The bell swings twice on a Badalada; any other boss winding up shakes. */
  private windupSway(e: Enemy): number {
    if (e.act !== BossAct.Windup) return 0;
    const ab = bossAbility(e);
    if (!ab) return 0;
    if (ab.kind === 'toll') return Math.sin((1 - Math.max(0, e.actT) / ab.windup) * Math.PI * 4) * 0.22;
    return Math.sin(this.world.time * 18) * 0.18;
  }

  /** Remembers the enemy shot nearest the hero before the step (a shot that lands is gone after it). */
  private noteNearShot(): void {
    const w = this.world;
    const list = w.enemyShots.active;
    this.nearShot = 1e9;
    for (let i = 0; i < list.length; i++) {
      const s = list[i] as (typeof list)[number];
      const d = Math.hypot(s.x - w.player.x, s.y - w.player.y);
      if (d < this.nearShot) {
        this.nearShot = d;
        this.nearCold = shotStyle(s) !== SHOT_PLAIN;
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
    if (e.dot > 0 && e.dotKind === 'bleed')
      sp.add(x, e.y + r * 0.2, 0, 20, 0.45, 8, ELEMENT_COLOR.shadow, SPARK.drop);
    else sp.add(x, e.y - r * 0.7, (sp.rand() - 0.5) * 16, -40, 0.7, 6, ELEMENT_COLOR.fire, SPARK.ember);
  }

  /** The hero healed: green crosses and motes of light rising from the hero, and the bar glows green (drawFx). */
  private healSpark(): void {
    const p = this.world.player;
    const sp = this.sparks;
    for (let i = 0; i < 2; i++)
      sp.add(
        p.x + (sp.rand() - 0.5) * 40,
        p.y - 18 - sp.rand() * 12,
        0,
        -60,
        0.7,
        7,
        HEAL_COLOR,
        SPARK.cross,
        true,
      );
    for (let i = 0; i < 3; i++)
      sp.add(
        p.x + (sp.rand() - 0.5) * 30,
        p.y + 6,
        (sp.rand() - 0.5) * 20,
        -45 - sp.rand() * 30,
        0.6,
        5,
        0xc8ffd0,
        SPARK.ember,
      );
  }

  /** The "+N" of recent healing, green, rising from the hero (only with the damage numbers on). */
  private showHealNumber(dt: number): void {
    const t = this.healText;
    this.healAge += dt;
    if (this.healAcc >= 1 && this.healAge > 0.5 && settings().damageNumbers) {
      this.healAge = 0;
      t.setText(`+${Math.round(this.healAcc)}`);
      this.healAcc = 0;
    }
    if (this.healAge > 0.9) {
      t.setVisible(false);
      if (!settings().damageNumbers) this.healAcc = 0;
      return;
    }
    const p = this.world.player;
    t.setVisible(true)
      .setPosition(p.x, p.y - 34 - this.healAge * 30)
      .setScale(this.numberScale)
      .setAlpha(Math.min(1, (0.9 - this.healAge) * 3));
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
    // The first Elo of a player's life is an event of its own (PX-11): longer slow motion and a screen that darkens.
    const first = !this.bigForgeDone && loadSave().elos.length === 0;
    this.bigForgeDone = true;
    this.slowUntil = this.time.now + (first ? FIRST_FORGE_SLOW_MS : FORGE_SLOW_MS);
    if (first) this.hud.firstForge(elo);
    sound.play('forge');
    this.moments.chest = w.time;
    this.moments.elo = true;
    this.rewardIcon.setTexture(`icon.${elo}`);
    if (!this.calm) this.lighting.flash(p.x, p.y, 520, color, 0.9);
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

  /**
   * The boss falls (PX-14): a short slow motion and a rain of gems and coins where it stood. Looks only; the drops and
   * their values come from the core.
   */
  private bossDeathShow(): void {
    this.slowUntil = this.time.now + 1100;
    const { x, y } = this.bossAt;
    const sp = this.sparks;
    for (let k = 0; k < 46; k++) {
      const a = sp.rand() * Math.PI * 2;
      const v = 60 + sp.rand() * 190;
      sp.add(
        x + (sp.rand() - 0.5) * 40,
        y - 30,
        Math.cos(a) * v,
        Math.sin(a) * v - 140,
        0.9 + sp.rand() * 0.6,
        6,
        k % 2 ? 0xffd36a : 0x6ab8ff,
        SPARK.confetti,
        true,
      );
    }
    sp.add(x, y, 0, 0, 0.7, 90, 0xffffff, SPARK.ring, true);
    if (!this.calm) this.lighting.flash(x, y, 700, 0xfff0d0, 0.8);
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

  /**
   * The ring of light for a level gained: held until the choice is made (the overlay would hide it), then played
   * as a pixel sprite from `drawFx` (PF-06). Nothing is created per level.
   */
  private levelUpPulse(now = false): void {
    if (now) this.moments.level = this.world.time;
    else this.levelRingPending = true;
  }

  /** Plays a held level ring once the level-up overlay is gone. */
  private releaseLevelRing(): void {
    if (!this.levelRingPending || this.world.pendingLevelUps > 0 || this.scene.isActive(SCENES.levelUp))
      return;
    this.levelRingPending = false;
    this.moments.level = this.world.time;
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
    // A new longest run for this hero (not the very first one): shown on the end screen (PX-16).
    const before = loadSave().records[w.character]?.bestTime ?? 0;
    this.newBest = before > 0 && w.time > before;
    const recorded = recordRun(summarizeRun(w));
    // Anonymous counts: how runs end, and the minute a defeat happens (PX-17 calibration).
    const how = won ? 'won' : w.abandoned ? 'abandoned' : 'lost';
    track(`end/${how}/${w.stageId}/${w.character}`, `${Math.floor(w.time / 60)} min`);
    if (how === 'lost') track(`death-minute/${w.stageId}/${Math.floor(w.time / 60)}`);
    this.newElos = recorded.elos;
    this.newAchievements = recorded.achievements;
    this.treasure = recorded.treasure;
    return opens;
  }

  /** "Continuar a vigília" (from the end screen): the run goes on; what it adds is recorded when it ends. */
  startVigil(): void {
    const w = this.world;
    if (w.state !== 'won' || w.endless) return;
    this.vigilBefore = summarizeRun(w);
    w.continueVigil();
    music.play(this, STAGE_MUSIC[w.stageId]);
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

  /**
   * The hero's strip: the fall on the last death (then lying still), a stagger for a moment after a hit, else the
   * walk or idle loop. Hurt and fall are driven by frame from real time, so they never allocate.
   */
  private heroPose(loop: string): void {
    const ps = this.playerSprite;
    const now = this.time.now;
    const fall = this.fallAtMs >= 0 ? `${this.heroKey}.fall` : '';
    const hurtAge = (now - this.hurtAtMs) / 1000;
    if (fall && this.textures.exists(fall)) {
      const f = Math.min(
        HERO_FALL.frames - 1,
        Math.floor(((now - this.fallAtMs) / 1000 / HERO_FALL.seconds) * HERO_FALL.frames),
      );
      ps.anims.stop();
      ps.setTexture(fall, f);
    } else if (hurtAge < HERO_HURT.seconds && this.textures.exists(`${this.heroKey}.hurt`)) {
      ps.anims.stop();
      ps.setTexture(
        `${this.heroKey}.hurt`,
        Math.min(HERO_HURT.frames - 1, Math.floor((hurtAge / HERO_HURT.seconds) * HERO_HURT.frames)),
      );
    } else ps.play(loop, true);
  }

  /** Desistir (from the Pausa): banks what the run earned and opens the end screen, titled as abandoned (CU-08). */
  abandonRun(): void {
    const w = this.world;
    if (w.state !== 'playing') return;
    w.abandon();
    w.events.length = 0;
    const unlocked = w.endless ? this.bankVigil() : this.bank();
    this.scene.stop(SCENES.pause);
    this.scene.launch(SCENES.end, {
      world: w,
      unlocked,
      newElos: this.newElos,
      newAchievements: this.newAchievements,
      vigilRecord: this.vigilRecord,
      record: this.newBest,
      treasure: this.treasure,
    });
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
    for (let iE = 0; iE < w.events.length; iE++) {
      const e = w.events[iE] as (typeof w.events)[number];
      switch (e.type) {
        case 'levelUp':
          // The very first level-up of the player's life is a small party (PX-12): own sound, light on the hero.
          if (!this.lessonsSeen.has('level')) {
            this.lessonsSeen.add('level');
            markLessonSeen('level');
            this.registry.set('firstLevelUp', true);
            sound.play('levelUpFirst');
            if (!this.calm) this.lighting.flash(w.player.x, w.player.y, 700, 0xffe08a, 0.8);
            this.sparks.burst(w.player.x, w.player.y, 18, 220, 8, 0xffd36a, SPARK.flake, 0.8, true);
          } else sound.play('levelUp');
          this.levelUpPulse();
          // With level-ups queued, the open LevelUp scene refreshes itself for the next one.
          if (!this.scene.isActive(SCENES.levelUp)) this.scene.launch(SCENES.levelUp, { world: w });
          break;
        case 'playerHit':
          sound.play('hurt');
          this.shake(120, 0.006);
          // The hero keeps their own colours, with only a faint warm flash for a tenth of a second (NF-05).
          if (this.nearCold && this.nearShot < 60)
            this.sparks.burst(w.player.x, w.player.y, 6, 150, 7, 0x7ac8ff, SPARK.flake, 0.45, true);
          this.hurtAtMs = this.time.now;
          this.playerSprite.setTint(TINT.heroHurt);
          this.time.delayedCall(100, () => this.playerSprite.clearTint());
          break;
        case 'burst':
          this.emberBurst(e.x, e.y, e.radius);
          break;
        case 'bossSpawned':
          sound.play('boss');
          music.play(this, 'boss');
          this.hud.announce(
            w.arena.on
              ? t.arenaClosed(t.enemies[w.stage.boss.id])
              : t.bossWarning(t.enemies[w.stage.boss.id]),
          );
          this.shake(400, 0.01);
          // The entrance (PX-14): the camera pulls back in the drawing only (the core's view stays, so spawning and
          // aiming do not change), the boss comes down on a web, and its name shows huge.
          this.bossIntroAt = w.time;
          this.hud.bossTitle(t.enemies[w.stage.boss.id]);
          if (!this.calm) {
            this.tweens.killTweensOf(this.camPull);
            const follow = (): void => {
              this.cameras.main.setZoom(this.baseZoom * this.camPull.k);
            };
            this.tweens.add({ targets: this.camPull, k: 0.8, duration: 500, onUpdate: follow });
            this.tweens.add({ targets: this.camPull, k: 1, delay: 1900, duration: 700, onUpdate: follow });
          }
          break;
        case 'eliteSpawned':
          sound.play('elite');
          this.tipAt = w.time; // the elite's own warning comes first; tips wait
          this.hud.announce(
            e.id in t.eliteHint ? t.eliteArrived(t.enemies[e.id], t.eliteHint[e.id] ?? '') : t.eliteWarning,
          );
          break;
        case 'thiefMark':
          sound.play('coins');
          break;
        case 'thiefSpawned':
          sound.play('elite');
          this.hud.announce(t.thiefWarning);
          break;
        case 'thiefEscaped':
          this.hud.announce(t.thiefEscaped, true);
          break;
        case 'chest': {
          sound.play('chest');
          this.hud.announce(e.reward ? t.chest.gained(describeUpgrade(e.reward).title) : t.chest.plain, true);
          this.moments.chest = w.time;
          this.moments.elo = false;
          this.rewardIcon.setTexture(e.reward ? describeUpgrade(e.reward).icon : 'pickup.chest');
          // The party: a short roulette that settles on the prize the core decided, and a golden light (PX-13).
          if (e.reward) this.hud.chestRoulette(describeUpgrade(e.reward).icon);
          if (!this.calm) this.lighting.flash(w.player.x, w.player.y, 500, 0xffd36a, 0.7);
          break;
        }
        case 'weaponAdded':
          // A new weapon: its name at the top and a soft light on the hero, so the first blow is easy to find (PX-10).
          this.hud.announce(t.levelUp.newWeapon(t.weapons[e.id].name), true);
          if (!this.calm) this.lighting.flash(w.player.x, w.player.y, 260, 0xffe9a8, 0.45);
          break;
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
            if (!this.calm) this.lighting.flash(w.player.x, w.player.y, 900, 0xfff0d0, 0.7);
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
          if (!this.calm) this.lighting.flash(w.player.x, w.player.y, 900, 0xfff0d0, 0.7);
          this.levelUpPulse(true);
          break;
        case 'won':
        case 'lost': {
          sound.play(e.type);
          if (e.type === 'lost') this.fallAtMs = this.time.now;
          else if (!w.endless) this.bossDeathShow();
          const unlocked = w.endless ? this.bankVigil() : this.bank();
          this.time.delayedCall(900, () =>
            this.scene.launch(SCENES.end, {
              world: w,
              unlocked,
              newElos: this.newElos,
              newAchievements: this.newAchievements,
              vigilRecord: this.vigilRecord,
              record: this.newBest,
              treasure: this.treasure,
            }),
          );
          break;
        }
      }
    }
    w.events.length = 0;
  }
}
