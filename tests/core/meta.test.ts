import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  buy,
  discoverElos,
  newSave,
  nextGoal,
  sanitizeSave,
  shopBonuses,
  shopCost,
} from '../../src/core/meta';
import { dropPickup } from '../../src/core/pickups';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { CHARACTERS } from '../../src/data/characters';
import { SHOP, SHOP_IDS } from '../../src/data/shop';
import { quietWorld, still } from './helpers';

describe('shop', () => {
  it('costs grow per level, buying spends gold, and stops at max level', () => {
    const save = newSave();
    expect(shopCost(save, 'maxHp')).toBe(SHOP.maxHp.baseCost);
    expect(buy(save, 'maxHp')).toBe(false);
    save.gold = 10_000;
    expect(buy(save, 'maxHp')).toBe(true);
    expect(save.gold).toBe(10_000 - SHOP.maxHp.baseCost);
    expect(shopCost(save, 'maxHp')).toBe(SHOP.maxHp.baseCost * 2);
    while (buy(save, 'maxHp'));
    expect(save.shop.maxHp).toBe(SHOP.maxHp.maxLevel);
    expect(shopCost(save, 'maxHp')).toBeNull();
  });

  it('turns levels into starting stats and charges', () => {
    const save = newSave();
    save.shop = { maxHp: 2, reroll: 3, cooldown: 1 };
    const b = shopBonuses(save);
    expect(b.stats.maxHp).toBe(20);
    expect(b.stats.cooldown).toBeCloseTo(-0.03);
    expect(b.charges.reroll).toBe(config.charges.reroll + 3);
    const w = new World(1, { bonuses: b });
    expect(w.player.stats.maxHp).toBe(config.player.stats.maxHp + CHARACTERS.aldo.stats.maxHp + 20);
    expect(w.player.hp).toBe(w.player.stats.maxHp);
    expect(w.charges.reroll).toBe(config.charges.reroll + 3);
  });

  it('repairs broken or tampered saves', () => {
    expect(sanitizeSave(null)).toEqual(newSave());
    expect(sanitizeSave('x')).toEqual(newSave());
    expect(
      sanitizeSave({
        gold: 12.7,
        shop: { maxHp: 99, nope: 3, might: -1 },
        heroes: ['lyra', 'ghost'],
        cleared: 'valmor',
      }),
    ).toEqual({ ...newSave(), gold: 12, shop: { maxHp: SHOP.maxHp.maxLevel }, heroes: ['lyra'] });
    // Saves from before heroes and stages still load.
    expect(sanitizeSave({ gold: 5, shop: {} })).toEqual({ ...newSave(), gold: 5 });
  });
});

describe('gold', () => {
  it('coins and chests give gold, scaled by greed', () => {
    const w = quietWorld();
    w.player.stats.greed = 2;
    dropPickup(w, 'gold', w.player.x, w.player.y);
    w.step(1 / 60, still);
    expect(w.gold).toBe(config.gold.coin * 2);
    dropPickup(w, 'chest', w.player.x, w.player.y);
    w.step(1 / 60, still);
    expect(w.gold).toBe((config.gold.coin + config.gold.chest) * 2);
  });
});

describe('level-up helpers', () => {
  function leveling() {
    const w = quietWorld();
    w.charges.reroll = w.charges.skip = w.charges.banish = 1;
    w.pendingLevelUps = 1;
    w.step(1 / 60, still);
    expect(w.state).toBe('levelup');
    return w;
  }

  it('Trocar rolls new options and spends a charge', () => {
    const w = leveling();
    const before = w.upgradeOptions;
    w.reroll();
    expect(w.upgradeOptions).not.toBe(before);
    expect(w.charges.reroll).toBe(0);
    w.reroll();
    expect(w.charges.reroll).toBe(0);
  });

  it('Pular ends the level-up without taking anything', () => {
    const w = leveling();
    w.skipLevelUp();
    expect(w.state).toBe('playing');
    expect(w.weapons).toHaveLength(1);
    expect(w.weapons[0]!.level).toBe(1);
  });

  it('Banir removes the option for the rest of the run', () => {
    const w = leveling();
    const opt = w.upgradeOptions[0]!;
    w.banish(0);
    expect(w.state).toBe('levelup');
    expect(w.charges.banish).toBe(0);
    for (let i = 0; i < 30; i++) {
      w.charges.reroll = 1;
      w.reroll();
      expect(w.upgradeOptions).not.toContainEqual(opt);
    }
  });

  it('do nothing without charges or outside a level-up', () => {
    const w = quietWorld();
    w.skipLevelUp();
    w.banish(0);
    expect(w.state).toBe('playing');
    const l = leveling();
    l.charges.skip = 0;
    l.skipLevelUp();
    expect(l.state).toBe('levelup');
  });
});

describe('save versions and Elos', () => {
  it('loads a versionless save without losing anything, at the current version', () => {
    const old = { gold: 340, shop: { might: 2 }, heroes: ['teo'], cleared: ['valmor'] };
    const s = sanitizeSave(old);
    expect(s).toEqual({ ...newSave(), gold: 340, shop: { might: 2 }, heroes: ['teo'], cleared: ['valmor'] });
    expect(s.version).toBe(SAVE_VERSION);
  });

  it('keeps known Elos and drops unknown ids', () => {
    expect(sanitizeSave({ elos: ['fury', 'blade', 'nope'] }).elos).toEqual(['fury']);
  });

  it('discovers Elos once and reports only the new ones', () => {
    const s = newSave();
    expect(discoverElos(s, ['fury', 'storm'])).toEqual(['fury', 'storm']);
    expect(discoverElos(s, ['fury', 'blade'])).toEqual([]);
    expect(s.elos).toEqual(['fury', 'storm']);
  });

  it('the next goal is the cheapest thing left to buy', () => {
    const s = newSave();
    const goal = nextGoal(s)!;
    const cheapest = Math.min(...SHOP_IDS.map((id) => SHOP[id].baseCost));
    expect(goal.cost).toBe(cheapest);
  });
});
