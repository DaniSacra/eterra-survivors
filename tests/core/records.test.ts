import { describe, expect, it } from 'vitest';
import { damageEnemy, spawnEnemy } from '../../src/core/enemies';
import { dropPickup } from '../../src/core/pickups';
import { favoriteWeapon, newRunSummary, summarizeRun } from '../../src/core/records';
import { newHeroRecord } from '../../src/core/meta';
import { maxLevel } from '../../src/core/weapons';
import { World } from '../../src/core/world';
import { bareWorld, quietWorld, still } from './helpers';

describe('run counters', () => {
  it('counts kills by type and marks every type that appeared', () => {
    const w = bareWorld();
    for (const type of ['bones', 'bones', 'bat'] as const) {
      const e = spawnEnemy(w, type, 300, 0);
      damageEnemy(w, e, 9999);
    }
    spawnEnemy(w, 'skeleton', 300, 300);
    w.step(1 / 60, still);
    expect(w.killsBy).toEqual({ bones: 2, bat: 1 });
    expect(w.seen).toEqual({ bones: true, bat: true, skeleton: true });
    const s = summarizeRun(w);
    expect(s.killsBy).toEqual({ bones: 2, bat: 1 });
    expect(s.seen).toEqual(['bones', 'bat', 'skeleton']);
    expect(s.kills).toBe(3);
  });

  it('records the biggest weapon hit, but a bomb is not a weapon hit', () => {
    const w = bareWorld();
    w.addWeapon('blade');
    const e = spawnEnemy(w, 'golem', 50, 0);
    damageEnemy(w, e, 42, 0, 0, 0, w.weapons[0]!);
    damageEnemy(w, e, 30, 0, 0, 0, w.weapons[0]!);
    expect(w.bestHit).toBe(42);
    dropPickup(w, 'bomb', w.player.x, w.player.y);
    w.step(1 / 60, still);
    expect(e.hp).toBeLessThan(e.maxHp - 250);
    expect(w.bestHit).toBe(42);
  });

  it('remembers when the first hit was taken', () => {
    const w = bareWorld();
    w.step(1, still);
    expect(w.firstHitAt).toBe(-1);
    expect(summarizeRun(w).untouched).toBeCloseTo(w.time);
    spawnEnemy(w, 'bones', 0, 0);
    w.step(1 / 60, still);
    expect(w.player.hitsTaken).toBe(1);
    const at = w.firstHitAt;
    expect(at).toBeCloseTo(w.time);
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(w.player.hitsTaken).toBeGreaterThan(1);
    expect(w.firstHitAt).toBe(at);
    expect(summarizeRun(w).untouched).toBe(at);
  });
});

describe('summarizeRun', () => {
  it('an Elo counts as its base weapon and as maxed', () => {
    const w = new World(1, { character: 'lyra', stage: 'crypt' });
    w.addWeapon('fury');
    w.addWeapon('frost');
    w.weapons[2]!.level = maxLevel('frost');
    w.weapons[0]!.damage = 100;
    w.weapons[1]!.damage = 50;
    w.player.hp = w.player.stats.maxHp / 4;
    const s = summarizeRun(w);
    expect(s).toMatchObject({
      hero: 'lyra',
      stage: 'crypt',
      won: false,
      damage: 150,
      maxed: 2,
      hpLeft: 0.25,
    });
    expect(s.weapons).toEqual(['lightning', 'blade', 'frost']);
    expect(s.elos).toEqual(['fury']);
  });

  it('refills the same object (and its lists) when given one', () => {
    const out = newRunSummary();
    const lists = [out.weapons, out.elos, out.seen, out.killsBy];
    const w = quietWorld();
    expect(summarizeRun(w, out)).toBe(out);
    w.state = 'won';
    summarizeRun(w, out);
    expect(out.won).toBe(true);
    expect(out.weapons).toEqual(['blade']);
    expect([out.weapons, out.elos, out.seen, out.killsBy]).toEqual(lists);
    expect(out.weapons).toBe(lists[0]);
  });
});

describe('hero records (Coleção, Heróis)', () => {
  it('favourite weapon: most runs, ties by weapon order, none before any run', () => {
    const rec = newHeroRecord();
    expect(favoriteWeapon(rec)).toBeNull();
    rec.weaponRuns = { hammer: 3, blade: 3, frost: 1 };
    expect(favoriteWeapon(rec)).toBe('blade');
    rec.weaponRuns.frost = 5;
    expect(favoriteWeapon(rec)).toBe('frost');
  });
});
