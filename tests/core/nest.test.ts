import { describe, expect, it } from 'vitest';
import { spawnEnemy, sweepDeadEnemies, updateEnemies } from '../../src/core/enemies';
import { ENEMIES } from '../../src/data/enemies';
import { bareWorld, still } from './helpers';

/** Runs `seconds` of the world, no input. */
function run(w: ReturnType<typeof bareWorld>, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) w.step(1 / 60, still);
}

const count = (w: ReturnType<typeof bareWorld>, id: string) =>
  w.enemies.active.filter((e) => e.type === id && !e.dead).length;

describe('nest (FT-09)', () => {
  it('raises its spiders on its rhythm only while the hero is near, and stops at its total', () => {
    const w = bareWorld();
    w.player.hp = w.player.stats.maxHp = 1e9;
    const nest = spawnEnemy(w, 'spiderNest', 300, 0);
    nest.hp = nest.maxHp = 1e9;
    const n = ENEMIES.spiderNest.nest;
    // Far: nothing.
    nest.x = 700;
    nest.actT = 0;
    run(w, 6);
    expect(count(w, 'spider')).toBe(0);
    // Near: `count` per `every`.
    nest.x = 300;
    nest.actT = 0;
    run(w, 0.1);
    run(w, 1); // marks inside the view take a moment to rise
    expect(count(w, 'spider')).toBe(n.count);
    run(w, n.every * 2);
    expect(count(w, 'spider') + 0).toBeGreaterThanOrEqual(n.count * 2);
    // Never more than `total`.
    for (const e of w.enemies.active) if (e.type === 'spider') e.dead = e.vanished = true;
    sweepDeadEnemies(w);
    run(w, n.every * 10);
    expect(nest.spawned).toBe(n.total);
  });

  it('is capped at three and pays gold and an item when broken', () => {
    expect(ENEMIES.spiderNest.max).toBe(3);
    const w = bareWorld();
    const nest = spawnEnemy(w, 'spiderNest', 120, 0);
    nest.dead = true;
    sweepDeadEnemies(w);
    expect(w.pickups.active.some((p) => p.type === 'gold')).toBe(true);
    expect(w.pickups.size).toBeGreaterThan(1);
    expect(w.alive.spiderNest).toBe(0);
    void updateEnemies;
  });
});
