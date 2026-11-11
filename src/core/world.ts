import { config, type StatKey, type Stats } from '../data/config';
import type { PassiveId } from '../data/upgrades';
import { CHARACTERS, type CharacterId } from '../data/characters';
import type { EnemyId } from '../data/enemies';
import { STAGES, type StageDef, type StageId } from '../data/stages';
import { WEAPONS, type WeaponId } from '../data/weapons';
import {
  addDamageNumber,
  createBolt,
  addPuff,
  createDamageNumber,
  createPuff,
  createSlash,
  updateEffects,
  type Bolt,
  type DamageNumber,
  type Puff,
  type Slash,
} from './effects';
import { createEnemy, spriteOf, sweepDeadEnemies, updateEnemies, type Enemy } from './enemies';
import { createEnemyShot, updateEnemyShots, type EnemyShot, type HurtSource } from './enemyShots';
import { addBurst, createMark, updateMarks, type Mark } from './marks';
import { updateShatters } from './elos';
import type { GameEvent } from './events';
import { Rng, type Vec2 } from './math';
import type { Charges, RunBonuses } from './meta';
import { createPickup, dropLoot, dropPickup, maybeDropRandom, updatePickups, type Pickup } from './pickups';
import { createPlayer, updatePlayer, type Player } from './player';
import { Pool } from './pool';
import { createProjectile, updateProjectiles, type Projectile } from './projectiles';
import { SpatialHash } from './spatialHash';
import {
  applyUpgrade,
  banishKey,
  canBanish,
  canReroll,
  candidates,
  rollUpgrades,
  type UpgradeOption,
} from './upgrades';
import { blockCircle } from './terrain';
import { holdInArena, groundSlow, openArena } from './arena';
import { Spawner } from './waves';
import { updateWeapons, type OwnedWeapon } from './weapons';
import { createZone, updateZones, type Zone } from './zones';
import { createGem, dropGem, updateGems, type Gem } from './xp';

export type WorldState = 'playing' | 'levelup' | 'won' | 'lost';

/** How a run starts: who, where, and what the shop gives. */
export interface RunSetup {
  character?: CharacterId;
  stage?: StageId;
  bonuses?: RunBonuses;
}

/** Reused input of a hero on ice. */
const ICE_INPUT = { x: 0, y: 0 };

/** The whole match state. Pure logic: the render layer reads it, never writes it. */

export class World {
  time = 0;
  kills = 0;
  /** Kills by enemy type this run (bestiary and achievements). */
  readonly killsBy: Partial<Record<EnemyId, number>> = {};
  /** Enemy types that appeared this run, even if never killed. */
  readonly seen: Partial<Record<EnemyId, true>> = {};
  /** Biggest single weapon hit this run (bombs don't count). */
  bestHit = 0;
  /** Match time of the first hit taken (-1 until then). */
  firstHitAt = -1;
  /** Next enemy uid: per world, so a seed always plays out the same. */
  nextUid = 1;
  level = 1;
  xp = 0;
  pendingLevelUps = 0;
  /** The choices on screen while `state === 'levelup'`. */
  upgradeOptions: UpgradeOption[] = [];
  readonly passives: Partial<Record<PassiveId, number>> = {};
  /** Bumped whenever weapons or passives change, so the renderer redraws the build only then. */
  buildRev = 0;
  /** Gold picked up this run (banked into the save when the run ends). */
  gold = 0;
  /** Uses left of the level-up helpers. */
  readonly charges: Charges = { ...config.charges };
  /** Upgrades removed from this run's level-up pool, as `banishKey`s. */
  readonly banished = new Set<string>();
  /** Base weapons whose ready Elo was already announced this run. */
  /** Noite Sem Fim: the run went on after the boss fell, from `vigilStart` (match time). */
  endless = false;
  vigilStart = 0;
  /** Multiplies enemy contact damage (grows during the Noite Sem Fim). */
  enemyDamage = 1;
  /** Segunda Chance: times the hero can still get up this run. */
  revives = 0;
  /** Bênçãos de Yah taken (reward cards, +might each). */
  blessings = 0;
  /** Match time when the level-up pool (weapons and passives) first ran short of a full choice; -1 = never. */
  poolShortAt = -1;
  /** Level at that moment. */
  poolShortLevel = 0;
  state: WorldState = 'playing';
  /** The run's seed (shown on the F3 panel), so a run seen in the game can be replayed. */
  readonly seed: number;
  readonly rng: Rng;
  readonly player: Player = createPlayer();
  readonly enemies = new Pool<Enemy>(createEnemy, 256);
  readonly enemyHash = new SpatialHash(64);
  readonly projectiles = new Pool<Projectile>(createProjectile, 64);
  readonly gems = new Pool<Gem>(createGem, 128);
  readonly pickups = new Pool<Pickup>(createPickup, 8);
  readonly slashes = new Pool<Slash>(createSlash, 4);
  readonly bolts = new Pool<Bolt>(createBolt, 16);
  /** Nevasca's shatters waiting to burst this step (x, y, radius, damage each), and who deals them. */
  readonly shatters: number[] = [];
  readonly shatterBy: OwnedWeapon[] = [];
  readonly zones = new Pool<Zone>(createZone, 16);
  readonly puffs = new Pool<Puff>(createPuff, 32);
  /** Shots thrown by enemies (FT-03) and marks on the ground (FT-02), each in its own capped pool. */
  readonly enemyShots = new Pool<EnemyShot>(createEnemyShot, 16);
  readonly marks = new Pool<Mark>(createMark, 16);
  /** How many of each enemy type are alive (the spawner keeps each under its def's `max`). */
  readonly alive: Partial<Record<EnemyId, number>> = {};
  /** Damage the hero took this run, by where it came from (the sim's "DANO POR FONTE"). */
  readonly hurtBy: Record<HurtSource, number> = { contact: 0, shot: 0, leap: 0, ground: 0, boss: 0 };
  /** Seconds left of Sopro de Geada (enemies frozen). */
  freeze = 0;
  /** Seconds left of the Elixir (weapons cool down faster, config.pickups.elixirCooldown). */
  haste = 0;
  readonly damageNumbers = new Pool<DamageNumber>(createDamageNumber, 64);
  readonly weapons: OwnedWeapon[] = [];
  readonly spawner = new Spawner();
  readonly character: CharacterId;
  readonly stageId: StageId;
  readonly stage: StageDef;
  boss: Enemy | null = null;
  /** A boss's arena (FT-08): while `on`, the hero is held between y0 and y1 (core/arena.ts). */
  readonly arena = { on: false, y0: 0, y1: 0 };
  /** Drained by the renderer each frame. */
  readonly events: GameEvent[] = [];
  /**
   * Running counts of frequent things (too many for events): the renderer compares them between frames
   * (sounds). Never reset by the core.
   */
  readonly tally = { attacks: 0, hits: 0, gems: 0, kills: 0 };
  /** Visible world size (set by the renderer); spawning happens just outside it. */
  readonly view = { w: 480, h: 800 };
  /** Reusable query buffer, so per-frame code never allocates. */
  readonly scratch: number[] = [];
  readonly targetsScratch: number[] = [];
  /** New damage numbers the current area hit may still show (set by area fires, Infinity otherwise). */
  numberBudget = Infinity;

