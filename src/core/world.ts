import { config } from '../data/config';
import { createEnemy, sweepDeadEnemies, updateEnemies, type Enemy } from './enemies';
import type { GameEvent } from './events';
import { Rng, type Vec2 } from './math';
import { createPlayer, updatePlayer, type Player } from './player';
import { Pool } from './pool';
import { SpatialHash } from './spatialHash';
import { Spawner } from './waves';

export type WorldState = 'playing' | 'levelup' | 'won' | 'lost';

/** The whole match state. Pure logic: the render layer reads it, never writes it. */
export class World {
  time = 0;
  kills = 0;
  state: WorldState = 'playing';
  readonly rng: Rng;
  readonly player: Player = createPlayer();
  readonly enemies = new Pool<Enemy>(createEnemy, 256);
  readonly enemyHash = new SpatialHash(64);
  readonly spawner = new Spawner();
  boss: Enemy | null = null;
  /** Drained by the renderer each frame. */
  readonly events: GameEvent[] = [];
  /** Visible world size (set by the renderer); spawning happens just outside it. */
  readonly view = { w: 480, h: 800 };
  /** Reusable query buffer, so per-frame code never allocates. */
  readonly scratch: number[] = [];

  constructor(seed?: number) {
    this.rng = new Rng(seed);
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
    sweepDeadEnemies(this);

    if (this.player.hp <= 0) this.end('lost');
  }

  /** Hook for every hit (damage numbers come later). */
  onEnemyDamaged(_e: Enemy, _amount: number): void {}

  onEnemyKilled(e: Enemy): void {
    this.kills++;
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
