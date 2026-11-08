import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { dropPickup, maybeDropRandom } from '../../src/core/pickups';
import { hurtPlayer } from '../../src/core/player';
import { dropGem, xpToNext } from '../../src/core/xp';
import { config } from '../../src/data/config';
import { PICKUPS, RANDOM_DROPS } from '../../src/data/pickups';
import { quietWorld, still } from './helpers';

const take = (w: ReturnType<typeof quietWorld>, id: keyof typeof PICKUPS) => {
  dropPickup(w, id, w.player.x, w.player.y);
  w.step(1 / 60, still);
};

describe('floor items', () => {
  it('Pão da Berta heals', () => {
    const w = quietWorld();
    w.player.hp = 10;
    take(w, 'food');
    expect(w.player.hp).toBeCloseTo(10 + config.pickups.foodHeal);
    expect(w.events).toContainEqual({ type: 'pickup', id: 'food' });
  });

  it('Pedra-Ímã pulls every gem', () => {
    const w = quietWorld();
    dropGem(w, 2000, 0, 1);
    take(w, 'magnet');
    expect(w.gems.active[0]!.pulled).toBe(true);
  });

  it('Badalada hurts everything on screen only', () => {
    const w = quietWorld();
    w.weapons.length = 0;
    const near = spawnEnemy(w, 'blackKnight', 100, 0);
    const far = spawnEnemy(w, 'blackKnight', 4000, 0);
    take(w, 'bomb');
    expect(near.maxHp - near.hp).toBe(config.pickups.bombDamage);
    expect(far.hp).toBe(far.maxHp);
  });

  it('Sopro de Geada stops enemies and their bites, then wears off', () => {
    const w = quietWorld();
    w.weapons.length = 0;
    const e = spawnEnemy(w, 'skeleton', 15, 0);
    take(w, 'freeze');
    const x = e.x;
    const hp = w.player.hp;
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(e.x).toBe(x);
    expect(w.player.hp).toBe(hp);
    for (let i = 0; i < 60 * config.pickups.freezeTime; i++) w.step(1 / 60, still);
    expect(w.freeze).toBe(0);
    expect(w.player.hp).toBeLessThan(hp);
  });

  it('random drops come only from weighted items, and respect the cap', () => {
    expect(RANDOM_DROPS.map((d) => d.id)).not.toContain('chest');
    const w = quietWorld();
    for (let i = 0; i < 100_000; i++) maybeDropRandom(w, 500, 0);
    expect(w.pickups.size).toBe(config.pickups.maxActive);
    dropPickup(w, 'chest', 500, 0);
    expect(w.pickups.size).toBe(config.pickups.maxActive + 1);
  });
});

describe('new passive stats', () => {
  it('armor reduces each hit, never below the minimum', () => {
    const w = quietWorld();
    w.player.stats.armor = 3;
    hurtPlayer(w.player, 5);
    expect(w.player.hp).toBe(config.player.stats.maxHp - 2);
    w.player.iframes = 0;
    hurtPlayer(w.player, 1);
    expect(w.player.hp).toBe(config.player.stats.maxHp - 2 - config.player.minDamage);
  });

  it('growth multiplies picked xp', () => {
    const w = quietWorld();
    w.player.stats.growth = 2;
    dropGem(w, w.player.x, w.player.y, xpToNext(1) / 2);
    w.step(1 / 60, still);
    expect(w.level).toBe(2);
  });
});