  constructor(seed?: number, setup: RunSetup = {}) {
    this.seed = (seed ?? Date.now()) >>> 0;
    this.rng = new Rng(this.seed);
    this.character = setup.character ?? 'aldo';
    this.stageId = setup.stage ?? 'valmor';
    this.stage = STAGES[this.stageId];
    const hero = CHARACTERS[this.character];
    const st = this.player.stats;
    const add = (stats: Partial<Stats>) => {
      for (const k of Object.keys(stats) as StatKey[]) st[k] += stats[k] ?? 0;
    };
    add(hero.stats);
    if (setup.bonuses) {
      add(setup.bonuses.stats);
      Object.assign(this.charges, setup.bonuses.charges);
      this.revives = setup.bonuses.revives;
    }
    this.player.hp = st.maxHp;
    this.addWeapon(hero.weapon);
  }

  hasWeapon(id: WeaponId): boolean {
    return this.weapons.some((w) => w.id === id);
  }

  addWeapon(id: WeaponId): void {
    this.weapons.push({
      id,
      level: 1,
      timer: 0,
      damage: 0,
      since: this.time,
      swings: 0,
      after: 0,
      afterX: 0,
      afterY: 0,
      stacks: 0,
      stackTime: 0,
      aim: 0,
      aimReach: 0,
      levelAt: this.time,
      levelDamage: 0,
      prevDps: 0,
    });
  }

  setView(w: number, h: number): void {
    this.view.w = w;
    this.view.h = h;
  }

  step(dt: number, input: Vec2): void {
    if (this.state !== 'playing') return;
    dt = Math.min(dt, config.maxDt);
    this.time += dt;
    // On the Lobo Velho's ice the hero is slower (FT-08).
    const ice = this.marks.size > 0 ? groundSlow(this) : 1;
    if (ice < 1) {
      ICE_INPUT.x = input.x * ice;
      ICE_INPUT.y = input.y * ice;
      input = ICE_INPUT;
    }
    updatePlayer(this.player, input, dt);
    blockCircle(this, this.player, config.player.radius);
    holdInArena(this, config.player.radius);
    if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
    if (this.haste > 0) this.haste = Math.max(0, this.haste - dt);
    this.spawner.update(this, dt);
    updateMarks(this, dt);
    updateEnemies(this, dt);
    updateWeapons(this, dt);
    updateZones(this, dt);
    updateProjectiles(this, dt);
    updateEnemyShots(this, dt);
    updateShatters(this);
    sweepDeadEnemies(this);
    updateGems(this, dt);
    updatePickups(this);
    updateEffects(this, dt);
    if (this.firstHitAt < 0 && this.player.hitsTaken > 0) this.firstHitAt = this.time;

    // The boss may have fallen this step: victory wins over a simultaneous death.
    if (this.state !== 'playing') return;
    if (this.player.hp <= 0) {
      if (this.revives > 0) this.revive();
      else this.end('lost');
    } else if (this.pendingLevelUps > 0) this.openLevelUp();
  }

