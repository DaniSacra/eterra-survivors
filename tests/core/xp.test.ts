import { describe, expect, it } from 'vitest';
import { addXp, dropGem, updateGems, xpToNext } from '../../src/core/xp';
import { damageEnemy, spawnEnemy } from '../../src/core/enemies';
import { config } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { bareWorld, still } from './helpers';

describe('xp', () => {
  it('needs more xp each level', () => {
    expect(xpToNext(1)).toBe(config.xp.base);
    expect(xpToNext(5)).toBeGreaterThan(xpToNext(4));
  });

  it('queues several level-ups from one big gain and keeps the remainder', () => {
    const w = bareWorld();
    addXp(w, xpToNext(1) + xpToNext(2) + 1);
    expect(w.level).toBe(3);
    expect(w.pendingLevelUps).toBe(2);
    expect(w.xp).toBe(1);
  });

  it('killed enemies drop gems worth their xp', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'slime', 300, 0);
    damageEnemy(w, e, 1e6);
    w.step(1 / 60, still);
    expect(w.gems.size).toBe(1);
    expect(w.gems.active[0]!.value).toBe(ENEMIES.slime.xp);
  });

  it('gems inside the magnet fly to the player and are collected', () => {
    const w = bareWorld();
    dropGem(w, w.player.stats.magnet - 5, 0, 2);
    dropGem(w, 1000, 0, 2);
    for (let i = 0; i < 60; i++) updateGems(w, 1 / 60);
    expect(w.gems.size).toBe(1);
    expect(w.xp).toBe(2);
  });

  it('merge into the nearest gem above the on-screen limit', () => {
    const w = bareWorld();
    for (let i = 0; i < config.gems.maxActive; i++) dropGem(w, 500 + i * 100, 0, 1);
    dropGem(w, 510, 0, 7);
    expect(w.gems.size).toBe(config.gems.maxActive);
    const total = w.gems.active.reduce((sum, g) => sum + g.value, 0);
    expect(total).toBe(config.gems.maxActive + 7);
    expect(w.gems.active.find((g) => g.x === 500)!.value).toBe(8);
  });
});
