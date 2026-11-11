import { closeArena } from './arena';
import { config } from '../data/config';
import type { WaveSegment } from '../data/waves';
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies';
import { spawnOnRing, type Enemy } from './enemies';
import { riseAt } from './marks';
import { playtest } from './meta';
import { spawnPoint } from './terrain';
import type { World } from './world';

/** The segment active at time `t` (the last one that has started). */
export function segmentAt(t: number, waves: readonly WaveSegment[]): WaveSegment {
  let seg = waves[0] as WaveSegment;
  for (const w of waves) if (w.from <= t) seg = w;
  return seg;
}

/**
 * When the boss arrives the common crowd leaves the field (NE-05): elites stay, nothing drops, and the fight is the
 * hero against the boss and its trickle of escorts, so it can last 30 to 45 s instead of a race against the 9:00
 * wave.
 */
export function clearCrowd(world: World): void {
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.dead || e.def.elite || e.def.boss) continue;
    e.dead = e.vanished = true;
  }
  // Nobody about to rise, and no shot in the air, either.
  world.marks.clear();
  world.enemyShots.clear();
}

/** Time-driven spawner for the world's stage: batches on an interval, elites on schedule, boss at the end. */
export class Spawner {
  private timer = 0;
  private nextElite = 0;
  bossSpawned = false;
  /** Match time of each stage special's next one (StageDef `specials`), filled on the first update. */
  private nextSpecial: number[] = [];
  private readonly at = { x: 0, y: 0 };

  update(world: World, dt: number): void {
    if (world.endless) return this.vigil(world, dt);
    const stage = world.stage;
    // In test mode the boss comes early; the crowd after it is the boss fight's own trickle, as in a real run.
    const seg =
      this.bossSpawned && playtest.bossAt !== null
        ? (stage.waves[stage.waves.length - 1] as WaveSegment)
        : segmentAt(world.time, stage.waves);
    world.enemyDamage = seg.damage;
    this.timer -= dt;
    while (this.timer <= 0) {
      this.timer += seg.interval;
      const batch = this.batchSize(world, seg.batch);
      for (let i = 0; i < batch && world.enemies.size < config.enemies.maxActive; i++)
        this.send(world, this.capped(world, world.rng.weighted(seg.enemies).id, seg), seg.hpMult);
    }
    const elite = stage.elites[this.nextElite];
    if (elite && world.time >= elite.at) {
      this.nextElite++;
      this.send(world, elite.id, seg.hpMult, true);
      world.events.push({ type: 'eliteSpawned' });
    }
    if (!this.bossSpawned) this.specials(world, seg.hpMult);
    if (!this.bossSpawned && world.time >= (playtest.bossAt ?? stage.boss.at)) {
      this.bossSpawned = true;
      clearCrowd(world);
      world.boss = spawnOnRing(world, stage.boss.id);
      const arena = world.boss.def.arena;
      if (arena) closeArena(world, arena);
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
    world.enemyDamage = seg.damage * (1 + v.damagePerMinute * min);
    const base = seg.batch + Math.floor(v.batchPerMinute * min);
    this.timer -= dt;
    while (this.timer <= 0) {
      this.timer += Math.max(v.minInterval, seg.interval - v.intervalPerMinute * min);
      const batch = this.batchSize(world, base);
      for (let i = 0; i < batch && world.enemies.size < config.enemies.maxActive; i++)
        this.send(world, this.capped(world, world.rng.weighted(seg.enemies).id, seg), hp);
    }
    this.specials(world, hp);
    if (world.time - world.vigilStart >= (this.vigilElites + 1) * v.eliteEvery) {
      const elites = world.stage.elites;
      const elite = elites[this.vigilElites % elites.length];
      this.vigilElites++;
      if (elite) {
        this.send(world, elite.id, hp, true);
        world.events.push({ type: 'eliteSpawned' });
      }
    }
  }

  /** One enemy on the stage's spawn ring; a spot inside the view gets a spawn mark first (FT-02). */
  private send(world: World, id: EnemyId, hpMult: number, force = false): void {
    spawnPoint(world, null, this.at);
    riseAt(world, id, this.at.x, this.at.y, hpMult, force);
  }

  /** `id`, or the segment's first (basic) enemy when `id` is already at its def's `max`. */
  private capped(world: World, id: EnemyId, seg: WaveSegment): EnemyId {
    const max = (ENEMIES[id] as EnemyDef).max;
    return max !== undefined && (world.alive[id] ?? 0) >= max ? (seg.enemies[0]?.id ?? id) : id;
  }

  /** The stage's scheduled specials (`specials`): one every `every` s from `from`, each waiting under its `max`. */
  private specials(world: World, hpMult: number): void {
    const list = world.stage.specials;
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const sp = list[i] as (typeof list)[number];
      const next = this.nextSpecial[i] ?? sp.from;
      this.nextSpecial[i] = next;
      if (world.time < next) continue;
      const max = (ENEMIES[sp.id] as EnemyDef).max;
      if (max !== undefined && (world.alive[sp.id] ?? 0) >= max) continue;
      this.nextSpecial[i] = Math.max(next, world.time) + sp.every;
      this.send(world, sp.id, hpMult);
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
