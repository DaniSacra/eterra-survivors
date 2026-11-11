import { describe, expect, it } from 'vitest';
import { spawnEnemy, sweepDeadEnemies } from '../../src/core/enemies';
import { dropGem } from '../../src/core/xp';
import { ENEMIES } from '../../src/data/enemies';
import { bareWorld, still } from './helpers';

function run(w: ReturnType<typeof bareWorld>, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) w.step(1 / 60, still);
}

describe('thief rat (FT-10)', () => {
  it('is slower than the hero, so it can be caught', () => {
    expect(ENEMIES.thiefRat.speed).toBeLessThan(150);
  });

  it('runs from the hero, takes the gems it crosses, and gives them back in one gem when it falls', () => {
    const w = bareWorld();
    w.player.hp = w.player.stats.maxHp = 1e9;
    const t = spawnEnemy(w, 'thiefRat', 150, 0);
    dropGem(w, 190, 40, 3);
    dropGem(w, 200, 60, 4);
    run(w, 4);
    expect(t.carry).toBe(7);
    expect(w.gems.size).toBe(0);
    // Far from the hero now.
    expect(Math.hypot(t.x, t.y)).toBeGreaterThan(150);
    t.dead = true;
    sweepDeadEnemies(w);
    expect(w.gems.size).toBe(1);
    expect((w.gems.active[0] as { value: number }).value).toBe(7);
    expect(w.pickups.active.some((p) => p.type === 'chest')).toBe(true);
    expect(w.kills).toBe(1);
  });

  it('after its time it runs off and is gone with what it took: no gem, no chest', () => {
    const w = bareWorld();
    w.player.hp = w.player.stats.maxHp = 1e9;
    const t = spawnEnemy(w, 'thiefRat', 150, 0);
    dropGem(w, 190, 40, 3);
    run(w, ENEMIES.thiefRat.flee.life + 8);
    expect(w.alive.thiefRat).toBe(0);
    expect(t.dead).toBe(true);
    expect(w.gems.size).toBe(0);
    expect(w.pickups.size).toBe(0);
    expect(w.kills).toBe(0);
    expect(w.events.some((e) => e.type === 'thiefEscaped')).toBe(true);
  });

  it('does no harm by touch', () => {
    const w = bareWorld();
    spawnEnemy(w, 'thiefRat', 0, 0);
    run(w, 0.2);
    expect(w.player.hp).toBe(w.player.stats.maxHp);
  });
});
