import { BOSS, WAVES, type WaveSegment } from '../data/waves';
import { config } from '../data/config';
import { spawnOnRing } from './enemies';
import type { World } from './world';

/** The segment active at time `t` (the last one that has started). */
export function segmentAt(t: number, waves: readonly WaveSegment[] = WAVES): WaveSegment {
  let seg = waves[0] as WaveSegment;
  for (const w of waves) if (w.from <= t) seg = w;
  return seg;
}

/** Time-driven spawner: batches on an interval, more and tougher as time goes on, boss at the end. */
export class Spawner {
  private timer = 0;
  bossSpawned = false;

  update(world: World, dt: number): void {
    const seg = segmentAt(world.time);
    this.timer -= dt;
    while (this.timer <= 0) {
      this.timer += seg.interval;
      for (let i = 0; i < seg.batch && world.enemies.size < config.enemies.maxActive; i++) {
        spawnOnRing(world, world.rng.weighted(seg.enemies).id, seg.hpMult);
      }
    }
    if (!this.bossSpawned && world.time >= BOSS.at) {
      this.bossSpawned = true;
      world.boss = spawnOnRing(world, BOSS.id);
      world.events.push({ type: 'bossSpawned' });
    }
  }
}
