import { config } from '../data/config';
import type { PassiveId } from '../data/upgrades';
import { STARTING_WEAPON, type WeaponId } from '../data/weapons';
import {
  addDamageNumber,
  createDamageNumber,
  createSlash,
  updateEffects,
  type DamageNumber,
  type Slash,
} from './effects';
import { createEnemy, sweepDeadEnemies, updateEnemies, type Enemy } from './enemies';
import type { GameEvent } from './events';
import { Rng, type Vec2 } from './math';
import { createPlayer, updatePlayer, type Player } from './player';
import { Pool } from './pool';
import { createProjectile, updateProjectiles, type Projectile } from './projectiles';
import { SpatialHash } from './spatialHash';
import { applyUpgrade, rollUpgrades, type UpgradeOption } from './upgrades';
import { Spawner } from './waves';
import { updateWeapons, type OwnedWeapon } from './weapons';
import { createGem, dropGem, updateGems, type Gem } from './xp';

export type WorldState = 'playing' | 'levelup' | 'won' | 'lost';

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
  state: WorldState = 'playing';
  readonly rng: Rng;
  readonly player: Player = createPlayer();
  readonly enemies = new Pool<Enemy>(createEnemy, 256);
  readonly enemyHash = new SpatialHash(64);
  readonly projectiles = new Pool<Projectile>(createProjectile, 64);
  readonly gems = new Pool<Gem>(createGem, 128);
  readonly slashes = new Pool<Slash>(createSlash, 4);
  readonly damageNumbers = new Pool<DamageNumber>(createDamageNumber, 64);
  readonly weapons: OwnedWeapon[] = [];
  readonly spawner = new Spawner();
  boss: Enemy | null = null;
  /** Drained by the renderer each frame. */
  readonly events: GameEvent[] = [];
  /** Visible world size (set by the renderer); spawning happens just outside it. */
  readonly view = { w: 480, h: 800 };
  /** Reusable query buffer, so per-frame code never allocates. */
  readonly scratch: number[] = [];
  readonly targetsScratch: number[] = [];

  constructor(seed?: number) {
    this.rng = new Rng(seed);
    this.addWeapon(STARTING_WEAPON);
  }

  addWeapon(id: WeaponId): void {
    this.weapons.push({ id, level: 1, timer: 0 });
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
    this.spawner.update(this, dt);
    updateEnemies(this, dt);
    updateWeapons(this, dt);
    updateProjectiles(this, dt);
    sweepDeadEnemies(this);
    updateGems(this, dt);
    updateEffects(this, dt);

    if (this.player.hp <= 0) this.end('lost');
    else if (this.state === 'playing' && this.pendingLevelUps > 0) this.openLevelUp();
  }

  /** Picks one of `upgradeOptions`. Opens the next choice if more level-ups are queued. */
  chooseUpgrade(index: number): void {
    const opt = this.upgradeOptions[index];
    if (this.state !== 'levelup' || !opt) return;
    applyUpgrade(this, opt);
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

  onEnemyDamaged(e: Enemy, amount: number): void {
    addDamageNumber(this, e.x, e.y - e.def.radius, amount);
  }

  onEnemyKilled(e: Enemy): void {
    this.kills++;
    if (e.def.xp > 0) dropGem(this, e.x, e.y, e.def.xp);
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
