import { config } from '../data/config';
import type { WaveSegment } from '../data/waves';
import { spawnOnRing } from './enemies';
import type { World } from './world';

/** The segment active at time `t` (the last one that has started). */
export function segmentAt(t: number, waves: readonly WaveSegment[]): WaveSegment {
  let seg = waves[0] as WaveSegment;
  for (const w of waves) if (w.from <= t) seg = w;
  return seg;
}

/** Time-driven spawner for the world's stage: batches on an interval, elites on schedule, boss at the end. */
export class Spawner {
  private timer = 0;
  private nextElite = 0;
  bossSpawned = false;

  update(world: World, dt: number): void {
    if (world.endless) return this.vigil(world, dt);
    const stage = world.stage;
    const seg = segmentAt(world.time, stage.waves);
    this.timer -= dt;
    while (this.timer <= 0) {
      this.timer += seg.interval;
      const batch = this.batchSize(world, seg.batch);
      for (let i = 0; i < batch && world.enemies.size < config.enemies.maxActive; i++) {
        spawnOnRing(world, world.rng.weighted(seg.enemies).id, seg.hpMult);
      }
    }
    const elite = stage.elites[this.nextElite];
    if (elite && world.time >= elite.at) {
      this.nextElite++;
      spawnOnRing(world, elite.id, seg.hpMult);
      world.events.push({ type: 'eliteSpawned' });
    }
    if (!this.bossSpawned && world.time >= stage.boss.at) {
      this.bossSpawned = true;
      world.boss = spawnOnRing(world, stage.boss.id);
      world.events.push({ type: 'bossSpawned' });
    }
  }

  /** Noite Sem Fim: the last full wave of the stage, growing with every minute of vigil (config.vigil). */
  private vigil(world: World, dt: number): void {
    const v = config.vigil;
    const waves = world.stage.waves;
    // The last segment is the boss fight's trickle: the vigil grows from the one before it.
    const seg = waves[waves.length - 2] as WaveSegment;
    const min = (world.time - world.vigilStart) / 60;
    const hp = seg.hpMult * (1 + v.hpPerMinute * min);
    world.enemyDamage = 1 + v.damagePerMinute * min;
    const base = seg.batch + Math.floor(v.batchPerMinute * min);
    this.timer -= dt;
    while (this.timer <= 0) {
      this.timer += Math.max(v.minInterval, seg.interval - v.intervalPerMinute * min);
      const batch = this.batchSize(world, base);
      for (let i = 0; i < batch && world.enemies.size < config.enemies.maxActive; i++)
        spawnOnRing(world, world.rng.weighted(seg.enemies).id, hp);
    }
    if (world.time - world.vigilStart >= (this.vigilElites + 1) * v.eliteEvery) {
      const elites = world.stage.elites;
      const elite = elites[this.vigilElites % elites.length];
      this.vigilElites++;
      if (elite) {
        spawnOnRing(world, elite.id, hp);
        world.events.push({ type: 'eliteSpawned' });
      }
    }
  }

  /** A batch scaled by the stage's spawn density: the fraction becomes a chance of one more. */
  private batchSize(world: World, batch: number): number {
    const n = batch * world.stage.mult.spawn;
    const whole = Math.floor(n);
    return whole + (world.rng.next() < n - whole ? 1 : 0);
  }

  /** Elites sent so far in the vigil. */
  private vigilElites = 0;
}
