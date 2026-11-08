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
    const stage = world.stage;
    const seg = segmentAt(world.time, stage.waves);
    this.timer -= dt;
    while (this.timer <= 0) {
      this.timer += seg.interval;
      for (let i = 0; i < seg.batch && world.enemies.size < config.enemies.maxActive; i++) {
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
}
