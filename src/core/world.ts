import { config, type StatKey, type Stats } from '../data/config';
import type { PassiveId } from '../data/upgrades';
import { CHARACTERS, type CharacterId } from '../data/characters';
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
import { createEnemy, sweepDeadEnemies, updateEnemies, type Enemy } from './enemies';
import type { GameEvent } from './events';
import { Rng, type Vec2 } from './math';
import type { Charges, RunBonuses } from './meta';
import { createPickup, dropPickup, maybeDropRandom, updatePickups, type Pickup } from './pickups';
import { createPlayer, updatePlayer, type Player } from './player';
import { Pool } from './pool';
import { createProjectile, updateProjectiles, type Projectile } from './projectiles';
import { SpatialHash } from './spatialHash';
import { applyUpgrade, banishKey, rollUpgrades, type UpgradeOption } from './upgrades';
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

/** The whole match state. Pure logic: the render layer reads it, never writes it. */
export class World {
  time = 0;
  kills = 0;
  level = 1;
  xp = 0;
  pendingLevelUps = 0;
  /** The choices on screen while `state === 'levelup'`. */
  upgradeOptions: UpgradeOption[] = [];
  readonly passives: Partial<Record<PassiveId, number>> = {};
  /** Gold picked up this run (banked into the save when the run ends). */
  gold = 0;
  /** Uses left of the level-up helpers. */
  readonly charges: Charges = { ...config.charges };
  /** Upgrades removed from this run's level-up pool, as `banishKey`s. */
  readonly banished = new Set<string>();
  state: WorldState = 'playing';
  readonly rng: Rng;
  readonly player: Player = createPlayer();
  readonly enemies = new Pool<Enemy>(createEnemy, 256);
  readonly enemyHash = new SpatialHash(64);
  readonly projectiles = new Pool<Projectile>(createProjectile, 64);
  readonly gems = new Pool<Gem>(createGem, 128);
  readonly pickups = new Pool<Pickup>(createPickup, 8);
  readonly slashes = new Pool<Slash>(createSlash, 4);
  readonly bolts = new Pool<Bolt>(createBolt, 16);
  readonly zones = new Pool<Zone>(createZone, 16);
  readonly puffs = new Pool<Puff>(createPuff, 32);
  /** Seconds left of Sopro de Geada (enemies frozen). */
  freeze = 0;
  readonly damageNumbers = new Pool<DamageNumber>(createDamageNumber, 64);
  readonly weapons: OwnedWeapon[] = [];
  readonly spawner = new Spawner();
  readonly character: CharacterId;
  readonly stageId: StageId;
  readonly stage: StageDef;
  boss: Enemy | null = null;
  /** Drained by the renderer each frame. */
  readonly events: GameEvent[] = [];
  /** Visible world size (set by the renderer); spawning happens just outside it. */
  readonly view = { w: 480, h: 800 };
  /** Reusable query buffer, so per-frame code never allocates. */
  readonly scratch: number[] = [];
  readonly targetsScratch: number[] = [];

  constructor(seed?: number, setup: RunSetup = {}) {
    this.rng = new Rng(seed);
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
    }
    this.player.hp = st.maxHp;
    this.addWeapon(hero.weapon);
  }

  hasWeapon(id: WeaponId): boolean {
    return this.weapons.some((w) => w.id === id);
  }

  addWeapon(id: WeaponId): void {
    this.weapons.push({ id, level: 1, timer: 0, damage: 0, since: this.time });
  }

  setView(w: number, h: number): void {
    this.view.w = w;
    this.view.h = h;
  }

  step(dt: number, input: Vec2): void {
    if (this.state !== 'playing') return;
    dt = Math.min(dt, config.maxDt);
    this.time += dt;
    updatePlayer(this.player, input, dt);
    if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
    this.spawner.update(this, dt);
    updateEnemies(this, dt);
    updateWeapons(this, dt);
    updateZones(this, dt);
    updateProjectiles(this, dt);
    sweepDeadEnemies(this);
    updateGems(this, dt);
    updatePickups(this);
    updateEffects(this, dt);

    if (this.player.hp <= 0) this.end('lost');
    else if (this.state === 'playing' && this.pendingLevelUps > 0) this.openLevelUp();
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
    if (this.state !== 'levelup' || this.charges.reroll <= 0) return;
    this.charges.reroll--;
    this.upgradeOptions = rollUpgrades(this);
  }

  /** Pular: gives up this level-up's choice. */
  skipLevelUp(): void {
    if (this.state !== 'levelup' || this.charges.skip <= 0) return;
    this.charges.skip--;
    this.finishLevelUp();
  }

  /** Banir: the option never shows up again this run; the choice is rolled again without it. */
  banish(index: number): void {
    const opt = this.upgradeOptions[index];
    if (this.state !== 'levelup' || this.charges.banish <= 0 || !opt) return;
    const key = banishKey(opt);
    if (!key) return;
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
    this.kills++;
    addPuff(this, e.x, e.y, e.def.radius, 'death');
    if (e.def.xp > 0) dropGem(this, e.x, e.y, e.def.xp);
    if (e.def.elite) dropPickup(this, 'chest', e.x, e.y);
    else if (!e.def.boss) maybeDropRandom(this, e.x, e.y);
    if (e === this.boss) {
      this.boss = null;
      this.end('won');
    }
  }

  private end(state: 'won' | 'lost'): void {
    this.state = state;
    this.events.push({ type: state });
  }
}
