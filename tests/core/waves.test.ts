import { describe, expect, it } from 'vitest';
import { segmentAt } from '../../src/core/waves';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { BOSS, WAVES } from '../../src/data/waves';

describe('waves', () => {
  it('data is sorted, starts at 0 and references known enemies', () => {
    expect(WAVES[0]!.from).toBe(0);
    for (let i = 1; i < WAVES.length; i++) expect(WAVES[i]!.from).toBeGreaterThan(WAVES[i - 1]!.from);
    for (const w of WAVES) for (const e of w.enemies) expect(ENEMIES[e.id]).toBeDefined();
    expect(BOSS.at).toBe(config.matchDuration);
  });

  it('picks the segment that has started', () => {
    expect(segmentAt(0)).toBe(WAVES[0]);
    expect(segmentAt(WAVES[1]!.from + 0.1)).toBe(WAVES[1]);
    expect(segmentAt(99999)).toBe(WAVES[WAVES.length - 1]);
  });

  it('spawns more enemies over time', () => {
    const count = (seconds: number) => {
      const w = new World(1);
      w.time = seconds;
      w.player.stats.maxHp = w.player.hp = 1e9;
      for (let i = 0; i < 60 * 5; i++) w.spawner.update(w, 1 / 60);
      return w.enemies.size;
    };
    expect(count(500)).toBeGreaterThan(count(0) * 3);
  });

  it('never exceeds the enemy cap', () => {
    const w = new World(1);
    w.time = 550;
    for (let i = 0; i < 60 * 60; i++) w.spawner.update(w, 1 / 60);
    expect(w.enemies.size).toBeLessThanOrEqual(config.enemies.maxActive + 1);
  });

  it('spawns the boss once at the end and killing it wins', () => {
    const w = new World(1);
    w.time = BOSS.at;
    w.player.stats.maxHp = w.player.hp = 1e9;
    w.step(1 / 60, { x: 0, y: 0 });
    w.step(1 / 60, { x: 0, y: 0 });
    expect(w.enemies.active.filter((e) => e.def.boss)).toHaveLength(1);
    expect(w.events).toContainEqual({ type: 'bossSpawned' });
    w.boss!.dead = true;
    w.step(1 / 60, { x: 0, y: 0 });
    expect(w.state).toBe('won');
  });
});
