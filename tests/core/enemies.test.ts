import { describe, expect, it } from 'vitest';
import { damageEnemy, spawnEnemy, spawnRadius, updateEnemies } from '../../src/core/enemies';
import { ENEMIES } from '../../src/data/enemies';
import { bareWorld as quietWorld, still } from './helpers';

describe('enemies', () => {
  it('walk straight towards the player', () => {
    const w = quietWorld();
    const e = spawnEnemy(w, 'skeleton', 100, 0);
    updateEnemies(w, 0.1);
    expect(e.x).toBeCloseTo(100 - ENEMIES.skeleton.speed * 0.1);
    expect(e.y).toBeCloseTo(0);
  });

  it('push each other apart when overlapping', () => {
    const w = quietWorld();
    w.player.x = 1000; // far enough that seeking is mostly along x
    const a = spawnEnemy(w, 'skeleton', 0, 0);
    const b = spawnEnemy(w, 'skeleton', 0, 4);
    for (let i = 0; i < 30; i++) updateEnemies(w, 1 / 60);
    expect(Math.abs(b.y - a.y)).toBeGreaterThan(ENEMIES.skeleton.radius * 1.5);
  });

  it('hurt the player on contact, once per i-frame window', () => {
    const w = quietWorld();
    spawnEnemy(w, 'skeleton', 5, 0);
    spawnEnemy(w, 'skeleton', -5, 0);
    updateEnemies(w, 1 / 60);
    expect(w.player.hp).toBe(w.player.stats.maxHp - ENEMIES.skeleton.damage);
    expect(w.events).toEqual([{ type: 'playerHit' }]);
  });

  it('die by damage and get swept, counting kills', () => {
    const w = quietWorld();
    const e = spawnEnemy(w, 'spider', 300, 0);
    damageEnemy(w, e, 999);
    expect(e.dead).toBe(true);
    w.step(1 / 60, still);
    expect(w.enemies.size).toBe(0);
    expect(w.kills).toBe(1);
  });

  it('take knockback scaled by resistance', () => {
    const w = quietWorld();
    const s = spawnEnemy(w, 'skeleton', 300, 0);
    const k = spawnEnemy(w, 'blackKnight', -300, 0);
    damageEnemy(w, s, 1, 1, 0, 100);
    damageEnemy(w, k, 1, 1, 0, 100);
    expect(s.kbx).toBe(100);
    expect(k.kbx).toBe(0);
  });

  it('are recycled ahead of the player when left far behind', () => {
    const w = quietWorld();
    const e = spawnEnemy(w, 'skeleton', -spawnRadius(w) * 3, 0);
    w.player.facing.x = 1;
    updateEnemies(w, 1 / 60);
    expect(e.x).toBeGreaterThan(0);
    expect(Math.hypot(e.x, e.y)).toBeLessThan(spawnRadius(w) + 1);
  });
});
