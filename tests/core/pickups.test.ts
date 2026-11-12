import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { addGold, dropPickup, maybeDropRandom } from '../../src/core/pickups';
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
    expect(near.maxHp - near.hp).toBeCloseTo(config.pickups.bombDamage);
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

  it('full armor (hero 1 + passive 3 + shop 3) still takes 2 from a common hit (E-09)', () => {
    const w = quietWorld();
    w.player.stats.armor = 7;
    hurtPlayer(w.player, 6);
    expect(config.player.minDamage).toBe(2);
    expect(w.player.hp).toBe(config.player.stats.maxHp - 2);
  });

  it('growth multiplies picked xp', () => {
    const w = quietWorld();
    w.player.stats.growth = 2;
    dropGem(w, w.player.x, w.player.y, xpToNext(1) / 2);
    w.step(1 / 60, still);
    expect(w.level).toBe(2);
  });
});

describe('gold', () => {
  it('100 coins with greed 1.1 pay 330, not rounded coin by coin', () => {
    const w = quietWorld();
    w.player.stats.greed = 1.1;
    for (let i = 0; i < 100; i++) addGold(w, config.gold.coin);
    expect(w.gold).toBeCloseTo(330);
  });

  it('a stage gold multiplier of 1.5 pays 450 for 100 coins', () => {
    const w = quietWorld();
    const before = w.stage.mult.gold;
    w.stage.mult.gold = 1.5;
    for (let i = 0; i < 100; i++) addGold(w, config.gold.coin);
    w.stage.mult.gold = before;
    expect(w.gold).toBeCloseTo(450);
  });
});