  /** Picks one of `upgradeOptions`. Opens the next choice if more level-ups are queued. */
  chooseUpgrade(index: number): void {
    const opt = this.upgradeOptions[index];
    if (this.state !== 'levelup' || !opt) return;
    applyUpgrade(this, opt);
    this.finishLevelUp();
  }

  /** Trocar: new options for the same level-up. */
  reroll(): void {
    if (this.state !== 'levelup' || this.charges.reroll <= 0 || !canReroll(this)) return;
    this.charges.reroll--;
    this.upgradeOptions = rollUpgrades(this);
  }

  /** Pular: gives up this level-up's choice, for a little gold. */
  skipLevelUp(): void {
    if (this.state !== 'levelup' || this.charges.skip <= 0) return;
    this.charges.skip--;
    this.gold += config.skipGold;
    this.finishLevelUp();
  }

  /** Banir: the option never shows up again this run; the choice is rolled again without it. */
  banish(index: number): void {
    const opt = this.upgradeOptions[index];
    if (this.state !== 'levelup' || this.charges.banish <= 0 || !opt) return;
    const key = banishKey(opt);
    if (!key || !canBanish(this, opt)) return;
    this.charges.banish--;
    this.banished.add(key);
    this.upgradeOptions = rollUpgrades(this);
  }

  private finishLevelUp(): void {
    this.pendingLevelUps--;
    this.state = 'playing';
    if (this.pendingLevelUps > 0) this.openLevelUp();
    else this.upgradeOptions = [];
  }

  private openLevelUp(): void {
    this.state = 'levelup';
    if (this.poolShortAt < 0 && candidates(this).length < config.xp.choices) {
      this.poolShortAt = this.time;
      this.poolShortLevel = this.level;
    }
    this.upgradeOptions = rollUpgrades(this);
    this.events.push({ type: 'levelUp' });
  }

  onEnemyDamaged(e: Enemy, amount: number, source: OwnedWeapon | null): void {
    // Auras and orbiting pieces hit constantly: their numbers would only bury the screen.
    const kind = source ? WEAPONS[source.id].kind : null;
    if (kind === 'aura' || kind === 'orbit') return;
    addDamageNumber(this, e.uid, e.x, e.y - e.def.radius, amount);
  }

  onEnemyKilled(e: Enemy): void {
    if (e.vanished) {
      addPuff(this, e.x, e.y, e.def.radius, 'death');
      return;
    }
    this.kills++;
    this.killsBy[e.type] = (this.killsBy[e.type] ?? 0) + 1;
    this.tally.kills++;
    addPuff(this, e.x, e.y, e.def.radius, 'death', spriteOf(e), this.player.x < e.x);
    const burst = e.def.burst;
    if (burst) {
      const hero = e.def.damage * burst.damage * this.enemyDamage * this.stage.mult.damage;
      addBurst(this, e.x, e.y, burst.radius, burst.delay, hero, e.maxHp * burst.foes);
    }
    if (e.def.xp > 0) dropGem(this, e.x, e.y, e.def.xp);
    if (e.carry > 0) dropGem(this, e.x, e.y, e.carry);
    const loot = e.def.loot;
    if (e.def.elite || loot?.chest) dropPickup(this, 'chest', e.x, e.y);
    if (loot) dropLoot(this, loot, e.x, e.y);
    else if (!e.def.elite && !e.def.boss) maybeDropRandom(this, e.x, e.y);
    if (e === this.boss) {
      this.boss = null;
      openArena(this);
      this.end('won');
    }
  }

  /** Seconds of vigil so far (0 outside the Noite Sem Fim). */
  get vigilTime(): number {
    return this.endless ? this.time - this.vigilStart : 0;
  }

  /** "Continuar a vigília": after a victory, the run goes on with ever-growing waves until the hero falls. */
  continueVigil(): void {
    if (this.state !== 'won' || this.endless) return;
    this.endless = true;
    this.vigilStart = this.time;
    this.boss = null;
    this.state = 'playing';
  }

  /** Segunda Chance: back on their feet with part of their life, briefly untouchable. */
  private revive(): void {
    this.revives--;
    this.player.hp = this.player.stats.maxHp * config.revive.hp;
    this.player.iframes = config.revive.iframes;
    this.events.push({ type: 'revived' });
  }

  private end(state: 'won' | 'lost'): void {
    if (this.state === 'won' || this.state === 'lost') return;
    this.state = state;
    this.events.push({ type: state });
  }
}
